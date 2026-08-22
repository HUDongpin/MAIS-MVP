import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { types as utilTypes } from "node:util";

import { hashEnvironmentText } from "./required-browser-proof-primitives.mjs";

const liveHomeProofState = new WeakMap();

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const HOME_OPEN_FLAGS =
  fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_DIRECTORY;
const CANDIDATE_OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;

function fail(code) {
  throw new Error(code);
}

function nullRecord(entries) {
  const record = OBJECT_CREATE(null);
  for (const [key, value] of entries) {
    OBJECT_DEFINE_PROPERTY(record, key, {
      configurable: false,
      enumerable: true,
      value,
      writable: false
    });
  }
  return OBJECT_FREEZE(record);
}

function expectedHashFromOptions(options) {
  if (options === undefined) return undefined;
  if (
    options === null
    || typeof options !== "object"
    || utilTypes.isProxy(options)
    || ARRAY_IS_ARRAY(options)
  ) {
    fail("LIVE_HOME_EXPECTED_HASH_INVALID");
  }
  const prototype = OBJECT_GET_PROTOTYPE_OF(options);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail("LIVE_HOME_EXPECTED_HASH_INVALID");
  }
  const keys = REFLECT_OWN_KEYS(options);
  if (
    keys.length > 1
    || (keys.length === 1 && keys[0] !== "expectedHomeValueSha256")
  ) {
    fail("LIVE_HOME_EXPECTED_HASH_INVALID");
  }
  if (keys.length === 0) return undefined;
  const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
    options,
    "expectedHomeValueSha256"
  );
  if (
    !descriptor
    || !("value" in descriptor)
    || typeof descriptor.value !== "string"
    || !/^[a-f0-9]{64}$/.test(descriptor.value)
  ) {
    fail("LIVE_HOME_EXPECTED_HASH_INVALID");
  }
  return descriptor.value;
}

function sameHomeIdentity(left, right) {
  return (
    left.valueSha256 === right.valueSha256
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid
    && left.type === right.type
  );
}

function samePhysicalStats(left, right) {
  return (
    left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid
    && left.isDirectory() === right.isDirectory()
    && left.isFile() === right.isFile()
    && left.isSymbolicLink() === right.isSymbolicLink()
  );
}

function safeStatInteger(value) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("LIVE_HOME_IDENTITY_INVALID");
  }
  return Number(value);
}

function homeIdentityFromStats(entry, valueSha256) {
  return nullRecord([
    ["dev", entry.dev.toString(10)],
    ["gid", safeStatInteger(entry.gid)],
    ["ino", entry.ino.toString(10)],
    ["mode", safeStatInteger(entry.mode)],
    ["type", "directory"],
    ["uid", safeStatInteger(entry.uid)],
    ["valueSha256", valueSha256]
  ]);
}

function assertObservedHomePath(
  exactValue,
  descriptorEntry,
  openedEntry,
  canonicalPath,
  finalEntry,
  finalOpenedEntry
) {
  if (
    !descriptorEntry
    || !descriptorEntry.isDirectory()
    || descriptorEntry.isSymbolicLink()
    || !openedEntry.isDirectory()
    || openedEntry.isSymbolicLink()
    || !finalEntry
    || !finalEntry.isDirectory()
    || finalEntry.isSymbolicLink()
    || !finalOpenedEntry.isDirectory()
    || finalOpenedEntry.isSymbolicLink()
    || canonicalPath !== exactValue
    || !samePhysicalStats(descriptorEntry, openedEntry)
    || !samePhysicalStats(openedEntry, finalEntry)
    || !samePhysicalStats(openedEntry, finalOpenedEntry)
  ) {
    fail("LIVE_HOME_IDENTITY_DRIFT");
  }
}

function observeCurrentHome(
  expectedValueSha256,
  expectedIdentity,
  operation,
  proof,
  candidate
) {
  const environment = process.env;
  if (
    environment === null
    || typeof environment !== "object"
    || utilTypes.isProxy(environment)
  ) {
    fail("LIVE_HOME_VALUE_UNREADABLE");
  }
  let homeDescriptor;
  try {
    homeDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(environment, "HOME");
  } catch {
    fail("LIVE_HOME_VALUE_UNREADABLE");
  }
  if (!homeDescriptor) fail("LIVE_HOME_VALUE_MISSING");
  if (!("value" in homeDescriptor) || !homeDescriptor.enumerable) {
    fail("LIVE_HOME_VALUE_UNREADABLE");
  }
  if (
    typeof homeDescriptor.value !== "string"
    || homeDescriptor.value.length === 0
  ) {
    fail("LIVE_HOME_VALUE_MISSING");
  }
  const exactValue = homeDescriptor.value;
  let valueSha256;
  try {
    valueSha256 = hashEnvironmentText("HOME", exactValue);
  } catch {
    fail("LIVE_HOME_VALUE_INVALID");
  }
  if (
    expectedValueSha256 !== undefined
    && valueSha256 !== expectedValueSha256
  ) {
    fail("LIVE_HOME_HASH_MISMATCH");
  }

  let pathShapeValid = false;
  try {
    pathShapeValid = isAbsolute(exactValue) && resolve(exactValue) === exactValue;
  } catch {
    pathShapeValid = false;
  }
  if (!pathShapeValid) fail("LIVE_HOME_PATH_INVALID");

  let descriptorEntry;
  try {
    descriptorEntry = lstatSync(exactValue, {
      bigint: true,
      throwIfNoEntry: false
    });
  } catch {
    fail("LIVE_HOME_PATH_UNAVAILABLE");
  }
  if (
    !descriptorEntry
    || !descriptorEntry.isDirectory()
    || descriptorEntry.isSymbolicLink()
  ) {
    fail("LIVE_HOME_PATH_INVALID");
  }

  let descriptor;
  try {
    descriptor = openSync(exactValue, HOME_OPEN_FLAGS);
  } catch {
    fail("LIVE_HOME_PATH_UNAVAILABLE");
  }
  try {
    let openedEntry;
    let canonicalPath;
    let finalEntry;
    let finalOpenedEntry;
    try {
      openedEntry = fstatSync(descriptor, { bigint: true });
      canonicalPath = realpathSync(exactValue);
      finalEntry = lstatSync(exactValue, {
        bigint: true,
        throwIfNoEntry: false
      });
      finalOpenedEntry = fstatSync(descriptor, { bigint: true });
    } catch {
      fail("LIVE_HOME_PATH_UNAVAILABLE");
    }
    assertObservedHomePath(
      exactValue,
      descriptorEntry,
      openedEntry,
      canonicalPath,
      finalEntry,
      finalOpenedEntry
    );

    const observed = homeIdentityFromStats(openedEntry, valueSha256);
    if (expectedIdentity && !sameHomeIdentity(observed, expectedIdentity)) {
      fail("LIVE_HOME_IDENTITY_DRIFT");
    }

    if (operation === "path-guard") {
      if (candidatePathStatus(candidate, exactValue) !== "outside") {
        fail("LIVE_HOME_PATH_OVERLAP");
      }
    } else if (operation === "retention") {
      inspectRetentionCandidate(proof, candidate, exactValue, new WeakSet());
    } else if (operation !== undefined) {
      fail("LIVE_HOME_PROOF_INVALID");
    }

    let afterOperationEntry;
    let afterOperationOpenedEntry;
    let afterOperationCanonicalPath;
    try {
      afterOperationEntry = lstatSync(exactValue, {
        bigint: true,
        throwIfNoEntry: false
      });
      afterOperationOpenedEntry = fstatSync(descriptor, { bigint: true });
      afterOperationCanonicalPath = realpathSync(exactValue);
    } catch {
      fail("LIVE_HOME_PATH_UNAVAILABLE");
    }
    assertObservedHomePath(
      exactValue,
      descriptorEntry,
      openedEntry,
      afterOperationCanonicalPath,
      afterOperationEntry,
      afterOperationOpenedEntry
    );
    return observed;
  } finally {
    closeSync(descriptor);
  }
}

function stateForProof(proof) {
  if (
    proof === null
    || (typeof proof !== "object" && typeof proof !== "function")
    || utilTypes.isProxy(proof)
  ) {
    fail("LIVE_HOME_PROOF_INVALID");
  }
  const state = liveHomeProofState.get(proof);
  if (!state) fail("LIVE_HOME_PROOF_INVALID");
  return state;
}

export function createLiveHomeProof(options) {
  const expectedHomeValueSha256 = expectedHashFromOptions(options);
  const state = observeCurrentHome(expectedHomeValueSha256);
  const proof = OBJECT_FREEZE(OBJECT_CREATE(null));
  liveHomeProofState.set(proof, state);
  return proof;
}

export function assertLiveHomeProof(proof, options) {
  const state = stateForProof(proof);
  const expectedHomeValueSha256 = expectedHashFromOptions(options);
  observeCurrentHome(
    expectedHomeValueSha256 ?? state.valueSha256,
    state
  );
}

export function liveHomeValueSha256(proof) {
  const state = stateForProof(proof);
  observeCurrentHome(state.valueSha256, state);
  return state.valueSha256;
}

function isInsideOrEqual(candidate, root) {
  const candidateRelative = relative(root, candidate);
  return (
    candidateRelative === ""
    || (
      candidateRelative !== ".."
      && !candidateRelative.startsWith(
        `..${process.platform === "win32" ? "\\" : "/"}`
      )
      && !isAbsolute(candidateRelative)
    )
  );
}

function overlap(candidate, homePath) {
  return (
    isInsideOrEqual(candidate, homePath)
    || isInsideOrEqual(homePath, candidate)
  );
}

function candidatePathStatus(candidatePath, homePath) {
  if (typeof candidatePath !== "string" || !isAbsolute(candidatePath)) {
    return "not-path";
  }
  let absolute;
  try {
    absolute = resolve(candidatePath);
  } catch {
    return "invalid";
  }
  if (overlap(absolute, homePath)) return "overlap";
  if (absolute !== candidatePath) return "invalid";

  let ancestor = absolute;
  let entry;
  try {
    while (true) {
      entry = lstatSync(ancestor, {
        bigint: true,
        throwIfNoEntry: false
      });
      if (entry) break;
      const parent = dirname(ancestor);
      if (parent === ancestor) return "invalid";
      ancestor = parent;
    }
  } catch {
    return "invalid";
  }

  const suffix = relative(ancestor, absolute);
  if (entry.isSymbolicLink()) {
    try {
      const canonicalAncestor = realpathSync(ancestor);
      const finalEntry = lstatSync(ancestor, {
        bigint: true,
        throwIfNoEntry: false
      });
      if (!finalEntry || !samePhysicalStats(entry, finalEntry)) return "invalid";
      const canonical = resolve(canonicalAncestor, suffix);
      return overlap(canonical, homePath) ? "overlap" : "invalid";
    } catch {
      return "invalid";
    }
  }
  if (!entry.isDirectory() && !entry.isFile()) return "invalid";

  let descriptor;
  try {
    descriptor = openSync(ancestor, CANDIDATE_OPEN_FLAGS);
  } catch {
    return "invalid";
  }
  try {
    const openedEntry = fstatSync(descriptor, { bigint: true });
    const canonicalAncestor = realpathSync(ancestor);
    const finalEntry = lstatSync(ancestor, {
      bigint: true,
      throwIfNoEntry: false
    });
    const finalOpenedEntry = fstatSync(descriptor, { bigint: true });
    if (
      !finalEntry
      || !samePhysicalStats(entry, openedEntry)
      || !samePhysicalStats(openedEntry, finalEntry)
      || !samePhysicalStats(openedEntry, finalOpenedEntry)
    ) {
      return "invalid";
    }
    const canonical = resolve(canonicalAncestor, suffix);
    if (overlap(canonical, homePath)) return "overlap";
    if (canonical !== absolute) return "invalid";
    if (suffix !== "") {
      const firstMissingComponent = suffix.split(/[/\\]/u, 1)[0];
      const appearedEntry = lstatSync(
        resolve(ancestor, firstMissingComponent),
        { bigint: true, throwIfNoEntry: false }
      );
      if (appearedEntry) return "invalid";
    }
    return "outside";
  } catch {
    return "invalid";
  } finally {
    closeSync(descriptor);
  }
}

export function assertPathOutsideLiveHome(proof, candidatePath) {
  const state = stateForProof(proof);
  observeCurrentHome(
    state.valueSha256,
    state,
    "path-guard",
    proof,
    candidatePath
  );
}

function forbiddenCarrierKey(key) {
  return (
    key === "HOME"
    || key === "rawHome"
    || key === "homePath"
    || key === "exactValue"
    || key === "canonicalPath"
    || key === "raw"
  );
}

function inspectRetentionString(value, homePath) {
  if (value.includes(homePath)) fail("LIVE_HOME_RETENTION_REJECTED");
  const status = candidatePathStatus(value, homePath);
  if (status === "overlap") fail("LIVE_HOME_RETENTION_REJECTED");
}

function inspectRetentionCandidate(proof, candidate, homePath, ancestors) {
  if (candidate === null || typeof candidate === "boolean") return;
  if (typeof candidate === "string") {
    inspectRetentionString(candidate, homePath);
    return;
  }
  if (typeof candidate === "number") {
    if (!Number.isFinite(candidate)) fail("LIVE_HOME_RETENTION_REJECTED");
    return;
  }
  if (
    candidate === undefined
    || typeof candidate === "bigint"
    || typeof candidate === "symbol"
    || typeof candidate === "function"
  ) {
    fail("LIVE_HOME_RETENTION_REJECTED");
  }
  if (
    candidate === proof
    || liveHomeProofState.has(candidate)
    || utilTypes.isProxy(candidate)
  ) {
    fail("LIVE_HOME_RETENTION_REJECTED");
  }
  if (ancestors.has(candidate)) fail("LIVE_HOME_RETENTION_REJECTED");
  ancestors.add(candidate);
  try {
    const prototype = OBJECT_GET_PROTOTYPE_OF(candidate);
    if (ARRAY_IS_ARRAY(candidate)) {
      if (prototype !== ARRAY_PROTOTYPE) fail("LIVE_HOME_RETENTION_REJECTED");
      const keys = REFLECT_OWN_KEYS(candidate);
      if (keys.length !== candidate.length + 1) {
        fail("LIVE_HOME_RETENTION_REJECTED");
      }
      const lengthDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
        candidate,
        "length"
      );
      if (!lengthDescriptor || !("value" in lengthDescriptor)) {
        fail("LIVE_HOME_RETENTION_REJECTED");
      }
      for (let index = 0; index < candidate.length; index += 1) {
        const key = String(index);
        const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(candidate, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          fail("LIVE_HOME_RETENTION_REJECTED");
        }
        inspectRetentionCandidate(
          proof,
          descriptor.value,
          homePath,
          ancestors
        );
      }
      return;
    }
    if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
      fail("LIVE_HOME_RETENTION_REJECTED");
    }
    for (const key of REFLECT_OWN_KEYS(candidate)) {
      if (typeof key !== "string" || forbiddenCarrierKey(key)) {
        fail("LIVE_HOME_RETENTION_REJECTED");
      }
      inspectRetentionString(key, homePath);
      const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(candidate, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("LIVE_HOME_RETENTION_REJECTED");
      }
      inspectRetentionCandidate(
        proof,
        descriptor.value,
        homePath,
        ancestors
      );
    }
  } finally {
    ancestors.delete(candidate);
  }
}

export function assertNoLiveHomeRetention(proof, candidate) {
  const state = stateForProof(proof);
  observeCurrentHome(
    state.valueSha256,
    state,
    "retention",
    proof,
    candidate
  );
}
