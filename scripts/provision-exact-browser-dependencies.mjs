import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  constants as fsConstants,
  closeSync,
  chmodSync,
  copyFileSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statfsSync,
  writeFileSync,
  writeSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertCanonicalStarshipBrowserHost } from "./browser-host-geometry.mjs";

const NONCE_PATTERN = /^[a-f0-9]{64}$/;
const PROVISION_PREFIX = "dependency-provision-";
const MARKER_NAME = ".mais-dependency-provision.json";
const ACTIVATION_LOCK_NAME = ".mais-dependency-activation.lock";
const CACHE_MARKER_NAME = ".mais-dependency-cache.json";
const OWNED_DEPENDENCY_LAUNCHER = realpathSync(
  join(dirname(fileURLToPath(import.meta.url)), "owned-dependency-command-launcher.mjs")
);
const EXPECTED_CRITICAL_VERSIONS = Object.freeze({
  "@playwright/test": "1.59.1",
  next: "15.5.23",
  playwright: "1.59.1",
  postcss: "8.5.26"
});
const DEPENDENCY_FIELDS = Object.freeze([
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
]);
const LOCK_ROOT_DEPENDENCY_FIELDS = Object.freeze([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "workspaces"
]);
const SAFE_ENVIRONMENT_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "SHELL",
  "TERM",
  "USER"
]);
const NPM_RETRY_POLICY = Object.freeze({
  factor: 2,
  fetchTimeoutMs: 300_000,
  maxSockets: 1,
  maxTimeoutMs: 60_000,
  minTimeoutMs: 3_000,
  retries: 8
});
const APPROVED_NODE_OPTIONS = "--dns-result-order=ipv4first";
const CANONICAL_NPM_REGISTRY = "https://registry.npmjs.org/";
const NPM_NETWORK_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ENOTCACHED",
  "ETIMEDOUT"
]);
const NPM_PHASES = new Set([
  "npm-cache-verify",
  "npm-ci",
  "npm-ci-prefer-offline",
  "npm-ls-active",
  "npm-ls-staged"
]);
const PROVISION_PHASES = new Set([
  "activation",
  "cache-byte-copy",
  "layout",
  "npm-cache-verify",
  "npm-ci-prefer-offline",
  "npm-ls-active",
  "npm-ls-staged",
  "post-attestation",
  "staged-tree-attestation"
]);

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

function isStrictDescendant(candidate, parent) {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent !== "" && !pathFromParent.startsWith("..") && !pathFromParent.startsWith("/");
}

function assertCanonicalDirectory(label, directory) {
  const absolute = resolve(directory);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry || !entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error(`${label} must be an existing physical directory.`);
  }
  if (realpathSync(absolute) !== absolute) {
    throw new Error(`${label} must be canonical and contain no symlink chain.`);
  }
  return absolute;
}

function assertFreshProvisionNonce(nonce) {
  if (typeof nonce !== "string" || !NONCE_PATTERN.test(nonce)) {
    throw new Error("Dependency provision nonce must be 64 lowercase hexadecimal characters.");
  }
  return nonce;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function runReadOnly(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
    timeout: options.timeout ?? 30_000
  });
  if (result.error || result.status !== 0) {
    throw new Error(options.failureMessage ?? "Read-only dependency attestation command failed.");
  }
  return result.stdout;
}

function findPackageRoot(start, expectedName) {
  let current = dirname(start);
  while (true) {
    const manifestPath = join(current, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = readJson(manifestPath);
      if (manifest.name === expectedName) return { manifest, root: current };
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not establish the ${expectedName} package identity.`);
}

export function scanLocalDependencyReferences(packageManifest, lockfile) {
  const findings = [];
  const scanSection = (scope, section, values) => {
    if (!values || typeof values !== "object" || Array.isArray(values)) return;
    for (const [name, rawValue] of Object.entries(values)) {
      const value = String(rawValue);
      if (/^(?:file|link|workspace):|^(?:\.{1,2}[\\/]|[\\/])/.test(value)) {
        findings.push({ name, scope, section, valueKind: value.split(":", 1)[0] });
      }
    }
  };
  for (const field of DEPENDENCY_FIELDS) {
    scanSection("package.json", field, packageManifest[field]);
  }
  for (const [packagePath, entry] of Object.entries(lockfile.packages ?? {})) {
    if (entry?.link === true) {
      findings.push({
        name: packagePath || "<root>",
        scope: packagePath || "<root>",
        section: "lock-link",
        valueKind: "link"
      });
    }
    for (const field of DEPENDENCY_FIELDS) {
      scanSection(packagePath || "<root>", field, entry?.[field]);
    }
    if (typeof entry?.resolved === "string" && /^(?:file|link):|^(?:\.{1,2}[\\/]|[\\/])/.test(entry.resolved)) {
      findings.push({
        name: packagePath || "<root>",
        scope: packagePath || "<root>",
        section: "resolved",
        valueKind: entry.resolved.split(":", 1)[0]
      });
    }
  }
  return findings;
}

export function buildInstallOnlyManifest(packageManifest) {
  const installManifest = {};
  for (const field of [
    "name",
    "version",
    "private",
    "type",
    "packageManager",
    "engines",
    "os",
    "cpu",
    ...DEPENDENCY_FIELDS
  ]) {
    if (packageManifest[field] !== undefined) {
      installManifest[field] = structuredClone(packageManifest[field]);
    }
  }
  installManifest.scripts = {};
  return installManifest;
}

export function validateCriticalLockContract(packageManifest, lockfile) {
  if (lockfile.lockfileVersion !== 3 || !lockfile.packages?.[""]) {
    throw new Error("Dependency lock must be an npm lockfileVersion 3 with a root package entry.");
  }
  const lockRoot = lockfile.packages[""];
  for (const field of LOCK_ROOT_DEPENDENCY_FIELDS) {
    const packageValue = packageManifest[field] ?? undefined;
    const lockValue = lockRoot[field] ?? undefined;
    if (!sameJson(packageValue, lockValue)) {
      throw new Error(`package.json and package-lock.json disagree for ${field}.`);
    }
  }
  const packageExpectations = {
    "@playwright/test": packageManifest.devDependencies?.["@playwright/test"],
    next: packageManifest.dependencies?.next,
    postcss: packageManifest.devDependencies?.postcss
  };
  if (
    packageExpectations.next !== EXPECTED_CRITICAL_VERSIONS.next ||
    packageExpectations.postcss !== EXPECTED_CRITICAL_VERSIONS.postcss ||
    packageExpectations["@playwright/test"] !== `^${EXPECTED_CRITICAL_VERSIONS["@playwright/test"]}`
  ) {
    throw new Error("Critical package manifest expectations do not match the approved candidate.");
  }
  for (const [name, expectedVersion] of Object.entries(EXPECTED_CRITICAL_VERSIONS)) {
    const locked = lockfile.packages[`node_modules/${name}`];
    if (!locked || locked.version !== expectedVersion || typeof locked.integrity !== "string") {
      throw new Error(`Critical lock entry is missing an exact version/integrity for ${name}.`);
    }
  }
  return {
    criticalVersions: { ...EXPECTED_CRITICAL_VERSIONS },
    lockfileVersion: lockfile.lockfileVersion
  };
}

function runtimeLibc(platform = process.platform) {
  if (platform !== "linux") return null;
  const report = typeof process.report?.getReport === "function"
    ? process.report.getReport()
    : null;
  return report?.header?.glibcVersionRuntime ? "glibc" : "musl";
}

function normalizePlatformIdentity(identity = {}) {
  const normalized = {
    arch: identity.arch ?? process.arch,
    libc: identity.libc === undefined ? runtimeLibc(identity.platform ?? process.platform) : identity.libc,
    platform: identity.platform ?? process.platform
  };
  if (
    typeof normalized.arch !== "string" || normalized.arch.trim() === "" ||
    typeof normalized.platform !== "string" || normalized.platform.trim() === "" ||
    !(normalized.libc === null || (typeof normalized.libc === "string" && normalized.libc.trim() !== ""))
  ) {
    throw new Error("Dependency platform identity is invalid.");
  }
  return normalized;
}

function platformSelectorDecision(values, current) {
  if (values === undefined) return { constrained: false, excluded: false, invalid: false };
  if (
    !Array.isArray(values) || values.length === 0 ||
    values.some((value) => typeof value !== "string" || value === "" || value === "!")
  ) {
    return { constrained: true, excluded: false, invalid: true };
  }
  const denied = values
    .filter((value) => value.startsWith("!"))
    .map((value) => value.slice(1));
  const allowed = values.filter((value) => !value.startsWith("!"));
  return {
    constrained: true,
    excluded: (current !== null && denied.includes(current)) ||
      (allowed.length > 0 && !allowed.includes(current)),
    invalid: false
  };
}

function platformExclusion(entry, identity) {
  const fields = [
    ["os", identity.platform],
    ["cpu", identity.arch],
    ["libc", identity.libc]
  ];
  const excludedBy = [];
  const invalidFields = [];
  for (const [field, current] of fields) {
    const decision = platformSelectorDecision(entry?.[field], current);
    if (decision.invalid) invalidFields.push(field);
    if (decision.excluded) excludedBy.push(field);
  }
  return { excludedBy, invalidFields };
}

function parentLockPath(packagePath) {
  const separator = packagePath.lastIndexOf("/");
  return separator === -1 ? "" : packagePath.slice(0, separator);
}

function resolveLockPackageInstance(sourcePackages, parentPath, dependencyName) {
  let current = parentPath;
  const candidates = [];
  while (true) {
    const candidate = current
      ? `${current}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    candidates.push(candidate);
    if (sourcePackages[candidate]) return { candidates, packagePath: candidate };
    if (current === "") break;
    current = parentLockPath(current);
  }
  return { candidates, packagePath: null };
}

function dependencySelectorProof(selector) {
  const value = typeof selector === "string" ? selector : JSON.stringify(selector);
  const safe = typeof value === "string" &&
    value.length > 0 && value.length <= 128 &&
    /^[A-Za-z0-9@._~^<>=*|+:/ -]+$/.test(value) &&
    !/(?:https?:|token|auth|password|secret)/i.test(value);
  return {
    selector: safe ? value : null,
    selectorSha256: sha256Buffer(String(value))
  };
}

function dependencyEdges(packagePath, entry) {
  const edges = [];
  const optionalNames = new Set(Object.keys(entry?.optionalDependencies ?? {}));
  const add = (field, values, optional) => {
    for (const [dependencyName, selector] of Object.entries(values ?? {})) {
      if ((field === "dependencies" || field === "devDependencies") && optionalNames.has(dependencyName)) {
        continue;
      }
      edges.push({ dependencyName, field, optional, selector });
    }
  };
  add("dependencies", entry?.dependencies, false);
  if (packagePath === "") add("devDependencies", entry?.devDependencies, false);
  add("optionalDependencies", entry?.optionalDependencies, true);
  for (const [dependencyName, selector] of Object.entries(entry?.peerDependencies ?? {})) {
    edges.push({
      dependencyName,
      field: "peerDependencies",
      optional: entry?.peerDependenciesMeta?.[dependencyName]?.optional === true,
      selector
    });
  }
  return edges.sort((left, right) =>
    left.dependencyName.localeCompare(right.dependencyName) || left.field.localeCompare(right.field)
  );
}

function buildLockPackageGraph(sourcePackages, installedPackages, platformIdentity) {
  const graph = new Map();
  const mismatches = [];
  const unmaterializedOptionalPeers = [];
  for (const [parentPath, entry] of Object.entries(sourcePackages)) {
    const resolvedEdges = [];
    for (const edge of dependencyEdges(parentPath, entry)) {
      const selectorProof = dependencySelectorProof(edge.selector);
      if (typeof edge.selector !== "string" || edge.selector.trim() === "") {
        mismatches.push({
          dependencyName: edge.dependencyName,
          dependencyType: edge.field,
          packagePath: parentPath,
          reason: "invalid-lock-selector",
          ...selectorProof
        });
        continue;
      }
      const resolution = resolveLockPackageInstance(
        sourcePackages,
        parentPath,
        edge.dependencyName
      );
      if (!resolution.packagePath) {
        if (edge.field === "peerDependencies" && edge.optional) {
          unmaterializedOptionalPeers.push({
            dependencyName: edge.dependencyName,
            packagePath: parentPath,
            ...selectorProof
          });
          continue;
        }
        mismatches.push({
          dependencyName: edge.dependencyName,
          dependencyType: edge.field,
          packagePath: parentPath,
          reason: "unresolved-lock-edge",
          ...selectorProof
        });
        continue;
      }
      const targetEntry = sourcePackages[resolution.packagePath];
      const exclusion = platformExclusion(targetEntry, platformIdentity);
      if (exclusion.invalidFields.length > 0) {
        mismatches.push({
          packagePath: resolution.packagePath,
          reason: "invalid-platform-selector",
          selectorFields: exclusion.invalidFields
        });
      }
      resolvedEdges.push({
        dependencyName: edge.dependencyName,
        dependencyType: edge.field,
        excludedBy: exclusion.excludedBy,
        optional: edge.optional,
        parentPath,
        ...selectorProof,
        targetInstalled: Boolean(installedPackages[resolution.packagePath]),
        targetPath: resolution.packagePath
      });
    }
    graph.set(parentPath, resolvedEdges);
  }
  return {
    graph,
    mismatches,
    unmaterializedOptionalPeers: unmaterializedOptionalPeers.sort((left, right) =>
      left.packagePath.localeCompare(right.packagePath) ||
      left.dependencyName.localeCompare(right.dependencyName)
    )
  };
}

function traverseLockGraph(graph, { pruneIncompatibleOptionalEdges }) {
  const reachable = new Set([""]);
  const prunedRoots = [];
  const pending = [""];
  while (pending.length > 0) {
    const packagePath = pending.pop();
    for (const edge of graph.get(packagePath) ?? []) {
      if (
        pruneIncompatibleOptionalEdges && edge.optional && !edge.targetInstalled &&
        edge.excludedBy.length > 0
      ) {
        prunedRoots.push({
          dependencyName: edge.dependencyName,
          dependencyType: edge.dependencyType,
          excludedBy: edge.excludedBy,
          packagePath: edge.targetPath,
          parentPath: edge.parentPath,
          selector: edge.selector,
          selectorSha256: edge.selectorSha256
        });
        continue;
      }
      if (!reachable.has(edge.targetPath)) {
        reachable.add(edge.targetPath);
        pending.push(edge.targetPath);
      }
    }
  }
  const uniqueRoots = new Map();
  for (const root of prunedRoots) uniqueRoots.set(JSON.stringify(stableObject(root)), root);
  return {
    prunedRoots: [...uniqueRoots.values()].sort((left, right) =>
      left.packagePath.localeCompare(right.packagePath) || left.parentPath.localeCompare(right.parentPath)
    ),
    reachable
  };
}

export function compareInstalledLockToSource(
  sourceLock,
  installedLock,
  platformIdentity = { arch: process.arch, libc: runtimeLibc(), platform: process.platform }
) {
  const sourcePackages = sourceLock.packages ?? {};
  const installedPackages = installedLock.packages ?? {};
  const platform = normalizePlatformIdentity(platformIdentity);
  const builtGraph = buildLockPackageGraph(sourcePackages, installedPackages, platform);
  const fullTraversal = traverseLockGraph(builtGraph.graph, {
    pruneIncompatibleOptionalEdges: false
  });
  const retainedTraversal = traverseLockGraph(builtGraph.graph, {
    pruneIncompatibleOptionalEdges: true
  });
  const omittedClosure = [...fullTraversal.reachable]
    .filter((packagePath) => packagePath !== "" && !retainedTraversal.reachable.has(packagePath))
    .sort();
  const omittedSet = new Set(omittedClosure);
  const mismatches = [];
  let compared = 0;
  let optionalPlatformOmissions = 0;
  for (const [packagePath, installed] of Object.entries(installedPackages)) {
    if (packagePath === "") continue;
    const source = sourcePackages[packagePath];
    if (!source) {
      mismatches.push({ packagePath, reason: "extraneous-installed-entry" });
      continue;
    }
    compared += 1;
    for (const field of ["version", "integrity", "resolved"]) {
      if ((source[field] ?? null) !== (installed[field] ?? null)) {
        mismatches.push({ packagePath, reason: `${field}-mismatch` });
      }
    }
  }
  mismatches.push(...builtGraph.mismatches);
  for (const [packagePath, source] of Object.entries(sourcePackages)) {
    if (packagePath === "" || installedPackages[packagePath]) continue;
    if (omittedSet.has(packagePath)) {
      optionalPlatformOmissions += 1;
      continue;
    }
    mismatches.push({ packagePath, reason: "unexpected-missing-entry" });
  }
  return {
    compared,
    mismatches,
    omittedPlatform: {
      closure: omittedClosure,
      roots: retainedTraversal.prunedRoots
    },
    optionalPlatformOmissions,
    platform,
    unmaterializedOptionalPeers: builtGraph.unmaterializedOptionalPeers
  };
}

export function buildProvisionEnvironment(
  baseEnvironment,
  provisionRoot,
  nodeExecutable,
  ownerToken = resolve(provisionRoot).slice(-64)
) {
  const root = resolve(provisionRoot);
  assertFreshProvisionNonce(ownerToken);
  const environment = {};
  for (const key of SAFE_ENVIRONMENT_KEYS) {
    if (typeof baseEnvironment[key] === "string") environment[key] = baseEnvironment[key];
  }
  if (typeof baseEnvironment.HOME !== "string" || baseEnvironment.HOME.trim() === "") {
    throw new Error("Dependency provisioning requires HOME to remain explicitly unchanged.");
  }
  environment.HOME = baseEnvironment.HOME;
  environment.PATH = [dirname(realpathSync(nodeExecutable)), "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
  const paths = {
    config: join(root, "config"),
    data: join(root, "data"),
    logs: join(root, "logs"),
    nodeCompile: join(root, "node-compile-cache"),
    npmCache: join(root, "npm-cache"),
    playwrightBrowsers: join(root, "playwright-browsers"),
    prefix: join(root, "npm-prefix"),
    state: join(root, "state"),
    temp: join(root, "temp"),
    turbo: join(root, "turbo-cache")
  };
  Object.assign(environment, {
    MAIS_DEPENDENCY_OWNER_TOKEN: ownerToken,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_COMPILE_CACHE: paths.nodeCompile,
    NODE_OPTIONS: APPROVED_NODE_OPTIONS,
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_CACHE: paths.npmCache,
    NPM_CONFIG_FETCH_RETRIES: String(NPM_RETRY_POLICY.retries),
    NPM_CONFIG_FETCH_RETRY_FACTOR: String(NPM_RETRY_POLICY.factor),
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: String(NPM_RETRY_POLICY.minTimeoutMs),
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: String(NPM_RETRY_POLICY.maxTimeoutMs),
    NPM_CONFIG_FETCH_TIMEOUT: String(NPM_RETRY_POLICY.fetchTimeoutMs),
    NPM_CONFIG_FUND: "false",
    NPM_CONFIG_GLOBALCONFIG: join(paths.config, "npm-globalrc"),
    NPM_CONFIG_LOGS_DIR: paths.logs,
    NPM_CONFIG_MAXSOCKETS: String(NPM_RETRY_POLICY.maxSockets),
    NPM_CONFIG_PREFIX: paths.prefix,
    NPM_CONFIG_PROGRESS: "false",
    NPM_CONFIG_REGISTRY: CANONICAL_NPM_REGISTRY,
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    NPM_CONFIG_USERCONFIG: join(paths.config, "npm-userrc"),
    PLAYWRIGHT_BROWSERS_PATH: paths.playwrightBrowsers,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    TEMP: paths.temp,
    TMP: paths.temp,
    TMPDIR: paths.temp,
    TURBO_CACHE_DIR: paths.turbo,
    TURBO_TELEMETRY_DISABLED: "1",
    XDG_CACHE_HOME: paths.npmCache,
    XDG_CONFIG_HOME: paths.config,
    XDG_DATA_HOME: paths.data,
    XDG_STATE_HOME: paths.state
  });
  return { environment, paths };
}

function findNpmIdentity() {
  const npmCommand = runReadOnly("/usr/bin/which", ["npm"], {
    failureMessage: "npm executable identity could not be resolved."
  }).trim();
  const npmCli = realpathSync(npmCommand);
  const npmPackage = findPackageRoot(npmCli, "npm");
  return {
    cli: npmCli,
    cliSha256: sha256File(npmCli),
    version: npmPackage.manifest.version
  };
}

function processPreflight(repoRoot) {
  const standard = runReadOnly("ps", ["-axo", "pid=,ppid=,command="], {
    failureMessage: "Process preflight snapshot failed."
  });
  const extended = runReadOnly("ps", ["eww", "-axo", "pid=,command="], {
    failureMessage: "Process environment preflight snapshot failed.",
    maxBuffer: 32 * 1024 * 1024
  });
  const profilePattern = /--user-data-dir=(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  const profiles = new Set();
  const ppidByPid = new Map();
  const violations = [];
  let ownerAssociatedCount = 0;
  for (const line of standard.split(/\r?\n/)) {
    const parsed = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (!parsed) continue;
    const pid = Number(parsed[1]);
    const ppid = Number(parsed[2]);
    const command = parsed[3];
    ppidByPid.set(pid, ppid);
    for (const match of command.matchAll(profilePattern)) {
      const candidate = resolve(match[1] ?? match[2] ?? match[3]);
      if (candidate.includes("playwright_chromiumdev_profile-")) {
        profiles.add(candidate);
        violations.push({
          classification: isStrictDescendant(candidate, join(repoRoot, ".tmp"))
            ? "owned-playwright-profile"
            : "foreign-playwright-profile",
          pid,
          ppid
        });
      }
    }
    if (
      command.includes(`${repoRoot}/.tmp/bug3-owner-`) ||
      (
        command.includes(repoRoot) &&
        /node_modules\/(?:@playwright\/test|playwright|next)\/.+(?:\btest\b|\bbuild\b|\bstart\b)/.test(command)
      )
    ) {
      ownerAssociatedCount += 1;
      violations.push({ classification: "owner-associated-process", pid, ppid });
    }
  }
  let tokenBearingCount = 0;
  for (const line of extended.split(/\r?\n/)) {
    if (!/(?:^|\s)MAIS_(?:BROWSER|DEPENDENCY)_OWNER_TOKEN=[a-f0-9]{64}(?:\s|$)/.test(line)) {
      continue;
    }
    const pid = Number(line.match(/^\s*(\d+)/)?.[1]);
    tokenBearingCount += 1;
    violations.push({
      classification: "owner-token-process",
      pid: Number.isSafeInteger(pid) ? pid : null,
      ppid: Number.isSafeInteger(pid) ? (ppidByPid.get(pid) ?? null) : null
    });
  }
  const ownedProfileCount = [...profiles].filter((profile) =>
    isStrictDescendant(profile, join(repoRoot, ".tmp"))
  ).length;
  return {
    activeProfileCount: profiles.size,
    foreignProfileCount: profiles.size - ownedProfileCount,
    ownedProfileCount,
    ownerAssociatedCount,
    tokenBearingCount,
    violations: [...new Map(violations.map((violation) => [
      `${violation.classification}:${violation.pid}:${violation.ppid}`,
      violation
    ])).values()].sort((left, right) =>
      left.classification.localeCompare(right.classification) ||
      (left.pid ?? -1) - (right.pid ?? -1)
    )
  };
}

function criticalTreeState(nodeModulesRoot) {
  const versions = {};
  for (const name of Object.keys(EXPECTED_CRITICAL_VERSIONS)) {
    const packagePath = join(nodeModulesRoot, name, "package.json");
    if (!existsSync(packagePath)) {
      versions[name] = { status: "missing" };
      continue;
    }
    const canonical = realpathSync(packagePath);
    versions[name] = {
      rootIsInsideTree: isStrictDescendant(canonical, nodeModulesRoot),
      version: readJson(canonical).version
    };
  }
  return versions;
}

export function classifyCurrentDependencyTreeState({
  currentCritical,
  nodeModulesIsDirectory,
  nodeModulesIsSymlink,
  nodeModulesPath,
  nodeModulesRealpath,
  repoRoot
} = {}) {
  if (
    !currentCritical || typeof currentCritical !== "object" ||
    typeof nodeModulesPath !== "string" || typeof nodeModulesRealpath !== "string" ||
    typeof repoRoot !== "string"
  ) {
    throw new Error("Current dependency tree classification requires complete synthetic state.");
  }
  const currentIsExactPhysical =
    nodeModulesIsDirectory === true &&
    nodeModulesIsSymlink === false &&
    nodeModulesRealpath === nodeModulesPath &&
    Object.entries(EXPECTED_CRITICAL_VERSIONS).every(([name, version]) =>
      currentCritical[name]?.version === version && currentCritical[name]?.rootIsInsideTree === true
    );
  const currentIsExpectedMismatch =
    nodeModulesIsSymlink === true &&
    nodeModulesRealpath.startsWith("/Volumes/Starship/") &&
    !isStrictDescendant(nodeModulesRealpath, repoRoot) &&
    Object.entries(EXPECTED_CRITICAL_VERSIONS).some(([name, version]) =>
      currentCritical[name]?.version !== version
    );
  if (!currentIsExactPhysical && !currentIsExpectedMismatch) {
    throw new Error("Current node_modules is neither the attested mismatch nor an exact physical tree.");
  }
  return {
    action: currentIsExactPhysical ? "verify-existing" : "provision",
    currentIsExactPhysical,
    currentIsExpectedMismatch
  };
}

function sourceState(repoRoot) {
  const status = runReadOnly("git", ["status", "--short", "--untracked-files=all"], {
    cwd: repoRoot,
    failureMessage: "Git status attestation failed."
  });
  return {
    gitHead: runReadOnly("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      failureMessage: "Git HEAD attestation failed."
    }).trim(),
    gitStatusEntryCount: status.split(/\r?\n/).filter(Boolean).length,
    gitStatusSha256: sha256Buffer(status),
    nextEnvSha256: sha256File(join(repoRoot, "next-env.d.ts")),
    packageLockSha256: sha256File(join(repoRoot, "package-lock.json")),
    packageSha256: sha256File(join(repoRoot, "package.json"))
  };
}

export function collectDependencyProvisionPreflight(
  repoRoot = process.cwd(),
  { nonce = randomBytes(32).toString("hex") } = {}
) {
  const host = assertCanonicalStarshipBrowserHost({ repoRoot });
  const canonicalRepoRoot = host.repoRoot;
  const tmpBase = assertCanonicalDirectory("dependency tmp base", join(canonicalRepoRoot, ".tmp"));
  if (tmpBase !== join(canonicalRepoRoot, ".tmp")) {
    throw new Error("Dependency tmp base must be the exact worktree .tmp directory.");
  }
  assertFreshProvisionNonce(nonce);
  const packagePath = join(canonicalRepoRoot, "package.json");
  const lockPath = join(canonicalRepoRoot, "package-lock.json");
  const packageManifest = readJson(packagePath);
  const lockfile = readJson(lockPath);
  const localReferences = scanLocalDependencyReferences(packageManifest, lockfile);
  if (localReferences.length > 0) {
    throw new Error("Local-path/workspace dependency closure requires renewed architecture review.");
  }
  const lockContract = validateCriticalLockContract(packageManifest, lockfile);
  const processAudit = processPreflight(canonicalRepoRoot);
  if (
    processAudit.activeProfileCount !== 0 ||
    processAudit.foreignProfileCount !== 0 ||
    processAudit.ownerAssociatedCount !== 0 ||
    processAudit.tokenBearingCount !== 0
  ) {
    throw new Error("Dependency provisioning requires zero owner processes and Playwright profiles.");
  }
  const nodeModulesPath = join(canonicalRepoRoot, "node_modules");
  const nodeModulesEntry = lstatSync(nodeModulesPath, { throwIfNoEntry: false });
  if (!nodeModulesEntry) throw new Error("Existing node_modules candidate is missing.");
  const nodeModulesRealpath = realpathSync(nodeModulesPath);
  const currentCritical = criticalTreeState(nodeModulesRealpath);
  const currentState = classifyCurrentDependencyTreeState({
    currentCritical,
    nodeModulesIsDirectory: nodeModulesEntry.isDirectory(),
    nodeModulesIsSymlink: nodeModulesEntry.isSymbolicLink(),
    nodeModulesPath,
    nodeModulesRealpath,
    repoRoot: canonicalRepoRoot
  });
  const npm = findNpmIdentity();
  const disk = statfsSync(tmpBase, { bigint: true });
  const availableBytes = disk.bavail * disk.bsize;
  if (availableBytes < 3n * 1024n * 1024n * 1024n) {
    throw new Error("Dependency provisioning requires at least 3 GiB free on Starship.");
  }
  const provisionRoot = join(tmpBase, `${PROVISION_PREFIX}${nonce}`);
  if (existsSync(provisionRoot)) throw new Error("Dependency provision root must be fresh.");
  const activationLockPath = join(tmpBase, ACTIVATION_LOCK_NAME);
  if (existsSync(activationLockPath)) {
    throw new Error("Dependency activation lock already exists and requires review.");
  }
  const source = sourceState(canonicalRepoRoot);
  const provisionEnvironment = buildProvisionEnvironment(
    process.env,
    provisionRoot,
    realpathSync(process.execPath),
    nonce
  );
  const environmentProof = {
    allWritablePathsBound: Object.values(provisionEnvironment.paths).every((candidate) =>
      isStrictDescendant(candidate, provisionRoot)
    ),
    boundKeys: Object.keys(provisionEnvironment.environment).filter((key) =>
      /^(?:MAIS_DEPENDENCY_|NEXT_|NODE_(?:COMPILE_CACHE|OPTIONS)|NPM_CONFIG_|PLAYWRIGHT_|TEMP$|TMP|TURBO_|XDG_)/.test(key)
    ).sort(),
    homeUnchanged: provisionEnvironment.environment.HOME === process.env.HOME,
    nodeOptionsDropped: provisionEnvironment.environment.NODE_OPTIONS === APPROVED_NODE_OPTIONS,
    nodeOptionsPolicy: "dns-result-order-ipv4first",
    registry: provisionEnvironment.environment.NPM_CONFIG_REGISTRY === CANONICAL_NPM_REGISTRY
      ? "canonical-npmjs"
      : "invalid"
  };
  if (
    !environmentProof.allWritablePathsBound ||
    !environmentProof.homeUnchanged ||
    !environmentProof.nodeOptionsDropped ||
    environmentProof.registry !== "canonical-npmjs"
  ) {
    throw new Error("Dependency child environment pre-write confinement failed.");
  }
  return {
    action: currentState.action,
    availableBytes,
    currentCritical,
    currentNodeModulesIsSymlink: nodeModulesEntry.isSymbolicLink(),
    currentNodeModulesRealpath: nodeModulesRealpath,
    environmentProof,
    lockContract,
    lockPath,
    lockfile,
    node: {
      executable: realpathSync(process.execPath),
      executableSha256: sha256File(realpathSync(process.execPath)),
      version: process.version
    },
    nodeModulesPath,
    nonce,
    npm,
    packageManifest,
    packagePath,
    processAudit,
    provisionEnvironment,
    provisionRoot,
    repoRoot: canonicalRepoRoot,
    source,
    tmpBase,
    volumeDevice: host.volumeDevice
  };
}

function mkdirExact(directory) {
  mkdirSync(directory, { mode: 0o700, recursive: false });
  assertCanonicalDirectory("provision directory", directory);
}

function writeJsonAtomic(directory, target, value) {
  assertCanonicalDirectory("attestation directory", directory);
  if (dirname(target) !== directory) throw new Error("Attestation target escaped its exact directory.");
  const temporary = `${target}.tmp-${randomBytes(12).toString("hex")}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  renameSync(temporary, target);
  return target;
}

function markerPayload(preflight, status) {
  return {
    nonce: preflight.nonce,
    packageLockSha256: preflight.source.packageLockSha256,
    packageSha256: preflight.source.packageSha256,
    repoRoot: preflight.repoRoot,
    schemaVersion: 1,
    status
  };
}

function cacheMarkerPayload(preflight, cachePath, seedBinding = null) {
  const marker = {
    cachePath,
    nonce: preflight.nonce,
    packageLockSha256: preflight.source.packageLockSha256,
    packageSha256: preflight.source.packageSha256,
    repoRoot: preflight.repoRoot,
    schemaVersion: 1,
    status: seedBinding ? "seed-destination" : "fresh"
  };
  if (seedBinding) {
    if (
      typeof seedBinding.sourceAttemptId !== "string" ||
      !/^sha256:[a-f0-9]{64}$/.test(seedBinding.sourceAttemptId) ||
      typeof seedBinding.sourceManifestSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(seedBinding.sourceManifestSha256)
    ) {
      throw new Error("Destination cache marker seed binding is malformed.");
    }
    marker.sourceAttemptId = seedBinding.sourceAttemptId;
    marker.sourceManifestSha256 = seedBinding.sourceManifestSha256;
  }
  return marker;
}

export function validateConfinedCacheEntryObservation({
  canonicalDirectory = null,
  kind,
  mode,
  nlink = null,
  ownerMatches
} = {}) {
  if (ownerMatches !== true || !Number.isSafeInteger(mode) || (mode & 0o022) !== 0) {
    throw new Error("Confined npm cache entry ownership or write permissions are unsafe.");
  }
  if (kind === "symlink") {
    throw new Error("Confined npm cache rejects every symlink or special entry.");
  }
  if (kind === "directory") {
    if (canonicalDirectory !== true) {
      throw new Error("Confined npm cache directory escaped through a link chain.");
    }
    return kind;
  }
  if (kind !== "file") {
    throw new Error("Confined npm cache accepts only regular files and directories.");
  }
  if (!Number.isSafeInteger(nlink) || nlink !== 1) {
    throw new Error("Confined npm cache rejects hardlinked source files.");
  }
  return kind;
}

function cacheInventoryDetails(cacheRoot) {
  const canonicalRoot = assertCanonicalDirectory("confined npm cache", cacheRoot);
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (!Number.isSafeInteger(expectedUid)) {
    throw new Error("Confined npm cache inventory requires a numeric owner UID.");
  }
  const rootEntry = lstatSync(canonicalRoot);
  if (rootEntry.uid !== expectedUid || (rootEntry.mode & 0o022) !== 0) {
    throw new Error("Confined npm cache root ownership or write permissions are unsafe.");
  }
  const controlMarker = join(canonicalRoot, CACHE_MARKER_NAME);
  const markerEntry = lstatSync(controlMarker, { throwIfNoEntry: false });
  if (
    !markerEntry || !markerEntry.isFile() || markerEntry.isSymbolicLink() ||
    markerEntry.uid !== expectedUid || (markerEntry.mode & 0o777) !== 0o600
  ) {
    throw new Error("Confined npm cache requires one physical 0600 cache marker.");
  }
  const entries = [];
  const walk = (directory) => {
    for (const child of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name)
    )) {
      const candidate = join(directory, child.name);
      const relativePath = relative(canonicalRoot, candidate);
      if (relativePath === CACHE_MARKER_NAME) continue;
      if (!isStrictDescendant(candidate, canonicalRoot) || relativePath.startsWith("..")) {
        throw new Error("Confined npm cache entry escaped its canonical root.");
      }
      const identity = lstatSync(candidate, { throwIfNoEntry: false });
      if (!identity) throw new Error("Confined npm cache entry disappeared during inventory.");
      const observedKind = identity.isSymbolicLink()
        ? "symlink"
        : identity.isDirectory()
          ? "directory"
          : identity.isFile()
            ? "file"
            : "other";
      validateConfinedCacheEntryObservation({
        canonicalDirectory: observedKind === "directory" ? realpathSync(candidate) === candidate : null,
        kind: observedKind,
        mode: identity.mode,
        nlink: observedKind === "file" ? identity.nlink : null,
        ownerMatches: identity.uid === expectedUid
      });
      if (identity.isDirectory()) {
        entries.push({ relativePath, type: "directory" });
        walk(candidate);
        continue;
      }
      entries.push({
        relativePath,
        sha256: sha256File(candidate),
        size: identity.size,
        type: "file"
      });
    }
  };
  walk(canonicalRoot);
  const stableEntries = entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath) || left.type.localeCompare(right.type)
  );
  const files = stableEntries.filter(({ type }) => type === "file");
  return {
    canonicalRoot,
    entries: stableEntries,
    publicProof: {
      directoryCount: stableEntries.length - files.length,
      fileCount: files.length,
      inventorySha256: sha256Buffer(JSON.stringify(stableEntries)),
      totalBytes: files.reduce((total, entry) => total + entry.size, 0)
    }
  };
}

export function inventoryConfinedNpmCache(cacheRoot) {
  return cacheInventoryDetails(cacheRoot).publicProof;
}

function assertDestinationCacheMarker(destinationRoot, expectedMarker, expectedIdentity = null) {
  if (!expectedMarker || typeof expectedMarker !== "object") {
    throw new Error("Expected destination cache marker contract is missing.");
  }
  const markerPath = join(destinationRoot, CACHE_MARKER_NAME);
  const identity = lstatSync(markerPath, { throwIfNoEntry: false });
  if (
    !identity || !identity.isFile() || identity.isSymbolicLink() ||
    (identity.mode & 0o777) !== 0o600 ||
    !sameJson(readJson(markerPath), expectedMarker) ||
    (expectedIdentity && (
      identity.dev !== expectedIdentity.dev || identity.ino !== expectedIdentity.ino
    ))
  ) {
    throw new Error("Destination cache marker is missing, late, changed, or mismatched.");
  }
  return { dev: identity.dev, ino: identity.ino };
}

export function copyConfinedNpmCache(
  sourceCache,
  destinationCache,
  {
    afterCopy,
    afterMarkerVerified,
    expectedDestinationMarker,
    expectedSourceInventory
  } = {}
) {
  const sourceBefore = cacheInventoryDetails(sourceCache);
  if (expectedSourceInventory && !sameJson(sourceBefore.publicProof, expectedSourceInventory)) {
    throw new Error("Confined npm cache source changed after its frozen manifest.");
  }
  const destinationRoot = assertCanonicalDirectory("fresh destination npm cache", destinationCache);
  if (sourceBefore.canonicalRoot === destinationRoot) {
    throw new Error("Confined npm cache copy cannot directly reuse its source.");
  }
  const destinationMarkerIdentity = assertDestinationCacheMarker(
    destinationRoot,
    expectedDestinationMarker
  );
  afterMarkerVerified?.();
  assertDestinationCacheMarker(
    destinationRoot,
    expectedDestinationMarker,
    destinationMarkerIdentity
  );
  chmodSync(destinationRoot, 0o700);
  for (const entry of sourceBefore.entries) {
    const source = join(sourceBefore.canonicalRoot, entry.relativePath);
    const destination = join(destinationRoot, entry.relativePath);
    if (
      !isStrictDescendant(source, sourceBefore.canonicalRoot) ||
      !isStrictDescendant(destination, destinationRoot)
    ) {
      throw new Error("Confined npm cache copy path escaped its exact root.");
    }
    const existing = lstatSync(destination, { throwIfNoEntry: false });
    if (entry.type === "directory") {
      if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
        throw new Error("Confined npm cache directory collision is unsafe.");
      }
      if (!existing) mkdirSync(destination, { mode: 0o700, recursive: false });
      chmodSync(destination, 0o700);
      continue;
    }
    if (existing) {
      if (
        !existing.isFile() || existing.isSymbolicLink() ||
        existing.size !== entry.size || sha256File(destination) !== entry.sha256
      ) {
        throw new Error("Confined npm cache collision is not byte-identical.");
      }
    } else {
      copyFileSync(source, destination, fsConstants.COPYFILE_EXCL);
    }
    chmodSync(destination, 0o600);
    const sourceIdentity = lstatSync(source);
    const destinationIdentity = lstatSync(destination);
    if (
      destinationIdentity.nlink !== 1 ||
      (sourceIdentity.dev === destinationIdentity.dev && sourceIdentity.ino === destinationIdentity.ino)
    ) {
      throw new Error("Confined npm cache copy created a forbidden hardlink.");
    }
  }
  afterCopy?.();
  const sourceAfter = cacheInventoryDetails(sourceBefore.canonicalRoot);
  const destinationAfter = cacheInventoryDetails(destinationRoot);
  assertDestinationCacheMarker(
    destinationRoot,
    expectedDestinationMarker,
    destinationMarkerIdentity
  );
  if (
    !sameJson(sourceBefore.publicProof, sourceAfter.publicProof) ||
    !sameJson(sourceBefore.publicProof, destinationAfter.publicProof)
  ) {
    throw new Error("Confined npm cache changed during byte-copy provenance validation.");
  }
  return {
    hardlinkCount: 0,
    postCopy: destinationAfter.publicProof,
    preCopy: sourceBefore.publicProof,
    sourceAfter: sourceAfter.publicProof
  };
}

function readOwned0600Json(filePath, label) {
  const entry = lstatSync(filePath, { throwIfNoEntry: false });
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (
    !entry || !entry.isFile() || entry.isSymbolicLink() ||
    entry.uid !== expectedUid || (entry.mode & 0o777) !== 0o600 ||
    realpathSync(filePath) !== filePath
  ) {
    throw new Error(`${label} must be one owner-controlled physical 0600 JSON file.`);
  }
  return readJson(filePath);
}

export function validateCacheSeedAncestorObservation({
  kind,
  mode,
  ownerMatches
} = {}) {
  if (
    kind !== "directory"
    || ownerMatches !== true
    || !Number.isSafeInteger(mode)
    || (mode & 0o022) !== 0
  ) {
    throw new Error("Cache-seed ancestor ownership or writable permissions are unsafe.");
  }
  return true;
}

function assertSafeCacheSeedAncestors(repoRoot, cacheRoot) {
  const canonicalRepo = assertCanonicalDirectory("cache-seed repository root", repoRoot);
  const canonicalCache = assertCanonicalDirectory("cache-seed npm cache", cacheRoot);
  if (!isStrictDescendant(canonicalCache, canonicalRepo)) {
    throw new Error("Cache-seed root escaped the canonical repository boundary.");
  }
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  let current = canonicalCache;
  while (true) {
    const entry = lstatSync(current);
    validateCacheSeedAncestorObservation({
      kind: entry.isSymbolicLink()
        ? "symlink"
        : entry.isDirectory()
          ? "directory"
          : "other",
      mode: entry.mode,
      ownerMatches: entry.uid === expectedUid
    });
    if (current === canonicalRepo) break;
    const parent = dirname(current);
    if (parent === current || (!isStrictDescendant(parent, canonicalRepo) && parent !== canonicalRepo)) {
      throw new Error("Cache-seed ancestor chain escaped the repository boundary.");
    }
    current = parent;
  }
}

function seedSourceHashesMatch(current, prior) {
  for (const key of ["gitHead", "nextEnvSha256", "packageLockSha256", "packageSha256"]) {
    if (current?.[key] !== undefined && current[key] !== prior?.[key]) return false;
  }
  return (
    current?.packageLockSha256 === prior?.packageLockSha256 &&
    current?.packageSha256 === prior?.packageSha256
  );
}

export function validateConfinedCacheSeed(preflight, seedRoot) {
  if (
    !preflight ||
    preflight.processAudit?.activeProfileCount !== 0 ||
    preflight.processAudit?.foreignProfileCount !== 0 ||
    preflight.processAudit?.ownerAssociatedCount !== 0 ||
    preflight.processAudit?.tokenBearingCount !== 0
  ) {
    throw new Error("Cache-seed validation requires zero processes and Playwright profiles.");
  }
  const canonicalSeed = assertCanonicalDirectory("cache-seed provision root", seedRoot);
  if (dirname(canonicalSeed) !== preflight.tmpBase) {
    throw new Error("Cache-seed provision root is not an exact prior worktree attempt.");
  }
  const nameMatch = canonicalSeed.match(/\/dependency-provision-([a-f0-9]{64})$/);
  if (!nameMatch) throw new Error("Cache-seed attempt identity is malformed.");
  const seedNonce = nameMatch[1];
  const cacheRoot = join(canonicalSeed, "npm-cache");
  assertSafeCacheSeedAncestors(preflight.repoRoot, cacheRoot);
  const ownerMarker = readOwned0600Json(
    join(canonicalSeed, MARKER_NAME),
    "Cache-seed owner marker"
  );
  const cacheMarkerPath = join(cacheRoot, CACHE_MARKER_NAME);
  const cacheMarker = readOwned0600Json(cacheMarkerPath, "Cache-seed cache marker");
  const failure = readOwned0600Json(
    join(canonicalSeed, "evidence", "failure-attestation.json"),
    "Cache-seed failure attestation"
  );
  const failurePath = join(canonicalSeed, "evidence", "failure-attestation.json");
  const expectedOwnerMarker = {
    nonce: seedNonce,
    packageLockSha256: preflight.source.packageLockSha256,
    packageSha256: preflight.source.packageSha256,
    repoRoot: preflight.repoRoot,
    schemaVersion: 1,
    status: "provisioning"
  };
  const expectedCacheMarker = {
    cachePath: cacheRoot,
    nonce: seedNonce,
    packageLockSha256: preflight.source.packageLockSha256,
    packageSha256: preflight.source.packageSha256,
    repoRoot: preflight.repoRoot,
    schemaVersion: 1,
    status: "fresh"
  };
  if (!sameJson(ownerMarker, expectedOwnerMarker) || !sameJson(cacheMarker, expectedCacheMarker)) {
    throw new Error("Cache-seed owner/cache marker binding mismatch.");
  }
  const sourceAttemptId = `sha256:${sha256Buffer(seedNonce)}`;
  if (
    failure?.schemaVersion !== 1 || failure.status !== "failed" ||
    failure.rollbackRestored !== true ||
    failure.cache?.markerSha256 !== sha256File(cacheMarkerPath) ||
    failure.failure?.failedPhase !== "npm-ci-prefer-offline" ||
    failure.failure?.networkCode !== "ECONNRESET" ||
    !seedSourceHashesMatch(preflight.source, failure.preflight?.source) ||
    !Array.isArray(failure.failure?.subprocesses) ||
    failure.failure.subprocesses.length === 0 ||
    failure.failure.subprocesses.some((processSummary) =>
      processSummary.endedAtObserved !== true ||
      processSummary.identityEstablished !== true ||
      processSummary.processOutcome?.survivorCount !== 0 ||
      processSummary.signal !== null ||
      processSummary.timedOut === true ||
      processSummary.outputOverflow === true
    )
  ) {
    throw new Error("Cache-seed failure/shutdown/source evidence is incomplete or mismatched.");
  }
  let lineageDepth;
  let parentAttemptId = null;
  if (failure.cache?.provenance === "fresh-confined-cache") {
    lineageDepth = 0;
  } else if (failure.cache?.provenance === "byte-copied-verified-cache") {
    const seed = failure.cache.seed;
    if (
      seed?.schemaVersion !== 1 || seed.status !== "byte-copied-and-revalidated" ||
      seed.destinationAttemptId !== sourceAttemptId ||
      seed.source?.provenance !== "validated-prior-confined-cache" ||
      typeof seed.source?.sourceAttemptId !== "string" ||
      !seed.source.sourceAttemptId.startsWith("sha256:") ||
      !sameJson(seed.copy?.preCopy, seed.copy?.postCopy) ||
      !sameJson(seed.copy?.preCopy, seed.copy?.sourceAfter) ||
      !sameJson(seed.copy?.preCopy, seed.source?.inventory) ||
      seed.copy?.hardlinkCount !== 0 ||
      !failure.cache?.verifiedInventory ||
      failure.cache?.offlineCacheMiss !== true
    ) {
      throw new Error("Cache-seed lineage provenance is incomplete or inconsistent.");
    }
    lineageDepth = 1;
    parentAttemptId = seed.source.sourceAttemptId;
  } else {
    throw new Error("Cache-seed provenance class is not approved.");
  }
  if (existsSync(join(canonicalSeed, "install", "node_modules"))) {
    throw new Error("Cache-seed attempt retained an unquarantined partial node_modules tree.");
  }
  const inventory = inventoryConfinedNpmCache(cacheRoot);
  if (preflight.availableBytes < BigInt(inventory.totalBytes) + 3n * 1024n * 1024n * 1024n) {
    throw new Error("Cache-seed byte-copy lacks sufficient same-volume free space.");
  }
  const sourceManifest = {
    cacheMarkerSha256: sha256File(cacheMarkerPath),
    inventory,
    lineageDepth,
    packageLockSha256: preflight.source.packageLockSha256,
    packageSha256: preflight.source.packageSha256,
    parentAttemptId,
    schemaVersion: 1,
    sourceAttemptId,
    terminalAttestationSha256: sha256File(failurePath)
  };
  const sourceManifestSha256 = sha256Buffer(JSON.stringify(stableObject(sourceManifest)));
  return {
    cacheRoot,
    inventory,
    lineageDepth,
    parentAttemptId,
    publicProof: {
      inventory,
      lineageDepth,
      markerSha256: sha256File(cacheMarkerPath),
      provenance: "validated-prior-confined-cache",
      sourceAttemptId,
      sourceManifest,
      sourceManifestSha256
    },
    sourceAttemptId,
    sourceManifest,
    sourceManifestSha256,
    sourceRoot: canonicalSeed
  };
}

export function discoverUniqueConfinedCacheSeed(preflight) {
  const candidates = [];
  for (const entry of readdirSync(preflight.tmpBase, { withFileTypes: true })) {
    if (!/^dependency-provision-[a-f0-9]{64}$/.test(entry.name)) continue;
    const candidate = join(preflight.tmpBase, entry.name);
    const identity = lstatSync(candidate, { throwIfNoEntry: false });
    if (!identity || identity.isSymbolicLink()) {
      throw new Error("Prior dependency attempt entry is missing or symlinked.");
    }
    if (!identity.isDirectory()) continue;
    if (!existsSync(join(candidate, "npm-cache", CACHE_MARKER_NAME))) continue;
    candidates.push(validateConfinedCacheSeed(preflight, candidate));
  }
  const highestLineage = Math.max(...candidates.map(({ lineageDepth }) => lineageDepth), -1);
  const selected = candidates.filter(({ lineageDepth }) => lineageDepth === highestLineage);
  if (highestLineage !== 1 || selected.length !== 1) {
    throw new Error("Retry requires exactly one validated seeded-cache lineage head.");
  }
  if (
    typeof selected[0].parentAttemptId !== "string" ||
    !candidates.some(({ lineageDepth, sourceAttemptId }) =>
      lineageDepth === 0 && sourceAttemptId === selected[0].parentAttemptId
    )
  ) {
    throw new Error("Seeded-cache lineage head lacks its validated fresh-cache ancestor.");
  }
  return selected[0];
}

function assertCacheMarker(preflight, cachePath, expectedMarker) {
  const canonicalCache = assertCanonicalDirectory("dependency npm cache", cachePath);
  if (canonicalCache !== preflight.provisionEnvironment.paths.npmCache) {
    throw new Error("Dependency npm cache escaped the fresh provision root.");
  }
  const markerPath = join(canonicalCache, CACHE_MARKER_NAME);
  const entry = lstatSync(markerPath, { throwIfNoEntry: false });
  if (!entry || !entry.isFile() || entry.isSymbolicLink()) {
    throw new Error("Dependency npm cache marker is missing or unsafe.");
  }
  if (!expectedMarker || !sameJson(readJson(markerPath), expectedMarker)) {
    throw new Error("Dependency npm cache marker identity mismatch.");
  }
  return markerPath;
}

function assertMarker(preflight, provisionRoot) {
  const markerPath = join(provisionRoot, MARKER_NAME);
  const marker = readJson(markerPath);
  if (
    marker.nonce !== preflight.nonce ||
    marker.repoRoot !== preflight.repoRoot ||
    marker.schemaVersion !== 1 ||
    marker.packageSha256 !== preflight.source.packageSha256 ||
    marker.packageLockSha256 !== preflight.source.packageLockSha256
  ) {
    throw new Error("Dependency provision marker identity mismatch.");
  }
  return markerPath;
}

function acquireActivationLock(preflight) {
  const lockPath = join(preflight.tmpBase, ACTIVATION_LOCK_NAME);
  const parent = lstatSync(preflight.tmpBase);
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error("Dependency activation lock parent must remain a physical directory.");
  }
  const parentIdentity = Object.freeze({ dev: parent.dev, ino: parent.ino });
  const descriptor = openSync(lockPath, "wx", 0o600);
  const payload = `${JSON.stringify({ nonce: preflight.nonce, repoRoot: preflight.repoRoot })}\n`;
  writeSync(descriptor, payload);
  closeSync(descriptor);
  const identity = lstatSync(lockPath);
  return {
    identity: { dev: identity.dev, ino: identity.ino },
    lockPath,
    parentIdentity,
    payload
  };
}

function releaseActivationLock(lock) {
  const current = lstatSync(lock.lockPath, { throwIfNoEntry: false });
  if (
    !current || current.isSymbolicLink() || !current.isFile() ||
    current.dev !== lock.identity.dev || current.ino !== lock.identity.ino ||
    (current.mode & 0o777) !== 0o600 ||
    (typeof process.getuid === "function" && current.uid !== process.getuid()) ||
    readFileSync(lock.lockPath, "utf8") !== lock.payload
  ) {
    throw new Error("Dependency activation lock changed identity and will be retained in place.");
  }
  const parentPath = dirname(lock.lockPath);
  const parent = lstatSync(parentPath, { throwIfNoEntry: false });
  if (
    !parent?.isDirectory()
    || parent.isSymbolicLink()
    || parent.dev !== lock.parentIdentity.dev
    || parent.ino !== lock.parentIdentity.ino
  ) {
    throw new Error("Dependency activation lock parent identity changed before retention.");
  }
  const retained = `${lock.lockPath}.retained-released-${randomBytes(24).toString("hex")}`;
  if (existsSync(retained)) throw new Error("Dependency activation retained-lock target already exists.");
  renameSync(lock.lockPath, retained);
  const retainedEntry = lstatSync(retained, { throwIfNoEntry: false });
  const retainedParent = lstatSync(parentPath, { throwIfNoEntry: false });
  if (
    !retainedEntry?.isFile()
    || retainedEntry.isSymbolicLink()
    || retainedEntry.dev !== lock.identity.dev
    || retainedEntry.ino !== lock.identity.ino
    || (retainedEntry.mode & 0o777) !== 0o600
    || (typeof process.getuid === "function" && retainedEntry.uid !== process.getuid())
    || readFileSync(retained, "utf8") !== lock.payload
    || !retainedParent?.isDirectory()
    || retainedParent.isSymbolicLink()
    || retainedParent.dev !== lock.parentIdentity.dev
    || retainedParent.ino !== lock.parentIdentity.ino
    || existsSync(lock.lockPath)
  ) {
    throw new Error("Dependency activation retained-lock identity or content changed after rename.");
  }
  return retained;
}

function redactLog(value) {
  return String(value)
    .replace(/(authorization\s*:\s*(?:bearer|basic)\s+)\S+/gi, "$1[REDACTED]")
    .replace(/\b(?:token|secret|password|credential|api[-_]?key)=\S+/gi, "credential=[REDACTED]")
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/\b(?:sk_(?:live|test)_[A-Za-z0-9_-]+|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+)\b/g, "[REDACTED]");
}

function boundedLogBuffer(value, maxBytes = 512 * 1024) {
  const marker = "\n[LOG_TRUNCATED]\n";
  const bytes = Buffer.from(value, "utf8");
  const markerBytes = Buffer.from(marker, "utf8");
  const truncated = bytes.length > maxBytes;
  const retained = truncated
    ? Buffer.concat([bytes.subarray(0, maxBytes - markerBytes.length), markerBytes])
    : bytes;
  return { retained, truncated };
}

function writeBoundedLog(logPath, stdout, stderr, maxBytes = 512 * 1024) {
  const redacted = redactLog(`${stdout ?? ""}${stderr ?? ""}`);
  const { retained, truncated } = boundedLogBuffer(redacted, maxBytes);
  writeFileSync(logPath, retained, { flag: "wx", mode: 0o600 });
  return { bytes: retained.length, sha256: sha256Buffer(retained), truncated };
}

export function normalizeConfinedNpmDebugLogs(logsDirectory, maxBytes = 512 * 1024) {
  const canonicalLogs = assertCanonicalDirectory("npm logs directory", logsDirectory);
  const files = [];
  for (const entry of readdirSync(canonicalLogs, { withFileTypes: true })) {
    if (!/(?:^npm-debug|-debug-\d+)\.log$/.test(entry.name)) continue;
    const target = join(canonicalLogs, entry.name);
    const before = lstatSync(target, { throwIfNoEntry: false });
    if (!before || !before.isFile() || before.isSymbolicLink()) {
      throw new Error("Confined npm debug log must be a physical regular file.");
    }
    const descriptor = openSync(
      target,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)
    );
    let raw;
    let opened;
    try {
      opened = fstatSync(descriptor);
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
        throw new Error("Confined npm debug log changed identity before sanitization.");
      }
      raw = readFileSync(descriptor, "utf8");
    } finally {
      closeSync(descriptor);
    }
    const sanitized = redactLog(raw).replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s]+/gi, "[URL]");
    const { retained, truncated } = boundedLogBuffer(sanitized, maxBytes);
    const temporary = join(canonicalLogs, `.npm-debug-sanitized-${randomBytes(12).toString("hex")}`);
    const logsParent = lstatSync(canonicalLogs);
    if (!logsParent.isDirectory() || logsParent.isSymbolicLink()) {
      throw new Error("Confined npm debug-log parent must remain a physical directory.");
    }
    const logsParentIdentity = Object.freeze({ dev: logsParent.dev, ino: logsParent.ino });
    let temporaryIdentity = null;
    try {
      writeFileSync(temporary, retained, { flag: "wx", mode: 0o600 });
      chmodSync(temporary, 0o600);
      const createdTemporary = lstatSync(temporary, { throwIfNoEntry: false });
      if (
        !createdTemporary?.isFile()
        || createdTemporary.isSymbolicLink()
        || (createdTemporary.mode & 0o777) !== 0o600
        || (typeof process.getuid === "function" && createdTemporary.uid !== process.getuid())
        || readFileSync(temporary, "utf8") !== retained
      ) {
        throw new Error("Confined npm debug-log temporary identity or content changed after creation.");
      }
      temporaryIdentity = Object.freeze({ dev: createdTemporary.dev, ino: createdTemporary.ino });
      const current = lstatSync(target, { throwIfNoEntry: false });
      if (
        !current || !current.isFile() || current.isSymbolicLink() ||
        current.dev !== opened.dev || current.ino !== opened.ino
      ) {
        throw new Error("Confined npm debug log changed identity during sanitization.");
      }
      const immediatelyBeforeRename = lstatSync(temporary, { throwIfNoEntry: false });
      const immediatelyBeforeRenameParent = lstatSync(canonicalLogs, { throwIfNoEntry: false });
      if (
        !immediatelyBeforeRename?.isFile()
        || immediatelyBeforeRename.isSymbolicLink()
        || immediatelyBeforeRename.dev !== temporaryIdentity.dev
        || immediatelyBeforeRename.ino !== temporaryIdentity.ino
        || (immediatelyBeforeRename.mode & 0o777) !== 0o600
        || (typeof process.getuid === "function" && immediatelyBeforeRename.uid !== process.getuid())
        || readFileSync(temporary, "utf8") !== retained
        || !immediatelyBeforeRenameParent?.isDirectory()
        || immediatelyBeforeRenameParent.isSymbolicLink()
        || immediatelyBeforeRenameParent.dev !== logsParentIdentity.dev
        || immediatelyBeforeRenameParent.ino !== logsParentIdentity.ino
      ) {
        throw new Error("Confined npm debug-log temporary or parent changed before atomic rename.");
      }
      renameSync(temporary, target);
      chmodSync(target, 0o600);
      const promoted = lstatSync(target, { throwIfNoEntry: false });
      if (
        !promoted?.isFile()
        || promoted.isSymbolicLink()
        || promoted.dev !== temporaryIdentity.dev
        || promoted.ino !== temporaryIdentity.ino
        || (promoted.mode & 0o777) !== 0o600
        || (typeof process.getuid === "function" && promoted.uid !== process.getuid())
        || readFileSync(target, "utf8") !== retained
      ) {
        throw new Error("Confined npm debug-log promoted identity or content changed after rename.");
      }
    } catch (error) {
      try {
        const currentTemporary = lstatSync(temporary, { throwIfNoEntry: false });
        if (temporaryIdentity && currentTemporary) {
          if (
            currentTemporary.isSymbolicLink()
            || !currentTemporary.isFile()
            || currentTemporary.dev !== temporaryIdentity.dev
            || currentTemporary.ino !== temporaryIdentity.ino
            || (currentTemporary.mode & 0o777) !== 0o600
            || (typeof process.getuid === "function" && currentTemporary.uid !== process.getuid())
            || readFileSync(temporary, "utf8") !== retained
          ) {
            throw new Error("Confined npm debug-log temporary changed and was retained in place.");
          }
          const currentParent = lstatSync(canonicalLogs, { throwIfNoEntry: false });
          if (
            !currentParent?.isDirectory()
            || currentParent.isSymbolicLink()
            || currentParent.dev !== logsParentIdentity.dev
            || currentParent.ino !== logsParentIdentity.ino
          ) {
            throw new Error("Confined npm debug-log parent changed before temporary retention.");
          }
          const retainedTemporaryPath = join(
            canonicalLogs,
            `.npm-debug-retained-failure-${randomBytes(24).toString("hex")}`
          );
          if (existsSync(retainedTemporaryPath)) {
            throw new Error("Confined npm debug-log retained target unexpectedly exists.");
          }
          renameSync(temporary, retainedTemporaryPath);
          const retainedTemporary = lstatSync(retainedTemporaryPath, { throwIfNoEntry: false });
          const retainedParent = lstatSync(canonicalLogs, { throwIfNoEntry: false });
          if (
            !retainedTemporary?.isFile()
            || retainedTemporary.isSymbolicLink()
            || retainedTemporary.dev !== temporaryIdentity.dev
            || retainedTemporary.ino !== temporaryIdentity.ino
            || (retainedTemporary.mode & 0o777) !== 0o600
            || (typeof process.getuid === "function" && retainedTemporary.uid !== process.getuid())
            || readFileSync(retainedTemporaryPath, "utf8") !== retained
            || !retainedParent?.isDirectory()
            || retainedParent.isSymbolicLink()
            || retainedParent.dev !== logsParentIdentity.dev
            || retainedParent.ino !== logsParentIdentity.ino
            || existsSync(temporary)
          ) {
            throw new Error("Confined npm debug-log retained identity or content changed after rename.");
          }
        }
      } catch (retentionError) {
        throw new AggregateError(
          [error, retentionError],
          "Confined npm debug-log sanitization failed and exact temporary retention could not be proven."
        );
      }
      throw error;
    }
    files.push({
      bytes: retained.length,
      label: "npm-debug-log",
      sha256: sha256Buffer(retained),
      truncated
    });
  }
  return { count: files.length, files };
}

function sanitizeTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    ? value
    : null;
}

function sanitizedRetryPolicy(policy) {
  if (!sameJson(policy, NPM_RETRY_POLICY)) {
    throw new Error("npm retry policy differs from the approved bounded contract.");
  }
  return { ...NPM_RETRY_POLICY };
}

function npmNetworkCode(result) {
  const text = `${result?.stdout ?? ""}\n${result?.stderr ?? ""}`;
  for (const match of text.matchAll(/\bE[A-Z0-9_]{2,31}\b/g)) {
    if (NPM_NETWORK_CODES.has(match[0])) return match[0];
  }
  return null;
}

export function summarizeNpmProcessOutcome(phase, result, retryPolicy = NPM_RETRY_POLICY) {
  if (!NPM_PHASES.has(phase)) throw new Error("Unknown npm dependency phase.");
  if (!result || typeof result !== "object") throw new Error("npm process outcome is missing.");
  const survivorCount = Number.isSafeInteger(result.survivorCount) && result.survivorCount >= 0
    ? result.survivorCount
    : 0;
  const completionReason = result.timedOut
    ? "hard-timeout"
    : survivorCount > 0
      ? "process-survivor"
      : result.identityEstablished === false
        ? "identity-unestablished"
        : result.signal
          ? "signal"
          : result.status === 0
            ? "exit-zero"
            : "exit-nonzero";
  const signal = typeof result.signal === "string" && /^SIG[A-Z0-9]+$/.test(result.signal)
    ? result.signal
    : null;
  const log = result.log && Number.isSafeInteger(result.log.bytes) && result.log.bytes >= 0 &&
    typeof result.log.sha256 === "string" && /^[a-f0-9]{64}$/.test(result.log.sha256)
    ? {
        bytes: result.log.bytes,
        sha256: result.log.sha256,
        truncated: result.log.truncated === true
      }
    : null;
  const debugLogs = result.debugLogs &&
    Number.isSafeInteger(result.debugLogs.count) && result.debugLogs.count >= 0 &&
    Array.isArray(result.debugLogs.files)
    ? {
        count: result.debugLogs.count,
        files: result.debugLogs.files.map((file) => ({
          bytes: Number.isSafeInteger(file.bytes) && file.bytes >= 0 ? file.bytes : 0,
          label: "npm-debug-log",
          sha256: typeof file.sha256 === "string" && /^[a-f0-9]{64}$/.test(file.sha256)
            ? file.sha256
            : null,
          truncated: file.truncated === true
        }))
      }
    : { count: 0, files: [] };
  return {
    completionReason,
    debugLogs,
    endedAt: sanitizeTimestamp(result.endedAt),
    endedAtObserved: result.endedAtObserved === true,
    exitStatus: Number.isSafeInteger(result.status) ? result.status : null,
    identityEstablished: result.identityEstablished === true,
    log,
    networkCode: npmNetworkCode(result),
    outputOverflow: result.outputOverflow === true,
    phase,
    processOutcome: {
      survivorCount,
      termination: {
        killSent: result.termination?.killSent === true,
        termSent: result.termination?.termSent === true
      }
    },
    retryPolicy: sanitizedRetryPolicy(retryPolicy),
    signal,
    startedAt: sanitizeTimestamp(result.startedAt),
    timedOut: result.timedOut === true
  };
}

export function buildDependencyFailureSummary(failedPhase, subprocesses) {
  if (!PROVISION_PHASES.has(failedPhase)) {
    throw new Error("Unknown dependency provisioning failure phase.");
  }
  if (!Array.isArray(subprocesses)) {
    throw new Error("Dependency provisioning subprocess summary is missing.");
  }
  const last = subprocesses.at(-1) ?? null;
  const failureCode = last?.networkCode
    ? "NPM_NETWORK_FAILURE"
    : last?.timedOut
      ? "NPM_TIMEOUT"
      : (last?.processOutcome?.survivorCount ?? 0) > 0
        ? "NPM_PROCESS_SURVIVOR"
        : last?.identityEstablished === false
          ? "NPM_PROCESS_IDENTITY_FAILURE"
          : NPM_PHASES.has(failedPhase)
            ? "NPM_PHASE_FAILED"
            : "DEPENDENCY_ATTESTATION_FAILED";
  return {
    failedPhase,
    failureCode,
    networkCode: last?.networkCode ?? null,
    retryPolicy: { ...NPM_RETRY_POLICY },
    subprocesses: structuredClone(subprocesses)
  };
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function ownedProcessRows() {
  const result = spawnSync(
    "ps",
    ["-axo", "pid=,ppid=,pgid=,lstart=,command="],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.error || result.status !== 0) {
    throw new Error("Owned dependency process snapshot failed.");
  }
  const rows = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.trim().match(
      /^(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/
    );
    if (!match) continue;
    rows.push({
      command: match[5],
      pgid: Number(match[3]),
      pid: Number(match[1]),
      ppid: Number(match[2]),
      startedAt: match[4]
    });
  }
  return rows;
}

function dependencyTokenPids(ownerToken) {
  const result = spawnSync(
    "ps",
    ["eww", "-axo", "pid=,command="],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
  if (result.error || result.status !== 0) {
    throw new Error("Owned dependency token snapshot failed.");
  }
  const assignment = `MAIS_DEPENDENCY_OWNER_TOKEN=${ownerToken}`;
  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.includes(assignment)) continue;
    const match = line.match(/^\s*(\d+)\s+/);
    if (match) pids.add(Number(match[1]));
  }
  return pids;
}

function dependencyIdentityMatches(identity, row, { verifySignature = true } = {}) {
  if (
    !row ||
    row.pid !== identity.pid ||
    row.pgid !== identity.pgid ||
    row.startedAt !== identity.startedAt
  ) {
    return false;
  }
  return !verifySignature || identity.signatureFragments.every((fragment) =>
    row.command.includes(fragment)
  );
}

function discoverOwnedDependencyIdentities(rootIdentity, rows, tokenPids) {
  const rowsByPid = new Map(rows.map((row) => [row.pid, row]));
  const verified = [];
  const verifiedPids = new Set();
  const rootRow = rowsByPid.get(rootIdentity.pid);
  if (
    dependencyIdentityMatches(rootIdentity, rootRow) &&
    tokenPids.has(rootIdentity.pid)
  ) {
    verified.push(rootIdentity);
    verifiedPids.add(rootIdentity.pid);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (verifiedPids.has(row.pid) || !verifiedPids.has(row.ppid)) continue;
      const parent = verified.find(({ pid }) => pid === row.ppid);
      if (
        row.pgid !== rootIdentity.pgid ||
        typeof row.startedAt !== "string"
      ) {
        continue;
      }
      verified.push({
        depth: parent.depth + 1,
        label: rootIdentity.label,
        pgid: row.pgid,
        pid: row.pid,
        ppidAtDiscovery: row.ppid,
        signatureFragments: [],
        startedAt: row.startedAt
      });
      verifiedPids.add(row.pid);
      changed = true;
    }
  }
  const unproven = [...tokenPids]
    .filter((pid) => !verifiedPids.has(pid))
    .map((pid) => {
      const row = rowsByPid.get(pid);
      return {
        classification: "owner-token-unproven",
        pid,
        ppid: row?.ppid ?? 0
      };
    });
  return { unproven, verified };
}

function liveCapturedIdentities(captured, rows, tokenPids) {
  const rowsByPid = new Map(rows.map((row) => [row.pid, row]));
  return captured.filter((identity) =>
    dependencyIdentityMatches(identity, rowsByPid.get(identity.pid), {
      verifySignature: identity.depth === 0
    }) && (identity.depth > 0 || tokenPids.has(identity.pid))
  );
}

function sanitizedProcessSample(phase, captured, unproven, survivorCount = captured.length + unproven.length) {
  return {
    capturedAt: new Date().toISOString(),
    phase,
    processes: [
      ...captured.map((identity) => ({
        classification: identity.depth === 0 ? "spawn-owned-root" : "spawn-owned-descendant",
        pid: identity.pid,
        ppid: identity.ppidAtDiscovery
      })),
      ...unproven
    ],
    survivorCount,
    unprovenCount: unproven.length,
    verifiedCount: captured.length
  };
}

function signalRevalidatedDependencyIdentities(identities, ownerToken, signal) {
  const failures = [];
  for (const identity of [...identities].sort((left, right) =>
    right.depth - left.depth || right.pid - left.pid
  )) {
    const rows = ownedProcessRows();
    const row = rows.find(({ pid }) => pid === identity.pid);
    const tokenPids = dependencyTokenPids(ownerToken);
    if (
      !dependencyIdentityMatches(identity, row, { verifySignature: identity.depth === 0 }) ||
      (identity.depth === 0 && !tokenPids.has(identity.pid))
    ) {
      failures.push({ classification: "signal-revalidation-mismatch", pid: identity.pid, ppid: row?.ppid ?? 0 });
      continue;
    }
    try {
      process.kill(identity.pid, signal);
    } catch (error) {
      if (error?.code !== "ESRCH") {
        failures.push({ classification: "signal-failure", pid: identity.pid, ppid: row.ppid });
      }
    }
  }
  return failures;
}

async function pollOwnedDependencyExit({
  attempts,
  captured,
  ownerToken,
  pollMs
}) {
  let live = captured;
  let tokenPids = new Set();
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rows = ownedProcessRows();
    tokenPids = dependencyTokenPids(ownerToken);
    live = liveCapturedIdentities(captured, rows, tokenPids);
    if (live.length === 0 && tokenPids.size === 0) break;
    await delay(pollMs);
  }
  const rows = ownedProcessRows();
  tokenPids = dependencyTokenPids(ownerToken);
  live = liveCapturedIdentities(captured, rows, tokenPids);
  const livePids = new Set(live.map(({ pid }) => pid));
  const unproven = [...tokenPids]
    .filter((pid) => !livePids.has(pid))
    .map((pid) => ({
      classification: "owner-token-unproven",
      pid,
      ppid: rows.find((row) => row.pid === pid)?.ppid ?? 0
    }));
  return { live, unproven };
}

export async function runOwnedSubprocess({
  args,
  auditPath,
  command,
  cwd,
  environment,
  label,
  logPath,
  ownerToken,
  signatureFragments,
  terminationAttempts = 20,
  terminationPollMs = 250,
  timeoutMs
}) {
  assertFreshProvisionNonce(ownerToken);
  if (!Array.isArray(signatureFragments) || signatureFragments.length === 0) {
    throw new Error("Owned subprocess requires a nonempty command signature.");
  }
  const startedAt = new Date().toISOString();
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let outputOverflow = false;
  const collect = (target, chunk, kind) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    const current = kind === "stdout" ? stdoutBytes : stderrBytes;
    const remaining = 64 * 1024 * 1024 - current;
    if (remaining <= 0) {
      outputOverflow = true;
      return;
    }
    target.push(buffer.subarray(0, remaining));
    if (buffer.length > remaining) outputOverflow = true;
    if (kind === "stdout") stdoutBytes += Math.min(buffer.length, remaining);
    else stderrBytes += Math.min(buffer.length, remaining);
  };
  child.stdout.on("data", (chunk) => collect(stdout, chunk, "stdout"));
  child.stderr.on("data", (chunk) => collect(stderr, chunk, "stderr"));
  let exitOutcome = null;
  const exitPromise = new Promise((resolvePromise) => {
    const settle = (outcome) => {
      if (exitOutcome) return;
      exitOutcome = { ...outcome, endedAt: new Date().toISOString() };
      resolvePromise(exitOutcome);
    };
    child.once("error", (error) => settle({ error, signal: null, status: null }));
    child.once("close", (status, signal) => settle({ error: null, signal, status }));
  });

  let rootIdentity = null;
  const observedTokenProcesses = new Map();
  const identityFailureReasons = new Set();
  let postExitScans = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const rows = ownedProcessRows();
    const rowsByPid = new Map(rows.map((row) => [row.pid, row]));
    const tokenPids = dependencyTokenPids(ownerToken);
    for (const pid of tokenPids) {
      const tokenRow = rowsByPid.get(pid);
      observedTokenProcesses.set(pid, {
        classification: "owner-token-unproven",
        pid,
        ppid: tokenRow?.ppid ?? observedTokenProcesses.get(pid)?.ppid ?? 0
      });
    }
    const row = rows.find(({ pid }) => pid === child.pid);
    if (row) {
      const parentMatches = row.ppid === process.pid;
      const groupMatches = row.pgid === row.pid;
      const signatureMatches = signatureFragments.every((fragment) =>
        row.command.includes(fragment)
      );
      const tokenMatches = tokenPids.has(row.pid);
      if (!parentMatches) identityFailureReasons.add("PPID_MISMATCH");
      if (!groupMatches) identityFailureReasons.add("PGID_MISMATCH");
      if (!signatureMatches) identityFailureReasons.add("SIGNATURE_MISMATCH");
      if (!tokenMatches) identityFailureReasons.add("TOKEN_NOT_OBSERVED");
      if (parentMatches && groupMatches && signatureMatches && tokenMatches) {
        rootIdentity = {
          depth: 0,
          label,
          pgid: row.pgid,
          pid: row.pid,
          ppidAtDiscovery: row.ppid,
          signatureFragments: [...signatureFragments],
          startedAt: row.startedAt
        };
        break;
      }
    }
    if (exitOutcome) {
      postExitScans += 1;
      if (postExitScans >= 12) break;
      await delay(25);
    } else {
      await Promise.race([exitPromise, delay(25)]);
    }
  }

  const samples = [];
  if (!rootIdentity) {
    const finalRows = ownedProcessRows();
    const finalRowsByPid = new Map(finalRows.map((row) => [row.pid, row]));
    const liveTokenPids = dependencyTokenPids(ownerToken);
    for (const pid of liveTokenPids) {
      const tokenRow = finalRowsByPid.get(pid);
      observedTokenProcesses.set(pid, {
        classification: "owner-token-unproven",
        pid,
        ppid: tokenRow?.ppid ?? observedTokenProcesses.get(pid)?.ppid ?? 0
      });
    }
    const liveUnproven = [...liveTokenPids].map((pid) =>
      observedTokenProcesses.get(pid) ?? {
        classification: "owner-token-unproven",
        pid,
        ppid: finalRowsByPid.get(pid)?.ppid ?? 0
      }
    );
    const liveRootRow = finalRowsByPid.get(child.pid);
    if (liveRootRow && !liveTokenPids.has(child.pid)) {
      liveUnproven.push({
        classification: "spawn-root-identity-unestablished",
        pid: liveRootRow.pid,
        ppid: liveRootRow.ppid
      });
    }
    const stickyUnsafeCount = Math.max(
      liveUnproven.length,
      observedTokenProcesses.size
    );
    const identitySample = sanitizedProcessSample(
      "spawn-identity-unestablished",
      [],
      [...observedTokenProcesses.values()],
      stickyUnsafeCount
    );
    identitySample.reasonCodes = [...identityFailureReasons].sort();
    identitySample.liveProcesses = liveUnproven;
    samples.push(identitySample);
    writeJsonAtomic(dirname(auditPath), auditPath, {
      label,
      samples,
      schemaVersion: 1,
      status: "failed"
    });
    const settled = exitOutcome ?? await Promise.race([exitPromise, delay(1_000)]);
    const stdoutText = Buffer.concat(stdout).toString("utf8");
    const stderrText = Buffer.concat(stderr).toString("utf8");
    const log = writeBoundedLog(logPath, stdoutText, stderrText);
    return {
      completionReason: "identity-unestablished",
      endedAt: settled?.endedAt ?? null,
      endedAtObserved: Boolean(settled),
      error: new Error("Owned subprocess identity could not be established."),
      identityEstablished: false,
      log,
      outputOverflow,
      signal: settled?.signal ?? null,
      startedAt,
      status: settled?.status ?? null,
      stderr: stderrText,
      stdout: stdoutText,
      survivorCount: stickyUnsafeCount,
      termination: { killSent: false, termSent: false },
      timedOut: false
    };
  }

  const deadline = Date.now() + timeoutMs;
  while (!exitOutcome && Date.now() < deadline) {
    await Promise.race([exitPromise, delay(Math.min(500, deadline - Date.now()))]);
  }
  const termination = { killSent: false, termSent: false };
  let survivorCount = 0;
  let timedOut = false;
  if (!exitOutcome) {
    timedOut = true;
    const rows = ownedProcessRows();
    const tokenPids = dependencyTokenPids(ownerToken);
    const discovered = discoverOwnedDependencyIdentities(rootIdentity, rows, tokenPids);
    samples.push(sanitizedProcessSample(
      "timeout-before-term",
      discovered.verified,
      discovered.unproven
    ));
    writeJsonAtomic(dirname(auditPath), auditPath, {
      label,
      samples,
      schemaVersion: 1,
      status: "terminating"
    });
    const termFailures = signalRevalidatedDependencyIdentities(
      discovered.verified,
      ownerToken,
      "SIGTERM"
    );
    termination.termSent = discovered.verified.length > 0;
    let afterTerm = await pollOwnedDependencyExit({
      attempts: terminationAttempts,
      captured: discovered.verified,
      ownerToken,
      pollMs: terminationPollMs
    });
    samples.push(sanitizedProcessSample(
      "timeout-after-term",
      afterTerm.live,
      [...afterTerm.unproven, ...termFailures]
    ));
    if (afterTerm.live.length > 0) {
      const killFailures = signalRevalidatedDependencyIdentities(
        afterTerm.live,
        ownerToken,
        "SIGKILL"
      );
      termination.killSent = true;
      const afterKill = await pollOwnedDependencyExit({
        attempts: terminationAttempts,
        captured: discovered.verified,
        ownerToken,
        pollMs: terminationPollMs
      });
      survivorCount = afterKill.live.length + afterKill.unproven.length + killFailures.length;
      samples.push(sanitizedProcessSample(
        "timeout-after-kill",
        afterKill.live,
        [...afterKill.unproven, ...killFailures],
        survivorCount
      ));
    } else {
      survivorCount = afterTerm.unproven.length + termFailures.length;
      samples.push(sanitizedProcessSample(
        "timeout-after-kill",
        [],
        [...afterTerm.unproven, ...termFailures],
        survivorCount
      ));
    }
    writeJsonAtomic(dirname(auditPath), auditPath, {
      label,
      samples,
      schemaVersion: 1,
      status: survivorCount === 0 ? "reaped-after-timeout" : "failed-survivor"
    });
    if (!exitOutcome && survivorCount === 0) {
      await Promise.race([exitPromise, delay(1_000)]);
    }
  } else {
    const afterCompletion = await pollOwnedDependencyExit({
      attempts: terminationAttempts,
      captured: [rootIdentity],
      ownerToken,
      pollMs: terminationPollMs
    });
    survivorCount = afterCompletion.live.length + afterCompletion.unproven.length;
    samples.push(sanitizedProcessSample(
      "completed",
      afterCompletion.live,
      afterCompletion.unproven,
      survivorCount
    ));
    writeJsonAtomic(dirname(auditPath), auditPath, {
      label,
      samples,
      schemaVersion: 1,
      status: survivorCount === 0 ? "completed" : "failed-survivor"
    });
  }
  const stdoutText = Buffer.concat(stdout).toString("utf8");
  const stderrText = Buffer.concat(stderr).toString("utf8");
  const log = writeBoundedLog(logPath, stdoutText, stderrText);
  return {
    completionReason: timedOut
      ? "hard-timeout"
      : survivorCount > 0
        ? "process-survivor"
        : exitOutcome?.signal
          ? "signal"
          : exitOutcome?.status === 0
            ? "exit-zero"
            : "exit-nonzero",
    endedAt: exitOutcome?.endedAt ?? null,
    endedAtObserved: Boolean(exitOutcome),
    error: timedOut
      ? new Error("Owned subprocess exceeded its hard timeout.")
      : survivorCount > 0
        ? new Error("Owned subprocess left an owner-token process survivor.")
        : exitOutcome?.error ?? null,
    identityEstablished: true,
    log,
    outputOverflow,
    signal: exitOutcome?.signal ?? null,
    startedAt,
    status: exitOutcome?.status ?? null,
    stderr: stderrText,
    stdout: stdoutText,
    survivorCount,
    termination,
    timedOut
  };
}

async function runNpm(
  preflight,
  args,
  { cacheMarkerContract, cwd, environment, logPath, timeout }
) {
  assertCacheMarker(preflight, environment.NPM_CONFIG_CACHE, cacheMarkerContract);
  let result;
  let debugLogs;
  try {
    result = await runOwnedSubprocess({
      args: [OWNED_DEPENDENCY_LAUNCHER, preflight.npm.cli, ...args],
      auditPath: logPath.replace(/\.log$/, "-process-audit.json"),
      command: preflight.node.executable,
      cwd,
      environment,
      label: `npm-${args[0]}`,
      logPath,
      ownerToken: preflight.nonce,
      signatureFragments: [OWNED_DEPENDENCY_LAUNCHER],
      timeoutMs: timeout
    });
  } finally {
    debugLogs = normalizeConfinedNpmDebugLogs(dirname(logPath));
    assertCacheMarker(preflight, environment.NPM_CONFIG_CACHE, cacheMarkerContract);
  }
  return { ...result, debugLogs };
}

function assertSourceStateUnchanged(preflight) {
  const current = sourceState(preflight.repoRoot);
  if (!sameJson(current, preflight.source)) {
    throw new Error("Source, HEAD, status, or next-env changed during dependency provisioning.");
  }
  return current;
}

function assertPhysicalNodeModules(nodeModulesPath) {
  const entry = lstatSync(nodeModulesPath, { throwIfNoEntry: false });
  if (!entry || !entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error("Activated node_modules must be a physical directory.");
  }
  if (realpathSync(nodeModulesPath) !== nodeModulesPath) {
    throw new Error("Activated node_modules must be canonical in the worktree.");
  }
  return nodeModulesPath;
}

export function validatePhysicalDependencyEntryObservation({
  canonicalDirectory = null,
  kind,
  mode,
  ownerMatches,
  symlinkContained = null
} = {}) {
  if (ownerMatches !== true) {
    throw new Error("Dependency tree entry ownership changed or is unsafe.");
  }
  if (kind === "symlink") {
    if (symlinkContained !== true) {
      throw new Error("Dependency tree symlink escaped its physical root.");
    }
    return kind;
  }
  if (!Number.isSafeInteger(mode) || (mode & 0o022) !== 0) {
    throw new Error("Dependency tree entry is group/world writable.");
  }
  if (kind === "directory") {
    if (canonicalDirectory !== true) {
      throw new Error("Dependency tree directory escaped through a link chain.");
    }
    return kind;
  }
  if (kind !== "file") {
    throw new Error("Dependency tree accepts only regular files, directories, and confined symlinks.");
  }
  return kind;
}

export function validatePhysicalDependencyHardlinkClosure(groups) {
  if (
    !Array.isArray(groups)
    || groups.some((group) =>
      !group
      || !Number.isSafeInteger(group.nlink)
      || group.nlink < 1
      || !Number.isSafeInteger(group.observed)
      || group.observed < 1
    )
  ) {
    throw new Error("Dependency tree hardlink closure observation is malformed.");
  }
  if (groups.some(({ nlink, observed }) => nlink !== observed)) {
    throw new Error("Dependency tree contains a hardlink with an unconfined peer.");
  }
  return true;
}

export function attestPhysicalDependencyTree(nodeModulesPath, { afterScan } = {}) {
  const root = assertPhysicalNodeModules(resolve(nodeModulesPath));
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  if (!Number.isSafeInteger(expectedUid)) {
    throw new Error("Dependency tree attestation requires a numeric owner UID.");
  }
  const rootEntry = lstatSync(root);
  if (rootEntry.uid !== expectedUid || (rootEntry.mode & 0o022) !== 0) {
    throw new Error("Dependency tree root ownership or write permissions are unsafe.");
  }
  const rootIdentity = { dev: rootEntry.dev, ino: rootEntry.ino };
  const entries = [];
  const hardlinks = new Map();
  const walk = (directory) => {
    for (const child of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name)
    )) {
      const candidate = join(directory, child.name);
      const relativePath = relative(root, candidate);
      if (!isStrictDescendant(candidate, root) || relativePath.startsWith("..")) {
        throw new Error("Dependency tree entry escaped its exact root.");
      }
      const identity = lstatSync(candidate, { throwIfNoEntry: false });
      if (!identity || identity.uid !== expectedUid) {
        throw new Error("Dependency tree entry ownership changed or is unsafe.");
      }
      const observedKind = identity.isSymbolicLink()
        ? "symlink"
        : identity.isDirectory()
          ? "directory"
          : identity.isFile()
            ? "file"
            : "other";
      const observedSymlinkTarget = observedKind === "symlink" ? realpathSync(candidate) : null;
      validatePhysicalDependencyEntryObservation({
        canonicalDirectory: observedKind === "directory" ? realpathSync(candidate) === candidate : null,
        kind: observedKind,
        mode: identity.mode,
        ownerMatches: identity.uid === expectedUid,
        symlinkContained: observedKind === "symlink"
          ? isStrictDescendant(observedSymlinkTarget, root)
          : null
      });
      if (identity.isSymbolicLink()) {
        const target = realpathSync(candidate);
        if (!isStrictDescendant(target, root)) {
          throw new Error("Dependency tree symlink escaped its physical root.");
        }
        entries.push({
          relativePath,
          target: relative(root, target),
          type: "symlink"
        });
        continue;
      }
      if ((identity.mode & 0o022) !== 0) {
        throw new Error("Dependency tree entry is group/world writable.");
      }
      if (identity.isDirectory()) {
        if (realpathSync(candidate) !== candidate) {
          throw new Error("Dependency tree directory escaped through a link chain.");
        }
        entries.push({
          mode: identity.mode & 0o777,
          relativePath,
          type: "directory"
        });
        walk(candidate);
        continue;
      }
      if (!identity.isFile()) {
        throw new Error("Dependency tree accepts only regular files, directories, and confined symlinks.");
      }
      const inodeKey = `${identity.dev}:${identity.ino}`;
      const hardlink = hardlinks.get(inodeKey) ?? { nlink: identity.nlink, observed: 0 };
      if (hardlink.nlink !== identity.nlink) {
        throw new Error("Dependency tree hardlink identity changed during attestation.");
      }
      hardlink.observed += 1;
      hardlinks.set(inodeKey, hardlink);
      entries.push({
        mode: identity.mode & 0o777,
        nlink: identity.nlink,
        relativePath,
        sha256: sha256File(candidate),
        size: identity.size,
        type: "file"
      });
    }
  };
  walk(root);
  const hardlinkGroups = [...hardlinks.values()];
  validatePhysicalDependencyHardlinkClosure(hardlinkGroups);
  afterScan?.();
  const revalidated = lstatSync(root, { throwIfNoEntry: false });
  if (
    !revalidated || !revalidated.isDirectory() || revalidated.isSymbolicLink() ||
    revalidated.dev !== rootIdentity.dev || revalidated.ino !== rootIdentity.ino
  ) {
    throw new Error("Dependency tree root identity changed during attestation.");
  }
  const files = entries.filter(({ type }) => type === "file");
  const directories = entries.filter(({ type }) => type === "directory");
  const symlinks = entries.filter(({ type }) => type === "symlink");
  return {
    identity: rootIdentity,
    proof: {
      directoryCount: directories.length,
      fileCount: files.length,
      hardlinkGroupCount: hardlinkGroups.filter(({ nlink }) => nlink > 1).length,
      inventorySha256: sha256Buffer(JSON.stringify(entries)),
      symlinkCount: symlinks.length,
      totalBytes: files.reduce((total, entry) => total + entry.size, 0)
    }
  };
}

export function validateCompletedInstallFailureAttestation(failure) {
  const subprocesses = failure?.failure?.subprocesses;
  const expectedPhases = ["npm-cache-verify", "npm-ci-prefer-offline"];
  if (
    failure?.schemaVersion !== 1 || failure.status !== "failed" ||
    failure.failureCode !== "DEPENDENCY_ATTESTATION_FAILED" ||
    failure.rollbackRestored !== true ||
    failure.failure?.failedPhase !== "staged-tree-attestation" ||
    failure.failure?.failureCode !== "DEPENDENCY_ATTESTATION_FAILED" ||
    failure.failure?.networkCode !== null ||
    !Array.isArray(subprocesses) || subprocesses.length !== expectedPhases.length ||
    subprocesses.some((summary, index) =>
      summary.phase !== expectedPhases[index] ||
      summary.completionReason !== "exit-zero" ||
      summary.exitStatus !== 0 ||
      summary.identityEstablished !== true ||
      summary.endedAtObserved !== true ||
      summary.outputOverflow !== false ||
      summary.signal !== null ||
      summary.timedOut !== false ||
      summary.networkCode !== null ||
      summary.processOutcome?.survivorCount !== 0 ||
      summary.processOutcome?.termination?.termSent !== false ||
      summary.processOutcome?.termination?.killSent !== false
    ) ||
    failure.cache?.provenance !== "byte-copied-verified-cache" ||
    failure.cache?.seed?.status !== "byte-copied-and-revalidated"
  ) {
    throw new Error("Completed-install requalification requires one exact clean ci0 failure transition.");
  }
  return {
    failedPhase: failure.failure.failedPhase,
    failureCode: failure.failureCode,
    subprocessPhases: subprocesses.map(({ phase }) => phase)
  };
}

export function activatePhysicalNodeModules({
  afterRollbackPreserved,
  candidate,
  current,
  expectedCurrentRealpath,
  rollback
}) {
  const currentEntry = lstatSync(current, { throwIfNoEntry: false });
  if (
    !currentEntry ||
    !currentEntry.isSymbolicLink() ||
    realpathSync(current) !== expectedCurrentRealpath
  ) {
    throw new Error("Existing node_modules changed before rollback preservation.");
  }
  const candidateEntry = lstatSync(candidate, { throwIfNoEntry: false });
  if (!candidateEntry || !candidateEntry.isDirectory() || candidateEntry.isSymbolicLink()) {
    throw new Error("Activation candidate must be a physical node_modules directory.");
  }
  if (realpathSync(candidate) !== resolve(candidate)) {
    throw new Error("Activation candidate must be canonical.");
  }
  if (existsSync(rollback)) throw new Error("Dependency rollback node_modules already exists.");
  const currentParent = assertCanonicalDirectory("node_modules parent", dirname(current));
  const rollbackParent = assertCanonicalDirectory("rollback parent", dirname(rollback));
  if (
    lstatSync(currentParent).dev !== candidateEntry.dev ||
    lstatSync(rollbackParent).dev !== candidateEntry.dev
  ) {
    throw new Error("Dependency activation and rollback must be on one filesystem.");
  }
  const identity = { dev: candidateEntry.dev, ino: candidateEntry.ino };
  renameSync(current, rollback);
  try {
    afterRollbackPreserved?.({ candidate, current, rollback });
    const revalidated = lstatSync(candidate, { throwIfNoEntry: false });
    if (
      !revalidated ||
      !revalidated.isDirectory() ||
      revalidated.isSymbolicLink() ||
      revalidated.dev !== identity.dev ||
      revalidated.ino !== identity.ino
    ) {
      throw new Error("Dependency activation candidate changed at the rename boundary.");
    }
    renameSync(candidate, current);
    const active = lstatSync(current);
    if (
      !active.isDirectory() ||
      active.isSymbolicLink() ||
      active.dev !== identity.dev ||
      active.ino !== identity.ino
    ) {
      throw new Error("Activated dependency tree identity mismatch.");
    }
    return { activeIdentity: identity, rollback };
  } catch (error) {
    if (!existsSync(current) && existsSync(rollback)) renameSync(rollback, current);
    throw error;
  }
}

function verifyCriticalTree(preflight, nodeModulesPath) {
  assertPhysicalNodeModules(nodeModulesPath);
  const packages = {};
  const versions = {};
  const cliPaths = {};
  for (const [name, expectedVersion] of Object.entries(EXPECTED_CRITICAL_VERSIONS)) {
    const manifestPath = realpathSync(join(nodeModulesPath, name, "package.json"));
    if (!isStrictDescendant(manifestPath, nodeModulesPath)) {
      throw new Error(`Critical dependency ${name} escaped the physical tree.`);
    }
    const manifest = readJson(manifestPath);
    if (manifest.version !== expectedVersion) {
      throw new Error(`Critical dependency ${name} has a non-lock version.`);
    }
    packages[name] = {
      manifestRelativePath: relative(nodeModulesPath, manifestPath),
      manifestSha256: sha256File(manifestPath),
      version: manifest.version
    };
    versions[name] = manifest.version;
  }
  for (const [label, candidate] of Object.entries({
    next: join(nodeModulesPath, "next", "dist", "bin", "next"),
    playwrightCore: join(nodeModulesPath, "playwright", "cli.js"),
    playwrightTest: join(nodeModulesPath, "@playwright", "test", "cli.js")
  })) {
    const canonical = realpathSync(candidate);
    if (!isStrictDescendant(canonical, nodeModulesPath)) {
      throw new Error(`Critical CLI ${label} escaped the physical dependency tree.`);
    }
    cliPaths[label] = {
      relativePath: relative(nodeModulesPath, canonical),
      sha256: sha256File(canonical)
    };
  }
  const installedLock = readJson(join(nodeModulesPath, ".package-lock.json"));
  const comparison = compareInstalledLockToSource(preflight.lockfile, installedLock);
  if (comparison.mismatches.length > 0) {
    throw new Error("Installed dependency integrity/closure differs from package-lock.json.");
  }
  return {
    cliPaths,
    comparison,
    installedLockSha256: sha256File(join(nodeModulesPath, ".package-lock.json")),
    packages,
    versions
  };
}

function sanitizedPreflight(preflight) {
  return {
    action: preflight.action,
    availableBytes: preflight.availableBytes.toString(),
    currentCritical: preflight.currentCritical,
    currentNodeModulesIsSymlink: preflight.currentNodeModulesIsSymlink,
    currentNodeModulesLocation: preflight.currentNodeModulesRealpath.startsWith("/Volumes/Starship/")
      ? "starship-other-tree"
      : "foreign",
    environment: preflight.environmentProof,
    lockContract: preflight.lockContract,
    localDependencyCount: 0,
    node: {
      executableSha256: preflight.node.executableSha256,
      version: preflight.node.version
    },
    npm: {
      cliSha256: preflight.npm.cliSha256,
      version: preflight.npm.version
    },
    processAudit: preflight.processAudit,
    source: preflight.source,
    volumeDevice: preflight.volumeDevice
  };
}

export function createProvisionLayout(preflight, { cacheSeedBinding = null } = {}) {
  const root = preflight.provisionRoot;
  mkdirExact(root);
  writeFileSync(
    join(root, MARKER_NAME),
    `${JSON.stringify(markerPayload(preflight, "provisioning"), null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  const directories = {
    config: join(root, "config"),
    data: join(root, "data"),
    evidence: join(root, "evidence"),
    install: join(root, "install"),
    logs: join(root, "logs"),
    nodeCompile: join(root, "node-compile-cache"),
    npmCache: join(root, "npm-cache"),
    npmPrefix: join(root, "npm-prefix"),
    playwrightBrowsers: join(root, "playwright-browsers"),
    quarantine: join(root, "quarantine"),
    rollback: join(root, "rollback"),
    state: join(root, "state"),
    temp: join(root, "temp"),
    turbo: join(root, "turbo-cache")
  };
  for (const directory of Object.values(directories)) mkdirExact(directory);
  writeFileSync(
    join(directories.npmCache, CACHE_MARKER_NAME),
    `${JSON.stringify(
      cacheMarkerPayload(preflight, directories.npmCache, cacheSeedBinding),
      null,
      2
    )}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  writeFileSync(join(directories.quarantine, ".quarantine-marker.json"), `${JSON.stringify({ nonce: preflight.nonce })}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  writeFileSync(join(directories.rollback, ".rollback-marker.json"), `${JSON.stringify({ nonce: preflight.nonce })}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return directories;
}

function writeInstallInputs(preflight, directories) {
  assertMarker(preflight, preflight.provisionRoot);
  copyFileSync(preflight.packagePath, join(directories.evidence, "source-package.json"));
  copyFileSync(preflight.lockPath, join(directories.evidence, "source-package-lock.json"));
  copyFileSync(preflight.lockPath, join(directories.install, "package-lock.json"));
  for (const copied of [
    join(directories.evidence, "source-package.json"),
    join(directories.evidence, "source-package-lock.json"),
    join(directories.install, "package-lock.json")
  ]) chmodSync(copied, 0o600);
  const installManifest = buildInstallOnlyManifest(preflight.packageManifest);
  writeFileSync(
    join(directories.install, "package.json"),
    `${JSON.stringify(installManifest, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  for (const configName of ["npm-globalrc", "npm-userrc"]) {
    writeFileSync(join(directories.config, configName), "audit=false\nfund=false\nupdate-notifier=false\n", {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
  }
  if (
    sha256File(join(directories.evidence, "source-package.json")) !== preflight.source.packageSha256 ||
    sha256File(join(directories.evidence, "source-package-lock.json")) !== preflight.source.packageLockSha256 ||
    sha256File(join(directories.install, "package-lock.json")) !== preflight.source.packageLockSha256
  ) {
    throw new Error("Byte-copied dependency inputs failed hash revalidation.");
  }
  if (Object.keys(installManifest.scripts).length !== 0) {
    throw new Error("Install-only manifest must not contain root lifecycle scripts.");
  }
  for (const field of DEPENDENCY_FIELDS) {
    if (!sameJson(installManifest[field], preflight.packageManifest[field])) {
      throw new Error(`Install-only manifest changed ${field}.`);
    }
  }
  return installManifest;
}

function quarantinePartialNodeModules(
  preflight,
  directories,
  candidate,
  targetName = "node_modules-partial"
) {
  if (!existsSync(candidate)) return null;
  if (targetName !== "node_modules-partial") {
    throw new Error("Dependency quarantine target label is not approved.");
  }
  assertMarker(preflight, preflight.provisionRoot);
  const target = join(directories.quarantine, targetName);
  if (existsSync(target)) throw new Error("Dependency quarantine target already exists.");
  renameSync(candidate, target);
  return target;
}

function provisionDirectories(root) {
  return {
    config: join(root, "config"),
    data: join(root, "data"),
    evidence: join(root, "evidence"),
    install: join(root, "install"),
    logs: join(root, "logs"),
    nodeCompile: join(root, "node-compile-cache"),
    npmCache: join(root, "npm-cache"),
    npmPrefix: join(root, "npm-prefix"),
    playwrightBrowsers: join(root, "playwright-browsers"),
    quarantine: join(root, "quarantine"),
    rollback: join(root, "rollback"),
    state: join(root, "state"),
    temp: join(root, "temp"),
    turbo: join(root, "turbo-cache")
  };
}

function assertZeroDependencyProcessState(processAudit, label) {
  if (
    processAudit?.activeProfileCount !== 0 ||
    processAudit?.foreignProfileCount !== 0 ||
    processAudit?.ownedProfileCount !== 0 ||
    processAudit?.ownerAssociatedCount !== 0 ||
    processAudit?.tokenBearingCount !== 0 ||
    !Array.isArray(processAudit?.violations) || processAudit.violations.length !== 0
  ) {
    throw new Error(`${label} requires zero owner processes and Playwright profiles.`);
  }
  return processAudit;
}

function assertOwnedSafeFiles(directory, label) {
  const canonical = assertCanonicalDirectory(label, directory);
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  for (const entry of readdirSync(canonical, { withFileTypes: true })) {
    const candidate = join(canonical, entry.name);
    const identity = lstatSync(candidate, { throwIfNoEntry: false });
    if (
      !identity || !identity.isFile() || identity.isSymbolicLink() ||
      identity.uid !== expectedUid || (identity.mode & 0o777) !== 0o600 ||
      realpathSync(candidate) !== candidate
    ) {
      throw new Error(`${label} contains a non-0600, linked, or non-file entry.`);
    }
  }
}

function exactDirectoryEntries(directory, expected) {
  return sameJson(
    readdirSync(directory).sort(),
    [...expected].sort()
  );
}

function requalificationEnvironmentProof(environment, paths, attemptRoot, originalHome) {
  return {
    allWritablePathsBound: Object.values(paths).every((candidate) =>
      isStrictDescendant(candidate, attemptRoot)
    ),
    boundKeys: Object.keys(environment).filter((key) =>
      /^(?:MAIS_DEPENDENCY_|NEXT_|NODE_(?:COMPILE_CACHE|OPTIONS)|NPM_CONFIG_|PLAYWRIGHT_|TEMP$|TMP|TURBO_|XDG_)/.test(key)
    ).sort(),
    homeUnchanged: environment.HOME === originalHome,
    nodeOptionsDropped: environment.NODE_OPTIONS === APPROVED_NODE_OPTIONS,
    nodeOptionsPolicy: "dns-result-order-ipv4first",
    registry: environment.NPM_CONFIG_REGISTRY === CANONICAL_NPM_REGISTRY
      ? "canonical-npmjs"
      : "invalid"
  };
}

function validateCompletedInstallRequalificationCandidate(basePreflight, attemptRoot) {
  const canonicalRoot = assertCanonicalDirectory("completed-install attempt root", attemptRoot);
  if (dirname(canonicalRoot) !== basePreflight.tmpBase) {
    throw new Error("Completed-install attempt escaped the exact worktree tmp base.");
  }
  const nameMatch = canonicalRoot.match(/\/dependency-provision-([a-f0-9]{64})$/);
  if (!nameMatch) throw new Error("Completed-install attempt identity is malformed.");
  const nonce = nameMatch[1];
  const attemptId = `sha256:${sha256Buffer(nonce)}`;
  const directories = provisionDirectories(canonicalRoot);
  assertSafeCacheSeedAncestors(basePreflight.repoRoot, directories.npmCache);
  const ownerMarkerPath = join(canonicalRoot, MARKER_NAME);
  const cacheMarkerPath = join(directories.npmCache, CACHE_MARKER_NAME);
  const failurePath = join(directories.evidence, "failure-attestation.json");
  const ownerMarker = readOwned0600Json(ownerMarkerPath, "Completed-install owner marker");
  const cacheMarker = readOwned0600Json(cacheMarkerPath, "Completed-install cache marker");
  const failure = readOwned0600Json(failurePath, "Completed-install failure attestation");
  const transition = validateCompletedInstallFailureAttestation(failure);
  if (
    !sameJson(ownerMarker, {
      nonce,
      packageLockSha256: basePreflight.source.packageLockSha256,
      packageSha256: basePreflight.source.packageSha256,
      repoRoot: basePreflight.repoRoot,
      schemaVersion: 1,
      status: "provisioning"
    }) ||
    !sameJson(cacheMarker, {
      cachePath: directories.npmCache,
      nonce,
      packageLockSha256: basePreflight.source.packageLockSha256,
      packageSha256: basePreflight.source.packageSha256,
      repoRoot: basePreflight.repoRoot,
      schemaVersion: 1,
      sourceAttemptId: failure.cache?.seed?.source?.sourceAttemptId,
      sourceManifestSha256: failure.cache?.seed?.source?.sourceManifestSha256,
      status: "seed-destination"
    }) ||
    failure.cache?.markerSha256 !== sha256File(cacheMarkerPath) ||
    failure.cache?.seed?.destinationAttemptId !== attemptId ||
    !seedSourceHashesMatch(basePreflight.source, failure.preflight?.source)
  ) {
    throw new Error("Completed-install marker, lineage, failure, or source binding mismatched.");
  }
  const seedManifest = readOwned0600Json(
    join(directories.evidence, "cache-seed-manifest.json"),
    "Completed-install frozen seed manifest"
  );
  const seedProvenance = readOwned0600Json(
    join(directories.evidence, "cache-seed-provenance.json"),
    "Completed-install seed provenance"
  );
  if (
    seedManifest?.schemaVersion !== 1 ||
    seedManifest.status !== "frozen-before-destination-copy" ||
    seedManifest.manifestSha256 !== cacheMarker.sourceManifestSha256 ||
    !sameJson(seedProvenance, failure.cache.seed) ||
    seedProvenance.status !== "byte-copied-and-revalidated"
  ) {
    throw new Error("Completed-install frozen cache lineage evidence mismatched.");
  }
  if (
    sha256File(join(directories.evidence, "source-package.json")) !== basePreflight.source.packageSha256 ||
    sha256File(join(directories.evidence, "source-package-lock.json")) !== basePreflight.source.packageLockSha256 ||
    sha256File(join(directories.install, "package-lock.json")) !== basePreflight.source.packageLockSha256 ||
    !sameJson(readJson(join(directories.install, "package.json")), buildInstallOnlyManifest(basePreflight.packageManifest))
  ) {
    throw new Error("Completed-install copied source/install inputs changed.");
  }
  if (
    !sameJson(readOwned0600Json(
      join(directories.quarantine, ".quarantine-marker.json"),
      "Completed-install quarantine marker"
    ), { nonce }) ||
    !sameJson(readOwned0600Json(
      join(directories.rollback, ".rollback-marker.json"),
      "Completed-install rollback marker"
    ), { nonce }) ||
    !exactDirectoryEntries(directories.quarantine, [
      ".quarantine-marker.json",
      "node_modules-partial"
    ]) ||
    !exactDirectoryEntries(directories.rollback, [".rollback-marker.json"]) ||
    !exactDirectoryEntries(directories.install, ["package-lock.json", "package.json"])
  ) {
    throw new Error("Completed-install quarantine/rollback/install partition is not exact.");
  }
  for (const forbidden of [
    "attestation.json",
    "activation-attestation.json",
    "activation-attestation-pending.json",
    "requalification-attestation.json",
    "requalification-failure.json",
    "requalification-intent.json",
    "requalification-process-audit.json"
  ]) {
    if (existsSync(join(directories.evidence, forbidden))) {
      throw new Error("Completed-install attempt has already been requalified or activated.");
    }
  }
  assertOwnedSafeFiles(directories.logs, "Completed-install retained logs");
  const provisionEnvironment = buildProvisionEnvironment(
    process.env,
    canonicalRoot,
    basePreflight.node.executable,
    nonce
  );
  provisionEnvironment.environment.NPM_CONFIG_OFFLINE = "true";
  const environmentProof = requalificationEnvironmentProof(
    provisionEnvironment.environment,
    provisionEnvironment.paths,
    canonicalRoot,
    process.env.HOME
  );
  if (
    !environmentProof.allWritablePathsBound || !environmentProof.homeUnchanged ||
    !environmentProof.nodeOptionsDropped || environmentProof.registry !== "canonical-npmjs" ||
    "NODE_PATH" in provisionEnvironment.environment
  ) {
    throw new Error("Completed-install requalification environment is not fully confined.");
  }
  const candidatePath = join(directories.quarantine, "node_modules-partial");
  const candidateIdentity = lstatSync(candidatePath, { throwIfNoEntry: false });
  if (
    !candidateIdentity || !candidateIdentity.isDirectory() || candidateIdentity.isSymbolicLink() ||
    realpathSync(candidatePath) !== candidatePath ||
    candidateIdentity.dev !== lstatSync(basePreflight.repoRoot).dev
  ) {
    throw new Error("Completed-install quarantined dependency tree is not one physical same-volume tree.");
  }
  const liveIdentity = lstatSync(basePreflight.nodeModulesPath, { throwIfNoEntry: false });
  if (
    !liveIdentity || !liveIdentity.isSymbolicLink() ||
    realpathSync(basePreflight.nodeModulesPath) !== basePreflight.currentNodeModulesRealpath
  ) {
    throw new Error("Live dependency symlink changed before completed-install requalification.");
  }
  const attemptPreflight = {
    ...basePreflight,
    environmentProof,
    nonce,
    provisionEnvironment,
    provisionRoot: canonicalRoot
  };
  return {
    attemptId,
    attemptPreflight,
    cacheMarker,
    candidateIdentity: { dev: candidateIdentity.dev, ino: candidateIdentity.ino },
    candidatePath,
    directories,
    failure,
    hashes: {
      cacheMarkerSha256: sha256File(cacheMarkerPath),
      launcherSha256: sha256File(OWNED_DEPENDENCY_LAUNCHER),
      ownerMarkerSha256: sha256File(ownerMarkerPath),
      priorFailureSha256: sha256File(failurePath),
      provisionerSha256: sha256File(fileURLToPath(import.meta.url)),
      seedManifestSha256: sha256File(join(directories.evidence, "cache-seed-manifest.json")),
      seedProvenanceSha256: sha256File(join(directories.evidence, "cache-seed-provenance.json"))
    },
    liveIdentity: { dev: liveIdentity.dev, ino: liveIdentity.ino },
    transition
  };
}

export function collectCompletedInstallRequalificationPreflight(repoRoot = process.cwd()) {
  const basePreflight = collectDependencyProvisionPreflight(repoRoot);
  if (basePreflight.action !== "provision") {
    throw new Error("Completed-install requalification requires the original stale dependency symlink.");
  }
  assertZeroDependencyProcessState(basePreflight.processAudit, "Completed-install preflight");
  const eligibleRoots = [];
  for (const entry of readdirSync(basePreflight.tmpBase, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^dependency-provision-[a-f0-9]{64}$/.test(entry.name)) continue;
    const root = join(basePreflight.tmpBase, entry.name);
    const failurePath = join(root, "evidence", "failure-attestation.json");
    const candidatePath = join(root, "quarantine", "node_modules-partial");
    if (!existsSync(failurePath) || !existsSync(candidatePath)) continue;
    const failure = readOwned0600Json(failurePath, "Completed-install candidate failure");
    if (failure.failure?.failedPhase === "staged-tree-attestation") eligibleRoots.push(root);
  }
  if (eligibleRoots.length !== 1) {
    throw new Error("Completed-install requalification requires exactly one sole eligible attempt.");
  }
  return validateCompletedInstallRequalificationCandidate(basePreflight, eligibleRoots[0]);
}

function persistRequalificationProcessAudit(context, phase, processAudit) {
  const auditPath = join(context.directories.evidence, "requalification-process-audit.json");
  const existing = existsSync(auditPath)
    ? readOwned0600Json(auditPath, "Completed-install process audit")
    : { attemptId: context.attemptId, samples: [], schemaVersion: 1 };
  if (
    existing.schemaVersion !== 1 || existing.attemptId !== context.attemptId ||
    !Array.isArray(existing.samples) || existing.samples.length >= 64
  ) {
    throw new Error("Completed-install process audit is missing, mismatched, or full.");
  }
  writeJsonAtomic(context.directories.evidence, auditPath, {
    ...existing,
    samples: [...existing.samples, {
      observedAt: new Date().toISOString(),
      phase,
      processAudit
    }]
  });
}

function assertRequalificationPreActivationInvariants(context, candidatePath, phase) {
  const { attemptPreflight: preflight, candidateIdentity, hashes, liveIdentity } = context;
  const currentSource = sourceState(preflight.repoRoot);
  if (!sameJson(currentSource, preflight.source)) {
    throw new Error("Source state changed during completed-install requalification.");
  }
  const processAudit = processPreflight(preflight.repoRoot);
  persistRequalificationProcessAudit(context, phase, processAudit);
  assertZeroDependencyProcessState(processAudit, "Completed-install invariant");
  const live = lstatSync(preflight.nodeModulesPath, { throwIfNoEntry: false });
  const candidate = lstatSync(candidatePath, { throwIfNoEntry: false });
  if (
    !live || !live.isSymbolicLink() || live.dev !== liveIdentity.dev || live.ino !== liveIdentity.ino ||
    realpathSync(preflight.nodeModulesPath) !== preflight.currentNodeModulesRealpath ||
    !candidate || !candidate.isDirectory() || candidate.isSymbolicLink() ||
    candidate.dev !== candidateIdentity.dev || candidate.ino !== candidateIdentity.ino ||
    sha256File(join(preflight.provisionRoot, MARKER_NAME)) !== hashes.ownerMarkerSha256 ||
    sha256File(join(context.directories.npmCache, CACHE_MARKER_NAME)) !== hashes.cacheMarkerSha256 ||
    sha256File(join(context.directories.evidence, "failure-attestation.json")) !== hashes.priorFailureSha256 ||
    sha256File(join(context.directories.evidence, "cache-seed-manifest.json")) !== hashes.seedManifestSha256 ||
    sha256File(join(context.directories.evidence, "cache-seed-provenance.json")) !== hashes.seedProvenanceSha256 ||
    sha256File(OWNED_DEPENDENCY_LAUNCHER) !== hashes.launcherSha256 ||
    sha256File(fileURLToPath(import.meta.url)) !== hashes.provisionerSha256
  ) {
    throw new Error("Completed-install requalification identity/evidence invariant changed.");
  }
  return { currentSource, processAudit };
}

function sameTreeAttestation(left, right) {
  return sameJson(left?.identity, right?.identity) && sameJson(left?.proof, right?.proof);
}

function restoreRequalificationCandidate(context) {
  const { attemptPreflight: preflight, candidateIdentity, directories } = context;
  const quarantineCandidate = join(directories.quarantine, "node_modules-partial");
  const stagedCandidate = join(directories.install, "node_modules");
  const rollback = join(directories.rollback, "node_modules");
  const live = lstatSync(preflight.nodeModulesPath, { throwIfNoEntry: false });
  const staged = lstatSync(stagedCandidate, { throwIfNoEntry: false });
  if (
    live && live.isDirectory() && !live.isSymbolicLink() &&
    live.dev === candidateIdentity.dev && live.ino === candidateIdentity.ino
  ) {
    if (existsSync(quarantineCandidate)) {
      throw new Error("Cannot preserve failed active candidate because quarantine is occupied.");
    }
    renameSync(preflight.nodeModulesPath, quarantineCandidate);
  } else if (
    staged && staged.isDirectory() && !staged.isSymbolicLink() &&
    staged.dev === candidateIdentity.dev && staged.ino === candidateIdentity.ino
  ) {
    if (existsSync(quarantineCandidate)) {
      throw new Error("Cannot preserve failed staged candidate because quarantine is occupied.");
    }
    renameSync(stagedCandidate, quarantineCandidate);
  }
  if (!existsSync(preflight.nodeModulesPath) && existsSync(rollback)) {
    renameSync(rollback, preflight.nodeModulesPath);
  }
  let ownerMarkerRestored = false;
  const ownerMarkerPath = join(preflight.provisionRoot, MARKER_NAME);
  const ownerMarker = readJson(ownerMarkerPath);
  if (ownerMarker.status === "active") {
    writeJsonAtomic(
      preflight.provisionRoot,
      ownerMarkerPath,
      markerPayload(preflight, "provisioning")
    );
    ownerMarkerRestored = true;
  }
  const restoredLive = lstatSync(preflight.nodeModulesPath, { throwIfNoEntry: false });
  const restoredCandidate = lstatSync(quarantineCandidate, { throwIfNoEntry: false });
  return {
    candidatePreserved: Boolean(
      restoredCandidate && restoredCandidate.isDirectory() && !restoredCandidate.isSymbolicLink() &&
      restoredCandidate.dev === candidateIdentity.dev && restoredCandidate.ino === candidateIdentity.ino
    ),
    liveSymlinkRestored: Boolean(
      restoredLive && restoredLive.isSymbolicLink() &&
      realpathSync(preflight.nodeModulesPath) === preflight.currentNodeModulesRealpath
    ),
    ownerMarkerRestored
  };
}

export async function requalifyAndActivateCompletedDependencyTree(repoRoot = process.cwd()) {
  const context = collectCompletedInstallRequalificationPreflight(repoRoot);
  const { attemptPreflight: preflight, directories } = context;
  const lock = acquireActivationLock(preflight);
  const quarantineCandidate = context.candidatePath;
  const stagedCandidate = join(directories.install, "node_modules");
  const rollback = join(directories.rollback, "node_modules");
  const subprocesses = [];
  let phase = "requalification-preflight";
  let activated = false;
  let transitionStarted = false;
  try {
    transitionStarted = true;
    assertRequalificationPreActivationInvariants(
      context,
      quarantineCandidate,
      "locked-initial-preflight"
    );
    const initialTree = attestPhysicalDependencyTree(quarantineCandidate);
    const intent = {
      attemptId: context.attemptId,
      candidate: initialTree,
      environment: preflight.environmentProof,
      executionSource: {
        launcherSha256: context.hashes.launcherSha256,
        provisionerSha256: context.hashes.provisionerSha256
      },
      priorFailureSha256: context.hashes.priorFailureSha256,
      schemaVersion: 1,
      startedAt: new Date().toISOString(),
      status: "requalification-started",
      transition: {
        from: "sole-staged-tree-attestation-failure-after-ci0",
        to: "pending-exact-graph-requalification"
      }
    };
    writeJsonAtomic(
      directories.evidence,
      join(directories.evidence, "requalification-intent.json"),
      intent
    );

    phase = "quarantine-transition";
    assertRequalificationPreActivationInvariants(
      context,
      quarantineCandidate,
      "before-quarantine-transition"
    );
    renameSync(quarantineCandidate, stagedCandidate);
    const transitioned = lstatSync(stagedCandidate);
    if (
      transitioned.dev !== context.candidateIdentity.dev ||
      transitioned.ino !== context.candidateIdentity.ino ||
      !exactDirectoryEntries(directories.quarantine, [".quarantine-marker.json"])
    ) {
      throw new Error("Completed dependency tree changed during atomic quarantine transition.");
    }

    phase = "staged-tree-requalification";
    const stagedBefore = attestPhysicalDependencyTree(stagedCandidate);
    if (!sameTreeAttestation(initialTree, stagedBefore)) {
      throw new Error("Completed dependency tree changed after leaving quarantine.");
    }
    const stagedTree = verifyCriticalTree(preflight, stagedCandidate);
    if (stagedTree.comparison.mismatches.length !== 0) {
      throw new Error("Completed dependency exact graph requalification failed.");
    }

    phase = "npm-ls-requalified-staged";
    const stagedLs = await runNpm(preflight, ["ls", "--all", "--json"], {
      cacheMarkerContract: context.cacheMarker,
      cwd: directories.install,
      environment: preflight.provisionEnvironment.environment,
      logPath: join(directories.logs, "npm-ls-requalified-staged.log"),
      timeout: 300_000
    });
    subprocesses.push(summarizeNpmProcessOutcome("npm-ls-staged", stagedLs));
    if (
      stagedLs.error || stagedLs.status !== 0 || stagedLs.outputOverflow ||
      stagedLs.survivorCount !== 0 || !JSON.parse(stagedLs.stdout)
    ) {
      throw new Error("Requalified staged npm ls --all did not exit cleanly.");
    }
    const stagedAfter = attestPhysicalDependencyTree(stagedCandidate);
    if (!sameTreeAttestation(initialTree, stagedAfter)) {
      throw new Error("Requalified staged tree changed during npm ls attestation.");
    }
    const preActivation = assertRequalificationPreActivationInvariants(
      context,
      stagedCandidate,
      "after-staged-npm-ls"
    );
    const requalification = {
      attemptId: context.attemptId,
      candidate: stagedAfter,
      executionSource: {
        launcherSha256: context.hashes.launcherSha256,
        provisionerSha256: context.hashes.provisionerSha256
      },
      npmLsJsonSha256: sha256Buffer(stagedLs.stdout),
      preActivation,
      priorFailureSha256: context.hashes.priorFailureSha256,
      schemaVersion: 1,
      stagedTree,
      status: "passed-before-activation",
      subprocesses,
      transition: context.transition
    };
    writeJsonAtomic(
      directories.evidence,
      join(directories.evidence, "requalification-attestation.json"),
      requalification
    );

    phase = "activation";
    assertRequalificationPreActivationInvariants(
      context,
      stagedCandidate,
      "immediately-before-activation"
    );
    activatePhysicalNodeModules({
      candidate: stagedCandidate,
      current: preflight.nodeModulesPath,
      expectedCurrentRealpath: preflight.currentNodeModulesRealpath,
      rollback
    });
    activated = true;

    phase = "post-activation-attestation";
    const activeTreeAttestation = attestPhysicalDependencyTree(preflight.nodeModulesPath);
    if (!sameTreeAttestation(initialTree, activeTreeAttestation)) {
      throw new Error("Activated dependency tree changed identity or content.");
    }
    const activeTree = verifyCriticalTree(preflight, preflight.nodeModulesPath);
    const activeLs = await runNpm(preflight, ["ls", "--all", "--json"], {
      cacheMarkerContract: context.cacheMarker,
      cwd: preflight.repoRoot,
      environment: preflight.provisionEnvironment.environment,
      logPath: join(directories.logs, "npm-ls-requalified-active.log"),
      timeout: 300_000
    });
    subprocesses.push(summarizeNpmProcessOutcome("npm-ls-active", activeLs));
    if (
      activeLs.error || activeLs.status !== 0 || activeLs.outputOverflow ||
      activeLs.survivorCount !== 0 || !JSON.parse(activeLs.stdout)
    ) {
      throw new Error("Activated npm ls --all did not exit cleanly.");
    }
    const finalTreeAttestation = attestPhysicalDependencyTree(preflight.nodeModulesPath);
    const postSource = sourceState(preflight.repoRoot);
    const postProcessSample = processPreflight(preflight.repoRoot);
    persistRequalificationProcessAudit(
      context,
      "after-active-npm-ls",
      postProcessSample
    );
    const postProcesses = assertZeroDependencyProcessState(
      postProcessSample,
      "Completed-install post-activation"
    );
    if (
      !sameTreeAttestation(initialTree, finalTreeAttestation) ||
      !sameJson(postSource, preflight.source) ||
      !existsSync(rollback) || !lstatSync(rollback).isSymbolicLink() ||
      realpathSync(rollback) !== preflight.currentNodeModulesRealpath
    ) {
      throw new Error("Completed-install immediate post-activation invariant failed.");
    }
    const activationAttestation = {
      action: "requalified-and-activated-completed-install",
      activeTree,
      attemptId: context.attemptId,
      candidate: finalTreeAttestation,
      npmLsJsonSha256: sha256Buffer(activeLs.stdout),
      postProcesses,
      postSource,
      executionSource: {
        launcherSha256: context.hashes.launcherSha256,
        provisionerSha256: context.hashes.provisionerSha256
      },
      priorFailureSha256: context.hashes.priorFailureSha256,
      requalificationSha256: sha256File(join(directories.evidence, "requalification-attestation.json")),
      rollback: {
        preserved: true,
        previousRealpathClass: "starship-other-tree"
      },
      schemaVersion: 1,
      status: "passed",
      subprocesses
    };
    const pendingActivationPath = join(
      directories.evidence,
      "activation-attestation-pending.json"
    );
    const finalActivationPath = join(directories.evidence, "activation-attestation.json");
    writeJsonAtomic(
      directories.evidence,
      pendingActivationPath,
      activationAttestation
    );
    writeJsonAtomic(
      preflight.provisionRoot,
      join(preflight.provisionRoot, MARKER_NAME),
      markerPayload(preflight, "active")
    );
    if (existsSync(finalActivationPath)) {
      throw new Error("Final activation attestation unexpectedly already exists.");
    }
    renameSync(pendingActivationPath, finalActivationPath);
    return activationAttestation;
  } catch {
    let restoration = {
      candidatePreserved: false,
      liveSymlinkRestored: false,
      ownerMarkerRestored: false
    };
    try {
      restoration = restoreRequalificationCandidate(context);
    } catch {
      // Preserve every existing inode and marker for manual recovery.
    }
    if (transitionStarted) {
      try {
        normalizeConfinedNpmDebugLogs(directories.logs);
        writeJsonAtomic(
          directories.evidence,
          join(directories.evidence, "requalification-failure.json"),
          {
            activatedBeforeFailure: activated,
            attemptId: context.attemptId,
            failureCode: "COMPLETED_INSTALL_REQUALIFICATION_FAILED",
            failedPhase: phase,
            priorFailureSha256: context.hashes.priorFailureSha256,
            restoration,
            schemaVersion: 1,
            status: "failed",
            subprocesses
          }
        );
      } catch {
        // The one-time intent and original evidence remain the recovery authority.
      }
    }
    throw new Error("Completed dependency requalification failed; original and transition evidence were retained.");
  } finally {
    releaseActivationLock(lock);
  }
}

export async function provisionExactBrowserDependencies(
  repoRoot = process.cwd(),
  { nonce = randomBytes(32).toString("hex") } = {}
) {
  const preflight = collectDependencyProvisionPreflight(repoRoot, { nonce });
  if (preflight.action === "verify-existing") {
    const tree = verifyCriticalTree(preflight, preflight.nodeModulesPath);
    return { action: "verified-existing", preflight: sanitizedPreflight(preflight), tree };
  }

  const cacheSeed = discoverUniqueConfinedCacheSeed(preflight);
  const cacheSeedBinding = {
    sourceAttemptId: cacheSeed.sourceAttemptId,
    sourceManifestSha256: cacheSeed.sourceManifestSha256
  };
  const destinationCacheMarker = cacheMarkerPayload(
    preflight,
    preflight.provisionEnvironment.paths.npmCache,
    cacheSeedBinding
  );
  const lock = acquireActivationLock(preflight);
  let directories;
  let oldMoved = false;
  let activated = false;
  let environmentProof;
  let failedPhase = "layout";
  let cacheProvenance = "fresh-destination-cache";
  let cacheSeedProvenance = null;
  let cacheVerifiedInventory = null;
  const subprocesses = [];
  try {
    directories = createProvisionLayout(preflight, { cacheSeedBinding });
    writeInstallInputs(preflight, directories);
    const provisionEnvironment = preflight.provisionEnvironment;
    environmentProof = preflight.environmentProof;

    writeJsonAtomic(
      directories.evidence,
      join(directories.evidence, "cache-seed-manifest.json"),
      {
        manifest: cacheSeed.sourceManifest,
        manifestSha256: cacheSeed.sourceManifestSha256,
        schemaVersion: 1,
        status: "frozen-before-destination-copy"
      }
    );

    failedPhase = "cache-byte-copy";
    const copyProvenance = copyConfinedNpmCache(
      cacheSeed.cacheRoot,
      directories.npmCache,
      {
        expectedDestinationMarker: destinationCacheMarker,
        expectedSourceInventory: cacheSeed.inventory
      }
    );
    cacheSeedProvenance = {
      copy: copyProvenance,
      destinationAttemptId: `sha256:${sha256Buffer(preflight.nonce)}`,
      schemaVersion: 1,
      source: cacheSeed.publicProof,
      status: "byte-copied-and-revalidated"
    };
    writeJsonAtomic(
      directories.evidence,
      join(directories.evidence, "cache-seed-provenance.json"),
      cacheSeedProvenance
    );
    cacheProvenance = "byte-copied-cache";

    failedPhase = "npm-cache-verify";
    const cacheVerify = await runNpm(
      preflight,
      ["cache", "verify"],
      {
        cwd: directories.install,
        cacheMarkerContract: destinationCacheMarker,
        environment: provisionEnvironment.environment,
        logPath: join(directories.logs, "npm-cache-verify.log"),
        timeout: 180_000
      }
    );
    subprocesses.push(summarizeNpmProcessOutcome("npm-cache-verify", cacheVerify));
    if (
      cacheVerify.error || cacheVerify.status !== 0 || cacheVerify.outputOverflow ||
      cacheVerify.survivorCount !== 0
    ) {
      throw new Error("Confined npm cache verify failed.");
    }
    cacheVerifiedInventory = inventoryConfinedNpmCache(directories.npmCache);
    cacheProvenance = "byte-copied-verified-cache";

    failedPhase = "npm-ci-prefer-offline";
    const install = await runNpm(
      preflight,
      ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
      {
        cacheMarkerContract: destinationCacheMarker,
        cwd: directories.install,
        environment: provisionEnvironment.environment,
        logPath: join(directories.logs, "npm-ci-prefer-offline.log"),
        timeout: 2_700_000
      }
    );
    subprocesses.push(summarizeNpmProcessOutcome("npm-ci-prefer-offline", install));
    if (install.error || install.status !== 0 || install.outputOverflow || install.survivorCount !== 0) {
      throw new Error("Confined npm ci failed; inspect the retained sanitized npm log.");
    }
    failedPhase = "staged-tree-attestation";
    const stagedNodeModules = join(directories.install, "node_modules");
    const stagedTree = verifyCriticalTree(preflight, stagedNodeModules);
    failedPhase = "npm-ls-staged";
    const stagedLs = await runNpm(
      preflight,
      ["ls", "--all", "--json"],
      {
        cacheMarkerContract: destinationCacheMarker,
        cwd: directories.install,
        environment: provisionEnvironment.environment,
        logPath: join(directories.logs, "npm-ls-staged.log"),
        timeout: 300_000
      }
    );
    subprocesses.push(summarizeNpmProcessOutcome("npm-ls-staged", stagedLs));
    if (stagedLs.error || stagedLs.status !== 0 || stagedLs.outputOverflow || stagedLs.survivorCount !== 0) {
      throw new Error("Staged npm ls --all did not attest an exact dependency tree.");
    }
    JSON.parse(stagedLs.stdout);
    assertSourceStateUnchanged(preflight);
    const processBeforeActivation = processPreflight(preflight.repoRoot);
    if (
      processBeforeActivation.activeProfileCount !== 0 ||
      processBeforeActivation.ownerAssociatedCount !== 0 ||
      processBeforeActivation.tokenBearingCount !== 0
    ) {
      throw new Error("A browser/build/service process appeared before dependency activation.");
    }

    failedPhase = "activation";
    const rollbackNodeModules = join(directories.rollback, "node_modules");
    activatePhysicalNodeModules({
      candidate: stagedNodeModules,
      current: preflight.nodeModulesPath,
      expectedCurrentRealpath: preflight.currentNodeModulesRealpath,
      rollback: rollbackNodeModules
    });
    oldMoved = true;
    activated = true;

    const activeTree = verifyCriticalTree(preflight, preflight.nodeModulesPath);
    failedPhase = "npm-ls-active";
    const activeLs = await runNpm(
      preflight,
      ["ls", "--all", "--json"],
      {
        cacheMarkerContract: destinationCacheMarker,
        cwd: preflight.repoRoot,
        environment: provisionEnvironment.environment,
        logPath: join(directories.logs, "npm-ls-active.log"),
        timeout: 300_000
      }
    );
    subprocesses.push(summarizeNpmProcessOutcome("npm-ls-active", activeLs));
    if (activeLs.error || activeLs.status !== 0 || activeLs.outputOverflow || activeLs.survivorCount !== 0) {
      throw new Error("Activated npm ls --all did not attest an exact dependency tree.");
    }
    JSON.parse(activeLs.stdout);
    failedPhase = "post-attestation";
    const postSource = assertSourceStateUnchanged(preflight);
    const postProcesses = processPreflight(preflight.repoRoot);
    if (
      postProcesses.activeProfileCount !== 0 ||
      postProcesses.foreignProfileCount !== 0 ||
      postProcesses.ownerAssociatedCount !== 0 ||
      postProcesses.tokenBearingCount !== 0
    ) {
      throw new Error("Dependency post-attestation found a browser/build/service process or profile.");
    }
    const attestation = {
      action: "provisioned-and-activated",
      activeTree,
      environment: environmentProof,
      cache: {
        markerSha256: sha256File(join(directories.npmCache, CACHE_MARKER_NAME)),
        provenance: cacheProvenance,
        seed: cacheSeedProvenance,
        verifiedInventory: cacheVerifiedInventory
      },
      npmLs: {
        activeJsonSha256: sha256Buffer(activeLs.stdout),
        activeStatus: activeLs.status,
        stagedJsonSha256: sha256Buffer(stagedLs.stdout),
        stagedStatus: stagedLs.status
      },
      postProcesses,
      postSource,
      preflight: sanitizedPreflight(preflight),
      rollback: {
        preserved: existsSync(rollbackNodeModules) && lstatSync(rollbackNodeModules).isSymbolicLink(),
        location: "confined-provision-rollback/node_modules"
      },
      schemaVersion: 1,
      stagedTree,
      status: "passed",
      subprocesses
    };
    writeJsonAtomic(directories.evidence, join(directories.evidence, "attestation.json"), attestation);
    writeJsonAtomic(
      preflight.provisionRoot,
      join(preflight.provisionRoot, MARKER_NAME),
      markerPayload(preflight, "active")
    );
    return attestation;
  } catch (error) {
    if (directories) {
      try {
        if (activated && existsSync(preflight.nodeModulesPath)) {
          quarantinePartialNodeModules(preflight, directories, preflight.nodeModulesPath);
          activated = false;
        } else if (existsSync(join(directories.install, "node_modules"))) {
          quarantinePartialNodeModules(
            preflight,
            directories,
            join(directories.install, "node_modules")
          );
        }
        const rollbackNodeModules = join(directories.rollback, "node_modules");
        if (oldMoved && !existsSync(preflight.nodeModulesPath) && existsSync(rollbackNodeModules)) {
          renameSync(rollbackNodeModules, preflight.nodeModulesPath);
          oldMoved = false;
        }
        normalizeConfinedNpmDebugLogs(directories.logs);
        const failure = buildDependencyFailureSummary(failedPhase, subprocesses);
        writeJsonAtomic(directories.evidence, join(directories.evidence, "failure-attestation.json"), {
          cache: {
            markerSha256: existsSync(join(directories.npmCache, CACHE_MARKER_NAME))
              ? sha256File(join(directories.npmCache, CACHE_MARKER_NAME))
              : null,
            provenance: cacheProvenance,
            seed: cacheSeedProvenance,
            verifiedInventory: cacheVerifiedInventory
          },
          environment: environmentProof ?? null,
          failure,
          failureCode: failure.failureCode,
          preflight: sanitizedPreflight(preflight),
          rollbackRestored: !oldMoved,
          schemaVersion: 1,
          status: "failed"
        });
      } catch {
        // Preserve every marked partial/rollback artifact for manual recovery.
      }
    }
    throw new Error("Exact dependency provisioning failed; retained evidence and rollback state require review.");
  } finally {
    releaseActivationLock(lock);
  }
}

async function main() {
  if (process.argv.length === 2) {
    await provisionExactBrowserDependencies(process.cwd());
    process.stdout.write("Exact Starship dependency tree: PASS; browser/build/server not launched.\n");
    return;
  }
  if (process.argv.length === 3 && process.argv[2] === "--requalify-completed-install") {
    await requalifyAndActivateCompletedDependencyTree(process.cwd());
    process.stdout.write("Completed Starship dependency tree: REQUALIFIED AND ACTIVATED; browser/build/server not launched.\n");
    return;
  }
  throw new Error("Dependency provisioner accepts only the exact completed-install requalification mode.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    process.stderr.write("Exact Starship dependency transition failed; inspect confined evidence.\n");
    process.exitCode = 1;
  });
}
