import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA =
  "hk-viz-owned-process-ledger-v1";
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS = Object.freeze([
  "-axww",
  "-o",
  "pid=,ppid=,pgid=,lstart=,state=,comm=",
]);
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS = 5_000;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER =
  4 * 1024 * 1024;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_TERM_GRACE_MS = 2_000;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_KILL_GRACE_MS = 2_000;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS = 50;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS = 20_000;
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK =
  "process.hrtime.bigint";

/**
 * This design intentionally avoids process environments. Its ownership proof is
 * therefore bounded by sampling: a descendant that forks and reparents before it
 * is ever observed cannot be guaranteed discoverable by a later PPID snapshot.
 */
export const HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION =
  "Bounded polling cannot guarantee ownership of a descendant that is never observed before it forks and reparents; the integration must seed behind a start barrier before release and then poll continuously. Once observed, exact pid+lstart identity remains retained across reparenting and PGID changes, but macOS lstart has only one-second resolution, so same-second PID reuse cannot be distinguished by this ledger. macOS also exposes no atomic pidfd-style sample-and-signal handle here, so a residual sample-to-signal PID/PGID reuse race must remain fail-closed release risk evidence.";

const PROCESS_KEYS = Object.freeze([
  "pid",
  "ppid",
  "pgid",
  "lstartToken",
  "state",
  "executableSha256",
]);
const IDENTITY_KEYS = Object.freeze([
  "pid",
  "lstartToken",
  "firstSeenPpid",
  "firstSeenPgid",
  "lastPpid",
  "lastPgid",
  "state",
  "executableSha256",
  "discoveredFromPid",
  "discoveredFromLstartToken",
]);
const LEDGER_KEYS = Object.freeze([
  "schemaVersion",
  "revision",
  "leader",
  "identities",
  "boundedPollingLimitation",
]);
const WEEKDAY_PATTERN = "(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)";
const MONTH_PATTERN = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const LSTART_TOKEN_PATTERN = new RegExp(
  `^${WEEKDAY_PATTERN} ${MONTH_PATTERN} (?:0[1-9]|[12][0-9]|3[01]) ` +
    "(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9] [0-9]{4}$",
);
const STATE_PATTERN = /^(?:[DIRSTUZWX][+<>AELNSsVWXl]*|\?)$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactObjectKeys(value, expectedKeys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...expectedKeys].sort())
  );
}

function identityKey({ pid, lstartToken }) {
  return `${pid}:${lstartToken}`;
}

function safeLineDiagnostic(line, lineIndex) {
  return `ps line ${lineIndex}; length=${line.length}; sha256=${sha256(line)}`;
}

function normalizeLstartToken(weekday, month, day, time, year) {
  const normalized = `${weekday} ${month} ${String(Number(day)).padStart(2, "0")} ${time} ${year}`;
  if (!LSTART_TOKEN_PATTERN.test(normalized)) return null;
  const monthIndex = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].indexOf(month);
  const calendarProbe = new Date(0);
  calendarProbe.setUTCHours(0, 0, 0, 0);
  calendarProbe.setUTCFullYear(Number(year), monthIndex, Number(day));
  if (
    calendarProbe.getUTCFullYear() !== Number(year) ||
    calendarProbe.getUTCMonth() !== monthIndex ||
    calendarProbe.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return normalized;
}

function isSafeProcessNumber(value, minimum) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function validateProcessEntry(entry, index, label = "process sampler") {
  if (
    !exactObjectKeys(entry, PROCESS_KEYS) ||
    !isSafeProcessNumber(entry.pid, 2) ||
    !isSafeProcessNumber(entry.ppid, 0) ||
    !isSafeProcessNumber(entry.pgid, 2) ||
    typeof entry.lstartToken !== "string" ||
    !LSTART_TOKEN_PATTERN.test(entry.lstartToken) ||
    typeof entry.state !== "string" ||
    !STATE_PATTERN.test(entry.state) ||
    typeof entry.executableSha256 !== "string" ||
    !SHA256_PATTERN.test(entry.executableSha256)
  ) {
    throw new Error(`${label} returned unsafe process identity at index ${index}.`);
  }
}

function validateProcesses(processes, label = "process sampler") {
  if (!Array.isArray(processes)) {
    throw new Error(`${label} must return an array.`);
  }
  const seenPids = new Set();
  for (const [index, entry] of processes.entries()) {
    validateProcessEntry(entry, index, label);
    if (seenPids.has(entry.pid)) {
      throw new Error(`${label} returned duplicate pid at index ${index}.`);
    }
    seenPids.add(entry.pid);
  }
  return processes;
}

function copyProcess(entry) {
  return Object.freeze({
    pid: entry.pid,
    ppid: entry.ppid,
    pgid: entry.pgid,
    lstartToken: entry.lstartToken,
    state: entry.state,
    executableSha256: entry.executableSha256,
  });
}

function copyIdentity(identity) {
  return Object.freeze({
    pid: identity.pid,
    lstartToken: identity.lstartToken,
    firstSeenPpid: identity.firstSeenPpid,
    firstSeenPgid: identity.firstSeenPgid,
    lastPpid: identity.lastPpid,
    lastPgid: identity.lastPgid,
    state: identity.state,
    executableSha256: identity.executableSha256,
    discoveredFromPid: identity.discoveredFromPid,
    discoveredFromLstartToken: identity.discoveredFromLstartToken,
  });
}

function identityFromProcess(processEntry, discoveredFrom = null) {
  return copyIdentity({
    pid: processEntry.pid,
    lstartToken: processEntry.lstartToken,
    firstSeenPpid: processEntry.ppid,
    firstSeenPgid: processEntry.pgid,
    lastPpid: processEntry.ppid,
    lastPgid: processEntry.pgid,
    state: processEntry.state,
    executableSha256: processEntry.executableSha256,
    discoveredFromPid: discoveredFrom?.pid ?? null,
    discoveredFromLstartToken: discoveredFrom?.lstartToken ?? null,
  });
}

function validateIdentity(identity, index) {
  if (
    !exactObjectKeys(identity, IDENTITY_KEYS) ||
    !isSafeProcessNumber(identity.pid, 2) ||
    typeof identity.lstartToken !== "string" ||
    !LSTART_TOKEN_PATTERN.test(identity.lstartToken) ||
    !isSafeProcessNumber(identity.firstSeenPpid, 0) ||
    !isSafeProcessNumber(identity.firstSeenPgid, 2) ||
    !isSafeProcessNumber(identity.lastPpid, 0) ||
    !isSafeProcessNumber(identity.lastPgid, 2) ||
    typeof identity.state !== "string" ||
    !STATE_PATTERN.test(identity.state) ||
    typeof identity.executableSha256 !== "string" ||
    !SHA256_PATTERN.test(identity.executableSha256) ||
    !(
      (identity.discoveredFromPid === null &&
        identity.discoveredFromLstartToken === null) ||
      (isSafeProcessNumber(identity.discoveredFromPid, 2) &&
        typeof identity.discoveredFromLstartToken === "string" &&
        LSTART_TOKEN_PATTERN.test(identity.discoveredFromLstartToken))
    )
  ) {
    throw new Error(`Owned process ledger contains unsafe identity at index ${index}.`);
  }
}

function validateLedger(ledger) {
  if (
    !exactObjectKeys(ledger, LEDGER_KEYS) ||
    ledger.schemaVersion !== HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA ||
    !Number.isSafeInteger(ledger.revision) ||
    ledger.revision < 0 ||
    !exactObjectKeys(ledger.leader, ["pid", "ppid", "pgid", "lstartToken"]) ||
    !isSafeProcessNumber(ledger.leader.pid, 2) ||
    !isSafeProcessNumber(ledger.leader.ppid, 0) ||
    !isSafeProcessNumber(ledger.leader.pgid, 2) ||
    typeof ledger.leader.lstartToken !== "string" ||
    !LSTART_TOKEN_PATTERN.test(ledger.leader.lstartToken) ||
    !Array.isArray(ledger.identities) ||
    ledger.boundedPollingLimitation !==
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION
  ) {
    throw new Error("Owned process ledger shape or policy is invalid.");
  }
  const seen = new Set();
  for (const [index, identity] of ledger.identities.entries()) {
    validateIdentity(identity, index);
    const key = identityKey(identity);
    if (seen.has(key)) {
      throw new Error(`Owned process ledger contains duplicate identity at index ${index}.`);
    }
    seen.add(key);
  }
  for (const [index, identity] of ledger.identities.entries()) {
    if (identity.discoveredFromPid === null) continue;
    const parentKey = identityKey({
      pid: identity.discoveredFromPid,
      lstartToken: identity.discoveredFromLstartToken,
    });
    if (!seen.has(parentKey) || identity.firstSeenPpid !== identity.discoveredFromPid) {
      throw new Error(
        `Owned process ledger contains invalid ancestry at index ${index}.`,
      );
    }
  }
  const identityByKey = new Map(
    ledger.identities.map((identity) => [identityKey(identity), identity]),
  );
  const leaderKey = identityKey(ledger.leader);
  for (const [index, identity] of ledger.identities.entries()) {
    const ancestry = new Set();
    let current = identity;
    while (identityKey(current) !== leaderKey) {
      const currentKey = identityKey(current);
      if (ancestry.has(currentKey)) {
        throw new Error(
          `Owned process ledger contains cyclic ancestry at index ${index}.`,
        );
      }
      ancestry.add(currentKey);
      if (
        current.discoveredFromPid === null ||
        current.discoveredFromLstartToken === null
      ) {
        throw new Error(
          `Owned process ledger ancestry does not reach its leader at index ${index}.`,
        );
      }
      const parentKey = identityKey({
        pid: current.discoveredFromPid,
        lstartToken: current.discoveredFromLstartToken,
      });
      const parent = identityByKey.get(parentKey);
      if (!parent) {
        throw new Error(
          `Owned process ledger ancestry is missing a parent at index ${index}.`,
        );
      }
      current = parent;
    }
  }
  const leaderIdentity = ledger.identities.find(
    (identity) => identityKey(identity) === identityKey(ledger.leader),
  );
  if (
    !leaderIdentity ||
    leaderIdentity.firstSeenPpid !== ledger.leader.ppid ||
    leaderIdentity.firstSeenPgid !== ledger.leader.pgid ||
    leaderIdentity.discoveredFromPid !== null ||
    leaderIdentity.discoveredFromLstartToken !== null
  ) {
    throw new Error("Owned process ledger leader identity is not internally consistent.");
  }
  return ledger;
}

function freezeLedger({ revision, leader, identities }) {
  return Object.freeze({
    schemaVersion: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
    revision,
    leader: Object.freeze({ ...leader }),
    identities: Object.freeze(identities.map(copyIdentity)),
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  });
}

export function parseHkVisualizationOwnedProcessTable(stdout) {
  if (typeof stdout !== "string") {
    throw new Error("Owned process ps returned non-string stdout.");
  }
  const entries = [];
  const seenPids = new Set();
  for (const [lineIndex, line] of stdout.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = line.match(
      new RegExp(
        `^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(${WEEKDAY_PATTERN})\\s+` +
          `(${MONTH_PATTERN})\\s+(\\d{1,2})\\s+` +
          "((?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9])\\s+" +
          "([0-9]{4})(?:\\s+(.*\\S))?\\s*$",
        "s",
      ),
    );
    if (!match) {
      throw new Error(
        `Owned process ledger could not parse ${safeLineDiagnostic(line, lineIndex)}.`,
      );
    }
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const pgid = Number(match[3]);
    const lstartToken = normalizeLstartToken(
      match[4],
      match[5],
      match[6],
      match[7],
      match[8],
    );
    const trailingFields = match[9] ?? "";
    const trailingMatch = trailingFields.match(/^(\S+)(?:\s+(.*\S))?$/s);
    // macOS can materialise an exiting row with either trailing presentation
    // column absent. A strict, known state token is consumed as `state=`;
    // otherwise the whole tail is the (possibly space-containing) `comm=` and
    // state is explicitly unknown. Persist only the command hash.
    const hasKnownState =
      trailingMatch !== null && STATE_PATTERN.test(trailingMatch[1]);
    const state = hasKnownState ? trailingMatch[1] : "?";
    const executable = hasKnownState
      ? (trailingMatch[2] ?? "")
      : trailingFields;
    const unsafeReasons = [];
    if (!Number.isSafeInteger(pid)) unsafeReasons.push("pid");
    if (!isSafeProcessNumber(ppid, 0)) unsafeReasons.push("ppid");
    if (!Number.isSafeInteger(pgid)) unsafeReasons.push("pgid");
    if (lstartToken === null) unsafeReasons.push("lstart");
    if (!STATE_PATTERN.test(state)) unsafeReasons.push("state");
    if (unsafeReasons.length > 0) {
      throw new Error(
        `Owned process ledger rejected unsafe identity (${unsafeReasons.join("+")}) at ${safeLineDiagnostic(line, lineIndex)}.`,
      );
    }
    // `ps -ax` necessarily includes launchd/kernel identities such as 1/1.
    // They are valid table rows but are never safe ownership or signal targets.
    if (pid <= 1 || pgid <= 1) continue;
    if (seenPids.has(pid)) {
      throw new Error(
        `Owned process ledger rejected duplicate pid at ${safeLineDiagnostic(line, lineIndex)}.`,
      );
    }
    seenPids.add(pid);
    entries.push(
      copyProcess({
        pid,
        ppid,
        pgid,
        lstartToken,
        state,
        executableSha256: sha256(executable),
      }),
    );
  }
  return Object.freeze(entries);
}

function safeSpawnErrorCode(error) {
  const candidate =
    error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : error instanceof Error
        ? error.name
        : "UNKNOWN";
  return /^[A-Za-z0-9_-]{1,64}$/.test(candidate) ? candidate : "UNKNOWN";
}

function safeProcessSignal(signal) {
  return typeof signal === "string" && /^SIG[A-Z0-9]{1,32}$/.test(signal)
    ? signal
    : "UNKNOWN";
}

function safeProcessExitStatus(status) {
  return Number.isSafeInteger(status) && status >= 0 && status <= 255
    ? String(status)
    : "UNKNOWN";
}

export function sampleHkVisualizationOwnedProcessTable({
  spawnProcessTable = spawnSync,
  observerIdentity = null,
  observerPid = process.pid,
  timeoutMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
} = {}) {
  if (typeof spawnProcessTable !== "function") {
    throw new Error("Owned process sampler requires a spawn function.");
  }
  if (!isSafeProcessNumber(observerPid, 2)) {
    throw new Error("Owned process observer pid is unsafe.");
  }
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS
  ) {
    throw new Error(
      `Owned process ps timeout must be an integer from 1 through ${HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS} ms.`,
    );
  }
  let result;
  try {
    result = spawnProcessTable(
      "/bin/ps",
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS,
      {
        encoding: "utf8",
        env: { LANG: "C", LC_ALL: "C" },
        maxBuffer: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
        timeout: timeoutMs,
      },
    );
  } catch (error) {
    throw new Error(
      `Owned process ps spawn threw (${safeSpawnErrorCode(error)}).`,
    );
  }
  if (result?.error) {
    throw new Error(
      `Owned process ps spawn failed (${safeSpawnErrorCode(result.error)}).`,
    );
  }
  if (result?.signal) {
    throw new Error(
      `Owned process ps terminated by ${safeProcessSignal(result.signal)}.`,
    );
  }
  if (result?.status !== 0) {
    throw new Error(
      `Owned process ps exited ${safeProcessExitStatus(result?.status)}.`,
    );
  }
  if (typeof result.stdout !== "string") {
    throw new Error("Owned process ps returned non-string stdout.");
  }
  const processes = parseHkVisualizationOwnedProcessTable(result.stdout);
  verifyHkVisualizationProcessObserver({
    observerIdentity,
    observerPid,
    processes,
  });
  return processes;
}

export function verifyHkVisualizationProcessObserver({
  observerIdentity = null,
  observerPid,
  processes,
}) {
  if (!isSafeProcessNumber(observerPid, 2)) {
    throw new Error("Owned process observer pid is unsafe.");
  }
  validateProcesses(processes, "owned process observer sampler");
  if (
    observerIdentity !== null &&
    (!exactObjectKeys(observerIdentity, ["pid", "lstartToken"]) ||
      observerIdentity.pid !== observerPid ||
      typeof observerIdentity.lstartToken !== "string" ||
      !LSTART_TOKEN_PATTERN.test(observerIdentity.lstartToken))
  ) {
    throw new Error("Owned process observer identity is unsafe.");
  }
  const observer = processes.find(({ pid }) => pid === observerPid);
  if (
    !observer ||
    (observerIdentity !== null &&
      observer.lstartToken !== observerIdentity.lstartToken)
  ) {
    throw new Error(
      "Owned process sampler did not preserve the exact observer pid+lstart anchor.",
    );
  }
  return copyProcess(observer);
}

function validateExpectedLeader(expectedLeader) {
  if (
    !exactObjectKeys(expectedLeader, ["pid", "ppid", "pgid"]) ||
    !isSafeProcessNumber(expectedLeader.pid, 2) ||
    !isSafeProcessNumber(expectedLeader.ppid, 0) ||
    !isSafeProcessNumber(expectedLeader.pgid, 2)
  ) {
    throw new Error("Owned process exact direct leader expectation is unsafe.");
  }
}

export function verifyHkVisualizationDirectProcessLeader({
  expectedLeader,
  processes,
}) {
  validateExpectedLeader(expectedLeader);
  validateProcesses(processes);
  const match = processes.find(({ pid }) => pid === expectedLeader.pid);
  if (
    !match ||
    match.ppid !== expectedLeader.ppid ||
    match.pgid !== expectedLeader.pgid
  ) {
    throw new Error(
      "Owned process ledger could not verify the exact direct leader pid, ppid, and pgid.",
    );
  }
  return copyProcess(match);
}

export function seedHkVisualizationOwnedProcessLedger({
  expectedLeader,
  processes,
}) {
  const leaderProcess = verifyHkVisualizationDirectProcessLeader({
    expectedLeader,
    processes,
  });
  return freezeLedger({
    revision: 0,
    leader: {
      pid: leaderProcess.pid,
      ppid: leaderProcess.ppid,
      pgid: leaderProcess.pgid,
      lstartToken: leaderProcess.lstartToken,
    },
    identities: [identityFromProcess(leaderProcess)],
  });
}

function refreshIdentity(identity, processEntry) {
  return copyIdentity({
    ...identity,
    lastPpid: processEntry.ppid,
    lastPgid: processEntry.pgid,
    state: processEntry.state,
    executableSha256: processEntry.executableSha256,
  });
}

export function updateHkVisualizationOwnedProcessLedger({ ledger, processes }) {
  validateLedger(ledger);
  validateProcesses(processes);
  const currentByIdentity = new Map(
    processes.map((entry) => [identityKey(entry), entry]),
  );
  const identities = ledger.identities.map((identity) => {
    const current = currentByIdentity.get(identityKey(identity));
    return current ? refreshIdentity(identity, current) : copyIdentity(identity);
  });
  const knownByIdentity = new Map(
    identities.map((identity) => [identityKey(identity), identity]),
  );
  const liveOwnedByPid = new Map();
  for (const identity of identities) {
    const current = currentByIdentity.get(identityKey(identity));
    if (current) liveOwnedByPid.set(current.pid, current);
  }

  let discovered = true;
  while (discovered) {
    discovered = false;
    const candidates = processes
      .filter((entry) => !knownByIdentity.has(identityKey(entry)))
      .filter((entry) => liveOwnedByPid.has(entry.ppid))
      .sort(
        (left, right) =>
          left.pid - right.pid ||
          left.lstartToken.localeCompare(right.lstartToken),
      );
    for (const processEntry of candidates) {
      if (knownByIdentity.has(identityKey(processEntry))) continue;
      const parent = liveOwnedByPid.get(processEntry.ppid);
      if (!parent) continue;
      const identity = identityFromProcess(processEntry, parent);
      identities.push(identity);
      knownByIdentity.set(identityKey(identity), identity);
      liveOwnedByPid.set(processEntry.pid, processEntry);
      discovered = true;
    }
  }

  return freezeLedger({
    revision: ledger.revision + 1,
    leader: ledger.leader,
    identities,
  });
}

export function computeHkVisualizationLiveOwnedProcessEntries({
  ledger,
  processes,
}) {
  validateLedger(ledger);
  validateProcesses(processes);
  const ownedIdentityKeys = new Set(ledger.identities.map(identityKey));
  return Object.freeze(
    processes
      .filter((entry) => ownedIdentityKeys.has(identityKey(entry)))
      .sort(
        (left, right) =>
          left.pid - right.pid ||
          left.lstartToken.localeCompare(right.lstartToken),
      )
      .map(copyProcess),
  );
}

function waitMilliseconds(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function isEsrch(error) {
  return Boolean(
    error && typeof error === "object" && error.code === "ESRCH",
  );
}

function isZombieProcessState(state) {
  return typeof state === "string" && state.toUpperCase().startsWith("Z");
}

function isKnownSignalableProcessState(state) {
  return state !== "?" && !isZombieProcessState(state);
}

function safeSignalErrorCode(error) {
  const candidate =
    error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : error instanceof Error
        ? error.name
        : "UNKNOWN";
  return /^[A-Za-z0-9_-]{1,64}$/.test(candidate) ? candidate : "UNKNOWN";
}

function validateCleanupDuration(label, value) {
  const minimum = label === "poll interval" ? 1 : 0;
  if (!Number.isSafeInteger(value) || value < minimum || value > 60_000) {
    throw new Error(`Owned process cleanup ${label} is unsafe.`);
  }
}

function observationEvidence(phase, liveEntries) {
  return Object.freeze({
    phase,
    members: Object.freeze(liveEntries.map(copyProcess)),
  });
}

class OwnedProcessCleanupDeadlineExpired extends Error {
  constructor(phase) {
    super("Owned process aggregate monotonic cleanup deadline elapsed.");
    this.name = "OwnedProcessCleanupDeadlineExpired";
    this.phase = phase;
  }
}

function validateMonotonicNanoseconds(label, value) {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`Owned process cleanup ${label} must be non-negative bigint nanoseconds.`);
  }
  return value;
}

function millisecondsFromNanoseconds(nanoseconds) {
  return Number(nanoseconds) / 1_000_000;
}

export async function cleanupHkVisualizationOwnedProcessLedger({
  ledger,
  observerIdentity,
  sampleProcesses = ({ timeoutMs } = {}) =>
    sampleHkVisualizationOwnedProcessTable({
      observerIdentity,
      observerPid: observerIdentity?.pid,
      timeoutMs,
    }),
  signalProcess = (pid, signal) => process.kill(pid, signal),
  signalProcessGroup = (target, signal) => process.kill(target, signal),
  wait = waitMilliseconds,
  termGraceMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_TERM_GRACE_MS,
  killGraceMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_KILL_GRACE_MS,
  pollMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
  cleanupBudgetMs = HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS,
  cleanupStartedMonotonicNs = null,
  cleanupDeadlineMonotonicNs = null,
  monotonicNow = () => process.hrtime.bigint(),
}) {
  validateLedger(ledger);
  if (
    !exactObjectKeys(observerIdentity, ["pid", "lstartToken"]) ||
    !isSafeProcessNumber(observerIdentity.pid, 2) ||
    typeof observerIdentity.lstartToken !== "string" ||
    !LSTART_TOKEN_PATTERN.test(observerIdentity.lstartToken)
  ) {
    throw new Error("Owned process cleanup requires an exact observer identity.");
  }
  if (
    ledger.identities.some(
      (identity) => identityKey(identity) === identityKey(observerIdentity),
    )
  ) {
    throw new Error(
      "Owned process cleanup refuses a ledger that overlaps its exact observer identity.",
    );
  }
  if (typeof sampleProcesses !== "function") {
    throw new Error("Owned process cleanup requires a process sampler.");
  }
  if (typeof signalProcess !== "function" || typeof signalProcessGroup !== "function") {
    throw new Error("Owned process cleanup requires PID and group signal functions.");
  }
  if (typeof wait !== "function") {
    throw new Error("Owned process cleanup requires a wait function.");
  }
  validateCleanupDuration("TERM grace", termGraceMs);
  validateCleanupDuration("KILL grace", killGraceMs);
  validateCleanupDuration("poll interval", pollMs);
  if (
    !Number.isSafeInteger(cleanupBudgetMs) ||
    cleanupBudgetMs < 0 ||
    cleanupBudgetMs > HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS
  ) {
    throw new Error(
      `Owned process cleanup aggregate budget must be an integer from 0 through ${HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS} ms.`,
    );
  }
  if (typeof monotonicNow !== "function") {
    throw new Error("Owned process cleanup requires a monotonic clock function.");
  }

  let lastMonotonicNs = validateMonotonicNanoseconds(
    "monotonic clock value",
    monotonicNow(),
  );
  const readMonotonicNs = () => {
    const current = validateMonotonicNanoseconds(
      "monotonic clock value",
      monotonicNow(),
    );
    if (current < lastMonotonicNs) {
      throw new Error("Owned process cleanup monotonic clock moved backwards.");
    }
    lastMonotonicNs = current;
    return current;
  };
  const startedMonotonicNs =
    cleanupStartedMonotonicNs === null
      ? lastMonotonicNs
      : validateMonotonicNanoseconds(
          "planned start",
          cleanupStartedMonotonicNs,
        );
  if (startedMonotonicNs > lastMonotonicNs) {
    throw new Error("Owned process cleanup planned start is in the future.");
  }
  const deadlineMonotonicNs =
    cleanupDeadlineMonotonicNs === null
      ? startedMonotonicNs + BigInt(cleanupBudgetMs) * 1_000_000n
      : validateMonotonicNanoseconds(
          "planned deadline",
          cleanupDeadlineMonotonicNs,
        );
  const plannedBudgetNs = deadlineMonotonicNs - startedMonotonicNs;
  if (
    plannedBudgetNs < 0n ||
    plannedBudgetNs >
      BigInt(HK_VISUALIZATION_OWNED_PROCESS_LEDGER_CLEANUP_BUDGET_MS) *
        1_000_000n
  ) {
    throw new Error("Owned process cleanup planned monotonic deadline is unsafe.");
  }

  let workingLedger = ledger;
  const observations = [];
  const signalEvidence = [];
  const signalErrors = [];
  const sampleTimeouts = [];
  let latestLiveEntries = Object.freeze(
    ledger.identities.map((identity) =>
      copyProcess({
        pid: identity.pid,
        ppid: identity.lastPpid,
        pgid: identity.lastPgid,
        lstartToken: identity.lstartToken,
        state: identity.state,
        executableSha256: identity.executableSha256,
      }),
    ),
  );
  let expired = false;
  let expiryPhase = null;
  let finalConfirmationGapMs = 0;

  const expire = (phase) => {
    expired = true;
    expiryPhase ??= phase;
    throw new OwnedProcessCleanupDeadlineExpired(phase);
  };

  const remainingNanoseconds = (phase) => {
    const remaining = deadlineMonotonicNs - readMonotonicNs();
    if (remaining <= 0n) expire(phase);
    return remaining;
  };

  const remainingTimeoutMs = (phase, maximumMs) => {
    const remaining = remainingNanoseconds(phase);
    return Math.min(
      maximumMs,
      Math.max(1, Math.ceil(millisecondsFromNanoseconds(remaining))),
    );
  };

  const sampleAndUpdate = (phase) => {
    const timeoutMs = remainingTimeoutMs(
      `${phase}-sample`,
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
    );
    sampleTimeouts.push(timeoutMs);
    const sampled = sampleProcesses({ timeoutMs });
    remainingNanoseconds(`${phase}-sample-complete`);
    const processes = validateProcesses(sampled);
    verifyHkVisualizationProcessObserver({
      observerIdentity,
      observerPid: observerIdentity.pid,
      processes,
    });
    workingLedger = updateHkVisualizationOwnedProcessLedger({
      ledger: workingLedger,
      processes,
    });
    const liveEntries = computeHkVisualizationLiveOwnedProcessEntries({
      ledger: workingLedger,
      processes,
    });
    if (
      liveEntries.some(
        (entry) => identityKey(entry) === identityKey(observerIdentity),
      )
    ) {
      throw new Error(
        "Owned process cleanup sampled its exact observer identity as owned workload.",
      );
    }
    observations.push(observationEvidence(phase, liveEntries));
    latestLiveEntries = Object.freeze(liveEntries.map(copyProcess));
    return { processes, liveEntries };
  };

  const signalStage = (signal) => {
    remainingNanoseconds(`${signal.toLowerCase()}-stage`);
    const stageStart = sampleAndUpdate(`${signal.toLowerCase()}-candidates`);
    for (const candidate of stageStart.liveEntries) {
      remainingNanoseconds(`${signal.toLowerCase()}-pid-loop`);
      const current = sampleAndUpdate(`${signal.toLowerCase()}-before-pid`);
      const exact = current.liveEntries.find(
        (entry) => identityKey(entry) === identityKey(candidate),
      );
      if (!exact) continue;
      remainingNanoseconds(`${signal.toLowerCase()}-before-pid-signal`);
      try {
        signalProcess(exact.pid, signal);
        signalEvidence.push(
          Object.freeze({
            scope: "pid",
            target: exact.pid,
            signal,
            pid: exact.pid,
            pgid: exact.pgid,
            lstartToken: exact.lstartToken,
          }),
        );
      } catch (error) {
        if (!isEsrch(error)) {
          signalErrors.push(
            Object.freeze({
              scope: "pid",
              target: exact.pid,
              signal,
              code: safeSignalErrorCode(error),
              pid: exact.pid,
              pgid: exact.pgid,
              lstartToken: exact.lstartToken,
            }),
          );
        }
      }
    }

    const groupCandidates = [
      ...new Set(stageStart.liveEntries.map(({ pgid }) => pgid)),
    ].sort((left, right) => left - right);
    for (const pgid of groupCandidates) {
      remainingNanoseconds(`${signal.toLowerCase()}-group-loop`);
      const current = sampleAndUpdate(`${signal.toLowerCase()}-before-group`);
      const allGroupMembers = current.processes.filter(
        (entry) => entry.pgid === pgid,
      );
      const ownedGroupMembers = current.liveEntries.filter(
        (entry) => entry.pgid === pgid,
      );
      const ownedIdentityKeys = new Set(
        ownedGroupMembers.map((entry) => identityKey(entry)),
      );
      const groupIsExclusivelyOwned =
        ownedGroupMembers.length > 0 &&
        ownedGroupMembers.some(({ state }) =>
          isKnownSignalableProcessState(state),
        ) &&
        allGroupMembers.length === ownedGroupMembers.length &&
        allGroupMembers.every((entry) =>
          ownedIdentityKeys.has(identityKey(entry)),
      );
      if (!groupIsExclusivelyOwned) continue;
      remainingNanoseconds(`${signal.toLowerCase()}-before-group-signal`);
      try {
        signalProcessGroup(-pgid, signal);
        signalEvidence.push(
          Object.freeze({
            scope: "group",
            target: -pgid,
            signal,
            pid: null,
            pgid,
            lstartToken: null,
          }),
        );
      } catch (error) {
        if (!isEsrch(error)) {
          signalErrors.push(
            Object.freeze({
              scope: "group",
              target: -pgid,
              signal,
              code: safeSignalErrorCode(error),
              pid: null,
              pgid,
              lstartToken: null,
            }),
          );
        }
      }
    }
  };

  const waitForEmpty = async (phase, timeoutMs) => {
    remainingNanoseconds(`${phase}-start`);
    const stageDeadlineMonotonicNs =
      readMonotonicNs() + BigInt(timeoutMs) * 1_000_000n;
    while (true) {
      remainingNanoseconds(`${phase}-loop`);
      const current = sampleAndUpdate(phase);
      if (current.liveEntries.length === 0) return true;
      const now = readMonotonicNs();
      if (now >= stageDeadlineMonotonicNs) return false;
      const stageRemaining = stageDeadlineMonotonicNs - now;
      const aggregateRemaining = remainingNanoseconds(`${phase}-before-wait`);
      const waitMs = Math.max(
        1,
        Math.min(
          pollMs,
          Math.ceil(millisecondsFromNanoseconds(stageRemaining)),
          Math.ceil(millisecondsFromNanoseconds(aggregateRemaining)),
        ),
      );
      remainingNanoseconds(`${phase}-wait`);
      await wait(waitMs);
      remainingNanoseconds(`${phase}-wait-complete`);
    }
  };

  let termSentAtUtc = null;
  let killSentAtUtc = null;
  let confirmedEmpty = false;
  try {
    const before = sampleAndUpdate("before-cleanup");
    if (before.liveEntries.length > 0) {
      termSentAtUtc = new Date().toISOString();
      signalStage("SIGTERM");
      const termEmpty = await waitForEmpty("after-term", termGraceMs);
      if (!termEmpty) {
        killSentAtUtc = new Date().toISOString();
        signalStage("SIGKILL");
        await waitForEmpty("after-kill", killGraceMs);
      }
    }
    const finalConfirmation = sampleAndUpdate("final-confirmation");
    const confirmationStartNs = readMonotonicNs();
    const confirmationDeadlineNs =
      confirmationStartNs + BigInt(pollMs) * 1_000_000n;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const now = readMonotonicNs();
      const confirmationRemainingNs = confirmationDeadlineNs - now;
      if (confirmationRemainingNs <= 0n) break;
      const aggregateRemainingNs = remainingNanoseconds(
        "final-confirmation-before-wait",
      );
      const waitMs = Math.max(
        1,
        Math.min(
          Math.ceil(millisecondsFromNanoseconds(confirmationRemainingNs)),
          Math.ceil(millisecondsFromNanoseconds(aggregateRemainingNs)),
        ),
      );
      remainingNanoseconds("final-confirmation-wait");
      await wait(waitMs);
      remainingNanoseconds("final-confirmation-wait-complete");
    }
    const confirmationEndNs = readMonotonicNs();
    finalConfirmationGapMs = millisecondsFromNanoseconds(
      confirmationEndNs - confirmationStartNs,
    );
    const final = sampleAndUpdate("final");
    confirmedEmpty =
      signalErrors.length === 0 &&
      finalConfirmation.liveEntries.length === 0 &&
      final.liveEntries.length === 0 &&
      finalConfirmationGapMs >= pollMs;
  } catch (error) {
    if (!(error instanceof OwnedProcessCleanupDeadlineExpired)) throw error;
    expired = true;
    expiryPhase ??= error.phase;
  }

  const completedMonotonicNs = readMonotonicNs();
  if (completedMonotonicNs >= deadlineMonotonicNs) {
    expired = true;
    expiryPhase ??= "cleanup-complete";
  }
  if (expired) {
    confirmedEmpty = false;
    observations.push(observationEvidence("deadline-expired", latestLiveEntries));
  }
  const elapsedNs = completedMonotonicNs - startedMonotonicNs;
  const remainingNs =
    completedMonotonicNs < deadlineMonotonicNs
      ? deadlineMonotonicNs - completedMonotonicNs
      : 0n;
  const cleanupTiming = Object.freeze({
    clock: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
    plannedBudgetMs: millisecondsFromNanoseconds(plannedBudgetNs),
    startedMonotonicNs: startedMonotonicNs.toString(),
    deadlineMonotonicNs: deadlineMonotonicNs.toString(),
    completedMonotonicNs: completedMonotonicNs.toString(),
    elapsedMs: millisecondsFromNanoseconds(elapsedNs),
    remainingMs: millisecondsFromNanoseconds(remainingNs),
    expired,
    expiryPhase,
    sampleCount: sampleTimeouts.length,
    minimumSampleTimeoutMs:
      sampleTimeouts.length === 0 ? null : Math.min(...sampleTimeouts),
    maximumSampleTimeoutMs:
      sampleTimeouts.length === 0 ? null : Math.max(...sampleTimeouts),
  });

  return Object.freeze({
    ledger: workingLedger,
    termSentAtUtc,
    killSentAtUtc,
    observations: Object.freeze([...observations]),
    signalEvidence: Object.freeze([...signalEvidence]),
    signalErrors: Object.freeze([...signalErrors]),
    finalLiveEntries: Object.freeze(latestLiveEntries.map(copyProcess)),
    confirmedEmpty,
    finalConfirmationGapMs,
    cleanupTiming,
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  });
}
