import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  canonicalizeClosedJson,
  hashCanonicalProof
} from "./required-browser-proof-primitives.mjs";

const CAPABILITY_KIND = "mais-test-fixture-removal-capability";
const CAPABILITY_SCHEMA_VERSION = 2;
const FIXTURE_MARKER = ".mais-test-fixture-capability.json";
const NONCE_PATTERN = /^[a-f0-9]{64}$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)$/;
const DEFINITION_DOMAIN = "required-browser-test-fixture-definition-v2";
const CREATOR_BINDING_DOMAIN =
  "required-browser-test-fixture-creator-process-binding-v1";
const MARKER_DOMAIN = "required-browser-test-fixture-marker-v2";
const VIEW_DOMAIN = "required-browser-test-fixture-view-v2";
const DEFINITION_KEYS = Object.freeze([
  "schemaVersion",
  "kind",
  "creatorProcessBindingFingerprint",
  "nonce",
  "repoRoot",
  "repoTmpRoot",
  "parent",
  "parentIdentity",
  "leaf",
  "leafIdentity",
  "protectedRoots"
]);
const MARKER_KEYS = Object.freeze([
  "schemaVersion",
  "definition",
  "definitionFingerprint",
  "markerFingerprint"
]);
const CANONICAL_DEFINITION_KEYS = Object.freeze([...DEFINITION_KEYS].sort());
const CANONICAL_MARKER_KEYS = Object.freeze([...MARKER_KEYS].sort());
const CANONICAL_STARSHIP_ROOT = "/Volumes/Starship";
const INCIDENT_ROOTS = Object.freeze([
  "/Volumes/Starship/MAIS-15-bug-loop-incident-20260812-cade3fb19de315157f902a57ebbdc8f3546195f1bd0d0d6cece2e1aba5f02381"
]);
const PROCESS_START_TOKEN = createHash("sha256")
  .update(`${process.pid}:${process.ppid}:${process.execPath}:${performance.timeOrigin}:${randomBytes(32).toString("hex")}`)
  .digest("hex");
const liveCapabilities = new WeakMap();
const syntheticReservations = new WeakMap();

function frozenRecord(entries) {
  const record = Object.create(null);
  for (const [key, value] of entries) {
    Object.defineProperty(record, key, {
      configurable: false,
      enumerable: true,
      value,
      writable: false
    });
  }
  return Object.freeze(record);
}

function sameClosedValue(left, right) {
  return canonicalizeClosedJson(left) === canonicalizeClosedJson(right);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function schemaVersionFirst(candidate, expected, label) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error(`${label} must be an exact schema-${expected} record.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(candidate, "schemaVersion");
  if (
    !descriptor || !("value" in descriptor) || descriptor.value !== expected ||
    descriptor.enumerable !== true
  ) {
    throw new Error(`${label} schemaVersion must be an own enumerable data value ${expected}.`);
  }
}

function exactOwnDataRecord(candidate, expectedKeys, label) {
  const prototype = Object.getPrototypeOf(candidate);
  if (prototype !== null && prototype !== Object.prototype) {
    throw new Error(`${label} must have a plain or null prototype.`);
  }
  const keys = Reflect.ownKeys(candidate);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error(`${label} has unknown, missing, symbol, or out-of-order keys.`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error(`${label}.${key} must be an own enumerable data value.`);
    }
  }
}

function markerText(marker) {
  return `${canonicalizeClosedJson(marker)}\n`;
}

function isStrictDescendant(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isInsideOrEqual(candidate, root) {
  return candidate === root || isStrictDescendant(candidate, root);
}

function requireAbsoluteCanonicalDirectory(label, candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "" || !path.isAbsolute(candidate)) {
    throw new Error(`${label} must be a nonempty absolute path.`);
  }
  const absolute = path.resolve(candidate);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry?.isDirectory() || entry.isSymbolicLink() || realpathSync(absolute) !== absolute) {
    throw new Error(`${label} must be an existing canonical nonsymlink directory.`);
  }
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (!Number.isSafeInteger(expectedUid) || entry.uid !== expectedUid || (entry.mode & 0o022) !== 0) {
    throw new Error(`${label} must be owner-controlled and not group/world writable.`);
  }
  return absolute;
}

function identity(entry) {
  return frozenRecord([
    ["dev", String(entry.dev)],
    ["ino", String(entry.ino)]
  ]);
}

function markerPreimage(definition, definitionFingerprint) {
  return frozenRecord([
    ["schemaVersion", CAPABILITY_SCHEMA_VERSION],
    ["definition", definition],
    ["definitionFingerprint", definitionFingerprint]
  ]);
}

function markerRecord(definition, definitionFingerprint) {
  const preimage = markerPreimage(definition, definitionFingerprint);
  return frozenRecord([
    ["schemaVersion", CAPABILITY_SCHEMA_VERSION],
    ["definition", definition],
    ["definitionFingerprint", definitionFingerprint],
    ["markerFingerprint", hashCanonicalProof(MARKER_DOMAIN, preimage)]
  ]);
}

function stateForRegisteredToken(capability) {
  const state = capability && typeof capability === "object" && !utilTypes.isProxy(capability)
    ? liveCapabilities.get(capability)
    : undefined;
  if (!state || state.status !== "registered") {
    throw new Error("Test fixture capability token is unregistered, stale, forged, or terminal.");
  }
  return state;
}

function assertIdentityRecord(candidate, label) {
  const prototype = candidate && typeof candidate === "object"
    ? Object.getPrototypeOf(candidate)
    : undefined;
  if (
    !candidate || typeof candidate !== "object" ||
    (prototype !== null && prototype !== Object.prototype) ||
    !sameClosedValue(Reflect.ownKeys(candidate), ["dev", "ino"])
  ) {
    throw new Error(`${label} must be an exact physical identity record.`);
  }
  for (const key of ["dev", "ino"]) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (
      !descriptor || !("value" in descriptor) || descriptor.enumerable !== true ||
      typeof descriptor.value !== "string" || !DECIMAL_PATTERN.test(descriptor.value)
    ) {
      throw new Error(`${label}.${key} must be a canonical decimal string.`);
    }
  }
}

function assertDefinition(
  definition,
  expectedFingerprint,
  expectedKeys = DEFINITION_KEYS
) {
  schemaVersionFirst(definition, CAPABILITY_SCHEMA_VERSION, "test fixture definition");
  exactOwnDataRecord(definition, expectedKeys, "test fixture definition");
  if (
    definition.kind !== CAPABILITY_KIND ||
    typeof definition.creatorProcessBindingFingerprint !== "string" ||
    !NONCE_PATTERN.test(definition.creatorProcessBindingFingerprint) ||
    typeof definition.nonce !== "string" ||
    !NONCE_PATTERN.test(definition.nonce)
  ) {
    throw new Error("Test fixture definition kind, creator binding, or nonce is invalid.");
  }
  for (const key of ["repoRoot", "repoTmpRoot", "parent", "leaf"]) {
    if (typeof definition[key] !== "string" || definition[key].trim() === "") {
      throw new Error(`Test fixture definition ${key} is missing or empty.`);
    }
  }
  assertIdentityRecord(definition.parentIdentity, "test fixture parent identity");
  assertIdentityRecord(definition.leafIdentity, "test fixture leaf identity");
  if (!Array.isArray(definition.protectedRoots)) {
    throw new Error("Test fixture protected roots must be a dense array.");
  }
  for (let index = 0; index < definition.protectedRoots.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(definition.protectedRoots, index) ||
      typeof definition.protectedRoots[index] !== "string" ||
      !path.isAbsolute(definition.protectedRoots[index])
    ) {
      throw new Error("Test fixture protected roots contain an invalid entry.");
    }
  }
  const fingerprint = hashCanonicalProof(DEFINITION_DOMAIN, definition);
  if (expectedFingerprint !== undefined && fingerprint !== expectedFingerprint) {
    throw new Error("Test fixture definition fingerprint does not match.");
  }
  return fingerprint;
}

function assertProtectedBoundary(definition, candidate) {
  const exactForbidden = [
    path.parse(definition.repoRoot).root,
    CANONICAL_STARSHIP_ROOT,
    definition.repoRoot,
    definition.repoTmpRoot,
    definition.parent
  ].map((entry) => path.resolve(entry));
  for (const protectedRoot of exactForbidden) {
    if (candidate === protectedRoot || isInsideOrEqual(protectedRoot, candidate)) {
      throw new Error(`Test fixture removal target equals or contains protected root: ${protectedRoot}`);
    }
  }
  const sensitiveRoots = [
    path.join(definition.repoRoot, "node_modules"),
    ...INCIDENT_ROOTS,
    ...definition.protectedRoots
  ].map((entry) => path.resolve(entry));
  for (const protectedRoot of sensitiveRoots) {
    if (isInsideOrEqual(candidate, protectedRoot) || isInsideOrEqual(protectedRoot, candidate)) {
      throw new Error(`Test fixture removal target overlaps protected root: ${protectedRoot}`);
    }
  }
  if (/(?:^|\/)(?:evidence|dependency-provision-[a-f0-9]{64})(?:\/|$)/.test(candidate)) {
    throw new Error("Test fixture removal target is an evidence or dependency root.");
  }
}

function captureFixtureTree(directory, hooks = {}, phase = "snapshot", view) {
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  const entries = [];
  const visit = (current, relativePath) => {
    hooks.beforeLstat?.({ absolutePath: current, phase, relativePath, view });
    const entry = lstatSync(current, { throwIfNoEntry: false });
    if (!entry || (!entry.isDirectory() && !entry.isFile() && !entry.isSymbolicLink())) {
      throw new Error("Test fixture tree contains a missing or special-file entry.");
    }
    if (!Number.isSafeInteger(expectedUid) || entry.uid !== expectedUid || (entry.mode & 0o022) !== 0) {
      throw new Error("Test fixture tree contains an entry outside the creator's write authority.");
    }
    const kind = entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file";
    entries.push({ identity: identity(entry), kind, relativePath });
    if (entry.isDirectory()) {
      for (const child of readdirSync(current).sort()) {
        visit(path.join(current, child), relativePath ? `${relativePath}/${child}` : child);
      }
    }
  };
  visit(directory, "");
  return entries;
}

function readValidatedMarker(state, markerPath) {
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  const markerEntry = lstatSync(markerPath, { throwIfNoEntry: false });
  if (
    !markerEntry?.isFile() || markerEntry.isSymbolicLink() ||
    realpathSync(markerPath) !== markerPath ||
    (markerEntry.mode & 0o7777) !== 0o600 ||
    markerEntry.nlink !== 1 ||
    !Number.isSafeInteger(expectedUid) || markerEntry.uid !== expectedUid
  ) {
    throw new Error(
      "Test fixture capability marker is missing, noncanonical, linked, unowned, or not 0600."
    );
  }
  let descriptor;
  let bytes;
  let openedEntry;
  try {
    descriptor = openSync(
      markerPath,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
    );
    openedEntry = fstatSync(descriptor);
    if (
      !openedEntry.isFile() || openedEntry.isSymbolicLink() ||
      openedEntry.dev !== markerEntry.dev || openedEntry.ino !== markerEntry.ino ||
      (openedEntry.mode & 0o7777) !== 0o600 || openedEntry.nlink !== 1 ||
      openedEntry.uid !== expectedUid
    ) {
      throw new Error("Test fixture marker identity changed while opening its descriptor.");
    }
    bytes = readFileSync(descriptor);
    const afterReadEntry = fstatSync(descriptor);
    const finalPathEntry = lstatSync(markerPath, { throwIfNoEntry: false });
    if (
      !afterReadEntry.isFile() || afterReadEntry.isSymbolicLink() ||
      afterReadEntry.dev !== openedEntry.dev || afterReadEntry.ino !== openedEntry.ino ||
      afterReadEntry.size !== openedEntry.size || afterReadEntry.nlink !== 1 ||
      (afterReadEntry.mode & 0o7777) !== 0o600 || afterReadEntry.uid !== expectedUid ||
      !finalPathEntry?.isFile() || finalPathEntry.isSymbolicLink() ||
      finalPathEntry.dev !== openedEntry.dev || finalPathEntry.ino !== openedEntry.ino ||
      finalPathEntry.nlink !== 1 || (finalPathEntry.mode & 0o7777) !== 0o600 ||
      finalPathEntry.uid !== expectedUid || realpathSync(markerPath) !== markerPath
    ) {
      throw new Error("Test fixture marker changed during descriptor-bound readback.");
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  let marker;
  try {
    marker = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error("Test fixture capability marker is malformed.", { cause: error });
  }
  schemaVersionFirst(marker, CAPABILITY_SCHEMA_VERSION, "test fixture marker");
  exactOwnDataRecord(marker, CANONICAL_MARKER_KEYS, "test fixture marker");
  assertDefinition(
    marker.definition,
    marker.definitionFingerprint,
    CANONICAL_DEFINITION_KEYS
  );
  if (
    typeof marker.definitionFingerprint !== "string" ||
    !NONCE_PATTERN.test(marker.definitionFingerprint) ||
    typeof marker.markerFingerprint !== "string" ||
    !NONCE_PATTERN.test(marker.markerFingerprint)
  ) {
    throw new Error("Test fixture marker fingerprints are malformed.");
  }
  const expectedMarkerFingerprint = hashCanonicalProof(
    MARKER_DOMAIN,
    markerPreimage(marker.definition, marker.definitionFingerprint)
  );
  if (
    marker.markerFingerprint !== expectedMarkerFingerprint ||
    marker.definitionFingerprint !== state.definitionFingerprint ||
    marker.markerFingerprint !== state.markerFingerprint ||
    !sameClosedValue(marker.definition, state.definition) ||
    bytes.toString("utf8") !== markerText(state.marker)
  ) {
    throw new Error(
      "Test fixture capability marker definition, fingerprint, or canonical binding does not match."
    );
  }
  const markerProof = frozenRecord([
    ["identity", identity(openedEntry)],
    ["sha256", sha256(bytes)]
  ]);
  if (
    !sameClosedValue(markerProof.identity, state.markerIdentity) ||
    markerProof.sha256 !== state.markerSha256
  ) {
    throw new Error("Test fixture capability marker device-inode/content binding changed.");
  }
  return markerProof;
}

function captureFixtureSnapshot(state, leaf = state.definition.leaf, hooks = {}, phase = "snapshot") {
  const { definition } = state;
  assertDefinition(definition, state.definitionFingerprint);
  const repoRoot = requireAbsoluteCanonicalDirectory("test fixture repo root", definition.repoRoot);
  const repoTmpRoot = requireAbsoluteCanonicalDirectory("test fixture repo tmp", definition.repoTmpRoot);
  const parent = requireAbsoluteCanonicalDirectory("test fixture parent", definition.parent);
  if (
    !isStrictDescendant(repoRoot, CANONICAL_STARSHIP_ROOT) ||
    repoTmpRoot !== path.join(repoRoot, ".tmp") ||
    parent !== path.join(repoTmpRoot, "test-fixtures")
  ) {
    throw new Error("Test fixture capability parent geometry is invalid.");
  }
  const resolvedLeaf = path.resolve(leaf);
  if (
    resolvedLeaf !== leaf || !isStrictDescendant(resolvedLeaf, parent) ||
    !path.basename(resolvedLeaf).startsWith(`${definition.nonce}-`)
  ) {
    throw new Error("Test fixture removal target is not the exact nonce-bound leaf.");
  }
  assertProtectedBoundary(definition, resolvedLeaf);
  hooks.beforeLstat?.({
    absolutePath: parent,
    phase,
    relativePath: "<parent>",
    view: state.view
  });
  const parentEntry = lstatSync(parent, { throwIfNoEntry: false });
  hooks.beforeLstat?.({
    absolutePath: resolvedLeaf,
    phase,
    relativePath: "",
    view: state.view
  });
  const leafEntry = lstatSync(resolvedLeaf, { throwIfNoEntry: false });
  if (
    !parentEntry?.isDirectory() || parentEntry.isSymbolicLink() ||
    !leafEntry?.isDirectory() || leafEntry.isSymbolicLink() ||
    realpathSync(resolvedLeaf) !== resolvedLeaf
  ) {
    throw new Error("Test fixture removal target or parent was swapped, removed, or symlinked.");
  }
  if (
    !sameClosedValue(identity(parentEntry), definition.parentIdentity) ||
    !sameClosedValue(identity(leafEntry), definition.leafIdentity)
  ) {
    throw new Error("Test fixture parent/leaf device-inode identity changed.");
  }
  const markerPath = path.join(resolvedLeaf, FIXTURE_MARKER);
  hooks.beforeLstat?.({
    absolutePath: markerPath,
    phase,
    relativePath: FIXTURE_MARKER,
    view: state.view
  });
  const marker = readValidatedMarker(state, markerPath);
  const tree = captureFixtureTree(resolvedLeaf, hooks, phase, state.view);
  return {
    leaf: resolvedLeaf,
    leafIdentity: identity(leafEntry),
    leafKind: "directory",
    markerIdentity: marker.identity,
    markerKind: "file",
    markerSha256: marker.sha256,
    parentIdentity: identity(parentEntry),
    parentKind: "directory",
    tree
  };
}

export function validateFixtureRemovalRequestDefinition(capability) {
  const state = stateForRegisteredToken(capability);
  const { definition } = state;
  assertDefinition(definition, state.definitionFingerprint);
  const repoRoot = path.resolve(definition.repoRoot);
  const repoTmpRoot = path.resolve(definition.repoTmpRoot);
  const parent = path.resolve(definition.parent);
  const leaf = path.resolve(definition.leaf);
  if (
    definition.repoRoot !== repoRoot || definition.repoTmpRoot !== repoTmpRoot ||
    definition.parent !== parent || definition.leaf !== leaf ||
    !isStrictDescendant(repoRoot, CANONICAL_STARSHIP_ROOT) ||
    repoTmpRoot !== path.join(repoRoot, ".tmp") ||
    parent !== path.join(repoTmpRoot, "test-fixtures") ||
    !isStrictDescendant(leaf, parent) ||
    !path.basename(leaf).startsWith(`${definition.nonce}-`)
  ) {
    throw new Error("Test fixture capability has an empty, root, parent, or non-exact leaf path.");
  }
  assertProtectedBoundary(definition, leaf);
  return true;
}

function validateFixtureRemovalTransitionState(state, preflight, beforeRename) {
  const { definition } = state;
  if (
    !preflight || !beforeRename ||
    !sameClosedValue(preflight, beforeRename) ||
    preflight.leaf !== definition.leaf ||
    preflight.leafKind !== "directory" ||
    preflight.parentKind !== "directory" ||
    preflight.markerKind !== "file" ||
    !sameClosedValue(preflight.leafIdentity, definition.leafIdentity) ||
    !sameClosedValue(preflight.parentIdentity, definition.parentIdentity) ||
    !sameClosedValue(preflight.markerIdentity, state.markerIdentity) ||
    preflight.markerSha256 !== state.markerSha256
  ) {
    throw new Error("Test fixture removal transition lost creator, marker, path, or inode authority.");
  }
  return true;
}

export function validateFixtureRemovalTransition(capability, preflight, beforeRename) {
  return validateFixtureRemovalTransitionState(
    stateForRegisteredToken(capability),
    preflight,
    beforeRename
  );
}

function normalizedProtectedRoots(protectedRoots) {
  if (!Array.isArray(protectedRoots)) {
    throw new Error("Test fixture protectedRoots must be a dense array.");
  }
  const normalized = [];
  for (let index = 0; index < protectedRoots.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(protectedRoots, index)) {
      throw new Error("Test fixture protectedRoots must not contain holes.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(protectedRoots, String(index));
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      throw new Error("Test fixture protectedRoots entries must be own string data values.");
    }
    normalized.push(path.resolve(descriptor.value));
  }
  normalized.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  if (normalized.some((value, index) => index > 0 && value === normalized[index - 1])) {
    throw new Error("Test fixture protectedRoots must be duplicate-free.");
  }
  return Object.freeze(normalized);
}

function createCapabilityView(state) {
  const preimage = frozenRecord([
    ["schemaVersion", CAPABILITY_SCHEMA_VERSION],
    ["definition", state.definition],
    ["definitionFingerprint", state.definitionFingerprint],
    ["markerFingerprint", state.markerFingerprint],
    ["markerIdentity", state.markerIdentity],
    ["markerSha256", state.markerSha256]
  ]);
  return frozenRecord([
    ["schemaVersion", CAPABILITY_SCHEMA_VERSION],
    ["definition", state.definition],
    ["definitionFingerprint", state.definitionFingerprint],
    ["markerFingerprint", state.markerFingerprint],
    ["markerIdentity", state.markerIdentity],
    ["markerSha256", state.markerSha256],
    ["viewFingerprint", hashCanonicalProof(VIEW_DOMAIN, preimage)]
  ]);
}

export function createTestFixtureCapability(repoRoot = process.cwd(), {
  nonce = randomBytes(32).toString("hex"),
  protectedRoots = []
} = {}) {
  const canonicalRepoRoot = requireAbsoluteCanonicalDirectory("test fixture repo root", path.resolve(repoRoot));
  if (!isStrictDescendant(canonicalRepoRoot, CANONICAL_STARSHIP_ROOT)) {
    throw new Error("Test fixtures must live on the canonical Starship volume.");
  }
  const repoTmpRoot = requireAbsoluteCanonicalDirectory(
    "test fixture repo tmp",
    path.join(canonicalRepoRoot, ".tmp")
  );
  if (!NONCE_PATTERN.test(nonce)) throw new Error("Test fixture nonce must be 64 lowercase hex characters.");
  const parent = path.join(repoTmpRoot, "test-fixtures");
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const canonicalParent = requireAbsoluteCanonicalDirectory("test fixture parent", parent);
  const exclusiveParentEntry = lstatSync(canonicalParent);
  if ((exclusiveParentEntry.mode & 0o777) !== 0o700) {
    throw new Error("Test fixture parent must remain creator-owned mode 0700.");
  }
  const normalizedRoots = normalizedProtectedRoots(protectedRoots);
  const leaf = realpathSync(mkdtempSync(path.join(canonicalParent, `${nonce}-`)));
  const parentEntry = lstatSync(canonicalParent);
  const leafEntry = lstatSync(leaf);
  if (
    !leafEntry.isDirectory() || leafEntry.isSymbolicLink() ||
    (leafEntry.mode & 0o077) !== 0
  ) {
    throw new Error("Test fixture leaf must be an owner-only nonsymlink directory.");
  }
  const creatorBinding = frozenRecord([
    ["schemaVersion", 1],
    ["creatorPid", process.pid],
    ["creatorStartToken", PROCESS_START_TOKEN]
  ]);
  const creatorProcessBindingFingerprint = hashCanonicalProof(
    CREATOR_BINDING_DOMAIN,
    creatorBinding
  );
  const definition = frozenRecord([
    ["schemaVersion", CAPABILITY_SCHEMA_VERSION],
    ["kind", CAPABILITY_KIND],
    ["creatorProcessBindingFingerprint", creatorProcessBindingFingerprint],
    ["nonce", nonce],
    ["repoRoot", canonicalRepoRoot],
    ["repoTmpRoot", repoTmpRoot],
    ["parent", canonicalParent],
    ["parentIdentity", identity(parentEntry)],
    ["leaf", leaf],
    ["leafIdentity", identity(leafEntry)],
    ["protectedRoots", normalizedRoots]
  ]);
  const definitionFingerprint = assertDefinition(definition);
  const marker = markerRecord(definition, definitionFingerprint);
  const markerPath = path.join(leaf, FIXTURE_MARKER);
  const exactMarkerText = markerText(marker);
  writeFileSync(markerPath, exactMarkerText, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  const markerEntry = lstatSync(markerPath);
  const capability = Object.freeze(Object.create(null));
  const state = {
    creatorBinding,
    definition,
    definitionFingerprint,
    marker,
    markerFingerprint: marker.markerFingerprint,
    markerIdentity: identity(markerEntry),
    markerSha256: sha256(readFileSync(markerPath)),
    status: "pending-registration",
    view: null
  };
  state.view = createCapabilityView(state);
  readValidatedMarker(state, markerPath);
  captureFixtureSnapshot(state);
  state.status = "registered";
  liveCapabilities.set(capability, state);
  return capability;
}

export function validateRegisteredTestFixtureCapability(capability) {
  const state = stateForRegisteredToken(capability);
  captureFixtureSnapshot(state);
  return capability;
}

export function readTestFixtureCapabilityView(capability) {
  const state = stateForRegisteredToken(capability);
  captureFixtureSnapshot(state);
  return state.view;
}

export function reserveRequiredBrowserSyntheticLifecycleTestFixture(capability) {
  const state = stateForRegisteredToken(capability);
  captureFixtureSnapshot(state);
  const reservation = Object.freeze(Object.create(null));
  state.status = "synthetic-active";
  syntheticReservations.set(reservation, {
    fixtureState: state,
    status: "active"
  });
  return reservation;
}

export function releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation) {
  const reservationState =
    reservation && typeof reservation === "object" && !utilTypes.isProxy(reservation)
      ? syntheticReservations.get(reservation)
      : undefined;
  if (!reservationState || reservationState.status !== "active") {
    throw new Error(
      "Synthetic lifecycle test fixture reservation is unregistered, stale, forged, or consumed."
    );
  }
  reservationState.status = "consumed";
  const state = reservationState.fixtureState;
  if (state.status !== "synthetic-active") {
    state.status = "terminal";
    throw new Error("Synthetic lifecycle fixture reservation lost its active state.");
  }
  try {
    captureFixtureSnapshot(state);
    state.status = "registered";
  } catch (error) {
    state.status = "terminal";
    throw error;
  }
}

function removeReservedTestFixture(state, hooks) {
  const { definition, view } = state;
  const preflight = captureFixtureSnapshot(state, definition.leaf, hooks, "preflight");
  const beforeRename = captureFixtureSnapshot(
    state,
    definition.leaf,
    hooks,
    "before-quarantine-rename"
  );
  validateFixtureRemovalTransitionState(state, preflight, beforeRename);

  const quarantineParent = path.join(definition.parent, ".quarantine");
  if (!existsSync(quarantineParent)) mkdirSync(quarantineParent, { mode: 0o700 });
  requireAbsoluteCanonicalDirectory("test fixture quarantine parent", quarantineParent);
  hooks.beforeLstat?.({
    phase: "quarantine-parent-initial",
    target: quarantineParent,
    view
  });
  const quarantineParentStat = lstatSync(quarantineParent);
  if (
    !quarantineParentStat.isDirectory()
    || quarantineParentStat.isSymbolicLink()
    || (quarantineParentStat.mode & 0o777) !== 0o700
    || (typeof process.getuid === "function" && quarantineParentStat.uid !== process.getuid())
  ) {
    throw new Error("Test fixture quarantine parent must be a creator-owned mode-0700 directory.");
  }
  const quarantineParentIdentity = Object.freeze({
    dev: quarantineParentStat.dev,
    ino: quarantineParentStat.ino
  });
  const quarantine = path.join(
    quarantineParent,
    `${path.basename(definition.leaf)}-${randomBytes(16).toString("hex")}`
  );
  if (existsSync(quarantine)) throw new Error("Test fixture quarantine target already exists.");
  const finalPreRename = captureFixtureSnapshot(
    state,
    definition.leaf,
    hooks,
    "immediately-before-quarantine-rename"
  );
  validateFixtureRemovalTransitionState(state, preflight, finalPreRename);
  hooks.beforeRename?.({
    leaf: definition.leaf,
    phase: "quarantine-rename",
    quarantine,
    view
  });
  const afterRenameHook = captureFixtureSnapshot(
    state,
    definition.leaf,
    hooks,
    "after-rename-hook-before-rename"
  );
  validateFixtureRemovalTransitionState(state, preflight, afterRenameHook);
  hooks.beforeLstat?.({
    phase: "quarantine-parent-before-rename",
    target: quarantineParent,
    view
  });
  const quarantineParentBeforeRename = lstatSync(quarantineParent);
  if (
    !quarantineParentBeforeRename.isDirectory()
    || quarantineParentBeforeRename.isSymbolicLink()
    || quarantineParentBeforeRename.dev !== quarantineParentIdentity.dev
    || quarantineParentBeforeRename.ino !== quarantineParentIdentity.ino
    || (quarantineParentBeforeRename.mode & 0o777) !== 0o700
    || (typeof process.getuid === "function" && quarantineParentBeforeRename.uid !== process.getuid())
  ) {
    throw new Error("Test fixture quarantine parent identity changed before rename.");
  }
  renameSync(definition.leaf, quarantine);
  hooks.beforeLstat?.({
    phase: "quarantine-parent-after-rename",
    target: quarantineParent,
    view
  });
  const quarantineParentAfterRename = lstatSync(quarantineParent);
  if (
    !quarantineParentAfterRename.isDirectory()
    || quarantineParentAfterRename.isSymbolicLink()
    || quarantineParentAfterRename.dev !== quarantineParentIdentity.dev
    || quarantineParentAfterRename.ino !== quarantineParentIdentity.ino
    || (quarantineParentAfterRename.mode & 0o777) !== 0o700
    || (typeof process.getuid === "function" && quarantineParentAfterRename.uid !== process.getuid())
  ) {
    throw new Error("Test fixture quarantine parent identity changed after rename; retained evidence requires inspection.");
  }

  if (existsSync(definition.leaf)) {
    throw new Error("Test fixture exact leaf still exists after atomic quarantine rename.");
  }
  const quarantineEntry = lstatSync(quarantine, { throwIfNoEntry: false });
  if (
    !quarantineEntry?.isDirectory() || quarantineEntry.isSymbolicLink() ||
    !sameClosedValue(identity(quarantineEntry), definition.leafIdentity) ||
    !isStrictDescendant(quarantine, quarantineParent)
  ) {
    throw new Error("Quarantined test fixture lost its exact device-inode identity.");
  }
  hooks.beforeLstat?.({
    absolutePath: quarantine,
    phase: "quarantine-verification",
    relativePath: "",
    view
  });
  const finalQuarantineEntry = lstatSync(quarantine, { throwIfNoEntry: false });
  if (
    !finalQuarantineEntry?.isDirectory() || finalQuarantineEntry.isSymbolicLink() ||
    !sameClosedValue(identity(finalQuarantineEntry), definition.leafIdentity)
  ) {
    throw new Error("Quarantined test fixture root changed before final retained verification.");
  }
  hooks.beforeLstat?.({
    absolutePath: path.join(quarantine, FIXTURE_MARKER),
    phase: "quarantine-marker-verification",
    relativePath: FIXTURE_MARKER,
    view
  });
  readValidatedMarker(state, path.join(quarantine, FIXTURE_MARKER));
  const retainedTree = captureFixtureTree(
    quarantine,
    hooks,
    "quarantine-tree-verification",
    view
  );
  if (!sameClosedValue(retainedTree, preflight.tree)) {
    throw new Error("Quarantined test fixture tree changed; retained evidence will not be deleted.");
  }
  return {
    leaf: definition.leaf,
    quarantine,
    removed: false,
    status: "quarantined-retained"
  };
}

export function removeTestFixtureCapability(capability, { hooks = {} } = {}) {
  const state = stateForRegisteredToken(capability);
  state.status = "removal-reserved";
  try {
    return removeReservedTestFixture(state, hooks);
  } finally {
    state.status = "terminal";
  }
}
