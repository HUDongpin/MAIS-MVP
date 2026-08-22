import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

import { assertCanonicalStarshipBrowserHost } from "./browser-host-geometry.mjs";
import {
  attestPhysicalDependencyTree,
  compareInstalledLockToSource,
  validateCriticalLockContract
} from "./provision-exact-browser-dependencies.mjs";

const EXPECTED_CRITICAL_NAMES = Object.freeze([
  "@playwright/test",
  "next",
  "playwright",
  "postcss"
]);
const EXPECTED_CLI_RELATIVE_PATHS = Object.freeze({
  next: "next/dist/bin/next",
  playwrightCore: "playwright/cli.js",
  playwrightTest: "@playwright/test/cli.js"
});
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ATTEMPT_PATTERN = /^sha256:[a-f0-9]{64}$/;

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])])
  );
}

function sameJson(left, right) {
  return JSON.stringify(stableObject(left)) === JSON.stringify(stableObject(right));
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(readFileSync(filePath));
}

function sha256Json(value) {
  return sha256Buffer(JSON.stringify(stableObject(value)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isStrictDescendant(candidate, root) {
  const pathRelative = relative(root, candidate);
  return pathRelative !== "" && !pathRelative.startsWith("..") && !pathRelative.startsWith("/");
}

function assertExactKeys(label, value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (!sameJson(actual, expected)) {
    throw new Error(`${label} has an omitted or unexpected field.`);
  }
}

function assertHash(label, value) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertNonnegativeInteger(label, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative safe integer.`);
  }
}

function assertOwnerOnlyDirectory(label, directory) {
  const entry = lstatSync(directory, { throwIfNoEntry: false });
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !entry || !entry.isDirectory() || entry.isSymbolicLink() ||
    realpathSync(directory) !== directory || !Number.isSafeInteger(expectedUid) ||
    entry.uid !== expectedUid || (entry.mode & 0o022) !== 0
  ) {
    throw new Error(`${label} is not a canonical owner-only directory.`);
  }
  return entry;
}

function readOwnerOnlyJson(label, filePath) {
  const entry = lstatSync(filePath, { throwIfNoEntry: false });
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !entry || !entry.isFile() || entry.isSymbolicLink() ||
    realpathSync(filePath) !== filePath || !Number.isSafeInteger(expectedUid) ||
    entry.uid !== expectedUid || (entry.mode & 0o777) !== 0o600
  ) {
    throw new Error(`${label} must be a canonical owner-only 0600 regular file.`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON.`, { cause: error });
  }
}

function normalizePackageInstances(installedLock) {
  return Object.entries(installedLock.packages ?? {})
    .filter(([packagePath]) => packagePath !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packagePath, entry]) => ({
      integrity: typeof entry.integrity === "string" ? entry.integrity : null,
      link: entry.link === true,
      packagePath,
      resolvedSha256: sha256Buffer(String(entry.resolved ?? "")),
      version: typeof entry.version === "string" ? entry.version : null
    }));
}

function collectCriticalState(repoRoot, nodeModulesRoot, packageManifest, sourceLock) {
  const lockContract = validateCriticalLockContract(packageManifest, sourceLock);
  const expectedVersions = stableObject(lockContract.criticalVersions);
  const actualVersions = {};
  const manifests = {};
  for (const name of EXPECTED_CRITICAL_NAMES) {
    const expectedVersion = expectedVersions[name];
    const manifestPath = realpathSync(join(nodeModulesRoot, name, "package.json"));
    if (!isStrictDescendant(manifestPath, nodeModulesRoot)) {
      throw new Error(`Critical dependency ${name} escaped the physical dependency tree.`);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.version !== expectedVersion) {
      throw new Error(`Critical dependency ${name} does not match the approved lock version.`);
    }
    actualVersions[name] = manifest.version;
    manifests[name] = {
      canonicalPath: manifestPath,
      relativePath: relative(nodeModulesRoot, manifestPath).replaceAll("\\", "/"),
      sha256: sha256File(manifestPath),
      version: manifest.version
    };
  }

  const requireFromRepo = createRequire(join(repoRoot, "package.json"));
  const clis = {};
  for (const [label, relativePath] of Object.entries(EXPECTED_CLI_RELATIVE_PATHS)) {
    const directPath = realpathSync(join(nodeModulesRoot, relativePath));
    const resolutionRequest = label === "next"
      ? "next/dist/bin/next"
      : label === "playwrightTest"
        ? "@playwright/test/cli"
        : "playwright";
    const resolvedPath = realpathSync(requireFromRepo.resolve(resolutionRequest));
    const resolutionMatches = label === "playwrightCore"
      ? isStrictDescendant(resolvedPath, join(nodeModulesRoot, "playwright"))
      : directPath === resolvedPath;
    if (!resolutionMatches || !isStrictDescendant(directPath, nodeModulesRoot)) {
      throw new Error(`Critical CLI ${label} did not resolve from the active physical tree.`);
    }
    clis[label] = {
      canonicalPath: directPath,
      relativePath: relative(nodeModulesRoot, directPath).replaceAll("\\", "/"),
      sha256: sha256File(directPath)
    };
  }
  return {
    actualVersions: stableObject(actualVersions),
    clis: stableObject(clis),
    expectedVersions,
    lockfileVersion: lockContract.lockfileVersion,
    manifests: stableObject(manifests)
  };
}

function validateActivationRecord({
  activation,
  candidate,
  comparison,
  critical,
  installedLockSha256,
  packageLockSha256,
  packageSha256
}) {
  const activeLs = activation?.subprocesses?.find(({ phase }) => phase === "npm-ls-active");
  if (
    activation?.schemaVersion !== 1 || activation.status !== "passed" ||
    activation.action !== "requalified-and-activated-completed-install" ||
    !ATTEMPT_PATTERN.test(activation.attemptId ?? "") ||
    !HASH_PATTERN.test(activation.npmLsJsonSha256 ?? "") ||
    activation.rollback?.preserved !== true ||
    activation.rollback?.previousRealpathClass !== "starship-other-tree" ||
    activation.postSource?.packageSha256 !== packageSha256 ||
    activation.postSource?.packageLockSha256 !== packageLockSha256 ||
    activation.postProcesses?.activeProfileCount !== 0 ||
    activation.postProcesses?.foreignProfileCount !== 0 ||
    activation.postProcesses?.ownedProfileCount !== 0 ||
    activation.postProcesses?.ownerAssociatedCount !== 0 ||
    activation.postProcesses?.tokenBearingCount !== 0 ||
    !Array.isArray(activation.postProcesses?.violations) ||
    activation.postProcesses.violations.length !== 0 ||
    !activeLs || activeLs.completionReason !== "exit-zero" ||
    activeLs.exitStatus !== 0 || activeLs.identityEstablished !== true ||
    activeLs.endedAtObserved !== true || activeLs.signal !== null ||
    activeLs.timedOut !== false || activeLs.processOutcome?.survivorCount !== 0 ||
    activeLs.processOutcome?.termination?.termSent !== false ||
    activeLs.processOutcome?.termination?.killSent !== false ||
    !sameJson(activation.candidate, candidate) ||
    activation.activeTree?.installedLockSha256 !== installedLockSha256 ||
    !sameJson(activation.activeTree?.comparison, comparison) ||
    !sameJson(activation.activeTree?.versions, critical.actualVersions) ||
    !sameJson(activation.activeTree?.packages,
      Object.fromEntries(Object.entries(critical.manifests).map(([name, manifest]) => [name, {
        manifestRelativePath: manifest.relativePath,
        manifestSha256: manifest.sha256,
        version: manifest.version
      }]))) ||
    !sameJson(activation.activeTree?.cliPaths,
      Object.fromEntries(Object.entries(critical.clis).map(([label, cli]) => [label, {
        relativePath: cli.relativePath,
        sha256: cli.sha256
      }])))
  ) {
    throw new Error("Activation evidence does not exactly bind the complete active dependency proof.");
  }
  return activeLs;
}

export function validateActiveBrowserDependencyProof(proof, { repoRoot } = {}) {
  assertExactKeys("active dependency proof", proof, [
    "activation",
    "attestationFingerprint",
    "comparator",
    "critical",
    "nodeModules",
    "npmLs",
    "optionalPlatform",
    "packageInstances",
    "repoRoot",
    "resolution",
    "schemaVersion",
    "source",
    "status"
  ]);
  if (proof.schemaVersion !== 2 || proof.status !== "passed") {
    throw new Error("Active dependency proof schema/status is invalid.");
  }
  if (
    typeof proof.repoRoot !== "string" || !proof.repoRoot.startsWith("/Volumes/Starship/") ||
    (repoRoot !== undefined && proof.repoRoot !== repoRoot)
  ) {
    throw new Error("Active dependency proof repository root is invalid.");
  }
  assertExactKeys("dependency source proof", proof.source, [
    "installedLockSha256", "lockfileVersion", "packageLockSha256", "packageSha256"
  ]);
  for (const key of ["installedLockSha256", "packageLockSha256", "packageSha256"]) {
    assertHash(`dependency source ${key}`, proof.source[key]);
  }
  if (proof.source.lockfileVersion !== 3) throw new Error("Dependency lockfileVersion is invalid.");

  assertExactKeys("dependency node_modules proof", proof.nodeModules, [
    "canonicalRoot", "identity", "physical", "proof", "relativePath"
  ]);
  if (
    proof.nodeModules.physical !== true || proof.nodeModules.relativePath !== "node_modules" ||
    proof.nodeModules.canonicalRoot !== join(proof.repoRoot, "node_modules")
  ) {
    throw new Error("Physical dependency root proof is invalid.");
  }
  assertExactKeys("dependency inode identity", proof.nodeModules.identity, ["dev", "ino"]);
  if (!/^\d+$/.test(proof.nodeModules.identity.dev) || !/^\d+$/.test(proof.nodeModules.identity.ino)) {
    throw new Error("Physical dependency inode identity is invalid.");
  }
  assertExactKeys("dependency inventory proof", proof.nodeModules.proof, [
    "directoryCount", "fileCount", "hardlinkGroupCount", "inventorySha256", "symlinkCount", "totalBytes"
  ]);
  for (const key of ["directoryCount", "fileCount", "hardlinkGroupCount", "symlinkCount", "totalBytes"]) {
    assertNonnegativeInteger(`dependency inventory ${key}`, proof.nodeModules.proof[key]);
  }
  assertHash("dependency inventory hash", proof.nodeModules.proof.inventorySha256);

  assertExactKeys("package-instance inventory", proof.packageInstances, ["count", "entries", "sha256"]);
  if (!Array.isArray(proof.packageInstances.entries)) throw new Error("Package-instance inventory entries are missing.");
  assertNonnegativeInteger("package-instance count", proof.packageInstances.count);
  if (proof.packageInstances.count !== proof.packageInstances.entries.length) {
    throw new Error("Package-instance inventory count is invalid.");
  }
  const packagePaths = [];
  for (const entry of proof.packageInstances.entries) {
    assertExactKeys("package-instance entry", entry, [
      "integrity", "link", "packagePath", "resolvedSha256", "version"
    ]);
    if (
      typeof entry.packagePath !== "string" || !entry.packagePath.startsWith("node_modules/") ||
      !(entry.integrity === null || typeof entry.integrity === "string") ||
      typeof entry.link !== "boolean" ||
      !(entry.version === null || typeof entry.version === "string")
    ) {
      throw new Error("Package-instance inventory entry is invalid.");
    }
    assertHash("package-instance resolved hash", entry.resolvedSha256);
    packagePaths.push(entry.packagePath);
  }
  if (!sameJson(packagePaths, [...packagePaths].sort()) || new Set(packagePaths).size !== packagePaths.length) {
    throw new Error("Package-instance inventory is not sorted and unique.");
  }
  assertHash("package-instance inventory hash", proof.packageInstances.sha256);
  if (sha256Json(proof.packageInstances.entries) !== proof.packageInstances.sha256) {
    throw new Error("Package-instance inventory hash does not match its normalized entries.");
  }

  assertExactKeys("dependency comparator proof", proof.comparator, [
    "compared", "comparisonSha256", "mismatchCount", "optionalPlatformOmissions", "unmaterializedOptionalPeerCount"
  ]);
  for (const key of ["compared", "mismatchCount", "optionalPlatformOmissions", "unmaterializedOptionalPeerCount"]) {
    assertNonnegativeInteger(`dependency comparator ${key}`, proof.comparator[key]);
  }
  if (proof.comparator.mismatchCount !== 0) throw new Error("Dependency comparator is not exact.");
  assertHash("dependency comparator hash", proof.comparator.comparisonSha256);

  assertExactKeys("optional-platform proof", proof.optionalPlatform, [
    "closure", "closureSha256", "platform", "roots", "rootsSha256"
  ]);
  if (!Array.isArray(proof.optionalPlatform.closure) || !Array.isArray(proof.optionalPlatform.roots)) {
    throw new Error("Optional-platform roots/closure are missing.");
  }
  assertHash("optional-platform closure hash", proof.optionalPlatform.closureSha256);
  assertHash("optional-platform roots hash", proof.optionalPlatform.rootsSha256);
  if (
    sha256Json(proof.optionalPlatform.closure) !== proof.optionalPlatform.closureSha256 ||
    sha256Json(proof.optionalPlatform.roots) !== proof.optionalPlatform.rootsSha256
  ) {
    throw new Error("Optional-platform roots/closure hashes are invalid.");
  }
  assertExactKeys("dependency platform", proof.optionalPlatform.platform, ["arch", "libc", "platform"]);

  assertExactKeys("npm-ls proof", proof.npmLs, [
    "completionReason", "endedAtObserved", "exitStatus", "identityEstablished", "phase", "resultSha256", "survivorCount"
  ]);
  if (
    proof.npmLs.phase !== "npm-ls-active" || proof.npmLs.exitStatus !== 0 ||
    proof.npmLs.completionReason !== "exit-zero" || proof.npmLs.endedAtObserved !== true ||
    proof.npmLs.identityEstablished !== true || proof.npmLs.survivorCount !== 0
  ) {
    throw new Error("npm-ls active proof is invalid.");
  }
  assertHash("npm-ls result hash", proof.npmLs.resultSha256);

  assertExactKeys("critical dependency proof", proof.critical, [
    "actualVersions", "clis", "expectedVersions", "manifests"
  ]);
  if (!sameJson(Object.keys(proof.critical.actualVersions).sort(), EXPECTED_CRITICAL_NAMES) ||
      !sameJson(Object.keys(proof.critical.expectedVersions).sort(), EXPECTED_CRITICAL_NAMES) ||
      !sameJson(proof.critical.actualVersions, proof.critical.expectedVersions)) {
    throw new Error("Critical expected/actual dependency versions are invalid.");
  }
  if (!sameJson(Object.keys(proof.critical.manifests).sort(), EXPECTED_CRITICAL_NAMES)) {
    throw new Error("Critical manifest inventory is incomplete.");
  }
  for (const [name, manifest] of Object.entries(proof.critical.manifests)) {
    assertExactKeys(`critical manifest ${name}`, manifest, ["canonicalPath", "relativePath", "sha256", "version"]);
    assertHash(`critical manifest ${name} hash`, manifest.sha256);
    if (
      manifest.canonicalPath !== join(proof.nodeModules.canonicalRoot, manifest.relativePath) ||
      manifest.version !== proof.critical.actualVersions[name]
    ) throw new Error(`Critical manifest ${name} binding is invalid.`);
  }
  if (!sameJson(Object.keys(proof.critical.clis).sort(), Object.keys(EXPECTED_CLI_RELATIVE_PATHS).sort())) {
    throw new Error("Critical CLI inventory is incomplete.");
  }
  for (const [label, cli] of Object.entries(proof.critical.clis)) {
    assertExactKeys(`critical CLI ${label}`, cli, ["canonicalPath", "relativePath", "sha256"]);
    assertHash(`critical CLI ${label} hash`, cli.sha256);
    if (
      cli.relativePath !== EXPECTED_CLI_RELATIVE_PATHS[label] ||
      cli.canonicalPath !== join(proof.nodeModules.canonicalRoot, cli.relativePath)
    ) throw new Error(`Critical CLI ${label} binding is invalid.`);
  }

  assertExactKeys("dependency activation proof", proof.activation, [
    "action", "attemptId", "evidenceRelativePath", "evidenceSha256", "markerSha256", "rollbackPreserved"
  ]);
  if (
    proof.activation.action !== "requalified-and-activated-completed-install" ||
    !ATTEMPT_PATTERN.test(proof.activation.attemptId) || proof.activation.rollbackPreserved !== true ||
    !proof.activation.evidenceRelativePath.startsWith(".tmp/dependency-provision-")
  ) throw new Error("Dependency activation proof is invalid.");
  assertHash("dependency activation evidence hash", proof.activation.evidenceSha256);
  assertHash("dependency activation marker hash", proof.activation.markerSha256);

  assertExactKeys("dependency resolution proof", proof.resolution, [
    "nodePathAbsent", "nodePathValueHash", "physicalRootOnly", "sharedFallback"
  ]);
  if (
    proof.resolution.nodePathAbsent !== true || proof.resolution.nodePathValueHash !== null ||
    proof.resolution.physicalRootOnly !== proof.nodeModules.canonicalRoot ||
    proof.resolution.sharedFallback !== false
  ) throw new Error("Dependency fallback-resolution proof is invalid.");

  assertHash("active dependency proof fingerprint", proof.attestationFingerprint);
  const { attestationFingerprint, ...definition } = proof;
  if (sha256Json(definition) !== attestationFingerprint) {
    throw new Error("Active dependency proof fingerprint does not match its complete definition.");
  }
  return deepFreeze(structuredClone(proof));
}

export function buildActiveBrowserDependencyProof(
  repoRoot = process.cwd(),
  { environment = process.env } = {}
) {
  const host = assertCanonicalStarshipBrowserHost({ repoRoot });
  const canonicalRepoRoot = host.repoRoot;
  if (typeof environment.NODE_PATH === "string" && environment.NODE_PATH.trim() !== "") {
    throw new Error("Active dependency proof rejects NODE_PATH and shared module fallback.");
  }
  const nodeModulesRoot = join(canonicalRepoRoot, "node_modules");
  const packagePath = join(canonicalRepoRoot, "package.json");
  const packageLockPath = join(canonicalRepoRoot, "package-lock.json");
  const installedLockPath = join(nodeModulesRoot, ".package-lock.json");
  const packageManifest = JSON.parse(readFileSync(packagePath, "utf8"));
  const sourceLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
  const installedLock = JSON.parse(readFileSync(installedLockPath, "utf8"));
  const packageSha256 = sha256File(packagePath);
  const packageLockSha256 = sha256File(packageLockPath);
  const installedLockSha256 = sha256File(installedLockPath);
  const candidate = attestPhysicalDependencyTree(nodeModulesRoot);
  const comparison = compareInstalledLockToSource(sourceLock, installedLock);
  if (comparison.mismatches.length !== 0) {
    throw new Error("Active installed dependency graph is not an exact approved lock closure.");
  }
  const critical = collectCriticalState(
    canonicalRepoRoot,
    nodeModulesRoot,
    packageManifest,
    sourceLock
  );
  const instances = normalizePackageInstances(installedLock);

  const tmpBase = realpathSync(join(canonicalRepoRoot, ".tmp"));
  const matching = [];
  for (const entry of readdirSync(tmpBase, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^dependency-provision-[a-f0-9]{64}$/.test(entry.name)) continue;
    const attemptRoot = join(tmpBase, entry.name);
    const evidenceRoot = join(attemptRoot, "evidence");
    const activationPath = join(evidenceRoot, "activation-attestation.json");
    if (!existsSync(activationPath)) continue;
    assertOwnerOnlyDirectory("dependency activation attempt", attemptRoot);
    assertOwnerOnlyDirectory("dependency activation evidence", evidenceRoot);
    const markerPath = join(attemptRoot, ".mais-dependency-provision.json");
    const marker = readOwnerOnlyJson("dependency activation marker", markerPath);
    const expectedNonce = entry.name.slice("dependency-provision-".length);
    if (
      marker?.schemaVersion !== 1 || marker.status !== "active" ||
      marker.nonce !== expectedNonce || marker.repoRoot !== canonicalRepoRoot ||
      marker.packageSha256 !== packageSha256 || marker.packageLockSha256 !== packageLockSha256
    ) throw new Error("Dependency activation marker does not bind the current source.");
    const activation = readOwnerOnlyJson("dependency activation evidence", activationPath);
    try {
      const activeLs = validateActivationRecord({
        activation,
        candidate,
        comparison,
        critical,
        installedLockSha256,
        packageLockSha256,
        packageSha256
      });
      matching.push({ activation, activationPath, activeLs, markerPath });
    } catch {
      // Historical records cannot authorize a different physical inode/tree.
    }
  }
  if (matching.length !== 1) {
    throw new Error("Complete dependency proof requires exactly one matching activation record.");
  }
  const match = matching[0];
  const definition = {
    activation: {
      action: match.activation.action,
      attemptId: match.activation.attemptId,
      evidenceRelativePath: relative(canonicalRepoRoot, match.activationPath).replaceAll("\\", "/"),
      evidenceSha256: sha256File(match.activationPath),
      markerSha256: sha256File(match.markerPath),
      rollbackPreserved: true
    },
    comparator: {
      compared: comparison.compared,
      comparisonSha256: sha256Json(comparison),
      mismatchCount: 0,
      optionalPlatformOmissions: comparison.optionalPlatformOmissions,
      unmaterializedOptionalPeerCount: comparison.unmaterializedOptionalPeers.length
    },
    critical: {
      actualVersions: critical.actualVersions,
      clis: critical.clis,
      expectedVersions: critical.expectedVersions,
      manifests: critical.manifests
    },
    nodeModules: {
      canonicalRoot: nodeModulesRoot,
      identity: { dev: String(candidate.identity.dev), ino: String(candidate.identity.ino) },
      physical: true,
      proof: candidate.proof,
      relativePath: "node_modules"
    },
    npmLs: {
      completionReason: match.activeLs.completionReason,
      endedAtObserved: match.activeLs.endedAtObserved,
      exitStatus: match.activeLs.exitStatus,
      identityEstablished: match.activeLs.identityEstablished,
      phase: match.activeLs.phase,
      resultSha256: match.activation.npmLsJsonSha256,
      survivorCount: match.activeLs.processOutcome.survivorCount
    },
    optionalPlatform: {
      closure: comparison.omittedPlatform.closure,
      closureSha256: sha256Json(comparison.omittedPlatform.closure),
      platform: comparison.platform,
      roots: comparison.omittedPlatform.roots,
      rootsSha256: sha256Json(comparison.omittedPlatform.roots)
    },
    packageInstances: {
      count: instances.length,
      entries: instances,
      sha256: sha256Json(instances)
    },
    repoRoot: canonicalRepoRoot,
    resolution: {
      nodePathAbsent: true,
      nodePathValueHash: null,
      physicalRootOnly: nodeModulesRoot,
      sharedFallback: false
    },
    schemaVersion: 2,
    source: {
      installedLockSha256,
      lockfileVersion: critical.lockfileVersion,
      packageLockSha256,
      packageSha256
    },
    status: "passed"
  };
  return validateActiveBrowserDependencyProof({
    ...definition,
    attestationFingerprint: sha256Json(definition)
  }, { repoRoot: canonicalRepoRoot });
}

export function assertActiveBrowserDependencyProofUnchanged(repoRoot, expected, options) {
  const validated = validateActiveBrowserDependencyProof(expected, { repoRoot });
  const current = buildActiveBrowserDependencyProof(repoRoot, options);
  if (!sameJson(current, validated)) {
    throw new Error("Complete active browser dependency proof drift was detected.");
  }
  return current;
}
