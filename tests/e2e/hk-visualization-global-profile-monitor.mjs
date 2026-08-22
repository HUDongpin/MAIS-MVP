#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  assertHkVisualizationStarshipPath,
  validateHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";
import {
  HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
  HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
  sampleHkVisualizationProfileProcesses,
} from "./hk-visualization-profile-process-sampler.mjs";

export const HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA =
  "hk-viz-global-profile-monitor-v1";
export const HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS =
  1_000;
export const HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS = 2_500;
export const HK_VISUALIZATION_GLOBAL_PROFILE_PROCESS_TABLE_ARGS =
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS;
export const HK_VISUALIZATION_GLOBAL_PROFILE_PROCESS_TABLE_MAX_BUFFER =
  HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES;
export const HK_VISUALIZATION_GLOBAL_PROFILE_PROCESS_TABLE_TIMEOUT_MS =
  HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS;

function sha256Text(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function safeArgumentFingerprint(value) {
  const text = String(value ?? "");
  return `length=${Buffer.byteLength(text, "utf8")},sha256=${sha256Text(text)}`;
}

export function hashHkVisualizationGlobalProfileMonitorSources() {
  const hashFile = (path) =>
    createHash("sha256").update(readFileSync(path)).digest("hex");
  return Object.freeze({
    monitorSha256: hashFile(fileURLToPath(import.meta.url)),
    samplerSha256: hashFile(
      fileURLToPath(
        new URL("./hk-visualization-profile-process-sampler.mjs", import.meta.url),
      ),
    ),
  });
}

const requiredCliPaths = Object.freeze([
  ["--manifest", "manifestPath"],
  ["--receipt", "receiptPath"],
  ["--ready", "readyPath"],
  ["--stop", "stopPath"],
  ["--pid", "pidPath"],
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pathIsStrictlyInside(candidate, root) {
  const child = relative(root, candidate);
  return child !== "" && !child.startsWith("..") && !isAbsolute(child);
}

function roundMilliseconds(value) {
  return Math.round(value * 1_000) / 1_000;
}

function sortedUniqueStrings(values) {
  return [...new Set(values)].sort();
}

function exactObjectKeys(value, expectedKeys) {
  return (
    isPlainObject(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...expectedKeys].sort())
  );
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function atomicWriteFile(destination, contents) {
  mkdirSync(dirname(destination), { recursive: true });
  const temporaryPath = resolve(
    dirname(destination),
    `.${basename(destination)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}.tmp`,
  );
  assertHkVisualizationStarshipPath("atomic monitor temporary file", temporaryPath);
  writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
  renameSync(temporaryPath, destination);
}

function validatedManifest(manifest) {
  const issues = validateHkVisualizationStarshipPathManifest(manifest);
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization global profile monitor received an invalid path manifest: ${issues.join("; ")}.`,
    );
  }
  return manifest;
}

/**
 * Resolve and bind every monitor path to one exact Starship run manifest.
 */
export function resolveHkVisualizationGlobalProfileMonitorPaths({
  manifest,
  manifestPath,
  receiptPath,
  readyPath,
  stopPath,
  pidPath,
}) {
  validatedManifest(manifest);
  const resolvedManifestPath = assertHkVisualizationStarshipPath(
    "global profile monitor manifest",
    manifestPath,
  );
  const resolvedReceiptPath = assertHkVisualizationStarshipPath(
    "global profile monitor receipt",
    receiptPath,
  );
  const resolvedReadyPath = assertHkVisualizationStarshipPath(
    "global profile monitor ready signal",
    readyPath,
  );
  const resolvedStopPath = assertHkVisualizationStarshipPath(
    "global profile monitor stop signal",
    stopPath,
  );
  const resolvedPidPath = assertHkVisualizationStarshipPath(
    "global profile monitor pid",
    pidPath,
  );

  if (resolvedManifestPath !== manifest.pathManifestFile) {
    throw new Error(
      `Global profile monitor manifest path must equal ${manifest.pathManifestFile}; received ${resolvedManifestPath}.`,
    );
  }
  if (
    manifest.globalProfileMonitorDir !==
    resolve(manifest.artifactRoot, "global-profile-monitor")
  ) {
    throw new Error(
      `Global profile monitor directory must equal ${resolve(manifest.artifactRoot, "global-profile-monitor")}; received ${String(manifest.globalProfileMonitorDir)}.`,
    );
  }
  for (const [label, candidate, expected] of [
    ["receipt", resolvedReceiptPath, manifest.globalProfileMonitorReceiptPath],
    ["ready", resolvedReadyPath, manifest.globalProfileMonitorReadyPath],
    ["stop", resolvedStopPath, manifest.globalProfileMonitorStopPath],
    ["pid", resolvedPidPath, manifest.globalProfileMonitorPidPath],
  ]) {
    if (candidate !== expected) {
      throw new Error(
        `Global profile monitor ${label} path must equal ${String(expected)}; received ${candidate}.`,
      );
    }
    if (!pathIsStrictlyInside(candidate, manifest.globalProfileMonitorDir)) {
      throw new Error(
        `Global profile monitor ${label} path must stay inside ${manifest.globalProfileMonitorDir}; received ${candidate}.`,
      );
    }
  }

  const paths = {
    manifestPath: resolvedManifestPath,
    receiptPath: resolvedReceiptPath,
    readyPath: resolvedReadyPath,
    stopPath: resolvedStopPath,
    pidPath: resolvedPidPath,
  };
  if (new Set(Object.values(paths)).size !== Object.keys(paths).length) {
    throw new Error("Global profile monitor manifest, receipt, ready, stop, and pid paths must be distinct.");
  }
  return Object.freeze(paths);
}

/**
 * Parse the child-process CLI without accepting defaults or passthrough args.
 */
export function parseHkVisualizationGlobalProfileMonitorArgs(argv) {
  if (!Array.isArray(argv)) throw new Error("Global profile monitor argv must be an array.");
  const values = {};
  let intervalMs = HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS;
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (typeof name !== "string" || typeof value !== "string" || !value.trim()) {
      throw new Error(
        `Global profile monitor arguments must be non-empty --name value pairs; invalidPairIndex=${index / 2}; name(${safeArgumentFingerprint(name)}); value(${safeArgumentFingerprint(value)}).`,
      );
    }
    if (name === "--interval-ms") {
      if (Object.prototype.hasOwnProperty.call(values, "intervalMs")) {
        throw new Error("Global profile monitor received duplicate --interval-ms.");
      }
      intervalMs = Number(value);
      values.intervalMs = value;
      continue;
    }
    const pathEntry = requiredCliPaths.find(([flag]) => flag === name);
    if (!pathEntry)
      throw new Error(
        `Global profile monitor rejected an unknown argument at pair ${index / 2} (${safeArgumentFingerprint(name)}).`,
      );
    const key = pathEntry[1];
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`Global profile monitor received duplicate ${name}.`);
    }
    values[key] = value;
  }
  for (const [flag, key] of requiredCliPaths) {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`Global profile monitor requires ${flag}.`);
    }
  }
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1 ||
    intervalMs > HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS
  ) {
    throw new Error(
      `Global profile monitor --interval-ms must be an integer from 1 through ${HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS}; received ${String(intervalMs)}.`,
    );
  }
  return Object.freeze({
    intervalMs,
    manifestPath: values.manifestPath,
    receiptPath: values.receiptPath,
    readyPath: values.readyPath,
    stopPath: values.stopPath,
    pidPath: values.pidPath,
  });
}

function copyProfileProcessEvidence(processSample) {
  return {
    schemaVersion: processSample.schemaVersion,
    phaseOneTableSha256: processSample.phaseOneTableSha256,
    phaseOneRowCount: processSample.phaseOneRowCount,
    candidateIdentities: processSample.candidateIdentities.map((identity) => ({
      ...identity,
    })),
    targetedCandidateCount: processSample.targetedCandidateCount,
    disappearedIdentityHashes: [...processSample.disappearedIdentityHashes],
    observations: processSample.observations.map((observation) => ({
      identity: { ...observation.identity },
      commandSha256: observation.commandSha256,
      profilePath: observation.profilePath,
    })),
    nonProfileObservations: processSample.nonProfileObservations.map(
      (observation) => ({
        identity: { ...observation.identity },
        commandSha256: observation.commandSha256,
        disposition: observation.disposition,
      }),
    ),
  };
}

/**
 * Take one privacy-bounded two-phase sample. The global phase reads only
 * identity plus `comm=`. Complete argv is read only for exact Chrome/Chromium
 * candidates and is reduced immediately to a hash and one profile path.
 */
export function sampleHkVisualizationGlobalProfiles({
  manifest,
  ordinal,
  phase,
  monitorStartedAt,
  monotonicNow = () => performance.now(),
  spawn = spawnSync,
}) {
  validatedManifest(manifest);
  const processSample = sampleHkVisualizationProfileProcesses({ spawn });
  const errors = [...processSample.errors];
  const rawProfilePaths = [...processSample.profilePaths];

  const validatedProfilePaths = [];
  for (const [index, profilePath] of rawProfilePaths.entries()) {
    try {
      if (!basename(profilePath).startsWith("playwright_chromiumdev_profile-")) {
        errors.push(`global-profile-wrong-prefix:index=${index}`);
        continue;
      }
      validatedProfilePaths.push(
        assertHkVisualizationStarshipPath(
          `global Playwright profile[${index}]`,
          profilePath,
        ),
      );
    } catch (error) {
      errors.push(safeError(error));
    }
  }

  const elapsed = Number(monotonicNow()) - Number(monitorStartedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    errors.push(`monotonic elapsed time is invalid: ${String(elapsed)}.`);
  }
  return Object.freeze({
    ordinal,
    phase,
    monotonicElapsedMs: roundMilliseconds(
      Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0,
    ),
    rawProfilePaths: Object.freeze([...rawProfilePaths]),
    validatedProfilePaths: Object.freeze(
      sortedUniqueStrings(validatedProfilePaths),
    ),
    processEvidence: Object.freeze(copyProfileProcessEvidence(processSample)),
    errors: Object.freeze([...errors]),
  });
}

export function buildHkVisualizationGlobalProfileReceipt({
  manifest,
  paths,
  intervalMs,
  monitorPid,
  startedAtUtc,
  completedAtUtc,
  stopReason,
  samples,
  sourceHashes = hashHkVisualizationGlobalProfileMonitorSources(),
}) {
  validatedManifest(manifest);
  const normalizedPaths = resolveHkVisualizationGlobalProfileMonitorPaths({
    manifest,
    ...paths,
  });
  const copiedSamples = samples.map((sample) => ({
    ordinal: sample.ordinal,
    phase: sample.phase,
    monotonicElapsedMs: sample.monotonicElapsedMs,
    rawProfilePaths: [...sample.rawProfilePaths],
    validatedProfilePaths: [...sample.validatedProfilePaths],
    processEvidence: structuredClone(sample.processEvidence),
    errors: [...sample.errors],
  }));
  const profilePathUnion = sortedUniqueStrings(
    copiedSamples.flatMap((sample) => sample.validatedProfilePaths),
  );
  const gaps = copiedSamples.slice(1).map((sample, index) =>
    roundMilliseconds(
      sample.monotonicElapsedMs - copiedSamples[index].monotonicElapsedMs,
    ),
  );
  const errors = copiedSamples.flatMap((sample) =>
    sample.errors.map((error) => `sample[${sample.ordinal}]: ${error}`),
  );
  const finalSample = copiedSamples.at(-1);
  return {
    schemaVersion: HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA,
    runId: manifest.runId,
    manifestHash: manifest.manifestHash,
    sourceHashes: { ...sourceHashes },
    paths: normalizedPaths,
    intervalMs,
    profileProcessSamplerPolicy: structuredClone(
      HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
    ),
    monitorPid,
    startedAtUtc,
    completedAtUtc,
    stopReason,
    firstSampleOrdinal: copiedSamples[0]?.ordinal ?? null,
    lastSampleOrdinal: finalSample?.ordinal ?? null,
    sampleCount: copiedSamples.length,
    durationMs: finalSample?.monotonicElapsedMs ?? null,
    samples: copiedSamples,
    profilePathUnion,
    maxGapMs: gaps.length > 0 ? Math.max(...gaps) : null,
    errors,
    status: errors.length === 0 ? "complete" : "failed",
  };
}

/**
 * Validate a completed receipt against its exact manifest and explicit paths.
 * Returns a small normalized summary or throws one aggregate fail-closed error.
 */
export function validateHkVisualizationGlobalProfileReceipt(
  receipt,
  { manifest, paths },
) {
  validatedManifest(manifest);
  const expectedPaths = resolveHkVisualizationGlobalProfileMonitorPaths({
    manifest,
    ...paths,
  });
  const issues = [];
  const receiptKeys = [
    "schemaVersion",
    "runId",
    "manifestHash",
    "sourceHashes",
    "paths",
    "intervalMs",
    "profileProcessSamplerPolicy",
    "monitorPid",
    "startedAtUtc",
    "completedAtUtc",
    "stopReason",
    "firstSampleOrdinal",
    "lastSampleOrdinal",
    "sampleCount",
    "durationMs",
    "samples",
    "profilePathUnion",
    "maxGapMs",
    "errors",
    "status",
  ];
  if (!exactObjectKeys(receipt, receiptKeys)) {
    throw new Error(
      "HK Visualization global profile receipt must be an object with the exact v1 key set.",
    );
  }
  if (receipt.schemaVersion !== HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA)
    issues.push(`schemaVersion=${String(receipt.schemaVersion)}`);
  if (receipt.runId !== manifest.runId)
    issues.push(`runId=${String(receipt.runId)}`);
  if (receipt.manifestHash !== manifest.manifestHash)
    issues.push(`manifestHash=${String(receipt.manifestHash)}`);
  if (
    !isDeepStrictEqual(
      receipt.sourceHashes,
      hashHkVisualizationGlobalProfileMonitorSources(),
    )
  ) {
    issues.push("sourceHashes-drift");
  }
  if (!isDeepStrictEqual(receipt.paths, expectedPaths))
    issues.push("paths-do-not-match-exact-run");
  if (
    !Number.isSafeInteger(receipt.intervalMs) ||
    receipt.intervalMs < 1 ||
    receipt.intervalMs > HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS
  ) {
    issues.push(`intervalMs=${String(receipt.intervalMs)}`);
  }
  if (
    !isDeepStrictEqual(
      receipt.profileProcessSamplerPolicy,
      HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
    )
  ) {
    issues.push("profileProcessSamplerPolicy-drift");
  }
  if (!Number.isSafeInteger(receipt.monitorPid) || receipt.monitorPid <= 0)
    issues.push(`monitorPid=${String(receipt.monitorPid)}`);
  const startedAt = Date.parse(receipt.startedAtUtc);
  const completedAt = Date.parse(receipt.completedAtUtc);
  if (!Number.isFinite(startedAt)) issues.push("startedAtUtc-invalid");
  if (!Number.isFinite(completedAt)) issues.push("completedAtUtc-invalid");
  if (Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt < startedAt)
    issues.push("completedAtUtc-before-startedAtUtc");
  if (!["stop-file", "sigterm"].includes(receipt.stopReason))
    issues.push(`stopReason=${String(receipt.stopReason)}`);
  if (receipt.status !== "complete") issues.push(`status=${String(receipt.status)}`);
  if (!Array.isArray(receipt.errors) || receipt.errors.length !== 0)
    issues.push(
      `errors-nonempty-or-invalid:count=${Array.isArray(receipt.errors) ? receipt.errors.length : "invalid"}`,
    );

  if (!Array.isArray(receipt.samples) || receipt.samples.length < 2) {
    issues.push("samples-must-contain-distinct-first-and-final-observations");
  }
  const samples = Array.isArray(receipt.samples) ? receipt.samples : [];
  const sampleKeys = [
    "ordinal",
    "phase",
    "monotonicElapsedMs",
    "rawProfilePaths",
    "validatedProfilePaths",
    "processEvidence",
    "errors",
  ];
  const derivedUnion = [];
  let computedMaxGap = null;
  for (const [index, sample] of samples.entries()) {
    if (!exactObjectKeys(sample, sampleKeys)) {
      issues.push(`sample[${index}]-key-set-drift`);
      continue;
    }
    if (sample.ordinal !== index)
      issues.push(`sample[${index}].ordinal=${String(sample.ordinal)}`);
    const expectedPhase =
      index === 0 ? "first" : index === samples.length - 1 ? "final" : "periodic";
    if (sample.phase !== expectedPhase)
      issues.push(`sample[${index}].phase=${String(sample.phase)}`);
    if (
      typeof sample.monotonicElapsedMs !== "number" ||
      !Number.isFinite(sample.monotonicElapsedMs) ||
      sample.monotonicElapsedMs < 0
    ) {
      issues.push(`sample[${index}].monotonicElapsedMs-invalid`);
    }
    if (!Array.isArray(sample.errors) || sample.errors.length !== 0)
      issues.push(
        `sample[${index}].errors-nonempty-or-invalid:count=${Array.isArray(sample.errors) ? sample.errors.length : "invalid"}`,
      );
    const processEvidence = sample.processEvidence;
    const processEvidenceKeys = [
      "schemaVersion",
      "phaseOneTableSha256",
      "phaseOneRowCount",
      "candidateIdentities",
      "targetedCandidateCount",
      "disappearedIdentityHashes",
      "observations",
      "nonProfileObservations",
    ];
    if (!exactObjectKeys(processEvidence, processEvidenceKeys)) {
      issues.push(`sample[${index}].processEvidence-key-set-drift`);
    } else {
      if (
        processEvidence.schemaVersion !==
        HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA
      ) {
        issues.push(`sample[${index}].processEvidence-schema-drift`);
      }
      if (!/^[a-f0-9]{64}$/.test(processEvidence.phaseOneTableSha256)) {
        issues.push(`sample[${index}].phaseOneTableSha256-invalid`);
      }
      if (
        !Number.isSafeInteger(processEvidence.phaseOneRowCount) ||
        processEvidence.phaseOneRowCount < 0
      ) {
        issues.push(`sample[${index}].phaseOneRowCount-invalid`);
      }
      if (!Array.isArray(processEvidence.candidateIdentities)) {
        issues.push(`sample[${index}].candidateIdentities-invalid`);
      }
      const candidateIdentities = Array.isArray(
        processEvidence.candidateIdentities,
      )
        ? processEvidence.candidateIdentities
        : [];
      const candidateIdentityKeys = [
        "pid",
        "ppid",
        "pgid",
        "lstart",
        "state",
        "executableHash",
        "identityHash",
      ];
      const candidateHashes = new Set();
      const candidateByHash = new Map();
      for (const [candidateIndex, identity] of candidateIdentities.entries()) {
        if (!exactObjectKeys(identity, candidateIdentityKeys)) {
          issues.push(
            `sample[${index}].candidateIdentities[${candidateIndex}]-key-set-drift`,
          );
          continue;
        }
        if (
          !Number.isSafeInteger(identity.pid) ||
          identity.pid <= 0 ||
          !Number.isSafeInteger(identity.ppid) ||
          identity.ppid < 0 ||
          !Number.isSafeInteger(identity.pgid) ||
          identity.pgid <= 0 ||
          typeof identity.lstart !== "string" ||
          !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(
            identity.lstart,
          ) ||
          typeof identity.state !== "string" ||
          !/^(?:[DIRSTUZWX][+<>AELNSsVWXl]*|\?)$/.test(identity.state) ||
          !/^[a-f0-9]{64}$/.test(identity.executableHash) ||
          !/^[a-f0-9]{64}$/.test(identity.identityHash) ||
          identity.identityHash !==
            sha256Text(
              `${identity.pid}\u0000${identity.pgid}\u0000${identity.lstart}\u0000${identity.executableHash}`,
            )
        ) {
          issues.push(
            `sample[${index}].candidateIdentities[${candidateIndex}]-invalid`,
          );
        }
        if (candidateHashes.has(identity.identityHash)) {
          issues.push(
            `sample[${index}].candidateIdentities[${candidateIndex}]-duplicate`,
          );
        }
        candidateHashes.add(identity.identityHash);
        candidateByHash.set(identity.identityHash, identity);
      }
      if (processEvidence.phaseOneRowCount < candidateIdentities.length) {
        issues.push(`sample[${index}].phaseOneRowCount-too-small`);
      }
      if (
        processEvidence.targetedCandidateCount !== candidateIdentities.length
      ) {
        issues.push(`sample[${index}].targetedCandidateCount-drift`);
      }
      if (
        !Array.isArray(processEvidence.disappearedIdentityHashes) ||
        !isDeepStrictEqual(
          processEvidence.disappearedIdentityHashes,
          sortedUniqueStrings(processEvidence.disappearedIdentityHashes ?? []),
        ) ||
        processEvidence.disappearedIdentityHashes.some(
          (hash) =>
            !/^[a-f0-9]{64}$/.test(hash) || !candidateHashes.has(hash),
        )
      ) {
        issues.push(`sample[${index}].disappearedIdentityHashes-invalid`);
      }
      if (!Array.isArray(processEvidence.observations)) {
        issues.push(`sample[${index}].observations-invalid`);
      }
      const observedPaths = [];
      const resolvedIdentityHashes = new Set(
        Array.isArray(processEvidence.disappearedIdentityHashes)
          ? processEvidence.disappearedIdentityHashes
          : [],
      );
      const observationKeys = ["identity", "commandSha256", "profilePath"];
      const observationIdentityKeys = [
        ...candidateIdentityKeys,
        "observedPpid",
      ];
      for (const [observationIndex, observation] of (
        Array.isArray(processEvidence.observations)
          ? processEvidence.observations
          : []
      ).entries()) {
        if (!exactObjectKeys(observation, observationKeys)) {
          issues.push(
            `sample[${index}].observations[${observationIndex}]-key-set-drift`,
          );
          continue;
        }
        if (
          !exactObjectKeys(observation.identity, observationIdentityKeys) ||
          !candidateHashes.has(observation.identity?.identityHash) ||
          !Number.isSafeInteger(observation.identity?.observedPpid) ||
          observation.identity.observedPpid < 0 ||
          !/^[a-f0-9]{64}$/.test(observation.commandSha256) ||
          typeof observation.profilePath !== "string"
        ) {
          issues.push(
            `sample[${index}].observations[${observationIndex}]-invalid`,
          );
          continue;
        }
        const {
          observedPpid: _observedPpid,
          ...observedPhaseOneIdentity
        } = observation.identity;
        if (
          !isDeepStrictEqual(
            observedPhaseOneIdentity,
            candidateByHash.get(observation.identity.identityHash),
          ) ||
          resolvedIdentityHashes.has(observation.identity.identityHash)
        ) {
          issues.push(
            `sample[${index}].observations[${observationIndex}]-identity-drift-or-duplicate`,
          );
        }
        resolvedIdentityHashes.add(observation.identity.identityHash);
        observedPaths.push(observation.profilePath);
      }
      const nonProfileObservationKeys = [
        "identity",
        "commandSha256",
        "disposition",
      ];
      if (!Array.isArray(processEvidence.nonProfileObservations)) {
        issues.push(`sample[${index}].nonProfileObservations-invalid`);
      }
      for (const [observationIndex, observation] of (
        Array.isArray(processEvidence.nonProfileObservations)
          ? processEvidence.nonProfileObservations
          : []
      ).entries()) {
        if (
          !exactObjectKeys(observation, nonProfileObservationKeys) ||
          !exactObjectKeys(observation.identity, observationIdentityKeys) ||
          !candidateHashes.has(observation.identity?.identityHash) ||
          !Number.isSafeInteger(observation.identity?.observedPpid) ||
          observation.identity.observedPpid < 0 ||
          !/^[a-f0-9]{64}$/.test(observation.commandSha256) ||
          observation.disposition !== "non-profile-no-user-data-dir"
        ) {
          issues.push(
            `sample[${index}].nonProfileObservations[${observationIndex}]-invalid`,
          );
          continue;
        }
        const {
          observedPpid: _observedPpid,
          ...observedPhaseOneIdentity
        } = observation.identity;
        if (
          !isDeepStrictEqual(
            observedPhaseOneIdentity,
            candidateByHash.get(observation.identity.identityHash),
          ) ||
          resolvedIdentityHashes.has(observation.identity.identityHash)
        ) {
          issues.push(
            `sample[${index}].nonProfileObservations[${observationIndex}]-identity-drift-or-duplicate`,
          );
        }
        resolvedIdentityHashes.add(observation.identity.identityHash);
      }
      if (resolvedIdentityHashes.size !== candidateIdentities.length) {
        issues.push(`sample[${index}].candidate-resolution-incomplete`);
      }
      if (
        Array.isArray(sample.rawProfilePaths) &&
        !isDeepStrictEqual(
          sample.rawProfilePaths,
          sortedUniqueStrings(observedPaths),
        )
      ) {
        issues.push(`sample[${index}].processEvidence-profile-path-drift`);
      }
    }
    if (
      !Array.isArray(sample.rawProfilePaths) ||
      sample.rawProfilePaths.some((value) => typeof value !== "string") ||
      !isDeepStrictEqual(
        sample.rawProfilePaths,
        sortedUniqueStrings(sample.rawProfilePaths ?? []),
      )
    ) {
      issues.push(`sample[${index}].rawProfilePaths-invalid`);
      continue;
    }
    const expectedValidated = [];
    for (const [pathIndex, rawProfilePath] of sample.rawProfilePaths.entries()) {
      if (!basename(rawProfilePath).startsWith("playwright_chromiumdev_profile-")) {
        issues.push(`sample[${index}].rawProfilePaths[${pathIndex}]-wrong-prefix`);
        continue;
      }
      try {
        expectedValidated.push(
          assertHkVisualizationStarshipPath(
            `receipt sample[${index}] profile[${pathIndex}]`,
            rawProfilePath,
          ),
        );
      } catch (error) {
        issues.push(`sample[${index}].profile=${safeError(error)}`);
      }
    }
    const canonicalValidated = sortedUniqueStrings(expectedValidated);
    if (!isDeepStrictEqual(sample.validatedProfilePaths, canonicalValidated))
      issues.push(`sample[${index}].validatedProfilePaths-drift`);
    derivedUnion.push(...canonicalValidated);
    if (index > 0) {
      const gap = roundMilliseconds(
        sample.monotonicElapsedMs - samples[index - 1].monotonicElapsedMs,
      );
      if (!Number.isFinite(gap) || gap < 0)
        issues.push(`sample[${index}].monotonic-order-invalid`);
      computedMaxGap = computedMaxGap === null ? gap : Math.max(computedMaxGap, gap);
    }
  }
  const canonicalUnion = sortedUniqueStrings(derivedUnion);
  if (canonicalUnion.length === 0)
    issues.push("profilePathUnion-must-observe-at-least-one-profile");
  if (!isDeepStrictEqual(receipt.profilePathUnion, canonicalUnion))
    issues.push("profilePathUnion-drift");
  if (receipt.maxGapMs !== computedMaxGap)
    issues.push(`maxGapMs=${String(receipt.maxGapMs)},computed=${String(computedMaxGap)}`);
  if (
    typeof computedMaxGap !== "number" ||
    !Number.isFinite(computedMaxGap) ||
    computedMaxGap > HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS
  ) {
    issues.push(`maxGapMs-exceeds-${HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS}`);
  }
  if (receipt.firstSampleOrdinal !== 0)
    issues.push(`firstSampleOrdinal=${String(receipt.firstSampleOrdinal)}`);
  if (receipt.lastSampleOrdinal !== samples.length - 1)
    issues.push(`lastSampleOrdinal=${String(receipt.lastSampleOrdinal)}`);
  if (receipt.sampleCount !== samples.length)
    issues.push(`sampleCount=${String(receipt.sampleCount)}`);
  if (receipt.durationMs !== samples.at(-1)?.monotonicElapsedMs)
    issues.push(`durationMs=${String(receipt.durationMs)}`);

  if (issues.length > 0) {
    throw new Error(
      `HK Visualization global profile monitor receipt is not fail-closed evidence: ${issues.join("; ")}.`,
    );
  }
  return Object.freeze({
    maxGapMs: computedMaxGap,
    profilePathUnion: Object.freeze([...canonicalUnion]),
    sampleCount: samples.length,
    stopReason: receipt.stopReason,
  });
}

function waitMilliseconds(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function currentProcessStillHasExpectedParent(expectedParentPid) {
  if (expectedParentPid <= 1 || process.ppid !== expectedParentPid) return false;
  try {
    process.kill(expectedParentPid, 0);
    return true;
  } catch (error) {
    return error && typeof error === "object" && error.code === "EPERM";
  }
}

/**
 * Run the monitor lifecycle. The injected seams are used only by Node tests;
 * direct child invocation always uses real ps, real monotonic time, and files.
 */
export async function runHkVisualizationGlobalProfileMonitor({
  manifest,
  paths,
  intervalMs = HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS,
  monitorPid = process.pid,
  spawn = spawnSync,
  monotonicNow = () => performance.now(),
  wallClockNow = () => new Date(),
  wait = waitMilliseconds,
  expectedParentPid = null,
  expectedParentIsAlive = currentProcessStillHasExpectedParent,
  requestedStopReason = () =>
    existsSync(paths.stopPath) ? "stop-file" : null,
}) {
  const normalizedPaths = resolveHkVisualizationGlobalProfileMonitorPaths({
    manifest,
    ...paths,
  });
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1 ||
    intervalMs > HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS
  ) {
    throw new Error(
      `Global profile monitor interval must be an integer from 1 through ${HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS}.`,
    );
  }
  if (
    expectedParentPid !== null &&
    (!Number.isSafeInteger(expectedParentPid) || expectedParentPid <= 0)
  ) {
    throw new Error(
      `Global profile monitor expected parent pid must be a positive integer; received ${String(expectedParentPid)}.`,
    );
  }
  if (typeof expectedParentIsAlive !== "function") {
    throw new Error("Global profile monitor expected-parent probe must be a function.");
  }
  for (const [label, artifactPath] of [
    ["receipt", normalizedPaths.receiptPath],
    ["ready", normalizedPaths.readyPath],
    ["stop", normalizedPaths.stopPath],
    ["pid", normalizedPaths.pidPath],
  ]) {
    if (existsSync(artifactPath)) {
      throw new Error(
        `Global profile monitor refuses stale ${label} artifact ${artifactPath}.`,
      );
    }
  }
  mkdirSync(dirname(normalizedPaths.receiptPath), { recursive: true });
  mkdirSync(dirname(normalizedPaths.readyPath), { recursive: true });
  atomicWriteFile(normalizedPaths.pidPath, `${monitorPid}\n`);

  const sourceHashes = hashHkVisualizationGlobalProfileMonitorSources();
  const monitorStartedAt = Number(monotonicNow());
  const startedAtUtc = wallClockNow().toISOString();
  const samples = [];
  let parentFailureMessage = null;
  const expectedParentDisappeared = () => {
    if (expectedParentPid === null) return false;
    try {
      const alive = expectedParentIsAlive(expectedParentPid);
      if (alive === true) return false;
      parentFailureMessage =
        alive === false
          ? `expected parent/runner process ${expectedParentPid} disappeared or was replaced`
          : `expected parent/runner process ${expectedParentPid} probe returned non-boolean ${String(alive)}`;
    } catch (error) {
      parentFailureMessage =
        `expected parent/runner process ${expectedParentPid} probe failed: ${safeError(error)}`;
    }
    return true;
  };
  const nextStopReason = () => {
    if (expectedParentDisappeared()) return "parent-exit";
    return requestedStopReason();
  };
  const takeSample = (phase) => {
    const sample = sampleHkVisualizationGlobalProfiles({
      manifest,
      ordinal: samples.length,
      phase,
      monitorStartedAt,
      monotonicNow,
      spawn,
    });
    samples.push(sample);
    return sample;
  };

  const firstSample = takeSample("first");
  atomicWriteFile(
    normalizedPaths.readyPath,
    `${JSON.stringify(
      {
        schemaVersion: HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA,
        runId: manifest.runId,
        manifestHash: manifest.manifestHash,
        sourceHashes,
        monitorPid,
        firstSampleOrdinal: firstSample.ordinal,
        firstSampleElapsedMs: firstSample.monotonicElapsedMs,
        firstSampleErrors: [...firstSample.errors],
      },
      null,
      2,
    )}\n`,
  );

  let stopReason =
    firstSample.errors.length > 0 ? "validation-error" : nextStopReason();
  while (!stopReason) {
    stopReason = nextStopReason();
    if (stopReason) break;
    const elapsedSinceLast =
      Number(monotonicNow()) -
      monitorStartedAt -
      samples.at(-1).monotonicElapsedMs;
    await wait(Math.max(0, intervalMs - elapsedSinceLast));
    stopReason = nextStopReason();
    if (stopReason) break;
    const periodicSample = takeSample("periodic");
    if (periodicSample.errors.length > 0) {
      stopReason = "validation-error";
      break;
    }
  }

  const finalSample = takeSample("final");
  if (finalSample.errors.length > 0) stopReason = "validation-error";
  if (
    !isDeepStrictEqual(
      sourceHashes,
      hashHkVisualizationGlobalProfileMonitorSources(),
    )
  ) {
    const currentFinalSample = samples.at(-1);
    samples[samples.length - 1] = Object.freeze({
      ...currentFinalSample,
      errors: Object.freeze([
        ...currentFinalSample.errors,
        "profile-monitor-source-drift",
      ]),
    });
    stopReason = "validation-error";
  }
  if (
    stopReason !== "validation-error" &&
    expectedParentDisappeared()
  ) {
    stopReason = "parent-exit";
  }
  if (stopReason === "parent-exit") {
    const currentFinalSample = samples.at(-1);
    samples[samples.length - 1] = Object.freeze({
      ...currentFinalSample,
      errors: Object.freeze([
        ...currentFinalSample.errors,
        parentFailureMessage ??
          `expected parent/runner process ${String(expectedParentPid)} disappeared`,
      ]),
    });
  }
  const receipt = buildHkVisualizationGlobalProfileReceipt({
    manifest,
    paths: normalizedPaths,
    intervalMs,
    monitorPid,
    startedAtUtc,
    completedAtUtc: wallClockNow().toISOString(),
    stopReason,
    samples,
    sourceHashes,
  });
  atomicWriteFile(
    normalizedPaths.receiptPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return receipt;
}

function isDirectInvocation() {
  return Boolean(process.argv[1]) &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function runDirectChild() {
  const expectedParentPid = process.ppid;
  const args = parseHkVisualizationGlobalProfileMonitorArgs(
    process.argv.slice(2),
  );
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(args.manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Global profile monitor could not read its path manifest: ${safeError(error)}.`,
    );
  }
  const paths = resolveHkVisualizationGlobalProfileMonitorPaths({
    manifest,
    ...args,
  });
  let receivedSignal = null;
  const onSigterm = () => {
    receivedSignal = "sigterm";
  };
  process.on("SIGTERM", onSigterm);
  try {
    const receipt = await runHkVisualizationGlobalProfileMonitor({
      manifest,
      paths,
      intervalMs: args.intervalMs,
      expectedParentPid,
      requestedStopReason: () =>
        receivedSignal ?? (existsSync(paths.stopPath) ? "stop-file" : null),
    });
    const summary = validateHkVisualizationGlobalProfileReceipt(receipt, {
      manifest,
      paths,
    });
    process.stdout.write(
      `${JSON.stringify({ receiptPath: paths.receiptPath, ...summary })}\n`,
    );
  } finally {
    process.off("SIGTERM", onSigterm);
  }
}

if (isDirectInvocation()) {
  runDirectChild().catch((error) => {
    process.stderr.write(`${safeError(error)}\n`);
    process.exitCode = 1;
  });
}
