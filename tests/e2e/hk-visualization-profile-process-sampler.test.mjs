import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST,
  HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS,
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE,
  HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
  HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
  sampleHkVisualizationProfileProcesses,
} from "./hk-visualization-profile-process-sampler.mjs";

const workspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
const fixtureRoot = join(
  workspace,
  ".tmp",
  `hk-viz-profile-sampler-test-${process.pid}-${Date.now()}`,
);
mkdirSync(fixtureRoot, { recursive: true });

const lstart = "Tue Aug 11 10:00:00 2026";
const laterLstart = "Tue Aug 11 10:00:01 2026";

function phaseOneRow({
  pid,
  ppid = 1,
  pgid = pid,
  started = lstart,
  state = "SN",
  comm = "Google Chrome",
}) {
  return `${pid} ${ppid} ${pgid} ${started} ${state} ${comm}`;
}

function phaseTwoRow({
  pid,
  ppid = 1,
  pgid = pid,
  started = lstart,
  command,
}) {
  return `${pid} ${ppid} ${pgid} ${started} ${command}`;
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

function queuedSpawn(results, calls = []) {
  const queue = [...results];
  const spawn = (command, args, options) => {
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
    assert.ok(queue.length > 0, `Unexpected ps call: ${args.join(" ")}`);
    return queue.shift();
  };
  spawn.remaining = () => queue.length;
  return spawn;
}

function profilePath(label) {
  const value = join(
    fixtureRoot,
    `playwright_chromiumdev_profile-${label}`,
  );
  mkdirSync(value, { recursive: true });
  return value;
}

function expectedPsOptions() {
  return {
    encoding: "utf8",
    env: { LANG: "C", LC_ALL: "C" },
    maxBuffer: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
    timeout: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
  };
}

test("policy binds exact two-phase /bin/ps calls and retains no raw argv", () => {
  assert.deepEqual(HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS, [
    "-axww",
    "-o",
    "pid=,ppid=,pgid=,lstart=,state=,comm=",
  ]);
  assert.deepEqual(HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE, [
    "-ww",
    "-p",
    "<exact-positive-pid>",
    "-o",
    "pid=,ppid=,pgid=,lstart=,command=",
  ]);
  assert.deepEqual(HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV, {
    LANG: "C",
    LC_ALL: "C",
  });
  assert.equal(
    HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY.rawCommandRetention,
    "forbidden",
  );
  assert.ok(HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST.includes("Google Chrome"));
  assert.ok(HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST.includes("Chromium"));
  assert.equal(
    HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST.some((name) =>
      /helper/i.test(name),
    ),
    false,
  );
});

test("phase one never reads non-Chrome argv and phase two targets only exact candidate PID", () => {
  const safeProfile = profilePath("candidate-only");
  const calls = [];
  const spawn = queuedSpawn(
    [
      ok(
        [
          phaseOneRow({ pid: 310, comm: "/usr/bin/node" }),
          phaseOneRow({ pid: 311, comm: "Google Chrome" }),
        ].join("\n"),
      ),
      ok(
        phaseTwoRow({
          pid: 311,
          command: `Google Chrome --user-data-dir=${safeProfile}`,
        }),
      ),
    ],
    calls,
  );
  const result = sampleHkVisualizationProfileProcesses({ spawn });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.profilePaths, [safeProfile]);
  assert.equal(result.targetedCandidateCount, 1);
  assert.equal(result.candidateIdentities.length, 1);
  assert.equal(result.candidateIdentities[0].pid, 311);
  assert.deepEqual(calls, [
    {
      command: "/bin/ps",
      args: [...HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS],
      options: expectedPsOptions(),
    },
    {
      command: "/bin/ps",
      args: [
        "-ww",
        "-p",
        "311",
        "-o",
        "pid=,ppid=,pgid=,lstart=,command=",
      ],
      options: expectedPsOptions(),
    },
  ]);
  assert.equal(spawn.remaining(), 0);
  assert.equal(JSON.stringify(result).includes("/usr/bin/node"), false);
  assert.equal(JSON.stringify(result).includes("--user-data-dir"), false);
});

test("quoted and unquoted user-data-dir forms produce exact Starship paths", () => {
  const plainProfile = profilePath("plain");
  const spacedProfile = profilePath("quoted path");
  const spawn = queuedSpawn([
    ok(
      [
        phaseOneRow({ pid: 401, comm: "Google Chrome" }),
        phaseOneRow({ pid: 402, comm: "Chromium" }),
      ].join("\n"),
    ),
    ok(
      phaseTwoRow({
        pid: 401,
        command: `Google Chrome --user-data-dir=${plainProfile}`,
      }),
    ),
    ok(
      phaseTwoRow({
        pid: 402,
        command: `"Chromium" --user-data-dir "${spacedProfile}"`,
      }),
    ),
  ]);
  const result = sampleHkVisualizationProfileProcesses({ spawn });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.profilePaths, [plainProfile, spacedProfile].sort());
  assert.equal(result.observations.length, 2);
  assert.ok(
    result.observations.every((observation) =>
      /^[a-f0-9]{64}$/.test(observation.commandSha256),
    ),
  );
  assert.equal(
    JSON.stringify(result).includes("--user-data-dir"),
    false,
  );
});

test("ordinary Chrome without user-data-dir is recorded as non-profile without retaining argv", () => {
  const hiddenSecret = "ORDINARY_CHROME_SECRET_2f4be";
  const result = sampleHkVisualizationProfileProcesses({
    spawn: queuedSpawn([
      ok(phaseOneRow({ pid: 440, comm: "Google Chrome" })),
      ok(
        phaseTwoRow({
          pid: 440,
          command: `Google Chrome --ordinary-flag --decoy-secret=${hiddenSecret}`,
        }),
      ),
    ]),
  });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.profilePaths, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.candidateIdentities.length, 1);
  assert.equal(result.nonProfileObservations.length, 1);
  assert.equal(
    result.nonProfileObservations[0].disposition,
    "non-profile-no-user-data-dir",
  );
  assert.equal(JSON.stringify(result).includes(hiddenSecret), false);
});

test("missing-value, malformed, duplicate, and unterminated profile flags fail closed without secret argv", async (t) => {
  const hiddenSecret = "TOP_SECRET_DECOY_8d281e";
  const safeProfile = profilePath("negative-flags");
  const cases = [
    [
      "missing value",
      `Google Chrome --decoy-secret=${hiddenSecret} --user-data-dir --other`,
    ],
    [
      "malformed",
      `Google Chrome --decoy-secret=${hiddenSecret} --user-data-directory=${safeProfile}`,
    ],
    [
      "duplicate",
      `Google Chrome --decoy-secret=${hiddenSecret} --user-data-dir=${safeProfile} --user-data-dir=${safeProfile}`,
    ],
    [
      "unterminated quote",
      `Google Chrome --decoy-secret=${hiddenSecret} --user-data-dir="${safeProfile}`,
    ],
  ];
  for (const [name, command] of cases) {
    await t.test(name, () => {
      const result = sampleHkVisualizationProfileProcesses({
        spawn: queuedSpawn([
          ok(phaseOneRow({ pid: 450, comm: "Google Chrome" })),
          ok(phaseTwoRow({ pid: 450, command })),
        ]),
      });
      assert.equal(result.status, "failed");
      assert.ok(result.errors.length > 0);
      assert.deepEqual(result.profilePaths, []);
      assert.equal(JSON.stringify(result).includes(hiddenSecret), false);
      assert.equal(JSON.stringify(result.errors).includes("--user-data-dir"), false);
    });
  }
});

test("transient zombie rows with empty comm remain hashed non-candidates instead of false-red", () => {
  const calls = [];
  const result = sampleHkVisualizationProfileProcesses({
    spawn: queuedSpawn(
      [
        ok(
          [
            `${901} 1 901 ${lstart} Z`,
            phaseOneRow({ pid: 902, state: "Z", comm: "" }),
            phaseOneRow({ pid: 903, comm: "/usr/bin/node" }),
          ].join("\n"),
        ),
      ],
      calls,
    ),
  });
  assert.equal(result.status, "complete");
  assert.equal(result.phaseOneRowCount, 3);
  assert.equal(result.targetedCandidateCount, 0);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.profilePaths, []);
  assert.equal(calls.length, 1);
});

test("transient rows with both state and comm absent remain safe non-candidates", () => {
  const result = sampleHkVisualizationProfileProcesses({
    spawn: queuedSpawn([
      ok("903 1 903 Tue Aug 11 10:00:00 2026"),
    ]),
  });
  assert.equal(result.status, "complete");
  assert.equal(result.phaseOneRowCount, 1);
  assert.equal(result.targetedCandidateCount, 0);
  assert.deepEqual(result.candidateIdentities, []);
  assert.deepEqual(result.profilePaths, []);
  assert.deepEqual(result.errors, []);
});

test("a transient missing state keeps a nonempty space-containing Chrome comm eligible for targeted inspection", () => {
  const result = sampleHkVisualizationProfileProcesses({
    spawn: queuedSpawn([
      ok("904 1 904 Tue Aug 11 10:00:00 2026 Google Chrome"),
      ok(
        phaseTwoRow({
          pid: 904,
          command: "Google Chrome --ordinary-flag",
        }),
      ),
    ]),
  });
  assert.equal(result.status, "complete");
  assert.equal(result.targetedCandidateCount, 1);
  assert.equal(result.candidateIdentities[0].state, "?");
  assert.equal(result.nonProfileObservations.length, 1);
  assert.deepEqual(result.profilePaths, []);
  assert.deepEqual(result.errors, []);
});

test("real Node direct child titled as Chrome is identity-resolved without leaking its argv", async () => {
  const childProfile = profilePath("node-title-holder");
  const child = spawn(
    process.execPath,
    [
      "-e",
      'process.title="Google Chrome for Testing"; setInterval(() => {}, 1000);',
      "--",
      `--user-data-dir=${childProfile}`,
      "--decoy-secret=DIRECT_CHILD_SECRET_71c4",
    ],
    {
      cwd: workspace,
      env: {
        HOME: fixtureRoot,
        LANG: "C",
        LC_ALL: "C",
        TMPDIR: fixtureRoot,
        TMP: fixtureRoot,
        TEMP: fixtureRoot,
      },
      stdio: "ignore",
    },
  );
  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  try {
    const deadline = Date.now() + 3_000;
    let comm = "";
    while (Date.now() < deadline) {
      const probe = spawnSync(
        "/bin/ps",
        ["-ww", "-p", String(child.pid), "-o", "comm="],
        {
          encoding: "utf8",
          env: { LANG: "C", LC_ALL: "C" },
          maxBuffer: 64 * 1024,
          timeout: 1_000,
        },
      );
      comm = String(probe.stdout ?? "").trim();
      if (comm === "Google Chrome for Testing") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(comm, "Google Chrome for Testing");
    const result = sampleHkVisualizationProfileProcesses();
    assert.ok(
      result.candidateIdentities.some((identity) => identity.pid === child.pid),
    );
    const resolvedAsProfile = result.observations.some(
      (observation) =>
        observation.identity.pid === child.pid &&
        observation.profilePath === childProfile,
    );
    const resolvedAsOrdinaryChrome = result.nonProfileObservations.some(
      (observation) => observation.identity.pid === child.pid,
    );
    assert.equal(resolvedAsProfile || resolvedAsOrdinaryChrome, true);
    assert.equal(
      JSON.stringify(result).includes("DIRECT_CHILD_SECRET_71c4"),
      false,
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
    await exitPromise;
  }
});

test("PID/lstart, PGID, and executable drift fail closed on the targeted reread", async (t) => {
  const safeProfile = profilePath("identity-drift");
  const cases = [
    [
      "pid reuse or lstart drift",
      phaseTwoRow({
        pid: 501,
        started: laterLstart,
        command: `Google Chrome --user-data-dir=${safeProfile}`,
      }),
    ],
    [
      "pgid drift",
      phaseTwoRow({
        pid: 501,
        pgid: 999,
        command: `Google Chrome --user-data-dir=${safeProfile}`,
      }),
    ],
    [
      "executable drift",
      phaseTwoRow({
        pid: 501,
        command: `Chromium --user-data-dir=${safeProfile}`,
      }),
    ],
  ];
  for (const [name, targetedOutput] of cases) {
    await t.test(name, () => {
      const result = sampleHkVisualizationProfileProcesses({
        spawn: queuedSpawn([
          ok(phaseOneRow({ pid: 501, comm: "Google Chrome" })),
          ok(targetedOutput),
        ]),
      });
      assert.equal(result.status, "failed");
      assert.deepEqual(result.profilePaths, []);
      assert.ok(result.errors.some((error) => /drift/.test(error)));
    });
  }
});

test("Chrome and Chromium Helpers are excluded before any targeted argv read", () => {
  const calls = [];
  const result = sampleHkVisualizationProfileProcesses({
    spawn: queuedSpawn(
      [
        ok(
          [
            phaseOneRow({ pid: 601, comm: "Google Chrome Helper (Renderer)" }),
            phaseOneRow({ pid: 602, comm: "Chromium Helper" }),
            phaseOneRow({ pid: 603, comm: "/usr/bin/node" }),
          ].join("\n"),
        ),
      ],
      calls,
    ),
  });
  assert.equal(result.status, "complete");
  assert.equal(result.targetedCandidateCount, 0);
  assert.deepEqual(result.profilePaths, []);
  assert.equal(calls.length, 1);
});

test("candidate disappearance is benign only after a successful identity-safe phase-one refresh", async (t) => {
  await t.test("exact identity absent", () => {
    const result = sampleHkVisualizationProfileProcesses({
      spawn: queuedSpawn([
        ok(phaseOneRow({ pid: 701, comm: "Google Chrome" })),
        ok("", { status: 1 }),
        ok(phaseOneRow({ pid: 900, comm: "/usr/bin/node" })),
      ]),
    });
    assert.equal(result.status, "complete");
    assert.equal(result.disappearedIdentityHashes.length, 1);
    assert.deepEqual(result.profilePaths, []);
  });

  await t.test("exact identity remains", () => {
    const original = phaseOneRow({ pid: 702, comm: "Google Chrome" });
    const result = sampleHkVisualizationProfileProcesses({
      spawn: queuedSpawn([ok(original), ok("", { status: 1 }), ok(original)]),
    });
    assert.equal(result.status, "failed");
    assert.ok(result.errors.some((error) => /phase2-ps-nonzero/.test(error)));
  });

  await t.test("refresh itself fails", () => {
    const result = sampleHkVisualizationProfileProcesses({
      spawn: queuedSpawn([
        ok(phaseOneRow({ pid: 703, comm: "Google Chrome" })),
        ok("", { status: 1 }),
        { error: new Error("private secret must not surface"), status: null, signal: null },
      ]),
    });
    assert.equal(result.status, "failed");
    assert.ok(result.errors.some((error) => /refresh-phase1-ps-error/.test(error)));
    assert.equal(JSON.stringify(result).includes("private secret"), false);
  });
});

test("ps timeout, spawn error, signal, nonzero, and malformed rows fail closed with safe diagnostics", async (t) => {
  const secret = "PS_FAILURE_SECRET_7219";
  const phaseOneFailures = [
    ["timeout", { error: Object.assign(new Error(secret), { code: "ETIMEDOUT" }), status: null, signal: null }],
    ["error", { error: new Error(secret), status: null, signal: null }],
    ["signal", { error: undefined, status: null, signal: "SIGKILL" }],
    ["unsafe signal", { error: undefined, status: null, signal: secret }],
    ["nonzero", ok("", { status: 2 })],
    ["unsafe nonzero", ok("", { status: secret })],
    ["malformed", ok(`not a process row ${secret}`)],
    [
      "duplicate pid",
      ok(
        [
          phaseOneRow({ pid: 801, comm: "/usr/bin/node" }),
          phaseOneRow({ pid: 801, comm: "/usr/bin/node" }),
        ].join("\n"),
      ),
    ],
  ];
  for (const [name, response] of phaseOneFailures) {
    await t.test(`phase one ${name}`, () => {
      const result = sampleHkVisualizationProfileProcesses({
        spawn: queuedSpawn([response]),
      });
      assert.equal(result.status, "failed");
      assert.ok(result.errors.length > 0);
      assert.equal(JSON.stringify(result).includes(secret), false);
      assert.deepEqual(result.profilePaths, []);
    });
  }

  const phaseTwoFailures = [
    ["timeout", { error: Object.assign(new Error(secret), { code: "ETIMEDOUT" }), status: null, signal: null }],
    ["error", { error: new Error(secret), status: null, signal: null }],
    ["signal", { error: undefined, status: null, signal: "SIGTERM" }],
    ["nonzero", ok("", { status: 3 })],
    ["malformed", ok(`malformed ${secret}`)],
  ];
  for (const [name, response] of phaseTwoFailures) {
    await t.test(`phase two ${name}`, () => {
      const result = sampleHkVisualizationProfileProcesses({
        spawn: queuedSpawn([
          ok(phaseOneRow({ pid: 850, comm: "Google Chrome" })),
          response,
        ]),
      });
      assert.equal(result.status, "failed");
      assert.ok(result.errors.length > 0);
      assert.equal(JSON.stringify(result).includes(secret), false);
      assert.deepEqual(result.profilePaths, []);
    });
  }
});
