import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";

import {
  assertLiveHomeEnvironmentValue,
  assertLiveHomeProof,
  assertPathOutsideLiveHome,
  liveHomeValueSha256,
  requiredBrowserEnvironmentValueSha256
} from "./live-home-protection.mjs";

const SCHEMA_VERSION = 1;
const READ_ONLY_COMMAND_ID = "static.next-config-read-only-import";
const READ_ONLY_FLAG = "NEXT_CONFIG_READ_ONLY_IMPORT";
const READ_ONLY_IMPORTER = "scripts/next-config-read-only-importer.mjs";
const AUTHORITY_SOURCE = "scripts/next-config-read-only-authority.mjs";
const LIVE_HOME_SOURCE = "scripts/live-home-protection.mjs";
const NEXT_CONFIG_SOURCE = "next.config.ts";
const PINNED_NEXT_VERSION = "15.5.23";
const BUILD_PHASE = "phase-production-build";
const SERVICE_PHASE = "phase-production-server";
const READ_ONLY_PHASE = "mais-next-config-read-only-import";
const NEXT_INTERNAL_SOURCES = Object.freeze([
  "dist/bin/next",
  "dist/server/lib/router-server.js",
  "dist/server/lib/start-server.js",
  "dist/shared/lib/constants.js"
]);
const KNOWN_NEXT_COMMANDS = Object.freeze(new Set([
  "build", "dev", "experimental-test", "export", "info", "internal", "lint", "start",
  "telemetry", "typegen"
]));
const WRAPPER_BASENAMES = Object.freeze(new Set([
  "bun", "bunx", "corepack", "npm", "npx", "pnpm", "yarn"
]));

function fail(code) {
  throw new Error(code);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  );
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sameJson(left, right) {
  return stableJson(left) === stableJson(right);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function domainHash(domain, value) {
  return sha256(`${domain}\0${stableJson(value)}`);
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  if (!sameJson(Object.keys(value).sort(), [...expected].sort())) fail(code);
}

const PHYSICAL_OBSERVATION_KEYS = Object.freeze([
  "canonicalPath", "ctimeNs", "dev", "ino", "kind", "mode", "mtimeNs",
  "nlink", "physical", "realpath", "size"
]);

function decimalSnapshotValue(value) {
  return typeof value === "string" && /^(?:0|[1-9]\d*)$/.test(value);
}

export function validateNextConfigPhysicalObservationSnapshot(
  observation,
  expectedKind
) {
  exactKeys(observation, PHYSICAL_OBSERVATION_KEYS, "NEXT_CONFIG_PHYSICAL_OBSERVATION_INVALID");
  if (
    !["directory", "file"].includes(expectedKind)
    || observation.kind !== expectedKind
    || observation.physical !== true
    || typeof observation.canonicalPath !== "string"
    || !isAbsolute(observation.canonicalPath)
    || resolve(observation.canonicalPath) !== observation.canonicalPath
    || observation.realpath !== observation.canonicalPath
    || ![
      observation.ctimeNs,
      observation.dev,
      observation.ino,
      observation.mode,
      observation.mtimeNs,
      observation.nlink,
      observation.size
    ].every(decimalSnapshotValue)
    || observation.nlink === "0"
  ) fail("NEXT_CONFIG_PHYSICAL_OBSERVATION_INVALID");
  return Object.freeze(stableValue(observation));
}

export function validateNextConfigPhysicalTransitionSnapshot(
  transition,
  expectedKind
) {
  exactKeys(transition, ["after", "before"], "NEXT_CONFIG_PHYSICAL_TRANSITION_INVALID");
  const before = validateNextConfigPhysicalObservationSnapshot(
    transition.before,
    expectedKind
  );
  const after = validateNextConfigPhysicalObservationSnapshot(
    transition.after,
    expectedKind
  );
  if (!sameJson(before, after)) fail("NEXT_CONFIG_PHYSICAL_TRANSITION_DRIFT");
  return Object.freeze({ after, before });
}

export function validateNextConfigPhysicalDirectoryIdentitySnapshot(identity) {
  exactKeys(identity, ["canonicalPath", "dev", "ino", "physical"],
    "NEXT_CONFIG_PHYSICAL_DIRECTORY_IDENTITY_INVALID");
  if (
    identity.physical !== true
    || typeof identity.canonicalPath !== "string"
    || !isAbsolute(identity.canonicalPath)
    || resolve(identity.canonicalPath) !== identity.canonicalPath
    || !decimalSnapshotValue(identity.dev)
    || !decimalSnapshotValue(identity.ino)
  ) fail("NEXT_CONFIG_PHYSICAL_DIRECTORY_IDENTITY_INVALID");
  return Object.freeze(stableValue(identity));
}

export function validateNextConfigPhysicalFileIdentitySnapshot(identity) {
  exactKeys(identity, ["canonicalPath", "dev", "ino", "physical", "sha256"],
    "NEXT_CONFIG_PHYSICAL_FILE_IDENTITY_INVALID");
  const { sha256: digest, ...directoryIdentity } = identity;
  validateNextConfigPhysicalDirectoryIdentitySnapshot(directoryIdentity);
  if (!/^[a-f0-9]{64}$/.test(digest ?? "")) {
    fail("NEXT_CONFIG_PHYSICAL_FILE_IDENTITY_INVALID");
  }
  return Object.freeze(stableValue(identity));
}

function exactArgv(argv) {
  if (!Array.isArray(argv) || argv.some((value) => typeof value !== "string")) {
    fail("NEXT_CONFIG_ARGV_INVALID");
  }
  return Object.freeze([...argv]);
}

function exactEnvironment(environment) {
  if (
    !environment
    || typeof environment !== "object"
    || Array.isArray(environment)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(environment))
  ) fail("NEXT_CONFIG_ENVIRONMENT_INVALID");
  const output = {};
  for (const key of Object.keys(environment)) {
    const descriptor = Object.getOwnPropertyDescriptor(environment, key);
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      fail("NEXT_CONFIG_ENVIRONMENT_INVALID");
    }
    Object.defineProperty(output, key, {
      configurable: false,
      enumerable: true,
      value: descriptor.value,
      writable: false
    });
  }
  return Object.freeze(output);
}

function canonicalTextualRoot(cwd) {
  if (typeof cwd !== "string" || !isAbsolute(cwd) || resolve(cwd) !== cwd) {
    fail("NEXT_CONFIG_CWD_INVALID");
  }
  return cwd;
}

function looksLikeNextOrWrapperInvocation(argv, environment) {
  if (Object.prototype.hasOwnProperty.call(environment, "NODE_OPTIONS")) return true;
  for (const argument of argv) {
    const normalized = argument.replaceAll("\\", "/").toLowerCase();
    const name = basename(normalized);
    if (
      WRAPPER_BASENAMES.has(name)
      || name === "next"
      || normalized.includes("node_modules/.bin/next")
      || normalized.includes("node_modules/next/dist/bin/next")
      || normalized.includes("next/dist/bin/next")
      || KNOWN_NEXT_COMMANDS.has(normalized)
    ) return true;
  }
  return false;
}

export function classifyNextConfigInvocationContext({
  argv = process.argv,
  cwd = process.cwd(),
  environment = process.env
} = {}) {
  const exactArguments = exactArgv(argv);
  const exactCwd = canonicalTextualRoot(cwd);
  const exactEnv = exactEnvironment(environment);
  const node = process.execPath;
  const importer = join(exactCwd, READ_ONLY_IMPORTER);
  const nextCli = join(exactCwd, "node_modules", "next", "dist", "bin", "next");

  if (
    sameJson(Object.keys(exactEnv), ["HOME", READ_ONLY_FLAG])
    && exactEnv[READ_ONLY_FLAG] === "1"
    && typeof exactEnv.HOME === "string"
    && exactEnv.HOME.length > 0
    && sameJson(exactArguments, [node, importer])
  ) {
    return Object.freeze({
      commandId: READ_ONLY_COMMAND_ID,
      expectedPhase: READ_ONLY_PHASE,
      mode: "read-only-import"
    });
  }

  if (
    exactArguments.length === 3
    && exactArguments[0] === node
    && exactArguments[1] === nextCli
    && exactArguments[2] === "build"
  ) {
    return Object.freeze({
      commandId: "owner.next.build",
      expectedPhase: BUILD_PHASE,
      mode: "owner-build"
    });
  }

  if (
    exactArguments.length === 7
    && exactArguments[0] === node
    && exactArguments[1] === nextCli
    && exactArguments[2] === "start"
    && exactArguments[3] === "--hostname"
    && exactArguments[4] === "127.0.0.1"
    && exactArguments[5] === "--port"
    && /^[1-9]\d{0,4}$/.test(exactArguments[6])
    && Number(exactArguments[6]) <= 65535
  ) {
    return Object.freeze({
      commandId: "owner.next.service",
      expectedPhase: SERVICE_PHASE,
      mode: "owner-service"
    });
  }

  if (looksLikeNextOrWrapperInvocation(exactArguments, exactEnv)) {
    fail("NEXT_CONFIG_CLI_CONTEXT_DENIED");
  }
  fail("NEXT_CONFIG_CONTEXT_DENIED");
}

function physicalObservation(candidate, canonical, entry) {
  const kind = entry?.isFile()
    ? "file"
    : entry?.isDirectory()
      ? "directory"
      : entry?.isSymbolicLink()
        ? "symlink"
        : "special";
  return {
    canonicalPath: candidate,
    ctimeNs: String(entry?.ctimeNs),
    dev: String(entry?.dev),
    ino: String(entry?.ino),
    kind,
    mode: String(entry?.mode),
    mtimeNs: String(entry?.mtimeNs),
    nlink: String(entry?.nlink),
    physical: true,
    realpath: canonical,
    size: String(entry?.size)
  };
}

function physicalEntry(candidate, liveHomeProof, code, expectedKind, expectedSha256) {
  assertLiveHomeProof(liveHomeProof);
  assertPathOutsideLiveHome(liveHomeProof, candidate);
  if (typeof candidate !== "string" || !isAbsolute(candidate) || resolve(candidate) !== candidate) {
    fail(code);
  }
  let after;
  let before;
  let bytes;
  let canonical;
  try {
    before = lstatSync(candidate, { bigint: true, throwIfNoEntry: false });
    canonical = before ? realpathSync(candidate) : undefined;
    bytes = expectedKind === "file" && before ? readFileSync(candidate) : undefined;
    after = lstatSync(candidate, { bigint: true, throwIfNoEntry: false });
  } catch {
    fail(code);
  }
  const transition = validateNextConfigPhysicalTransitionSnapshot({
    after: physicalObservation(candidate, canonical, after),
    before: physicalObservation(candidate, canonical, before)
  }, expectedKind);
  const identity = expectedKind === "file"
    ? validateNextConfigPhysicalFileIdentitySnapshot({
        canonicalPath: candidate,
        dev: transition.before.dev,
        ino: transition.before.ino,
        physical: true,
        sha256: sha256(bytes)
      })
    : validateNextConfigPhysicalDirectoryIdentitySnapshot({
        canonicalPath: candidate,
        dev: transition.before.dev,
        ino: transition.before.ino,
        physical: true
      });
  if (expectedSha256 !== undefined && identity.sha256 !== expectedSha256) fail(code);
  assertLiveHomeProof(liveHomeProof);
  return identity;
}

function physicalDirectory(candidate, liveHomeProof, code) {
  return physicalEntry(candidate, liveHomeProof, code, "directory");
}

function physicalFile(candidate, liveHomeProof, code, expectedSha256) {
  return physicalEntry(candidate, liveHomeProof, code, "file", expectedSha256);
}

function sourceIdentity(repoRoot, relativePath, liveHomeProof) {
  return Object.freeze({
    path: relativePath,
    ...physicalFile(join(repoRoot, relativePath), liveHomeProof, "NEXT_CONFIG_SOURCE_INVALID")
  });
}

function frameworkEnvironmentBinding(entries) {
  const canonicalEntries = Object.freeze(entries
    .map(([key, value]) => Object.freeze({
      key,
      semanticClass: "framework-exact-literal",
      valueSha256: requiredBrowserEnvironmentValueSha256(key, value)
    }))
    .sort((left, right) => left.key.localeCompare(right.key)));
  return Object.freeze({
    entries: canonicalEntries,
    inventorySha256: domainHash("next-framework-environment", {
      entries: canonicalEntries,
      schemaVersion: 1
    }),
    schemaVersion: 1
  });
}

function frameworkValuesFor(classification, plan) {
  const values = [
    ["NODE_ENV", "production"],
    ["NEXT_RUNTIME", "nodejs"],
    ["__NEXT_PROCESSED_ENV", "true"]
  ];
  if (classification.mode === "owner-service") {
    values.push(
      ["PORT", String(plan.servicePort)],
      ["__NEXT_PRIVATE_ORIGIN", `http://127.0.0.1:${plan.servicePort}`]
    );
  }
  return values;
}

function assertExactOwnerEnvironment({ classification, environment, liveHomeProof, validation }) {
  const exactEnv = exactEnvironment(environment);
  const base = validation.environment;
  const framework = frameworkValuesFor(classification, validation.plan);
  const expectedKeys = [
    ...Object.keys(base),
    "HOME",
    ...framework.map(([key]) => key)
  ].sort();
  if (!sameJson(Object.keys(exactEnv).sort(), expectedKeys)) {
    fail("NEXT_CONFIG_OWNER_ENVIRONMENT_KEYS_INVALID");
  }
  for (const [key, value] of Object.entries(base)) {
    if (exactEnv[key] !== value) fail("NEXT_CONFIG_OWNER_ENVIRONMENT_VALUE_INVALID");
  }
  assertLiveHomeEnvironmentValue(liveHomeProof, exactEnv.HOME);
  for (const [key, value] of framework) {
    if (exactEnv[key] !== value) fail("NEXT_CONFIG_FRAMEWORK_ENVIRONMENT_INVALID");
  }
  if (
    Object.prototype.hasOwnProperty.call(exactEnv, "HOSTNAME")
    || Object.prototype.hasOwnProperty.call(exactEnv, "NEXT_PHASE")
    || Object.prototype.hasOwnProperty.call(exactEnv, "NODE_OPTIONS")
    || Object.prototype.hasOwnProperty.call(exactEnv, "NODE_PATH")
    || Object.prototype.hasOwnProperty.call(exactEnv, READ_ONLY_FLAG)
  ) fail("NEXT_CONFIG_OWNER_ENVIRONMENT_OVERRIDE");
  return frameworkEnvironmentBinding(framework);
}

export function validateNextConfigDependencyAuthoritySnapshot(authority) {
  exactKeys(authority, [
    "cli", "manifest", "nodeModules", "packageRoot", "schemaVersion",
    "sha256", "sources", "version"
  ], "NEXT_CONFIG_DEPENDENCY_AUTHORITY_INVALID");
  const nodeModules = validateNextConfigPhysicalDirectoryIdentitySnapshot(
    authority.nodeModules
  );
  const cli = validateNextConfigPhysicalFileIdentitySnapshot(authority.cli);
  const manifest = validateNextConfigPhysicalFileIdentitySnapshot(authority.manifest);
  if (
    authority.schemaVersion !== SCHEMA_VERSION
    || authority.version !== PINNED_NEXT_VERSION
    || authority.packageRoot !== join(nodeModules.canonicalPath, "next")
    || manifest.canonicalPath !== join(authority.packageRoot, "package.json")
    || cli.canonicalPath !== join(authority.packageRoot, "dist", "bin", "next")
    || !Array.isArray(authority.sources)
    || authority.sources.length !== NEXT_INTERNAL_SOURCES.length
  ) fail("NEXT_CONFIG_DEPENDENCY_AUTHORITY_INVALID");
  const sources = authority.sources.map((source, index) => {
    exactKeys(source, ["canonicalPath", "dev", "ino", "path", "physical", "sha256"],
      "NEXT_CONFIG_DEPENDENCY_SOURCE_INVALID");
    const { path: relativePath, ...identity } = source;
    const validated = validateNextConfigPhysicalFileIdentitySnapshot(identity);
    if (
      relativePath !== NEXT_INTERNAL_SOURCES[index]
      || validated.canonicalPath !== join(authority.packageRoot, relativePath)
    ) fail("NEXT_CONFIG_DEPENDENCY_SOURCE_INVALID");
    return Object.freeze({ path: relativePath, ...validated });
  });
  const canonical = stableValue({
    ...authority,
    cli,
    manifest,
    nodeModules,
    sources
  });
  if (
    !/^[a-f0-9]{64}$/.test(authority.sha256 ?? "")
    || authority.sha256 !== domainHash("next-dependency-authority", {
      ...canonical,
      sha256: undefined
    })
  ) fail("NEXT_CONFIG_DEPENDENCY_AUTHORITY_FINGERPRINT_INVALID");
  return Object.freeze(canonical);
}

function nextDependencyAuthority(plan, liveHomeProof) {
  const dependency = plan?.dependencyAttestation;
  const nodeModulesRoot = dependency?.nodeModules?.canonicalRoot;
  const nodeModules = physicalDirectory(
    nodeModulesRoot,
    liveHomeProof,
    "NEXT_CONFIG_NODE_MODULES_INVALID"
  );
  if (
    nodeModulesRoot !== join(plan.repoRoot, "node_modules")
    || nodeModules.dev !== dependency?.nodeModules?.identity?.dev
    || nodeModules.ino !== dependency?.nodeModules?.identity?.ino
  ) fail("NEXT_CONFIG_NODE_MODULES_BINDING_INVALID");

  const nextManifestProof = dependency?.critical?.manifests?.next;
  const nextManifest = physicalFile(
    nextManifestProof?.canonicalPath,
    liveHomeProof,
    "NEXT_CONFIG_NEXT_MANIFEST_INVALID",
    nextManifestProof?.sha256
  );
  if (
    nextManifestProof?.version !== PINNED_NEXT_VERSION
    || dependency?.critical?.actualVersions?.next !== PINNED_NEXT_VERSION
    || dependency?.critical?.expectedVersions?.next !== PINNED_NEXT_VERSION
    || nextManifest.canonicalPath !== join(nodeModulesRoot, "next", "package.json")
  ) fail("NEXT_CONFIG_NEXT_VERSION_INVALID");

  const nextCliProof = dependency?.critical?.clis?.next;
  const nextCli = physicalFile(
    nextCliProof?.canonicalPath,
    liveHomeProof,
    "NEXT_CONFIG_NEXT_CLI_INVALID",
    nextCliProof?.sha256
  );
  if (nextCli.canonicalPath !== join(nodeModulesRoot, "next", "dist", "bin", "next")) {
    fail("NEXT_CONFIG_NEXT_CLI_BINDING_INVALID");
  }

  const packageRoot = join(nodeModulesRoot, "next");
  const sources = NEXT_INTERNAL_SOURCES.map((relativePath) => Object.freeze({
    path: relativePath,
    ...physicalFile(
      join(packageRoot, relativePath),
      liveHomeProof,
      "NEXT_CONFIG_PINNED_SOURCE_INVALID"
    )
  }));
  const authority = {
    cli: nextCli,
    manifest: nextManifest,
    nodeModules,
    packageRoot,
    schemaVersion: SCHEMA_VERSION,
    sha256: "",
    sources: Object.freeze(sources),
    version: PINNED_NEXT_VERSION
  };
  authority.sha256 = domainHash("next-dependency-authority", {
    ...authority,
    sha256: undefined
  });
  return validateNextConfigDependencyAuthoritySnapshot(authority);
}

function validateReadOnlyCaptureSnapshot(capture) {
  exactKeys(capture, [
    "argvSha256", "authorityFingerprint", "commandId", "controlEnvironment",
    "cwd", "executable", "homeValueSha256", "mode", "repo",
    "requiresLiveHomeProtection", "schemaVersion", "sources"
  ], "NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
  if (
    capture.schemaVersion !== SCHEMA_VERSION
    || capture.mode !== "read-only-import"
    || capture.commandId !== READ_ONLY_COMMAND_ID
    || capture.requiresLiveHomeProtection !== true
    || !/^[a-f0-9]{64}$/.test(capture.homeValueSha256 ?? "")
    || !/^[a-f0-9]{64}$/.test(capture.argvSha256 ?? "")
  ) fail("NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
  exactKeys(capture.controlEnvironment, ["flagValueSha256", "inventorySha256"],
    "NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
  if (
    capture.controlEnvironment.flagValueSha256
      !== requiredBrowserEnvironmentValueSha256(READ_ONLY_FLAG, "1")
    || capture.controlEnvironment.inventorySha256 !== domainHash(
      "next-read-only-environment",
      { flagValueSha256: capture.controlEnvironment.flagValueSha256, schemaVersion: 1 }
    )
  ) fail("NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
  const repo = validateNextConfigPhysicalDirectoryIdentitySnapshot(capture.repo);
  const executable = validateNextConfigPhysicalFileIdentitySnapshot(capture.executable);
  if (
    capture.cwd !== repo.canonicalPath
    || !Array.isArray(capture.sources)
    || capture.sources.length !== 4
  ) fail("NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
  const expectedSources = [
    AUTHORITY_SOURCE,
    LIVE_HOME_SOURCE,
    NEXT_CONFIG_SOURCE,
    READ_ONLY_IMPORTER
  ].sort();
  const sources = capture.sources.map((source, index) => {
    exactKeys(source, ["canonicalPath", "dev", "ino", "path", "physical", "sha256"],
      "NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
    const { path: relativePath, ...identity } = source;
    const validated = validateNextConfigPhysicalFileIdentitySnapshot(identity);
    if (
      relativePath !== expectedSources[index]
      || validated.canonicalPath !== join(repo.canonicalPath, relativePath)
    ) fail("NEXT_CONFIG_READ_ONLY_CAPTURE_INVALID");
    return Object.freeze({ path: relativePath, ...validated });
  });
  capture = stableValue({ ...capture, executable, repo, sources });
  const expectedFingerprint = domainHash("next-read-only-authority", {
    ...capture,
    authorityFingerprint: undefined
  });
  if (capture.authorityFingerprint !== expectedFingerprint) {
    fail("NEXT_CONFIG_READ_ONLY_CAPTURE_FINGERPRINT_INVALID");
  }
  return Object.freeze(stableValue(capture));
}

export function captureNextConfigReadOnlyAuthority({
  argv = process.argv,
  cwd = process.cwd(),
  environment = process.env,
  liveHomeProof
} = {}) {
  const classification = classifyNextConfigInvocationContext({ argv, cwd, environment });
  if (classification.mode !== "read-only-import") fail("NEXT_CONFIG_READ_ONLY_MODE_REQUIRED");
  assertLiveHomeProof(liveHomeProof);
  const exactEnv = exactEnvironment(environment);
  if (!sameJson(Object.keys(exactEnv), ["HOME", READ_ONLY_FLAG])) {
    fail("NEXT_CONFIG_READ_ONLY_ENVIRONMENT_INVALID");
  }
  assertLiveHomeEnvironmentValue(liveHomeProof, exactEnv.HOME);
  const repo = physicalDirectory(cwd, liveHomeProof, "NEXT_CONFIG_READ_ONLY_REPO_INVALID");
  const executable = physicalFile(
    process.execPath,
    liveHomeProof,
    "NEXT_CONFIG_READ_ONLY_EXECUTABLE_INVALID"
  );
  if (argv[0] !== executable.canonicalPath) fail("NEXT_CONFIG_READ_ONLY_EXECUTABLE_INVALID");
  const sources = Object.freeze([
    READ_ONLY_IMPORTER,
    AUTHORITY_SOURCE,
    LIVE_HOME_SOURCE,
    NEXT_CONFIG_SOURCE
  ].sort().map((file) => sourceIdentity(repo.canonicalPath, file, liveHomeProof)));
  const controlEnvironment = Object.freeze({
    flagValueSha256: requiredBrowserEnvironmentValueSha256(READ_ONLY_FLAG, "1"),
    inventorySha256: domainHash("next-read-only-environment", {
      flagValueSha256: requiredBrowserEnvironmentValueSha256(READ_ONLY_FLAG, "1"),
      schemaVersion: 1
    })
  });
  const capture = {
    argvSha256: domainHash("next-read-only-argv", [...argv]),
    authorityFingerprint: "",
    commandId: READ_ONLY_COMMAND_ID,
    controlEnvironment,
    cwd: repo.canonicalPath,
    executable,
    homeValueSha256: liveHomeValueSha256(liveHomeProof),
    mode: "read-only-import",
    repo,
    requiresLiveHomeProtection: true,
    schemaVersion: SCHEMA_VERSION,
    sources
  };
  capture.authorityFingerprint = domainHash("next-read-only-authority", {
    ...capture,
    authorityFingerprint: undefined
  });
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: capture.homeValueSha256
  });
  return validateReadOnlyCaptureSnapshot(capture);
}

export function assertNextConfigReadOnlyAuthorityUnchanged(capture, input = {}) {
  const validated = validateReadOnlyCaptureSnapshot(capture);
  const current = captureNextConfigReadOnlyAuthority(input);
  if (!sameJson(validated, current)) fail("NEXT_CONFIG_READ_ONLY_AUTHORITY_DRIFT");
  return current;
}

function validateOwnerCaptureSnapshot(capture) {
  exactKeys(capture, [
    "authorityFingerprint", "command", "cwd", "dependencyAttestationFingerprint",
    "executable", "expectedPhase", "frameworkInjectedEnvironment", "homeValueSha256", "interfaces",
    "manifest", "mode", "next", "planFingerprint", "repoRoot",
    "requiresLiveHomeProtection", "schemaVersion", "scopeFingerprint",
    "sourceFingerprintsSha256"
  ], "NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  if (
    capture.schemaVersion !== SCHEMA_VERSION
    || !["owner-build", "owner-service"].includes(capture.mode)
    || capture.requiresLiveHomeProtection !== true
    || !/^[a-f0-9]{64}$/.test(capture.homeValueSha256 ?? "")
    || capture.scopeFingerprint !== capture.command?.scopeFingerprint
  ) fail("NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  const executable = validateNextConfigPhysicalFileIdentitySnapshot(capture.executable);
  const manifest = validateNextConfigPhysicalFileIdentitySnapshot(capture.manifest);
  const next = validateNextConfigDependencyAuthoritySnapshot(capture.next);
  exactKeys(capture.command, [
    "argvSha256", "capabilityProofSha256", "commandDefinitionSha256", "commandId",
    "descriptorFingerprint", "environmentInventorySha256", "executableSha256",
    "resolvedArgsSha256", "scopeFingerprint"
  ], "NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  if (
    capture.cwd !== capture.repoRoot
    || next.nodeModules.canonicalPath !== join(capture.repoRoot, "node_modules")
    || capture.command.executableSha256 !== executable.sha256
    || capture.command.commandId !== (
      capture.mode === "owner-build" ? "owner.next.build" : "owner.next.service"
    )
    || !/^[a-f0-9]{64}$/.test(capture.dependencyAttestationFingerprint ?? "")
    || !/^[a-f0-9]{64}$/.test(capture.planFingerprint ?? "")
    || !/^[a-f0-9]{64}$/.test(capture.sourceFingerprintsSha256 ?? "")
  ) fail("NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  const framework = capture.frameworkInjectedEnvironment;
  exactKeys(framework, ["entries", "inventorySha256", "schemaVersion"],
    "NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  if (
    framework.schemaVersion !== 1
    || framework.inventorySha256 !== domainHash("next-framework-environment", {
      entries: framework.entries,
      schemaVersion: 1
    })
  ) fail("NEXT_CONFIG_OWNER_CAPTURE_INVALID");
  capture = stableValue({ ...capture, executable, manifest, next });
  const expectedFingerprint = domainHash("next-owner-config-authority", {
    ...capture,
    authorityFingerprint: undefined
  });
  if (capture.authorityFingerprint !== expectedFingerprint) {
    fail("NEXT_CONFIG_OWNER_CAPTURE_FINGERPRINT_INVALID");
  }
  return Object.freeze(stableValue(capture));
}

export function captureOwnerNextConfigAuthority({
  argv = process.argv,
  cwd = process.cwd(),
  environment = process.env,
  liveHomeProof,
  ownerValidation,
  invocationReceipt
} = {}) {
  const classification = classifyNextConfigInvocationContext({ argv, cwd, environment });
  if (!classification.mode.startsWith("owner-")) fail("NEXT_CONFIG_OWNER_MODE_REQUIRED");
  const plan = ownerValidation?.plan;
  if (
    !plan
    || plan.repoRoot !== cwd
    || plan.requiresLiveHomeProtection !== true
    || plan.planFingerprint !== ownerValidation.plan.planFingerprint
  ) fail("NEXT_CONFIG_OWNER_PLAN_INVALID");
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: plan.homeValueSha256
  });
  if (
    invocationReceipt?.commandId !== classification.commandId
    || invocationReceipt?.scopeFingerprint !== plan.executionScope?.scopeFingerprint
    || invocationReceipt?.environmentInventorySha256 !== plan.environmentBinding?.inventorySha256
    || invocationReceipt?.argvSha256 !== sha256(stableJson([...argv]))
  ) fail("NEXT_CONFIG_OWNER_COMMAND_INVALID");

  const repo = physicalDirectory(cwd, liveHomeProof, "NEXT_CONFIG_OWNER_REPO_INVALID");
  if (repo.canonicalPath !== plan.repoRoot) fail("NEXT_CONFIG_OWNER_REPO_INVALID");
  const executable = physicalFile(
    process.execPath,
    liveHomeProof,
    "NEXT_CONFIG_OWNER_EXECUTABLE_INVALID"
  );
  if (
    argv[0] !== executable.canonicalPath
    || invocationReceipt.executableSha256 !== executable.sha256
  ) fail("NEXT_CONFIG_OWNER_EXECUTABLE_INVALID");

  const frameworkInjectedEnvironment = assertExactOwnerEnvironment({
    classification,
    environment,
    liveHomeProof,
    validation: ownerValidation
  });
  const next = nextDependencyAuthority(plan, liveHomeProof);
  if (argv[1] !== next.cli.canonicalPath) fail("NEXT_CONFIG_NEXT_CLI_BINDING_INVALID");
  const manifest = physicalFile(
    plan.evidencePaths?.preflightManifest,
    liveHomeProof,
    "NEXT_CONFIG_MANIFEST_INVALID"
  );
  const interfaces = Object.freeze({
    nextDist: ownerValidation.interfaces?.nextDist,
    nextTsconfig: ownerValidation.interfaces?.nextTsconfig,
    serviceBaseUrl: plan.serviceBaseUrl,
    servicePort: plan.servicePort
  });
  if (
    typeof interfaces.nextDist !== "string"
    || typeof interfaces.nextTsconfig !== "string"
    || !Number.isSafeInteger(interfaces.servicePort)
    || interfaces.serviceBaseUrl !== `http://127.0.0.1:${interfaces.servicePort}`
  ) fail("NEXT_CONFIG_OWNER_INTERFACES_INVALID");
  const capture = {
    authorityFingerprint: "",
    command: stableValue(invocationReceipt),
    cwd: repo.canonicalPath,
    dependencyAttestationFingerprint: plan.dependencyAttestation?.attestationFingerprint,
    executable,
    expectedPhase: classification.expectedPhase,
    frameworkInjectedEnvironment,
    homeValueSha256: liveHomeValueSha256(liveHomeProof),
    interfaces,
    manifest,
    mode: classification.mode,
    next,
    planFingerprint: plan.planFingerprint,
    repoRoot: plan.repoRoot,
    requiresLiveHomeProtection: true,
    schemaVersion: SCHEMA_VERSION,
    scopeFingerprint: plan.executionScope.scopeFingerprint,
    sourceFingerprintsSha256: domainHash(
      "next-config-owner-source-fingerprints",
      plan.sourceFingerprints
    )
  };
  capture.authorityFingerprint = domainHash("next-owner-config-authority", {
    ...capture,
    authorityFingerprint: undefined
  });
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: capture.homeValueSha256
  });
  return validateOwnerCaptureSnapshot(capture);
}

export function assertOwnerNextConfigAuthorityUnchanged(capture, input = {}) {
  const validated = validateOwnerCaptureSnapshot(capture);
  const current = captureOwnerNextConfigAuthority(input);
  if (!sameJson(validated, current)) fail("NEXT_CONFIG_OWNER_AUTHORITY_DRIFT");
  return current;
}

export const NEXT_CONFIG_READ_ONLY_IMPORT_PHASE = READ_ONLY_PHASE;
