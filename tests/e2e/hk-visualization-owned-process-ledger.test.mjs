import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
  cleanupHkVisualizationOwnedProcessLedger,
  computeHkVisualizationLiveOwnedProcessEntries,
  parseHkVisualizationOwnedProcessTable,
  sampleHkVisualizationOwnedProcessTable,
  seedHkVisualizationOwnedProcessLedger,
  updateHkVisualizationOwnedProcessLedger,
  verifyHkVisualizationDirectProcessLeader,
  verifyHkVisualizationProcessObserver,
} from "./hk-visualization-owned-process-ledger.mjs";

const WORKTREE_ROOT = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
const TEST_ROOT = resolve(
  WORKTREE_ROOT,
  ".tmp/hk-visualization-owned-process-ledger-tests",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function processLine({
  pid,
  ppid,
  pgid,
  lstart = "Mon Aug 11 12:34:56 2026",
  state = "Ss+",
  command = "/Volumes/Starship/bin/hk-owned-workload",
}) {
  return `${pid} ${ppid} ${pgid} ${lstart} ${state} ${command}`;
}

function parsedProcess(overrides = {}) {
  return parseHkVisualizationOwnedProcessTable(
    `${processLine({
      pid: 92101,
      ppid: 92100,
      pgid: 92101,
      ...overrides,
    })}\n`,
  )[0];
}

function seedLedger({
  pid = 92101,
  ppid = 92100,
  pgid = 92101,
  lstart = "Mon Aug 11 12:34:56 2026",
} = {}) {
  const leader = parsedProcess({ pid, ppid, pgid, lstart });
  return seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid, ppid, pgid },
    processes: [leader],
  });
}

function observerFixture() {
  const processEntry = parsedProcess({
    pid: 92001,
    ppid: 1,
    pgid: 92001,
    lstart: "Mon Aug 11 12:30:00 2026",
    command: "/Volumes/Starship/bin/hk-owned-ledger-observer",
  });
  return {
    identity: {
      pid: processEntry.pid,
      lstartToken: processEntry.lstartToken,
    },
    processEntry,
  };
}

test("the unit harness declares only a Starship fixture root", () => {
  assert.equal(TEST_ROOT.startsWith("/Volumes/Starship/"), true);
  assert.equal(resolve(process.cwd()), WORKTREE_ROOT);
  for (const key of [
    "TMPDIR",
    "TMP",
    "TEMP",
    "NODE_COMPILE_CACHE",
    "npm_config_cache",
    "npm_config_logs_dir",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
  ]) {
    assert.equal(
      typeof process.env[key],
      "string",
      `${key} must be explicitly bound for this Starship-only suite`,
    );
    assert.equal(
      resolve(process.env[key]).startsWith("/Volumes/Starship/"),
      true,
      `${key} must remain on Starship when this suite is executed`,
    );
  }
});

test("process-table policy is exact, bounded, and never requests environment data", () => {
  assert.deepEqual(HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS, [
    "-axww",
    "-o",
    "pid=,ppid=,pgid=,lstart=,state=,comm=",
  ]);
  assert.equal(HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS, 5_000);
  assert.equal(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
    4 * 1024 * 1024,
  );
  assert.equal(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS.some((value) =>
      /(^|-)e($|-)|environment/i.test(value),
    ),
    false,
  );
});

test("sampler uses exact ps policy and returns lstart identity plus executable hash only", () => {
  const rawExecutable = resolve(
    WORKTREE_ROOT,
    "node_modules/.bin/playwright",
  );
  const calls = [];
  const sampled = sampleHkVisualizationOwnedProcessTable({
    observerPid: 92201,
    spawnProcessTable(command, args, options) {
      calls.push({ command, args, options });
      return {
        error: undefined,
        signal: null,
        status: 0,
        stdout: `${processLine({
          pid: 92201,
          ppid: 92200,
          pgid: 92201,
          lstart: "Mon Aug  1 02:03:04 2026",
          state: "Ss+",
          command: rawExecutable,
        })}\n`,
      };
    },
  });

  assert.deepEqual(calls, [
    {
      command: "/bin/ps",
      args: [...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS],
      options: {
        encoding: "utf8",
        env: { LANG: "C", LC_ALL: "C" },
        maxBuffer: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
        timeout: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
      },
    },
  ]);
  assert.deepEqual(sampled, [
    {
      pid: 92201,
      ppid: 92200,
      pgid: 92201,
      lstartToken: "Mon Aug 01 02:03:04 2026",
      state: "Ss+",
      executableSha256: sha256(rawExecutable),
    },
  ]);
  assert.equal(JSON.stringify(sampled).includes(rawExecutable), false);
});

test("sampler accepts only a remaining-budget timeout bounded by the five-second ps cap", () => {
  const calls = [];
  const observerPid = 92202;
  const stdout = `${processLine({
    pid: observerPid,
    ppid: 92200,
    pgid: observerPid,
  })}\n`;
  sampleHkVisualizationOwnedProcessTable({
    observerPid,
    timeoutMs: 37,
    spawnProcessTable(command, args, options) {
      calls.push({ command, args, options });
      return { error: undefined, signal: null, status: 0, stdout };
    },
  });
  assert.equal(calls[0].options.timeout, 37);
  for (const timeoutMs of [0, 5_001, 1.5, Number.NaN]) {
    assert.throws(
      () =>
        sampleHkVisualizationOwnedProcessTable({
          observerPid,
          timeoutMs,
          spawnProcessTable() {
            throw new Error("unsafe timeout must fail before ps spawn");
          },
        }),
      /ps timeout must be an integer from 1 through 5000 ms/,
    );
  }
});

test("every sampler snapshot must preserve an exact observer anchor", () => {
  const observer = parsedProcess({
    pid: 92211,
    ppid: 1,
    pgid: 92211,
    lstart: "Mon Aug 11 02:03:04 2026",
  });
  const identity = {
    pid: observer.pid,
    lstartToken: observer.lstartToken,
  };
  assert.deepEqual(
    verifyHkVisualizationProcessObserver({
      observerIdentity: identity,
      observerPid: observer.pid,
      processes: [observer],
    }),
    observer,
  );
  assert.throws(
    () =>
      verifyHkVisualizationProcessObserver({
        observerIdentity: identity,
        observerPid: observer.pid,
        processes: [],
      }),
    /exact observer pid\+lstart anchor/,
  );
  assert.throws(
    () =>
      verifyHkVisualizationProcessObserver({
        observerIdentity: identity,
        observerPid: observer.pid,
        processes: [
          parsedProcess({
            pid: observer.pid,
            ppid: 1,
            pgid: observer.pgid,
            lstart: "Mon Aug 11 02:03:05 2026",
          }),
        ],
      }),
    /exact observer pid\+lstart anchor/,
  );
});

test("parser failures disclose only line index, length, and SHA-256", () => {
  const secretLine =
    "92201 malformed super-secret-provider-token=must-not-appear-in-error";
  assert.throws(
    () => parseHkVisualizationOwnedProcessTable(`${secretLine}\n`),
    (error) => {
      assert.match(error.message, /line 0/);
      assert.match(error.message, new RegExp(`length=${secretLine.length}`));
      assert.match(error.message, new RegExp(`sha256=${sha256(secretLine)}`));
      assert.equal(error.message.includes("super-secret-provider-token"), false);
      assert.equal(error.message.includes("must-not-appear"), false);
      return true;
    },
  );
});

test("parser excludes unsignalable system rows and rejects malformed identities without echoing commands", () => {
  const safe = processLine({ pid: 998, ppid: 1, pgid: 998 });
  assert.deepEqual(
    parseHkVisualizationOwnedProcessTable(
      `${processLine({ pid: 1, ppid: 0, pgid: 1 })}\n` +
        `${processLine({ pid: 997, ppid: 0, pgid: 1 })}\n${safe}\n`,
    ).map(({ pid }) => pid),
    [998],
  );

  for (const [label, line] of [
    [
      "invalid-lstart",
      processLine({
        pid: 999,
        ppid: 0,
        pgid: 999,
        lstart: "not a stable start token",
      }),
    ],
    [
      "invalid-calendar-day",
      processLine({
        pid: 999,
        ppid: 0,
        pgid: 999,
        lstart: "Mon Feb 31 12:34:56 2026",
      }),
    ],
  ]) {
    assert.throws(
      () => parseHkVisualizationOwnedProcessTable(`${line}\n`),
      (error) => {
        assert.match(error.message, /(could not parse|unsafe identity)/);
        assert.equal(error.message.includes("hk-owned-workload"), false);
        return true;
      },
      label,
    );
  }

  const duplicate = processLine({ pid: 92301, ppid: 92300, pgid: 92301 });
  assert.throws(
    () => parseHkVisualizationOwnedProcessTable(`${duplicate}\n${duplicate}\n`),
    (error) => {
      assert.match(error.message, /duplicate pid at ps line 1/);
      assert.match(error.message, new RegExp(`length=${duplicate.length}`));
      assert.match(error.message, new RegExp(`sha256=${sha256(duplicate)}`));
      assert.equal(error.message.includes("hk-owned-workload"), false);
      return true;
    },
  );
});

test("parser preserves a legal transient zombie row whose comm field is empty", () => {
  const emptyCommLine = "93401 1 93401 Mon Aug 11 12:42:00 2026 Z+";
  assert.deepEqual(parseHkVisualizationOwnedProcessTable(`${emptyCommLine}\n`), [
    {
      pid: 93401,
      ppid: 1,
      pgid: 93401,
      lstartToken: "Mon Aug 11 12:42:00 2026",
      state: "Z+",
      executableSha256: sha256(""),
    },
  ]);
});

test("parser preserves a fully identified transient row whose state and comm fields are both empty", () => {
  const emptyTrailingFieldsLine = "93402 1 93402 Mon Aug 11 12:42:01 2026";
  assert.deepEqual(
    parseHkVisualizationOwnedProcessTable(`${emptyTrailingFieldsLine}\n`),
    [
      {
        pid: 93402,
        ppid: 1,
        pgid: 93402,
        lstartToken: "Mon Aug 11 12:42:01 2026",
        state: "?",
        executableSha256: sha256(""),
      },
    ],
  );
});

test("parser disambiguates a missing state from a nonempty space-containing comm field", () => {
  const commOnly = "/Volumes/Starship/Google Chrome";
  const missingStateLine =
    `93403 1 93403 Mon Aug 11 12:42:02 2026 ${commOnly}`;
  assert.deepEqual(parseHkVisualizationOwnedProcessTable(`${missingStateLine}\n`), [
    {
      pid: 93403,
      ppid: 1,
      pgid: 93403,
      lstartToken: "Mon Aug 11 12:42:02 2026",
      state: "?",
      executableSha256: sha256(commOnly),
    },
  ]);
});

test("ps error, signal, exit, and non-string output all fail closed without raw output", () => {
  const rawSecret = "secret-command-output-must-not-be-reported";
  for (const [label, result, pattern] of [
    [
      "spawn",
      {
        error: Object.assign(new Error(rawSecret), {
          code: "EACCES",
        }),
        signal: null,
        status: null,
        stdout: rawSecret,
      },
      /ps spawn failed.*EACCES/,
    ],
    [
      "signal",
      { error: undefined, signal: "SIGKILL", status: null, stdout: rawSecret },
      /ps terminated by SIGKILL/,
    ],
    [
      "status",
      { error: undefined, signal: null, status: 7, stdout: rawSecret },
      /ps exited 7/,
    ],
    [
      "stdout",
      { error: undefined, signal: null, status: 0, stdout: null },
      /ps returned non-string stdout/,
    ],
  ]) {
    assert.throws(
      () =>
        sampleHkVisualizationOwnedProcessTable({
          spawnProcessTable: () => result,
        }),
      (error) => {
        assert.match(error.message, pattern, label);
        assert.equal(error.message.includes(rawSecret), false, label);
        return true;
      },
    );
  }

  assert.throws(
    () =>
      sampleHkVisualizationOwnedProcessTable({
        spawnProcessTable() {
          throw new Error(rawSecret);
        },
      }),
    (error) => {
      assert.match(error.message, /ps spawn threw \(Error\)/);
      assert.equal(error.message.includes(rawSecret), false);
      return true;
    },
  );
});

test("seed and verify require the exact direct leader pid, ppid, and pgid", () => {
  const processes = [
    parsedProcess({ pid: 92401, ppid: 92400, pgid: 92401 }),
  ];
  const verified = verifyHkVisualizationDirectProcessLeader({
    expectedLeader: { pid: 92401, ppid: 92400, pgid: 92401 },
    processes,
  });
  assert.equal(verified.pid, 92401);
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92401, ppid: 92400, pgid: 92401 },
    processes,
  });
  assert.deepEqual(ledger.leader, {
    pid: 92401,
    ppid: 92400,
    pgid: 92401,
    lstartToken: processes[0].lstartToken,
  });
  assert.equal(ledger.identities.length, 1);

  for (const expectedLeader of [
    { pid: 92402, ppid: 92400, pgid: 92401 },
    { pid: 92401, ppid: 1, pgid: 92401 },
    { pid: 92401, ppid: 92400, pgid: 99999 },
  ]) {
    assert.throws(
      () =>
        verifyHkVisualizationDirectProcessLeader({
          expectedLeader,
          processes,
        }),
      /exact direct leader/,
    );
  }
});

test("ancestry update discovers descendants but excludes a foreign same-command process", () => {
  const leader = parsedProcess({ pid: 92501, ppid: 92500, pgid: 92501 });
  const command = "/Volumes/Starship/same-command-is-not-an-ownership-token";
  const child = parsedProcess({
    pid: 92502,
    ppid: 92501,
    pgid: 92501,
    command,
  });
  const grandchild = parsedProcess({
    pid: 92503,
    ppid: 92502,
    pgid: 92503,
    command,
  });
  const foreign = parsedProcess({
    pid: 92504,
    ppid: 1,
    pgid: 92504,
    command,
  });
  const seeded = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92501, ppid: 92500, pgid: 92501 },
    processes: [leader, child, grandchild, foreign],
  });
  const updated = updateHkVisualizationOwnedProcessLedger({
    ledger: seeded,
    processes: [leader, child, grandchild, foreign],
  });

  assert.deepEqual(
    updated.identities.map(({ pid }) => pid),
    [92501, 92502, 92503],
  );
  assert.equal(updated.identities.some(({ pid }) => pid === 92504), false);
  assert.equal(JSON.stringify(updated).includes(command), false);
  assert.equal(
    updated.identities.find(({ pid }) => pid === 92502).executableSha256,
    sha256(command),
  );
});

test("a previously observed child stays owned after reparenting into a new PGID", () => {
  const leader = parsedProcess({ pid: 92601, ppid: 92600, pgid: 92601 });
  const childBeforeDetach = parsedProcess({
    pid: 92602,
    ppid: 92601,
    pgid: 92601,
    lstart: "Mon Aug 11 12:35:00 2026",
  });
  let ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92601, ppid: 92600, pgid: 92601 },
    processes: [leader],
  });
  ledger = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [leader, childBeforeDetach],
  });
  const childAfterDetach = parsedProcess({
    pid: 92602,
    ppid: 1,
    pgid: 92602,
    lstart: "Mon Aug 11 12:35:00 2026",
  });
  ledger = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [childAfterDetach],
  });

  assert.deepEqual(
    computeHkVisualizationLiveOwnedProcessEntries({
      ledger,
      processes: [childAfterDetach],
    }).map(({ pid, ppid, pgid }) => ({ pid, ppid, pgid })),
    [{ pid: 92602, ppid: 1, pgid: 92602 }],
  );
  const childIdentity = ledger.identities.find(({ pid }) => pid === 92602);
  assert.equal(childIdentity.lastPpid, 1);
  assert.equal(childIdentity.lastPgid, 92602);
});

test("ledger validation rejects ancestry cycles that do not reach the exact leader", () => {
  const leader = parsedProcess({ pid: 92611, ppid: 92610, pgid: 92611 });
  const child = parsedProcess({
    pid: 92612,
    ppid: 92611,
    pgid: 92611,
    lstart: "Mon Aug 11 12:35:01 2026",
  });
  const grandchild = parsedProcess({
    pid: 92613,
    ppid: 92612,
    pgid: 92613,
    lstart: "Mon Aug 11 12:35:02 2026",
  });
  let ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92611, ppid: 92610, pgid: 92611 },
    processes: [leader],
  });
  ledger = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [leader, child, grandchild],
  });
  const forged = structuredClone(ledger);
  const forgedChild = forged.identities.find(({ pid }) => pid === 92612);
  const forgedGrandchild = forged.identities.find(({ pid }) => pid === 92613);
  forgedChild.firstSeenPpid = forgedGrandchild.pid;
  forgedChild.discoveredFromPid = forgedGrandchild.pid;
  forgedChild.discoveredFromLstartToken = forgedGrandchild.lstartToken;
  forgedGrandchild.firstSeenPpid = forgedChild.pid;
  forgedGrandchild.discoveredFromPid = forgedChild.pid;
  forgedGrandchild.discoveredFromLstartToken = forgedChild.lstartToken;
  assert.throws(
    () =>
      updateHkVisualizationOwnedProcessLedger({
        ledger: forged,
        processes: [],
      }),
    /cyclic ancestry|does not reach/i,
  );
});

test("PID and PGID reuse with a different lstart token is never treated as live ownership", () => {
  const ledger = seedLedger({
    pid: 92701,
    ppid: 92700,
    pgid: 92701,
    lstart: "Mon Aug 11 12:36:00 2026",
  });
  const replacement = parsedProcess({
    pid: 92701,
    ppid: 1,
    pgid: 92701,
    lstart: "Mon Aug 11 12:36:01 2026",
    command: "/Volumes/Starship/foreign-pid-replacement",
  });
  const updated = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [replacement],
  });
  assert.deepEqual(
    computeHkVisualizationLiveOwnedProcessEntries({
      ledger: updated,
      processes: [replacement],
    }),
    [],
  );
  assert.equal(updated.identities.length, 1);
});

test("cleanup re-samples exact pid+lstart and sends no signal to a reused identity", async () => {
  const observer = observerFixture();
  const ledger = seedLedger({
    pid: 92801,
    ppid: 92800,
    pgid: 92801,
    lstart: "Mon Aug 11 12:37:00 2026",
  });
  const replacement = parsedProcess({
    pid: 92801,
    ppid: 1,
    pgid: 92801,
    lstart: "Mon Aug 11 12:37:01 2026",
  });
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () => [observer.processEntry, replacement],
    signalProcess(...args) {
      signals.push(["pid", ...args]);
    },
    signalProcessGroup(...args) {
      signals.push(["group", ...args]);
    },
    termGraceMs: 0,
    killGraceMs: 0,
  });
  assert.deepEqual(signals, []);
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, true);
  assert.ok(cleanup.finalConfirmationGapMs > 0);
});

test("cleanup rejects unsafe injected identities before any PID or group signal", async () => {
  const observer = observerFixture();
  const ledger = seedLedger();
  const valid = parsedProcess();
  for (const [label, unsafe] of [
    ["pid-one", { ...valid, pid: 1 }],
    ["pgid-one", { ...valid, pgid: 1 }],
    ["negative-ppid", { ...valid, ppid: -1 }],
    ["unstable-start", { ...valid, lstartToken: "yesterday" }],
    ["bad-state", { ...valid, state: "S secret" }],
  ]) {
    const signals = [];
    await assert.rejects(
      cleanupHkVisualizationOwnedProcessLedger({
        ledger,
        observerIdentity: observer.identity,
        sampleProcesses: () => [observer.processEntry, unsafe],
        signalProcess(...args) {
          signals.push(["pid", ...args]);
        },
        signalProcessGroup(...args) {
          signals.push(["group", ...args]);
        },
        termGraceMs: 0,
        killGraceMs: 0,
      }),
      /unsafe process identity/,
      label,
    );
    assert.deepEqual(signals, [], label);
  }
});

test("cleanup signals exact PIDs first, then a group only when every live group member is ledger-owned", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({ pid: 92901, ppid: 92900, pgid: 92901 });
  const child = parsedProcess({
    pid: 92902,
    ppid: 92901,
    pgid: 92901,
    lstart: "Mon Aug 11 12:38:00 2026",
  });
  let ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92901, ppid: 92900, pgid: 92901 },
    processes: [leader],
  });
  ledger = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [leader, child],
  });
  let current = [observer.processEntry, leader, child];
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () => current,
    signalProcess(pid, signal) {
      signals.push(["pid", pid, signal]);
    },
    signalProcessGroup(target, signal) {
      signals.push(["group", target, signal]);
      current = [observer.processEntry];
    },
    termGraceMs: 0,
    killGraceMs: 0,
  });
  assert.deepEqual(signals, [
    ["pid", 92901, "SIGTERM"],
    ["pid", 92902, "SIGTERM"],
    ["group", -92901, "SIGTERM"],
  ]);
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, true);
  assert.equal(cleanup.signalEvidence[0].scope, "pid");
  assert.equal(cleanup.signalEvidence.at(-1).scope, "group");
  assert.deepEqual(
    cleanup.observations.slice(-2).map(({ phase, members }) => ({
      phase,
      members: members.length,
    })),
    [
      { phase: "final-confirmation", members: 0 },
      { phase: "final", members: 0 },
    ],
  );
});

test("cleanup never group-signals a process group whose remaining exact-owned members are all zombies", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 92911,
    ppid: 92910,
    pgid: 92911,
    lstart: "Mon Aug 11 12:38:10 2026",
  });
  const zombie = parsedProcess({
    pid: 92911,
    ppid: 92910,
    pgid: 92911,
    lstart: "Mon Aug 11 12:38:10 2026",
    state: "Z+",
    command: "",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92911, ppid: 92910, pgid: 92911 },
    processes: [leader],
  });
  const snapshots = [
    [observer.processEntry, leader],
    [observer.processEntry, leader],
    [observer.processEntry, leader],
    [observer.processEntry, zombie],
    [observer.processEntry],
    [observer.processEntry],
    [observer.processEntry],
  ];
  let sampleIndex = 0;
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () =>
      snapshots[Math.min(sampleIndex++, snapshots.length - 1)],
    signalProcess(pid, signal) {
      signals.push(["pid", pid, signal]);
    },
    signalProcessGroup(target, signal) {
      signals.push(["group", target, signal]);
    },
    termGraceMs: 0,
    killGraceMs: 0,
  });

  assert.deepEqual(signals, [["pid", 92911, "SIGTERM"]]);
  assert.deepEqual(cleanup.signalErrors, []);
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, true);
  assert.equal(
    cleanup.observations.some(
      ({ phase, members }) =>
        phase === "sigterm-before-group" &&
        members.length === 1 &&
        members[0].state === "Z+",
    ),
    true,
  );
});

test("cleanup never group-signals a process group whose exact-owned members all have unknown state", async () => {
  const observer = observerFixture();
  const unknown = parsedProcess({
    pid: 92921,
    ppid: 92920,
    pgid: 92921,
    lstart: "Mon Aug 11 12:38:20 2026",
    state: "?",
    command: "",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 92921, ppid: 92920, pgid: 92921 },
    processes: [unknown],
  });
  const snapshots = [
    [observer.processEntry, unknown],
    [observer.processEntry, unknown],
    [observer.processEntry, unknown],
    [observer.processEntry, unknown],
    [observer.processEntry],
    [observer.processEntry],
    [observer.processEntry],
  ];
  let sampleIndex = 0;
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () =>
      snapshots[Math.min(sampleIndex++, snapshots.length - 1)],
    signalProcess(pid, signal) {
      signals.push(["pid", pid, signal]);
    },
    signalProcessGroup(target, signal) {
      signals.push(["group", target, signal]);
    },
    termGraceMs: 0,
    killGraceMs: 0,
  });
  assert.deepEqual(signals, [["pid", 92921, "SIGTERM"]]);
  assert.equal(cleanup.confirmedEmpty, true);
  assert.deepEqual(cleanup.signalErrors, []);
});

test("cleanup rejects observer-as-owned overlap before sending any signal", async () => {
  const observer = observerFixture();
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: observer.processEntry.pid,
      ppid: observer.processEntry.ppid,
      pgid: observer.processEntry.pgid,
    },
    processes: [observer.processEntry],
  });
  const signals = [];
  await assert.rejects(
    cleanupHkVisualizationOwnedProcessLedger({
      ledger,
      observerIdentity: observer.identity,
      sampleProcesses: () => [observer.processEntry],
      signalProcess(...args) {
        signals.push(["pid", ...args]);
      },
      signalProcessGroup(...args) {
        signals.push(["group", ...args]);
      },
    }),
    /overlaps its exact observer identity/,
  );
  assert.deepEqual(signals, []);
});

test("cleanup never group-signals when a foreign exact identity shares the PGID", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({ pid: 93001, ppid: 93000, pgid: 93001 });
  const foreign = parsedProcess({
    pid: 93002,
    ppid: 1,
    pgid: 93001,
    lstart: "Mon Aug 11 12:39:00 2026",
    command: "/Volumes/Starship/foreign-group-member",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 93001, ppid: 93000, pgid: 93001 },
    processes: [leader, foreign],
  });
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () => [observer.processEntry, leader, foreign],
    signalProcess(pid, signal) {
      signals.push(["pid", pid, signal]);
    },
    signalProcessGroup(target, signal) {
      signals.push(["group", target, signal]);
    },
    termGraceMs: 0,
    killGraceMs: 0,
  });
  assert.deepEqual(signals, [
    ["pid", 93001, "SIGTERM"],
    ["pid", 93001, "SIGKILL"],
  ]);
  assert.deepEqual(cleanup.finalLiveEntries.map(({ pid }) => pid), [93001]);
});

test("cleanup records EPERM without abandoning final ownership proof and can never summarize it as clean", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 93011,
    ppid: 93010,
    pgid: 93011,
    lstart: "Mon Aug 11 12:39:10 2026",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 93011, ppid: 93010, pgid: 93011 },
    processes: [leader],
  });
  let current = [observer.processEntry, leader];
  let signalCount = 0;
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () => current,
    signalProcess() {
      signalCount += 1;
      if (signalCount === 1) {
        throw Object.assign(new Error("private operating-system detail"), {
          code: "EPERM",
        });
      }
      current = [observer.processEntry];
    },
    signalProcessGroup() {},
    termGraceMs: 0,
    killGraceMs: 0,
  });

  assert.equal(signalCount, 2, "cleanup must continue to the KILL stage");
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, false);
  assert.deepEqual(cleanup.signalErrors, [
    {
      scope: "pid",
      target: 93011,
      signal: "SIGTERM",
      code: "EPERM",
      pid: 93011,
      pgid: 93011,
      lstartToken: "Mon Aug 11 12:39:10 2026",
    },
  ]);
  assert.equal(JSON.stringify(cleanup).includes("private operating-system detail"), false);
});

test("cleanup rejects an empty or observer-less successful process snapshot instead of declaring a live owner clean", async () => {
  const observer = observerFixture();
  const ledger = seedLedger({
    pid: 93101,
    ppid: 93100,
    pgid: 93101,
    lstart: "Mon Aug 11 12:40:00 2026",
  });
  for (const [label, sample] of [
    ["empty", []],
    [
      "owner-only",
      [
        parsedProcess({
          pid: 93101,
          ppid: 93100,
          pgid: 93101,
          lstart: "Mon Aug 11 12:40:00 2026",
        }),
      ],
    ],
  ]) {
    const signals = [];
    await assert.rejects(
      cleanupHkVisualizationOwnedProcessLedger({
        ledger,
        observerIdentity: observer.identity,
        sampleProcesses: () => sample,
        signalProcess(...args) {
          signals.push(["pid", ...args]);
        },
        signalProcessGroup(...args) {
          signals.push(["group", ...args]);
        },
      }),
      /exact observer pid\+lstart anchor/,
      label,
    );
    assert.deepEqual(signals, [], label);
  }
});

test("a nonempty penultimate sample cannot be summarized as confirmed clean by one final empty sample", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 93201,
    ppid: 93200,
    pgid: 93201,
    lstart: "Mon Aug 11 12:41:00 2026",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: { pid: 93201, ppid: 93200, pgid: 93201 },
    processes: [leader],
  });
  const snapshots = [
    [observer.processEntry],
    [observer.processEntry, leader],
    [observer.processEntry],
  ];
  let sampleIndex = 0;
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    sampleProcesses: () => snapshots[Math.min(sampleIndex++, 2)],
    signalProcess() {
      throw new Error("no cleanup signal is expected after an initially empty sample");
    },
    signalProcessGroup() {
      throw new Error("no group signal is expected after an initially empty sample");
    },
    wait: async () => {},
  });
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, false);
  assert.deepEqual(
    cleanup.observations.slice(-2).map(({ phase, members }) => ({
      phase,
      pids: members.map(({ pid }) => pid),
    })),
    [
      { phase: "final-confirmation", pids: [93201] },
      { phase: "final", pids: [] },
    ],
  );
});

test("one aggregate monotonic deadline bounds many identity samples and stops every later PID or group action", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 93301,
    ppid: 93300,
    pgid: 93301,
    lstart: "Mon Aug 11 12:42:00 2026",
  });
  const children = Array.from({ length: 40 }, (_, index) =>
    parsedProcess({
      pid: 93302 + index,
      ppid: leader.pid,
      pgid: leader.pgid,
      lstart: "Mon Aug 11 12:42:01 2026",
    }),
  );
  let ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
    },
    processes: [leader],
  });
  ledger = updateHkVisualizationOwnedProcessLedger({
    ledger,
    processes: [leader, ...children],
  });
  let monotonicNs = 0n;
  const sampleTimeouts = [];
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    cleanupBudgetMs: 8,
    monotonicNow: () => monotonicNs,
    sampleProcesses({ timeoutMs }) {
      sampleTimeouts.push(timeoutMs);
      monotonicNs += 2_000_000n;
      return [observer.processEntry, leader, ...children];
    },
    signalProcess(pid, signal) {
      signals.push(["pid", pid, signal]);
    },
    signalProcessGroup(target, signal) {
      signals.push(["group", target, signal]);
    },
    wait: async () => {
      throw new Error("deadline must expire before a wait");
    },
  });

  assert.deepEqual(sampleTimeouts, [8, 6, 4, 2]);
  assert.deepEqual(signals, [["pid", leader.pid, "SIGTERM"]]);
  assert.equal(cleanup.confirmedEmpty, false);
  assert.equal(cleanup.finalLiveEntries.length, 41);
  assert.equal(cleanup.observations.at(-1).phase, "deadline-expired");
  assert.deepEqual(cleanup.cleanupTiming, {
    clock: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
    plannedBudgetMs: 8,
    startedMonotonicNs: "0",
    deadlineMonotonicNs: "8000000",
    completedMonotonicNs: "8000000",
    elapsedMs: 8,
    remainingMs: 0,
    expired: true,
    expiryPhase: "sigterm-before-pid-sample-complete",
    sampleCount: 4,
    minimumSampleTimeoutMs: 2,
    maximumSampleTimeoutMs: 8,
  });
});

test("a slow sampler that consumes the aggregate deadline cannot turn its returned empty snapshot into containment proof", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 93401,
    ppid: 93400,
    pgid: 93401,
    lstart: "Mon Aug 11 12:43:00 2026",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
    },
    processes: [leader],
  });
  let monotonicNs = 0n;
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    cleanupBudgetMs: 10,
    monotonicNow: () => monotonicNs,
    sampleProcesses({ timeoutMs }) {
      assert.equal(timeoutMs, 10);
      monotonicNs += 11_000_000n;
      return [observer.processEntry];
    },
    signalProcess() {
      throw new Error("an over-deadline sample must not authorize a signal");
    },
    signalProcessGroup() {
      throw new Error("an over-deadline sample must not authorize a group signal");
    },
    wait: async () => {
      throw new Error("an over-deadline sample must not authorize a wait");
    },
  });

  assert.equal(cleanup.cleanupTiming.expired, true);
  assert.equal(cleanup.cleanupTiming.expiryPhase, "before-cleanup-sample-complete");
  assert.equal(cleanup.confirmedEmpty, false);
  assert.deepEqual(cleanup.finalLiveEntries.map(({ pid }) => pid), [leader.pid]);
});

test("every wait is capped by aggregate remaining time and an expired wait preserves the last live identity", async () => {
  const observer = observerFixture();
  const leader = parsedProcess({
    pid: 93501,
    ppid: 93500,
    pgid: 93501,
    lstart: "Mon Aug 11 12:44:00 2026",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
    },
    processes: [leader],
  });
  let monotonicNs = 0n;
  const waits = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: observer.identity,
    cleanupBudgetMs: 7,
    monotonicNow: () => monotonicNs,
    sampleProcesses({ timeoutMs }) {
      assert.ok(timeoutMs >= 1 && timeoutMs <= 7);
      monotonicNs += 1_000_000n;
      return [observer.processEntry, leader];
    },
    signalProcess() {},
    signalProcessGroup() {},
    async wait(milliseconds) {
      waits.push(milliseconds);
      monotonicNs += BigInt(milliseconds) * 1_000_000n;
    },
  });

  assert.deepEqual(waits, [2]);
  assert.equal(cleanup.cleanupTiming.expired, true);
  assert.equal(cleanup.cleanupTiming.expiryPhase, "after-term-wait-complete");
  assert.equal(cleanup.confirmedEmpty, false);
  assert.deepEqual(cleanup.finalLiveEntries.map(({ pid }) => pid), [leader.pid]);
  assert.equal(
    cleanup.cleanupTiming.maximumSampleTimeoutMs <=
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS,
    true,
  );
});

test("bounded polling limitation explicitly rejects a guarantee for never-observed reparented descendants", () => {
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /never observed/i,
  );
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /reparent/i,
  );
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /cannot guarantee/i,
  );
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /sample-to-signal/i,
  );
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /same-second PID reuse/i,
  );
  assert.match(
    HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    /start barrier/i,
  );
});
