import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { buildActiveBrowserDependencyProof } from "./active-browser-dependency-proof.mjs";
import {
  attestPhysicalDependencyTree,
  compareInstalledLockToSource
} from "./provision-exact-browser-dependencies.mjs";
import {
  REQUIRED_BROWSER_PROOF_INPUT_FILES,
  assertLiveRequiredBrowserExecutionScope,
  buildRequiredBrowserExecutionScope,
  requiredBrowserSourceFingerprints
} from "./required-browser-execution-scope.mjs";
import {
  validateNextConfigDependencyAuthoritySnapshot,
  validateNextConfigPhysicalTransitionSnapshot
} from "./next-config-read-only-authority.mjs";
import {
  readTestFixtureCapabilityView,
  validateRegisteredTestFixtureCapability
} from "./test-fixture-capability.mjs";

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])])
  );
}

function sha256Json(value) {
  return createHash("sha256")
    .update(JSON.stringify(stableObject(value)))
    .digest("hex");
}

export function syntheticActiveBrowserDependencyProof(repoRoot, seed = "d") {
  const digest = seed.repeat(64).slice(0, 64).replace(/[^a-f0-9]/g, "d");
  const nodeModulesRoot = path.join(repoRoot, "node_modules");
  const versions = {
    "@playwright/test": "1.59.1",
    next: "15.5.23",
    playwright: "1.59.1",
    postcss: "8.5.26"
  };

  const cliRelativePaths = {
    next: "next/dist/bin/next",
    playwrightCore: "playwright/cli.js",
    playwrightTest: "@playwright/test/cli.js"
  };
  const clis = Object.fromEntries(Object.entries(cliRelativePaths).map(([label, relativePath]) => [
    label,
    {
      canonicalPath: path.join(nodeModulesRoot, relativePath),
      relativePath,
      sha256: digest
    }
  ]));
  const manifests = Object.fromEntries(Object.entries(versions).map(([name, version]) => {
    const relativePath = `${name}/package.json`;
    return [name, {
      canonicalPath: path.join(nodeModulesRoot, relativePath),
      relativePath,
      sha256: digest,
      version
    }];
  }));
  const entries = [];
  const definition = {
    activation: {
      action: "requalified-and-activated-completed-install",
      attemptId: `sha256:${digest}`,
      evidenceRelativePath: `.tmp/dependency-provision-${digest}/evidence/activation-attestation.json`,
      evidenceSha256: digest,
      markerSha256: digest,
      rollbackPreserved: true
    },
    comparator: {
      compared: 0,
      comparisonSha256: digest,
      mismatchCount: 0,
      optionalPlatformOmissions: 0,
      unmaterializedOptionalPeerCount: 0
    },
    critical: {
      actualVersions: versions,
      clis,
      expectedVersions: versions,
      manifests
    },
    nodeModules: {
      canonicalRoot: nodeModulesRoot,
      identity: { dev: "1", ino: "1" },
      physical: true,
      proof: {
        directoryCount: 0,
        fileCount: 0,
        hardlinkGroupCount: 0,
        inventorySha256: digest,
        symlinkCount: 0,
        totalBytes: 0
      },
      relativePath: "node_modules"
    },
    npmLs: {
      completionReason: "exit-zero",
      endedAtObserved: true,
      exitStatus: 0,
      identityEstablished: true,
      phase: "npm-ls-active",
      resultSha256: digest,
      survivorCount: 0
    },
    optionalPlatform: {
      closure: [],
      closureSha256: sha256Json([]),
      platform: { arch: "arm64", libc: null, platform: "darwin" },
      roots: [],
      rootsSha256: sha256Json([])
    },
    packageInstances: {
      count: entries.length,
      entries,
      sha256: sha256Json(entries)
    },
    repoRoot,
    resolution: {
      nodePathAbsent: true,
      nodePathValueHash: null,
      physicalRootOnly: nodeModulesRoot,
      sharedFallback: false
    },
    schemaVersion: 2,
    source: {
      installedLockSha256: digest,
      lockfileVersion: 3,
      packageLockSha256: digest,
      packageSha256: digest
    },
    status: "passed"
  };
  return Object.freeze({
    ...definition,
    attestationFingerprint: sha256Json(definition)
  });
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function materializeSyntheticActiveBrowserDependencyTree(
  capability,
  { includeExecutionScopeTools = false } = {}
) {
  const registered = validateRegisteredTestFixtureCapability(capability);
  if (registered !== capability) {
    throw new Error("Synthetic dependency repo must retain exact nominal capability identity.");
  }
  const repoRoot = readTestFixtureCapabilityView(registered).definition.leaf;
  if (repoRoot !== readTestFixtureCapabilityView(capability).definition.leaf) {
    throw new Error("Synthetic dependency repo must be the exact registered capability leaf.");
  }
  const tmpRoot = path.join(repoRoot, ".tmp");
  const nodeModulesRoot = path.join(repoRoot, "node_modules");
  for (const directory of [repoRoot, tmpRoot, nodeModulesRoot]) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  const executionScopeToolSpecs = includeExecutionScopeTools
    ? { tsx: "^4.22.4", typescript: "5.8.3" }
    : {};
  const executionScopeToolVersions = includeExecutionScopeTools
    ? { tsx: "4.23.1", typescript: "5.8.3" }
    : {};
  const dependencies = { next: "15.5.23" };
  const devDependencies = {
    "@playwright/test": "^1.59.1",
    postcss: "8.5.26",
    ...executionScopeToolSpecs
  };
  const packageManifest = {
    dependencies,
    devDependencies,
    name: "synthetic-browser-dependency-fixture",
    private: true,
    version: "1.0.0"
  };
  const packages = {
    "": {
      dependencies,
      devDependencies,
      name: packageManifest.name,
      version: packageManifest.version
    },
    "node_modules/@playwright/test": {
      integrity: "sha512-synthetic-playwright-test",
      resolved: "https://registry.npmjs.org/@playwright/test/-/test-1.59.1.tgz",
      version: "1.59.1"
    },
    "node_modules/next": {
      integrity: "sha512-synthetic-next",
      resolved: "https://registry.npmjs.org/next/-/next-15.5.23.tgz",
      version: "15.5.23"
    },
    "node_modules/playwright": {
      integrity: "sha512-synthetic-playwright",
      resolved: "https://registry.npmjs.org/playwright/-/playwright-1.59.1.tgz",
      version: "1.59.1"
    },
    "node_modules/postcss": {
      integrity: "sha512-synthetic-postcss",
      resolved: "https://registry.npmjs.org/postcss/-/postcss-8.5.26.tgz",
      version: "8.5.26"
    },
    ...(includeExecutionScopeTools
      ? {
          "node_modules/tsx": {
            integrity: "sha512-synthetic-tsx",
            resolved: "https://registry.npmjs.org/tsx/-/tsx-4.23.1.tgz",
            version: "4.23.1"
          },
          "node_modules/typescript": {
            integrity: "sha512-synthetic-typescript",
            resolved: "https://registry.npmjs.org/typescript/-/typescript-5.8.3.tgz",
            version: "5.8.3"
          }
        }
      : {})
  };
  const lockfile = {
    lockfileVersion: 3,
    name: packageManifest.name,
    packages,
    requires: true,
    version: packageManifest.version
  };
  const packagePath = path.join(repoRoot, "package.json");
  const packageLockPath = path.join(repoRoot, "package-lock.json");
  const installedLockPath = path.join(nodeModulesRoot, ".package-lock.json");
  writeFileSync(packagePath, `${JSON.stringify(packageManifest)}\n`, { mode: 0o600 });
  writeFileSync(packageLockPath, `${JSON.stringify(lockfile)}\n`, { mode: 0o600 });
  writeFileSync(installedLockPath, `${JSON.stringify(lockfile)}\n`, { mode: 0o600 });

  const versions = {
    "@playwright/test": "1.59.1",
    next: "15.5.23",
    playwright: "1.59.1",
    postcss: "8.5.26"
  };
  const installedVersions = {
    ...versions,
    ...executionScopeToolVersions
  };
  for (const [name, version] of Object.entries(installedVersions)) {
    const packageRoot = path.join(nodeModulesRoot, name);
    mkdirSync(packageRoot, { recursive: true, mode: 0o700 });
    const manifest = name === "playwright"
      ? { main: "index.js", name, version }
      : name === "tsx"
        ? { exports: { "./cli": "./dist/cli.mjs" }, name, version }
        : name === "typescript"
          ? { bin: { tsc: "bin/tsc" }, main: "lib/typescript.js", name, version }
          : { name, version };
    writeFileSync(path.join(packageRoot, "package.json"), `${JSON.stringify(manifest)}\n`, {
      mode: 0o600
    });
    if (name === "playwright") {
      writeFileSync(path.join(packageRoot, "index.js"), "module.exports = {};\n", { mode: 0o600 });
    }
  }
  const cliRelativePaths = {
    next: "next/dist/bin/next",
    playwrightCore: "playwright/cli.js",
    playwrightTest: "@playwright/test/cli.js"
  };
  const executionScopeCliRelativePaths = includeExecutionScopeTools
    ? ["tsx/dist/cli.mjs", "typescript/bin/tsc", "typescript/lib/typescript.js"]
    : [];
  const nextConfigInternalRelativePaths = [
    "next/dist/server/lib/router-server.js",
    "next/dist/server/lib/start-server.js",
    "next/dist/shared/lib/constants.js"
  ];
  for (const relativePath of [
    ...Object.values(cliRelativePaths),
    ...executionScopeCliRelativePaths,
    ...nextConfigInternalRelativePaths
  ]) {
    const absolute = path.join(nodeModulesRoot, relativePath);
    mkdirSync(path.dirname(absolute), { recursive: true, mode: 0o700 });
    writeFileSync(absolute, "export default {};\n", { mode: 0o600 });
  }

  const candidate = attestPhysicalDependencyTree(nodeModulesRoot);
  const comparison = compareInstalledLockToSource(lockfile, lockfile);
  if (comparison.mismatches.length !== 0) {
    throw new Error("Synthetic dependency fixture comparator unexpectedly drifted.");
  }
  const cliPaths = Object.fromEntries(
    Object.entries(cliRelativePaths).map(([label, relativePath]) => [label, {
      relativePath,
      sha256: sha256Bytes(readFileSync(path.join(nodeModulesRoot, relativePath)))
    }])
  );
  const criticalPackages = Object.fromEntries(
    Object.entries(versions).map(([name, version]) => {
      const manifestRelativePath = `${name}/package.json`;
      return [name, {
        manifestRelativePath,
        manifestSha256: sha256Bytes(
          readFileSync(path.join(nodeModulesRoot, manifestRelativePath))
        ),
        version
      }];
    })
  );
  const provisionNonce = "a".repeat(64);
  const attemptRoot = path.join(tmpRoot, `dependency-provision-${provisionNonce}`);
  const evidenceRoot = path.join(attemptRoot, "evidence");
  mkdirSync(attemptRoot, { mode: 0o700 });
  mkdirSync(evidenceRoot, { mode: 0o700 });
  const postSource = {
    packageLockSha256: sha256Bytes(readFileSync(packageLockPath)),
    packageSha256: sha256Bytes(readFileSync(packagePath))
  };
  const activation = {
    action: "requalified-and-activated-completed-install",
    activeTree: {
      cliPaths,
      comparison,
      installedLockSha256: sha256Bytes(readFileSync(installedLockPath)),
      packages: criticalPackages,
      versions
    },
    attemptId: `sha256:${"b".repeat(64)}`,
    candidate,
    npmLsJsonSha256: "c".repeat(64),
    postProcesses: {
      activeProfileCount: 0,
      foreignProfileCount: 0,
      ownedProfileCount: 0,
      ownerAssociatedCount: 0,
      tokenBearingCount: 0,
      violations: []
    },
    postSource,
    rollback: { preserved: true, previousRealpathClass: "starship-other-tree" },
    schemaVersion: 1,
    status: "passed",
    subprocesses: ["npm-ls-staged", "npm-ls-active"].map((phase) => ({
      completionReason: "exit-zero",
      endedAtObserved: true,
      exitStatus: 0,
      identityEstablished: true,
      phase,
      processOutcome: {
        survivorCount: 0,
        termination: { killSent: false, termSent: false }
      },
      signal: null,
      timedOut: false
    }))
  };
  writeFileSync(path.join(attemptRoot, ".mais-dependency-provision.json"), `${JSON.stringify({
    nonce: provisionNonce,
    packageLockSha256: postSource.packageLockSha256,
    packageSha256: postSource.packageSha256,
    repoRoot,
    schemaVersion: 1,
    status: "active"
  }, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(
    path.join(evidenceRoot, "activation-attestation.json"),
    `${JSON.stringify(activation, null, 2)}\n`,
    { mode: 0o600 }
  );
  return Object.freeze({ nodeModulesRoot, repoRoot });
}

const SYNTHETIC_CURRENT_SOURCE_PROOF_INPUTS = new Set([
  "next.config.ts",
  "scripts/live-home-protection.d.mts",
  "scripts/live-home-protection.mjs",
  "scripts/next-config-read-only-authority.d.mts",
  "scripts/next-config-read-only-authority.mjs",
  "scripts/next-config-read-only-importer.mjs",
  "scripts/playwright-owner-paths.d.mts",
  "scripts/playwright-owner-paths.mjs",
  "scripts/required-browser-execution-scope.d.mts",
  "scripts/required-browser-execution-scope.mjs"
]);

function syntheticProofInputContent(relativePath) {
  if (SYNTHETIC_CURRENT_SOURCE_PROOF_INPUTS.has(relativePath)) {
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  }
  const extension = path.extname(relativePath);
  if (extension === ".json") return "{}\n";
  if (extension === ".yaml" || extension === ".yml") {
    return "# synthetic required-browser proof input\n";
  }
  if (extension === ".py") return "pass\n";
  if (extension === ".sh") return ":\n";
  if (extension === ".cjs") return "module.exports = {};\n";
  return "export {};\n";
}

function syntheticNextPhysicalIdentity(canonicalPath, kind, seed) {
  const digest = sha256Bytes(`${seed}\0${canonicalPath}`);
  const base = {
    canonicalPath,
    dev: String(BigInt(`0x${digest.slice(0, 12)}`)),
    ino: String(BigInt(`0x${digest.slice(12, 24)}`)),
    physical: true
  };
  return kind === "file" ? { ...base, sha256: digest } : base;
}

export function syntheticNextConfigPhysicalTransitionSnapshot({
  canonicalPath,
  kind = "file",
  seed = "synthetic-next-transition"
}) {
  const absolute = path.resolve(canonicalPath);
  const digest = sha256Bytes(`${seed}\0${kind}\0${absolute}`);
  const observation = {
    canonicalPath: absolute,
    ctimeNs: String(BigInt(`0x${digest.slice(0, 12)}`)),
    dev: String(BigInt(`0x${digest.slice(12, 24)}`)),
    ino: String(BigInt(`0x${digest.slice(24, 36)}`)),
    kind,
    mode: kind === "file" ? "33152" : "16832",
    mtimeNs: String(BigInt(`0x${digest.slice(36, 48)}`)),
    nlink: "1",
    physical: true,
    realpath: absolute,
    size: String(BigInt(`0x${digest.slice(48, 60)}`))
  };
  return validateNextConfigPhysicalTransitionSnapshot({
    after: { ...observation },
    before: { ...observation }
  }, kind);
}

export function syntheticNextConfigDependencyAuthoritySnapshot(
  repoRoot,
  seed = "synthetic-next-dependency"
) {
  const canonicalRepo = path.resolve(repoRoot);
  const nodeModulesRoot = path.join(canonicalRepo, "node_modules");
  const packageRoot = path.join(nodeModulesRoot, "next");
  const sourcePaths = [
    "dist/bin/next",
    "dist/server/lib/router-server.js",
    "dist/server/lib/start-server.js",
    "dist/shared/lib/constants.js"
  ];
  const authority = {
    cli: syntheticNextPhysicalIdentity(path.join(packageRoot, sourcePaths[0]), "file", seed),
    manifest: syntheticNextPhysicalIdentity(path.join(packageRoot, "package.json"), "file", seed),
    nodeModules: syntheticNextPhysicalIdentity(nodeModulesRoot, "directory", seed),
    packageRoot,
    schemaVersion: 1,
    sha256: "",
    sources: sourcePaths.map((relativePath) => ({
      path: relativePath,
      ...syntheticNextPhysicalIdentity(path.join(packageRoot, relativePath), "file", seed)
    })),
    version: "15.5.23"
  };
  authority.sha256 = createHash("sha256")
    .update(`next-dependency-authority\0${JSON.stringify(stableObject({
      ...authority,
      sha256: undefined
    }))}`)
    .digest("hex");
  return validateNextConfigDependencyAuthoritySnapshot(authority);
}

export function materializeSyntheticRequiredBrowserExecutionScope(
  capability,
  { mode = "discovery" } = {}
) {
  const registered = validateRegisteredTestFixtureCapability(capability);
  if (registered !== capability) {
    throw new Error("Synthetic execution-scope repo must retain exact nominal capability identity.");
  }
  const repoRoot = readTestFixtureCapabilityView(registered).definition.leaf;
  if (repoRoot !== readTestFixtureCapabilityView(capability).definition.leaf) {
    throw new Error("Synthetic execution-scope repo must be the exact registered capability leaf.");
  }
  materializeSyntheticActiveBrowserDependencyTree(capability, {
    includeExecutionScopeTools: true
  });

  const dependencyOwnedInputs = new Set(["package-lock.json", "package.json"]);
  for (const relativePath of REQUIRED_BROWSER_PROOF_INPUT_FILES) {
    if (dependencyOwnedInputs.has(relativePath)) continue;
    const target = path.resolve(repoRoot, relativePath);
    const relativeTarget = path.relative(repoRoot, target);
    if (
      relativeTarget === ""
      || relativeTarget.startsWith("..")
      || path.isAbsolute(relativeTarget)
    ) {
      throw new Error(`Synthetic proof input escaped the capability leaf: ${relativePath}`);
    }
    mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, syntheticProofInputContent(relativePath), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
  }

  const dependencyAttestation = buildActiveBrowserDependencyProof(repoRoot, {
    environment: {}
  });
  const sourceFingerprints = requiredBrowserSourceFingerprints(repoRoot);
  const executionScope = buildRequiredBrowserExecutionScope({
    dependencyAttestation,
    mode,
    repoRoot,
    sourceFingerprints
  });
  const liveExecutionScope = assertLiveRequiredBrowserExecutionScope(executionScope, {
    dependencyAttestation,
    repoRoot,
    sourceFingerprints
  });
  return Object.freeze({
    dependencyAttestation,
    executionScope: liveExecutionScope,
    repoRoot,
    sourceFingerprints
  });
}
