import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";

import {
  activatePhysicalNodeModules,
  attestPhysicalDependencyTree,
  buildInstallOnlyManifest,
  buildProvisionEnvironment,
  buildDependencyFailureSummary,
  compareInstalledLockToSource,
  copyConfinedNpmCache,
  createProvisionLayout,
  discoverUniqueConfinedCacheSeed,
  inventoryConfinedNpmCache,
  normalizeConfinedNpmDebugLogs,
  runOwnedSubprocess,
  scanLocalDependencyReferences,
  summarizeNpmProcessOutcome,
  validateConfinedCacheSeed,
  validateCompletedInstallFailureAttestation,
  validateCriticalLockContract
} from "./provision-exact-browser-dependencies.mjs";
import * as provisioner from "./provision-exact-browser-dependencies.mjs";

import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";
import {
  validateCacheSeedAncestorObservation,
  validateConfinedCacheEntryObservation,
  validatePhysicalDependencyEntryObservation,
  validatePhysicalDependencyHardlinkClosure
} from "./provision-exact-browser-dependencies.mjs";

const repoRoot = process.cwd();
const packageManifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const lockfile = JSON.parse(readFileSync(join(repoRoot, "package-lock.json"), "utf8"));

function fixture(prefix) {
  const capability = createTestFixtureCapability(realpathSync(repoRoot));
  const root = join(
    readTestFixtureCapabilityView(capability).definition.leaf,
    prefix.replace(/-+$/, "")
  );
  mkdirSync(root, { mode: 0o700 });
  return Object.freeze({
    capability,
    cleanup() {
      return removeTestFixtureCapability(capability);
    },
    root
  });
}

function confinedTestChildEnvironment(root, additions = {}) {
  const writableRoot = join(root, "child-environment");
  const paths = {
    cache: join(writableRoot, "cache"),
    config: join(writableRoot, "config"),
    data: join(writableRoot, "data"),
    home: join(writableRoot, "home"),
    logs: join(writableRoot, "logs"),
    nodeCompileCache: join(writableRoot, "node-compile-cache"),
    state: join(writableRoot, "state"),
    temp: join(writableRoot, "temp")
  };
  for (const directory of Object.values(paths)) {
    mkdirSync(directory, { mode: 0o700, recursive: true });
  }
  const environment = {};
  for (const key of ["LANG", "LC_ALL", "PATH", "SHELL", "TZ"]) {
    if (typeof process.env[key] === "string") environment[key] = process.env[key];
  }
  return Object.freeze({
    ...environment,
    HOME: paths.home,
    NODE_COMPILE_CACHE: paths.nodeCompileCache,
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_CACHE: paths.cache,
    NPM_CONFIG_FUND: "false",
    NPM_CONFIG_LOGS_DIR: paths.logs,
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    NPM_CONFIG_USERCONFIG: join(paths.config, "npmrc"),
    PLAYWRIGHT_BROWSERS_PATH: join(paths.cache, "playwright"),
    TEMP: paths.temp,
    TMP: paths.temp,
    TMPDIR: paths.temp,
    XDG_CACHE_HOME: paths.cache,
    XDG_CONFIG_HOME: paths.config,
    XDG_DATA_HOME: paths.data,
    XDG_STATE_HOME: paths.state,
    ...additions
  });
}

test("install-only manifest preserves the exact dependency/workspace contract and removes lifecycle scripts", () => {
  assert.deepEqual(scanLocalDependencyReferences(packageManifest, lockfile), []);
  const installManifest = buildInstallOnlyManifest(packageManifest);
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "bundledDependencies",
    "bundleDependencies",
    "overrides",
    "resolutions",
    "workspaces"
  ]) {
    assert.deepEqual(installManifest[field], packageManifest[field], field);
  }
  assert.deepEqual(installManifest.scripts, {});
  assert.equal("preinstall" in installManifest.scripts, false);
  assert.equal("install" in installManifest.scripts, false);
  assert.equal("postinstall" in installManifest.scripts, false);
  assert.equal("prepare" in installManifest.scripts, false);

  assert.deepEqual(scanLocalDependencyReferences(
    { dependencies: { unsafe: "file:../unsafe" } },
    { packages: { "": { dependencies: { unsafe: "file:../unsafe" } } } }
  ).map(({ section, valueKind }) => ({ section, valueKind })), [
    { section: "dependencies", valueKind: "file" },
    { section: "dependencies", valueKind: "file" }
  ]);
});

test("approved package and lock bind exact Next, PostCSS, and Playwright versions with integrity", () => {
  assert.deepEqual(validateCriticalLockContract(packageManifest, lockfile), {
    criticalVersions: {
      "@playwright/test": "1.59.1",
      next: "15.5.23",
      playwright: "1.59.1",
      postcss: "8.5.26"
    },
    lockfileVersion: 3
  });
  const drifted = structuredClone(lockfile);
  drifted.packages["node_modules/next"].version = "15.5.20";
  assert.throws(
    () => validateCriticalLockContract(packageManifest, drifted),
    /critical|exact|next|version/i
  );
});

test("installed-lock comparison rejects extras and integrity drift and only permits incompatible optional omissions", () => {
  const source = {
    packages: {
      "": {
        dependencies: { a: "1.0.0" },
        optionalDependencies: { "optional-linux": "1.0.0" }
      },
      "node_modules/a": { integrity: "sha512-a", resolved: "https://registry/a", version: "1.0.0" },
      "node_modules/optional-linux": {
        integrity: "sha512-linux",
        optional: true,
        os: ["linux"],
        resolved: "https://registry/linux",
        version: "1.0.0"
      }
    }
  };
  const installed = {
    packages: {
      "": {},
      "node_modules/a": { integrity: "sha512-a", resolved: "https://registry/a", version: "1.0.0" }
    }
  };
  const comparison = compareInstalledLockToSource(source, installed, {
    arch: "arm64",
    platform: "darwin"
  });
  assert.equal(comparison.compared, 1);
  assert.deepEqual(comparison.mismatches, []);
  assert.equal(comparison.optionalPlatformOmissions, 1);
  assert.deepEqual(comparison.omittedPlatform.closure, ["node_modules/optional-linux"]);
  assert.equal(comparison.omittedPlatform.roots[0].selector, "1.0.0");
  assert.deepEqual(comparison.omittedPlatform.roots[0].excludedBy, ["os"]);
  assert.deepEqual(comparison.platform, { arch: "arm64", libc: null, platform: "darwin" });
  const drifted = structuredClone(installed);
  drifted.packages["node_modules/a"].integrity = "sha512-wrong";
  drifted.packages["node_modules/extra"] = { version: "9.0.0" };
  assert.deepEqual(
    compareInstalledLockToSource(source, drifted, { arch: "arm64", platform: "darwin" }).mismatches,
    [
      { packagePath: "node_modules/a", reason: "integrity-mismatch" },
      { packagePath: "node_modules/extra", reason: "extraneous-installed-entry" }
    ]
  );
});

test("installed-lock comparison permits only the transitive closure of an omitted platform-optional package", () => {
  const source = {
    packages: {
      "": { optionalDependencies: { "optional-linux": "1.0.0" } },
      "node_modules/optional-linux": {
        dependencies: { "optional-runtime": "1.0.0" },
        integrity: "sha512-linux",
        optional: true,
        os: ["linux"],
        resolved: "https://registry/linux",
        version: "1.0.0"
      },
      "node_modules/optional-runtime": {
        integrity: "sha512-runtime",
        optional: true,
        resolved: "https://registry/runtime",
        version: "1.0.0"
      }
    }
  };
  const installed = { packages: { "": {} } };

  const omitted = compareInstalledLockToSource(source, installed, {
    arch: "arm64",
    platform: "darwin"
  });
  assert.equal(omitted.compared, 0);
  assert.deepEqual(omitted.mismatches, []);
  assert.equal(omitted.optionalPlatformOmissions, 2);
  assert.deepEqual(omitted.omittedPlatform.closure, [
    "node_modules/optional-linux",
    "node_modules/optional-runtime"
  ]);

  const alsoRequired = structuredClone(source);
  alsoRequired.packages[""].dependencies = { "required-parent": "1.0.0" };
  alsoRequired.packages["node_modules/required-parent"] = {
    dependencies: { "optional-runtime": "1.0.0" },
    integrity: "sha512-parent",
    resolved: "https://registry/parent",
    version: "1.0.0"
  };
  const installedWithRequiredParent = structuredClone(installed);
  installedWithRequiredParent.packages["node_modules/required-parent"] =
    structuredClone(alsoRequired.packages["node_modules/required-parent"]);

  assert.deepEqual(compareInstalledLockToSource(
    alsoRequired,
    installedWithRequiredParent,
    { arch: "arm64", platform: "darwin" }
  ).mismatches, [{
    packagePath: "node_modules/optional-runtime",
    reason: "unexpected-missing-entry"
  }]);
});

test("platform pruning requires exact positive and negative os, cpu, and libc selectors", () => {
  const omittedNames = [
    "os-positive",
    "os-negative",
    "cpu-positive",
    "cpu-negative",
    "libc-positive",
    "libc-negative"
  ];
  const optionalDependencies = Object.fromEntries([
    ...omittedNames,
    "compatible",
    "selectorless"
  ].map((name) => [name, "1.0.0"]));
  const optionalEntry = (extra = {}) => ({
    integrity: "sha512-optional",
    optional: true,
    resolved: "https://registry/optional",
    version: "1.0.0",
    ...extra
  });
  const source = {
    packages: {
      "": { optionalDependencies },
      "node_modules/os-positive": optionalEntry({ os: ["darwin"] }),
      "node_modules/os-negative": optionalEntry({ os: ["!linux"] }),
      "node_modules/cpu-positive": optionalEntry({ cpu: ["arm64"] }),
      "node_modules/cpu-negative": optionalEntry({ cpu: ["!x64"] }),
      "node_modules/libc-positive": optionalEntry({ libc: ["musl"] }),
      "node_modules/libc-negative": optionalEntry({ libc: ["!glibc"] }),
      "node_modules/compatible": optionalEntry({ cpu: ["x64"], libc: ["glibc"], os: ["linux"] }),
      "node_modules/selectorless": optionalEntry()
    }
  };
  const comparison = compareInstalledLockToSource(
    source,
    { packages: { "": {} } },
    { arch: "x64", libc: "glibc", platform: "linux" }
  );

  assert.deepEqual(comparison.omittedPlatform.closure, omittedNames
    .map((name) => `node_modules/${name}`)
    .sort());
  assert.deepEqual(comparison.mismatches, [
    { packagePath: "node_modules/compatible", reason: "unexpected-missing-entry" },
    { packagePath: "node_modules/selectorless", reason: "unexpected-missing-entry" }
  ]);
  assert.deepEqual(comparison.platform, { arch: "x64", libc: "glibc", platform: "linux" });
});

test("exact lock graph resolves duplicate instances and terminates optional cycles", () => {
  const source = {
    packages: {
      "": {
        dependencies: { parent: "1.0.0", shared: "1.0.0" },
        optionalDependencies: { "cycle-a": "1.0.0" }
      },
      "node_modules/parent": {
        optionalDependencies: { shared: "2.0.0" },
        version: "1.0.0"
      },
      "node_modules/shared": { version: "1.0.0" },
      "node_modules/parent/node_modules/shared": {
        optional: true,
        os: ["darwin"],
        version: "2.0.0"
      },
      "node_modules/cycle-a": {
        dependencies: { "cycle-b": "1.0.0" },
        optional: true,
        os: ["darwin"],
        version: "1.0.0"
      },
      "node_modules/cycle-b": {
        dependencies: { "cycle-a": "1.0.0" },
        optional: true,
        version: "1.0.0"
      }
    }
  };
  const installed = {
    packages: {
      "": {},
      "node_modules/parent": structuredClone(source.packages["node_modules/parent"]),
      "node_modules/shared": structuredClone(source.packages["node_modules/shared"])
    }
  };
  const comparison = compareInstalledLockToSource(
    source,
    installed,
    { arch: "x64", libc: "glibc", platform: "linux" }
  );

  assert.deepEqual(comparison.mismatches, []);
  assert.deepEqual(comparison.omittedPlatform.closure, [
    "node_modules/cycle-a",
    "node_modules/cycle-b",
    "node_modules/parent/node_modules/shared"
  ]);
  assert.equal(comparison.omittedPlatform.roots.some((root) =>
    root.packagePath === "node_modules/parent/node_modules/shared" &&
    root.parentPath === "node_modules/parent"
  ), true);
});

test("required peers, unresolved required edges, and retained required packages fail closed", () => {
  const source = {
    packages: {
      "": {
        dependencies: {
          ghost: "1.0.0",
          "host-optional": "1.0.0",
          "host-required": "1.0.0",
          "required-missing": "1.0.0"
        }
      },
      "node_modules/host-required": {
        peerDependencies: { "peer-required": "^1.0.0" },
        version: "1.0.0"
      },
      "node_modules/host-optional": {
        peerDependencies: {
          "peer-optional": "^1.0.0",
          "peer-unmaterialized": "^1.0.0"
        },
        peerDependenciesMeta: {
          "peer-optional": { optional: true },
          "peer-unmaterialized": { optional: true }
        },
        version: "1.0.0"
      },
      "node_modules/peer-required": { version: "1.0.0" },
      "node_modules/peer-optional": {
        optional: true,
        os: ["darwin"],
        version: "1.0.0"
      },
      "node_modules/required-missing": { version: "1.0.0" }
    }
  };
  const installed = {
    packages: {
      "": {},
      "node_modules/host-required": structuredClone(source.packages["node_modules/host-required"]),
      "node_modules/host-optional": structuredClone(source.packages["node_modules/host-optional"])
    }
  };
  const comparison = compareInstalledLockToSource(
    source,
    installed,
    { arch: "x64", libc: "glibc", platform: "linux" }
  );

  assert.equal(comparison.mismatches.some((mismatch) =>
    mismatch.reason === "unresolved-lock-edge" && mismatch.dependencyName === "ghost"
  ), true);
  assert.equal(comparison.mismatches.some((mismatch) =>
    mismatch.reason === "unexpected-missing-entry" &&
    mismatch.packagePath === "node_modules/peer-required"
  ), true);
  assert.equal(comparison.mismatches.some((mismatch) =>
    mismatch.reason === "unexpected-missing-entry" &&
    mismatch.packagePath === "node_modules/required-missing"
  ), true);
  assert.deepEqual(comparison.omittedPlatform.closure, ["node_modules/peer-optional"]);
  assert.equal(comparison.unmaterializedOptionalPeers.length, 1);
  assert.equal(comparison.unmaterializedOptionalPeers[0].dependencyName, "peer-unmaterialized");
});

test("physical dependency tree attestation binds content, contained links, ownership, and inode closure", () => {
  const scope = fixture("physical-tree-");
  const root = scope.root;
  try {
    mkdirSync(join(root, "package"), { mode: 0o700 });
    writeFileSync(join(root, "package", "index.js"), "export default 1;\n", { mode: 0o600 });
    writeFileSync(join(root, "package", "contained-hardlink"), "same inode\n", { mode: 0o600 });
    linkSync(
      join(root, "package", "contained-hardlink"),
      join(root, "package", "contained-hardlink-copy")
    );
    symlinkSync("package/index.js", join(root, "package-cli"));

    const proof = attestPhysicalDependencyTree(root);
    assert.equal(proof.proof.directoryCount, 1);
    assert.equal(proof.proof.fileCount, 3);
    assert.equal(proof.proof.symlinkCount, 1);
    assert.equal(proof.proof.hardlinkGroupCount, 1);
    assert.match(proof.proof.inventorySha256, /^[a-f0-9]{64}$/);

    assert.throws(
      () => validatePhysicalDependencyEntryObservation({
        kind: "symlink",
        mode: 0o777,
        ownerMatches: true,
        symlinkContained: false
      }),
      /symlink|escaped|root/i
    );
    assert.throws(
      () => validatePhysicalDependencyHardlinkClosure([{ nlink: 2, observed: 1 }]),
      /hardlink|unconfined/i
    );
    assert.throws(
      () => validatePhysicalDependencyEntryObservation({
        kind: "file",
        mode: 0o666,
        ownerMatches: true
      }),
      /writable|permissions/i
    );
  } finally {
    scope.cleanup();
  }
});

test("completed-install requalification accepts only the sole clean ci0 attestation shape", () => {
  const processSummary = (phase) => ({
    completionReason: "exit-zero",
    endedAtObserved: true,
    exitStatus: 0,
    identityEstablished: true,
    networkCode: null,
    outputOverflow: false,
    phase,
    processOutcome: {
      survivorCount: 0,
      termination: { killSent: false, termSent: false }
    },
    signal: null,
    timedOut: false
  });
  const failure = {
    cache: {
      provenance: "byte-copied-verified-cache",
      seed: { status: "byte-copied-and-revalidated" }
    },
    failure: {
      failedPhase: "staged-tree-attestation",
      failureCode: "DEPENDENCY_ATTESTATION_FAILED",
      networkCode: null,
      subprocesses: [
        processSummary("npm-cache-verify"),
        processSummary("npm-ci-prefer-offline")
      ]
    },
    failureCode: "DEPENDENCY_ATTESTATION_FAILED",
    rollbackRestored: true,
    schemaVersion: 1,
    status: "failed"
  };
  assert.deepEqual(validateCompletedInstallFailureAttestation(failure), {
    failedPhase: "staged-tree-attestation",
    failureCode: "DEPENDENCY_ATTESTATION_FAILED",
    subprocessPhases: ["npm-cache-verify", "npm-ci-prefer-offline"]
  });
  for (const mutate of [
    (candidate) => { candidate.failure.subprocesses[1].exitStatus = 1; },
    (candidate) => { candidate.failure.subprocesses[1].processOutcome.survivorCount = 1; },
    (candidate) => { candidate.failure.subprocesses[1].processOutcome.termination.termSent = true; },
    (candidate) => { candidate.failure.failedPhase = "npm-ci-prefer-offline"; },
    (candidate) => { candidate.rollbackRestored = false; }
  ]) {
    const candidate = structuredClone(failure);
    mutate(candidate);
    assert.throws(
      () => validateCompletedInstallFailureAttestation(candidate),
      /clean ci0|requalification/i
    );
  }
});

test("provision child environment drops ambient config/secrets, preserves HOME, and binds every writable path", () => {
  const scope = fixture("environment-");
  const root = scope.root;
  try {
    const built = buildProvisionEnvironment({
      HOME: "/ambient/home",
      NODE_OPTIONS: "--require=/unsafe/hook.js",
      NPM_CONFIG_CACHE: "/ambient/npm-cache",
      PATH: "/unsafe/path",
      SECRET_TOKEN: "do-not-forward",
      USER: "owner"
    }, root, process.execPath, "a".repeat(64));
    assert.equal(built.environment.HOME, "/ambient/home");
    assert.notEqual(built.environment.NODE_OPTIONS, "--require=/unsafe/hook.js");
    assert.equal("SECRET_TOKEN" in built.environment, false);
    assert.equal(built.environment.NPM_CONFIG_CACHE.startsWith(`${root}/`), true);
    assert.equal(built.environment.NPM_CONFIG_FETCH_RETRIES, "8");
    assert.equal(built.environment.NPM_CONFIG_FETCH_RETRY_FACTOR, "2");
    assert.equal(built.environment.NPM_CONFIG_FETCH_RETRY_MINTIMEOUT, "3000");
    assert.equal(built.environment.NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT, "60000");
    assert.equal(built.environment.NPM_CONFIG_FETCH_TIMEOUT, "300000");
    assert.equal(built.environment.NPM_CONFIG_MAXSOCKETS, "1");
    assert.equal(built.environment.NPM_CONFIG_REGISTRY, "https://registry.npmjs.org/");
    assert.equal(built.environment.NODE_OPTIONS, "--dns-result-order=ipv4first");
    assert.equal("NPM_CONFIG_PROXY" in built.environment, false);
    assert.equal(built.environment.TMPDIR.startsWith(`${root}/`), true);
    assert.equal(built.environment.XDG_CONFIG_HOME.startsWith(`${root}/`), true);
    assert.equal(built.environment.PLAYWRIGHT_BROWSERS_PATH.startsWith(`${root}/`), true);
    assert.equal(built.environment.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD, "1");
    assert.equal(built.environment.NEXT_TELEMETRY_DISABLED, "1");
    assert.equal(built.environment.TURBO_TELEMETRY_DISABLED, "1");
    assert.equal(Object.values(built.paths).every((value) => value.startsWith(`${root}/`)), true);
  } finally {
    scope.cleanup();
  }
});

test("npm-created debug logs are sanitized and normalized to 0600 before retention", () => {
  const scope = fixture("npm-debug-log-");
  const root = scope.root;
  try {
    const logs = join(root, "logs");
    mkdirSync(logs, { mode: 0o700 });
    const debugLog = join(logs, "2026-08-11T15_04_08_174Z-debug-0.log");
    writeFileSync(
      debugLog,
      "fetch https://registry.example.invalid/pkg token=sk_live_secret_123\n",
      { encoding: "utf8", mode: 0o644 }
    );
    chmodSync(debugLog, 0o644);

    const proof = normalizeConfinedNpmDebugLogs(logs);

    assert.equal(statSync(debugLog).mode & 0o777, 0o600);
    const retained = readFileSync(debugLog, "utf8");
    assert.doesNotMatch(retained, /https?:\/\//);
    assert.doesNotMatch(retained, /sk_live|secret_123/);
    assert.deepEqual(proof, {
      count: 1,
      files: [{
        bytes: Buffer.byteLength(retained),
        label: "npm-debug-log",
        sha256: proof.files[0].sha256,
        truncated: false
      }]
    });
    assert.match(proof.files[0].sha256, /^[a-f0-9]{64}$/);
  } finally {
    scope.cleanup();
  }
});

test("npm failure summary retains bounded process and retry facts without raw output", () => {
  const summary = summarizeNpmProcessOutcome("npm-ci", {
    endedAt: "2026-08-11T15:19:56.112Z",
    endedAtObserved: true,
    error: null,
    identityEstablished: true,
    log: { bytes: 123, sha256: "a".repeat(64), truncated: false },
    outputOverflow: false,
    signal: null,
    startedAt: "2026-08-11T15:04:08.000Z",
    status: 1,
    stderr: "npm error code ECONNRESET https://registry.example.invalid sk_live_secret_123",
    stdout: "",
    survivorCount: 0,
    termination: { killSent: false, termSent: false },
    timedOut: false
  }, {
    factor: 2,
    fetchTimeoutMs: 300000,
    maxTimeoutMs: 60000,
    maxSockets: 1,
    minTimeoutMs: 3000,
    retries: 8
  });

  assert.equal(summary.phase, "npm-ci");
  assert.equal(summary.completionReason, "exit-nonzero");
  assert.equal(summary.networkCode, "ECONNRESET");
  assert.equal(summary.exitStatus, 1);
  assert.equal(summary.endedAtObserved, true);
  assert.equal(summary.processOutcome.survivorCount, 0);
  assert.equal(summary.retryPolicy.retries, 8);
  assert.deepEqual(Object.keys(summary).sort(), [
    "completionReason",
    "debugLogs",
    "endedAt",
    "endedAtObserved",
    "exitStatus",
    "identityEstablished",
    "log",
    "networkCode",
    "outputOverflow",
    "phase",
    "processOutcome",
    "retryPolicy",
    "signal",
    "startedAt",
    "timedOut"
  ]);
  assert.doesNotMatch(JSON.stringify(summary), /https?:\/\/|sk_live|secret_123/);
});

test("fresh provision layout authenticates an empty confined cache before npm can write", () => {
  const scope = fixture("cache-marker-");
  const parent = scope.root;
  const provisionRoot = join(parent, `dependency-provision-${"d".repeat(64)}`);
  try {
    const preflight = {
      nonce: "d".repeat(64),
      provisionRoot,
      repoRoot,
      source: {
        packageLockSha256: "1".repeat(64),
        packageSha256: "2".repeat(64)
      }
    };
    const directories = createProvisionLayout(preflight);
    assert.deepEqual(readdirSync(directories.npmCache), [".mais-dependency-cache.json"]);
    const cacheMarker = join(directories.npmCache, ".mais-dependency-cache.json");
    assert.equal(statSync(cacheMarker).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(readFileSync(cacheMarker, "utf8")), {
      cachePath: directories.npmCache,
      nonce: preflight.nonce,
      packageLockSha256: preflight.source.packageLockSha256,
      packageSha256: preflight.source.packageSha256,
      repoRoot,
      schemaVersion: 1,
      status: "fresh"
    });
  } finally {
    scope.cleanup();
  }
});

test("seeded provision layout binds its pre-copy cache marker to source attempt and frozen manifest", () => {
  const scope = fixture("seeded-cache-marker-");
  const parent = scope.root;
  const provisionRoot = join(parent, `dependency-provision-${"9".repeat(64)}`);
  try {
    const preflight = {
      nonce: "9".repeat(64),
      provisionRoot,
      repoRoot,
      source: {
        packageLockSha256: "3".repeat(64),
        packageSha256: "4".repeat(64)
      }
    };
    const cacheSeedBinding = {
      sourceAttemptId: `sha256:${"5".repeat(64)}`,
      sourceManifestSha256: "6".repeat(64)
    };
    const directories = createProvisionLayout(preflight, { cacheSeedBinding });
    assert.deepEqual(JSON.parse(readFileSync(
      join(directories.npmCache, ".mais-dependency-cache.json"),
      "utf8"
    )), {
      cachePath: directories.npmCache,
      nonce: preflight.nonce,
      packageLockSha256: preflight.source.packageLockSha256,
      packageSha256: preflight.source.packageSha256,
      repoRoot,
      schemaVersion: 1,
      sourceAttemptId: cacheSeedBinding.sourceAttemptId,
      sourceManifestSha256: cacheSeedBinding.sourceManifestSha256,
      status: "seed-destination"
    });
  } finally {
    scope.cleanup();
  }
});

test("dependency failure summary carries the exact failed phase and sanitized subprocess facts", () => {
  const subprocess = summarizeNpmProcessOutcome("npm-ci-prefer-offline", {
    endedAt: "2026-08-11T15:19:56.112Z",
    endedAtObserved: true,
    identityEstablished: true,
    log: { bytes: 12, sha256: "b".repeat(64), truncated: false },
    outputOverflow: false,
    signal: null,
    startedAt: "2026-08-11T15:04:08.000Z",
    status: 1,
    stderr: "npm error code ECONNRESET https://registry.example.invalid/token",
    stdout: "",
    survivorCount: 0,
    termination: { killSent: false, termSent: false },
    timedOut: false
  });
  const failure = buildDependencyFailureSummary("npm-ci-prefer-offline", [subprocess]);
  assert.equal(failure.failedPhase, "npm-ci-prefer-offline");
  assert.equal(failure.failureCode, "NPM_NETWORK_FAILURE");
  assert.equal(failure.networkCode, "ECONNRESET");
  assert.equal(failure.subprocesses[0].exitStatus, 1);
  assert.equal(failure.subprocesses[0].completionReason, "exit-nonzero");
  assert.doesNotMatch(JSON.stringify(failure), /https?:\/\/|token/);
});

test("confined cache inventory and byte-copy reject links and preserve content provenance without hardlinks", () => {
  const scope = fixture("cache-copy-");
  const root = scope.root;
  try {
    const source = join(root, "source-cache");
    const destination = join(root, "destination-cache");
    mkdirSync(join(source, "_cacache", "content-v2"), { mode: 0o700, recursive: true });
    mkdirSync(destination, { mode: 0o700 });
    writeFileSync(join(source, ".mais-dependency-cache.json"), "source-marker", { mode: 0o600 });
    const destinationMarker = { sourceAttemptId: `sha256:${"1".repeat(64)}`, status: "seed-destination" };
    writeFileSync(
      join(destination, ".mais-dependency-cache.json"),
      `${JSON.stringify(destinationMarker)}\n`,
      { mode: 0o600 }
    );
    const sourceFile = join(source, "_cacache", "content-v2", "package-bytes");
    writeFileSync(sourceFile, "verified package bytes", { mode: 0o600 });

    const before = inventoryConfinedNpmCache(source);
    const provenance = copyConfinedNpmCache(source, destination, {
      expectedDestinationMarker: destinationMarker,
      expectedSourceInventory: before
    });
    const destinationFile = join(destination, "_cacache", "content-v2", "package-bytes");

    assert.equal(before.fileCount, 1);
    assert.equal(provenance.preCopy.inventorySha256, provenance.postCopy.inventorySha256);
    assert.equal(provenance.preCopy.totalBytes, provenance.postCopy.totalBytes);
    assert.equal(provenance.hardlinkCount, 0);
    assert.notEqual(statSync(sourceFile).ino, statSync(destinationFile).ino);
    assert.equal(statSync(destinationFile).nlink, 1);
    assert.equal(statSync(destinationFile).mode & 0o777, 0o600);
    assert.equal(statSync(dirname(destinationFile)).mode & 0o777, 0o700);
    assert.deepEqual(
      JSON.parse(readFileSync(join(destination, ".mais-dependency-cache.json"), "utf8")),
      destinationMarker
    );

    writeFileSync(destinationFile, "different", "utf8");
    assert.throws(
      () => copyConfinedNpmCache(source, destination, {
        expectedDestinationMarker: destinationMarker,
        expectedSourceInventory: before
      }),
      /collision|byte-identical/i
    );

    assert.throws(
      () => validateConfinedCacheEntryObservation({
        kind: "symlink",
        mode: 0o700,
        ownerMatches: true
      }),
      /special|symlink|regular/i
    );
    assert.throws(
      () => validateConfinedCacheEntryObservation({
        kind: "other",
        mode: 0o600,
        ownerMatches: true
      }),
      /special|regular|files|directories/i
    );

    const lateDestination = join(root, "late-destination-cache");
    mkdirSync(lateDestination, { mode: 0o700 });
    assert.throws(
      () => copyConfinedNpmCache(source, lateDestination, {
        expectedDestinationMarker: destinationMarker,
        expectedSourceInventory: before
      }),
      /marker|missing|late/i
    );
    assert.deepEqual(readdirSync(lateDestination), []);
    const lateMarkerPath = join(lateDestination, ".mais-dependency-cache.json");
    const displacedMarker = join(lateDestination, ".displaced-marker.json");
    writeFileSync(lateMarkerPath, `${JSON.stringify(destinationMarker)}\n`, { mode: 0o600 });
    assert.throws(
      () => copyConfinedNpmCache(source, lateDestination, {
        afterMarkerVerified: () => {
          renameSync(lateMarkerPath, displacedMarker);
          writeFileSync(lateMarkerPath, `${JSON.stringify(destinationMarker)}\n`, { mode: 0o600 });
        },
        expectedDestinationMarker: destinationMarker,
        expectedSourceInventory: before
      }),
      /marker|changed|late/i
    );
    assert.equal(existsSync(join(lateDestination, "_cacache")), false);

    const mutationDestination = join(root, "mutation-destination-cache");
    mkdirSync(mutationDestination, { mode: 0o700 });
    writeFileSync(
      join(mutationDestination, ".mais-dependency-cache.json"),
      `${JSON.stringify(destinationMarker)}\n`,
      { mode: 0o600 }
    );
    assert.throws(
      () => copyConfinedNpmCache(source, mutationDestination, {
        afterCopy: () => writeFileSync(sourceFile, "source changed after freeze", "utf8"),
        expectedDestinationMarker: destinationMarker,
        expectedSourceInventory: before
      }),
      /source|changed|provenance/i
    );
  } finally {
    scope.cleanup();
  }
});

test("cache lineage selects the sole safe seeded head and rejects unsafe terminal or ancestor state", () => {
  const scope = fixture("cache-seed-validation-");
  const root = scope.root;
  try {
    const repo = join(root, "repo");
    const tmpBase = join(repo, ".tmp");
    const source = {
      packageLockSha256: "1".repeat(64),
      packageSha256: "2".repeat(64)
    };
    for (const directory of [repo, tmpBase]) {
      if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
    }
    const safeProcessSummary = () => ({
      endedAtObserved: true,
      identityEstablished: true,
      outputOverflow: false,
      processOutcome: { survivorCount: 0 },
      signal: null,
      timedOut: false
    });
    const writeAttempt = ({ cacheEvidence, cacheText, nonce }) => {
      const attemptRoot = join(tmpBase, `dependency-provision-${nonce}`);
      const cache = join(attemptRoot, "npm-cache");
      const evidence = join(attemptRoot, "evidence");
      const install = join(attemptRoot, "install");
      for (const directory of [attemptRoot, cache, evidence, install]) {
        mkdirSync(directory, { mode: 0o700 });
      }
      writeFileSync(join(attemptRoot, ".mais-dependency-provision.json"), `${JSON.stringify({
        nonce,
        packageLockSha256: source.packageLockSha256,
        packageSha256: source.packageSha256,
        repoRoot: repo,
        schemaVersion: 1,
        status: "provisioning"
      })}\n`, { mode: 0o600 });
      writeFileSync(join(cache, ".mais-dependency-cache.json"), `${JSON.stringify({
        cachePath: cache,
        nonce,
        packageLockSha256: source.packageLockSha256,
        packageSha256: source.packageSha256,
        repoRoot: repo,
        schemaVersion: 1,
        status: "fresh"
      })}\n`, { mode: 0o600 });
      writeFileSync(join(cache, "package-bytes"), cacheText, { mode: 0o600 });
      const markerHash = createHash("sha256")
        .update(readFileSync(join(cache, ".mais-dependency-cache.json")))
        .digest("hex");
      const failure = {
        cache: cacheEvidence(markerHash),
        failure: {
          failedPhase: "npm-ci-prefer-offline",
          networkCode: "ECONNRESET",
          subprocesses: [safeProcessSummary()]
        },
        preflight: { source },
        rollbackRestored: true,
        schemaVersion: 1,
        status: "failed"
      };
      const failurePath = join(evidence, "failure-attestation.json");
      writeFileSync(failurePath, `${JSON.stringify(failure)}\n`, { mode: 0o600 });
      return { attemptRoot, cache, failure, failurePath, markerHash, nonce };
    };
    const preflight = {
      availableBytes: 10n * 1024n * 1024n * 1024n,
      processAudit: {
        activeProfileCount: 0,
        foreignProfileCount: 0,
        ownerAssociatedCount: 0,
        tokenBearingCount: 0
      },
      repoRoot: repo,
      source,
      tmpBase
    };

    const freshAttempt = writeAttempt({
      cacheEvidence: (markerSha256) => ({
        markerSha256,
        provenance: "fresh-confined-cache"
      }),
      cacheText: "cached",
      nonce: "e".repeat(64)
    });
    const fresh = validateConfinedCacheSeed(preflight, freshAttempt.attemptRoot);
    assert.equal(fresh.inventory.fileCount, 1);
    assert.equal(fresh.lineageDepth, 0);
    assert.equal(fresh.sourceAttemptId.startsWith("sha256:"), true);
    assert.equal("nonce" in fresh, false);
    assert.equal("cacheRoot" in fresh.publicProof, false);

    const seededAttempt = writeAttempt({
      cacheEvidence: (markerSha256) => ({
        markerSha256,
        offlineCacheMiss: true,
        provenance: "byte-copied-verified-cache",
        seed: {
          copy: {
            hardlinkCount: 0,
            postCopy: fresh.inventory,
            preCopy: fresh.inventory,
            sourceAfter: fresh.inventory
          },
          destinationAttemptId: `sha256:${createHash("sha256").update("f".repeat(64)).digest("hex")}`,
          schemaVersion: 1,
          source: fresh.publicProof,
          status: "byte-copied-and-revalidated"
        },
        verifiedInventory: fresh.inventory
      }),
      cacheText: "cached plus verified metadata",
      nonce: "f".repeat(64)
    });
    const seeded = validateConfinedCacheSeed(preflight, seededAttempt.attemptRoot);
    assert.equal(seeded.lineageDepth, 1);
    assert.equal(seeded.parentAttemptId, fresh.sourceAttemptId);
    assert.match(seeded.sourceManifestSha256, /^[a-f0-9]{64}$/);
    assert.equal(discoverUniqueConfinedCacheSeed(preflight).sourceAttemptId, seeded.sourceAttemptId);

    const unsafe = structuredClone(seededAttempt.failure);
    unsafe.failure.subprocesses[0].processOutcome.survivorCount = 1;
    writeFileSync(seededAttempt.failurePath, `${JSON.stringify(unsafe)}\n`, { mode: 0o600 });
    assert.throws(
      () => validateConfinedCacheSeed(preflight, seededAttempt.attemptRoot),
      /shutdown|survivor|incomplete/i
    );
    writeFileSync(
      seededAttempt.failurePath,
      `${JSON.stringify(seededAttempt.failure)}\n`,
      { mode: 0o600 }
    );

    assert.throws(
      () => validateCacheSeedAncestorObservation({
        kind: "directory",
        mode: 0o770,
        ownerMatches: true
      }),
      /ancestor|permission|writable/i
    );
  } finally {
    scope.cleanup();
  }
});

test("activation preserves the old symlink and atomically installs one physical same-volume tree", () => {
  const scope = fixture("activation-");
  const root = scope.root;
  try {
    const currentParent = join(root, "repo");
    const external = join(root, "old-tree");
    const stagingParent = join(root, "provision", "install");
    const rollbackParent = join(root, "provision", "rollback");
    for (const directory of [currentParent, external, stagingParent, rollbackParent]) {
      mkdirSync(directory, { recursive: true });
    }
    const current = join(currentParent, "node_modules");
    const candidate = join(stagingParent, "node_modules");
    const rollback = join(rollbackParent, "node_modules");
    mkdirSync(candidate);
    writeFileSync(join(candidate, "proof.txt"), "physical", "utf8");
    symlinkSync(external, current);
    activatePhysicalNodeModules({
      candidate,
      current,
      expectedCurrentRealpath: external,
      rollback
    });
    assert.equal(realpathSync(current), current);
    assert.equal(readFileSync(join(current, "proof.txt"), "utf8"), "physical");
    assert.equal(realpathSync(rollback), external);
  } finally {
    scope.cleanup();
  }
});

test("activation boundary swap fails closed and restores the preserved old symlink", () => {
  const scope = fixture("activation-swap-");
  const root = scope.root;
  try {
    const currentParent = join(root, "repo");
    const external = join(root, "old-tree");
    const stagingParent = join(root, "provision", "install");
    const rollbackParent = join(root, "provision", "rollback");
    for (const directory of [currentParent, external, stagingParent, rollbackParent]) {
      mkdirSync(directory, { recursive: true });
    }
    const current = join(currentParent, "node_modules");
    const candidate = join(stagingParent, "node_modules");
    const displaced = join(stagingParent, "displaced-node_modules");
    const rollback = join(rollbackParent, "node_modules");
    mkdirSync(candidate);
    symlinkSync(external, current);
    assert.throws(
      () => activatePhysicalNodeModules({
        afterRollbackPreserved: () => {
          renameSync(candidate, displaced);
          mkdirSync(candidate);
        },
        candidate,
        current,
        expectedCurrentRealpath: external,
        rollback
      }),
      /changed|identity|boundary/i
    );
    assert.equal(realpathSync(current), external);
    assert.equal(existsSync(displaced), true);
    assert.equal(existsSync(candidate), true);
  } finally {
    scope.cleanup();
  }
});

test("owned dependency subprocess timeout is hard-bounded TERM then revalidated KILL and reap", async () => {
  const scope = fixture("owned-timeout-");
  const root = scope.root;
  try {
    const logPath = join(root, "owned.log");
    const auditPath = join(root, "owned-audit.json");
    const ownerToken = "b".repeat(64);
    const result = await runOwnedSubprocess({
      args: [
        "--input-type=module",
        "--eval",
        "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);"
      ],
      auditPath,
      command: process.execPath,
      cwd: root,
      environment: confinedTestChildEnvironment(root, { MAIS_DEPENDENCY_OWNER_TOKEN: ownerToken }),
      label: "synthetic-timeout",
      logPath,
      ownerToken,
      signatureFragments: ["setInterval"],
      terminationAttempts: 10,
      terminationPollMs: 50,
      timeoutMs: 250
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.termination.termSent, true);
    assert.equal(result.termination.killSent, true);
    assert.equal(result.endedAtObserved, true);
    assert.equal(result.survivorCount, 0);
    assert.equal(statSync(logPath).mode & 0o777, 0o600);
    assert.equal(statSync(auditPath).mode & 0o777, 0o600);
    const audit = JSON.parse(readFileSync(auditPath, "utf8"));
    assert.equal(audit.samples[0].phase, "timeout-before-term");
    assert.equal(audit.samples[0].processes[0].classification, "spawn-owned-root");
    assert.equal(audit.samples.at(-1).phase, "timeout-after-kill");
    assert.equal(audit.samples.at(-1).survivorCount, 0);
    assert.doesNotMatch(JSON.stringify(audit), /setInterval|SIGTERM.*setInterval/);
  } finally {
    scope.cleanup();
  }
});

test("identity-unestablished fast root exit retains an unproven reparented token descendant", async () => {
  const scope = fixture("owned-fast-reparent-");
  const root = scope.root;
  try {
    const ownerToken = "9".repeat(64);
    const childScript = "setTimeout(() => {}, 1500)";
    const rootScript = [
      "const { spawn } = require('node:child_process');",
      `const child = spawn(process.execPath, ['--eval', ${JSON.stringify(childScript)}], { detached: true, env: process.env, stdio: 'ignore' });`,
      "child.unref();"
    ].join(" ");
    const auditPath = join(root, "fast-reparent-audit.json");
    const result = await runOwnedSubprocess({
      args: ["--eval", rootScript],
      auditPath,
      command: process.execPath,
      cwd: root,
      environment: confinedTestChildEnvironment(root, { MAIS_DEPENDENCY_OWNER_TOKEN: ownerToken }),
      label: "synthetic-fast-reparent",
      logPath: join(root, "fast-reparent.log"),
      ownerToken,
      signatureFragments: ["signature-that-root-does-not-have"],
      timeoutMs: 5_000
    });
    const audit = JSON.parse(readFileSync(auditPath, "utf8"));
    const unproven = audit.samples
      .flatMap((sample) => sample.processes)
      .find(({ classification }) => classification === "owner-token-unproven");
    assert.equal(result.identityEstablished, false);
    assert.equal(result.completionReason, "identity-unestablished");
    assert.ok(result.survivorCount >= 1, JSON.stringify(audit));
    assert.ok(Number.isSafeInteger(unproven?.pid) && unproven.pid > 1, JSON.stringify(audit));
    assert.ok(Number.isSafeInteger(unproven?.ppid) && unproven.ppid >= 0, JSON.stringify(audit));
    assert.deepEqual(result.termination, { killSent: false, termSent: false });
    assert.doesNotMatch(JSON.stringify(audit), new RegExp(ownerToken));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_700));
  } finally {
    scope.cleanup();
  }
});

test("owned dependency subprocess tolerates a bounded npm-style process-title transition", async () => {
  const scope = fixture("owned-title-");
  const root = scope.root;
  try {
    const ownerToken = "c".repeat(64);
    const launcher = realpathSync(join(repoRoot, "scripts", "owned-dependency-command-launcher.mjs"));
    const target = join(root, "npm-title-fixture.mjs");
    writeFileSync(
      target,
      "import { writeFileSync } from 'node:fs'; writeFileSync('child-default-mode.txt', 'owned'); process.title = 'npm ci'; setTimeout(() => {}, 500);\n",
      "utf8"
    );
    const result = await runOwnedSubprocess({
      args: [
        launcher,
        target
      ],
      auditPath: join(root, "title-audit.json"),
      command: process.execPath,
      cwd: root,
      environment: confinedTestChildEnvironment(root, { MAIS_DEPENDENCY_OWNER_TOKEN: ownerToken }),
      label: "synthetic-title-transition",
      logPath: join(root, "title.log"),
      ownerToken,
      signatureFragments: [launcher],
      timeoutMs: 5_000
    });
    const audit = JSON.parse(readFileSync(join(root, "title-audit.json"), "utf8"));
    assert.equal(result.identityEstablished, true, JSON.stringify(audit));
    assert.equal(result.status, 0);
    assert.equal(result.error, null);
    assert.equal(result.survivorCount, 0);
    assert.equal(audit.status, "completed");
    assert.equal(statSync(join(root, "child-default-mode.txt")).mode & 0o777, 0o600);
  } finally {
    scope.cleanup();
  }
});

test("dependency preflight classifies stale and activated trees from synthetic state", () => {
  assert.equal(
    typeof provisioner.classifyCurrentDependencyTreeState,
    "function",
    "synthetic dependency-state classifier must be exported"
  );
  const classify = provisioner.classifyCurrentDependencyTreeState;
  const exactCritical = {
    "@playwright/test": { rootIsInsideTree: true, version: "1.59.1" },
    next: { rootIsInsideTree: true, version: "15.5.23" },
    playwright: { rootIsInsideTree: true, version: "1.59.1" },
    postcss: { rootIsInsideTree: true, version: "8.5.26" }
  };
  const repo = "/Volumes/Starship/synthetic-repo";
  assert.deepEqual(classify({
    currentCritical: exactCritical,
    nodeModulesIsDirectory: true,
    nodeModulesIsSymlink: false,
    nodeModulesPath: `${repo}/node_modules`,
    nodeModulesRealpath: `${repo}/node_modules`,
    repoRoot: repo
  }), {
    action: "verify-existing",
    currentIsExactPhysical: true,
    currentIsExpectedMismatch: false
  });

  const staleCritical = {
    ...exactCritical,
    next: { rootIsInsideTree: true, version: "15.5.20" },
    postcss: { rootIsInsideTree: true, version: "8.5.16" }
  };
  assert.deepEqual(classify({
    currentCritical: staleCritical,
    nodeModulesIsDirectory: false,
    nodeModulesIsSymlink: true,
    nodeModulesPath: `${repo}/node_modules`,
    nodeModulesRealpath: "/Volumes/Starship/shared-stale/node_modules",
    repoRoot: repo
  }), {
    action: "provision",
    currentIsExactPhysical: false,
    currentIsExpectedMismatch: true
  });
  assert.throws(() => classify({
    currentCritical: staleCritical,
    nodeModulesIsDirectory: true,
    nodeModulesIsSymlink: false,
    nodeModulesPath: `${repo}/node_modules`,
    nodeModulesRealpath: "/Volumes/Starship/other-tree/node_modules",
    repoRoot: repo
  }), /neither|physical|mismatch/i);
});
