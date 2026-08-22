#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";

export const HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA =
  "hk-viz-profile-process-sampler-v1";
export const HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS = Object.freeze([
  "-axww",
  "-o",
  "pid=,ppid=,pgid=,lstart=,state=,comm=",
]);
export const HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE =
  Object.freeze([
    "-ww",
    "-p",
    "<exact-positive-pid>",
    "-o",
    "pid=,ppid=,pgid=,lstart=,command=",
  ]);
export const HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV = Object.freeze({
  LANG: "C",
  LC_ALL: "C",
});
export const HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES =
  4 * 1024 * 1024;
export const HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS = 5_000;
export const HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST = Object.freeze([
  "Chromium",
  "Chromium Canary",
  "Chromium Headless Shell",
  "Google Chrome",
  "Google Chrome Beta",
  "Google Chrome Canary",
  "Google Chrome Dev",
  "Google Chrome for Testing",
  "chrome",
  "chrome-headless-shell",
  "chromium",
  "chromium-browser",
  "headless_shell",
]);

export const HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY = Object.freeze({
  schemaVersion: HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
  phaseOne: Object.freeze({
    command: "/bin/ps",
    args: HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS,
    env: HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV,
    timeoutMs: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
    maxBufferBytes: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
  }),
  phaseTwo: Object.freeze({
    command: "/bin/ps",
    argsTemplate: HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE,
    env: HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV,
    timeoutMs: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
    maxBufferBytes: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
  }),
  executableAllowlist: HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST,
  helperExclusion: "case-insensitive-executable-basename-contains-helper",
  retainedEvidence:
    "profile-paths,exact-process-identities,dispositions,and-sha256-fingerprints-only",
  rawCommandRetention: "forbidden",
});

const lstartPattern =
  "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2}\\s+\\d{4}";
const phaseOneRowPattern = new RegExp(
  `^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(${lstartPattern})(?:\\s+(.*\\S))?\\s*$`,
);
const phaseTwoRowPattern = new RegExp(
  `^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(${lstartPattern})\\s+(.+?)\\s*$`,
);
const processStatePattern = /^(?:[DIRSTUZWX][+<>AELNSsVWXl]*|\?)$/;

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function safeLineEvidence(phase, index, line) {
  return `${phase}-malformed-line:index=${index},length=${Buffer.byteLength(
    line,
    "utf8",
  )},sha256=${sha256(line)}`;
}

function safeSpawnErrorCode(error) {
  const code =
    error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : "UNKNOWN";
  return /^[A-Z0-9_-]{1,40}$/.test(code) ? code : "UNKNOWN";
}

function exactPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function exactNonnegativeInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function canonicalExecutableName(comm) {
  const executableName = basename(comm.trim());
  if (!executableName || /helper/i.test(executableName)) return null;
  return HK_VISUALIZATION_PROFILE_EXECUTABLE_ALLOWLIST.includes(executableName)
    ? executableName
    : null;
}

function processIdentity(row, executableName) {
  const executableHash = sha256(executableName);
  return Object.freeze({
    pid: row.pid,
    ppid: row.ppid,
    pgid: row.pgid,
    lstart: row.lstart,
    state: row.state,
    executableHash,
    identityHash: sha256(
      `${row.pid}\u0000${row.pgid}\u0000${row.lstart}\u0000${executableHash}`,
    ),
  });
}

function parsePhaseOneOutput(stdout) {
  const errors = [];
  const rows = [];
  const seenPids = new Set();
  const lines = String(stdout ?? "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const match = line.match(phaseOneRowPattern);
    if (!match) {
      errors.push(safeLineEvidence("phase1", index, line));
      continue;
    }
    const pid = exactPositiveInteger(match[1]);
    const ppid = exactNonnegativeInteger(match[2]);
    const pgid = exactPositiveInteger(match[3]);
    const trailingFields = match[5] ?? "";
    const trailingMatch = trailingFields.match(/^(\S+)(?:\s+(.*\S))?$/s);
    // macOS can materialise an exiting row with either trailing presentation
    // column absent. Consume only a strict, known state token; otherwise the
    // whole tail is `comm=` and state is explicitly unknown.
    const hasKnownState =
      trailingMatch !== null && processStatePattern.test(trailingMatch[1]);
    const state = hasKnownState ? trailingMatch[1] : "?";
    const comm = hasKnownState
      ? (trailingMatch[2] ?? "")
      : trailingFields;
    if (
      pid === null ||
      ppid === null ||
      pgid === null ||
      !processStatePattern.test(state)
    ) {
      errors.push(safeLineEvidence("phase1", index, line));
      continue;
    }
    if (seenPids.has(pid)) {
      errors.push(`phase1-duplicate-pid:pid=${pid}`);
      continue;
    }
    seenPids.add(pid);
    rows.push({
      pid,
      ppid,
      pgid,
      lstart: match[4],
      state,
      comm,
    });
  }
  return {
    errors,
    rows,
    tableSha256: sha256(String(stdout ?? "")),
  };
}

function parsePhaseTwoOutput(stdout) {
  const lines = String(stdout ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length !== 1) {
    return {
      error: `phase2-row-count:count=${lines.length},sha256=${sha256(
        String(stdout ?? ""),
      )}`,
      row: null,
    };
  }
  const line = lines[0];
  const match = line.match(phaseTwoRowPattern);
  if (!match) {
    return { error: safeLineEvidence("phase2", 0, line), row: null };
  }
  const pid = exactPositiveInteger(match[1]);
  const ppid = exactNonnegativeInteger(match[2]);
  const pgid = exactPositiveInteger(match[3]);
  if (pid === null || ppid === null || pgid === null) {
    return { error: safeLineEvidence("phase2", 0, line), row: null };
  }
  return {
    error: null,
    row: {
      pid,
      ppid,
      pgid,
      lstart: match[4],
      command: match[5],
      commandSha256: sha256(match[5]),
    },
  };
}

function tokenizeArguments(text) {
  const tokens = [];
  let token = "";
  let quote = null;
  let escaping = false;
  let tokenStarted = false;
  for (const character of text) {
    if (escaping) {
      token += character;
      tokenStarted = true;
      escaping = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaping = true;
      tokenStarted = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      tokenStarted = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      tokenStarted = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (tokenStarted) {
        tokens.push(token);
        token = "";
        tokenStarted = false;
      }
      continue;
    }
    token += character;
    tokenStarted = true;
  }
  if (escaping || quote) return null;
  if (tokenStarted) tokens.push(token);
  return tokens;
}

function commandArgumentsForCandidate(command, candidate) {
  const exactComm = candidate.comm.trim();
  if (
    command === exactComm ||
    (command.startsWith(exactComm) && /\s/.test(command[exactComm.length] ?? ""))
  ) {
    return tokenizeArguments(command.slice(exactComm.length).trim());
  }
  const tokens = tokenizeArguments(command);
  if (!tokens || tokens.length === 0 || tokens[0] !== exactComm) return null;
  return tokens.slice(1);
}

function extractProfilePath(argumentsList) {
  if (!Array.isArray(argumentsList)) return { error: "phase2-executable-drift" };
  const values = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--user-data-dir") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        return { error: "phase2-user-data-dir-missing-value" };
      }
      values.push(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--user-data-dir=")) {
      const value = argument.slice("--user-data-dir=".length);
      if (!value) return { error: "phase2-user-data-dir-missing-value" };
      values.push(value);
      continue;
    }
    if (argument.startsWith("--user-data-dir")) {
      return { error: "phase2-user-data-dir-malformed" };
    }
  }
  if (values.length === 0) {
    return {
      error: null,
      disposition: "non-profile-no-user-data-dir",
      profilePath: null,
    };
  }
  if (values.length !== 1) return { error: "phase2-user-data-dir-duplicate" };
  return { error: null, disposition: "profile", profilePath: values[0] };
}

function spawnPs(spawn, args) {
  return spawn("/bin/ps", args, {
    encoding: "utf8",
    env: { ...HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV },
    maxBuffer: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
    timeout: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
  });
}

function psFailure(result, phase) {
  if (result?.error) {
    return `${phase}-ps-error:code=${safeSpawnErrorCode(result.error)}`;
  }
  if (result?.signal) {
    const signal = /^[A-Z0-9]{1,24}$/.test(String(result.signal))
      ? String(result.signal)
      : "UNKNOWN";
    return `${phase}-ps-signal:signal=${signal}`;
  }
  if (result?.status !== 0) {
    const status = Number.isSafeInteger(result?.status)
      ? String(result.status)
      : "INVALID";
    return `${phase}-ps-nonzero:status=${status}`;
  }
  if (typeof result?.stdout !== "string") return `${phase}-ps-stdout-not-string`;
  return null;
}

function phaseOneSnapshot(spawn) {
  const result = spawnPs(spawn, HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS);
  const failure = psFailure(result, "phase1");
  if (failure) {
    return { candidates: [], errors: [failure], rowCount: 0, tableSha256: sha256("") };
  }
  const parsed = parsePhaseOneOutput(result.stdout);
  const candidates = [];
  for (const row of parsed.rows) {
    const executableName = canonicalExecutableName(row.comm);
    if (!executableName) continue;
    candidates.push({
      ...row,
      executableName,
      identity: processIdentity(row, executableName),
    });
  }
  return {
    candidates,
    errors: parsed.errors,
    rowCount: parsed.rows.length,
    tableSha256: parsed.tableSha256,
  };
}

function originalIdentityStillPresent(spawn, candidate) {
  const refreshed = phaseOneSnapshot(spawn);
  if (refreshed.errors.length > 0) {
    return { safelyGone: false, errors: refreshed.errors.map((error) => `refresh-${error}`) };
  }
  const exactIdentity = refreshed.candidates.find(
    (current) =>
      current.pid === candidate.pid &&
      current.pgid === candidate.pgid &&
      current.lstart === candidate.lstart &&
      current.identity.executableHash === candidate.identity.executableHash,
  );
  return { safelyGone: !exactIdentity, errors: [] };
}

/**
 * Privacy-bounded process sampler. It never performs a global `command=` scan:
 * complete argv is read only for phase-one Chrome/Chromium candidates.
 */
export function sampleHkVisualizationProfileProcesses({ spawn = spawnSync } = {}) {
  const errors = [];
  const first = phaseOneSnapshot(spawn);
  errors.push(...first.errors);
  const observations = [];
  const nonProfileObservations = [];
  const disappearedIdentityHashes = [];

  if (errors.length === 0) {
    for (const candidate of first.candidates) {
      const args = [
        "-ww",
        "-p",
        String(candidate.pid),
        "-o",
        "pid=,ppid=,pgid=,lstart=,command=",
      ];
      const result = spawnPs(spawn, args);
      const failure = psFailure(result, "phase2");
      if (failure) {
        const isPotentialDisappearance =
          result?.status === 1 &&
          !result?.error &&
          !result?.signal &&
          String(result?.stdout ?? "").trim() === "" &&
          String(result?.stderr ?? "").trim() === "";
        if (isPotentialDisappearance) {
          const refresh = originalIdentityStillPresent(spawn, candidate);
          errors.push(...refresh.errors);
          if (refresh.safelyGone && refresh.errors.length === 0) {
            disappearedIdentityHashes.push(candidate.identity.identityHash);
            continue;
          }
        }
        errors.push(`${failure}:pid=${candidate.pid}`);
        continue;
      }

      const parsed = parsePhaseTwoOutput(result.stdout);
      if (parsed.error) {
        errors.push(`${parsed.error}:pid=${candidate.pid}`);
        continue;
      }
      const row = parsed.row;
      const exactIdentity =
        row.pid === candidate.pid &&
        row.pgid === candidate.pgid &&
        row.lstart === candidate.lstart;
      if (!exactIdentity) {
        errors.push(`phase2-identity-drift:pid=${candidate.pid}`);
        continue;
      }
      const argumentsList = commandArgumentsForCandidate(row.command, candidate);
      const executableHash =
        argumentsList === null ? null : sha256(candidate.executableName);
      if (executableHash !== candidate.identity.executableHash) {
        errors.push(`phase2-executable-drift:pid=${candidate.pid}`);
        continue;
      }
      const extracted = extractProfilePath(argumentsList);
      if (extracted.error) {
        errors.push(`${extracted.error}:pid=${candidate.pid}`);
        continue;
      }
      if (extracted.disposition === "non-profile-no-user-data-dir") {
        nonProfileObservations.push(
          Object.freeze({
            identity: Object.freeze({
              ...candidate.identity,
              observedPpid: row.ppid,
            }),
            commandSha256: row.commandSha256,
            disposition: extracted.disposition,
          }),
        );
        continue;
      }
      observations.push(
        Object.freeze({
          identity: Object.freeze({
            ...candidate.identity,
            observedPpid: row.ppid,
          }),
          commandSha256: row.commandSha256,
          profilePath: extracted.profilePath,
        }),
      );
    }
  }

  const candidateIdentities = first.candidates.map((candidate) => candidate.identity);
  const profilePaths = [...new Set(observations.map((entry) => entry.profilePath))].sort();
  return Object.freeze({
    schemaVersion: HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
    policy: HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
    phaseOneTableSha256: first.tableSha256,
    phaseOneRowCount: first.rowCount,
    candidateIdentities: Object.freeze(candidateIdentities),
    targetedCandidateCount: first.candidates.length,
    disappearedIdentityHashes: Object.freeze([...disappearedIdentityHashes].sort()),
    observations: Object.freeze(observations),
    nonProfileObservations: Object.freeze(nonProfileObservations),
    profilePaths: Object.freeze(profilePaths),
    errors: Object.freeze(errors),
    status: errors.length === 0 ? "complete" : "failed",
  });
}
