import assert from "node:assert/strict";
import { spawn as spawnTestChild } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { types as utilTypes } from "node:util";

import * as liveHomeModule from "./live-home-protection.mjs";
import {
  canonicalizeClosedJson,
  hashCanonicalProof,
  hashEnvironmentText
} from "./required-browser-proof-primitives.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

const LIVE_HOME_EXPORTS = Object.freeze([
  "assertLiveHomeProof",
  "assertNoLiveHomeRetention",
  "assertPathOutsideLiveHome",
  "createLiveHomeProof",
  "liveHomeValueSha256"
]);
const FORBIDDEN_LIVE_HOME_EXPORTS = Object.freeze([
  "assertLiveHomeEnvironmentValue",
  "copyLiveHomeToChildEnvironment",
  "requiredBrowserEnvironmentValueSha256"
]);
const LIVE_HOME_SOURCE = readFileSync(
  new URL("./live-home-protection.mjs", import.meta.url),
  "utf8"
);
const OWNED_PROCESS_LAUNCHER_SOURCE = readFileSync(
  new URL("./required-browser-owned-process-launch.mjs", import.meta.url),
  "utf8"
);

function ownHomeEnvironment(value) {
  const environment = Object.create(null);
  Object.defineProperty(environment, "HOME", {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
  return environment;
}

function withProcessEnvironment(environment, operation) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, "env");
  assert.ok(originalDescriptor && Object.hasOwn(originalDescriptor, "value"));
  assert.equal(originalDescriptor.configurable, true);
  Object.defineProperty(process, "env", {
    ...originalDescriptor,
    value: environment
  });
  try {
    return operation();
  } finally {
    Object.defineProperty(process, "env", originalDescriptor);
  }
}

function withFixture(operation) {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readTestFixtureCapabilityView(capability);
  try {
    return operation({
      capability,
      leaf: view.definition.leaf,
      view
    });
  } finally {
    const outcome = removeTestFixtureCapability(capability);
    assert.equal(outcome.status, "quarantined-retained");
  }
}

async function withProcessEnvironmentAsync(environment, operation) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, "env");
  assert.ok(originalDescriptor && Object.hasOwn(originalDescriptor, "value"));
  assert.equal(originalDescriptor.configurable, true);
  Object.defineProperty(process, "env", {
    ...originalDescriptor,
    value: environment
  });
  try {
    return await operation();
  } finally {
    Object.defineProperty(process, "env", originalDescriptor);
  }
}

async function withFixtureAsync(operation) {
  const capability = createTestFixtureCapability(process.cwd());
  const view = readTestFixtureCapabilityView(capability);
  try {
    return await operation({
      capability,
      leaf: view.definition.leaf,
      view
    });
  } finally {
    const outcome = removeTestFixtureCapability(capability);
    assert.equal(outcome.status, "quarantined-retained");
  }
}

function createHomeDirectory(leaf, name = "live-home") {
  const home = path.join(leaf, name);
  mkdirSync(home, { mode: 0o700 });
  return home;
}

function pathEntryExists(exactPath) {
  try {
    lstatSync(exactPath);
    return true;
  } catch {
    return false;
  }
}

function matchesExactPhysicalDirectoryIdentity(exactPath, expectedEntry) {
  let observedEntry;
  try {
    observedEntry = lstatSync(exactPath, { bigint: true });
  } catch {
    return false;
  }
  if (!observedEntry.isDirectory() || observedEntry.isSymbolicLink()) {
    return false;
  }
  return ["dev", "ino", "mode", "uid", "gid", "nlink"].every(
    (key) => observedEntry[key] === expectedEntry[key]
  );
}

function restoreMovedWorktreeDirectory({
  activePath,
  backupPath,
  displacedPath,
  expectedEntry
}) {
  try {
    if (matchesExactPhysicalDirectoryIdentity(activePath, expectedEntry)) {
      return !pathEntryExists(backupPath);
    }
    if (pathEntryExists(activePath)) {
      if (pathEntryExists(displacedPath)) return false;
      renameSync(activePath, displacedPath);
    }
    if (!pathEntryExists(backupPath) || pathEntryExists(activePath)) {
      return false;
    }
    renameSync(backupPath, activePath);
  } catch {
    return false;
  }
  return matchesExactPhysicalDirectoryIdentity(activePath, expectedEntry)
    && !pathEntryExists(backupPath);
}

test("worktree directory restoration preserves recovery inputs until exact identity is restored", () => {
  withFixture(({ leaf }) => {
    const activePath = path.join(leaf, "active-directory");
    const backupPath = path.join(leaf, "backup-directory");
    const displacedPath = path.join(leaf, "displaced-entry");
    const blockerCleanup = path.join(leaf, "displaced-blocker");
    mkdirSync(activePath, { mode: 0o700 });
    writeFileSync(path.join(activePath, "original.txt"), "original\n", {
      flag: "wx",
      mode: 0o600
    });
    const expectedEntry = lstatSync(activePath, { bigint: true });
    renameSync(activePath, backupPath);
    symlinkSync("foreign-target", activePath);
    mkdirSync(displacedPath, { mode: 0o700 });

    assert.equal(
      restoreMovedWorktreeDirectory({
        activePath,
        backupPath,
        displacedPath,
        expectedEntry
      }),
      false
    );
    assert.equal(lstatSync(activePath).isSymbolicLink(), true);
    assert.equal(lstatSync(backupPath).isDirectory(), true);
    assert.equal(lstatSync(displacedPath).isDirectory(), true);

    renameSync(displacedPath, blockerCleanup);
    assert.equal(
      restoreMovedWorktreeDirectory({
        activePath,
        backupPath,
        displacedPath,
        expectedEntry
      }),
      true
    );
    const restoredEntry = lstatSync(activePath, { bigint: true });
    for (const key of ["dev", "ino", "mode", "uid", "gid", "nlink"]) {
      assert.equal(restoredEntry[key], expectedEntry[key]);
    }
    assert.equal(restoredEntry.isDirectory(), true);
    assert.equal(restoredEntry.isSymbolicLink(), false);
    assert.equal(pathEntryExists(backupPath), false);
    assert.equal(lstatSync(displacedPath).isSymbolicLink(), true);
  });
});

function requiredNoRetentionAssertion() {
  assert.equal(
    typeof liveHomeModule.assertNoLiveHomeRetention,
    "function",
    "zero-retention migration must export assertNoLiveHomeRetention"
  );
  return liveHomeModule.assertNoLiveHomeRetention;
}

test("LiveHomeProof exposes only the exact zero-retention public surface", () => {
  assert.deepEqual(Object.keys(liveHomeModule).sort(), LIVE_HOME_EXPORTS);
  for (const legacyExport of FORBIDDEN_LIVE_HOME_EXPORTS) {
    assert.equal(Object.hasOwn(liveHomeModule, legacyExport), false);
  }
});

test("LiveHomeProof is a frozen zero-key nominal token with exact identity", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const proof = liveHomeModule.createLiveHomeProof();
      assert.equal(utilTypes.isProxy(proof), false);
      assert.equal(Object.getPrototypeOf(proof), null);
      assert.equal(Object.isFrozen(proof), true);
      assert.deepEqual(Reflect.ownKeys(proof), []);
      assert.equal(liveHomeModule.assertLiveHomeProof(proof), undefined);

      const candidates = [
        Object.create(null),
        { ...proof },
        Object.assign(Object.create(null), proof),
        structuredClone(proof)
      ];
      for (const candidate of candidates) {
        assert.throws(() => liveHomeModule.assertLiveHomeProof(candidate));
      }

      let proxyTrapCalls = 0;
      const proxy = new Proxy(proof, {
        get() {
          proxyTrapCalls += 1;
          throw new Error("LiveHomeProof proxy get trap must not run");
        },
        getOwnPropertyDescriptor() {
          proxyTrapCalls += 1;
          throw new Error("LiveHomeProof proxy descriptor trap must not run");
        },
        getPrototypeOf() {
          proxyTrapCalls += 1;
          throw new Error("LiveHomeProof proxy prototype trap must not run");
        },
        ownKeys() {
          proxyTrapCalls += 1;
          throw new Error("LiveHomeProof proxy ownKeys trap must not run");
        }
      });
      assert.throws(() => liveHomeModule.assertLiveHomeProof(proxy));
      assert.equal(proxyTrapCalls, 0);

      let accessorReads = 0;
      const accessor = Object.create(null);
      Object.defineProperty(accessor, "proof", {
        enumerable: true,
        get() {
          accessorReads += 1;
          return proof;
        }
      });
      assert.throws(() => liveHomeModule.assertLiveHomeProof(accessor));
      assert.equal(accessorReads, 0);
    });
  });
});

test("LiveHomeProof binds the exact ENV2 HOME digest without exposing HOME", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    const digest = hashEnvironmentText("HOME", home);
    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const proof = liveHomeModule.createLiveHomeProof({
        expectedHomeValueSha256: digest
      });
      assert.equal(liveHomeModule.liveHomeValueSha256(proof), digest);
      assert.equal(
        liveHomeModule.assertLiveHomeProof(proof, {
          expectedHomeValueSha256: digest
        }),
        undefined
      );
      assert.throws(() => liveHomeModule.assertLiveHomeProof(proof, {
        expectedHomeValueSha256: "0".repeat(64)
      }));
      assert.equal(liveHomeModule.liveHomeValueSha256(proof), digest);
    });
  });
});

test("LiveHomeProof reads HOME only from an own data descriptor", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    let inheritedReads = 0;
    const inheritedPrototype = Object.create(null);
    Object.defineProperty(inheritedPrototype, "HOME", {
      enumerable: true,
      get() {
        inheritedReads += 1;
        return home;
      }
    });
    const inheritedEnvironment = Object.create(inheritedPrototype);

    let accessorReads = 0;
    const accessorEnvironment = Object.create(null);
    Object.defineProperty(accessorEnvironment, "HOME", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return home;
      }
    });

    const presentUndefinedEnvironment = ownHomeEnvironment(undefined);
    const missingEnvironment = Object.create(null);
    let environmentProxyTrapCalls = 0;
    const proxyEnvironment = new Proxy(ownHomeEnvironment(home), {
      get() {
        environmentProxyTrapCalls += 1;
        throw new Error("process.env proxy get trap must not run");
      },
      getOwnPropertyDescriptor() {
        environmentProxyTrapCalls += 1;
        throw new Error("process.env proxy descriptor trap must not run");
      },
      getPrototypeOf() {
        environmentProxyTrapCalls += 1;
        throw new Error("process.env proxy prototype trap must not run");
      },
      ownKeys() {
        environmentProxyTrapCalls += 1;
        throw new Error("process.env proxy ownKeys trap must not run");
      }
    });
    const invalidEnvironments = [
      missingEnvironment,
      inheritedEnvironment,
      accessorEnvironment,
      presentUndefinedEnvironment,
      proxyEnvironment
    ];

    for (const environment of invalidEnvironments) {
      assert.throws(() => withProcessEnvironment(
        environment,
        () => liveHomeModule.createLiveHomeProof()
      ));
    }
    assert.equal(inheritedReads, 0);
    assert.equal(accessorReads, 0);
    assert.equal(environmentProxyTrapCalls, 0);

    const proof = withProcessEnvironment(
      ownHomeEnvironment(home),
      () => liveHomeModule.createLiveHomeProof()
    );
    for (const environment of invalidEnvironments) {
      assert.throws(() => withProcessEnvironment(
        environment,
        () => liveHomeModule.assertLiveHomeProof(proof)
      ));
    }
    assert.equal(inheritedReads, 0);
    assert.equal(accessorReads, 0);
    assert.equal(environmentProxyTrapCalls, 0);
  });
});

test("LiveHomeProof binds HOME through one no-follow bigint descriptor observation", () => {
  assert.match(LIVE_HOME_SOURCE, /openSync/);
  assert.match(LIVE_HOME_SOURCE, /fstatSync/);
  assert.match(LIVE_HOME_SOURCE, /O_NOFOLLOW/);
  assert.match(LIVE_HOME_SOURCE, /bigint:\s*true/);
  assert.doesNotMatch(LIVE_HOME_SOURCE, /visitor\(exactValue\)/);
});

test("LiveHomeProof rejects malformed, NUL, non-path, missing, file, and symlink HOME values", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    const file = path.join(leaf, "not-a-home-directory.txt");
    const alias = path.join(leaf, "home-symlink");
    writeFileSync(file, "not a directory", { mode: 0o600 });
    symlinkSync(home, alias);

    for (const invalidHome of [
      7,
      "",
      "relative/home",
      `${home}\0suffix`,
      "\ud800",
      `${home}/.`,
      path.join(leaf, "missing-home"),
      file,
      alias
    ]) {
      assert.throws(() => withProcessEnvironment(
        ownHomeEnvironment(invalidHome),
        () => liveHomeModule.createLiveHomeProof()
      ));
    }
  });
});

test("LiveHomeProof rejects full-mode and directory-identity drift", () => {
  withFixture(({ leaf }) => {
    const modeHome = createHomeDirectory(leaf, "mode-home");
    const modeProof = withProcessEnvironment(
      ownHomeEnvironment(modeHome),
      () => liveHomeModule.createLiveHomeProof()
    );
    chmodSync(modeHome, 0o755);
    assert.throws(() => withProcessEnvironment(
      ownHomeEnvironment(modeHome),
      () => liveHomeModule.assertLiveHomeProof(modeProof)
    ));
    chmodSync(modeHome, 0o700);

    const identityHome = createHomeDirectory(leaf, "identity-home");
    const identityProof = withProcessEnvironment(
      ownHomeEnvironment(identityHome),
      () => liveHomeModule.createLiveHomeProof()
    );
    renameSync(identityHome, `${identityHome}-original-retained`);
    mkdirSync(identityHome, { mode: 0o700 });
    assert.throws(() => withProcessEnvironment(
      ownHomeEnvironment(identityHome),
      () => liveHomeModule.assertLiveHomeProof(identityProof)
    ));
  });
});

test("assertPathOutsideLiveHome is void and rejects lexical and physical HOME overlap", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    const child = path.join(home, "child");
    const outside = path.join(leaf, "outside");
    const alias = path.join(leaf, "alias");
    const outsideMissing = path.join(outside, "not-created");
    mkdirSync(child, { mode: 0o700 });
    mkdirSync(outside, { mode: 0o700 });
    symlinkSync(home, alias);
    const lexicalAlias = `${leaf}/intermediate/../${path.basename(home)}`;

    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const proof = liveHomeModule.createLiveHomeProof();
      assert.equal(
        liveHomeModule.assertPathOutsideLiveHome(proof, outside),
        undefined
      );
      assert.equal(
        liveHomeModule.assertPathOutsideLiveHome(proof, outsideMissing),
        undefined
      );
      for (const overlap of [
        home,
        child,
        path.join(home, "not-created"),
        leaf,
        lexicalAlias,
        alias,
        path.join(alias, "not-created")
      ]) {
        assert.throws(() => liveHomeModule.assertPathOutsideLiveHome(proof, overlap));
      }
    });
  });
});

test("assertNoLiveHomeRetention permits only digest-bearing closed safe data", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    const outside = path.join(leaf, "outside");
    const outsideAlias = path.join(leaf, "outside-alias");
    mkdirSync(outside, { mode: 0o700 });
    symlinkSync(outside, outsideAlias);
    const digest = hashEnvironmentText("HOME", home);
    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const assertNoRetention = requiredNoRetentionAssertion();
      const proof = liveHomeModule.createLiveHomeProof({
        expectedHomeValueSha256: digest
      });
      const environmentEvidence = {
        key: "HOME",
        source: "live-home",
        presence: "present",
        valueSha256: digest
      };
      assert.equal(assertNoRetention(proof, digest), undefined);
      assert.equal(assertNoRetention(proof, outside), undefined);
      assert.equal(assertNoRetention(proof, path.join(outside, "not-created")), undefined);
      assert.equal(assertNoRetention(proof, outsideAlias), undefined);
      assert.equal(assertNoRetention(proof, environmentEvidence), undefined);
      assert.equal(assertNoRetention(proof, {
        environmentEvidence,
        values: [null, true, false, 0, 1, "safe"]
      }), undefined);
    });
  });
});

test("assertNoLiveHomeRetention rejects proof authority, raw HOME, carriers, and aliases", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    const child = path.join(home, "child");
    const alias = path.join(leaf, "alias");
    mkdirSync(child, { mode: 0o700 });
    symlinkSync(home, alias);
    const lexicalAlias = `${leaf}/intermediate/../${path.basename(home)}`;
    const digest = hashEnvironmentText("HOME", home);

    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const assertNoRetention = requiredNoRetentionAssertion();
      const proof = liveHomeModule.createLiveHomeProof({
        expectedHomeValueSha256: digest
      });
      for (const retained of [
        proof,
        { proof },
        home,
        `prefix:${home}:suffix`,
        leaf,
        child,
        lexicalAlias,
        alias,
        { nested: [home] },
        { path: home },
        { [home]: "retained-in-key" }
      ]) {
        assert.throws(() => assertNoRetention(proof, retained));
      }
      for (const forbiddenKey of [
        "HOME",
        "rawHome",
        "homePath",
        "exactValue",
        "canonicalPath",
        "raw"
      ]) {
        const carrier = Object.create(null);
        Object.defineProperty(carrier, forbiddenKey, {
          enumerable: true,
          value: "redacted"
        });
        assert.throws(() => assertNoRetention(proof, carrier));
      }
    });
  });
});

test("assertNoLiveHomeRetention rejects adversarial and non-closed values without invoking them", () => {
  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf);
    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const assertNoRetention = requiredNoRetentionAssertion();
      const proof = liveHomeModule.createLiveHomeProof();

      let getterReads = 0;
      const accessor = Object.create(null);
      Object.defineProperty(accessor, "value", {
        enumerable: true,
        get() {
          getterReads += 1;
          return home;
        }
      });

      let proxyTrapCalls = 0;
      const proxy = new Proxy({}, {
        get() {
          proxyTrapCalls += 1;
          throw new Error("retention proxy get trap must not run");
        },
        getOwnPropertyDescriptor() {
          proxyTrapCalls += 1;
          throw new Error("retention proxy descriptor trap must not run");
        },
        getPrototypeOf() {
          proxyTrapCalls += 1;
          throw new Error("retention proxy prototype trap must not run");
        },
        ownKeys() {
          proxyTrapCalls += 1;
          throw new Error("retention proxy ownKeys trap must not run");
        }
      });

      let materializerCalls = 0;
      function materializer() {
        materializerCalls += 1;
        return home;
      }

      const cyclic = {};
      cyclic.self = cyclic;
      const sparse = [];
      sparse.length = 1;
      const arrayWithExtraKey = ["safe"];
      arrayWithExtraKey.extra = "not closed";
      const symbolKeyed = {};
      symbolKeyed[Symbol("hidden")] = "safe";

      for (const rejected of [
        undefined,
        1n,
        Symbol("value"),
        Number.NaN,
        Number.POSITIVE_INFINITY,
        materializer,
        { materializer },
        accessor,
        proxy,
        cyclic,
        sparse,
        arrayWithExtraKey,
        symbolKeyed,
        new Date(0),
        new Map(),
        { value: undefined }
      ]) {
        assert.throws(() => assertNoRetention(proof, rejected));
      }
      assert.equal(getterReads, 0);
      assert.equal(proxyTrapCalls, 0);
      assert.equal(materializerCalls, 0);
    });
  });
});

const OWNED_PROCESS_DESCRIPTOR_KEYS = Object.freeze([
  "argvTemplate",
  "browserCapable",
  "commandId",
  "cwdBinding",
  "environmentBinding",
  "executableBinding",
  "execution",
  "outputPolicy",
  "processTreeOwned",
  "readiness",
  "sanitizedOutputClass",
  "signalPolicy",
  "timeoutMs"
]);

const SANITIZED_OUTPUT_CLASSES = Object.freeze([
  "next-build-evidence",
  "next-service-evidence",
  "playwright-discovery-evidence",
  "playwright-final-evidence",
  "process-table-evidence",
  "pid-environment-evidence",
  "owner-token-table-evidence",
  "npm-cli-identity-evidence",
  "git-status-evidence",
  "git-head-evidence",
  "npm-cache-evidence",
  "npm-install-evidence",
  "npm-tree-evidence"
]);

function catalogNullRecord(entries) {
  const value = Object.create(null);
  for (const [key, fieldValue] of entries) {
    Object.defineProperty(value, key, {
      configurable: false,
      enumerable: true,
      value: fieldValue,
      writable: false
    });
  }
  return Object.freeze(value);
}

function catalogLiteral(value) {
  return catalogNullRecord([
    ["kind", "literal"],
    ["value", value]
  ]);
}

function catalogValidatedBinding(name) {
  return catalogNullRecord([
    ["kind", "validated-binding"],
    ["name", name],
    ["prefix", ""]
  ]);
}

function catalogArgv(...tokens) {
  return Object.freeze(tokens);
}

const CATALOG_EXECUTABLE_NODE = catalogNullRecord([
  ["kind", "launcher-node-runtime"]
]);
const CATALOG_EXECUTABLE_PS = catalogNullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "ps"],
  ["absolutePath", "/bin/ps"]
]);
const CATALOG_EXECUTABLE_WHICH = catalogNullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "which"],
  ["absolutePath", "/usr/bin/which"]
]);
const CATALOG_EXECUTABLE_GIT = catalogNullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "git"],
  ["absolutePath", "/usr/bin/git"]
]);

const CATALOG_CWD_RUNNER_REPOSITORY = catalogNullRecord([
  ["kind", "runner-repository-root"]
]);
const CATALOG_CWD_PROVISION_REPOSITORY = catalogNullRecord([
  ["kind", "provision-repository-root"]
]);
const CATALOG_CWD_INITIAL_INSTALL = catalogNullRecord([
  ["kind", "initial-provision-install-root"]
]);
const CATALOG_CWD_REQUALIFICATION_INSTALL = catalogNullRecord([
  ["kind", "requalification-provision-install-root"]
]);

function catalogBufferedParsePolicy(maxBytes) {
  return catalogNullRecord([
    ["kind", "buffered-parse"],
    ["stdoutMaxBytes", maxBytes],
    ["stderrMaxBytes", maxBytes],
    ["overflow", "reject"],
    ["retainedLog", "none"]
  ]);
}

function catalogBufferedSanitizedLogPolicy(maxBytes) {
  return catalogNullRecord([
    ["kind", "buffered-parse-and-sanitized-log"],
    ["stdoutMaxBytes", maxBytes],
    ["stderrMaxBytes", maxBytes],
    ["overflow", "reject"],
    ["retainedLogMaxBytes", 524288]
  ]);
}

const CATALOG_OUTPUT_A4 = catalogBufferedParsePolicy(4194304);
const CATALOG_OUTPUT_A16 = catalogBufferedParsePolicy(16777216);
const CATALOG_OUTPUT_A32 = catalogBufferedParsePolicy(33554432);
const CATALOG_OUTPUT_B16 = catalogBufferedSanitizedLogPolicy(16777216);
const CATALOG_OUTPUT_B64 = catalogBufferedSanitizedLogPolicy(67108864);
const CATALOG_OUTPUT_C64 = catalogNullRecord([
  ["kind", "streamed-digest-and-sanitized-log"],
  ["stdoutDigestMaxBytes", 67108864],
  ["stderrDigestMaxBytes", 67108864],
  ["overflow", "reject"],
  ["retainedLogMaxBytes", 524288]
]);

const CATALOG_READINESS_NONE = catalogNullRecord([
  ["kind", "none"]
]);
const CATALOG_READINESS_HTTP = catalogNullRecord([
  ["kind", "http-status"],
  ["overallTimeoutMs", 90000],
  ["pollIntervalMs", 250],
  ["requestTimeoutMs", 1500],
  ["redirectMode", "manual"],
  ["acceptedStatusUpperBoundExclusive", 500],
  ["urlBinding", "service-base-url"]
]);

function catalogSignalPolicy(kind, pollIntervalMs) {
  return catalogNullRecord([
    ["kind", kind],
    ["identityEstablishmentAttempts", 40],
    ["identityEstablishmentPollIntervalMs", 25],
    ["termPollAttempts", 20],
    ["killPollAttempts", 20],
    ["pollIntervalMs", pollIntervalMs],
    ["handleCloseTimeoutMs", 3000],
    ["revalidateBeforeTerm", true],
    ["revalidateBeforeKill", true]
  ]);
}

const CATALOG_SIGNAL_RUNNER_DIRECT = catalogSignalPolicy(
  "identity-revalidated-direct-child-term-kill",
  150
);
const CATALOG_SIGNAL_RUNNER_TREE = catalogSignalPolicy(
  "identity-revalidated-owned-tree-term-kill",
  150
);
const CATALOG_SIGNAL_PROVISION_DIRECT = catalogSignalPolicy(
  "identity-revalidated-direct-child-term-kill",
  250
);
const CATALOG_SIGNAL_PROVISION_TREE = catalogSignalPolicy(
  "identity-revalidated-owned-tree-term-kill",
  250
);
const CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT = catalogNullRecord([
  ["kind", "bootstrap-fixed-direct-child-explicit-bounded-abort"],
  ["signalApi", "child-process-handle-only"],
  ["spawnEventRequired", true],
  ["termGraceMs", 5000],
  ["killGraceMs", 5000],
  ["handleCloseTimeoutMs", 3000],
  ["revalidateBeforeTerm", false],
  ["revalidateBeforeKill", false]
]);

function catalogDescriptor({
  argvTemplate,
  browserCapable,
  commandId,
  cwdBinding,
  environmentBinding,
  executableBinding,
  execution,
  outputPolicy,
  processTreeOwned,
  readiness = CATALOG_READINESS_NONE,
  sanitizedOutputClass,
  signalPolicy,
  timeoutMs
}) {
  return catalogNullRecord([
    ["argvTemplate", argvTemplate],
    ["browserCapable", browserCapable],
    ["commandId", commandId],
    ["cwdBinding", cwdBinding],
    ["environmentBinding", environmentBinding],
    ["executableBinding", executableBinding],
    ["execution", execution],
    ["outputPolicy", outputPolicy],
    ["processTreeOwned", processTreeOwned],
    ["readiness", readiness],
    ["sanitizedOutputClass", sanitizedOutputClass],
    ["signalPolicy", signalPolicy],
    ["timeoutMs", timeoutMs]
  ]);
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const EXPECTED_OWNED_PROCESS_COMMAND_DESCRIPTORS = Object.freeze([
  catalogDescriptor({
    commandId: "owner.next.build",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("next-cli"),
      catalogLiteral("build")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "runner-main",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_C64,
    processTreeOwned: true,
    sanitizedOutputClass: "next-build-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_TREE,
    timeoutMs: 600000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.next.service",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("next-cli"),
      catalogLiteral("start"),
      catalogLiteral("--hostname"),
      catalogLiteral("127.0.0.1"),
      catalogLiteral("--port"),
      catalogValidatedBinding("service-port")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "runner-main",
    execution: "owned-service",
    outputPolicy: CATALOG_OUTPUT_C64,
    processTreeOwned: true,
    readiness: CATALOG_READINESS_HTTP,
    sanitizedOutputClass: "next-service-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_TREE,
    timeoutMs: "service-lifetime",
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.playwright.discovery",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("playwright-test-cli"),
      catalogLiteral("test"),
      catalogLiteral("--config"),
      catalogValidatedBinding("required-config-path"),
      catalogLiteral("--list"),
      catalogLiteral("--reporter=line")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "runner-main",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_B16,
    processTreeOwned: false,
    sanitizedOutputClass: "playwright-discovery-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_DIRECT,
    timeoutMs: 120000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.playwright.final",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("playwright-test-cli"),
      catalogLiteral("test"),
      catalogLiteral("--config"),
      catalogValidatedBinding("required-config-path")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "runner-main",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_C64,
    processTreeOwned: true,
    sanitizedOutputClass: "playwright-final-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_TREE,
    timeoutMs: 900000,
    browserCapable: true
  }),
  catalogDescriptor({
    commandId: "owner.audit.process-table",
    argvTemplate: catalogArgv(
      catalogLiteral("-axo"),
      catalogLiteral("pid=,ppid=,pgid=,lstart=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.audit.pid-environment",
    argvTemplate: catalogArgv(
      catalogLiteral("eww"),
      catalogLiteral("-p"),
      catalogValidatedBinding("owned-process-pid"),
      catalogLiteral("-o"),
      catalogLiteral("command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A4,
    processTreeOwned: false,
    sanitizedOutputClass: "pid-environment-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.audit.owner-token-table",
    argvTemplate: catalogArgv(
      catalogLiteral("eww"),
      catalogLiteral("-axo"),
      catalogLiteral("pid=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_RUNNER_REPOSITORY,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: CATALOG_SIGNAL_RUNNER_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.probe.which-npm",
    argvTemplate: catalogArgv(catalogLiteral("npm")),
    executableBinding: CATALOG_EXECUTABLE_WHICH,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "npm-cli-identity-evidence",
    signalPolicy: CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.audit.process-table-preflight",
    argvTemplate: catalogArgv(
      catalogLiteral("-axo"),
      catalogLiteral("pid=,ppid=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.audit.owner-token-table-preflight",
    argvTemplate: catalogArgv(
      catalogLiteral("eww"),
      catalogLiteral("-axo"),
      catalogLiteral("pid=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A32,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.source.git-status",
    argvTemplate: catalogArgv(
      catalogLiteral("status"),
      catalogLiteral("--short"),
      catalogLiteral("--untracked-files=all")
    ),
    executableBinding: CATALOG_EXECUTABLE_GIT,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-bootstrap-git",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "git-status-evidence",
    signalPolicy: CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.source.git-head",
    argvTemplate: catalogArgv(
      catalogLiteral("rev-parse"),
      catalogLiteral("HEAD")
    ),
    executableBinding: CATALOG_EXECUTABLE_GIT,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-bootstrap-git",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "git-head-evidence",
    signalPolicy: CATALOG_SIGNAL_BOOTSTRAP_FIXED_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.audit.process-table-owned",
    argvTemplate: catalogArgv(
      catalogLiteral("-axo"),
      catalogLiteral("pid=,ppid=,pgid=,lstart=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.audit.owner-token-table-owned",
    argvTemplate: catalogArgv(
      catalogLiteral("eww"),
      catalogLiteral("-axo"),
      catalogLiteral("pid=,command=")
    ),
    executableBinding: CATALOG_EXECUTABLE_PS,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: CATALOG_OUTPUT_A32,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_DIRECT,
    timeoutMs: 30000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.cache-verify",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("cache"),
      catalogLiteral("verify")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_INITIAL_INSTALL,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-cache-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 180000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.ci-prefer-offline",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("ci"),
      catalogLiteral("--prefer-offline"),
      catalogLiteral("--no-audit"),
      catalogLiteral("--no-fund"),
      catalogLiteral("--ignore-scripts")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_INITIAL_INSTALL,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-install-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 2700000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.ls-provision-staged",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("ls"),
      catalogLiteral("--all"),
      catalogLiteral("--json")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_INITIAL_INSTALL,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 300000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.ls-provision-active",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("ls"),
      catalogLiteral("--all"),
      catalogLiteral("--json")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 300000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.ls-requalification-staged",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("ls"),
      catalogLiteral("--all"),
      catalogLiteral("--json")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_REQUALIFICATION_INSTALL,
    environmentBinding: "provision-attempt-requalification",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 300000,
    browserCapable: false
  }),
  catalogDescriptor({
    commandId: "owner.dependency.npm.ls-requalification-active",
    argvTemplate: catalogArgv(
      catalogValidatedBinding("npm-cli"),
      catalogLiteral("ls"),
      catalogLiteral("--all"),
      catalogLiteral("--json")
    ),
    executableBinding: CATALOG_EXECUTABLE_NODE,
    cwdBinding: CATALOG_CWD_PROVISION_REPOSITORY,
    environmentBinding: "provision-attempt-requalification",
    execution: "finite-owned-process",
    outputPolicy: CATALOG_OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: CATALOG_SIGNAL_PROVISION_TREE,
    timeoutMs: 300000,
    browserCapable: false
  })
].sort((left, right) => codeUnitCompare(left.commandId, right.commandId)));

function assertDenseFrozenCatalogData(value, seen = new WeakSet()) {
  assert.notEqual(value, null);
  if (
    typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number"
  ) {
    if (typeof value === "number") assert.equal(Number.isFinite(value), true);
    return;
  }
  assert.equal(typeof value, "object");
  assert.equal(utilTypes.isProxy(value), false);
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);

  if (Array.isArray(value)) {
    assert.equal(Object.getPrototypeOf(value), Array.prototype);
    assert.deepEqual(
      Reflect.ownKeys(value),
      [...value.keys()].map(String).concat("length")
    );
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      assert.ok(descriptor && Object.hasOwn(descriptor, "value"));
      assert.equal(descriptor.enumerable, true);
      assert.equal(descriptor.configurable, false);
      assert.equal(descriptor.writable, false);
      assertDenseFrozenCatalogData(descriptor.value, seen);
    }
    return;
  }

  assert.equal(Object.getPrototypeOf(value), null);
  for (const key of Reflect.ownKeys(value)) {
    assert.equal(typeof key, "string");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.ok(descriptor && Object.hasOwn(descriptor, "value"));
    assert.equal(descriptor.enumerable, true);
    assert.equal(descriptor.configurable, false);
    assert.equal(descriptor.writable, false);
    assertDenseFrozenCatalogData(descriptor.value, seen);
  }
}

test("owned-process launcher exports the inert exact20 command descriptor catalog", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS"
    ),
    true
  );
  for (const forbiddenGenericExport of [
    "dispatchRequiredBrowserCommand",
    "launchRequiredBrowserCommand",
    "launchRequiredBrowserOwnedProcess",
    "runRequiredBrowserOwnedProcess"
  ]) {
    assert.equal(Object.hasOwn(launcherModule, forbiddenGenericExport), false);
  }

  const descriptors =
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS;
  assert.equal(Array.isArray(descriptors), true);
  assert.equal(descriptors.length, 20);
  assertDenseFrozenCatalogData(descriptors);
  assert.deepEqual(descriptors, EXPECTED_OWNED_PROCESS_COMMAND_DESCRIPTORS);

  const commandIds = descriptors.map((descriptor) => descriptor.commandId);
  assert.deepEqual(
    commandIds,
    [...commandIds].sort(codeUnitCompare)
  );
  assert.equal(new Set(commandIds).size, 20);
  for (const descriptor of descriptors) {
    assert.deepEqual(Reflect.ownKeys(descriptor), OWNED_PROCESS_DESCRIPTOR_KEYS);
    assert.equal(Object.hasOwn(descriptor, "dispatch"), false);
    assert.equal(Object.hasOwn(descriptor, "handler"), false);
    assert.equal(Object.hasOwn(descriptor, "options"), false);
    assert.equal(Object.hasOwn(descriptor, "env"), false);
    assert.equal(Object.hasOwn(descriptor, "pid"), false);
    assert.equal(Object.hasOwn(descriptor, "signal"), false);
    assert.equal(Object.hasOwn(descriptor, "violationCode"), false);
    assert.equal(Object.hasOwn(descriptor, "lifecycleCode"), false);
  }

  const outputClasses = [...new Set(
    descriptors.map((descriptor) => descriptor.sanitizedOutputClass)
  )].sort(codeUnitCompare);
  assert.deepEqual(
    outputClasses,
    [...SANITIZED_OUTPUT_CLASSES].sort(codeUnitCompare)
  );
  assert.deepEqual(
    [...new Set(descriptors.map((descriptor) => descriptor.execution))]
      .sort(codeUnitCompare),
    ["finite-direct-child", "finite-owned-process", "owned-service"]
      .sort(codeUnitCompare)
  );
  assert.deepEqual(
    [...new Set(descriptors.map((descriptor) => descriptor.signalPolicy.kind))]
      .sort(codeUnitCompare),
    [
      "bootstrap-fixed-direct-child-explicit-bounded-abort",
      "identity-revalidated-direct-child-term-kill",
      "identity-revalidated-owned-tree-term-kill"
    ].sort(codeUnitCompare)
  );
});

test("owned-process launcher exports the exact receipt fingerprint domains", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS"
    ),
    true
  );
  const domains =
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS;
  assertDenseFrozenCatalogData(domains);
  assert.deepEqual(Reflect.ownKeys(domains), [
    "environmentInventory",
    "launchReceipt",
    "auditReceipt",
    "outcomeReceipt",
    "lifecycleAuditReceipt"
  ]);
  assert.equal(
    domains.environmentInventory,
    "required-browser-owned-process-environment-inventory-v1"
  );
  assert.equal(
    domains.launchReceipt,
    "required-browser-owned-process-launch-receipt-v1"
  );
  assert.equal(
    domains.auditReceipt,
    "required-browser-owned-process-audit-v1"
  );
  assert.equal(
    domains.outcomeReceipt,
    "required-browser-owned-process-outcome-receipt-v1"
  );
  assert.equal(
    domains.lifecycleAuditReceipt,
    "required-browser-owned-lifecycle-audit-receipt-v1"
  );
});

function initialBootstrapRequest(label, staticBinding) {
  const fingerprint = (field) =>
    hashEnvironmentText("LABEL", `${label}:${field}`);
  return {
    schemaVersion: 1,
    mode: "initial",
    attemptNonce: fingerprint("attempt-nonce"),
    sourceSeedFingerprint: staticBinding.sourceSeedFingerprint,
    bootstrapScopeFingerprint:
      staticBinding.bootstrapScopeFingerprint,
    bootstrapCommandCatalogFingerprint:
      staticBinding.bootstrapCommandCatalogFingerprint,
    ownedProcessCatalogFingerprint:
      staticBinding.ownedProcessCatalogFingerprint
  };
}

function bootstrapRegistrationContext(request, staticBinding) {
  return {
    schemaVersion: 1,
    repositoryBindingFingerprint:
      staticBinding.repositoryBindingFingerprint,
    sourceSeedFingerprint: request.sourceSeedFingerprint
  };
}

function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(new URL(`../${relativePath}`, import.meta.url)))
    .digest("hex");
}

function recomputeFilesystemEntryIdentityFingerprint(exactPath, role, type) {
  const canonicalPath = realpathSync(exactPath);
  assert.equal(canonicalPath, exactPath);
  const entry = lstatSync(canonicalPath, { bigint: true });
  const pathFingerprint = hashCanonicalProof(
    "required-browser-provision-repository-path-v1",
    {
      schemaVersion: 1,
      role,
      canonicalPath
    }
  );
  const identity = {
    schemaVersion: 1,
    role,
    pathFingerprint,
    type,
    dev: entry.dev.toString(10),
    ino: entry.ino.toString(10),
    mode: entry.mode.toString(10),
    uid: entry.uid.toString(10),
    gid: entry.gid.toString(10)
  };
  if (type === "file") {
    identity.nlink = entry.nlink.toString(10);
    identity.rawByteSha256 = createHash("sha256")
      .update(readFileSync(canonicalPath))
      .digest("hex");
  }
  return hashCanonicalProof(
    "required-browser-provision-filesystem-entry-identity-v1",
    identity
  );
}

function recomputeStagedNodeModulesInventory(
  root,
  attemptId
) {
  const entries = [];
  const walk = (directory, depth) => {
    assert.equal(depth <= 64, true);
    const children = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => codeUnitCompare(left.name, right.name));
    for (const child of children) {
      const exactPath = path.join(directory, child.name);
      const relativePath = path.relative(root, exactPath);
      assert.equal(relativePath.length > 0, true);
      assert.equal(Buffer.byteLength(relativePath, "utf8") <= 4096, true);
      const entry = lstatSync(exactPath, { bigint: true });
      assert.equal(entry.uid, BigInt(process.getuid()));
      assert.equal(entry.dev, lstatSync(root, { bigint: true }).dev);
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        const identityRole =
          `staged-node-modules-directory:${relativePath}`;
        entries.push({
          relativePath,
          type: "directory",
          identityRole,
          filesystemIdentityFingerprint:
            recomputeFilesystemEntryIdentityFingerprint(
              exactPath,
              identityRole,
              "directory"
            ),
          mode: entry.mode.toString(10)
        });
        walk(exactPath, depth + 1);
        continue;
      }
      if (entry.isFile() && !entry.isSymbolicLink()) {
        assert.equal(entry.nlink, 1n);
        const byteLength = Number(entry.size);
        assert.equal(Number.isSafeInteger(byteLength), true);
        assert.equal(byteLength <= 268435456, true);
        const identityRole = `staged-node-modules-file:${relativePath}`;
        entries.push({
          relativePath,
          type: "regular-file",
          identityRole,
          filesystemIdentityFingerprint:
            recomputeFilesystemEntryIdentityFingerprint(
              exactPath,
              identityRole,
              "file"
            ),
          mode: entry.mode.toString(10),
          nlink: "1",
          byteLength,
          sha256: createHash("sha256")
            .update(readFileSync(exactPath))
            .digest("hex")
        });
        continue;
      }
      assert.equal(entry.isSymbolicLink(), true);
      assert.equal(entry.nlink, 1n);
      const linkTarget = readlinkSync(exactPath, "utf8");
      assert.equal(path.isAbsolute(linkTarget), false);
      assert.equal(linkTarget.includes("\\"), false);
      const resolvedRelativePath = path.relative(
        root,
        realpathSync(exactPath)
      );
      assert.equal(
        resolvedRelativePath !== ""
          && resolvedRelativePath !== ".."
          && !resolvedRelativePath.startsWith(`..${path.sep}`)
          && !path.isAbsolute(resolvedRelativePath),
        true
      );
      const identityRole =
        `staged-node-modules-symbolic-link:${relativePath}`;
      const pathFingerprint = hashCanonicalProof(
        "required-browser-provision-repository-path-v1",
        {
          schemaVersion: 1,
          role: identityRole,
          canonicalPath: exactPath
        }
      );
      const filesystemIdentityFingerprint = hashCanonicalProof(
        "required-browser-provision-filesystem-entry-identity-v1",
        {
          schemaVersion: 1,
          role: identityRole,
          pathFingerprint,
          type: "symbolic-link",
          dev: entry.dev.toString(10),
          ino: entry.ino.toString(10),
          mode: entry.mode.toString(10),
          uid: entry.uid.toString(10),
          gid: entry.gid.toString(10)
        }
      );
      entries.push({
        relativePath,
        type: "symbolic-link",
        identityRole,
        filesystemIdentityFingerprint,
        mode: entry.mode.toString(10),
        linkTarget,
        linkTargetUtf8ByteLength: Buffer.byteLength(linkTarget, "utf8"),
        resolvedRelativePath
      });
    }
  };
  walk(root, 0);
  entries.sort((left, right) =>
    codeUnitCompare(left.relativePath, right.relativePath)
      || codeUnitCompare(left.type, right.type)
  );
  const directories = entries.filter(({ type }) => type === "directory");
  const files = entries.filter(({ type }) => type === "regular-file");
  const links = entries.filter(({ type }) => type === "symbolic-link");
  const inventory = {
    schemaVersion: 1,
    attemptId,
    mode: "initial",
    commandId: "owner.dependency.npm.ci-prefer-offline",
    rootRelativePath: "install/node_modules",
    rootIdentityRole: "stagedNodeModules",
    rootIdentityFingerprint: recomputeFilesystemEntryIdentityFingerprint(
      root,
      "stagedNodeModules",
      "directory"
    ),
    maxEntryCount: 100000,
    maxDepth: 64,
    maxRelativePathUtf8Bytes: 4096,
    maxSymlinkTargetUtf8Bytes: 4096,
    maxRegularFileBytes: 268435456,
    maxTotalRegularFileBytes: 1073741824,
    directoryCount: directories.length,
    regularFileCount: files.length,
    symbolicLinkCount: links.length,
    totalRegularFileBytes: files.reduce(
      (total, entry) => total + entry.byteLength,
      0
    ),
    entries
  };
  assert.equal(entries.length <= inventory.maxEntryCount, true);
  assert.equal(
    inventory.totalRegularFileBytes <= inventory.maxTotalRegularFileBytes,
    true
  );
  return hashCanonicalProof(
    "required-browser-provision-staged-node-modules-inventory-v1",
    inventory
  );
}

test("owned-process launcher rebuilds a hash-only linked-worktree bootstrap binding", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "createRequiredBrowserProvisionBootstrapStaticBinding"
    ),
    true
  );
  const createStaticBinding =
    launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding;
  assert.equal(typeof createStaticBinding, "function");
  const first = createStaticBinding();
  const second = createStaticBinding();
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
  assertDenseFrozenCatalogData(first);
  assert.deepEqual(Reflect.ownKeys(first), [
    "schemaVersion",
    "repositoryBindingFingerprint",
    "sourceSeedFingerprint",
    "bootstrapScopeFingerprint",
    "bootstrapCommandCatalogFingerprint",
    "ownedProcessCatalogFingerprint"
  ]);
  assert.equal(first.schemaVersion, 1);
  for (const key of Reflect.ownKeys(first).slice(1)) {
    assert.match(first[key], /^[a-f0-9]{64}$/u);
  }
  assert.equal(
    first.bootstrapScopeFingerprint,
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
      .bootstrapScopeFingerprint
  );
  assert.equal(
    first.bootstrapCommandCatalogFingerprint,
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
      .bootstrapCommandCatalogFingerprint
  );
  assert.equal(
    first.ownedProcessCatalogFingerprint,
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
      .ownedProcessCatalogFingerprint
  );
  assert.equal(
    first.sourceSeedFingerprint,
    hashCanonicalProof("required-browser-provision-source-seed-v1", {
      schemaVersion: 1,
      packageJsonSha256: sha256File("package.json"),
      packageLockJsonSha256: sha256File("package-lock.json"),
      proofPrimitivesSourceFingerprint: sha256File(
        "scripts/required-browser-proof-primitives.mjs"
      ),
      liveHomeSourceFingerprint: sha256File(
        "scripts/live-home-protection.mjs"
      ),
      authoritySourceFingerprint: sha256File(
        "scripts/required-browser-provision-attempt-authority.mjs"
      ),
      launcherSourceFingerprint: sha256File(
        "scripts/required-browser-owned-process-launch.mjs"
      ),
      provisionerSourceFingerprint: sha256File(
        "scripts/provision-exact-browser-dependencies.mjs"
      )
    })
  );
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes("/Volumes/Starship/"), false);
  assert.equal(serialized.includes("gitdir:"), false);

  const launcherSourceBytes = readFileSync(
    new URL("./required-browser-owned-process-launch.mjs", import.meta.url)
  );
  const launcherSourceText = launcherSourceBytes.toString("utf8");
  assert.equal(launcherSourceBytes.includes(0), false);
  assert.equal(launcherSourceText.includes("readFileSync(descriptor)"), false);
  assert.match(launcherSourceText, /readBoundedDescriptor/u);
  assert.match(launcherSourceText, /maxBytes \+ 1/u);
  assert.equal(
    launcherSourceText.match(/buildLinkedWorktreeRepositoryBinding\(\)/gu)
      ?.length,
    3,
    "static binding must define one observer and invoke two full snapshots"
  );
  assert.equal(
    launcherSourceText.match(/buildSourceSeedFingerprint\(/gu)?.length,
    3,
    "static binding must define one source observer and invoke two full snapshots"
  );
});

test("owned-process launcher registers bootstrap authority context once and burns failures", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "registerRequiredBrowserProvisionBootstrapLaunchContext"
    ),
    true
  );
  const register =
    launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext;
  assert.equal(typeof register, "function");
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS"
    ),
    true
  );
  const catalogFingerprints =
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS;
  const staticBinding =
    launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
  assertDenseFrozenCatalogData(catalogFingerprints);
  assert.deepEqual(Reflect.ownKeys(catalogFingerprints), [
    "bootstrapScopeFingerprint",
    "bootstrapCommandCatalogFingerprint",
    "ownedProcessCatalogFingerprint"
  ]);
  for (const value of Object.values(catalogFingerprints)) {
    assert.match(value, /^[a-f0-9]{64}$/u);
  }
  const bootstrapCommandIds = [
    "owner.dependency.probe.which-npm",
    "owner.dependency.audit.process-table-preflight",
    "owner.dependency.audit.owner-token-table-preflight",
    "owner.dependency.source.git-status",
    "owner.dependency.source.git-head"
  ];
  const descriptorById = new Map(
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS.map(
      (descriptor) => [descriptor.commandId, descriptor]
    )
  );
  const bootstrapDescriptors = bootstrapCommandIds.map((commandId) => {
    const descriptor = descriptorById.get(commandId);
    assert.ok(descriptor);
    return {
      commandId,
      descriptorFingerprint: hashCanonicalProof(
        "required-browser-owned-process-command-descriptor-v1",
        descriptor
      )
    };
  });
  const ownedProcessDescriptors =
    launcherModule.REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS.map(
      (descriptor) => ({
        commandId: descriptor.commandId,
        descriptorFingerprint: hashCanonicalProof(
          "required-browser-owned-process-command-descriptor-v1",
          descriptor
        )
      })
    );
  assert.equal(
    catalogFingerprints.bootstrapScopeFingerprint,
    hashCanonicalProof("required-browser-provision-bootstrap-scope-v1", {
      schemaVersion: 1,
      commandIds: bootstrapCommandIds
    })
  );
  assert.equal(
    catalogFingerprints.bootstrapCommandCatalogFingerprint,
    hashCanonicalProof(
      "required-browser-provision-bootstrap-command-catalog-v1",
      { schemaVersion: 1, descriptors: bootstrapDescriptors }
    )
  );
  assert.equal(
    catalogFingerprints.ownedProcessCatalogFingerprint,
    hashCanonicalProof("required-browser-owned-process-catalog-v1", {
      schemaVersion: 1,
      descriptors: ownedProcessDescriptors
    })
  );

  withFixture(({ leaf }) => {
    const home = createHomeDirectory(leaf, "bootstrap-home");
    withProcessEnvironment(ownHomeEnvironment(home), () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();

      const validRequest = initialBootstrapRequest(
        "bootstrap-valid",
        staticBinding
      );
      const validAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          validRequest
        );
      const validContext = bootstrapRegistrationContext(
        validRequest,
        staticBinding
      );
      assert.equal(
        register(liveHomeProof, validAuthority, validContext),
        undefined
      );
      assert.throws(() =>
        register(liveHomeProof, validAuthority, validContext)
      );

      const mismatchRequest = initialBootstrapRequest(
        "bootstrap-mismatch",
        staticBinding
      );
      const mismatchAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          mismatchRequest
        );
      const mismatchContext = bootstrapRegistrationContext(
        mismatchRequest,
        staticBinding
      );
      mismatchContext.sourceSeedFingerprint = hashEnvironmentText(
        "LABEL",
        "bootstrap-mismatch:wrong-source-seed"
      );
      assert.throws(() =>
        register(liveHomeProof, mismatchAuthority, mismatchContext)
      );
      assert.throws(() =>
        register(
          liveHomeProof,
          mismatchAuthority,
          bootstrapRegistrationContext(
            mismatchRequest,
            staticBinding
          )
        )
      );

      const accessorRequest = initialBootstrapRequest(
        "bootstrap-accessor",
        staticBinding
      );
      const accessorAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          accessorRequest
        );
      let schemaReads = 0;
      const accessorContext = {};
      Object.defineProperty(accessorContext, "schemaVersion", {
        enumerable: true,
        get() {
          schemaReads += 1;
          return 1;
        }
      });
      assert.throws(() =>
        register(liveHomeProof, accessorAuthority, accessorContext)
      );
      assert.equal(schemaReads, 0);

      const proxyRequest = initialBootstrapRequest(
        "bootstrap-proxy",
        staticBinding
      );
      const proxyAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          proxyRequest
        );
      const proxyState = zeroTrapProxy(
        bootstrapRegistrationContext(proxyRequest, staticBinding),
        "bootstrap registration context proxy trap must not run"
      );
      assert.throws(() =>
        register(liveHomeProof, proxyAuthority, proxyState.proxy)
      );
      assert.equal(proxyState.trapCalls(), 0);

      const extraRequest = initialBootstrapRequest(
        "bootstrap-extra",
        staticBinding
      );
      const extraAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          extraRequest
        );
      const extraContext = bootstrapRegistrationContext(
        extraRequest,
        staticBinding
      );
      extraContext.home = home;
      assert.throws(() =>
        register(liveHomeProof, extraAuthority, extraContext)
      );
      assert.throws(() =>
        register(
          liveHomeProof,
          extraAuthority,
          bootstrapRegistrationContext(extraRequest, staticBinding)
        )
      );

      const catalogMismatchRequest = initialBootstrapRequest(
        "bootstrap-catalog-mismatch",
        staticBinding
      );
      catalogMismatchRequest.ownedProcessCatalogFingerprint =
        hashEnvironmentText("LABEL", "bootstrap-catalog-mismatch:wrong");
      const catalogMismatchAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          catalogMismatchRequest
        );
      assert.throws(() =>
        register(
          liveHomeProof,
          catalogMismatchAuthority,
          bootstrapRegistrationContext(
            catalogMismatchRequest,
            staticBinding
          )
        )
      );
    });
  });
});

const BOOTSTRAP_OPERATION_EXPORTS = Object.freeze([
  "runRequiredBrowserProvisionWhichNpm",
  "runRequiredBrowserProvisionProcessTablePreflight",
  "runRequiredBrowserProvisionOwnerTokenTablePreflight",
  "runRequiredBrowserProvisionGitStatus",
  "runRequiredBrowserProvisionGitHead"
]);

const BOOTSTRAP_RESULT_KEYS = Object.freeze({
  gitHead: Object.freeze([
    "schemaVersion",
    "commandId",
    "outcome",
    "headCommit",
    "headTextSha256"
  ]),
  gitStatus: Object.freeze([
    "schemaVersion",
    "commandId",
    "outcome",
    "statusEntryCount",
    "statusTextSha256",
    "packageJsonSha256",
    "packageLockJsonSha256"
  ]),
  ownerTokenTable: Object.freeze([
    "schemaVersion",
    "commandId",
    "outcome",
    "examinedProcessCount",
    "ownerTokenEntryCount",
    "violationCount"
  ]),
  processTable: Object.freeze([
    "schemaVersion",
    "commandId",
    "outcome",
    "examinedProcessCount",
    "violationCount"
  ]),
  whichNpm: Object.freeze([
    "schemaVersion",
    "commandId",
    "outcome",
    "npmCliPathFingerprint",
    "npmCliPhysicalIdentityFingerprint",
    "npmCliContentSha256",
    "npmVersion"
  ])
});

function assertBootstrapPassResult(result, keys, commandId) {
  assertDenseFrozenCatalogData(result);
  assert.deepEqual(Reflect.ownKeys(result), keys);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.commandId, commandId);
  assert.equal(result.outcome, "PASS");
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("/Volumes/"), false);
  assert.equal(serialized.includes("stdout"), false);
  assert.equal(serialized.includes("stderr"), false);
  assert.equal(serialized.includes("pid"), false);
  assert.equal(serialized.includes("HOME"), false);
}

test("owned-process launcher runs the unordered fixed-five bootstrap leaves once", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  for (const exportName of BOOTSTRAP_OPERATION_EXPORTS) {
    assert.equal(typeof launcherModule[exportName], "function", exportName);
  }
  for (const forbiddenTerminationTransport of [
    "spawnSync",
    "maxBuffer",
    "killSignal",
    "AbortSignal",
    "process.kill("
  ]) {
    assert.equal(
      OWNED_PROCESS_LAUNCHER_SOURCE.includes(forbiddenTerminationTransport),
      false,
      forbiddenTerminationTransport
    );
  }
  assert.equal(
    OWNED_PROCESS_LAUNCHER_SOURCE.includes(
      '"required-browser-canonical-executable-path-v1"'
    ),
    true
  );
  assert.equal(
    OWNED_PROCESS_LAUNCHER_SOURCE.includes(
      '"required-browser-owned-process-executable-path-v1"'
    ),
    false
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "bootstrap-operation-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const request = initialBootstrapRequest(
        "bootstrap-operation-valid",
        staticBinding
      );
      const authority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          request
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        authority,
        bootstrapRegistrationContext(request, staticBinding)
      );

      const gitHead = await launcherModule.runRequiredBrowserProvisionGitHead(
        liveHomeProof,
        authority
      );
      assertBootstrapPassResult(
        gitHead,
        BOOTSTRAP_RESULT_KEYS.gitHead,
        "owner.dependency.source.git-head"
      );
      assert.match(gitHead.headCommit, /^[a-f0-9]{40}$/u);
      assert.match(gitHead.headTextSha256, /^[a-f0-9]{64}$/u);

      const whichNpm =
        await launcherModule.runRequiredBrowserProvisionWhichNpm(
          liveHomeProof,
          authority
        );
      assertBootstrapPassResult(
        whichNpm,
        BOOTSTRAP_RESULT_KEYS.whichNpm,
        "owner.dependency.probe.which-npm"
      );
      assert.match(whichNpm.npmCliPathFingerprint, /^[a-f0-9]{64}$/u);
      assert.match(
        whichNpm.npmCliPhysicalIdentityFingerprint,
        /^[a-f0-9]{64}$/u
      );
      assert.match(whichNpm.npmCliContentSha256, /^[a-f0-9]{64}$/u);
      assert.match(whichNpm.npmVersion, /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u);

      const gitStatus =
        await launcherModule.runRequiredBrowserProvisionGitStatus(
          liveHomeProof,
          authority
        );
      assertBootstrapPassResult(
        gitStatus,
        BOOTSTRAP_RESULT_KEYS.gitStatus,
        "owner.dependency.source.git-status"
      );
      assert.ok(gitStatus.statusEntryCount >= 0);
      for (const key of [
        "statusTextSha256",
        "packageJsonSha256",
        "packageLockJsonSha256"
      ]) {
        assert.match(gitStatus[key], /^[a-f0-9]{64}$/u);
      }

      const ownerTokenTable =
        await launcherModule.runRequiredBrowserProvisionOwnerTokenTablePreflight(
          liveHomeProof,
          authority
        );
      assertBootstrapPassResult(
        ownerTokenTable,
        BOOTSTRAP_RESULT_KEYS.ownerTokenTable,
        "owner.dependency.audit.owner-token-table-preflight"
      );
      assert.equal(ownerTokenTable.ownerTokenEntryCount, 0);
      assert.equal(ownerTokenTable.violationCount, 0);
      assert.ok(ownerTokenTable.examinedProcessCount > 0);

      let processTable;
      let processTableFailure;
      try {
        processTable =
          await launcherModule.runRequiredBrowserProvisionProcessTablePreflight(
            liveHomeProof,
            authority
          );
      } catch (error) {
        processTableFailure = error;
      }
      if (processTableFailure === undefined) {
        assertBootstrapPassResult(
          processTable,
          BOOTSTRAP_RESULT_KEYS.processTable,
          "owner.dependency.audit.process-table-preflight"
        );
        assert.equal(processTable.violationCount, 0);
        assert.ok(processTable.examinedProcessCount > 0);
      } else {
        assert.equal(
          processTableFailure.message,
          "Required-browser bootstrap owned operation rejected."
        );
      }

      const replayRequest = initialBootstrapRequest(
        "bootstrap-operation-replay",
        staticBinding
      );
      const replayAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          replayRequest
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        replayAuthority,
        bootstrapRegistrationContext(replayRequest, staticBinding)
      );
      await launcherModule.runRequiredBrowserProvisionWhichNpm(
        liveHomeProof,
        replayAuthority
      );
      await assert.rejects(() =>
        launcherModule.runRequiredBrowserProvisionWhichNpm(
          liveHomeProof,
          replayAuthority
        )
      );
      await assert.rejects(() =>
        launcherModule.runRequiredBrowserProvisionGitHead(
          liveHomeProof,
          replayAuthority
        )
      );

      const concurrentRequest = initialBootstrapRequest(
        "bootstrap-operation-concurrent",
        staticBinding
      );
      const concurrentAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          concurrentRequest
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        concurrentAuthority,
        bootstrapRegistrationContext(concurrentRequest, staticBinding)
      );
      const firstConcurrentOperation =
        launcherModule.runRequiredBrowserProvisionGitHead(
          liveHomeProof,
          concurrentAuthority
        );
      const rejectedConcurrentOperation =
        launcherModule.runRequiredBrowserProvisionWhichNpm(
          liveHomeProof,
          concurrentAuthority
        );
      await assert.rejects(() => rejectedConcurrentOperation);
      await assert.rejects(() => firstConcurrentOperation);
      await assert.rejects(() =>
        launcherModule.runRequiredBrowserProvisionGitStatus(
          liveHomeProof,
          concurrentAuthority
        )
      );

      const unregisteredRequest = initialBootstrapRequest(
        "bootstrap-operation-unregistered",
        staticBinding
      );
      const unregisteredAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          unregisteredRequest
        );
      await assert.rejects(() =>
        launcherModule.runRequiredBrowserProvisionGitHead(
          liveHomeProof,
          unregisteredAuthority
        )
      );
    });
  });
});

test("owner-token bootstrap preflight rejects malformed token key presence", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "malformed-owner-token-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const malformedTokenChild = spawnTestChild(process.execPath, [
        "-e",
        "setTimeout(() => {}, 30000)",
        "MAIS_BROWSER_OWNER_TOKEN=x"
      ], {
        detached: false,
        env: {
          HOME: home,
          MAIS_BROWSER_OWNER_TOKEN: "x",
          PATH: "/usr/bin:/bin:/usr/sbin:/sbin"
        },
        shell: false,
        stdio: "ignore",
        windowsHide: true
      });
      const childClosed = once(malformedTokenChild, "close");
      await once(malformedTokenChild, "spawn");
      await new Promise((resolveWait) => setTimeout(resolveWait, 50));
      try {
        const liveHomeProof = liveHomeModule.createLiveHomeProof();
        const staticBinding =
          launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
        const request = initialBootstrapRequest(
          "bootstrap-malformed-owner-token",
          staticBinding
        );
        const authority =
          authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
            liveHomeProof,
            request
          );
        launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
          liveHomeProof,
          authority,
          bootstrapRegistrationContext(request, staticBinding)
        );
        await assert.rejects(
          () => launcherModule.runRequiredBrowserProvisionOwnerTokenTablePreflight(
            liveHomeProof,
            authority
          ),
          {
            message: "Required-browser bootstrap owned operation rejected."
          }
        );
      } finally {
        if (
          malformedTokenChild.exitCode === null
          && malformedTokenChild.signalCode === null
        ) {
          malformedTokenChild.kill("SIGTERM");
        }
        const closedAfterTerm = await Promise.race([
          childClosed.then(() => true, () => false),
          new Promise((resolveWait) => {
            const timer = setTimeout(() => resolveWait(false), 2000);
            timer.unref();
          })
        ]);
        if (!closedAfterTerm) {
          malformedTokenChild.kill("SIGKILL");
          await Promise.race([
            childClosed,
            new Promise((resolveWait) => {
              const timer = setTimeout(resolveWait, 2000);
              timer.unref();
            })
          ]);
        }
      }
    });
  });
});

async function consumeAllBootstrapPasses(
  launcherModule,
  liveHomeProof,
  bootstrapAuthority
) {
  const results = [];
  results.push(
    await launcherModule.runRequiredBrowserProvisionGitHead(
      liveHomeProof,
      bootstrapAuthority
    )
  );
  results.push(
    await launcherModule.runRequiredBrowserProvisionWhichNpm(
      liveHomeProof,
      bootstrapAuthority
    )
  );
  results.push(
    await launcherModule.runRequiredBrowserProvisionGitStatus(
      liveHomeProof,
      bootstrapAuthority
    )
  );
  results.push(
    await launcherModule.runRequiredBrowserProvisionProcessTablePreflight(
      liveHomeProof,
      bootstrapAuthority
    )
  );
  results.push(
    await launcherModule.runRequiredBrowserProvisionOwnerTokenTablePreflight(
      liveHomeProof,
      bootstrapAuthority
    )
  );
  return results;
}

async function finalizeInitialAttemptForTest(
  launcherModule,
  authorityModule,
  liveHomeProof,
  staticBinding,
  label
) {
  const request = initialBootstrapRequest(label, staticBinding);
  const bootstrapAuthority =
    authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      request
    );
  launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
    liveHomeProof,
    bootstrapAuthority,
    bootstrapRegistrationContext(request, staticBinding)
  );
  const bootstrapBinding =
    authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
      liveHomeProof,
      bootstrapAuthority
    );
  await consumeAllBootstrapPasses(
    launcherModule,
    liveHomeProof,
    bootstrapAuthority
  );
  const promotion = launcherModule.finalizeRequiredBrowserProvisionBootstrap(
    liveHomeProof,
    bootstrapAuthority
  );
  return {
    ...promotion,
    bootstrapAuthority,
    provisionRoot: path.join(
      process.cwd(),
      ".tmp",
      `dependency-provision-${bootstrapBinding.attemptId}`
    )
  };
}

async function prepareInitialStagedActivationForTest(
  launcherModule,
  authorityModule,
  liveHomeProof,
  staticBinding,
  label
) {
  const finalized = await finalizeInitialAttemptForTest(
    launcherModule,
    authorityModule,
    liveHomeProof,
    staticBinding,
    label
  );
  const attemptBinding =
    authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
      liveHomeProof,
      finalized.attemptAuthority
    );
  launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
    liveHomeProof,
    finalized.attemptAuthority,
    finalized.attemptLaunchContext
  );
  launcherModule.acquireRequiredBrowserProvisionActivationLock(
    liveHomeProof,
    finalized.attemptAuthority
  );
  launcherModule.prepareInitialProvisionLayout(
    liveHomeProof,
    finalized.attemptAuthority
  );
  const cacheResult =
    await launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
      liveHomeProof,
      finalized.attemptAuthority
    );
  const installResult =
    await launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
      liveHomeProof,
      finalized.attemptAuthority
    );
  const stagedListResult =
    await launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged(
      liveHomeProof,
      finalized.attemptAuthority
    );
  return {
    ...finalized,
    attemptBinding,
    cacheResult,
    installResult,
    stagedListResult
  };
}

test("owned-process launcher finalizes five PASS receipts into one nominal attempt context", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.finalizeRequiredBrowserProvisionBootstrap,
    "function"
  );
  assert.equal(
    typeof launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext,
    "function"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "bootstrap-finalizer-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();

      const incompleteRequest = initialBootstrapRequest(
        "bootstrap-finalizer-incomplete",
        staticBinding
      );
      const incompleteAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          incompleteRequest
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        incompleteAuthority,
        bootstrapRegistrationContext(incompleteRequest, staticBinding)
      );
      const incompleteBinding =
        authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
          liveHomeProof,
          incompleteAuthority
        );
      const incompleteRoot = path.join(
        process.cwd(),
        ".tmp",
        `dependency-provision-${incompleteBinding.attemptId}`
      );
      assert.equal(existsSync(incompleteRoot), false);
      assert.throws(() =>
        launcherModule.finalizeRequiredBrowserProvisionBootstrap(
          liveHomeProof,
          incompleteAuthority
        )
      );
      assert.equal(existsSync(incompleteRoot), false);
      await assert.rejects(() =>
        launcherModule.runRequiredBrowserProvisionGitHead(
          liveHomeProof,
          incompleteAuthority
        )
      );
      assert.throws(() =>
        launcherModule.finalizeRequiredBrowserProvisionBootstrap(
          liveHomeProof,
          incompleteAuthority
        )
      );

      const request = initialBootstrapRequest(
        "bootstrap-finalizer-valid",
        staticBinding
      );
      const bootstrapAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          request
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        bootstrapAuthority,
        bootstrapRegistrationContext(request, staticBinding)
      );
      const bootstrapBinding =
        authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
          liveHomeProof,
          bootstrapAuthority
        );
      const provisionRoot = path.join(
        process.cwd(),
        ".tmp",
        `dependency-provision-${bootstrapBinding.attemptId}`
      );
      const retainedRoot = path.join(leaf, "finalized-provision-root");
      assert.equal(existsSync(provisionRoot), false);

      try {
        const passResults = await consumeAllBootstrapPasses(
          launcherModule,
          liveHomeProof,
          bootstrapAuthority
        );
        assert.equal(passResults.length, 5);
        assert.equal(passResults.every((result) => result.outcome === "PASS"), true);

        const promotion =
          launcherModule.finalizeRequiredBrowserProvisionBootstrap(
            liveHomeProof,
            bootstrapAuthority
          );
        assertDenseFrozenCatalogData(promotion);
        assert.deepEqual(Reflect.ownKeys(promotion), [
          "attemptAuthority",
          "attemptLaunchContext"
        ]);
        for (const token of [
          promotion.attemptAuthority,
          promotion.attemptLaunchContext
        ]) {
          assert.equal(utilTypes.isProxy(token), false);
          assert.equal(Object.getPrototypeOf(token), null);
          assert.equal(Object.isFrozen(token), true);
          assert.deepEqual(Reflect.ownKeys(token), []);
        }
        assert.notEqual(
          promotion.attemptAuthority,
          promotion.attemptLaunchContext
        );
        assert.equal(JSON.stringify(promotion.attemptLaunchContext), "{}");

        const rootEntry = lstatSync(provisionRoot);
        assert.equal(rootEntry.isDirectory(), true);
        assert.equal(rootEntry.isSymbolicLink(), false);
        assert.equal(rootEntry.mode & 0o7777, 0o700);
        assert.equal(realpathSync(provisionRoot), provisionRoot);

        const attemptBinding =
          authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
            liveHomeProof,
            promotion.attemptAuthority
          );
        assert.equal(attemptBinding.attemptId, bootstrapBinding.attemptId);
        assert.equal(attemptBinding.mode, "initial");
        assert.equal(
          attemptBinding.repositoryBindingFingerprint,
          staticBinding.repositoryBindingFingerprint
        );
        for (const key of [
          "bootstrapCompletionFingerprint",
          "provisionRootBindingFingerprint",
          "finalCommandScopeFingerprint",
          "finalDescriptorSetFingerprint",
          "finalEnvironmentInventorySetFingerprint",
          "dependencyPathPolicyFingerprint",
          "evidencePolicyFingerprint"
        ]) {
          assert.match(attemptBinding[key], /^[a-f0-9]{64}$/u, key);
        }

        assert.equal(
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            promotion.attemptAuthority,
            promotion.attemptLaunchContext
          ),
          undefined
        );
        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            promotion.attemptAuthority,
            promotion.attemptLaunchContext
          )
        );
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionBootstrap(
            liveHomeProof,
            bootstrapAuthority
          )
        );
      } finally {
        if (existsSync(provisionRoot)) {
          renameSync(provisionRoot, retainedRoot);
        }
      }
    });
  });
});

test("bootstrap finalization burns a genuine authority before reading a mismatched proof", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "bootstrap-finalizer-proof-burn-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const mismatchedLiveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const request = initialBootstrapRequest(
        "bootstrap-finalizer-proof-burn",
        staticBinding
      );
      const bootstrapAuthority =
        authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
          liveHomeProof,
          request
        );
      launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
        liveHomeProof,
        bootstrapAuthority,
        bootstrapRegistrationContext(request, staticBinding)
      );
      const binding =
        authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
          liveHomeProof,
          bootstrapAuthority
        );
      const provisionRoot = path.join(
        process.cwd(),
        ".tmp",
        `dependency-provision-${binding.attemptId}`
      );
      await consumeAllBootstrapPasses(
        launcherModule,
        liveHomeProof,
        bootstrapAuthority
      );
      assert.throws(() =>
        launcherModule.finalizeRequiredBrowserProvisionBootstrap(
          mismatchedLiveHomeProof,
          bootstrapAuthority
        )
      );
      assert.equal(existsSync(provisionRoot), false);
      assert.throws(() =>
        launcherModule.finalizeRequiredBrowserProvisionBootstrap(
          liveHomeProof,
          bootstrapAuthority
        )
      );
    });
  });
});

test("attempt registration burns both genuine sides of wrong-proof and cross-pair calls", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "attempt-context-burn-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const mismatchedLiveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = [];
      try {
        for (const label of [
          "attempt-context-wrong-proof",
          "attempt-context-cross-left",
          "attempt-context-cross-right"
        ]) {
          finalized.push(await finalizeInitialAttemptForTest(
            launcherModule,
            authorityModule,
            liveHomeProof,
            staticBinding,
            label
          ));
        }
        const [wrongProof, crossLeft, crossRight] = finalized;

        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            mismatchedLiveHomeProof,
            wrongProof.attemptAuthority,
            wrongProof.attemptLaunchContext
          )
        );
        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            wrongProof.attemptAuthority,
            wrongProof.attemptLaunchContext
          )
        );

        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            crossLeft.attemptAuthority,
            crossRight.attemptLaunchContext
          )
        );
        for (const candidate of [crossLeft, crossRight]) {
          assert.throws(() =>
            launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
              liveHomeProof,
              candidate.attemptAuthority,
              candidate.attemptLaunchContext
            )
          );
        }
      } finally {
        for (const [index, candidate] of finalized.entries()) {
          if (existsSync(candidate.provisionRoot)) {
            renameSync(
              candidate.provisionRoot,
              path.join(leaf, `burned-provision-root-${index}`)
            );
          }
        }
      }
    });
  });
});

test("finalizer and attempt registration fail closed across post-mkdir ENV2 and inode drift", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "attempt-drift-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const cleanupRoots = [];
      try {
        const postMkdirRequest = initialBootstrapRequest(
          "post-mkdir-ambient-accessor",
          staticBinding
        );
        const postMkdirAuthority =
          authorityModule.issueInitialRequiredBrowserProvisionBootstrapAuthority(
            liveHomeProof,
            postMkdirRequest
          );
        launcherModule.registerRequiredBrowserProvisionBootstrapLaunchContext(
          liveHomeProof,
          postMkdirAuthority,
          bootstrapRegistrationContext(postMkdirRequest, staticBinding)
        );
        const postMkdirBinding =
          authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
            liveHomeProof,
            postMkdirAuthority
          );
        const postMkdirRoot = path.join(
          process.cwd(),
          ".tmp",
          `dependency-provision-${postMkdirBinding.attemptId}`
        );
        cleanupRoots.push(postMkdirRoot);
        await consumeAllBootstrapPasses(
          launcherModule,
          liveHomeProof,
          postMkdirAuthority
        );
        let ambientGetterReads = 0;
        Object.defineProperty(process.env, "LANG", {
          configurable: true,
          enumerable: true,
          get() {
            ambientGetterReads += 1;
            return "C";
          }
        });
        try {
          assert.throws(() =>
            launcherModule.finalizeRequiredBrowserProvisionBootstrap(
              liveHomeProof,
              postMkdirAuthority
            )
          );
        } finally {
          assert.equal(Reflect.deleteProperty(process.env, "LANG"), true);
        }
        assert.equal(ambientGetterReads, 0);
        assert.equal(lstatSync(postMkdirRoot).isDirectory(), true);
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionBootstrap(
            liveHomeProof,
            postMkdirAuthority
          )
        );

        const environmentDrift = await finalizeInitialAttemptForTest(
          launcherModule,
          authorityModule,
          liveHomeProof,
          staticBinding,
          "attempt-environment-drift"
        );
        cleanupRoots.push(environmentDrift.provisionRoot);
        Object.defineProperty(process.env, "LANG", {
          configurable: true,
          enumerable: true,
          value: "C.UTF-8",
          writable: true
        });
        try {
          assert.throws(() =>
            launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
              liveHomeProof,
              environmentDrift.attemptAuthority,
              environmentDrift.attemptLaunchContext
            )
          );
        } finally {
          assert.equal(Reflect.deleteProperty(process.env, "LANG"), true);
        }
        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            environmentDrift.attemptAuthority,
            environmentDrift.attemptLaunchContext
          )
        );

        const rootDrift = await finalizeInitialAttemptForTest(
          launcherModule,
          authorityModule,
          liveHomeProof,
          staticBinding,
          "attempt-root-inode-drift"
        );
        const originalRoot = path.join(leaf, "original-bound-provision-root");
        renameSync(rootDrift.provisionRoot, originalRoot);
        mkdirSync(rootDrift.provisionRoot, { mode: 0o700 });
        cleanupRoots.push(rootDrift.provisionRoot);
        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            rootDrift.attemptAuthority,
            rootDrift.attemptLaunchContext
          )
        );
        const replacementRoot = path.join(
          leaf,
          "replacement-unbound-provision-root"
        );
        renameSync(rootDrift.provisionRoot, replacementRoot);
        renameSync(originalRoot, rootDrift.provisionRoot);
        assert.throws(() =>
          launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
            liveHomeProof,
            rootDrift.attemptAuthority,
            rootDrift.attemptLaunchContext
          )
        );
      } finally {
        for (const [index, provisionRoot] of cleanupRoots.entries()) {
          if (existsSync(provisionRoot)) {
            renameSync(
              provisionRoot,
              path.join(leaf, `drift-provision-root-${index}`)
            );
          }
        }
      }
    });
  });
});

test("registered initial attempt acquires and retain-releases one canonical schema2 activation lock", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.acquireRequiredBrowserProvisionActivationLock,
    "function"
  );
  assert.equal(
    typeof launcherModule.finalizeRequiredBrowserProvisionActivationLock,
    "function"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "activation-lock-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "activation-lock-transaction"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const bootstrapBinding =
        authorityModule.readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.bootstrapAuthority
        );
      const attemptAuthorityBindingFingerprint = hashCanonicalProof(
        "required-browser-provision-attempt-authority-binding-v1",
        attemptBinding
      );
      const bootstrapAuthorityBindingFingerprint = hashCanonicalProof(
        "required-browser-provision-bootstrap-authority-binding-v1",
        bootstrapBinding
      );
      const ownerToken = hashCanonicalProof(
        "required-browser-provision-attempt-owner-token-v1",
        {
          schemaVersion: 1,
          attemptId: attemptBinding.attemptId,
          bootstrapAuthorityBindingFingerprint
        }
      );
      const ownerTokenFingerprint = hashEnvironmentText(
        "MAIS_DEPENDENCY_OWNER_TOKEN",
        ownerToken
      );
      const lockPayload = {
        schemaVersion: 2,
        attemptId: attemptBinding.attemptId,
        mode: "initial",
        attemptAuthorityBindingFingerprint,
        repositoryBindingFingerprint:
          attemptBinding.repositoryBindingFingerprint,
        provisionRootBindingFingerprint:
          attemptBinding.provisionRootBindingFingerprint,
        ownerTokenFingerprint,
        finalCommandScopeFingerprint:
          attemptBinding.finalCommandScopeFingerprint
      };
      const lockFingerprint = hashCanonicalProof(
        "dependency-activation-lock-v2",
        lockPayload
      );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const retainedCleanup = path.join(leaf, "retained-activation-lock.json");
      assert.equal(existsSync(activeLock), false);
      assert.equal(existsSync(retainedLock), false);

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        const acquire =
          launcherModule.acquireRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assertDenseFrozenCatalogData(acquire);
        assert.deepEqual(Reflect.ownKeys(acquire), [
          "schemaVersion",
          "attemptId",
          "attemptAuthorityBindingFingerprint",
          "lockFingerprint",
          "lockFileIdentityFingerprint",
          "parentIdentityFingerprint",
          "state",
          "signalAuthority"
        ]);
        assert.equal(acquire.schemaVersion, 1);
        assert.equal(acquire.attemptId, attemptBinding.attemptId);
        assert.equal(
          acquire.attemptAuthorityBindingFingerprint,
          attemptAuthorityBindingFingerprint
        );
        assert.equal(acquire.lockFingerprint, lockFingerprint);
        assert.match(acquire.lockFileIdentityFingerprint, /^[a-f0-9]{64}$/u);
        assert.match(acquire.parentIdentityFingerprint, /^[a-f0-9]{64}$/u);
        assert.equal(acquire.state, "lock-validated");
        assert.equal(acquire.signalAuthority, false);

        const activeEntry = lstatSync(activeLock);
        const activeBytes = readFileSync(activeLock, "utf8");
        assert.equal(activeEntry.isFile(), true);
        assert.equal(activeEntry.isSymbolicLink(), false);
        assert.equal(activeEntry.nlink, 1);
        assert.equal(activeEntry.mode & 0o7777, 0o600);
        assert.equal(realpathSync(activeLock), activeLock);
        assert.equal(activeBytes, `${canonicalizeClosedJson(lockPayload)}\n`);
        assert.throws(() =>
          launcherModule.acquireRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(readFileSync(activeLock, "utf8"), activeBytes);

        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assertDenseFrozenCatalogData(release);
        assert.deepEqual(Reflect.ownKeys(release), [
          "schemaVersion",
          "attemptId",
          "attemptAuthorityBindingFingerprint",
          "lockFingerprint",
          "activeFileIdentityFingerprint",
          "retainedFileIdentityFingerprint",
          "retainedRelativePathFingerprint",
          "parentIdentityFingerprint",
          "activePathAbsent",
          "state",
          "signalAuthority"
        ]);
        assert.equal(release.schemaVersion, 1);
        assert.equal(release.attemptId, attemptBinding.attemptId);
        assert.equal(
          release.attemptAuthorityBindingFingerprint,
          attemptAuthorityBindingFingerprint
        );
        assert.equal(release.lockFingerprint, lockFingerprint);
        assert.equal(
          release.activeFileIdentityFingerprint,
          acquire.lockFileIdentityFingerprint
        );
        assert.equal(
          release.parentIdentityFingerprint,
          acquire.parentIdentityFingerprint
        );
        assert.match(release.retainedFileIdentityFingerprint, /^[a-f0-9]{64}$/u);
        assert.match(release.retainedRelativePathFingerprint, /^[a-f0-9]{64}$/u);
        assert.equal(release.activePathAbsent, true);
        assert.equal(release.state, "retained-released");
        assert.equal(release.signalAuthority, false);
        assert.equal(existsSync(activeLock), false);
        const retainedEntry = lstatSync(retainedLock);
        assert.equal(retainedEntry.dev, activeEntry.dev);
        assert.equal(retainedEntry.ino, activeEntry.ino);
        assert.equal(retainedEntry.nlink, 1);
        assert.equal(retainedEntry.mode & 0o7777, 0o600);
        assert.equal(readFileSync(retainedLock, "utf8"), activeBytes);
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, retainedCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "activation-lock-provision-root")
          );
        }
      }
    });
  });
});

test("activation-lock release never overwrites a retained target and burns the attempt", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "activation-lock-conflict-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "activation-lock-retained-conflict"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "conflict-active-lock.json");
      const retainedCleanup = path.join(leaf, "conflict-retained-lock.json");
      const sentinelBytes = "preexisting retained activation lock\n";

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        const activeBytes = readFileSync(activeLock, "utf8");
        writeFileSync(retainedLock, sentinelBytes, {
          flag: "wx",
          mode: 0o600
        });

        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(readFileSync(activeLock, "utf8"), activeBytes);
        assert.equal(readFileSync(retainedLock, "utf8"), sentinelBytes);

        renameSync(retainedLock, retainedCleanup);
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(readFileSync(activeLock, "utf8"), activeBytes);

        const launcherSource = readFileSync(
          new URL("./required-browser-owned-process-launch.mjs", import.meta.url),
          "utf8"
        );
        const releaseStart = launcherSource.indexOf(
          "export function finalizeRequiredBrowserProvisionActivationLock"
        );
        const releaseEnd = launcherSource.indexOf(
          "export const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS",
          releaseStart
        );
        assert.ok(releaseStart >= 0 && releaseEnd > releaseStart);
        const releaseSource = launcherSource.slice(releaseStart, releaseEnd);
        assert.match(releaseSource, /\blinkSync\(/u);
        assert.match(releaseSource, /\bunlinkSync\(/u);
        assert.doesNotMatch(releaseSource, /\brenameSync\(/u);
        const processGate = releaseSource.indexOf(
          "state.operationProcessTerminality"
        );
        const logGate = releaseSource.indexOf(
          "state.operationLogDisposition"
        );
        const auxiliaryGate = releaseSource.indexOf(
          "state.auxiliaryProcessUncertainty"
        );
        const firstLink = releaseSource.indexOf("linkSync(");
        assert.ok(processGate >= 0 && processGate < firstLink);
        assert.ok(logGate >= 0 && logGate < firstLink);
        assert.ok(auxiliaryGate >= 0 && auxiliaryGate < firstLink);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "activation-lock-conflict-provision-root")
          );
        }
      }
    });
  });
});

test("registered locked initial attempt prepares one canonical fresh layout without seed authority", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(typeof launcherModule.prepareInitialProvisionLayout, "function");
  assert.equal(
    Object.hasOwn(launcherModule, "materializeInitialCacheSeed"),
    false
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-fresh-layout-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-fresh-layout"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "fresh-layout-active-lock.json");
      const retainedCleanup = path.join(leaf, "fresh-layout-retained-lock.json");
      const root = finalized.provisionRoot;
      const rootDirectories = [
        "config",
        "data",
        "evidence",
        "install",
        "logs",
        "node-compile-cache",
        "npm-cache",
        "npm-prefix",
        "playwright-browsers",
        "quarantine",
        "rollback",
        "state",
        "temp",
        "turbo-cache"
      ];
      const emptyDirectories = [
        "data",
        "logs",
        "node-compile-cache",
        "npm-prefix",
        "playwright-browsers",
        "state",
        "temp",
        "turbo-cache"
      ];

      const readCanonicalArtifact = (relativePath) => {
        const exactPath = path.join(root, relativePath);
        const entry = lstatSync(exactPath);
        const text = readFileSync(exactPath, "utf8");
        const value = JSON.parse(text);
        assert.equal(entry.isFile(), true);
        assert.equal(entry.isSymbolicLink(), false);
        assert.equal(entry.nlink, 1);
        assert.equal(entry.mode & 0o7777, 0o600);
        assert.equal(text, canonicalizeClosedJson(value));
        assert.equal(text.endsWith("\n"), false);
        return { exactPath, text, value };
      };

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        const lockReceipt =
          launcherModule.acquireRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        const receipt = launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        assertDenseFrozenCatalogData(receipt);
        assert.deepEqual(Reflect.ownKeys(receipt), [
          "schemaVersion",
          "attemptId",
          "mode",
          "cacheMode",
          "attemptAuthorityBindingFingerprint",
          "layoutBindingFingerprint",
          "ownerMarkerFingerprint",
          "cacheMarkerFingerprint",
          "quarantineMarkerFingerprint",
          "rollbackMarkerFingerprint",
          "sourceInstallInputManifestSha256",
          "sourceInstallInputManifestIdentityFingerprint",
          "state",
          "signalAuthority"
        ]);
        assert.equal(receipt.schemaVersion, 1);
        assert.equal(receipt.attemptId, attemptBinding.attemptId);
        assert.equal(receipt.mode, "initial");
        assert.equal(receipt.cacheMode, "fresh");
        assert.equal(receipt.state, "fresh-layout-prepared");
        assert.equal(receipt.signalAuthority, false);
        assert.equal(
          receipt.attemptAuthorityBindingFingerprint,
          hashCanonicalProof(
            "required-browser-provision-attempt-authority-binding-v1",
            attemptBinding
          )
        );
        for (const key of [
          "attemptAuthorityBindingFingerprint",
          "layoutBindingFingerprint",
          "ownerMarkerFingerprint",
          "cacheMarkerFingerprint",
          "quarantineMarkerFingerprint",
          "rollbackMarkerFingerprint",
          "sourceInstallInputManifestSha256",
          "sourceInstallInputManifestIdentityFingerprint"
        ]) {
          assert.match(receipt[key], /^[a-f0-9]{64}$/u);
        }

        const rootEntries = readdirSync(root).sort();
        assert.deepEqual(
          rootEntries,
          [".mais-dependency-provision.json", ...rootDirectories].sort()
        );
        for (const directory of rootDirectories) {
          const entry = lstatSync(path.join(root, directory));
          assert.equal(entry.isDirectory(), true);
          assert.equal(entry.isSymbolicLink(), false);
          assert.equal(entry.mode & 0o7777, 0o700);
        }
        for (const directory of emptyDirectories) {
          assert.deepEqual(
            readdirSync(path.join(root, directory)),
            []
          );
        }
        assert.deepEqual(
          readdirSync(path.join(root, "config")).sort(),
          ["npm-globalrc", "npm-userrc"]
        );
        assert.deepEqual(
          readdirSync(path.join(root, "evidence")).sort(),
          [
            "source-install-input-manifest.json",
            "source-package-lock.json",
            "source-package.json"
          ]
        );
        assert.deepEqual(
          readdirSync(path.join(root, "install")).sort(),
          ["package-lock.json", "package.json"]
        );
        assert.deepEqual(
          readdirSync(path.join(root, "npm-cache")),
          [".mais-dependency-cache.json"]
        );
        assert.deepEqual(
          readdirSync(path.join(root, "quarantine")),
          [".quarantine-marker.json"]
        );
        assert.deepEqual(
          readdirSync(path.join(root, "rollback")),
          [".rollback-marker.json"]
        );

        const ownerMarker = readCanonicalArtifact(
          ".mais-dependency-provision.json"
        );
        const cacheMarker = readCanonicalArtifact(
          "npm-cache/.mais-dependency-cache.json"
        );
        const quarantineMarker = readCanonicalArtifact(
          "quarantine/.quarantine-marker.json"
        );
        const rollbackMarker = readCanonicalArtifact(
          "rollback/.rollback-marker.json"
        );
        assert.deepEqual(Reflect.ownKeys(ownerMarker.value), [
          "activationLockFingerprint",
          "attemptAuthorityBindingFingerprint",
          "attemptId",
          "dependencyPathPolicyFingerprint",
          "evidencePolicyFingerprint",
          "mode",
          "provisionRootBindingFingerprint",
          "repositoryBindingFingerprint",
          "schemaVersion",
          "sourceSeedFingerprint",
          "status"
        ]);
        assert.equal(ownerMarker.value.schemaVersion, 2);
        assert.equal(ownerMarker.value.mode, "initial");
        assert.equal(ownerMarker.value.status, "provisioning");
        assert.equal(ownerMarker.value.attemptId, attemptBinding.attemptId);
        assert.equal(
          ownerMarker.value.attemptAuthorityBindingFingerprint,
          receipt.attemptAuthorityBindingFingerprint
        );
        assert.equal(
          ownerMarker.value.repositoryBindingFingerprint,
          attemptBinding.repositoryBindingFingerprint
        );
        assert.equal(
          ownerMarker.value.provisionRootBindingFingerprint,
          attemptBinding.provisionRootBindingFingerprint
        );
        assert.equal(
          ownerMarker.value.sourceSeedFingerprint,
          attemptBinding.sourceSeedFingerprint
        );
        assert.equal(
          ownerMarker.value.dependencyPathPolicyFingerprint,
          attemptBinding.dependencyPathPolicyFingerprint
        );
        assert.equal(
          ownerMarker.value.evidencePolicyFingerprint,
          attemptBinding.evidencePolicyFingerprint
        );
        assert.equal(
          ownerMarker.value.activationLockFingerprint,
          lockReceipt.lockFingerprint
        );
        assert.equal(
          hashCanonicalProof(
            "dependency-provision-owner-marker-v2",
            ownerMarker.value
          ),
          receipt.ownerMarkerFingerprint
        );
        assert.equal(cacheMarker.value.status, "fresh");
        assert.equal(quarantineMarker.value.status, "empty-before-npm");
        assert.equal(rollbackMarker.value.status, "empty-before-npm");
        assert.deepEqual(Reflect.ownKeys(cacheMarker.value), [
          "attemptId",
          "directoryIdentityFingerprint",
          "mode",
          "ownerMarkerFingerprint",
          "provisionRootBindingFingerprint",
          "schemaVersion",
          "sourceSeedFingerprint",
          "status"
        ]);
        for (const marker of [quarantineMarker.value, rollbackMarker.value]) {
          assert.deepEqual(Reflect.ownKeys(marker), [
            "attemptId",
            "directoryIdentityFingerprint",
            "mode",
            "ownerMarkerFingerprint",
            "provisionRootBindingFingerprint",
            "schemaVersion",
            "status"
          ]);
        }
        for (const marker of [
          cacheMarker.value,
          quarantineMarker.value,
          rollbackMarker.value
        ]) {
          assert.equal(marker.schemaVersion, 2);
          assert.equal(marker.attemptId, attemptBinding.attemptId);
          assert.equal(marker.mode, "initial");
          assert.equal(
            marker.ownerMarkerFingerprint,
            receipt.ownerMarkerFingerprint
          );
          assert.equal(
            marker.provisionRootBindingFingerprint,
            attemptBinding.provisionRootBindingFingerprint
          );
        }
        assert.equal(
          cacheMarker.value.sourceSeedFingerprint,
          attemptBinding.sourceSeedFingerprint
        );
        assert.equal(
          Object.hasOwn(cacheMarker.value, "sourceInstallInputManifestSha256"),
          false
        );
        assert.equal(
          hashCanonicalProof("dependency-cache-marker-v2", cacheMarker.value),
          receipt.cacheMarkerFingerprint
        );
        assert.equal(
          cacheMarker.value.directoryIdentityFingerprint,
          recomputeFilesystemEntryIdentityFingerprint(
            path.join(root, "npm-cache"),
            "npmCache",
            "directory"
          )
        );
        assert.equal(
          hashCanonicalProof(
            "dependency-quarantine-marker-v2",
            quarantineMarker.value
          ),
          receipt.quarantineMarkerFingerprint
        );
        assert.equal(
          quarantineMarker.value.directoryIdentityFingerprint,
          recomputeFilesystemEntryIdentityFingerprint(
            path.join(root, "quarantine"),
            "quarantine",
            "directory"
          )
        );
        assert.equal(
          hashCanonicalProof(
            "dependency-rollback-marker-v2",
            rollbackMarker.value
          ),
          receipt.rollbackMarkerFingerprint
        );
        assert.equal(
          rollbackMarker.value.directoryIdentityFingerprint,
          recomputeFilesystemEntryIdentityFingerprint(
            path.join(root, "rollback"),
            "rollback",
            "directory"
          )
        );

        assert.deepEqual(
          readFileSync(path.join(root, "evidence", "source-package.json")),
          readFileSync(path.join(process.cwd(), "package.json"))
        );
        assert.deepEqual(
          readFileSync(path.join(root, "evidence", "source-package-lock.json")),
          readFileSync(path.join(process.cwd(), "package-lock.json"))
        );
        assert.deepEqual(
          readFileSync(path.join(root, "install", "package-lock.json")),
          readFileSync(path.join(process.cwd(), "package-lock.json"))
        );
        const sourcePackage = JSON.parse(
          readFileSync(path.join(process.cwd(), "package.json"), "utf8")
        );
        const installPackage = readCanonicalArtifact("install/package.json");
        assert.deepEqual(installPackage.value.scripts, {});
        assert.equal(Object.hasOwn(installPackage.value, "workspaces"), false);
        for (const key of [
          "name",
          "version",
          "private",
          "type",
          "packageManager",
          "engines",
          "os",
          "cpu",
          "dependencies",
          "devDependencies",
          "optionalDependencies",
          "peerDependencies",
          "peerDependenciesMeta",
          "bundledDependencies",
          "bundleDependencies",
          "overrides",
          "resolutions"
        ]) {
          if (Object.hasOwn(sourcePackage, key)) {
            assert.deepEqual(installPackage.value[key], sourcePackage[key]);
          } else {
            assert.equal(Object.hasOwn(installPackage.value, key), false);
          }
        }
        assert.equal(
          readFileSync(path.join(root, "config", "npm-globalrc"), "utf8"),
          "audit=false\nfund=false\nupdate-notifier=false\n"
        );
        assert.equal(
          readFileSync(path.join(root, "config", "npm-userrc"), "utf8"),
          "audit=false\nfund=false\nupdate-notifier=false\n"
        );

        const inputManifest = readCanonicalArtifact(
          "evidence/source-install-input-manifest.json"
        );
        assert.deepEqual(Reflect.ownKeys(inputManifest.value), [
          "absences",
          "activationLockFingerprint",
          "artifactKind",
          "attemptAuthorityBindingFingerprint",
          "attemptId",
          "cacheMarkerFingerprint",
          "emptyDirectories",
          "files",
          "mode",
          "ownerMarkerFingerprint",
          "provisionRootBindingFingerprint",
          "quarantineMarkerFingerprint",
          "repositoryBindingFingerprint",
          "rollbackMarkerFingerprint",
          "schemaVersion",
          "sourceSeedFingerprint",
          "status"
        ]);
        assert.equal(inputManifest.value.schemaVersion, 2);
        assert.equal(
          inputManifest.value.artifactKind,
          "dependency-source-install-input-manifest-v2"
        );
        assert.equal(inputManifest.value.mode, "initial");
        assert.equal(inputManifest.value.status, "prepared-before-npm");
        assert.equal(inputManifest.value.attemptId, attemptBinding.attemptId);
        assert.equal(
          inputManifest.value.attemptAuthorityBindingFingerprint,
          receipt.attemptAuthorityBindingFingerprint
        );
        assert.equal(
          inputManifest.value.repositoryBindingFingerprint,
          attemptBinding.repositoryBindingFingerprint
        );
        assert.equal(
          inputManifest.value.provisionRootBindingFingerprint,
          attemptBinding.provisionRootBindingFingerprint
        );
        assert.equal(
          inputManifest.value.sourceSeedFingerprint,
          attemptBinding.sourceSeedFingerprint
        );
        assert.deepEqual(
          inputManifest.value.files.map((entry) => entry.role),
          [
            "repositoryPackage",
            "repositoryPackageLock",
            "sourcePackageEvidence",
            "sourcePackageLockEvidence",
            "installPackage",
            "installPackageLock",
            "npmGlobalConfig",
            "npmUserConfig"
          ]
        );
        assert.deepEqual(
          inputManifest.value.files.map((entry) => entry.relativePath),
          [
            "package.json",
            "package-lock.json",
            "evidence/source-package.json",
            "evidence/source-package-lock.json",
            "install/package.json",
            "install/package-lock.json",
            "config/npm-globalrc",
            "config/npm-userrc"
          ]
        );
        for (const entry of inputManifest.value.files) {
          assert.deepEqual(Reflect.ownKeys(entry), [
            "filesystemIdentityFingerprint",
            "rawByteSha256",
            "relativePath",
            "role"
          ]);
          const exactPath = entry.role === "repositoryPackage"
            || entry.role === "repositoryPackageLock"
            ? path.join(realpathSync(process.cwd()), entry.relativePath)
            : path.join(root, entry.relativePath);
          const rawByteSha256 = createHash("sha256")
            .update(readFileSync(exactPath))
            .digest("hex");
          assert.equal(entry.rawByteSha256, rawByteSha256);
          assert.equal(
            entry.filesystemIdentityFingerprint,
            recomputeFilesystemEntryIdentityFingerprint(
              exactPath,
              entry.role,
              "file"
            )
          );
        }
        assert.deepEqual(
          inputManifest.value.emptyDirectories.map((entry) => entry.role),
          [
            "data",
            "logs",
            "nodeCompileCache",
            "npmPrefix",
            "playwrightBrowsers",
            "state",
            "temp",
            "turboCache"
          ]
        );
        assert.deepEqual(
          inputManifest.value.emptyDirectories.map((entry) => entry.entryCount),
          Array(8).fill(0)
        );
        for (const entry of inputManifest.value.emptyDirectories) {
          assert.deepEqual(Reflect.ownKeys(entry), [
            "entryCount",
            "filesystemIdentityFingerprint",
            "relativePath",
            "role"
          ]);
          assert.equal(
            entry.filesystemIdentityFingerprint,
            recomputeFilesystemEntryIdentityFingerprint(
              path.join(root, entry.relativePath),
              entry.role,
              "directory"
            )
          );
        }
        assert.deepEqual(inputManifest.value.absences, [
          { role: "stagedCandidate", presence: "absent" },
          { role: "retainedQuarantineCandidate", presence: "absent" },
          { role: "rollbackCandidate", presence: "absent" }
        ]);
        assert.equal(
          createHash("sha256").update(inputManifest.text).digest("hex"),
          receipt.sourceInstallInputManifestSha256
        );
        assert.equal(
          receipt.sourceInstallInputManifestIdentityFingerprint,
          recomputeFilesystemEntryIdentityFingerprint(
            inputManifest.exactPath,
            "sourceInstallInputManifest",
            "file"
          )
        );
        assert.equal(
          inputManifest.value.ownerMarkerFingerprint,
          receipt.ownerMarkerFingerprint
        );
        assert.equal(
          inputManifest.value.cacheMarkerFingerprint,
          receipt.cacheMarkerFingerprint
        );
        assert.equal(
          inputManifest.value.quarantineMarkerFingerprint,
          receipt.quarantineMarkerFingerprint
        );
        assert.equal(
          inputManifest.value.rollbackMarkerFingerprint,
          receipt.rollbackMarkerFingerprint
        );
        assert.equal(
          inputManifest.value.activationLockFingerprint,
          lockReceipt.lockFingerprint
        );
        const emptyDirectorySetFingerprint = hashCanonicalProof(
          "required-browser-provision-initial-layout-empty-directory-set-v1",
          {
            schemaVersion: 1,
            directories: inputManifest.value.emptyDirectories
          }
        );
        const absenceSetFingerprint = hashCanonicalProof(
          "required-browser-provision-initial-layout-absence-set-v1",
          {
            schemaVersion: 1,
            absences: inputManifest.value.absences
          }
        );
        assert.equal(
          hashCanonicalProof(
            "required-browser-provision-initial-layout-binding-v1",
            {
              schemaVersion: 1,
              attemptId: attemptBinding.attemptId,
              mode: "initial",
              cacheMode: "fresh",
              attemptAuthorityBindingFingerprint:
                receipt.attemptAuthorityBindingFingerprint,
              repositoryBindingFingerprint:
                attemptBinding.repositoryBindingFingerprint,
              provisionRootBindingFingerprint:
                attemptBinding.provisionRootBindingFingerprint,
              activationLockFingerprint: lockReceipt.lockFingerprint,
              ownerMarkerFingerprint: receipt.ownerMarkerFingerprint,
              cacheMarkerFingerprint: receipt.cacheMarkerFingerprint,
              quarantineMarkerFingerprint:
                receipt.quarantineMarkerFingerprint,
              rollbackMarkerFingerprint: receipt.rollbackMarkerFingerprint,
              sourceInstallInputManifestSha256:
                receipt.sourceInstallInputManifestSha256,
              sourceInstallInputManifestIdentityFingerprint:
                receipt.sourceInstallInputManifestIdentityFingerprint,
              emptyDirectorySetFingerprint,
              absenceSetFingerprint
            }
          ),
          receipt.layoutBindingFingerprint
        );

        assert.throws(() => launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        ));
        launcherModule.finalizeRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(root)) {
          renameSync(root, path.join(leaf, "initial-fresh-layout-root"));
        }
      }
    });
  });
});

test("initial npm cache verification is one context-bound owned-process leaf", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.runRequiredBrowserProvisionNpmCacheVerify,
    "function"
  );
  assert.equal(
    launcherModule.runRequiredBrowserProvisionNpmCacheVerify.length,
    2
  );
  for (const forbiddenPrivateOperation of [
    "runRequiredBrowserProvisionProcessTableOwned",
    "runRequiredBrowserProvisionOwnerTokenTableOwned"
  ]) {
    assert.equal(Object.hasOwn(launcherModule, forbiddenPrivateOperation), false);
  }

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-cache-verify-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-cache-verify"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "cache-verify-active-lock.json");
      const retainedCleanup = path.join(leaf, "cache-verify-retained-lock.json");
      const root = finalized.provisionRoot;

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        const layoutReceipt = launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        const firstCacheVerification =
          launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
            liveHomeProof,
            finalized.attemptAuthority
          );
        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(existsSync(activeLock), true);
        assert.equal(existsSync(retainedLock), false);
        const result = await firstCacheVerification;

        assertDenseFrozenCatalogData(result);
        assert.deepEqual(Reflect.ownKeys(result), [
          "schemaVersion",
          "attemptId",
          "mode",
          "commandId",
          "outcome",
          "cacheInventoryFingerprint",
          "stdoutByteLength",
          "stdoutSha256",
          "stderrByteLength",
          "stderrSha256",
          "state",
          "signalAuthority"
        ]);
        assert.equal(result.schemaVersion, 1);
        assert.equal(result.attemptId, attemptBinding.attemptId);
        assert.equal(result.mode, "initial");
        assert.equal(
          result.commandId,
          "owner.dependency.npm.cache-verify"
        );
        assert.equal(result.outcome, "PASS");
        assert.equal(result.state, "cache-verified");
        assert.equal(result.signalAuthority, false);
        const cacheEntries = [];
        const cacheRoot = path.join(finalized.provisionRoot, "npm-cache");
        const walkCache = (directory) => {
          const children = readdirSync(directory, { withFileTypes: true })
            .sort((left, right) => codeUnitCompare(left.name, right.name));
          for (const child of children) {
            const exactPath = path.join(directory, child.name);
            const relativePath = path.relative(cacheRoot, exactPath);
            if (relativePath === ".mais-dependency-cache.json") continue;
            const entry = lstatSync(exactPath);
            assert.equal(entry.uid, process.getuid());
            assert.equal((entry.mode & 0o022) === 0, true);
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
              assert.equal(realpathSync(exactPath), exactPath);
              cacheEntries.push({
                relativePath,
                type: "directory",
                mode: entry.mode.toString(10)
              });
              walkCache(exactPath);
              continue;
            }
            assert.equal(entry.isFile(), true);
            assert.equal(entry.isSymbolicLink(), false);
            assert.equal(entry.nlink, 1);
            cacheEntries.push({
              relativePath,
              type: "file",
              mode: entry.mode.toString(10),
              nlink: entry.nlink.toString(10),
              size: entry.size,
              sha256: createHash("sha256")
                .update(readFileSync(exactPath))
                .digest("hex")
            });
          }
        };
        walkCache(cacheRoot);
        cacheEntries.sort((left, right) =>
          codeUnitCompare(left.relativePath, right.relativePath)
          || codeUnitCompare(left.type, right.type)
        );
        const cacheFiles = cacheEntries.filter(({ type }) => type === "file");
        assert.equal(
          result.cacheInventoryFingerprint,
          hashCanonicalProof(
            "required-browser-provision-npm-cache-inventory-v1",
            {
              schemaVersion: 1,
              attemptId: attemptBinding.attemptId,
              cacheMarkerFingerprint: layoutReceipt.cacheMarkerFingerprint,
              directoryCount: cacheEntries.length - cacheFiles.length,
              fileCount: cacheFiles.length,
              totalBytes: cacheFiles.reduce(
                (total, entry) => total + entry.size,
                0
              ),
              entries: cacheEntries
            }
          )
        );
        assert.equal(Number.isSafeInteger(result.stdoutByteLength), true);
        assert.equal(result.stdoutByteLength >= 0, true);
        assert.match(result.stdoutSha256, /^[a-f0-9]{64}$/u);
        assert.equal(Number.isSafeInteger(result.stderrByteLength), true);
        assert.equal(result.stderrByteLength >= 0, true);
        assert.match(result.stderrSha256, /^[a-f0-9]{64}$/u);
        assert.equal(
          liveHomeModule.assertNoLiveHomeRetention(liveHomeProof, result),
          undefined
        );
        for (const forbiddenKey of [
          "argv",
          "cwd",
          "environment",
          "npmCliPath",
          "ownerToken",
          "pid",
          "pgid",
          "stdout",
          "stderr",
          "signal",
          "receipt"
        ]) {
          assert.equal(Object.hasOwn(result, forbiddenKey), false);
        }

        const logDirectory = path.join(finalized.provisionRoot, "logs");
        assert.deepEqual(readdirSync(logDirectory), ["npm-cache-verify.log"]);
        const sanitizedLogPath = path.join(
          logDirectory,
          "npm-cache-verify.log"
        );
        const sanitizedLogEntry = lstatSync(sanitizedLogPath);
        assert.equal(sanitizedLogEntry.isFile(), true);
        assert.equal(sanitizedLogEntry.isSymbolicLink(), false);
        assert.equal(sanitizedLogEntry.nlink, 1);
        assert.equal(sanitizedLogEntry.mode & 0o7777, 0o600);
        const sanitizedLogText = readFileSync(sanitizedLogPath, "utf8");
        const sanitizedLog = JSON.parse(sanitizedLogText);
        assert.equal(canonicalizeClosedJson(sanitizedLog), sanitizedLogText);
        assert.deepEqual(Object.keys(sanitizedLog), [
          "attemptId",
          "commandId",
          "lifecycleCode",
          "mode",
          "npmDebugLogByteLength",
          "npmDebugLogIdentityFingerprint",
          "npmDebugLogSha256",
          "outcome",
          "schemaVersion",
          "state",
          "stderrByteLength",
          "stderrSha256",
          "stdoutByteLength",
          "stdoutSha256"
        ]);
        assert.equal(sanitizedLog.schemaVersion, 1);
        assert.equal(sanitizedLog.attemptId, attemptBinding.attemptId);
        assert.equal(sanitizedLog.lifecycleCode, "exit-zero");
        assert.equal(sanitizedLog.state, "cache-verified");
        assert.equal(sanitizedLog.npmDebugLogByteLength > 0, true);
        assert.match(sanitizedLog.npmDebugLogSha256, /^[a-f0-9]{64}$/u);
        assert.match(
          sanitizedLog.npmDebugLogIdentityFingerprint,
          /^[a-f0-9]{64}$/u
        );
        for (const retainedSecret of [home, finalized.provisionRoot]) {
          assert.equal(sanitizedLogText.includes(retainedSecret), false);
        }

        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        launcherModule.finalizeRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(root)) {
          renameSync(root, path.join(leaf, "initial-cache-verify-root"));
        }
      }
    });
  });
});

test("failed terminal cache verification scrubs npm debug logs before releasing the lock", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-cache-failure-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-cache-failure"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "cache-failure-active-lock.json");
      const retainedCleanup = path.join(
        leaf,
        "cache-failure-retained-lock.json"
      );
      const cacheRoot = path.join(finalized.provisionRoot, "npm-cache");
      const untrustedCacheEntry = path.join(
        cacheRoot,
        "untrusted-cache-entry"
      );

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        writeFileSync(untrustedCacheEntry, "retained cache drift\n", {
          flag: "wx",
          mode: 0o600
        });
        chmodSync(untrustedCacheEntry, 0o666);

        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(existsSync(untrustedCacheEntry), true);
        assert.equal(lstatSync(untrustedCacheEntry).mode & 0o7777, 0o666);
        assert.deepEqual(
          readdirSync(path.join(finalized.provisionRoot, "logs")),
          []
        );

        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(untrustedCacheEntry)) {
          chmodSync(untrustedCacheEntry, 0o600);
        }
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-cache-failure-root")
          );
        }
      }
    });
  });
});

test("initial staged npm dependency tree is one context-bound leaf", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged,
    "function"
  );
  assert.equal(
    launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged.length,
    2
  );
  for (const forbiddenPrivateOperation of [
    "runRequiredBrowserProvisionProcessTableOwned",
    "runRequiredBrowserProvisionOwnerTokenTableOwned"
  ]) {
    assert.equal(Object.hasOwn(launcherModule, forbiddenPrivateOperation), false);
  }

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-npm-ls-staged-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-npm-ls-staged"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "npm-ls-staged-active-lock.json");
      const retainedCleanup = path.join(
        leaf,
        "npm-ls-staged-retained-lock.json"
      );

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        await launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
          liveHomeProof,
          finalized.attemptAuthority
        );
        const installResult =
          await launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          );

        const firstList =
          launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged(
            liveHomeProof,
            finalized.attemptAuthority
          );
        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(existsSync(activeLock), true);
        assert.equal(existsSync(retainedLock), false);

        const result = await firstList;
        assertDenseFrozenCatalogData(result);
        assert.deepEqual(Reflect.ownKeys(result), [
          "schemaVersion",
          "attemptId",
          "mode",
          "commandId",
          "outcome",
          "npmDependencyTreeFingerprint",
          "stagedNodeModulesInventoryFingerprint",
          "stdoutByteLength",
          "stdoutSha256",
          "stderrByteLength",
          "stderrSha256",
          "state",
          "signalAuthority"
        ]);
        assert.equal(result.schemaVersion, 1);
        assert.equal(result.attemptId, attemptBinding.attemptId);
        assert.equal(result.mode, "initial");
        assert.equal(
          result.commandId,
          "owner.dependency.npm.ls-provision-staged"
        );
        assert.equal(result.outcome, "PASS");
        assert.equal(result.state, "dependencies-listed-staged");
        assert.equal(result.signalAuthority, false);
        assert.match(result.npmDependencyTreeFingerprint, /^[a-f0-9]{64}$/u);
        assert.equal(
          result.stagedNodeModulesInventoryFingerprint,
          installResult.stagedNodeModulesInventoryFingerprint
        );
        for (const [byteLength, sha256] of [
          [result.stdoutByteLength, result.stdoutSha256],
          [result.stderrByteLength, result.stderrSha256]
        ]) {
          assert.equal(Number.isSafeInteger(byteLength), true);
          assert.equal(byteLength >= 0 && byteLength <= 67108864, true);
          assert.match(sha256, /^[a-f0-9]{64}$/u);
        }
        assert.equal(
          liveHomeModule.assertNoLiveHomeRetention(liveHomeProof, result),
          undefined
        );
        for (const forbiddenKey of [
          "argv",
          "cwd",
          "environment",
          "npmCliPath",
          "nodePath",
          "ownerToken",
          "pid",
          "pgid",
          "stdout",
          "stderr",
          "signal",
          "receipt",
          "tree",
          "dependencies"
        ]) {
          assert.equal(Object.hasOwn(result, forbiddenKey), false);
        }

        const logDirectory = path.join(finalized.provisionRoot, "logs");
        assert.deepEqual(
          readdirSync(logDirectory).sort(codeUnitCompare),
          [
            "npm-cache-verify.log",
            "npm-ci-prefer-offline.log",
            "npm-ls-provision-staged.log"
          ]
        );
        const sanitizedLogPath = path.join(
          logDirectory,
          "npm-ls-provision-staged.log"
        );
        const sanitizedLogEntry = lstatSync(sanitizedLogPath);
        assert.equal(sanitizedLogEntry.isFile(), true);
        assert.equal(sanitizedLogEntry.isSymbolicLink(), false);
        assert.equal(sanitizedLogEntry.nlink, 1);
        assert.equal(sanitizedLogEntry.mode & 0o7777, 0o600);
        const sanitizedLogText = readFileSync(sanitizedLogPath, "utf8");
        const sanitizedLog = JSON.parse(sanitizedLogText);
        assert.equal(canonicalizeClosedJson(sanitizedLog), sanitizedLogText);
        assert.deepEqual(Object.keys(sanitizedLog), [
          "attemptId",
          "commandId",
          "dependencyNodeCount",
          "lifecycleCode",
          "maximumDependencyDepth",
          "mode",
          "npmDebugLogByteLength",
          "npmDebugLogIdentityFingerprint",
          "npmDebugLogSha256",
          "npmDependencyTreeFingerprint",
          "outcome",
          "postNpmCacheInventoryFingerprint",
          "postStagedNodeModulesInventoryFingerprint",
          "preNpmCacheInventoryFingerprint",
          "preStagedNodeModulesInventoryFingerprint",
          "schemaVersion",
          "stagedNodeModulesRootIdentityFingerprint",
          "state",
          "stderrByteLength",
          "stderrSha256",
          "stdoutByteLength",
          "stdoutSha256"
        ]);
        assert.equal(sanitizedLog.schemaVersion, 1);
        assert.equal(sanitizedLog.attemptId, attemptBinding.attemptId);
        assert.equal(sanitizedLog.lifecycleCode, "exit-zero");
        assert.equal(sanitizedLog.state, "dependencies-listed-staged");
        assert.equal(
          sanitizedLog.npmDependencyTreeFingerprint,
          result.npmDependencyTreeFingerprint
        );
        assert.equal(
          sanitizedLog.preNpmCacheInventoryFingerprint,
          sanitizedLog.postNpmCacheInventoryFingerprint
        );
        assert.equal(
          sanitizedLog.preStagedNodeModulesInventoryFingerprint,
          sanitizedLog.postStagedNodeModulesInventoryFingerprint
        );
        assert.equal(
          sanitizedLog.postStagedNodeModulesInventoryFingerprint,
          result.stagedNodeModulesInventoryFingerprint
        );
        assert.equal(Number.isSafeInteger(sanitizedLog.dependencyNodeCount), true);
        assert.equal(sanitizedLog.dependencyNodeCount >= 0, true);
        assert.equal(Number.isSafeInteger(sanitizedLog.maximumDependencyDepth), true);
        assert.equal(
          sanitizedLog.maximumDependencyDepth >= 0
            && sanitizedLog.maximumDependencyDepth <= 64,
          true
        );
        assert.equal(sanitizedLog.npmDebugLogByteLength > 0, true);
        assert.match(sanitizedLog.npmDebugLogSha256, /^[a-f0-9]{64}$/u);
        assert.match(
          sanitizedLog.npmDebugLogIdentityFingerprint,
          /^[a-f0-9]{64}$/u
        );
        for (const retainedSecret of [home, finalized.provisionRoot]) {
          assert.equal(sanitizedLogText.includes(retainedSecret), false);
        }

        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-npm-ls-staged-root")
          );
        }
      }
    });
  });
});

test("initial staged dependencies activate through one exclusive relative link", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.activateRequiredBrowserProvisionStagedDependencies,
    "function"
  );
  assert.equal(
    launcherModule.activateRequiredBrowserProvisionStagedDependencies.length,
    2
  );
  const activationSource = OWNED_PROCESS_LAUNCHER_SOURCE.slice(
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "export function activateRequiredBrowserProvisionStagedDependencies("
    ),
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "export function finalizeRequiredBrowserProvisionActivationLock("
    )
  );
  assert.match(activationSource, /\bsymlinkSync\(/u);
  assert.doesNotMatch(
    activationSource,
    /\b(?:linkSync|renameSync|unlinkSync)\(/u
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-staged-activation-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-staged-activation"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeLockCleanup = path.join(
        leaf,
        "staged-activation-active-lock.json"
      );
      const retainedLockCleanup = path.join(
        leaf,
        "staged-activation-retained-lock.json"
      );
      const activeNodeModules = path.join(process.cwd(), "node_modules");
      const originalNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-backup-${attemptBinding.attemptId}`
      );
      const displacedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-displaced-${attemptBinding.attemptId}`
      );
      const activatedLinkCleanup = path.join(
        leaf,
        "activated-node-modules-link"
      );
      const stagedNodeModules = path.join(
        finalized.provisionRoot,
        "install",
        "node_modules"
      );
      let originalNodeModulesMoved = false;
      let originalNodeModulesEntry;

      const restoreOriginalNodeModules = () => {
        if (!originalNodeModulesMoved) return true;
        const restored = restoreMovedWorktreeDirectory({
          activePath: activeNodeModules,
          backupPath: originalNodeModules,
          displacedPath: displacedNodeModules,
          expectedEntry: originalNodeModulesEntry
        });
        if (restored) {
          originalNodeModulesMoved = false;
        }
        return restored;
      };
      process.once("exit", restoreOriginalNodeModules);

      try {
        assert.equal(pathEntryExists(originalNodeModules), false);
        assert.equal(pathEntryExists(displacedNodeModules), false);
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        await launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
          liveHomeProof,
          finalized.attemptAuthority
        );
        const installResult =
          await launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          );
        const stagedListResult =
          await launcherModule.runRequiredBrowserProvisionNpmLsProvisionStaged(
            liveHomeProof,
            finalized.attemptAuthority
          );

        assert.equal(lstatSync(activeNodeModules).isDirectory(), true);
        originalNodeModulesEntry = lstatSync(activeNodeModules, {
          bigint: true
        });
        renameSync(activeNodeModules, originalNodeModules);
        originalNodeModulesMoved = true;
        assert.equal(existsSync(activeNodeModules), false);

        const result =
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assertDenseFrozenCatalogData(result);
        assert.deepEqual(Reflect.ownKeys(result), [
          "schemaVersion",
          "attemptId",
          "mode",
          "operationId",
          "outcome",
          "activeNodeModulesBindingFingerprint",
          "stagedNodeModulesInventoryFingerprint",
          "npmDependencyTreeFingerprint",
          "state",
          "signalAuthority"
        ]);
        assert.equal(result.schemaVersion, 1);
        assert.equal(result.attemptId, attemptBinding.attemptId);
        assert.equal(result.mode, "initial");
        assert.equal(
          result.operationId,
          "owner.dependency.activate-provision-staged"
        );
        assert.equal(result.outcome, "PASS");
        assert.match(
          result.activeNodeModulesBindingFingerprint,
          /^[a-f0-9]{64}$/u
        );
        assert.equal(
          result.stagedNodeModulesInventoryFingerprint,
          installResult.stagedNodeModulesInventoryFingerprint
        );
        assert.equal(
          result.stagedNodeModulesInventoryFingerprint,
          stagedListResult.stagedNodeModulesInventoryFingerprint
        );
        assert.equal(
          result.npmDependencyTreeFingerprint,
          stagedListResult.npmDependencyTreeFingerprint
        );
        assert.equal(result.state, "dependencies-activated-initial");
        assert.equal(result.signalAuthority, false);
        assert.equal(
          liveHomeModule.assertNoLiveHomeRetention(liveHomeProof, result),
          undefined
        );
        for (const forbiddenKey of [
          "activePath",
          "stagedPath",
          "provisionRoot",
          "linkTarget",
          "receipt",
          "rollbackPath",
          "descriptor",
          "fd",
          "cwd",
          "environment",
          "ownerToken",
          "pid"
        ]) {
          assert.equal(Object.hasOwn(result, forbiddenKey), false);
        }

        const activeEntry = lstatSync(activeNodeModules);
        assert.equal(activeEntry.isSymbolicLink(), true);
        assert.equal(activeEntry.nlink, 1);
        assert.equal(
          readlinkSync(activeNodeModules),
          `.tmp/dependency-provision-${attemptBinding.attemptId}/install/node_modules`
        );
        assert.equal(realpathSync(activeNodeModules), stagedNodeModules);
        assert.equal(lstatSync(stagedNodeModules).isDirectory(), true);
        assert.equal(
          recomputeStagedNodeModulesInventory(
            stagedNodeModules,
            attemptBinding.attemptId
          ),
          result.stagedNodeModulesInventoryFingerprint
        );
        assert.deepEqual(
          readdirSync(path.join(finalized.provisionRoot, "logs")).sort(
            codeUnitCompare
          ),
          [
            "npm-cache-verify.log",
            "npm-ci-prefer-offline.log",
            "npm-ls-provision-staged.log"
          ]
        );

        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(existsSync(activeLock), true);
        assert.equal(existsSync(retainedLock), false);
        assert.throws(() =>
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(
          readlinkSync(activeNodeModules),
          `.tmp/dependency-provision-${attemptBinding.attemptId}/install/node_modules`
        );
      } finally {
        const restored = restoreOriginalNodeModules();
        if (restored) {
          process.removeListener("exit", restoreOriginalNodeModules);
          if (pathEntryExists(displacedNodeModules)) {
            renameSync(displacedNodeModules, activatedLinkCleanup);
          }
        }
        if (existsSync(activeLock)) {
          renameSync(activeLock, activeLockCleanup);
        }
        if (existsSync(retainedLock)) {
          renameSync(retainedLock, retainedLockCleanup);
        }
        if (restored && existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-staged-activation-root")
          );
        }
        assert.equal(restored, true);
      }
    });
  });
});

test("initial staged activation preserves a preexisting node_modules entry and releases only a proven no-mutation lock", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(
      leaf,
      "initial-staged-activation-existing-home"
    );
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const prepared = await prepareInitialStagedActivationForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-staged-activation-existing"
      );
      const activeNodeModules = path.join(process.cwd(), "node_modules");
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock =
        `${activeLock}.retained-${prepared.attemptBinding.attemptId}`;
      const activeLockCleanup = path.join(
        leaf,
        "activation-existing-active-lock.json"
      );
      const retainedLockCleanup = path.join(
        leaf,
        "activation-existing-retained-lock.json"
      );
      const identityKeys = ["dev", "ino", "mode", "uid", "gid", "nlink"];
      const before = lstatSync(activeNodeModules, { bigint: true });
      const entriesBefore = readdirSync(activeNodeModules).sort(codeUnitCompare);

      try {
        assert.equal(before.isDirectory(), true);
        assert.equal(before.isSymbolicLink(), false);
        assert.throws(() =>
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );

        const after = lstatSync(activeNodeModules, { bigint: true });
        assert.equal(after.isDirectory(), true);
        assert.equal(after.isSymbolicLink(), false);
        for (const key of identityKeys) assert.equal(after[key], before[key]);
        assert.deepEqual(
          readdirSync(activeNodeModules).sort(codeUnitCompare),
          entriesBefore
        );
        assert.equal(pathEntryExists(activeLock), true);
        assert.equal(pathEntryExists(retainedLock), false);

        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            prepared.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(pathEntryExists(activeLock), false);
        assert.equal(pathEntryExists(retainedLock), true);
      } finally {
        if (pathEntryExists(activeLock)) {
          renameSync(activeLock, activeLockCleanup);
        }
        if (pathEntryExists(retainedLock)) {
          renameSync(retainedLock, retainedLockCleanup);
        }
        if (pathEntryExists(prepared.provisionRoot)) {
          renameSync(
            prepared.provisionRoot,
            path.join(leaf, "initial-staged-activation-existing-root")
          );
        }
      }
    });
  });
});

test("initial staged activation rejects an EEXIST race after its final absence proof", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.armRequiredBrowserInitialActivationPrePublishTestBarrier,
    "function"
  );
  assert.equal(
    launcherModule.armRequiredBrowserInitialActivationPrePublishTestBarrier.length,
    2
  );
  const activationSource = OWNED_PROCESS_LAUNCHER_SOURCE.slice(
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "export function activateRequiredBrowserProvisionStagedDependencies("
    ),
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "export function finalizeRequiredBrowserProvisionActivationLock("
    )
  );
  const finalAbsenceIndex = activationSource.lastIndexOf(
    "assertInitialActiveNodeModulesAbsent("
  );
  const repositorySnapshotIndex = activationSource.indexOf(
    "repositoryEntriesBeforePublication ="
  );
  const barrierIndex = activationSource.indexOf(
    "crossInitialActivationPrePublishTestBarrierIfArmed("
  );
  const publicationAttemptedIndex = activationSource.indexOf(
    "publicationAttempted = true;"
  );
  const exclusiveSymlinkIndex = activationSource.indexOf(
    "symlinkSync(relativeTarget, activePaths.identityPath);"
  );
  assert.equal(finalAbsenceIndex < repositorySnapshotIndex, true);
  assert.equal(repositorySnapshotIndex < barrierIndex, true);
  assert.equal(barrierIndex < publicationAttemptedIndex, true);
  assert.equal(publicationAttemptedIndex < exclusiveSymlinkIndex, true);

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(
      leaf,
      "initial-staged-activation-eexist-home"
    );
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const prepared = await prepareInitialStagedActivationForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-staged-activation-eexist"
      );
      const activeNodeModules = path.join(process.cwd(), "node_modules");
      const originalNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-eexist-backup-${prepared.attemptBinding.attemptId}`
      );
      const displacedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-eexist-displaced-${prepared.attemptBinding.attemptId}`
      );
      const injectedNodeModules = path.join(
        leaf,
        "injected-node-modules-link"
      );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock =
        `${activeLock}.retained-${prepared.attemptBinding.attemptId}`;
      const activeLockCleanup = path.join(
        leaf,
        "activation-eexist-active-lock.json"
      );
      const retainedLockCleanup = path.join(
        leaf,
        "activation-eexist-retained-lock.json"
      );
      const barrierReady = path.join(
        leaf,
        "required-browser-initial-activation-prepublish.ready"
      );
      const barrierAck = path.join(
        leaf,
        "required-browser-initial-activation-prepublish.ack"
      );
      let originalNodeModulesMoved = false;
      let originalNodeModulesEntry;
      let mutator;

      const restoreOriginalNodeModules = () => {
        if (!originalNodeModulesMoved) return true;
        const restored = restoreMovedWorktreeDirectory({
          activePath: activeNodeModules,
          backupPath: originalNodeModules,
          displacedPath: displacedNodeModules,
          expectedEntry: originalNodeModulesEntry
        });
        if (restored) {
          originalNodeModulesMoved = false;
        }
        return restored;
      };
      process.once("exit", restoreOriginalNodeModules);

      try {
        assert.equal(pathEntryExists(originalNodeModules), false);
        assert.equal(pathEntryExists(displacedNodeModules), false);
        originalNodeModulesEntry = lstatSync(activeNodeModules, {
          bigint: true
        });
        renameSync(activeNodeModules, originalNodeModules);
        originalNodeModulesMoved = true;
        assert.equal(pathEntryExists(activeNodeModules), false);
        launcherModule.armRequiredBrowserInitialActivationPrePublishTestBarrier(
          capability,
          prepared.attemptAuthority
        );
        mutator = spawnTestChild(process.execPath, [
          "-e",
          `
            const { existsSync, symlinkSync, writeFileSync } = require("node:fs");
            const ready = process.argv[1];
            const active = process.argv[2];
            const acknowledgement = process.argv[3];
            process.stdout.write("READY\\n");
            const deadline = Date.now() + 120000;
            while (Date.now() < deadline) {
              if (existsSync(ready)) {
                symlinkSync("foreign-target", active);
                writeFileSync(acknowledgement, "ack\\n", {
                  flag: "wx",
                  mode: 0o600
                });
                process.exit(0);
              }
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
            }
            process.exit(2);
          `,
          barrierReady,
          activeNodeModules,
          barrierAck
        ], {
          stdio: ["ignore", "pipe", "pipe"]
        });
        const childClosed = once(mutator, "close");
        await once(mutator, "spawn");
        const [readyBytes] = await once(mutator.stdout, "data");
        assert.equal(readyBytes.toString("utf8"), "READY\n");

        assert.throws(() =>
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        const [exitCode, signal] = await childClosed;
        assert.equal(exitCode, 0);
        assert.equal(signal, null);
        assert.equal(readFileSync(barrierReady, "utf8"), "ready\n");
        assert.equal(readFileSync(barrierAck, "utf8"), "ack\n");
        assert.equal(lstatSync(activeNodeModules).isSymbolicLink(), true);
        assert.equal(readlinkSync(activeNodeModules), "foreign-target");
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        assert.equal(pathEntryExists(activeLock), true);
        assert.equal(pathEntryExists(retainedLock), false);
      } finally {
        if (mutator && mutator.exitCode === null) {
          const closed = once(mutator, "close");
          mutator.kill("SIGKILL");
          await closed;
        }
        const restored = restoreOriginalNodeModules();
        if (restored) {
          process.removeListener("exit", restoreOriginalNodeModules);
          if (pathEntryExists(displacedNodeModules)) {
            renameSync(displacedNodeModules, injectedNodeModules);
          }
        }
        if (pathEntryExists(activeLock)) {
          renameSync(activeLock, activeLockCleanup);
        }
        if (pathEntryExists(retainedLock)) {
          renameSync(retainedLock, retainedLockCleanup);
        }
        if (restored && pathEntryExists(prepared.provisionRoot)) {
          renameSync(
            prepared.provisionRoot,
            path.join(leaf, "initial-staged-activation-eexist-root")
          );
        }
        assert.equal(restored, true);
      }
    });
  });
});

test("initial staged activation retains its published link and active lock after post-publication failure", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.armRequiredBrowserInitialActivationPostPublishTestFailure,
    "function"
  );
  assert.equal(
    launcherModule.armRequiredBrowserInitialActivationPostPublishTestFailure.length,
    2
  );

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(
      leaf,
      "initial-staged-activation-postpublish-home"
    );
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const prepared = await prepareInitialStagedActivationForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-staged-activation-postpublish"
      );
      const activeNodeModules = path.join(process.cwd(), "node_modules");
      const originalNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-postpublish-backup-${prepared.attemptBinding.attemptId}`
      );
      const displacedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-postpublish-displaced-${prepared.attemptBinding.attemptId}`
      );
      const publishedNodeModules = path.join(
        leaf,
        "published-node-modules-link"
      );
      const stagedNodeModules = path.join(
        prepared.provisionRoot,
        "install",
        "node_modules"
      );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock =
        `${activeLock}.retained-${prepared.attemptBinding.attemptId}`;
      const activeLockCleanup = path.join(
        leaf,
        "activation-postpublish-active-lock.json"
      );
      const retainedLockCleanup = path.join(
        leaf,
        "activation-postpublish-retained-lock.json"
      );
      let originalNodeModulesMoved = false;
      let originalNodeModulesEntry;

      const restoreOriginalNodeModules = () => {
        if (!originalNodeModulesMoved) return true;
        const restored = restoreMovedWorktreeDirectory({
          activePath: activeNodeModules,
          backupPath: originalNodeModules,
          displacedPath: displacedNodeModules,
          expectedEntry: originalNodeModulesEntry
        });
        if (restored) {
          originalNodeModulesMoved = false;
        }
        return restored;
      };
      process.once("exit", restoreOriginalNodeModules);

      try {
        assert.equal(pathEntryExists(originalNodeModules), false);
        assert.equal(pathEntryExists(displacedNodeModules), false);
        originalNodeModulesEntry = lstatSync(activeNodeModules, {
          bigint: true
        });
        renameSync(activeNodeModules, originalNodeModules);
        originalNodeModulesMoved = true;
        launcherModule.armRequiredBrowserInitialActivationPostPublishTestFailure(
          capability,
          prepared.attemptAuthority
        );

        assert.throws(() =>
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        assert.equal(lstatSync(activeNodeModules).isSymbolicLink(), true);
        assert.equal(
          readlinkSync(activeNodeModules),
          `.tmp/dependency-provision-${prepared.attemptBinding.attemptId}/install/node_modules`
        );
        assert.equal(realpathSync(activeNodeModules), stagedNodeModules);
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        assert.equal(pathEntryExists(activeLock), true);
        assert.equal(pathEntryExists(retainedLock), false);
      } finally {
        const restored = restoreOriginalNodeModules();
        if (restored) {
          process.removeListener("exit", restoreOriginalNodeModules);
          if (pathEntryExists(displacedNodeModules)) {
            renameSync(displacedNodeModules, publishedNodeModules);
          }
        }
        if (pathEntryExists(activeLock)) {
          renameSync(activeLock, activeLockCleanup);
        }
        if (pathEntryExists(retainedLock)) {
          renameSync(retainedLock, retainedLockCleanup);
        }
        if (restored && pathEntryExists(prepared.provisionRoot)) {
          renameSync(
            prepared.provisionRoot,
            path.join(leaf, "initial-staged-activation-postpublish-root")
          );
        }
        assert.equal(restored, true);
      }
    });
  });
});

test("initial staged activation rejects a final target swap between chain validation and link binding", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.armRequiredBrowserInitialActivationFinalTargetSwapTestBarrier,
    "function"
  );
  assert.equal(
    launcherModule.armRequiredBrowserInitialActivationFinalTargetSwapTestBarrier.length,
    2
  );

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(
      leaf,
      "initial-staged-activation-final-target-swap-home"
    );
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const prepared = await prepareInitialStagedActivationForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-staged-activation-final-target-swap"
      );
      const activeNodeModules = path.join(process.cwd(), "node_modules");
      const stagedNodeModules = path.join(
        prepared.provisionRoot,
        "install",
        "node_modules"
      );
      const originalNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-final-swap-backup-${prepared.attemptBinding.attemptId}`
      );
      const displacedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-node-modules-final-swap-displaced-${prepared.attemptBinding.attemptId}`
      );
      const originalStagedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-staged-target-final-swap-backup-${prepared.attemptBinding.attemptId}`
      );
      const displacedStagedNodeModules = path.join(
        process.cwd(),
        ".tmp",
        `.required-browser-staged-target-final-swap-displaced-${prepared.attemptBinding.attemptId}`
      );
      const activeLinkCleanup = path.join(
        leaf,
        "final-target-swap-active-link"
      );
      const replacementTargetCleanup = path.join(
        leaf,
        "final-target-swap-replacement-target"
      );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock =
        `${activeLock}.retained-${prepared.attemptBinding.attemptId}`;
      const activeLockCleanup = path.join(
        leaf,
        "activation-final-target-swap-active-lock.json"
      );
      const retainedLockCleanup = path.join(
        leaf,
        "activation-final-target-swap-retained-lock.json"
      );
      const originalNodeModulesEntry = lstatSync(activeNodeModules, {
        bigint: true
      });
      const originalStagedNodeModulesEntry = lstatSync(stagedNodeModules, {
        bigint: true
      });
      let originalNodeModulesMoved = false;
      let stagedNodeModulesMayBeMoved = false;

      const restoreAllMovedDirectories = () => {
        let worktreeRestored = true;
        let stagedRestored = true;
        if (originalNodeModulesMoved) {
          worktreeRestored = restoreMovedWorktreeDirectory({
            activePath: activeNodeModules,
            backupPath: originalNodeModules,
            displacedPath: displacedNodeModules,
            expectedEntry: originalNodeModulesEntry
          });
          if (worktreeRestored) originalNodeModulesMoved = false;
        }
        if (stagedNodeModulesMayBeMoved) {
          stagedRestored = restoreMovedWorktreeDirectory({
            activePath: stagedNodeModules,
            backupPath: originalStagedNodeModules,
            displacedPath: displacedStagedNodeModules,
            expectedEntry: originalStagedNodeModulesEntry
          });
          if (stagedRestored) stagedNodeModulesMayBeMoved = false;
        }
        return worktreeRestored && stagedRestored;
      };
      process.once("exit", restoreAllMovedDirectories);

      try {
        for (const recoveryPath of [
          originalNodeModules,
          displacedNodeModules,
          originalStagedNodeModules,
          displacedStagedNodeModules
        ]) {
          assert.equal(pathEntryExists(recoveryPath), false);
        }
        renameSync(activeNodeModules, originalNodeModules);
        originalNodeModulesMoved = true;
        stagedNodeModulesMayBeMoved = true;
        launcherModule.armRequiredBrowserInitialActivationFinalTargetSwapTestBarrier(
          capability,
          prepared.attemptAuthority
        );

        assert.throws(() =>
          launcherModule.activateRequiredBrowserProvisionStagedDependencies(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        const replacementEntry = lstatSync(stagedNodeModules, {
          bigint: true
        });
        assert.equal(replacementEntry.isDirectory(), true);
        assert.notEqual(replacementEntry.ino, originalStagedNodeModulesEntry.ino);
        assert.equal(lstatSync(activeNodeModules).isSymbolicLink(), true);
        assert.equal(realpathSync(activeNodeModules), stagedNodeModules);
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            prepared.attemptAuthority
          )
        );
        assert.equal(pathEntryExists(activeLock), true);
        assert.equal(pathEntryExists(retainedLock), false);
      } finally {
        const restored = restoreAllMovedDirectories();
        if (restored) {
          process.removeListener("exit", restoreAllMovedDirectories);
          if (pathEntryExists(displacedNodeModules)) {
            renameSync(displacedNodeModules, activeLinkCleanup);
          }
          if (pathEntryExists(displacedStagedNodeModules)) {
            renameSync(
              displacedStagedNodeModules,
              replacementTargetCleanup
            );
          }
        }
        if (pathEntryExists(activeLock)) {
          renameSync(activeLock, activeLockCleanup);
        }
        if (pathEntryExists(retainedLock)) {
          renameSync(retainedLock, retainedLockCleanup);
        }
        if (restored && pathEntryExists(prepared.provisionRoot)) {
          renameSync(
            prepared.provisionRoot,
            path.join(leaf, "initial-staged-activation-final-target-swap-root")
          );
        }
        assert.equal(restored, true);
      }
    });
  });
});

test("initial npm ci prefer-offline is one context-bound staged-install leaf", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline,
    "function"
  );
  assert.equal(
    launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline.length,
    2
  );
  const stagedInventorySource = OWNED_PROCESS_LAUNCHER_SOURCE.slice(
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "function inventoryStagedNodeModulesPass("
    ),
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "function inventoryStableStagedNodeModules("
    )
  );
  assert.match(
    stagedInventorySource,
    /readdirSync\(retainedDirectory\.identityPath,/u
  );
  assert.doesNotMatch(
    stagedInventorySource,
    /readdirSync\(directory,/u
  );
  const stagedTraversalSource = OWNED_PROCESS_LAUNCHER_SOURCE.slice(
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "function openStagedNodeModulesDescriptor("
    ),
    OWNED_PROCESS_LAUNCHER_SOURCE.indexOf(
      "function initialLayoutFileRecord("
    )
  );
  assert.doesNotMatch(stagedTraversalSource, /realpathSync\(/u);
  assert.match(
    stagedTraversalSource,
    /function resolveStagedSymlinkTargetComponents\(/u
  );
  for (const forbiddenPrivateOperation of [
    "runRequiredBrowserProvisionProcessTableOwned",
    "runRequiredBrowserProvisionOwnerTokenTableOwned"
  ]) {
    assert.equal(Object.hasOwn(launcherModule, forbiddenPrivateOperation), false);
  }

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-npm-ci-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-npm-ci"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "npm-ci-active-lock.json");
      const retainedCleanup = path.join(leaf, "npm-ci-retained-lock.json");

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        await launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
          liveHomeProof,
          finalized.attemptAuthority
        );

        const firstInstall =
          launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          );
        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.throws(() =>
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        assert.equal(existsSync(activeLock), true);
        assert.equal(existsSync(retainedLock), false);

        const result = await firstInstall;
        assertDenseFrozenCatalogData(result);
        assert.deepEqual(Reflect.ownKeys(result), [
          "schemaVersion",
          "attemptId",
          "mode",
          "commandId",
          "outcome",
          "stagedNodeModulesInventoryFingerprint",
          "stdoutByteLength",
          "stdoutSha256",
          "stderrByteLength",
          "stderrSha256",
          "state",
          "signalAuthority"
        ]);
        assert.equal(result.schemaVersion, 1);
        assert.equal(result.attemptId, attemptBinding.attemptId);
        assert.equal(result.mode, "initial");
        assert.equal(
          result.commandId,
          "owner.dependency.npm.ci-prefer-offline"
        );
        assert.equal(result.outcome, "PASS");
        assert.equal(result.state, "dependencies-installed-staged");
        assert.equal(result.signalAuthority, false);
        assert.equal(Number.isSafeInteger(result.stdoutByteLength), true);
        assert.equal(result.stdoutByteLength >= 0, true);
        assert.match(result.stdoutSha256, /^[a-f0-9]{64}$/u);
        assert.equal(Number.isSafeInteger(result.stderrByteLength), true);
        assert.equal(result.stderrByteLength >= 0, true);
        assert.match(result.stderrSha256, /^[a-f0-9]{64}$/u);

        const stagedNodeModules = path.join(
          finalized.provisionRoot,
          "install",
          "node_modules"
        );
        assert.equal(lstatSync(stagedNodeModules).isDirectory(), true);
        assert.equal(realpathSync(stagedNodeModules), stagedNodeModules);
        assert.equal(
          result.stagedNodeModulesInventoryFingerprint,
          recomputeStagedNodeModulesInventory(
            stagedNodeModules,
            attemptBinding.attemptId
          )
        );
        assert.equal(
          liveHomeModule.assertNoLiveHomeRetention(liveHomeProof, result),
          undefined
        );
        for (const forbiddenKey of [
          "argv",
          "cwd",
          "environment",
          "npmCliPath",
          "nodePath",
          "ownerToken",
          "pid",
          "pgid",
          "stdout",
          "stderr",
          "signal",
          "receipt",
          "stagedNodeModulesPath",
          "inventory"
        ]) {
          assert.equal(Object.hasOwn(result, forbiddenKey), false);
        }

        const logDirectory = path.join(finalized.provisionRoot, "logs");
        assert.deepEqual(
          readdirSync(logDirectory).sort(codeUnitCompare),
          ["npm-cache-verify.log", "npm-ci-prefer-offline.log"]
        );
        const sanitizedLogPath = path.join(
          logDirectory,
          "npm-ci-prefer-offline.log"
        );
        const sanitizedLogEntry = lstatSync(sanitizedLogPath);
        assert.equal(sanitizedLogEntry.isFile(), true);
        assert.equal(sanitizedLogEntry.isSymbolicLink(), false);
        assert.equal(sanitizedLogEntry.nlink, 1);
        assert.equal(sanitizedLogEntry.mode & 0o7777, 0o600);
        const sanitizedLogText = readFileSync(sanitizedLogPath, "utf8");
        const sanitizedLog = JSON.parse(sanitizedLogText);
        assert.equal(canonicalizeClosedJson(sanitizedLog), sanitizedLogText);
        assert.deepEqual(Object.keys(sanitizedLog), [
          "attemptId",
          "commandId",
          "lifecycleCode",
          "mode",
          "npmDebugLogByteLength",
          "npmDebugLogIdentityFingerprint",
          "npmDebugLogSha256",
          "outcome",
          "schemaVersion",
          "stagedNodeModulesInventoryFingerprint",
          "stagedNodeModulesRootIdentityFingerprint",
          "state",
          "stderrByteLength",
          "stderrSha256",
          "stdoutByteLength",
          "stdoutSha256"
        ]);
        assert.equal(sanitizedLog.schemaVersion, 1);
        assert.equal(sanitizedLog.attemptId, attemptBinding.attemptId);
        assert.equal(sanitizedLog.lifecycleCode, "exit-zero");
        assert.equal(sanitizedLog.state, "dependencies-installed-staged");
        assert.equal(
          sanitizedLog.stagedNodeModulesInventoryFingerprint,
          result.stagedNodeModulesInventoryFingerprint
        );
        assert.equal(sanitizedLog.npmDebugLogByteLength > 0, true);
        assert.match(sanitizedLog.npmDebugLogSha256, /^[a-f0-9]{64}$/u);
        assert.match(
          sanitizedLog.npmDebugLogIdentityFingerprint,
          /^[a-f0-9]{64}$/u
        );
        for (const retainedSecret of [home, finalized.provisionRoot]) {
          assert.equal(sanitizedLogText.includes(retainedSecret), false);
        }

        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-npm-ci-root")
          );
        }
      }
    });
  });
});

test("staged inventory rejects a directory-to-symlink swap without pathname traversal", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );
  assert.equal(
    typeof launcherModule.armRequiredBrowserStagedInventoryTestBarrier,
    "function"
  );

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(leaf, "staged-inventory-race-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "staged-inventory-directory-symlink-race"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "staged-race-active-lock.json");
      const retainedCleanup = path.join(leaf, "staged-race-retained-lock.json");
      const stagedNodeModules = path.join(
        finalized.provisionRoot,
        "install",
        "node_modules"
      );
      const outsideDirectory = path.join(leaf, "outside-staged-tree");
      const outsideCanary = path.join(outsideDirectory, "outside-canary.txt");
      const movedDirectory = path.join(leaf, "moved-staged-directory");
      const barrierReady = path.join(
        leaf,
        "required-browser-staged-inventory-test-barrier.ready"
      );
      const barrierAck = path.join(
        leaf,
        "required-browser-staged-inventory-test-barrier.ack"
      );
      mkdirSync(outsideDirectory, { mode: 0o700 });
      writeFileSync(outsideCanary, "must-not-be-traversed\n", {
        flag: "wx",
        mode: 0o600
      });
      let mutator;

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        );
        await launcherModule.runRequiredBrowserProvisionNpmCacheVerify(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.armRequiredBrowserStagedInventoryTestBarrier(
          capability,
          finalized.attemptAuthority
        );
        mutator = spawnTestChild(process.execPath, [
          "-e",
          `
            const {
              existsSync,
              readFileSync,
              renameSync,
              symlinkSync,
              writeFileSync
            } = require("node:fs");
            const path = require("node:path");
            const ready = process.argv[1];
            const stagedRoot = process.argv[2];
            const moved = process.argv[3];
            const outside = process.argv[4];
            const acknowledgement = process.argv[5];
            process.stdout.write("READY\\n");
            const deadline = Date.now() + 600000;
            while (Date.now() < deadline) {
              if (existsSync(ready)) {
                const relativePath = readFileSync(ready, "utf8").trim();
                const target = path.join(stagedRoot, relativePath);
                renameSync(target, moved);
                symlinkSync(outside, target, "dir");
                writeFileSync(acknowledgement, "ack\\n", {
                  flag: "wx",
                  mode: 0o600
                });
                process.exit(0);
              }
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
            }
            process.exit(2);
          `,
          barrierReady,
          stagedNodeModules,
          movedDirectory,
          outsideDirectory,
          barrierAck
        ], {
          stdio: ["ignore", "pipe", "pipe"]
        });
        const childClosed = once(mutator, "close");
        await once(mutator, "spawn");
        const [readyBytes] = await once(mutator.stdout, "data");
        assert.equal(readyBytes.toString("utf8"), "READY\n");

        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        const [exitCode, signal] = await childClosed;
        assert.equal(exitCode, 0);
        assert.equal(signal, null);
        const swappedRelativePath = readFileSync(barrierReady, "utf8").trim();
        assert.equal(swappedRelativePath.length > 0, true);
        assert.equal(
          lstatSync(path.join(stagedNodeModules, swappedRelativePath))
            .isSymbolicLink(),
          true
        );
        assert.equal(readFileSync(barrierAck, "utf8"), "ack\n");
        assert.equal(
          readFileSync(outsideCanary, "utf8"),
          "must-not-be-traversed\n"
        );
        await assert.rejects(
          launcherModule.runRequiredBrowserProvisionNpmCiPreferOffline(
            liveHomeProof,
            finalized.attemptAuthority
          )
        );
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (mutator && mutator.exitCode === null) mutator.kill("SIGKILL");
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "staged-inventory-race-root")
          );
        }
      }
    });
  });
});

test("fresh layout rejects a nonempty retained root, burns retry, and retain-releases the lock", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ leaf }) => {
    const home = createHomeDirectory(leaf, "initial-layout-reject-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-layout-reject-nonempty"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "layout-reject-active-lock.json");
      const retainedCleanup = path.join(leaf, "layout-reject-retained-lock.json");
      const unexpected = path.join(finalized.provisionRoot, "unexpected.txt");

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        writeFileSync(unexpected, "must remain retained\n", {
          flag: "wx",
          mode: 0o600
        });
        assert.throws(() => launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        ));
        assert.equal(readFileSync(unexpected, "utf8"), "must remain retained\n");
        assert.throws(() => launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        ));
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-layout-rejected-root")
          );
        }
      }
    });
  });
});

test("fresh layout rejects child-directory identity drift at a capability-bound phase barrier", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(leaf, "initial-layout-directory-drift-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-layout-directory-drift"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "layout-drift-active-lock.json");
      const retainedCleanup = path.join(leaf, "layout-drift-retained-lock.json");
      const targetDirectory = path.join(finalized.provisionRoot, "data");
      const barrierReady = path.join(
        leaf,
        "required-browser-initial-layout-test-barrier.ready"
      );
      const barrierAck = path.join(
        leaf,
        "required-browser-initial-layout-test-barrier.ack"
      );
      let mutator;

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.armRequiredBrowserInitialLayoutTestBarrier(
          capability,
          finalized.attemptAuthority
        );
        mutator = spawnTestChild(process.execPath, [
          "-e",
          `
            const { chmodSync, existsSync, writeFileSync } = require("node:fs");
            const ready = process.argv[1];
            const target = process.argv[2];
            const acknowledgement = process.argv[3];
            process.stdout.write("READY\\n");
            const deadline = Date.now() + 10000;
            while (Date.now() < deadline) {
              if (existsSync(ready)) {
                chmodSync(target, 0o755);
                writeFileSync(acknowledgement, "ack\\n", {
                  flag: "wx",
                  mode: 0o600
                });
                process.exit(0);
              }
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
            }
            process.exit(2);
          `,
          barrierReady,
          targetDirectory,
          barrierAck
        ], {
          stdio: ["ignore", "pipe", "pipe"]
        });
        const childClosed = once(mutator, "close");
        await once(mutator, "spawn");
        const [readyBytes] = await once(mutator.stdout, "data");
        assert.equal(readyBytes.toString("utf8"), "READY\n");

        assert.throws(() => launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        ));
        const [exitCode, signal] = await childClosed;
        assert.equal(exitCode, 0);
        assert.equal(signal, null);
        assert.equal(readFileSync(barrierReady, "utf8"), "ready\n");
        assert.equal(readFileSync(barrierAck, "utf8"), "ack\n");
        assert.equal(lstatSync(targetDirectory).mode & 0o7777, 0o755);
        assert.equal(
          existsSync(path.join(
            finalized.provisionRoot,
            ".mais-dependency-provision.json"
          )),
          true
        );
        assert.equal(
          existsSync(path.join(
            finalized.provisionRoot,
            "evidence",
            "source-package.json"
          )),
          true
        );
        assert.equal(
          existsSync(path.join(
            finalized.provisionRoot,
            "evidence",
            "source-install-input-manifest.json"
          )),
          false
        );
        assert.throws(() => launcherModule.prepareInitialProvisionLayout(
          liveHomeProof,
          finalized.attemptAuthority
        ));
        chmodSync(targetDirectory, 0o700);
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (mutator && mutator.exitCode === null) mutator.kill("SIGKILL");
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-layout-directory-drift-root")
          );
        }
      }
    });
  });
});

test("activation-lock finalization releases an armed layout barrier before prepare", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  const authorityModule = await import(
    "./required-browser-provision-attempt-authority.mjs"
  );

  await withFixtureAsync(async ({ capability, leaf }) => {
    const home = createHomeDirectory(leaf, "initial-layout-barrier-release-home");
    await withProcessEnvironmentAsync(ownHomeEnvironment(home), async () => {
      const liveHomeProof = liveHomeModule.createLiveHomeProof();
      const staticBinding =
        launcherModule.createRequiredBrowserProvisionBootstrapStaticBinding();
      const finalized = await finalizeInitialAttemptForTest(
        launcherModule,
        authorityModule,
        liveHomeProof,
        staticBinding,
        "initial-layout-barrier-release"
      );
      const attemptBinding =
        authorityModule.readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
          liveHomeProof,
          finalized.attemptAuthority
        );
      const activeLock = path.join(
        process.cwd(),
        ".tmp",
        ".mais-dependency-activation.lock"
      );
      const retainedLock = `${activeLock}.retained-${attemptBinding.attemptId}`;
      const activeCleanup = path.join(leaf, "barrier-release-active-lock.json");
      const retainedCleanup = path.join(leaf, "barrier-release-retained-lock.json");
      const readyPath = path.join(
        leaf,
        "required-browser-initial-layout-test-barrier.ready"
      );
      const ackPath = path.join(
        leaf,
        "required-browser-initial-layout-test-barrier.ack"
      );

      try {
        launcherModule.registerRequiredBrowserProvisionAttemptLaunchContext(
          liveHomeProof,
          finalized.attemptAuthority,
          finalized.attemptLaunchContext
        );
        launcherModule.acquireRequiredBrowserProvisionActivationLock(
          liveHomeProof,
          finalized.attemptAuthority
        );
        launcherModule.armRequiredBrowserInitialLayoutTestBarrier(
          capability,
          finalized.attemptAuthority
        );
        const release =
          launcherModule.finalizeRequiredBrowserProvisionActivationLock(
            liveHomeProof,
            finalized.attemptAuthority
          );
        assert.equal(release.state, "retained-released");
        assert.equal(existsSync(readyPath), false);
        assert.equal(existsSync(ackPath), false);
        assert.equal(
          readTestFixtureCapabilityView(capability).definition.leaf,
          leaf
        );
        assert.equal(existsSync(activeLock), false);
        assert.equal(existsSync(retainedLock), true);
      } finally {
        if (existsSync(activeLock)) renameSync(activeLock, activeCleanup);
        if (existsSync(retainedLock)) renameSync(retainedLock, retainedCleanup);
        if (existsSync(finalized.provisionRoot)) {
          renameSync(
            finalized.provisionRoot,
            path.join(leaf, "initial-layout-barrier-release-root")
          );
        }
      }
    });
  });
});

const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS_EXPECTED =
  Object.freeze([
    "discovery-exits-while-awaited",
    "fast-exit-before-identity",
    "pid-reused-before-term",
    "pid-reused-between-term-and-kill",
    "term-exits-cleanly",
    "term-timeout-kill-exits",
    "descendant-appears-between-term-and-kill",
    "descendant-survives-kill",
    "home-changed-before-spawn",
    "home-changed-after-spawn-before-postassert",
    "home-inherited-before-spawn",
    "home-accessor-before-spawn",
    "home-present-undefined-before-spawn",
    "home-nul-before-spawn"
  ]);

const SYNTHETIC_LIFECYCLE_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "fixtureSchemaVersion",
  "scenario",
  "lifecycleCode",
  "violationCode",
  "identityEstablished",
  "identityRevalidatedBeforeTerm",
  "identityRevalidatedBeforeKill",
  "termAttempted",
  "termSent",
  "killAttempted",
  "killSent",
  "rediscoveryCount",
  "survivorCount",
  "eventCodes",
  "spawnOccurred",
  "operationSucceeded",
  "rawHomeRetained",
  "signalAuthority"
]);

const SYNTHETIC_HOME_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "fixtureSchemaVersion",
  "scenario",
  "identityEstablished",
  "identityRevalidatedBeforeTerm",
  "identityRevalidatedBeforeKill",
  "termAttempted",
  "termSent",
  "killAttempted",
  "killSent",
  "rediscoveryCount",
  "survivorCount",
  "eventCodes",
  "spawnOccurred",
  "operationSucceeded",
  "rawHomeRetained",
  "signalAuthority"
]);

const SYNTHETIC_HOME_BEFORE_SPAWN_SCENARIOS = new Set([
  "home-changed-before-spawn",
  "home-inherited-before-spawn",
  "home-accessor-before-spawn",
  "home-present-undefined-before-spawn",
  "home-nul-before-spawn"
]);

const SYNTHETIC_HOME_SCENARIOS = new Set([
  ...SYNTHETIC_HOME_BEFORE_SPAWN_SCENARIOS,
  "home-changed-after-spawn-before-postassert"
]);

const SYNTHETIC_EVENT_CODES = new Set([
  "identity-established",
  "descendant-discovered",
  "wait",
  "timeout",
  "pre-term",
  "pre-kill",
  "final-survivor",
  "spawned",
  "postassert-rejected"
]);

const SYNTHETIC_LIFECYCLE_EXPECTATIONS = new Map([
  [
    "discovery-exits-while-awaited",
    {
      killSent: false,
      lifecycleCode: "exit-zero",
      operationSucceeded: true,
      spawnOccurred: true,
      termSent: false,
      violationCode: "none"
    }
  ],
  [
    "fast-exit-before-identity",
    {
      identityEstablished: false,
      killSent: false,
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      spawnOccurred: true,
      termSent: false,
      violationCode: "identity-mismatch"
    }
  ],
  [
    "pid-reused-before-term",
    {
      killSent: false,
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      spawnOccurred: true,
      termSent: false,
      violationCode: "identity-mismatch"
    }
  ],
  [
    "pid-reused-between-term-and-kill",
    {
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: true,
      killSent: false,
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      spawnOccurred: true,
      termSent: true,
      violationCode: "identity-mismatch"
    }
  ],
  [
    "term-exits-cleanly",
    {
      killSent: false,
      lifecycleCode: "reaped-after-term",
      operationSucceeded: true,
      spawnOccurred: true,
      termSent: true,
      violationCode: "none"
    }
  ],
  [
    "term-timeout-kill-exits",
    {
      killSent: true,
      lifecycleCode: "reaped-after-kill",
      operationSucceeded: true,
      spawnOccurred: true,
      termSent: true,
      violationCode: "none"
    }
  ],
  [
    "descendant-appears-between-term-and-kill",
    {
      identityEstablished: true,
      identityRevalidatedBeforeKill: true,
      identityRevalidatedBeforeTerm: true,
      killSent: true,
      lifecycleCode: "reaped-after-kill",
      minimumRediscoveryCount: 1,
      operationSucceeded: true,
      spawnOccurred: true,
      termSent: true,
      violationCode: "none"
    }
  ],
  [
    "descendant-survives-kill",
    {
      killSent: true,
      lifecycleCode: "survivor-after-kill",
      minimumSurvivorCount: 1,
      operationSucceeded: false,
      spawnOccurred: true,
      termSent: true,
      violationCode: "survivor"
    }
  ]
]);

function zeroTrapProxy(target, message) {
  let trapCalls = 0;
  const rejectTrap = () => {
    trapCalls += 1;
    throw new Error(message);
  };
  return {
    proxy: new Proxy(target, {
      defineProperty: rejectTrap,
      deleteProperty: rejectTrap,
      get: rejectTrap,
      getOwnPropertyDescriptor: rejectTrap,
      getPrototypeOf: rejectTrap,
      has: rejectTrap,
      isExtensible: rejectTrap,
      ownKeys: rejectTrap,
      preventExtensions: rejectTrap,
      set: rejectTrap,
      setPrototypeOf: rejectTrap
    }),
    trapCalls: () => trapCalls
  };
}

function frozenNullRecordClone(value) {
  const clone = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    Object.defineProperty(clone, key, {
      configurable: false,
      enumerable: true,
      value: value[key],
      writable: false
    });
  }
  return Object.freeze(clone);
}

function assertSyntheticLifecycleResult(
  result,
  scenario,
  assertRegisteredResult
) {
  assertDenseFrozenCatalogData(result);
  assert.deepEqual(
    Reflect.ownKeys(result),
    SYNTHETIC_LIFECYCLE_RESULT_KEYS
  );
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.fixtureSchemaVersion, 2);
  assert.equal(result.scenario, scenario);
  assert.equal(result.rawHomeRetained, false);
  assert.equal(result.signalAuthority, false);
  for (const booleanKey of [
    "identityEstablished",
    "identityRevalidatedBeforeTerm",
    "identityRevalidatedBeforeKill",
    "termAttempted",
    "termSent",
    "killAttempted",
    "killSent",
    "spawnOccurred",
    "operationSucceeded"
  ]) {
    assert.equal(typeof result[booleanKey], "boolean");
  }
  for (const countKey of ["rediscoveryCount", "survivorCount"]) {
    assert.equal(Number.isSafeInteger(result[countKey]), true);
    assert.ok(result[countKey] >= 0);
  }
  for (const eventCode of result.eventCodes) {
    assert.equal(SYNTHETIC_EVENT_CODES.has(eventCode), true);
  }
  if (result.termSent) {
    assert.equal(result.termAttempted, true);
    assert.equal(result.identityEstablished, true);
    assert.equal(result.identityRevalidatedBeforeTerm, true);
  }
  if (result.killSent) {
    assert.equal(result.killAttempted, true);
    assert.equal(result.termSent, true);
    assert.equal(result.identityRevalidatedBeforeKill, true);
  }

  const expected = SYNTHETIC_LIFECYCLE_EXPECTATIONS.get(scenario);
  assert.ok(expected);
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (key === "minimumRediscoveryCount") {
      assert.ok(result.rediscoveryCount >= expectedValue);
    } else if (key === "minimumSurvivorCount") {
      assert.ok(result.survivorCount >= expectedValue);
    } else {
      assert.equal(result[key], expectedValue);
    }
  }
  assert.equal(assertRegisteredResult(result), undefined);
}

function assertSyntheticHomeResult(result, scenario, assertRegisteredResult) {
  assertDenseFrozenCatalogData(result);
  assert.deepEqual(Reflect.ownKeys(result), SYNTHETIC_HOME_RESULT_KEYS);
  assert.equal(Object.hasOwn(result, "lifecycleCode"), false);
  assert.equal(Object.hasOwn(result, "violationCode"), false);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.fixtureSchemaVersion, 2);
  assert.equal(result.scenario, scenario);
  assert.equal(result.rawHomeRetained, false);
  assert.equal(result.signalAuthority, false);
  assert.equal(result.operationSucceeded, false);
  assert.equal(result.termAttempted, false);
  assert.equal(result.termSent, false);
  assert.equal(result.killAttempted, false);
  assert.equal(result.killSent, false);
  for (const booleanKey of [
    "identityEstablished",
    "identityRevalidatedBeforeTerm",
    "identityRevalidatedBeforeKill",
    "spawnOccurred"
  ]) {
    assert.equal(typeof result[booleanKey], "boolean");
  }
  for (const countKey of ["rediscoveryCount", "survivorCount"]) {
    assert.equal(Number.isSafeInteger(result[countKey]), true);
    assert.ok(result[countKey] >= 0);
  }
  for (const eventCode of result.eventCodes) {
    assert.equal(SYNTHETIC_EVENT_CODES.has(eventCode), true);
  }

  if (SYNTHETIC_HOME_BEFORE_SPAWN_SCENARIOS.has(scenario)) {
    assert.equal(result.spawnOccurred, false);
    assert.equal(result.eventCodes.includes("spawned"), false);
    assert.equal(result.eventCodes.includes("postassert-rejected"), false);
  } else {
    assert.equal(scenario, "home-changed-after-spawn-before-postassert");
    assert.equal(result.spawnOccurred, true);
    const spawnedIndex = result.eventCodes.indexOf("spawned");
    const rejectedIndex = result.eventCodes.indexOf("postassert-rejected");
    assert.ok(spawnedIndex >= 0);
    assert.ok(rejectedIndex > spawnedIndex);
  }
  assert.equal(assertRegisteredResult(result), undefined);
}

test("owned-process launcher exposes a nominal exact14 synthetic lifecycle seam", async () => {
  const launcherModule = await import("./required-browser-owned-process-launch.mjs");
  assert.equal(
    Object.hasOwn(
      launcherModule,
      "REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS"
    ),
    true
  );
  for (const functionName of [
    "createRequiredBrowserSyntheticLifecycleTestCapability",
    "runRequiredBrowserSyntheticLifecycleTestScenario",
    "assertRequiredBrowserSyntheticLifecycleTestResult"
  ]) {
    assert.equal(Object.hasOwn(launcherModule, functionName), true);
    assert.equal(typeof launcherModule[functionName], "function");
  }

  const scenarios =
    launcherModule.REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS;
  assertDenseFrozenCatalogData(scenarios);
  assert.deepEqual(
    scenarios,
    REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS_EXPECTED
  );
  assert.equal(new Set(scenarios).size, 14);

  const createSyntheticCapability =
    launcherModule.createRequiredBrowserSyntheticLifecycleTestCapability;
  const runSyntheticScenario =
    launcherModule.runRequiredBrowserSyntheticLifecycleTestScenario;
  const assertRegisteredResult =
    launcherModule.assertRequiredBrowserSyntheticLifecycleTestResult;

  withFixture(({ capability: fixtureCapability, view: fixtureView }) => {
    const syntheticCapability = createSyntheticCapability(fixtureCapability);
    assert.equal(Object.getPrototypeOf(syntheticCapability), null);
    assert.deepEqual(Reflect.ownKeys(syntheticCapability), []);
    assert.equal(Object.isFrozen(syntheticCapability), true);
    assert.equal(utilTypes.isProxy(syntheticCapability), false);

    assert.throws(() => readTestFixtureCapabilityView(fixtureCapability));
    assert.throws(() => createSyntheticCapability(fixtureCapability));
    assert.throws(() => createSyntheticCapability(fixtureView));
    assert.throws(() => createSyntheticCapability(syntheticCapability));

    const syntheticClone = Object.freeze(Object.create(null));
    const fixtureProxyState = zeroTrapProxy(
      fixtureCapability,
      "fixture proxy trap must not run"
    );
    const syntheticProxyState = zeroTrapProxy(
      syntheticCapability,
      "synthetic proxy trap must not run"
    );
    assert.throws(() => createSyntheticCapability(fixtureProxyState.proxy));
    assert.equal(fixtureProxyState.trapCalls(), 0);
    assert.throws(() => runSyntheticScenario(
      fixtureCapability,
      scenarios[0]
    ));
    assert.throws(() => runSyntheticScenario(fixtureView, scenarios[0]));
    assert.throws(() => runSyntheticScenario(syntheticClone, scenarios[0]));
    assert.throws(() => runSyntheticScenario(
      syntheticProxyState.proxy,
      scenarios[0]
    ));
    assert.equal(syntheticProxyState.trapCalls(), 0);
    for (const nonResult of [
      fixtureCapability,
      fixtureView,
      syntheticCapability,
      syntheticClone
    ]) {
      assert.throws(() => assertRegisteredResult(nonResult));
    }

    const executionOrder = [
      "home-nul-before-spawn",
      "term-exits-cleanly",
      "discovery-exits-while-awaited",
      "home-changed-after-spawn-before-postassert",
      "descendant-survives-kill",
      "home-inherited-before-spawn",
      "pid-reused-between-term-and-kill",
      "term-timeout-kill-exits",
      "home-accessor-before-spawn",
      "descendant-appears-between-term-and-kill",
      "fast-exit-before-identity",
      "home-present-undefined-before-spawn",
      "pid-reused-before-term",
      "home-changed-before-spawn"
    ];
    assert.equal(new Set(executionOrder).size, 14);
    assert.deepEqual(
      [...executionOrder].sort(codeUnitCompare),
      [...scenarios].sort(codeUnitCompare)
    );

    const executed = new Set();
    const results = new Map();
    try {
      for (const scenario of executionOrder) {
        const result = runSyntheticScenario(syntheticCapability, scenario);
        executed.add(scenario);
        results.set(scenario, result);
        if (SYNTHETIC_HOME_SCENARIOS.has(scenario)) {
          assertSyntheticHomeResult(result, scenario, assertRegisteredResult);
        } else {
          assertSyntheticLifecycleResult(
            result,
            scenario,
            assertRegisteredResult
          );
        }
        if (executed.size === 1) {
          assert.throws(() => runSyntheticScenario(
            syntheticCapability,
            scenario
          ));
        }
      }
    } finally {
      for (const scenario of scenarios) {
        if (!executed.has(scenario)) {
          try {
            runSyntheticScenario(syntheticCapability, scenario);
            executed.add(scenario);
          } catch {
            // The launcher must release the fixture itself on uncertainty.
          }
        }
      }
    }

    assert.equal(results.size, 14);
    assert.throws(() => runSyntheticScenario(
      syntheticCapability,
      scenarios[0]
    ));
    const releasedView = readTestFixtureCapabilityView(fixtureCapability);
    assert.deepEqual(releasedView, fixtureView);

    for (const result of results.values()) {
      assert.equal(assertRegisteredResult(result), undefined);
    }
    const registeredResult = results.get("discovery-exits-while-awaited");
    assert.ok(registeredResult);
    assert.throws(() => assertRegisteredResult({ ...registeredResult }));
    assert.throws(() => assertRegisteredResult(
      frozenNullRecordClone(registeredResult)
    ));
    assert.throws(() => assertRegisteredResult(
      structuredClone(registeredResult)
    ));
    const resultProxyState = zeroTrapProxy(
      registeredResult,
      "synthetic result proxy trap must not run"
    );
    assert.throws(() => assertRegisteredResult(resultProxyState.proxy));
    assert.equal(resultProxyState.trapCalls(), 0);
  });
});
