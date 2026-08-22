import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  canonicalizeClosedJson,
  hashCanonicalProof
} from "./required-browser-proof-primitives.mjs";
import * as fixtureCapabilityModule from "./test-fixture-capability.mjs";

const {
  createTestFixtureCapability,
  removeTestFixtureCapability,
  validateFixtureRemovalRequestDefinition,
  validateFixtureRemovalTransition,
  validateRegisteredTestFixtureCapability
} = fixtureCapabilityModule;

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
const CANONICAL_MARKER_KEYS = Object.freeze([...MARKER_KEYS].sort());
const VIEW_KEYS = Object.freeze([
  "schemaVersion",
  "definition",
  "definitionFingerprint",
  "markerFingerprint",
  "markerIdentity",
  "markerSha256",
  "viewFingerprint"
]);

function readCapabilityView(capability) {
  assert.equal(
    typeof fixtureCapabilityModule.readTestFixtureCapabilityView,
    "function",
    "fixture schema 2 must expose a non-authorizing capability view"
  );
  return fixtureCapabilityModule.readTestFixtureCapabilityView(capability);
}

function reserveSyntheticFixture(capability) {
  assert.equal(
    typeof fixtureCapabilityModule.reserveRequiredBrowserSyntheticLifecycleTestFixture,
    "function",
    "fixture schema 2 must expose the dedicated synthetic reservation API"
  );
  return fixtureCapabilityModule.reserveRequiredBrowserSyntheticLifecycleTestFixture(
    capability
  );
}

function releaseSyntheticFixture(reservation) {
  assert.equal(
    typeof fixtureCapabilityModule.releaseRequiredBrowserSyntheticLifecycleTestFixture,
    "function",
    "fixture schema 2 must expose the dedicated synthetic release API"
  );
  return fixtureCapabilityModule.releaseRequiredBrowserSyntheticLifecycleTestFixture(
    reservation
  );
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function fakeFilesystemSnapshot(capability, overrides = {}) {
  const view = readCapabilityView(capability);
  return {
    leaf: view.definition.leaf,
    leafIdentity: view.definition.leafIdentity,
    leafKind: "directory",
    markerIdentity: view.markerIdentity,
    markerKind: "file",
    markerSha256: view.markerSha256,
    parentIdentity: view.definition.parentIdentity,
    parentKind: "directory",
    tree: [],
    ...overrides
  };
}

function protectedCanaryCapability() {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readCapabilityView(capability);
  const canary = path.join(view.definition.leaf, "protected-canary.txt");
  writeFileSync(canary, "retain", { mode: 0o600 });
  return { canary, capability, view };
}

function assertCanarySurvivesQuarantine({ canary, capability }) {
  const outcome = removeTestFixtureCapability(capability);
  assert.equal(outcome.status, "quarantined-retained");
  assert.equal(
    readFileSync(path.join(outcome.quarantine, path.basename(canary)), "utf8"),
    "retain"
  );
}

test("fixture schema 2 exposes only a zero-key nominal token and a closed non-authorizing view", () => {
  const capability = createTestFixtureCapability(process.cwd());
  assert.equal(Object.getPrototypeOf(capability), null);
  assert.equal(Object.isFrozen(capability), true);
  assert.deepEqual(Reflect.ownKeys(capability), []);

  const view = readCapabilityView(capability);
  assert.deepEqual(Reflect.ownKeys(view), VIEW_KEYS);
  assert.deepEqual(Reflect.ownKeys(view.definition), DEFINITION_KEYS);
  assert.equal(view.schemaVersion, 2);
  assert.equal(view.definition.schemaVersion, 2);
  assert.match(view.definition.creatorProcessBindingFingerprint, /^[a-f0-9]{64}$/);
  assert.match(view.definitionFingerprint, /^[a-f0-9]{64}$/);
  assert.match(view.markerFingerprint, /^[a-f0-9]{64}$/);
  assert.match(view.markerSha256, /^[a-f0-9]{64}$/);
  assert.match(view.viewFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(
    view.definitionFingerprint,
    hashCanonicalProof("required-browser-test-fixture-definition-v2", view.definition)
  );
  assertDeepFrozen(view);

  const markerPath = path.join(
    view.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  const markerText = readFileSync(markerPath, "utf8");
  const marker = JSON.parse(markerText);
  assert.deepEqual(Reflect.ownKeys(marker), CANONICAL_MARKER_KEYS);
  assert.equal(markerText, `${canonicalizeClosedJson(marker)}\n`);
  assert.equal(marker.schemaVersion, 2);
  assert.equal(
    canonicalizeClosedJson(marker.definition),
    canonicalizeClosedJson(view.definition)
  );
  assert.equal(marker.definitionFingerprint, view.definitionFingerprint);
  assert.equal(marker.markerFingerprint, view.markerFingerprint);
  assert.equal(
    marker.markerFingerprint,
    hashCanonicalProof("required-browser-test-fixture-marker-v2", {
      schemaVersion: 2,
      definition: view.definition,
      definitionFingerprint: view.definitionFingerprint
    })
  );
  assert.equal(
    view.markerSha256,
    createHash("sha256").update(markerText).digest("hex")
  );
  assert.equal(
    view.viewFingerprint,
    hashCanonicalProof("required-browser-test-fixture-view-v2", {
      schemaVersion: 2,
      definition: view.definition,
      definitionFingerprint: view.definitionFingerprint,
      markerFingerprint: view.markerFingerprint,
      markerIdentity: view.markerIdentity,
      markerSha256: view.markerSha256
    })
  );

  assert.equal(validateRegisteredTestFixtureCapability(capability), capability);
  const outcome = removeTestFixtureCapability(capability);
  assert.equal(outcome.status, "quarantined-retained");
});

test("fixture schema 2 rejects structural clones, accessors, proxies, cross-cleaning, and replay", () => {
  const first = createTestFixtureCapability(process.cwd());
  const concurrent = protectedCanaryCapability();
  const firstView = readCapabilityView(first);
  let accessorReads = 0;
  const accessorCandidate = Object.create(null);
  Object.defineProperty(accessorCandidate, "capabilityId", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "forged";
    }
  });
  let proxyTrapCalls = 0;
  const proxyCandidate = new Proxy(first, {
    get() {
      proxyTrapCalls += 1;
      throw new Error("fixture token proxy must not be inspected");
    },
    getOwnPropertyDescriptor() {
      proxyTrapCalls += 1;
      throw new Error("fixture token proxy descriptor must not be inspected");
    },
    getPrototypeOf() {
      proxyTrapCalls += 1;
      throw new Error("fixture token proxy prototype must not be inspected");
    },
    ownKeys() {
      proxyTrapCalls += 1;
      throw new Error("fixture token proxy keys must not be inspected");
    }
  });
  const presentUndefinedCandidate = Object.create(null);
  Object.defineProperty(presentUndefinedCandidate, "capabilityId", {
    enumerable: true,
    value: undefined
  });

  for (const candidate of [
    undefined,
    {},
    Object.create(null),
    { ...first },
    structuredClone(first),
    firstView,
    accessorCandidate,
    presentUndefinedCandidate,
    proxyCandidate
  ]) {
    assert.throws(
      () => validateRegisteredTestFixtureCapability(candidate),
      /capability|registered|stale|forged|token/i
    );
  }
  assert.equal(accessorReads, 0);
  assert.equal(proxyTrapCalls, 0);
  assert.equal(validateRegisteredTestFixtureCapability(first), first);

  const firstOutcome = removeTestFixtureCapability(first);
  assert.equal(firstOutcome.status, "quarantined-retained");
  assert.throws(
    () => validateRegisteredTestFixtureCapability(first),
    /capability|consumed|registered|stale|terminal/i
  );
  assert.throws(
    () => removeTestFixtureCapability(first),
    /capability|consumed|registered|stale|terminal/i
  );
  assert.throws(
    () => readCapabilityView(first),
    /capability|consumed|registered|stale|terminal/i
  );
  assertCanarySurvivesQuarantine(concurrent);
});

test("synthetic lifecycle reservation is zero-key, exclusive, exact-identity, and reusable only after release", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const originalView = readCapabilityView(capability);
  const reservation = reserveSyntheticFixture(capability);
  assert.equal(Object.getPrototypeOf(reservation), null);
  assert.equal(Object.isFrozen(reservation), true);
  assert.deepEqual(Reflect.ownKeys(reservation), []);

  for (const operation of [
    () => validateRegisteredTestFixtureCapability(capability),
    () => readCapabilityView(capability),
    () => removeTestFixtureCapability(capability),
    () => reserveSyntheticFixture(capability)
  ]) {
    assert.throws(operation, /active|capability|registered|reserved|state|token/i);
  }

  let proxyTrapCalls = 0;
  const proxyReservation = new Proxy(reservation, {
    get() {
      proxyTrapCalls += 1;
      throw new Error("reservation proxy get must not run");
    },
    getOwnPropertyDescriptor() {
      proxyTrapCalls += 1;
      throw new Error("reservation proxy descriptor must not run");
    },
    getPrototypeOf() {
      proxyTrapCalls += 1;
      throw new Error("reservation proxy prototype must not run");
    },
    ownKeys() {
      proxyTrapCalls += 1;
      throw new Error("reservation proxy keys must not run");
    }
  });
  for (const candidate of [
    undefined,
    {},
    Object.create(null),
    structuredClone(reservation),
    proxyReservation
  ]) {
    assert.throws(
      () => releaseSyntheticFixture(candidate),
      /reservation|active|registered|stale|token/i
    );
  }
  assert.equal(proxyTrapCalls, 0);

  assert.equal(releaseSyntheticFixture(reservation), undefined);
  assert.equal(readCapabilityView(capability), originalView);
  assert.equal(validateRegisteredTestFixtureCapability(capability), capability);
  assert.throws(
    () => releaseSyntheticFixture(reservation),
    /reservation|active|consumed|stale|token/i
  );
  assert.equal(removeTestFixtureCapability(capability).status, "quarantined-retained");
});

test("synthetic release burns reservation and fixture authority on physical uncertainty", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readCapabilityView(capability);
  const reservation = reserveSyntheticFixture(capability);
  const markerPath = path.join(
    view.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  linkSync(markerPath, path.join(view.definition.leaf, "active-marker-hardlink-retained.json"));
  assert.throws(
    () => releaseSyntheticFixture(reservation),
    /linked|marker|physical|identity/i
  );
  for (const operation of [
    () => releaseSyntheticFixture(reservation),
    () => validateRegisteredTestFixtureCapability(capability),
    () => readCapabilityView(capability),
    () => removeTestFixtureCapability(capability)
  ]) {
    assert.throws(operation, /reservation|capability|active|terminal|stale|token/i);
  }
});

test("fixture removal hooks receive only the same non-authorizing view and failure is terminal", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const expectedView = readCapabilityView(capability);
  const hookContexts = [];
  assert.throws(
    () => removeTestFixtureCapability(capability, {
      hooks: {
        beforeLstat(context) {
          hookContexts.push(context);
        },
        beforeRename(context) {
          hookContexts.push(context);
          throw new Error("stop-after-removal-reservation");
        }
      }
    }),
    /stop-after-removal-reservation/
  );
  assert.ok(hookContexts.length > 1);
  for (const context of hookContexts) {
    assert.equal(context.view, expectedView);
    assert.equal(Object.prototype.hasOwnProperty.call(context, "capability"), false);
    assert.equal(Object.values(context).includes(capability), false);
  }
  for (const operation of [
    () => validateRegisteredTestFixtureCapability(capability),
    () => readCapabilityView(capability),
    () => removeTestFixtureCapability(capability)
  ]) {
    assert.throws(operation, /capability|registered|stale|terminal|token/i);
  }
});

test("fixture marker rejects old, future, and noninteger schema before accepting restored bytes", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readCapabilityView(capability);
  const markerPath = path.join(
    view.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  const originalBytes = readFileSync(markerPath);
  const originalMarker = JSON.parse(originalBytes.toString("utf8"));
  for (const invalidSchemaVersion of [1, 3, null]) {
    const invalidMarker = {
      ...originalMarker,
      schemaVersion: invalidSchemaVersion
    };
    writeFileSync(
      markerPath,
      `${canonicalizeClosedJson(invalidMarker)}\n`,
      { mode: 0o600 }
    );
    assert.throws(
      () => validateRegisteredTestFixtureCapability(capability),
      /schemaVersion|schema-2|data value 2/i
    );
  }
  writeFileSync(markerPath, originalBytes, { mode: 0o600 });
  assert.equal(validateRegisteredTestFixtureCapability(capability), capability);
  assert.equal(removeTestFixtureCapability(capability).status, "quarantined-retained");
});

test("fixture marker binds identical bytes to the original inode", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readCapabilityView(capability);
  const markerPath = path.join(
    view.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  const originalPath = path.join(view.definition.leaf, "original-marker-retained.json");
  const replacementPath = path.join(
    view.definition.leaf,
    "same-bytes-new-inode-retained.json"
  );
  const bytes = readFileSync(markerPath);
  renameSync(markerPath, originalPath);
  writeFileSync(markerPath, bytes, { flag: "wx", mode: 0o600 });
  assert.throws(
    () => validateRegisteredTestFixtureCapability(capability),
    /device-inode|identity|marker/i
  );
  renameSync(markerPath, replacementPath);
  renameSync(originalPath, markerPath);
  assert.equal(validateRegisteredTestFixtureCapability(capability), capability);
  assert.equal(removeTestFixtureCapability(capability).status, "quarantined-retained");
});

test("fixture marker rejects hard-link aliases and consumes a failed removal attempt", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readCapabilityView(capability);
  const markerPath = path.join(
    view.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  linkSync(markerPath, path.join(view.definition.leaf, "marker-hardlink-retained.json"));
  assert.throws(
    () => validateRegisteredTestFixtureCapability(capability),
    /linked|marker/i
  );
  assert.throws(
    () => removeTestFixtureCapability(capability),
    /linked|marker/i
  );
  assert.throws(
    () => readCapabilityView(capability),
    /capability|registered|stale|terminal|token/i
  );
});

test("fixture marker replay is rejected without consuming a concurrent nominal token", () => {
  const first = createTestFixtureCapability(process.cwd());
  const concurrent = createTestFixtureCapability(process.cwd());
  const firstView = readCapabilityView(first);
  const concurrentView = readCapabilityView(concurrent);
  const firstMarkerPath = path.join(
    firstView.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  const concurrentMarkerPath = path.join(
    concurrentView.definition.leaf,
    ".mais-test-fixture-capability.json"
  );
  const firstMarkerBytes = readFileSync(firstMarkerPath);
  const concurrentMarkerBytes = readFileSync(concurrentMarkerPath);

  writeFileSync(concurrentMarkerPath, firstMarkerBytes, { mode: 0o600 });
  assert.throws(
    () => validateRegisteredTestFixtureCapability(concurrent),
    /binding|definition|fingerprint|marker|match|replay/i
  );
  writeFileSync(concurrentMarkerPath, concurrentMarkerBytes, { mode: 0o600 });
  assert.equal(validateRegisteredTestFixtureCapability(concurrent), concurrent);

  assert.equal(removeTestFixtureCapability(first).status, "quarantined-retained");
  assert.equal(removeTestFixtureCapability(concurrent).status, "quarantined-retained");
});

test("fixture requests accept only exact registered nominal tokens", () => {
  const first = createTestFixtureCapability(process.cwd());
  const concurrent = protectedCanaryCapability();
  assert.doesNotThrow(() => validateFixtureRemovalRequestDefinition(first));
  for (const candidate of [
    undefined,
    {},
    Object.create(null),
    { ...first },
    readCapabilityView(first),
    concurrent.view
  ]) {
    assert.throws(
      () => validateFixtureRemovalRequestDefinition(candidate),
      /capability|registered|stale|forged|token/i
    );
  }
  const firstOutcome = removeTestFixtureCapability(first);
  assert.equal(firstOutcome.status, "quarantined-retained");
  assertCanarySurvivesQuarantine(concurrent);
});

test("fake filesystem transition rejects parent, leaf, marker, symlink, inode, and concurrent swaps", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const baseline = fakeFilesystemSnapshot(capability);
  assert.doesNotThrow(() => validateFixtureRemovalTransition(capability, baseline, baseline));
  for (const changed of [
    { ...baseline, parentIdentity: { ...baseline.parentIdentity, ino: "parent-swap" } },
    { ...baseline, leaf: readCapabilityView(capability).definition.parent },
    { ...baseline, leafKind: "symlink" },
    { ...baseline, markerKind: "symlink" },
    { ...baseline, markerSha256: "e".repeat(64) },
    { ...baseline, markerIdentity: { ...baseline.markerIdentity, ino: "marker-swap" } },
    { ...baseline, leafIdentity: { ...baseline.leafIdentity, ino: "concurrent-fixture" } }
  ]) {
    assert.throws(
      () => validateFixtureRemovalTransition(capability, baseline, changed),
      /authority|creator|marker|path|inode|transition/i
    );
  }
  const outcome = removeTestFixtureCapability(capability);
  assert.equal(outcome.status, "quarantined-retained");
});

test("real hooks retain quarantine when the capability leaf is swapped before rename", () => {
  const victim = createTestFixtureCapability(process.cwd());
  const protectedCanary = protectedCanaryCapability();
  assert.throws(() => removeTestFixtureCapability(victim, {
    hooks: {
      beforeRename: ({ leaf }) => {
        renameSync(leaf, `${leaf}-original-retained`);
        mkdirSync(leaf, { mode: 0o700 });
      }
    }
  }), /marker|identity|swapped|missing|authority/i);
  assertCanarySurvivesQuarantine(protectedCanary);
});

test("real hooks retain quarantine when its root is replaced after rename", () => {
  const victim = createTestFixtureCapability(process.cwd());
  const protectedCanary = protectedCanaryCapability();
  assert.throws(() => removeTestFixtureCapability(victim, {
    hooks: {
      beforeLstat: ({ absolutePath, phase, relativePath }) => {
        if (phase === "quarantine-verification" && relativePath === "") {
          renameSync(absolutePath, `${absolutePath}-original-retained`);
          mkdirSync(absolutePath, { mode: 0o700 });
        }
      }
    }
  }), /quarantine|identity|changed/i);
  assertCanarySurvivesQuarantine(protectedCanary);
});

test("real hooks retain quarantine on marker device-inode or content replacement", () => {
  const victim = createTestFixtureCapability(process.cwd());
  const victimView = readCapabilityView(victim);
  const replacement = path.join(victimView.definition.leaf, "replacement-marker.json");
  writeFileSync(replacement, "{}\n", { mode: 0o600 });
  const protectedCanary = protectedCanaryCapability();
  assert.throws(() => removeTestFixtureCapability(victim, {
    hooks: {
      beforeLstat: ({ absolutePath, phase }) => {
        if (phase === "quarantine-marker-verification") {
          const quarantine = path.dirname(absolutePath);
          renameSync(absolutePath, path.join(quarantine, "original-marker-retained.json"));
          renameSync(path.join(quarantine, "replacement-marker.json"), absolutePath);
        }
      }
    }
  }), /marker|inode|content|binding|match/i);
  assertCanarySurvivesQuarantine(protectedCanary);
});

test("real hooks retain quarantine on child directory identity swap", () => {
  const victim = createTestFixtureCapability(process.cwd());
  const victimView = readCapabilityView(victim);
  mkdirSync(path.join(victimView.definition.leaf, "child"), { mode: 0o700 });
  const protectedCanary = protectedCanaryCapability();
  assert.throws(() => removeTestFixtureCapability(victim, {
    hooks: {
      beforeLstat: ({ absolutePath, phase, relativePath }) => {
        if (phase === "quarantine-tree-verification" && relativePath === "child") {
          renameSync(absolutePath, `${absolutePath}-original-retained`);
          mkdirSync(absolutePath, { mode: 0o700 });
        }
      }
    }
  }), /tree|identity|changed|membership/i);
  assertCanarySurvivesQuarantine(protectedCanary);
});

test("real hooks retain quarantine when a child path becomes a symlink", () => {
  const victim = createTestFixtureCapability(process.cwd());
  const victimView = readCapabilityView(victim);
  const child = path.join(victimView.definition.leaf, "child.txt");
  writeFileSync(child, "original", { mode: 0o600 });
  const protectedCanary = protectedCanaryCapability();
  assert.throws(() => removeTestFixtureCapability(victim, {
    hooks: {
      beforeLstat: ({ absolutePath, phase, relativePath }) => {
        if (phase === "quarantine-tree-verification" && relativePath === "child.txt") {
          renameSync(absolutePath, `${absolutePath}-original-retained`);
          symlinkSync(protectedCanary.view.definition.leaf, absolutePath);
        }
      }
    }
  }), /tree|identity|changed|symlink/i);
  assertCanarySurvivesQuarantine(protectedCanary);
});

test("registered capabilities cannot cross-clean a concurrent fixture", () => {
  const first = createTestFixtureCapability(process.cwd());
  const concurrent = protectedCanaryCapability();
  assert.throws(
    () => removeTestFixtureCapability({ ...first }),
    /stale|forged|concurrent|capability/i
  );
  const firstOutcome = removeTestFixtureCapability(first);
  assert.equal(firstOutcome.status, "quarantined-retained");
  assertCanarySurvivesQuarantine(concurrent);
});
