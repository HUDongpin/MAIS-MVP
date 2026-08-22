import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildActiveBrowserDependencyProof,
  validateActiveBrowserDependencyProof
} from "./active-browser-dependency-proof.mjs";
import {
  assertLiveRequiredBrowserExecutionScope
} from "./required-browser-execution-scope.mjs";
import {
  assertLiveHomeEnvironmentValue,
  assertLiveHomeProof,
  assertPathOutsideLiveHome,
  copyLiveHomeToChildEnvironment,
  liveHomeValueSha256,
  requiredBrowserEnvironmentValueSha256
} from "./live-home-protection.mjs";
import {
  assertCanonicalStarshipBrowserHost,
  validateCanonicalBrowserHostGeometry
} from "./browser-host-geometry.mjs";

export {
  assertCanonicalStarshipBrowserHost,
  validateCanonicalBrowserHostGeometry
} from "./browser-host-geometry.mjs";

const PLAN_SCHEMA_VERSION = 2;
const OWNER_PREFIX = "bug3-owner-";
const OWNER_MARKER_NAME = ".bug3-owner-root.json";
const CLEANUP_MARKER_NAME = ".bug3-cleanup-leaf.json";
const QUARANTINE_MARKER_NAME = ".bug3-cleanup-quarantine.json";
const NONCE_PATTERN = /^[a-f0-9]{64}$/;

function pathEntryExists(candidate) {
  return lstatSync(candidate, { throwIfNoEntry: false }) !== undefined;
}

function isStrictDescendant(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isInsideOrEqual(candidate, root) {
  return candidate === root || isStrictDescendant(candidate, root);
}

function canonicalExistingDirectory(label, candidate) {
  if (typeof candidate !== "string" || !path.isAbsolute(candidate)) {
    throw new Error(`${label} must be an absolute path.`);
  }
  const absolute = path.resolve(candidate);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry) throw new Error(`${label} must already exist: ${absolute}`);
  if (entry.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${absolute}`);
  if (!entry.isDirectory()) throw new Error(`${label} must be a directory: ${absolute}`);
  const canonical = realpathSync(absolute);
  if (canonical !== absolute) {
    throw new Error(`${label} must have no symlink chain and be canonical: ${absolute}`);
  }
  return canonical;
}

function canonicalExistingFile(label, candidate) {
  const absolute = path.resolve(candidate);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry) throw new Error(`${label} is missing: ${absolute}`);
  if (entry.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${absolute}`);
  if (!entry.isFile()) throw new Error(`${label} must be a regular file: ${absolute}`);
  const canonical = realpathSync(absolute);
  if (canonical !== absolute) throw new Error(`${label} must be canonical: ${absolute}`);
  return canonical;
}

export function classifyPlaywrightCliInvocation(argv = process.argv) {
  const normalized = Array.from(argv, (argument) => String(argument).replaceAll("\\", "/"));
  let cliIndex = -1;
  let cliKind = null;
  for (let index = 0; index < normalized.length; index += 1) {
    const argument = normalized[index];
    if (/(?:^|\/)node_modules\/@playwright\/test\/cli(?:\.js)?$/.test(argument)) {
      cliIndex = index;
      cliKind = "test";
      break;
    }
    if (/(?:^|\/)node_modules\/(?:playwright|playwright-core)\/cli(?:\.js)?$/.test(argument)) {
      cliIndex = index;
      cliKind = "core";
      break;
    }
    if (/(?:^|\/)node_modules\/\.bin\/playwright(?:\.cmd)?$/.test(argument)) {
      cliIndex = index;
      cliKind = "shim";
      break;
    }
    if (/(?:^|\/)playwright(?:\.cmd)?$/.test(argument)) {
      cliIndex = index;
      cliKind = "shim";
      break;
    }
  }
  if (cliIndex < 0) {
    return {
      cliArgs: [],
      cliKind: null,
      cliPath: null,
      isCli: false,
      noBrowserList: false,
      portableListCandidate: false
    };
  }
  const cliArgs = normalized.slice(cliIndex + 1);
  const portableListCandidate =
    cliKind === "test"
    && cliArgs.length === 2
    && cliArgs[0] === "test"
    && cliArgs[1] === "--list";
  return {
    cliArgs,
    cliKind,
    cliPath: normalized[cliIndex],
    isCli: true,
    noBrowserList: portableListCandidate,
    portableListCandidate
  };
}

function assertPairwiseDisjoint(label, candidates) {
  const unique = new Set(candidates);
  if (unique.size !== candidates.length) throw new Error(`${label} contains duplicate paths.`);
  for (let index = 0; index < candidates.length; index += 1) {
    for (let other = index + 1; other < candidates.length; other += 1) {
      const left = candidates[index];
      const right = candidates[other];
      if (isInsideOrEqual(left, right) || isInsideOrEqual(right, left)) {
        throw new Error(`${label} paths overlap: ${left} and ${right}`);
      }
    }
  }
}

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

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(stableObject(value))).digest("hex");
}

function planEnvironmentBinding(validated, ownedEnvironment) {
  if (
    validated?.requiresLiveHomeProtection !== true
    || typeof validated?.homeValueSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(validated.homeValueSha256)
  ) {
    throw new Error("Validated run plan is missing its live HOME hash protection binding.");
  }
  if (
    !ownedEnvironment
    || typeof ownedEnvironment !== "object"
    || Array.isArray(ownedEnvironment)
    || Object.prototype.hasOwnProperty.call(ownedEnvironment, "HOME")
  ) {
    throw new Error("Plan-owned environment must exclude the transient live HOME value.");
  }
  const entries = [
    {
      key: "HOME",
      semanticClass: "home-hash",
      valueSha256: validated.homeValueSha256
    },
    ...Object.entries(ownedEnvironment).map(([key, value]) => {
      if (typeof value !== "string") {
        throw new Error("Plan-owned environment values must be exact strings.");
      }
      return {
        key,
        semanticClass: "exact-plan-value",
        valueSha256: requiredBrowserEnvironmentValueSha256(key, value)
      };
    })
  ].sort((left, right) => left.key.localeCompare(right.key));
  return {
    inventoryKeys: entries.map(({ key }) => key),
    inventorySha256: sha256Json({
      domain: "mais-owner-environment-inventory-v1",
      entries,
      schemaVersion: 1
    })
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function derivePlan({
  cwd,
  dependencyAttestation,
  executionScope,
  homeValueSha256,
  liveHomeProof,
  nonce,
  osTempDir,
  ownerRoot: suppliedOwnerRoot,
  repoRoot,
  requireFresh,
  sourceFingerprints = {}
}) {
  assertLiveHomeProof(liveHomeProof, { expectedHomeValueSha256: homeValueSha256 });
  const boundHomeValueSha256 = liveHomeValueSha256(liveHomeProof);
  const canonicalRepoRoot = canonicalExistingDirectory("repo root", path.resolve(repoRoot));
  const starship = assertCanonicalStarshipBrowserHost({ repoRoot: canonicalRepoRoot });
  const fingerprintsBinding = stableObject(sourceFingerprints);
  const suppliedDependencyBinding = stableObject(validateActiveBrowserDependencyProof(
    dependencyAttestation,
    { repoRoot: canonicalRepoRoot }
  ));
  const dependencyBinding = stableObject(buildActiveBrowserDependencyProof(canonicalRepoRoot));
  if (!sameJson(dependencyBinding, suppliedDependencyBinding)) {
    throw new Error(
      "ValidatedRunPlan dependency proof differs from the independently recomputed physical tree."
    );
  }
  const executionScopeBinding = stableObject(assertLiveRequiredBrowserExecutionScope(
    executionScope,
    {
      dependencyAttestation: dependencyBinding,
      repoRoot: canonicalRepoRoot,
      sourceFingerprints: fingerprintsBinding
    }
  ));
  const tmpBase = canonicalExistingDirectory(
    "repo tmp base",
    path.join(canonicalRepoRoot, ".tmp")
  );
  if (path.dirname(tmpBase) !== canonicalRepoRoot || path.basename(tmpBase) !== ".tmp") {
    throw new Error(`repo tmp base must be the exact canonical <repoRoot>/.tmp path: ${tmpBase}`);
  }
  if (typeof nonce !== "string" || !NONCE_PATTERN.test(nonce)) {
    throw new Error("Bug 3 owner nonce must contain exactly 64 lowercase hexadecimal characters.");
  }

  const expectedOwnerRoot = path.join(tmpBase, `${OWNER_PREFIX}${nonce}`);
  const ownerRoot = path.resolve(suppliedOwnerRoot ?? expectedOwnerRoot);
  if (ownerRoot !== expectedOwnerRoot) {
    throw new Error(
      `owner root must be the exact runner-derived disposable path ${expectedOwnerRoot}; received ${ownerRoot}`
    );
  }
  assertPathOutsideLiveHome(liveHomeProof, ownerRoot);

  const validationContext = {
    cwd: path.resolve(cwd ?? canonicalRepoRoot),
    osTempDir: path.resolve(osTempDir ?? os.tmpdir())
  };
  const protectedRoots = Array.from(new Set([
    path.parse(canonicalRepoRoot).root,
    canonicalRepoRoot,
    validationContext.cwd,
    tmpBase,
    validationContext.osTempDir
  ]));
  for (const protectedRoot of protectedRoots) {
    if (ownerRoot === protectedRoot) {
      throw new Error(`owner root must not equal protected root: ${protectedRoot}`);
    }
  }
  if (!isStrictDescendant(ownerRoot, tmpBase)) {
    throw new Error(`owner root escaped the repo tmp base: ${ownerRoot}`);
  }
  if (requireFresh && pathEntryExists(ownerRoot)) {
    throw new Error(`owner root must be fresh and never reused; path already exists: ${ownerRoot}`);
  }

  const runId = `${OWNER_PREFIX}${nonce}`;
  const servicePort = 32_000 + (Number.parseInt(nonce.slice(0, 8), 16) % 10_000);
  const serviceBaseUrl = `http://127.0.0.1:${servicePort}`;
  const markerPath = path.join(ownerRoot, OWNER_MARKER_NAME);
  const terminalFallbackPath = path.join(ownerRoot, "bootstrap-terminal-summary.json");
  const ephemeralRoot = path.join(ownerRoot, "ephemeral");
  const evidenceRoot = path.join(ownerRoot, "evidence");
  const quarantineRoot = path.join(ephemeralRoot, ".cleanup-quarantine");
  const cleanupLeaves = {
    browser: path.join(ephemeralRoot, "browser"),
    build: path.join(ephemeralRoot, "build"),
    cache: path.join(ephemeralRoot, "cache"),
    config: path.join(ephemeralRoot, "config"),
    data: path.join(ephemeralRoot, "data"),
    generated: path.join(ephemeralRoot, "generated"),
    nodeCompileCache: path.join(ephemeralRoot, "node-compile-cache"),
    state: path.join(ephemeralRoot, "state"),
    temp: path.join(ephemeralRoot, "temp")
  };
  assertPairwiseDisjoint("cleanup leaves", Object.values(cleanupLeaves));
  for (const leaf of Object.values(cleanupLeaves)) {
    if (!isStrictDescendant(leaf, ephemeralRoot)) {
      throw new Error(`cleanup leaf must be a strict descendant of ephemeral root: ${leaf}`);
    }
  }
  if (isInsideOrEqual(ephemeralRoot, evidenceRoot) || isInsideOrEqual(evidenceRoot, ephemeralRoot)) {
    throw new Error("ephemeral and evidence partitions must be disjoint.");
  }

  const evidencePaths = {
    artifacts: path.join(evidenceRoot, "artifacts"),
    buildLog: path.join(evidenceRoot, "build.log"),
    finalReport: path.join(evidenceRoot, "final-report"),
    finalResults: path.join(evidenceRoot, "final-results.json"),
    pathAudit: path.join(evidenceRoot, "path-audit.json"),
    playwrightLog: path.join(evidenceRoot, "playwright.log"),
    preflightManifest: path.join(evidenceRoot, "preflight-manifest.json"),
    processAudit: path.join(evidenceRoot, "process-audit.json"),
    serviceLog: path.join(evidenceRoot, "service.log"),
    validatedSummary: path.join(evidenceRoot, "validated-summary.json")
  };
  for (const evidencePath of Object.values(evidencePaths)) {
    if (!isStrictDescendant(evidencePath, evidenceRoot)) {
      throw new Error(`evidence path escaped retained evidence partition: ${evidencePath}`);
    }
  }

  const paths = {
    e2eRoot: cleanupLeaves.browser,
    nextDist: path.join(cleanupLeaves.build, "next-dist"),
    nextTsconfig: path.join(cleanupLeaves.generated, "tsconfig.playwright-required.json"),
    db: path.join(cleanupLeaves.state, "hk-math.sqlite"),
    dbWal: path.join(cleanupLeaves.state, "hk-math.sqlite-wal"),
    dbShm: path.join(cleanupLeaves.state, "hk-math.sqlite-shm"),
    outputDir: evidencePaths.artifacts,
    reportDir: evidencePaths.finalReport,
    requiredGeneratedDir: cleanupLeaves.generated,
    requiredConfig: path.join(cleanupLeaves.generated, "required.config.ts"),
    requiredJsonReport: evidencePaths.finalResults,
    tmpDir: cleanupLeaves.temp,
    tmp: cleanupLeaves.temp,
    temp: cleanupLeaves.temp,
    cacheDir: cleanupLeaves.cache,
    npmCacheDir: path.join(cleanupLeaves.cache, "npm"),
    npmLogsDir: path.join(cleanupLeaves.cache, "npm-logs"),
    turboCacheDir: path.join(cleanupLeaves.cache, "turbo"),
    xdgStateDir: path.join(cleanupLeaves.state, "xdg"),
    buildLog: evidencePaths.buildLog,
    playwrightLog: evidencePaths.playwrightLog,
    serviceLog: evidencePaths.serviceLog,
    servicePid: path.join(cleanupLeaves.state, "service.pid")
  };
  const definitionWithoutEnvironmentBinding = {
    schemaVersion: PLAN_SCHEMA_VERSION,
    runId,
    nonce,
    servicePort,
    serviceBaseUrl,
    repoRoot: canonicalRepoRoot,
    tmpBase,
    ownerRoot,
    markerPath,
    terminalFallbackPath,
    cleanupMarkerName: CLEANUP_MARKER_NAME,
    quarantineMarkerName: QUARANTINE_MARKER_NAME,
    ephemeralRoot,
    evidenceRoot,
    quarantineRoot,
    cleanupLeaves,
    evidencePaths,
    homeValueSha256: boundHomeValueSha256,
    paths,
    protectedRoots,
    requiresLiveHomeProtection: true,
    validationContext,
    dependencyAttestation: dependencyBinding,
    executionScope: executionScopeBinding,
    sourceFingerprints: fingerprintsBinding,
    starship
  };
  const ownedEnvironment = planOwnedEnvironment(definitionWithoutEnvironmentBinding);
  const environmentBinding = planEnvironmentBinding(
    definitionWithoutEnvironmentBinding,
    ownedEnvironment
  );
  const definition = {
    ...definitionWithoutEnvironmentBinding,
    environmentBinding
  };
  const planFingerprint = sha256Json(definition);
  return deepFreeze({ ...definition, planFingerprint });
}

export function createValidatedRunPlan(options) {
  if (!options || typeof options !== "object") {
    throw new Error("ValidatedRunPlan options are required.");
  }
  const allowedKeys = new Set([
    "cwd",
    "dependencyAttestation",
    "executionScope",
    "liveHomeProof",
    "nonce",
    "osTempDir",
    "ownerRoot",
    "repoRoot",
    "sourceFingerprints"
  ]);
  if (Object.keys(options).some((key) => !allowedKeys.has(key))) {
    throw new Error("ValidatedRunPlan options contain an unsupported field.");
  }
  return derivePlan({ ...options, requireFresh: true });
}

function rehydratePlan(plan, liveHomeProof) {
  assertLiveHomeProof(liveHomeProof);
  if (!plan || typeof plan !== "object") throw new Error("ValidatedRunPlan is required.");
  const rebuilt = derivePlan({
    cwd: plan.validationContext?.cwd,
    dependencyAttestation: plan.dependencyAttestation,
    executionScope: plan.executionScope,
    homeValueSha256: plan.homeValueSha256,
    liveHomeProof,
    nonce: plan.nonce,
    osTempDir: plan.validationContext?.osTempDir,
    ownerRoot: plan.ownerRoot,
    repoRoot: plan.repoRoot,
    requireFresh: false,
    sourceFingerprints: plan.sourceFingerprints
  });
  if (!sameJson(rebuilt, plan)) {
    throw new Error("ValidatedRunPlan definition or protected-root context was altered.");
  }
  return rebuilt;
}

function assertOwnerLiveHome(plan, liveHomeProof) {
  if (
    !plan
    || plan.requiresLiveHomeProtection !== true
    || typeof plan.homeValueSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(plan.homeValueSha256)
  ) {
    throw new Error("Validated run plan is missing its live HOME protection binding.");
  }
  return assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: plan.homeValueSha256
  });
}

function guardOwnerEffectPath(plan, liveHomeProof, candidatePath) {
  assertOwnerLiveHome(plan, liveHomeProof);
  assertPathOutsideLiveHome(liveHomeProof, candidatePath);
  return path.resolve(candidatePath);
}

function ownerPathEntryExists(plan, liveHomeProof, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return pathEntryExists(guarded);
}

function ownerCanonicalExistingDirectory(plan, liveHomeProof, label, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return canonicalExistingDirectory(label, guarded);
}

function ownerCanonicalExistingFile(plan, liveHomeProof, label, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return canonicalExistingFile(label, guarded);
}

function ownerFilesystemIdentity(plan, liveHomeProof, label, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return filesystemIdentity(label, guarded);
}

function ownerCaptureCleanupSnapshot(plan, liveHomeProof, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return captureCleanupSnapshot(guarded);
}

function ownerAssertFilesystemIdentity(plan, liveHomeProof, label, candidatePath, expected) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return assertFilesystemIdentity(label, guarded, expected);
}

function ownerReadExactJson(plan, liveHomeProof, label, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return readExactJson(label, guarded);
}

function ownerMkdir(plan, liveHomeProof, candidatePath, options) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  mkdirSync(guarded, options);
  return guarded;
}

function ownerWriteFile(plan, liveHomeProof, candidatePath, value, options) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  writeFileSync(guarded, value, options);
  return guarded;
}

function ownerReaddir(plan, liveHomeProof, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return readdirSync(guarded);
}

function ownerRealpath(plan, liveHomeProof, candidatePath) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return realpathSync(guarded);
}

function ownerLstat(plan, liveHomeProof, candidatePath, options) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return lstatSync(guarded, options);
}

function ownerReadFile(plan, liveHomeProof, candidatePath, encoding) {
  const guarded = guardOwnerEffectPath(plan, liveHomeProof, candidatePath);
  return readFileSync(guarded, encoding);
}

function ownerRename(plan, liveHomeProof, sourcePath, targetPath) {
  const guardedSource = guardOwnerEffectPath(plan, liveHomeProof, sourcePath);
  const guardedTarget = guardOwnerEffectPath(plan, liveHomeProof, targetPath);
  assertOwnerLiveHome(plan, liveHomeProof);
  renameSync(guardedSource, guardedTarget);
}

function ownerMarkerPayload(plan) {
  return {
    kind: "mais-bug3-owner-root",
    nonce: plan.nonce,
    ownerRoot: plan.ownerRoot,
    planFingerprint: plan.planFingerprint,
    runId: plan.runId,
    schemaVersion: PLAN_SCHEMA_VERSION
  };
}

function cleanupMarkerPayload(plan, leaf) {
  return {
    kind: "mais-bug3-ephemeral-leaf",
    leaf: path.relative(plan.ephemeralRoot, leaf),
    nonce: plan.nonce,
    ownerRoot: plan.ownerRoot,
    planFingerprint: plan.planFingerprint,
    runId: plan.runId,
    schemaVersion: PLAN_SCHEMA_VERSION
  };
}

function quarantineMarkerPayload(plan) {
  return {
    kind: "mais-bug3-cleanup-quarantine",
    nonce: plan.nonce,
    ownerRoot: plan.ownerRoot,
    planFingerprint: plan.planFingerprint,
    quarantineRoot: plan.quarantineRoot,
    runId: plan.runId,
    schemaVersion: PLAN_SCHEMA_VERSION
  };
}

function filesystemIdentity(label, candidate) {
  const entry = lstatSync(candidate, { throwIfNoEntry: false });
  if (!entry) throw new Error(`${label} is missing: ${candidate}`);
  if (entry.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${candidate}`);
  return {
    dev: String(entry.dev),
    ino: String(entry.ino),
    mode: entry.mode,
    type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
  };
}

function captureCleanupSnapshot(candidate) {
  const absolute = path.resolve(candidate);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry) {
    return {
      identity: null,
      kind: "missing",
      path: absolute
    };
  }
  const kind = entry.isSymbolicLink()
    ? "symlink"
    : entry.isDirectory()
      ? "directory"
      : entry.isFile()
        ? "file"
        : "other";
  return {
    identity: {
      dev: String(entry.dev),
      ino: String(entry.ino),
      mode: entry.mode,
      type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
    },
    kind,
    path: absolute
  };
}

export function validateCleanupSnapshotTransition({
  expectedIdentity,
  expectedPath,
  observed,
  phase
}) {
  if (typeof phase !== "string" || phase.trim() === "") {
    throw new Error("cleanup snapshot transition phase must be non-empty");
  }
  if (!expectedIdentity || expectedIdentity.type !== "directory") {
    throw new Error(`cleanup snapshot ${phase} expected identity must be a directory`);
  }
  const absoluteExpectedPath = path.resolve(expectedPath);
  if (!observed || observed.path !== absoluteExpectedPath) {
    throw new Error(`cleanup snapshot ${phase} path changed`);
  }
  if (observed.kind !== "directory" || !observed.identity) {
    throw new Error(`cleanup snapshot ${phase} must remain the same directory, not ${observed?.kind ?? "missing"}`);
  }
  assertExactJson(`cleanup snapshot ${phase} identity`, observed.identity, expectedIdentity);
  return observed.identity;
}

function assertFilesystemIdentity(label, candidate, expected) {
  const actual = filesystemIdentity(label, candidate);
  assertExactJson(`${label} identity`, actual, expected);
  return actual;
}

function readExactJson(label, filePath) {
  canonicalExistingFile(label, filePath);
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}`, { cause: error });
  }
}

function assertExactJson(label, actual, expected) {
  if (JSON.stringify(stableObject(actual)) !== JSON.stringify(stableObject(expected))) {
    throw new Error(`${label} does not exactly match the validated run plan.`);
  }
}

function verifyOwnerMarker(plan, liveHomeProof) {
  const rebuilt = rehydratePlan(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(rebuilt, liveHomeProof, "owner root", rebuilt.ownerRoot);
  const marker = ownerReadExactJson(
    rebuilt,
    liveHomeProof,
    "owner root marker",
    rebuilt.markerPath
  );
  assertExactJson("owner root marker", marker, ownerMarkerPayload(rebuilt));
  return rebuilt;
}

export function bootstrapValidatedRunPlan(plan, liveHomeProof) {
  const validated = rehydratePlan(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "repo tmp base",
    validated.tmpBase
  );
  if (ownerPathEntryExists(validated, liveHomeProof, validated.ownerRoot)) {
    throw new Error(`owner root must be fresh and never reused: ${validated.ownerRoot}`);
  }
  ownerMkdir(validated, liveHomeProof, validated.ownerRoot, {
    mode: 0o700,
    recursive: false
  });
  const ownerRootIdentity = ownerFilesystemIdentity(
    validated,
    liveHomeProof,
    "owner root",
    validated.ownerRoot
  );
  if (ownerRealpath(validated, liveHomeProof, validated.ownerRoot) !== validated.ownerRoot) {
    throw new Error(`owner root became non-canonical during bootstrap: ${validated.ownerRoot}`);
  }
  ownerAssertFilesystemIdentity(
    validated,
    liveHomeProof,
    "owner root",
    validated.ownerRoot,
    ownerRootIdentity
  );
  ownerWriteFile(
    validated,
    liveHomeProof,
    validated.markerPath,
    `${JSON.stringify(ownerMarkerPayload(validated), null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  ownerAssertFilesystemIdentity(
    validated,
    liveHomeProof,
    "owner root",
    validated.ownerRoot,
    ownerRootIdentity
  );
  ownerCanonicalExistingFile(
    validated,
    liveHomeProof,
    "owner root marker",
    validated.markerPath
  );
  ownerMkdir(validated, liveHomeProof, validated.evidenceRoot, {
    mode: 0o700,
    recursive: false
  });
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "bootstrap evidence root",
    validated.evidenceRoot
  );
  ownerAssertFilesystemIdentity(
    validated,
    liveHomeProof,
    "owner root",
    validated.ownerRoot,
    ownerRootIdentity
  );
  return validated;
}

const evidenceFileKeys = new Set([
  "finalResults",
  "pathAudit",
  "preflightManifest",
  "processAudit",
  "validatedSummary"
]);

function validateEvidenceFileTarget(plan, liveHomeProof, targetPath) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "evidence root",
    validated.evidenceRoot
  );
  const target = guardOwnerEffectPath(validated, liveHomeProof, targetPath);
  const allowed = Object.entries(validated.evidencePaths)
    .filter(([key]) => evidenceFileKeys.has(key))
    .map(([, value]) => value);
  if (!allowed.includes(target)) {
    throw new Error(`evidence write target must be an exact validated evidence file: ${target}`);
  }
  if (ownerPathEntryExists(validated, liveHomeProof, target)) {
    ownerCanonicalExistingFile(
      validated,
      liveHomeProof,
      "existing evidence target",
      target
    );
  }
  return { plan: validated, target };
}

export function writeValidatedEvidenceJsonAtomic(
  plan,
  liveHomeProof,
  targetPath,
  value
) {
  const validated = validateEvidenceFileTarget(plan, liveHomeProof, targetPath);
  const evidenceRootIdentity = ownerFilesystemIdentity(
    validated.plan,
    liveHomeProof,
    "evidence root",
    validated.plan.evidenceRoot
  );
  const suffix = randomBytes(12).toString("hex");
  const temporary = `${validated.target}.tmp-${suffix}`;
  assertOwnerLiveHome(validated.plan, liveHomeProof);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  let temporaryIdentity = null;
  if (ownerPathEntryExists(validated.plan, liveHomeProof, temporary)) {
    throw new Error(`atomic evidence temp path already exists: ${temporary}`);
  }
  try {
    ownerWriteFile(validated.plan, liveHomeProof, temporary, serialized, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    temporaryIdentity = ownerFilesystemIdentity(
      validated.plan,
      liveHomeProof,
      "atomic evidence temp file",
      temporary
    );
    const temporaryEntry = ownerLstat(
      validated.plan,
      liveHomeProof,
      temporary
    );
    if (
      temporaryEntry.isSymbolicLink()
      || !temporaryEntry.isFile()
      || String(temporaryEntry.dev) !== temporaryIdentity.dev
      || String(temporaryEntry.ino) !== temporaryIdentity.ino
      || (temporaryEntry.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && temporaryEntry.uid !== process.getuid())
      || ownerReadFile(validated.plan, liveHomeProof, temporary, "utf8") !== serialized
    ) {
      throw new Error("Atomic evidence temp file identity, ownership, mode, or content changed after creation.");
    }
    ownerCanonicalExistingDirectory(
      validated.plan,
      liveHomeProof,
      "evidence root",
      validated.plan.evidenceRoot
    );
    ownerAssertFilesystemIdentity(
      validated.plan,
      liveHomeProof,
      "evidence root",
      validated.plan.evidenceRoot,
      evidenceRootIdentity
    );
    ownerCanonicalExistingFile(
      validated.plan,
      liveHomeProof,
      "atomic evidence temp file",
      temporary
    );
    const immediatelyBeforeRename = ownerLstat(
      validated.plan,
      liveHomeProof,
      temporary,
      { throwIfNoEntry: false }
    );
    if (
      !immediatelyBeforeRename?.isFile()
      || immediatelyBeforeRename.isSymbolicLink()
      || String(immediatelyBeforeRename.dev) !== temporaryIdentity.dev
      || String(immediatelyBeforeRename.ino) !== temporaryIdentity.ino
      || (immediatelyBeforeRename.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && immediatelyBeforeRename.uid !== process.getuid())
      || ownerReadFile(validated.plan, liveHomeProof, temporary, "utf8") !== serialized
    ) {
      throw new Error("Atomic evidence temp file changed immediately before rename.");
    }
    ownerRename(validated.plan, liveHomeProof, temporary, validated.target);
    ownerAssertFilesystemIdentity(
      validated.plan,
      liveHomeProof,
      "evidence root",
      validated.plan.evidenceRoot,
      evidenceRootIdentity
    );
    ownerCanonicalExistingFile(
      validated.plan,
      liveHomeProof,
      "evidence target",
      validated.target
    );
    const promotedEntry = ownerLstat(
      validated.plan,
      liveHomeProof,
      validated.target,
      { throwIfNoEntry: false }
    );
    if (
      !promotedEntry?.isFile()
      || promotedEntry.isSymbolicLink()
      || String(promotedEntry.dev) !== temporaryIdentity.dev
      || String(promotedEntry.ino) !== temporaryIdentity.ino
      || (promotedEntry.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && promotedEntry.uid !== process.getuid())
      || ownerReadFile(
        validated.plan,
        liveHomeProof,
        validated.target,
        "utf8"
      ) !== serialized
    ) {
      throw new Error("Atomic evidence target identity or content changed after rename.");
    }
  } catch (error) {
    try {
      const current = ownerLstat(
        validated.plan,
        liveHomeProof,
        temporary,
        { throwIfNoEntry: false }
      );
      if (temporaryIdentity && current) {
        if (
          current.isSymbolicLink()
          || !current.isFile()
          || String(current.dev) !== temporaryIdentity.dev
          || String(current.ino) !== temporaryIdentity.ino
          || (current.mode & 0o777) !== 0o600
          || (typeof process.getuid === "function" && current.uid !== process.getuid())
          || ownerReadFile(validated.plan, liveHomeProof, temporary, "utf8") !== serialized
        ) {
          throw new Error("Atomic evidence temp file changed and was retained in place.");
        }
        ownerCanonicalExistingDirectory(
          validated.plan,
          liveHomeProof,
          "evidence root",
          validated.plan.evidenceRoot
        );
        ownerAssertFilesystemIdentity(
          validated.plan,
          liveHomeProof,
          "evidence root",
          validated.plan.evidenceRoot,
          evidenceRootIdentity
        );
        const retained = path.join(
          validated.plan.evidenceRoot,
          `.${path.basename(temporary)}.retained-write-failure-${randomBytes(24).toString("hex")}`
        );
        if (ownerPathEntryExists(validated.plan, liveHomeProof, retained)) {
          throw new Error("Atomic evidence retained target unexpectedly exists.");
        }
        ownerRename(validated.plan, liveHomeProof, temporary, retained);
        ownerAssertFilesystemIdentity(
          validated.plan,
          liveHomeProof,
          "evidence root",
          validated.plan.evidenceRoot,
          evidenceRootIdentity
        );
        if (ownerPathEntryExists(validated.plan, liveHomeProof, temporary)) {
          throw new Error("Atomic evidence temp source was replaced during retention.");
        }
        const retainedEntry = ownerLstat(
          validated.plan,
          liveHomeProof,
          retained,
          { throwIfNoEntry: false }
        );
        if (
          !retainedEntry
          || retainedEntry.isSymbolicLink()
          || !retainedEntry.isFile()
          || String(retainedEntry.dev) !== temporaryIdentity.dev
          || String(retainedEntry.ino) !== temporaryIdentity.ino
          || (retainedEntry.mode & 0o777) !== 0o600
          || (typeof process.getuid === "function" && retainedEntry.uid !== process.getuid())
          || ownerReadFile(validated.plan, liveHomeProof, retained, "utf8") !== serialized
        ) {
          throw new Error("Atomic evidence retained temp identity or content changed after rename.");
        }
      }
    } catch (retentionError) {
      throw new AggregateError(
        [error, retentionError],
        "Atomic evidence write failed and exact temporary retention could not be proven."
      );
    }
    throw error;
  }
  return validated.target;
}

export function materializeValidatedRunPlan(
  plan,
  liveHomeProof,
  { fingerprints = {} } = {}
) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  const expectedFingerprints = validated.sourceFingerprints;
  const suppliedFingerprints = Object.keys(fingerprints).length > 0
    ? stableObject(fingerprints)
    : expectedFingerprints;
  assertExactJson("source fingerprints", suppliedFingerprints, expectedFingerprints);
  guardOwnerEffectPath(validated, liveHomeProof, validated.repoRoot);
  const independentlyValidatedScope = assertLiveRequiredBrowserExecutionScope(
    validated.executionScope,
    {
      dependencyAttestation: validated.dependencyAttestation,
      repoRoot: validated.repoRoot,
      sourceFingerprints: suppliedFingerprints
    }
  );
  assertExactJson(
    "required-browser execution scope",
    independentlyValidatedScope,
    validated.executionScope
  );
  const ownerEntries = new Set([
    path.basename(validated.markerPath),
    path.basename(validated.evidenceRoot)
  ]);
  const currentEntries = ownerReaddir(validated, liveHomeProof, validated.ownerRoot);
  if (currentEntries.some((entry) => !ownerEntries.has(entry))) {
    throw new Error(`owner root is not pristine and cannot be materialized twice: ${validated.ownerRoot}`);
  }

  ownerMkdir(validated, liveHomeProof, validated.ephemeralRoot, {
    mode: 0o700,
    recursive: false
  });
  ownerMkdir(validated, liveHomeProof, validated.quarantineRoot, {
    mode: 0o700,
    recursive: false
  });
  const quarantineMarkerPath = path.join(
    validated.quarantineRoot,
    validated.quarantineMarkerName
  );
  ownerWriteFile(
    validated,
    liveHomeProof,
    quarantineMarkerPath,
    `${JSON.stringify(quarantineMarkerPayload(validated), null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  for (const leaf of Object.values(validated.cleanupLeaves)) {
    ownerMkdir(validated, liveHomeProof, leaf, { mode: 0o700, recursive: false });
    const cleanupMarkerPath = path.join(leaf, validated.cleanupMarkerName);
    ownerWriteFile(
      validated,
      liveHomeProof,
      cleanupMarkerPath,
      `${JSON.stringify(cleanupMarkerPayload(validated, leaf), null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 }
    );
  }
  writeValidatedEvidenceJsonAtomic(
    validated,
    liveHomeProof,
    validated.evidencePaths.preflightManifest,
    preflightManifestPayload(validated)
  );
  return validated;
}

function preflightManifestPayload(plan) {
  return {
    cleanupLeaves: plan.cleanupLeaves,
    cleanupMarkerName: plan.cleanupMarkerName,
    evidencePaths: plan.evidencePaths,
    environmentBinding: plan.environmentBinding,
    fingerprints: plan.sourceFingerprints,
    dependencyAttestation: plan.dependencyAttestation,
    executionScope: plan.executionScope,
    executionScopeFingerprint: plan.executionScope.scopeFingerprint,
    homeValueSha256: plan.homeValueSha256,
    markerPath: plan.markerPath,
    nonce: plan.nonce,
    paths: {
      ...plan.paths,
      ephemeralRoot: plan.ephemeralRoot,
      evidenceRoot: plan.evidenceRoot,
      ownerRoot: plan.ownerRoot
    },
    planFingerprint: plan.planFingerprint,
    protectedRoots: plan.protectedRoots,
    repoRoot: plan.repoRoot,
    requiresLiveHomeProtection: plan.requiresLiveHomeProtection,
    runId: plan.runId,
    schemaVersion: PLAN_SCHEMA_VERSION,
    serviceBaseUrl: plan.serviceBaseUrl,
    servicePort: plan.servicePort,
    sourceFingerprints: plan.sourceFingerprints,
    starship: plan.starship,
    terminalFallbackPath: plan.terminalFallbackPath,
    tmpBase: plan.tmpBase,
    quarantineMarkerName: plan.quarantineMarkerName,
    quarantineRoot: plan.quarantineRoot,
    validationContext: plan.validationContext
  };
}

export function validateMaterializedRunPlan(plan, liveHomeProof) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "ephemeral root",
    validated.ephemeralRoot
  );
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "evidence root",
    validated.evidenceRoot
  );
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "cleanup quarantine root",
    validated.quarantineRoot
  );
  assertExactJson(
    "cleanup quarantine marker",
    ownerReadExactJson(
      validated,
      liveHomeProof,
      "cleanup quarantine marker",
      path.join(validated.quarantineRoot, validated.quarantineMarkerName)
    ),
    quarantineMarkerPayload(validated)
  );
  for (const leaf of Object.values(validated.cleanupLeaves)) {
    ownerCanonicalExistingDirectory(validated, liveHomeProof, "cleanup leaf", leaf);
    const marker = ownerReadExactJson(
      validated,
      liveHomeProof,
      "cleanup leaf marker",
      path.join(leaf, validated.cleanupMarkerName)
    );
    assertExactJson("cleanup leaf marker", marker, cleanupMarkerPayload(validated, leaf));
  }
  for (const [key, writablePath] of Object.entries({
    ...validated.paths,
    ...validated.evidencePaths,
    terminalFallbackPath: validated.terminalFallbackPath
  })) {
    validateOwnedWritablePath(validated, liveHomeProof, key, writablePath, {
      cwd: validated.repoRoot
    });
  }
  return validated;
}

function verifyCleanupLeaf(plan, liveHomeProof, leaf) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "ephemeral root",
    validated.ephemeralRoot
  );
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "evidence root",
    validated.evidenceRoot
  );
  const target = guardOwnerEffectPath(validated, liveHomeProof, leaf);
  const registered = Object.values(validated.cleanupLeaves);
  if (!registered.includes(target)) {
    throw new Error(`cleanup target must be an exact registered ephemeral leaf: ${target}`);
  }
  if (!isStrictDescendant(target, validated.ephemeralRoot)) {
    throw new Error(`cleanup target must be a strict descendant of ephemeral root: ${target}`);
  }
  for (const protectedRoot of [
    ...validated.protectedRoots,
    validated.ownerRoot,
    validated.ephemeralRoot,
    validated.evidenceRoot
  ]) {
    if (target === protectedRoot || isInsideOrEqual(protectedRoot, target)) {
      throw new Error(`cleanup target overlaps a protected or retained root: ${target}`);
    }
  }
  ownerCanonicalExistingDirectory(validated, liveHomeProof, "cleanup leaf", target);
  const markerPath = path.join(target, validated.cleanupMarkerName);
  const marker = ownerReadExactJson(
    validated,
    liveHomeProof,
    "cleanup leaf marker",
    markerPath
  );
  assertExactJson("cleanup leaf marker", marker, cleanupMarkerPayload(validated, target));
  return target;
}

function verifyQuarantineRoot(plan, liveHomeProof) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "ephemeral root",
    validated.ephemeralRoot
  );
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "cleanup quarantine root",
    validated.quarantineRoot
  );
  const marker = ownerReadExactJson(
    validated,
    liveHomeProof,
    "cleanup quarantine marker",
    path.join(validated.quarantineRoot, validated.quarantineMarkerName)
  );
  assertExactJson("cleanup quarantine marker", marker, quarantineMarkerPayload(validated));
  return validated;
}

function verifyQuarantinedLeaf(
  plan,
  liveHomeProof,
  quarantinePath,
  originalTarget,
  expectedIdentity
) {
  const validated = verifyQuarantineRoot(plan, liveHomeProof);
  const absolute = guardOwnerEffectPath(validated, liveHomeProof, quarantinePath);
  const guardedOriginalTarget = guardOwnerEffectPath(
    validated,
    liveHomeProof,
    originalTarget
  );
  if (!isStrictDescendant(absolute, validated.quarantineRoot)) {
    throw new Error(`quarantine target escaped its validated root: ${absolute}`);
  }
  validateCleanupSnapshotTransition({
    expectedIdentity,
    expectedPath: absolute,
    observed: ownerCaptureCleanupSnapshot(validated, liveHomeProof, absolute),
    phase: "quarantined-leaf"
  });
  ownerCanonicalExistingDirectory(
    validated,
    liveHomeProof,
    "quarantined cleanup leaf",
    absolute
  );
  const marker = ownerReadExactJson(
    validated,
    liveHomeProof,
    "quarantined cleanup leaf marker",
    path.join(absolute, validated.cleanupMarkerName)
  );
  assertExactJson(
    "quarantined cleanup leaf marker",
    marker,
    cleanupMarkerPayload(validated, guardedOriginalTarget)
  );
  return absolute;
}

export function cleanupValidatedEphemeralLeaves(
  plan,
  liveHomeProof,
  requestedLeaves,
  { afterQuarantineRename } = {}
) {
  const validated = verifyOwnerMarker(plan, liveHomeProof);
  if (!Array.isArray(requestedLeaves)) throw new Error("cleanup targets must be an array.");
  if (new Set(requestedLeaves).size !== requestedLeaves.length) {
    throw new Error("cleanup targets contain duplicates.");
  }
  const requestedTargets = requestedLeaves.map((leaf) =>
    guardOwnerEffectPath(validated, liveHomeProof, leaf)
  );
  assertPairwiseDisjoint("cleanup targets", requestedTargets);
  verifyQuarantineRoot(validated, liveHomeProof);
  const validatedTargets = requestedTargets.map((leaf) =>
    verifyCleanupLeaf(validated, liveHomeProof, leaf)
  );
  const capturedTargets = validatedTargets.map((target) => ({
    identity: ownerFilesystemIdentity(
      validated,
      liveHomeProof,
      "cleanup leaf",
      target
    ),
    target
  }));

  for (const { identity, target } of capturedTargets) {
    // Atomically detach the validated inode from its public leaf name. Live
    // cleanup intentionally stops after verified quarantine so destructive
    // recursive deletion cannot cross an identity or path-swap boundary.
    verifyCleanupLeaf(validated, liveHomeProof, target);
    validateCleanupSnapshotTransition({
      expectedIdentity: identity,
      expectedPath: target,
      observed: ownerCaptureCleanupSnapshot(validated, liveHomeProof, target),
      phase: "pre-quarantine"
    });
    const quarantineRootIdentity = ownerFilesystemIdentity(
      validated,
      liveHomeProof,
      "cleanup quarantine root",
      validated.quarantineRoot
    );
    const quarantinePath = path.join(
      validated.quarantineRoot,
      `${path.basename(target)}-${randomBytes(24).toString("hex")}`
    );
    if (ownerPathEntryExists(validated, liveHomeProof, quarantinePath)) {
      throw new Error(`quarantine target unexpectedly exists: ${quarantinePath}`);
    }
    assertOwnerLiveHome(validated, liveHomeProof);
    ownerRename(validated, liveHomeProof, target, quarantinePath);
    ownerAssertFilesystemIdentity(
      validated,
      liveHomeProof,
      "cleanup quarantine root",
      validated.quarantineRoot,
      quarantineRootIdentity
    );
    if (ownerPathEntryExists(validated, liveHomeProof, target)) {
      throw new Error(`cleanup leaf was replaced during quarantine: ${target}`);
    }
    afterQuarantineRename?.({ quarantinePath, target });
    assertOwnerLiveHome(validated, liveHomeProof);
    verifyQuarantinedLeaf(
      validated,
      liveHomeProof,
      quarantinePath,
      target,
      identity
    );
    verifyQuarantinedLeaf(
      validated,
      liveHomeProof,
      quarantinePath,
      target,
      identity
    );
  }
  return validatedTargets;
}

function safeRepoRelativeInterface(plan, label, absolutePath) {
  const relative = path.relative(plan.repoRoot, absolutePath).replaceAll("\\", "/");
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${label} cannot be expressed as a safe repo-relative interface.`);
  }
  if (path.resolve(plan.repoRoot, relative) !== absolutePath) {
    throw new Error(`${label} interface does not resolve to its validated target.`);
  }
  return relative;
}

function planOwnedEnvironment(validated) {
  const nextDistInterface = safeRepoRelativeInterface(
    validated,
    "NEXT_DIST_DIR",
    validated.paths.nextDist
  );
  const nextTsconfigInterface = safeRepoRelativeInterface(
    validated,
    "NEXT_TSCONFIG_PATH",
    validated.paths.nextTsconfig
  );
  const environment = {
    AI_TUTOR_MAX_REQUESTS_PER_MINUTE: "2",
    AI_TUTOR_PROVIDER_PROFILE: "offline-fixture",
    AUTH_SESSION_SECRET: "e2e-session-secret",
    DEEPSEEK_API_KEY: "",
    DEEPSEEK_API_URL: "",
    DEEPSEEK_MODEL: "",
    DO_NOT_TRACK: "1",
    HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "400",
    HK_MATH_ENABLE_DEMO_USER: "true",
    HK_MATH_EXPOSE_LOCAL_RESET_LINKS: "true",
    MAIS_BROWSER_OWNER_TOKEN: validated.nonce,
    PLAYWRIGHT_RUN_ID: validated.runId,
    PLAYWRIGHT_PORT: String(validated.servicePort),
    PLAYWRIGHT_BASE_URL: validated.serviceBaseUrl,
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_RUN_PLAN_MANIFEST: validated.evidencePaths.preflightManifest,
    PLAYWRIGHT_OWNER_RUN_ROOT: validated.ownerRoot,
    PLAYWRIGHT_E2E_ROOT: validated.paths.e2eRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: validated.paths.nextDist,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: validated.paths.nextTsconfig,
    HK_MATH_DB_PATH: validated.paths.db,
    PLAYWRIGHT_OUTPUT_DIR: validated.paths.outputDir,
    PLAYWRIGHT_REPORT_DIR: validated.paths.reportDir,
    PLAYWRIGHT_REQUIRED_GENERATED_DIR: validated.paths.requiredGeneratedDir,
    PLAYWRIGHT_REQUIRED_CONFIG_PATH: validated.paths.requiredConfig,
    PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH: validated.paths.requiredJsonReport,
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
    TMPDIR: validated.paths.tmpDir,
    TMP: validated.paths.tmp,
    TEMP: validated.paths.temp,
    XDG_CACHE_HOME: validated.paths.cacheDir,
    XDG_CONFIG_HOME: validated.cleanupLeaves.config,
    XDG_DATA_HOME: validated.cleanupLeaves.data,
    XDG_STATE_HOME: validated.paths.xdgStateDir,
    NODE_COMPILE_CACHE: validated.cleanupLeaves.nodeCompileCache,
    NEXT_DIST_DIR: nextDistInterface,
    NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_TSCONFIG_PATH: nextTsconfigInterface,
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_CACHE: validated.paths.npmCacheDir,
    NPM_CONFIG_FUND: "false",
    NPM_CONFIG_LOGS_DIR: validated.paths.npmLogsDir,
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    PLAYWRIGHT_SERVICE_LOG_PATH: validated.paths.serviceLog,
    PLAYWRIGHT_SERVICE_PID_PATH: validated.paths.servicePid,
    QWEN_API_KEY: "",
    QWEN_API_URL: "",
    QWEN_IMAGE_API_URL: "",
    QWEN_IMAGE_MODEL: "",
    QWEN_MODEL: "",
    QWEN_REALTIME_API_URL: "",
    QWEN_REALTIME_MODEL: "",
    QWEN_TEXT_MODEL: "qwen3.7-plus",
    TURBO_CACHE_DIR: validated.paths.turboCacheDir,
    TURBO_REMOTE_CACHE_ENABLED: "0",
    TURBO_TELEMETRY_DISABLED: "1"
  };
  return environment;
}

export function buildValidatedRunEnvironment(plan, liveHomeProof, baseEnvironment = {}) {
  const validated = validateMaterializedRunPlan(plan, liveHomeProof);
  assertOwnerLiveHome(validated, liveHomeProof);
  if (!baseEnvironment || typeof baseEnvironment !== "object" || Array.isArray(baseEnvironment)) {
    throw new Error("Validated child environment requires an exact live environment source.");
  }
  assertLiveHomeEnvironmentValue(liveHomeProof, baseEnvironment.HOME);
  const ownedEnvironment = planOwnedEnvironment(validated);
  const expectedBinding = planEnvironmentBinding(validated, ownedEnvironment);
  if (!sameJson(expectedBinding, validated.environmentBinding)) {
    throw new Error("Plan-owned environment inventory does not match its immutable binding.");
  }
  assertOwnerLiveHome(validated, liveHomeProof);
  const withLiveHome = copyLiveHomeToChildEnvironment(liveHomeProof, ownedEnvironment);
  const exactEnvironment = Object.fromEntries(
    validated.environmentBinding.inventoryKeys.map((key) => {
      if (typeof withLiveHome[key] !== "string") {
        throw new Error("Validated child environment inventory is incomplete.");
      }
      return [key, withLiveHome[key]];
    })
  );
  if (!sameJson(Object.keys(exactEnvironment), validated.environmentBinding.inventoryKeys)) {
    throw new Error("Validated child environment key order differs from its immutable inventory.");
  }
  assertOwnerLiveHome(validated, liveHomeProof);
  return exactEnvironment;
}

export function loadValidatedRunPlanFromManifest(
  manifestPath,
  liveHomeProof,
  { cwd, osTempDir, repoRoot } = {}
) {
  assertLiveHomeProof(liveHomeProof);
  assertPathOutsideLiveHome(liveHomeProof, manifestPath);
  const manifest = readExactJson("preflight manifest", manifestPath);
  if (!manifest || typeof manifest !== "object") throw new Error("preflight manifest is malformed.");
  if (
    manifest.requiresLiveHomeProtection !== true
    || typeof manifest.homeValueSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(manifest.homeValueSha256)
  ) {
    throw new Error("preflight manifest is missing its live HOME protection binding.");
  }
  assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: manifest.homeValueSha256
  });
  const declaredRepoRoot = repoRoot ?? manifest.repoRoot;
  if (typeof declaredRepoRoot !== "string") {
    throw new Error("preflight manifest is missing repoRoot.");
  }
  assertPathOutsideLiveHome(liveHomeProof, declaredRepoRoot);
  if (cwd) assertPathOutsideLiveHome(liveHomeProof, cwd);
  if (cwd && realpathSync(path.resolve(cwd)) !== realpathSync(path.resolve(declaredRepoRoot))) {
    throw new Error("preflight manifest repoRoot does not match the current repository.");
  }
  const plan = derivePlan({
    cwd: manifest.validationContext?.cwd ?? cwd ?? declaredRepoRoot,
    dependencyAttestation: manifest.dependencyAttestation,
    executionScope: manifest.executionScope,
    homeValueSha256: manifest.homeValueSha256,
    liveHomeProof,
    nonce: manifest.nonce,
    osTempDir: osTempDir ?? manifest.validationContext?.osTempDir,
    ownerRoot: manifest.paths?.ownerRoot,
    repoRoot: declaredRepoRoot,
    requireFresh: false,
    sourceFingerprints: manifest.sourceFingerprints
  });
  if (path.resolve(manifestPath) !== plan.evidencePaths.preflightManifest) {
    throw new Error("preflight manifest path is not the exact path declared by its run plan.");
  }
  assertExactJson("preflight manifest", manifest, preflightManifestPayload(plan));
  verifyOwnerMarker(plan, liveHomeProof);
  validateMaterializedRunPlan(plan, liveHomeProof);
  return plan;
}

const forbiddenBrowserDependencyOverrideKeys = Object.freeze([
  "BROWSER_CACHE_DIR",
  "CHROME_PATH",
  "CHROMIUM_PATH",
  "NODE_PATH",
  "PLAYWRIGHT_BROWSERS_PATH",
  "PUPPETEER_CACHE_DIR",
  "npm_config_playwright_browsers_path"
]);

export function validatePlanOwnedEnvironmentInventory(plan, environment, liveHomeProof) {
  const validated = rehydratePlan(plan, liveHomeProof);
  assertOwnerLiveHome(validated, liveHomeProof);
  if (!environment || typeof environment !== "object") {
    throw new Error("Exact plan-owned environment inventory is required.");
  }
  for (const key of forbiddenBrowserDependencyOverrideKeys) {
    if (Object.prototype.hasOwnProperty.call(environment, key)) {
      throw new Error(`${key} is a prohibited browser/dependency cache or resolution override.`);
    }
  }
  for (const key of Object.keys(environment)) {
    if (
      !validated.environmentBinding.inventoryKeys.includes(key) &&
      /^(?:BROWSER.*CACHE|PLAYWRIGHT_.*BROWSERS|PUPPETEER_|CHROME_PATH|CHROMIUM_PATH)/i.test(key)
    ) {
      throw new Error(`${key} is an unexpected browser cache or executable override.`);
    }
  }
  const expected = planOwnedEnvironment(validated);
  const expectedBinding = planEnvironmentBinding(validated, expected);
  if (!sameJson(expectedBinding, validated.environmentBinding)) {
    throw new Error("Validated plan-owned environment binding is internally inconsistent.");
  }
  const supplied = {};
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!Object.prototype.hasOwnProperty.call(environment, key)) {
      throw new Error(`${key} is missing from the exact plan-owned environment inventory.`);
    }
    if (typeof environment[key] !== "string" || environment[key] !== expectedValue) {
      throw new Error(`${key} does not exactly match the validated run plan.`);
    }
    supplied[key] = environment[key];
  }
  if (
    !sameJson(
      planEnvironmentBinding(validated, supplied),
      validated.environmentBinding
    )
  ) {
    throw new Error("Supplied plan-owned environment inventory hash is invalid.");
  }
  assertLiveHomeEnvironmentValue(liveHomeProof, environment.HOME);
  assertOwnerLiveHome(validated, liveHomeProof);
  return expected;
}

export function validatePlaywrightOwnerEnvironment(
  environment,
  liveHomeProof,
  { cwd = process.cwd(), osTempDir } = {}
) {
  const manifestPath = environment.PLAYWRIGHT_RUN_PLAN_MANIFEST?.trim();
  if (!manifestPath) return null;
  assertLiveHomeProof(liveHomeProof);
  assertPathOutsideLiveHome(liveHomeProof, manifestPath);
  const plan = loadValidatedRunPlanFromManifest(manifestPath, liveHomeProof, {
    cwd,
    osTempDir,
    repoRoot: cwd
  });
  const normalized = validatePlanOwnedEnvironmentInventory(plan, environment, liveHomeProof);
  guardOwnerEffectPath(plan, liveHomeProof, plan.repoRoot);
  const currentDependencyProof = buildActiveBrowserDependencyProof(plan.repoRoot, {
    environment
  });
  if (!sameJson(currentDependencyProof, plan.dependencyAttestation)) {
    throw new Error("Current physical dependency proof differs from the owner manifest.");
  }
  assertOwnerLiveHome(plan, liveHomeProof);
  return {
    ownerRoot: plan.ownerRoot,
    environment: normalized,
    interfaces: {
      nextDist: safeRepoRelativeInterface(plan, "PLAYWRIGHT_NEXT_DIST_DIR", plan.paths.nextDist),
      nextTsconfig: safeRepoRelativeInterface(
        plan,
        "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
        plan.paths.nextTsconfig
      )
    },
    paths: plan.paths,
    plan
  };
}

export function applyValidatedPlaywrightOwnerEnvironment(
  validated,
  liveHomeProof,
  targetEnvironment = process.env
) {
  if (!validated) return targetEnvironment;
  assertOwnerLiveHome(validated.plan, liveHomeProof);
  validatePlanOwnedEnvironmentInventory(validated.plan, targetEnvironment, liveHomeProof);
  assertOwnerLiveHome(validated.plan, liveHomeProof);
  return targetEnvironment;
}

export function validateOwnedWritablePath(
  plan,
  liveHomeProof,
  label,
  candidatePath,
  { cwd = plan?.repoRoot } = {}
) {
  const validated = rehydratePlan(plan, liveHomeProof);
  const ownerRoot = guardOwnerEffectPath(
    validated,
    liveHomeProof,
    validated.ownerRoot
  );
  assertOwnerLiveHome(validated, liveHomeProof);
  const absolutePath = path.resolve(cwd, candidatePath);
  guardOwnerEffectPath(validated, liveHomeProof, absolutePath);
  if (!isInsideOrEqual(absolutePath, ownerRoot)) {
    throw new Error(`${label} resolved outside owner root: ${absolutePath}`);
  }
  let ancestor = absolutePath;
  while (!ownerPathEntryExists(validated, liveHomeProof, ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error(`${label} has no existing ancestor.`);
    ancestor = parent;
  }
  const ancestorEntry = ownerLstat(validated, liveHomeProof, ancestor);
  if (ancestorEntry.isSymbolicLink()) {
    throw new Error(`${label} has a symlink or dangling-symlink ancestor: ${ancestor}`);
  }
  let canonicalAncestor;
  try {
    canonicalAncestor = ownerRealpath(validated, liveHomeProof, ancestor);
  } catch (error) {
    throw new Error(`${label} cannot canonicalize an existing or dangling-symlink path: ${ancestor}`, {
      cause: error
    });
  }
  const canonicalPath = path.resolve(canonicalAncestor, path.relative(ancestor, absolutePath));
  guardOwnerEffectPath(validated, liveHomeProof, canonicalPath);
  if (!isInsideOrEqual(canonicalPath, ownerRoot)) {
    throw new Error(`${label} escaped owner root through a symlink: ${canonicalPath}`);
  }
  if (canonicalPath !== absolutePath) {
    throw new Error(`${label} must have no symlink chain and be canonical: ${absolutePath}`);
  }
  return { absolutePath, canonicalPath, nearestExistingAncestor: ancestor };
}
