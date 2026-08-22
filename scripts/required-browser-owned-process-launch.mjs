import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  closeSync,
  constants as FS_CONSTANTS,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeSync
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  assertLiveHomeProof,
  assertNoLiveHomeRetention,
  liveHomeValueSha256
} from "./live-home-protection.mjs";
import {
  completeRequiredBrowserProvisionBootstrapAuthority,
  promoteInitialRequiredBrowserProvisionBootstrapAuthority,
  readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher,
  readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher
} from "./required-browser-provision-attempt-authority.mjs";
import {
  canonicalizeClosedJsonArtifact,
  canonicalizeClosedJson,
  hashCanonicalProof,
  hashEnvironmentText,
  verifyCanonicalJsonArtifactBytes
} from "./required-browser-proof-primitives.mjs";
import {
  readTestFixtureCapabilityView,
  releaseRequiredBrowserSyntheticLifecycleTestFixture,
  reserveRequiredBrowserSyntheticLifecycleTestFixture
} from "./test-fixture-capability.mjs";

const BOOTSTRAP_AUTHORITY_BINDING_DOMAIN =
  "required-browser-provision-bootstrap-authority-binding-v1";
const BOOTSTRAP_REGISTRATION_CONTEXT_DOMAIN =
  "required-browser-provision-bootstrap-registration-context-v1";
const BOOTSTRAP_SCOPE_DOMAIN =
  "required-browser-provision-bootstrap-scope-v1";
const BOOTSTRAP_COMMAND_CATALOG_DOMAIN =
  "required-browser-provision-bootstrap-command-catalog-v1";
const OWNED_PROCESS_CATALOG_DOMAIN =
  "required-browser-owned-process-catalog-v1";
const OWNED_PROCESS_COMMAND_DESCRIPTOR_DOMAIN =
  "required-browser-owned-process-command-descriptor-v1";
const REPOSITORY_BINDING_DOMAIN =
  "required-browser-provision-repository-binding-v1";
const REPOSITORY_PATH_DOMAIN =
  "required-browser-provision-repository-path-v1";
const FILESYSTEM_ENTRY_IDENTITY_DOMAIN =
  "required-browser-provision-filesystem-entry-identity-v1";
const LINKED_WORKTREE_GIT_BINDING_DOMAIN =
  "required-browser-provision-linked-worktree-git-binding-v1";
const SOURCE_SEED_DOMAIN = "required-browser-provision-source-seed-v1";
const BOOTSTRAP_ENVIRONMENT_INVENTORY_DOMAIN =
  "required-browser-provision-bootstrap-environment-inventory-v2";
const BOOTSTRAP_ENVIRONMENT_INVENTORY_SET_DOMAIN =
  "required-browser-provision-bootstrap-environment-inventory-set-v2";
const BOOTSTRAP_WHICH_NPM_RESULT_DOMAIN =
  "required-browser-provision-bootstrap-which-npm-result-v1";
const BOOTSTRAP_PROCESS_TABLE_RESULT_DOMAIN =
  "required-browser-provision-bootstrap-process-table-preflight-result-v1";
const BOOTSTRAP_OWNER_TOKEN_TABLE_RESULT_DOMAIN =
  "required-browser-provision-bootstrap-owner-token-table-preflight-result-v1";
const BOOTSTRAP_GIT_STATUS_RESULT_DOMAIN =
  "required-browser-provision-bootstrap-git-status-result-v1";
const BOOTSTRAP_GIT_HEAD_RESULT_DOMAIN =
  "required-browser-provision-bootstrap-git-head-result-v1";
const BOOTSTRAP_WHICH_NPM_RECEIPT_DOMAIN =
  "required-browser-provision-bootstrap-which-npm-receipt-v1";
const BOOTSTRAP_PROCESS_TABLE_RECEIPT_DOMAIN =
  "required-browser-provision-bootstrap-process-table-preflight-receipt-v1";
const BOOTSTRAP_OWNER_TOKEN_TABLE_RECEIPT_DOMAIN =
  "required-browser-provision-bootstrap-owner-token-table-preflight-receipt-v1";
const BOOTSTRAP_GIT_STATUS_RECEIPT_DOMAIN =
  "required-browser-provision-bootstrap-git-status-receipt-v1";
const BOOTSTRAP_GIT_HEAD_RECEIPT_DOMAIN =
  "required-browser-provision-bootstrap-git-head-receipt-v1";
const BOOTSTRAP_NPM_CLI_PATH_DOMAIN =
  "required-browser-provision-bootstrap-npm-cli-path-v1";
const BOOTSTRAP_NPM_CLI_IDENTITY_DOMAIN =
  "required-browser-provision-bootstrap-npm-cli-identity-v1";
const BOOTSTRAP_SOURCE_STATE_DOMAIN =
  "required-browser-provision-bootstrap-source-state-v1";
const BOOTSTRAP_FIVE_PASS_AGGREGATE_DOMAIN =
  "required-browser-provision-bootstrap-five-pass-aggregate-v1";
const PROVISION_ROOT_BINDING_DOMAIN =
  "required-browser-provision-root-binding-v1";
const ATTEMPT_COMMAND_SCOPE_DOMAIN =
  "required-browser-provision-attempt-command-scope-v1";
const ATTEMPT_DESCRIPTOR_SET_DOMAIN =
  "required-browser-provision-attempt-descriptor-set-v1";
const ATTEMPT_ENVIRONMENT_INVENTORY_DOMAIN =
  "required-browser-provision-attempt-environment-inventory-v2";
const ATTEMPT_ENVIRONMENT_INVENTORY_SET_DOMAIN =
  "required-browser-provision-attempt-environment-inventory-set-v2";
const DEPENDENCY_PATH_POLICY_DOMAIN =
  "required-browser-provision-dependency-path-policy-v1";
const EVIDENCE_POLICY_DOMAIN =
  "required-browser-provision-evidence-policy-v1";
const ATTEMPT_OWNER_TOKEN_DOMAIN =
  "required-browser-provision-attempt-owner-token-v1";
const ATTEMPT_AUTHORITY_BINDING_DOMAIN =
  "required-browser-provision-attempt-authority-binding-v1";
const ACTIVATION_LOCK_DOMAIN = "dependency-activation-lock-v2";
const ACTIVATION_LOCK_ACQUIRE_RECEIPT_DOMAIN =
  "required-browser-provision-activation-lock-acquire-receipt-v1";
const ACTIVATION_LOCK_RELEASE_RECEIPT_DOMAIN =
  "required-browser-provision-activation-lock-release-receipt-v1";
const INITIAL_LAYOUT_BINDING_DOMAIN =
  "required-browser-provision-initial-layout-binding-v1";
const INITIAL_LAYOUT_PREPARATION_RECEIPT_DOMAIN =
  "required-browser-provision-initial-layout-preparation-receipt-v1";
const INITIAL_LAYOUT_EMPTY_DIRECTORY_SET_DOMAIN =
  "required-browser-provision-initial-layout-empty-directory-set-v1";
const INITIAL_LAYOUT_ABSENCE_SET_DOMAIN =
  "required-browser-provision-initial-layout-absence-set-v1";
const NPM_CACHE_VERIFY_RESULT_DOMAIN =
  "required-browser-provision-npm-cache-verify-result-v1";
const NPM_CACHE_VERIFY_RECEIPT_DOMAIN =
  "required-browser-provision-npm-cache-verify-receipt-v1";
const OWNED_AUDIT_AGGREGATE_DOMAIN =
  "required-browser-provision-owned-audit-aggregate-v1";
const OWNED_PROCESS_TABLE_SNAPSHOT_DOMAIN =
  "required-browser-provision-owned-process-table-snapshot-v1";
const OWNED_OWNER_TOKEN_SNAPSHOT_DOMAIN =
  "required-browser-provision-owned-owner-token-snapshot-v1";
const NPM_CACHE_INVENTORY_DOMAIN =
  "required-browser-provision-npm-cache-inventory-v1";
const NPM_CACHE_VERIFY_SANITIZED_LOG_DOMAIN =
  "required-browser-provision-npm-cache-verify-sanitized-log-v1";
const NPM_CI_PREFER_OFFLINE_RESULT_DOMAIN =
  "required-browser-provision-npm-ci-prefer-offline-result-v1";
const NPM_CI_PREFER_OFFLINE_RECEIPT_DOMAIN =
  "required-browser-provision-npm-ci-prefer-offline-receipt-v1";
const NPM_CI_PREFER_OFFLINE_SANITIZED_LOG_DOMAIN =
  "required-browser-provision-npm-ci-prefer-offline-sanitized-log-v1";
const NPM_LS_PROVISION_STAGED_RESULT_DOMAIN =
  "required-browser-provision-npm-ls-provision-staged-result-v1";
const NPM_LS_PROVISION_STAGED_RECEIPT_DOMAIN =
  "required-browser-provision-npm-ls-provision-staged-receipt-v1";
const NPM_LS_PROVISION_STAGED_SANITIZED_LOG_DOMAIN =
  "required-browser-provision-npm-ls-provision-staged-sanitized-log-v1";
const INITIAL_STAGED_ACTIVATION_RESULT_DOMAIN =
  "required-browser-provision-initial-staged-activation-result-v1";
const INITIAL_STAGED_ACTIVATION_RECEIPT_DOMAIN =
  "required-browser-provision-initial-staged-activation-receipt-v1";
const ACTIVE_NODE_MODULES_BINDING_DOMAIN =
  "required-browser-provision-active-node-modules-binding-v1";
const ACTIVE_NODE_MODULES_LINK_TARGET_DOMAIN =
  "required-browser-provision-active-node-modules-link-target-v1";
const NPM_LS_DEPENDENCY_TREE_DOMAIN =
  "required-browser-provision-npm-ls-dependency-tree-v1";
const STAGED_NODE_MODULES_INVENTORY_DOMAIN =
  "required-browser-provision-staged-node-modules-inventory-v1";
const PROVISION_OWNER_MARKER_DOMAIN = "dependency-provision-owner-marker-v2";
const PROVISION_CACHE_MARKER_DOMAIN = "dependency-cache-marker-v2";
const PROVISION_QUARANTINE_MARKER_DOMAIN =
  "dependency-quarantine-marker-v2";
const PROVISION_ROLLBACK_MARKER_DOMAIN = "dependency-rollback-marker-v2";
const ACTIVATION_LOCK_RELATIVE_PATH = ".tmp/.mais-dependency-activation.lock";
const INITIAL_STAGED_ACTIVATION_OPERATION_ID =
  "owner.dependency.activate-provision-staged";
const OWNED_PROCESS_EXECUTABLE_IDENTITY_DOMAIN =
  "required-browser-owned-process-executable-identity-v1";
const CANONICAL_EXECUTABLE_PATH_DOMAIN =
  "required-browser-canonical-executable-path-v1";
const STARSHIP_VOLUME_ROOT = "/Volumes/Starship";
const LAUNCHER_SOURCE_BASENAME =
  "required-browser-owned-process-launch.mjs";
const BOOTSTRAP_REGISTRATION_CONTEXT_KEYS = Object.freeze([
  "schemaVersion",
  "repositoryBindingFingerprint",
  "sourceSeedFingerprint"
]);
const BOOTSTRAP_COMMAND_IDS = Object.freeze([
  "owner.dependency.probe.which-npm",
  "owner.dependency.audit.process-table-preflight",
  "owner.dependency.audit.owner-token-table-preflight",
  "owner.dependency.source.git-status",
  "owner.dependency.source.git-head"
]);
const BOOTSTRAP_GIT_COMMAND_IDS = new Set([
  "owner.dependency.source.git-status",
  "owner.dependency.source.git-head"
]);
const INITIAL_ATTEMPT_PRIVATE_COMMAND_IDS = Object.freeze([
  "owner.dependency.audit.process-table-owned",
  "owner.dependency.audit.owner-token-table-owned"
]);
const INITIAL_ATTEMPT_PUBLIC_COMMAND_IDS = Object.freeze([
  "owner.dependency.npm.cache-verify",
  "owner.dependency.npm.ci-prefer-offline",
  "owner.dependency.npm.ls-provision-staged",
  "owner.dependency.npm.ls-provision-active"
]);
const INITIAL_ATTEMPT_COMMAND_IDS = Object.freeze([
  ...INITIAL_ATTEMPT_PRIVATE_COMMAND_IDS,
  ...INITIAL_ATTEMPT_PUBLIC_COMMAND_IDS
]);
const OPTIONAL_ATTEMPT_AMBIENT_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "SHELL",
  "TERM",
  "USER"
]);
const INSTALL_MANIFEST_COPY_FIELDS = Object.freeze([
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
]);
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
const EXPECTED_CRITICAL_DEPENDENCY_VERSIONS = Object.freeze({
  "@playwright/test": "1.59.1",
  next: "15.5.23",
  playwright: "1.59.1",
  postcss: "8.5.26"
});
const INITIAL_LAYOUT_ROOT_DIRECTORIES = Object.freeze([
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
]);
const STRICT_JSON_MAX_DEPTH = 256;
const DEPENDENCY_EVIDENCE_DOMAINS = Object.freeze([
  "dependency-provision-owner-marker-v2",
  "dependency-cache-marker-v2",
  "dependency-activation-lock-v2",
  "dependency-quarantine-marker-v2",
  "dependency-rollback-marker-v2",
  "dependency-owned-subprocess-audit-v2",
  "dependency-cache-seed-source-manifest-v2",
  "dependency-cache-seed-manifest-v2",
  "dependency-cache-seed-provenance-v2",
  "dependency-provision-attestation-v2",
  "dependency-provision-failure-attestation-v2",
  "dependency-requalification-process-audit-v2",
  "dependency-requalification-intent-v2",
  "dependency-requalification-attestation-v2",
  "dependency-activation-attestation-v2",
  "dependency-requalification-failure-v2"
]);
const LOWER_HEX_64 = /^[a-f0-9]{64}$/u;
const LOWER_HEX_40 = /^[a-f0-9]{40}$/u;
const NPM_VERSION_PATTERN =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u;
const NPM_DEBUG_LOG_NAME_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{3}Z-debug-0\.log$/u;
const OWNER_TOKEN_ENVIRONMENT_PATTERN =
  /(?:^|\s)MAIS_(?:BROWSER|DEPENDENCY)_OWNER_TOKEN=/u;
const NPM_REGISTRY_DEPENDENCY_SPEC_PATTERN =
  /^(?=.{1,512}$)(?! )(?!.* $)(?!.*[\u0000-\u001f\u007f:\/\\@%?#])(?=.*[0-9A-Za-z*])[0-9A-Za-z*<>=~^|+_. -]+$/u;
const NPM_REGISTRY_RESOLVED_PATTERN =
  /^https:\/\/registry\.npmjs\.org\/(?:@[^/?#]+\/)?(?:[^/?#]+\/)?-\/[^/?#]+\.tgz$/u;
const NPM_SHA512_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/]+={0,2}$/u;
const NPM_PACKAGE_NAME_PATTERN =
  /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
const BOOTSTRAP_BOUNDED_ABORT_SIGNAL_POLICY_KIND =
  "bootstrap-fixed-direct-child-explicit-bounded-abort";
const IS_PROXY = utilTypes.isProxy;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const NUMBER_CONSTRUCTOR = Number;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const PROCESS_KILL = process.kill;
const PROCESS_HRTIME_BIGINT = process.hrtime.bigint;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_EXEC = RegExp.prototype.exec;
const REGEXP_TEST = RegExp.prototype.test;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const STRING_FROM_CHAR_CODE = String.fromCharCode;
const STRING_INDEX_OF = String.prototype.indexOf;
const STRING_SLICE = String.prototype.slice;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const bootstrapLaunchContexts = new WeakMap();
const bootstrapComponentReceiptMembership = new WeakSet();
const bootstrapWhichNpmPrivateBindings = new WeakMap();
const attemptLaunchContexts = new WeakMap();
const pendingAttemptLaunchContextsByAuthority = new WeakMap();
const registeredAttemptLaunchContexts = new WeakMap();
const attemptOperationReceiptMembership = new WeakSet();

function registrationFailure() {
  throw new Error("Required-browser bootstrap launch-context registration rejected.");
}

function bootstrapOperationFailure() {
  throw new Error("Required-browser bootstrap owned operation rejected.");
}

function bootstrapFinalizationFailure() {
  throw new Error("Required-browser bootstrap finalization rejected.");
}

function attemptRegistrationFailure() {
  throw new Error("Required-browser attempt launch-context registration rejected.");
}

function attemptLockFailure() {
  throw new Error("Required-browser provision activation-lock transaction rejected.");
}

function attemptLayoutFailure() {
  throw new Error("Required-browser initial provision layout preparation rejected.");
}

function attemptOperationFailure() {
  throw new Error("Required-browser initial provision owned operation rejected.");
}

function clearAttemptOperationSecrets(state) {
  if (!state) return;
  releaseStagedInventoryTestBarrier(state);
  releaseInitialActivationTestBarriers(state);
  state.inFlightCommandId = undefined;
  state.npmCliPath = undefined;
  state.npmManifestPath = undefined;
  state.nodeExecutablePath = undefined;
  if (state.stagedNodeModulesDescriptor !== undefined) {
    const descriptor = state.stagedNodeModulesDescriptor;
    state.stagedNodeModulesDescriptor = undefined;
    try {
      closeSync(descriptor);
    } catch {
      // Terminal state never reuses a staged-tree descriptor after uncertainty.
    }
  }
}

function closeProvisionRootDescriptor(state) {
  if (!state || state.provisionRootDescriptor === undefined) return;
  const descriptor = state.provisionRootDescriptor;
  state.provisionRootDescriptor = undefined;
  try {
    closeSync(descriptor);
  } catch {
    // A terminal state never reuses or re-adopts a descriptor after uncertainty.
  }
}

function failBootstrapFinalizationState(state) {
  if (!state || state.status === "finalized") return;
  closeProvisionRootDescriptor(state);
  state.npmCliPrivateBinding = undefined;
  state.status = state.provisionRootWasCreated === true
    ? "failed-retained"
    : "failed";
}

function failAttemptLaunchContextState(state) {
  if (!state || state.status === "registered") return;
  releaseInitialLayoutTestBarrier(state);
  closeProvisionRootDescriptor(state);
  clearAttemptOperationSecrets(state);
  state.attemptAuthority = undefined;
  state.liveHomeProof = undefined;
  state.status = "failed";
}

function isLowerHex64(value) {
  return typeof value === "string"
    && REFLECT_APPLY(REGEXP_TEST, LOWER_HEX_64, [value]);
}

function validateBootstrapRegistrationContext(candidate) {
  if (
    candidate === null
    || typeof candidate !== "object"
    || IS_PROXY(candidate)
  ) {
    registrationFailure();
  }

  const schemaDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
    candidate,
    "schemaVersion"
  );
  if (
    !schemaDescriptor
    || !OBJECT_HAS_OWN(schemaDescriptor, "value")
    || schemaDescriptor.value !== 1
  ) {
    registrationFailure();
  }

  const prototype = OBJECT_GET_PROTOTYPE_OF(candidate);
  if (prototype !== null && prototype !== OBJECT_PROTOTYPE) {
    registrationFailure();
  }
  const keys = REFLECT_OWN_KEYS(candidate);
  if (keys.length !== BOOTSTRAP_REGISTRATION_CONTEXT_KEYS.length) {
    registrationFailure();
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== BOOTSTRAP_REGISTRATION_CONTEXT_KEYS[index]) {
      registrationFailure();
    }
  }

  const values = [];
  for (const key of BOOTSTRAP_REGISTRATION_CONTEXT_KEYS) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(candidate, key);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")) {
      registrationFailure();
    }
    values.push([key, descriptor.value]);
  }
  const context = nullRecord(values);
  if (
    !isLowerHex64(context.repositoryBindingFingerprint)
    || !isLowerHex64(context.sourceSeedFingerprint)
  ) {
    registrationFailure();
  }
  return context;
}

function nullRecord(entries) {
  const value = OBJECT_CREATE(null);
  for (const [key, fieldValue] of entries) {
    OBJECT_DEFINE_PROPERTY(value, key, {
      configurable: false,
      enumerable: true,
      value: fieldValue,
      writable: false
    });
  }
  return OBJECT_FREEZE(value);
}

function staticBindingFailure() {
  throw new Error("Required-browser bootstrap static binding rejected.");
}

function stableLstat(exactPath) {
  try {
    return lstatSync(exactPath, {
      bigint: true,
      throwIfNoEntry: false
    });
  } catch {
    staticBindingFailure();
  }
}

function stableRealpath(exactPath) {
  try {
    return realpathSync(exactPath);
  } catch {
    staticBindingFailure();
  }
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBoundedDescriptor(descriptor, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    staticBindingFailure();
  }
  const chunks = [];
  const chunkSize = Math.min(64 * 1024, maxBytes + 1);
  let totalBytes = 0;
  while (totalBytes <= maxBytes) {
    const remaining = maxBytes + 1 - totalBytes;
    const chunk = Buffer.allocUnsafe(Math.min(chunkSize, remaining));
    let bytesRead;
    try {
      bytesRead = readSync(descriptor, chunk, 0, chunk.byteLength, null);
    } catch {
      staticBindingFailure();
    }
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    totalBytes += bytesRead;
  }
  if (totalBytes > maxBytes) staticBindingFailure();
  return Buffer.concat(chunks, totalBytes);
}

function canonicalPathFingerprint(role, canonicalPath) {
  return hashCanonicalProof(
    REPOSITORY_PATH_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["role", role],
      ["canonicalPath", canonicalPath]
    ])
  );
}

function sameStableStats(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertOwnerControlledStats(
  entry,
  expectedUid,
  expectedDev,
  allowGroupWrite = false
) {
  if (
    entry.uid !== expectedUid
    || (expectedDev !== undefined && entry.dev !== expectedDev)
    || (!allowGroupWrite && (entry.mode & 0o022n) !== 0n)
  ) {
    staticBindingFailure();
  }
}

function filesystemEntryIdentityFingerprint({
  entry,
  pathFingerprint,
  rawByteSha256,
  role,
  type
}) {
  const fields = [
    ["schemaVersion", 1],
    ["role", role],
    ["pathFingerprint", pathFingerprint],
    ["type", type],
    ["dev", entry.dev.toString(10)],
    ["ino", entry.ino.toString(10)],
    ["mode", entry.mode.toString(10)],
    ["uid", entry.uid.toString(10)],
    ["gid", entry.gid.toString(10)]
  ];
  if (type === "file") {
    fields.push(["nlink", entry.nlink.toString(10)]);
    fields.push(["rawByteSha256", rawByteSha256]);
  }
  return hashCanonicalProof(
    FILESYSTEM_ENTRY_IDENTITY_DOMAIN,
    nullRecord(fields)
  );
}

function observeDirectory(
  exactPath,
  role,
  expectedUid,
  expectedDev,
  ownerRwx,
  allowGroupWrite = false
) {
  if (!isAbsolute(exactPath) || resolve(exactPath) !== exactPath) {
    staticBindingFailure();
  }
  let descriptor;
  let initial;
  let before;
  let after;
  let finalDescriptorEntry;
  let finalEntry;
  let observationFailed = false;
  try {
    initial = stableLstat(exactPath);
    if (!initial || !initial.isDirectory() || initial.isSymbolicLink()) {
      staticBindingFailure();
    }
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_RDONLY
        | FS_CONSTANTS.O_NOFOLLOW
        | FS_CONSTANTS.O_DIRECTORY
    );
    before = fstatSync(descriptor, { bigint: true });
    after = fstatSync(descriptor, { bigint: true });
    if (stableRealpath(exactPath) !== exactPath) {
      staticBindingFailure();
    }
    finalEntry = stableLstat(exactPath);
    finalDescriptorEntry = fstatSync(descriptor, { bigint: true });
    if (
      !before
      || !after
      || !finalDescriptorEntry
      || !finalEntry
      || !before.isDirectory()
      || before.isSymbolicLink()
      || !after.isDirectory()
      || after.isSymbolicLink()
      || !finalDescriptorEntry.isDirectory()
      || finalDescriptorEntry.isSymbolicLink()
      || !finalEntry.isDirectory()
      || finalEntry.isSymbolicLink()
      || !sameStableStats(initial, before)
      || !sameStableStats(before, after)
      || !sameStableStats(after, finalEntry)
      || !sameStableStats(finalEntry, finalDescriptorEntry)
    ) {
      staticBindingFailure();
    }
  } catch {
    observationFailed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        observationFailed = true;
      }
    }
  }
  if (observationFailed) staticBindingFailure();
  assertOwnerControlledStats(
    finalEntry,
    expectedUid,
    expectedDev,
    allowGroupWrite
  );
  if (ownerRwx && (finalEntry.mode & 0o700n) !== 0o700n) {
    staticBindingFailure();
  }
  const pathFingerprint = canonicalPathFingerprint(role, exactPath);
  return {
    dev: finalEntry.dev,
    entry: finalEntry,
    identityFingerprint: filesystemEntryIdentityFingerprint({
      entry: finalEntry,
      pathFingerprint,
      role,
      type: "directory"
    }),
    pathFingerprint,
    uid: finalEntry.uid
  };
}

function readStableRegularFile(
  exactPath,
  expectedUid,
  expectedDev,
  maxBytes,
  forbidExecute,
  requireSingleLink = true
) {
  if (
    !Number.isSafeInteger(maxBytes)
    || maxBytes < 0
    || !isAbsolute(exactPath)
    || resolve(exactPath) !== exactPath
  ) {
    staticBindingFailure();
  }
  let descriptor;
  let initial;
  let before;
  let after;
  let finalDescriptorEntry;
  let finalEntry;
  let bytes;
  let observationFailed = false;
  try {
    initial = stableLstat(exactPath);
    if (
      !initial
      || !initial.isFile()
      || initial.isSymbolicLink()
      || initial.nlink < 1n
      || (requireSingleLink && initial.nlink !== 1n)
    ) {
      staticBindingFailure();
    }
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW
    );
    before = fstatSync(descriptor, { bigint: true });
    if (before.size < 0n || before.size > BigInt(maxBytes)) {
      staticBindingFailure();
    }
    bytes = readBoundedDescriptor(descriptor, maxBytes);
    after = fstatSync(descriptor, { bigint: true });
    if (stableRealpath(exactPath) !== exactPath) {
      staticBindingFailure();
    }
    finalEntry = stableLstat(exactPath);
    finalDescriptorEntry = fstatSync(descriptor, { bigint: true });
    if (
      !before
      || !after
      || !finalDescriptorEntry
      || !finalEntry
      || !before.isFile()
      || before.isSymbolicLink()
      || !after.isFile()
      || after.isSymbolicLink()
      || !finalDescriptorEntry.isFile()
      || finalDescriptorEntry.isSymbolicLink()
      || !finalEntry.isFile()
      || finalEntry.isSymbolicLink()
      || before.nlink < 1n
      || after.nlink < 1n
      || finalDescriptorEntry.nlink < 1n
      || finalEntry.nlink < 1n
      || (requireSingleLink && before.nlink !== 1n)
      || (requireSingleLink && after.nlink !== 1n)
      || (requireSingleLink && finalDescriptorEntry.nlink !== 1n)
      || (requireSingleLink && finalEntry.nlink !== 1n)
      || !sameStableStats(initial, before)
      || !sameStableStats(before, after)
      || !sameStableStats(after, finalEntry)
      || !sameStableStats(finalEntry, finalDescriptorEntry)
      || !bytes
      || bytes.byteLength !== Number(before.size)
    ) {
      staticBindingFailure();
    }
  } catch {
    observationFailed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        observationFailed = true;
      }
    }
  }
  if (observationFailed) staticBindingFailure();
  assertOwnerControlledStats(finalEntry, expectedUid, expectedDev);
  if (forbidExecute && (finalEntry.mode & 0o111n) !== 0n) {
    staticBindingFailure();
  }
  return {
    bytes,
    entry: finalEntry,
    rawByteSha256: sha256Bytes(bytes)
  };
}

function observeRegularFile(
  exactPath,
  role,
  expectedUid,
  expectedDev,
  maxBytes,
  requireSingleLink = true
) {
  const observation = readStableRegularFile(
    exactPath,
    expectedUid,
    expectedDev,
    maxBytes,
    true,
    requireSingleLink
  );
  const pathFingerprint = canonicalPathFingerprint(role, exactPath);
  return {
    ...observation,
    identityFingerprint: filesystemEntryIdentityFingerprint({
      entry: observation.entry,
      pathFingerprint,
      rawByteSha256: observation.rawByteSha256,
      role,
      type: "file"
    }),
    pathFingerprint
  };
}

function decodeExactUtf8(bytes) {
  try {
    return UTF8_DECODER.decode(bytes);
  } catch {
    staticBindingFailure();
  }
}

function strictJsonFailure() {
  attemptLayoutFailure();
}

function strictJsonCodeUnit(text, index) {
  return REFLECT_APPLY(STRING_CHAR_CODE_AT, text, [index]);
}

function strictJsonSlice(text, start, end) {
  return REFLECT_APPLY(STRING_SLICE, text, [start, end]);
}

function strictJsonHexUnit(text, index) {
  if (index + 4 > text.length) strictJsonFailure();
  let value = 0;
  for (let offset = 0; offset < 4; offset += 1) {
    const unit = strictJsonCodeUnit(text, index + offset);
    let digit;
    if (unit >= 0x30 && unit <= 0x39) digit = unit - 0x30;
    else if (unit >= 0x41 && unit <= 0x46) digit = unit - 0x41 + 10;
    else if (unit >= 0x61 && unit <= 0x66) digit = unit - 0x61 + 10;
    else strictJsonFailure();
    value = value * 16 + digit;
  }
  return value;
}

function parseStrictJsonObject(exactBytes) {
  const text = decodeExactUtf8(exactBytes);
  if (
    text.length === 0
    || strictJsonCodeUnit(text, 0) === 0xfeff
    || REFLECT_APPLY(STRING_INDEX_OF, text, [STRING_FROM_CHAR_CODE(0)]) !== -1
  ) {
    strictJsonFailure();
  }
  let index = 0;

  const skipWhitespace = () => {
    while (index < text.length) {
      const unit = strictJsonCodeUnit(text, index);
      if (unit !== 0x20 && unit !== 0x09 && unit !== 0x0a && unit !== 0x0d) {
        break;
      }
      index += 1;
    }
  };

  const parseString = () => {
    if (strictJsonCodeUnit(text, index) !== 0x22) strictJsonFailure();
    index += 1;
    let value = "";
    while (index < text.length) {
      const unit = strictJsonCodeUnit(text, index);
      index += 1;
      if (unit === 0x22) return value;
      if (unit < 0x20 || unit === 0xfeff) strictJsonFailure();
      if (unit === 0x5c) {
        if (index >= text.length) strictJsonFailure();
        const escape = strictJsonCodeUnit(text, index);
        index += 1;
        if (escape === 0x22 || escape === 0x5c || escape === 0x2f) {
          value += STRING_FROM_CHAR_CODE(escape);
          continue;
        }
        if (escape === 0x62) {
          value += "\b";
          continue;
        }
        if (escape === 0x66) {
          value += "\f";
          continue;
        }
        if (escape === 0x6e) {
          value += "\n";
          continue;
        }
        if (escape === 0x72) {
          value += "\r";
          continue;
        }
        if (escape === 0x74) {
          value += "\t";
          continue;
        }
        if (escape !== 0x75) strictJsonFailure();
        const escapedUnit = strictJsonHexUnit(text, index);
        index += 4;
        if (escapedUnit === 0 || escapedUnit === 0xfeff) strictJsonFailure();
        if (escapedUnit >= 0xd800 && escapedUnit <= 0xdbff) {
          if (
            index + 6 > text.length
            || strictJsonCodeUnit(text, index) !== 0x5c
            || strictJsonCodeUnit(text, index + 1) !== 0x75
          ) {
            strictJsonFailure();
          }
          const low = strictJsonHexUnit(text, index + 2);
          if (low < 0xdc00 || low > 0xdfff) strictJsonFailure();
          value += STRING_FROM_CHAR_CODE(escapedUnit, low);
          index += 6;
          continue;
        }
        if (escapedUnit >= 0xdc00 && escapedUnit <= 0xdfff) {
          strictJsonFailure();
        }
        value += STRING_FROM_CHAR_CODE(escapedUnit);
        continue;
      }
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index >= text.length) strictJsonFailure();
        const low = strictJsonCodeUnit(text, index);
        if (low < 0xdc00 || low > 0xdfff) strictJsonFailure();
        value += STRING_FROM_CHAR_CODE(unit, low);
        index += 1;
        continue;
      }
      if (unit >= 0xdc00 && unit <= 0xdfff) strictJsonFailure();
      value += STRING_FROM_CHAR_CODE(unit);
    }
    strictJsonFailure();
  };

  const parseNumber = () => {
    const start = index;
    if (strictJsonCodeUnit(text, index) === 0x2d) index += 1;
    if (index >= text.length) strictJsonFailure();
    let unit = strictJsonCodeUnit(text, index);
    if (unit === 0x30) {
      index += 1;
      if (index < text.length) {
        unit = strictJsonCodeUnit(text, index);
        if (unit >= 0x30 && unit <= 0x39) strictJsonFailure();
      }
    } else {
      if (unit < 0x31 || unit > 0x39) strictJsonFailure();
      index += 1;
      while (index < text.length) {
        unit = strictJsonCodeUnit(text, index);
        if (unit < 0x30 || unit > 0x39) break;
        index += 1;
      }
    }
    if (index < text.length && strictJsonCodeUnit(text, index) === 0x2e) {
      index += 1;
      if (index >= text.length) strictJsonFailure();
      unit = strictJsonCodeUnit(text, index);
      if (unit < 0x30 || unit > 0x39) strictJsonFailure();
      while (index < text.length) {
        unit = strictJsonCodeUnit(text, index);
        if (unit < 0x30 || unit > 0x39) break;
        index += 1;
      }
    }
    if (index < text.length) {
      unit = strictJsonCodeUnit(text, index);
      if (unit === 0x65 || unit === 0x45) {
        index += 1;
        if (index < text.length) {
          unit = strictJsonCodeUnit(text, index);
          if (unit === 0x2b || unit === 0x2d) index += 1;
        }
        if (index >= text.length) strictJsonFailure();
        unit = strictJsonCodeUnit(text, index);
        if (unit < 0x30 || unit > 0x39) strictJsonFailure();
        while (index < text.length) {
          unit = strictJsonCodeUnit(text, index);
          if (unit < 0x30 || unit > 0x39) break;
          index += 1;
        }
      }
    }
    const value = NUMBER_CONSTRUCTOR(strictJsonSlice(text, start, index));
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) strictJsonFailure();
    return value;
  };

  const consumeLiteral = (literalValue, result) => {
    if (strictJsonSlice(text, index, index + literalValue.length) !== literalValue) {
      strictJsonFailure();
    }
    index += literalValue.length;
    return result;
  };

  const parseValue = (depth) => {
    if (depth > STRICT_JSON_MAX_DEPTH) strictJsonFailure();
    skipWhitespace();
    if (index >= text.length) strictJsonFailure();
    const unit = strictJsonCodeUnit(text, index);
    if (unit === 0x22) return parseString();
    if (unit === 0x7b) {
      index += 1;
      skipWhitespace();
      const entries = [];
      const keys = new Set();
      if (strictJsonCodeUnit(text, index) === 0x7d) {
        index += 1;
        return nullRecord(entries);
      }
      while (index < text.length) {
        const key = parseString();
        if (REFLECT_APPLY(SET_HAS, keys, [key])) strictJsonFailure();
        REFLECT_APPLY(SET_ADD, keys, [key]);
        skipWhitespace();
        if (strictJsonCodeUnit(text, index) !== 0x3a) strictJsonFailure();
        index += 1;
        const value = parseValue(depth + 1);
        REFLECT_APPLY(ARRAY_PUSH, entries, [[key, value]]);
        skipWhitespace();
        const separator = strictJsonCodeUnit(text, index);
        if (separator === 0x7d) {
          index += 1;
          return nullRecord(entries);
        }
        if (separator !== 0x2c) strictJsonFailure();
        index += 1;
        skipWhitespace();
      }
      strictJsonFailure();
    }
    if (unit === 0x5b) {
      index += 1;
      skipWhitespace();
      const values = [];
      if (strictJsonCodeUnit(text, index) === 0x5d) {
        index += 1;
        return OBJECT_FREEZE(values);
      }
      while (index < text.length) {
        REFLECT_APPLY(ARRAY_PUSH, values, [parseValue(depth + 1)]);
        skipWhitespace();
        const separator = strictJsonCodeUnit(text, index);
        if (separator === 0x5d) {
          index += 1;
          return OBJECT_FREEZE(values);
        }
        if (separator !== 0x2c) strictJsonFailure();
        index += 1;
      }
      strictJsonFailure();
    }
    if (unit === 0x74) return consumeLiteral("true", true);
    if (unit === 0x66) return consumeLiteral("false", false);
    if (unit === 0x6e) return consumeLiteral("null", null);
    if (unit === 0x2d || (unit >= 0x30 && unit <= 0x39)) {
      return parseNumber();
    }
    strictJsonFailure();
  };

  const parsed = parseValue(0);
  skipWhitespace();
  if (
    index !== text.length
    || parsed === null
    || typeof parsed !== "object"
    || ARRAY_IS_ARRAY(parsed)
    || OBJECT_GET_PROTOTYPE_OF(parsed) !== null
  ) {
    strictJsonFailure();
  }
  return parsed;
}

function ownRecordValue(record, key) {
  if (
    record === null
    || typeof record !== "object"
    || ARRAY_IS_ARRAY(record)
    || OBJECT_GET_PROTOTYPE_OF(record) !== null
  ) {
    attemptLayoutFailure();
  }
  const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, key);
  if (!descriptor) return { present: false, value: undefined };
  if (!OBJECT_HAS_OWN(descriptor, "value")) attemptLayoutFailure();
  return { present: true, value: descriptor.value };
}

function sameOptionalCanonicalValue(left, right) {
  if (left.present !== right.present) return false;
  if (!left.present) return true;
  return canonicalizeClosedJson(left.value) === canonicalizeClosedJson(right.value);
}

function localDependencyReference(value) {
  return typeof value !== "string"
    || value === "."
    || value === ".."
    || value === "~"
    || !REFLECT_APPLY(
      REGEXP_TEST,
      NPM_REGISTRY_DEPENDENCY_SPEC_PATTERN,
      [value]
    );
}

const CLOSED_UNBOUND_DEPENDENCY_REFERENCE_VECTORS = Object.freeze([
  "file:../outside",
  "FILE:/outside",
  "git+file:///outside/repository",
  "Git+File:C:\\outside\\repository",
  "link:../outside",
  "workspace:*",
  "../outside",
  "..\\outside",
  "/outside",
  "\\\\server\\share",
  "C:\\outside",
  "C:/outside",
  "~/outside",
  "~\\outside",
  "%2e%2e%2foutside",
  "https://example.invalid/archive.tgz"
]);
for (const reference of CLOSED_UNBOUND_DEPENDENCY_REFERENCE_VECTORS) {
  if (!localDependencyReference(reference)) attemptLayoutFailure();
}
for (const reference of ["latest", "*", "^1.2.3", ">= 16 || ^18.0.0"]) {
  if (localDependencyReference(reference)) attemptLayoutFailure();
}

function assertNpmPackageName(value) {
  if (
    typeof value !== "string"
    || value.length > 214
    || !REFLECT_APPLY(REGEXP_TEST, NPM_PACKAGE_NAME_PATTERN, [value])
  ) {
    attemptLayoutFailure();
  }
}

function assertLockPackageLocation(value) {
  if (value === "") return;
  if (
    typeof value !== "string"
    || value.length > 4096
    || REFLECT_APPLY(STRING_INDEX_OF, value, ["\\"]) !== -1
    || !REFLECT_APPLY(STRING_STARTS_WITH, value, ["node_modules/"])
  ) {
    attemptLayoutFailure();
  }
  const components = REFLECT_APPLY(STRING_SPLIT, value, ["/"]);
  let index = 0;
  while (index < components.length) {
    if (components[index] !== "node_modules") attemptLayoutFailure();
    index += 1;
    const firstName = components[index];
    if (!firstName || firstName === "node_modules") attemptLayoutFailure();
    if (REFLECT_APPLY(STRING_STARTS_WITH, firstName, ["@"])) {
      const secondName = components[index + 1];
      if (!secondName || secondName === "node_modules") {
        attemptLayoutFailure();
      }
      assertNpmPackageName(`${firstName}/${secondName}`);
      index += 2;
    } else {
      assertNpmPackageName(firstName);
      index += 1;
    }
  }
}

function requiredNullRecord(value) {
  if (
    value === null
    || typeof value !== "object"
    || ARRAY_IS_ARRAY(value)
    || OBJECT_GET_PROTOTYPE_OF(value) !== null
  ) {
    attemptLayoutFailure();
  }
  return value;
}

function assertRegistryDependencyMap(value) {
  const record = requiredNullRecord(value);
  for (const packageName of REFLECT_OWN_KEYS(record)) {
    if (typeof packageName !== "string") attemptLayoutFailure();
    assertNpmPackageName(packageName);
    const member = ownRecordValue(record, packageName);
    if (!member.present || localDependencyReference(member.value)) {
      attemptLayoutFailure();
    }
  }
}

function assertPeerDependencyMeta(value) {
  const record = requiredNullRecord(value);
  for (const packageName of REFLECT_OWN_KEYS(record)) {
    if (typeof packageName !== "string") attemptLayoutFailure();
    assertNpmPackageName(packageName);
    const member = ownRecordValue(record, packageName);
    if (!member.present) attemptLayoutFailure();
    const meta = requiredNullRecord(member.value);
    const keys = REFLECT_OWN_KEYS(meta);
    if (keys.length !== 1 || keys[0] !== "optional") {
      attemptLayoutFailure();
    }
    const optional = ownRecordValue(meta, "optional");
    if (!optional.present || optional.value !== true) attemptLayoutFailure();
  }
}

function assertBundledDependencyNames(value) {
  if (!ARRAY_IS_ARRAY(value)) attemptLayoutFailure();
  for (const packageName of value) assertNpmPackageName(packageName);
}

function assertRegistryOverrideMap(value) {
  const record = requiredNullRecord(value);
  for (const packageName of REFLECT_OWN_KEYS(record)) {
    if (typeof packageName !== "string") attemptLayoutFailure();
    assertNpmPackageName(packageName);
    const member = ownRecordValue(record, packageName);
    if (!member.present || localDependencyReference(member.value)) {
      attemptLayoutFailure();
    }
  }
}

function assertNoLocalDependencyReferences(record, scope) {
  for (const field of DEPENDENCY_FIELDS) {
    const section = ownRecordValue(record, field);
    if (!section.present) continue;
    if (
      field === "dependencies"
      || field === "devDependencies"
      || field === "optionalDependencies"
      || field === "peerDependencies"
    ) {
      assertRegistryDependencyMap(section.value);
    } else if (field === "peerDependenciesMeta") {
      assertPeerDependencyMeta(section.value);
    } else if (
      field === "bundledDependencies"
      || field === "bundleDependencies"
    ) {
      assertBundledDependencyNames(section.value);
    } else if (field === "overrides" || field === "resolutions") {
      assertRegistryOverrideMap(section.value);
    } else {
      attemptLayoutFailure();
    }
  }
  if (scope !== "lock-entry") return;
  const linked = ownRecordValue(record, "link");
  if (
    linked.present
    && (typeof linked.value !== "boolean" || linked.value === true)
  ) {
    attemptLayoutFailure();
  }
  const resolved = ownRecordValue(record, "resolved");
  if (resolved.present) {
    const integrity = ownRecordValue(record, "integrity");
    if (
      typeof resolved.value !== "string"
      || !REFLECT_APPLY(
        REGEXP_TEST,
        NPM_REGISTRY_RESOLVED_PATTERN,
        [resolved.value]
      )
      || !integrity.present
      || typeof integrity.value !== "string"
      || !REFLECT_APPLY(
        REGEXP_TEST,
        NPM_SHA512_INTEGRITY_PATTERN,
        [integrity.value]
      )
    ) {
      attemptLayoutFailure();
    }
  }
}

function requiredRecord(record, key) {
  const field = ownRecordValue(record, key);
  if (
    !field.present
    || field.value === null
    || typeof field.value !== "object"
    || ARRAY_IS_ARRAY(field.value)
    || OBJECT_GET_PROTOTYPE_OF(field.value) !== null
  ) {
    attemptLayoutFailure();
  }
  return field.value;
}

function requiredString(record, key) {
  const field = ownRecordValue(record, key);
  if (!field.present || typeof field.value !== "string") {
    attemptLayoutFailure();
  }
  return field.value;
}

function validateInstallSourceContract(packageManifest, packageLock) {
  if (ownRecordValue(packageManifest, "workspaces").present) {
    attemptLayoutFailure();
  }
  const lockfileVersion = ownRecordValue(packageLock, "lockfileVersion");
  if (!lockfileVersion.present || lockfileVersion.value !== 3) {
    attemptLayoutFailure();
  }
  const packages = requiredRecord(packageLock, "packages");
  const lockRoot = requiredRecord(packages, "");
  for (const field of LOCK_ROOT_DEPENDENCY_FIELDS) {
    if (!sameOptionalCanonicalValue(
      ownRecordValue(packageManifest, field),
      ownRecordValue(lockRoot, field)
    )) {
      attemptLayoutFailure();
    }
  }
  assertNoLocalDependencyReferences(packageManifest, "package");
  for (const packagePath of REFLECT_OWN_KEYS(packages)) {
    if (typeof packagePath !== "string") attemptLayoutFailure();
    assertLockPackageLocation(packagePath);
    const entry = requiredRecord(packages, packagePath);
    assertNoLocalDependencyReferences(entry, "lock-entry");
  }
  const dependencies = requiredRecord(packageManifest, "dependencies");
  const devDependencies = requiredRecord(packageManifest, "devDependencies");
  if (
    requiredString(dependencies, "next")
      !== EXPECTED_CRITICAL_DEPENDENCY_VERSIONS.next
    || requiredString(devDependencies, "postcss")
      !== EXPECTED_CRITICAL_DEPENDENCY_VERSIONS.postcss
    || requiredString(devDependencies, "@playwright/test")
      !== `^${EXPECTED_CRITICAL_DEPENDENCY_VERSIONS["@playwright/test"]}`
  ) {
    attemptLayoutFailure();
  }
  for (const name of REFLECT_OWN_KEYS(EXPECTED_CRITICAL_DEPENDENCY_VERSIONS)) {
    const expectedVersion = EXPECTED_CRITICAL_DEPENDENCY_VERSIONS[name];
    const entry = requiredRecord(packages, `node_modules/${name}`);
    if (
      requiredString(entry, "version") !== expectedVersion
      || requiredString(entry, "integrity").length === 0
    ) {
      attemptLayoutFailure();
    }
  }
}

function internalLayoutKnownAnswerRejects(operation) {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error("Required-browser internal layout known-answer rejection failed.");
  }
}

function verifyInternalLayoutValidationKnownAnswers() {
  for (const text of [
    "{\"a\":1,\"\\u0061\":2}",
    "{\"value\":\"\\ud800\"}",
    "{\"value\":-0}",
    "{\"value\":-0e-9999}",
    "{\"value\":1e9999}",
    "{\"value\":1} trailing"
  ]) {
    internalLayoutKnownAnswerRejects(() =>
      parseStrictJsonObject(Buffer.from(text, "utf8"))
    );
  }
  internalLayoutKnownAnswerRejects(() =>
    parseStrictJsonObject(Buffer.from([
      0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22,
      0xed, 0xa0, 0x80,
      0x22, 0x7d
    ]))
  );
  const parsed = parseStrictJsonObject(Buffer.from("{\"value\":0}", "utf8"));
  if (parsed.value !== 0 || OBJECT_IS(parsed.value, -0)) {
    throw new Error("Required-browser internal strict JSON known answer failed.");
  }

  for (const location of [
    "packages/local",
    "node_modules/pkg/child",
    "node_modules/../pkg",
    "node_modules/@scope",
    "node_modules/pkg\\child"
  ]) {
    internalLayoutKnownAnswerRejects(() => assertLockPackageLocation(location));
  }
  assertLockPackageLocation("");
  assertLockPackageLocation("node_modules/@scope/pkg/node_modules/child");

  internalLayoutKnownAnswerRejects(() => assertRegistryDependencyMap(
    nullRecord([["local", "git+file:///outside/repository"]])
  ));
  internalLayoutKnownAnswerRejects(() => assertRegistryDependencyMap(
    nullRecord([["local", true]])
  ));
  internalLayoutKnownAnswerRejects(() => assertPeerDependencyMeta(
    nullRecord([["react", nullRecord([["optional", false]])]])
  ));
  internalLayoutKnownAnswerRejects(() =>
    assertBundledDependencyNames(["../outside"])
  );
  internalLayoutKnownAnswerRejects(() => assertRegistryOverrideMap(
    nullRecord([["pkg", nullRecord([[".", "file:../outside"]])]])
  ));
  internalLayoutKnownAnswerRejects(() => assertNoLocalDependencyReferences(
    nullRecord([
      ["resolved", "git+file:///outside/repository"],
      ["integrity", "sha512-QUFBQQ=="]
    ]),
    "lock-entry"
  ));
  internalLayoutKnownAnswerRejects(() => assertNoLocalDependencyReferences(
    nullRecord([
      ["resolved", "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz"]
    ]),
    "lock-entry"
  ));
  internalLayoutKnownAnswerRejects(() => assertNoLocalDependencyReferences(
    nullRecord([["workspaces", Object.freeze(["packages/*"])]]),
    "package"
  ));

  const packageDependencies = nullRecord([["next", "15.5.23"]]);
  const packageDevDependencies = nullRecord([
    ["@playwright/test", "^1.59.1"],
    ["postcss", "8.5.26"]
  ]);
  const packageManifest = nullRecord([
    ["dependencies", packageDependencies],
    ["devDependencies", packageDevDependencies]
  ]);
  const integrity = "sha512-QUFBQQ==";
  const criticalEntry = (version) => nullRecord([
    ["version", version],
    ["integrity", integrity]
  ]);
  const lockRoot = nullRecord([
    ["dependencies", packageDependencies],
    ["devDependencies", packageDevDependencies]
  ]);
  const packages = nullRecord([
    ["", lockRoot],
    ["node_modules/@playwright/test", criticalEntry("1.59.1")],
    ["node_modules/next", criticalEntry("15.5.23")],
    ["node_modules/playwright", criticalEntry("1.59.1")],
    ["node_modules/postcss", criticalEntry("8.5.26")]
  ]);
  const packageLock = nullRecord([
    ["lockfileVersion", 3],
    ["packages", packages]
  ]);
  validateInstallSourceContract(packageManifest, packageLock);
  internalLayoutKnownAnswerRejects(() => validateInstallSourceContract(
    packageManifest,
    nullRecord([["lockfileVersion", 2], ["packages", packages]])
  ));
  const mismatchedRoot = nullRecord([
    ["dependencies", nullRecord([["next", "15.5.22"]])],
    ["devDependencies", packageDevDependencies]
  ]);
  internalLayoutKnownAnswerRejects(() => validateInstallSourceContract(
    packageManifest,
    nullRecord([
      ["lockfileVersion", 3],
      ["packages", nullRecord([
        ["", mismatchedRoot],
        ["node_modules/@playwright/test", criticalEntry("1.59.1")],
        ["node_modules/next", criticalEntry("15.5.23")],
        ["node_modules/playwright", criticalEntry("1.59.1")],
        ["node_modules/postcss", criticalEntry("8.5.26")]
      ])]
    ])
  ));
  const wrongCriticalDependencies = nullRecord([["next", "15.5.22"]]);
  internalLayoutKnownAnswerRejects(() => validateInstallSourceContract(
    nullRecord([
      ["dependencies", wrongCriticalDependencies],
      ["devDependencies", packageDevDependencies]
    ]),
    nullRecord([
      ["lockfileVersion", 3],
      ["packages", nullRecord([
        ["", nullRecord([
          ["dependencies", wrongCriticalDependencies],
          ["devDependencies", packageDevDependencies]
        ])],
        ["node_modules/@playwright/test", criticalEntry("1.59.1")],
        ["node_modules/next", criticalEntry("15.5.22")],
        ["node_modules/playwright", criticalEntry("1.59.1")],
        ["node_modules/postcss", criticalEntry("8.5.26")]
      ])]
    ])
  ));
}

verifyInternalLayoutValidationKnownAnswers();

function buildInstallOnlyManifest(packageManifest) {
  const fields = [];
  for (const key of INSTALL_MANIFEST_COPY_FIELDS) {
    const field = ownRecordValue(packageManifest, key);
    if (field.present) REFLECT_APPLY(ARRAY_PUSH, fields, [[key, field.value]]);
  }
  REFLECT_APPLY(ARRAY_PUSH, fields, [["scripts", nullRecord([])]]);
  return nullRecord(fields);
}

function literal(value) {
  return nullRecord([
    ["kind", "literal"],
    ["value", value]
  ]);
}

function validatedBinding(name) {
  return nullRecord([
    ["kind", "validated-binding"],
    ["name", name],
    ["prefix", ""]
  ]);
}

function argv(...tokens) {
  return Object.freeze(tokens);
}

const NODE_EXECUTABLE = nullRecord([
  ["kind", "launcher-node-runtime"]
]);

const PS_EXECUTABLE = nullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "ps"],
  ["absolutePath", "/bin/ps"]
]);

const WHICH_EXECUTABLE = nullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "which"],
  ["absolutePath", "/usr/bin/which"]
]);

const GIT_EXECUTABLE = nullRecord([
  ["kind", "fixed-system-executable"],
  ["name", "git"],
  ["absolutePath", "/usr/bin/git"]
]);

const RUNNER_REPOSITORY_CWD = nullRecord([
  ["kind", "runner-repository-root"]
]);

const PROVISION_REPOSITORY_CWD = nullRecord([
  ["kind", "provision-repository-root"]
]);

const INITIAL_INSTALL_CWD = nullRecord([
  ["kind", "initial-provision-install-root"]
]);

const REQUALIFICATION_INSTALL_CWD = nullRecord([
  ["kind", "requalification-provision-install-root"]
]);

function bufferedParsePolicy(maxBytes) {
  return nullRecord([
    ["kind", "buffered-parse"],
    ["stdoutMaxBytes", maxBytes],
    ["stderrMaxBytes", maxBytes],
    ["overflow", "reject"],
    ["retainedLog", "none"]
  ]);
}

function bufferedSanitizedLogPolicy(maxBytes) {
  return nullRecord([
    ["kind", "buffered-parse-and-sanitized-log"],
    ["stdoutMaxBytes", maxBytes],
    ["stderrMaxBytes", maxBytes],
    ["overflow", "reject"],
    ["retainedLogMaxBytes", 524288]
  ]);
}

const OUTPUT_A4 = bufferedParsePolicy(4194304);
const OUTPUT_A16 = bufferedParsePolicy(16777216);
const OUTPUT_A32 = bufferedParsePolicy(33554432);
const OUTPUT_B16 = bufferedSanitizedLogPolicy(16777216);
const OUTPUT_B64 = bufferedSanitizedLogPolicy(67108864);
const OUTPUT_C64 = nullRecord([
  ["kind", "streamed-digest-and-sanitized-log"],
  ["stdoutDigestMaxBytes", 67108864],
  ["stderrDigestMaxBytes", 67108864],
  ["overflow", "reject"],
  ["retainedLogMaxBytes", 524288]
]);

const NO_READINESS = nullRecord([
  ["kind", "none"]
]);

const SERVICE_READINESS = nullRecord([
  ["kind", "http-status"],
  ["overallTimeoutMs", 90000],
  ["pollIntervalMs", 250],
  ["requestTimeoutMs", 1500],
  ["redirectMode", "manual"],
  ["acceptedStatusUpperBoundExclusive", 500],
  ["urlBinding", "service-base-url"]
]);

function signalPolicy(kind, pollIntervalMs) {
  return nullRecord([
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

const RUNNER_DIRECT_SIGNAL = signalPolicy(
  "identity-revalidated-direct-child-term-kill",
  150
);
const RUNNER_TREE_SIGNAL = signalPolicy(
  "identity-revalidated-owned-tree-term-kill",
  150
);
const PROVISION_DIRECT_SIGNAL = signalPolicy(
  "identity-revalidated-direct-child-term-kill",
  250
);
const PROVISION_TREE_SIGNAL = signalPolicy(
  "identity-revalidated-owned-tree-term-kill",
  250
);
const BOOTSTRAP_FIXED_DIRECT_SIGNAL = nullRecord([
  ["kind", BOOTSTRAP_BOUNDED_ABORT_SIGNAL_POLICY_KIND],
  ["signalApi", "child-process-handle-only"],
  ["spawnEventRequired", true],
  ["termGraceMs", 5000],
  ["killGraceMs", 5000],
  ["handleCloseTimeoutMs", 3000],
  ["revalidateBeforeTerm", false],
  ["revalidateBeforeKill", false]
]);

function descriptor({
  argvTemplate,
  browserCapable,
  commandId,
  cwdBinding,
  environmentBinding,
  executableBinding,
  execution,
  outputPolicy,
  processTreeOwned,
  readiness = NO_READINESS,
  sanitizedOutputClass,
  signalPolicy: commandSignalPolicy,
  timeoutMs
}) {
  return nullRecord([
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
    ["signalPolicy", commandSignalPolicy],
    ["timeoutMs", timeoutMs]
  ]);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export const REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS = Object.freeze([
  descriptor({
    commandId: "owner.next.build",
    argvTemplate: argv(validatedBinding("next-cli"), literal("build")),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "runner-main",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_C64,
    processTreeOwned: true,
    sanitizedOutputClass: "next-build-evidence",
    signalPolicy: RUNNER_TREE_SIGNAL,
    timeoutMs: 600000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.next.service",
    argvTemplate: argv(
      validatedBinding("next-cli"),
      literal("start"),
      literal("--hostname"),
      literal("127.0.0.1"),
      literal("--port"),
      validatedBinding("service-port")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "runner-main",
    execution: "owned-service",
    outputPolicy: OUTPUT_C64,
    processTreeOwned: true,
    readiness: SERVICE_READINESS,
    sanitizedOutputClass: "next-service-evidence",
    signalPolicy: RUNNER_TREE_SIGNAL,
    timeoutMs: "service-lifetime",
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.playwright.discovery",
    argvTemplate: argv(
      validatedBinding("playwright-test-cli"),
      literal("test"),
      literal("--config"),
      validatedBinding("required-config-path"),
      literal("--list"),
      literal("--reporter=line")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "runner-main",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_B16,
    processTreeOwned: false,
    sanitizedOutputClass: "playwright-discovery-evidence",
    signalPolicy: RUNNER_DIRECT_SIGNAL,
    timeoutMs: 120000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.playwright.final",
    argvTemplate: argv(
      validatedBinding("playwright-test-cli"),
      literal("test"),
      literal("--config"),
      validatedBinding("required-config-path")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "runner-main",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_C64,
    processTreeOwned: true,
    sanitizedOutputClass: "playwright-final-evidence",
    signalPolicy: RUNNER_TREE_SIGNAL,
    timeoutMs: 900000,
    browserCapable: true
  }),
  descriptor({
    commandId: "owner.audit.process-table",
    argvTemplate: argv(
      literal("-axo"),
      literal("pid=,ppid=,pgid=,lstart=,command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: RUNNER_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.audit.pid-environment",
    argvTemplate: argv(
      literal("eww"),
      literal("-p"),
      validatedBinding("owned-process-pid"),
      literal("-o"),
      literal("command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A4,
    processTreeOwned: false,
    sanitizedOutputClass: "pid-environment-evidence",
    signalPolicy: RUNNER_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.audit.owner-token-table",
    argvTemplate: argv(
      literal("eww"),
      literal("-axo"),
      literal("pid=,command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: RUNNER_REPOSITORY_CWD,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: RUNNER_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.probe.which-npm",
    argvTemplate: argv(literal("npm")),
    executableBinding: WHICH_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "npm-cli-identity-evidence",
    signalPolicy: BOOTSTRAP_FIXED_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.audit.process-table-preflight",
    argvTemplate: argv(literal("-axo"), literal("pid=,ppid=,command=")),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: BOOTSTRAP_FIXED_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.audit.owner-token-table-preflight",
    argvTemplate: argv(
      literal("eww"),
      literal("-axo"),
      literal("pid=,command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-bootstrap-base",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A32,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: BOOTSTRAP_FIXED_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.source.git-status",
    argvTemplate: argv(
      literal("status"),
      literal("--short"),
      literal("--untracked-files=all")
    ),
    executableBinding: GIT_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-bootstrap-git",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "git-status-evidence",
    signalPolicy: BOOTSTRAP_FIXED_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.source.git-head",
    argvTemplate: argv(literal("rev-parse"), literal("HEAD")),
    executableBinding: GIT_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-bootstrap-git",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "git-head-evidence",
    signalPolicy: BOOTSTRAP_FIXED_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.audit.process-table-owned",
    argvTemplate: argv(
      literal("-axo"),
      literal("pid=,ppid=,pgid=,lstart=,command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A16,
    processTreeOwned: false,
    sanitizedOutputClass: "process-table-evidence",
    signalPolicy: PROVISION_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.audit.owner-token-table-owned",
    argvTemplate: argv(
      literal("eww"),
      literal("-axo"),
      literal("pid=,command=")
    ),
    executableBinding: PS_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "owned-audit",
    execution: "finite-direct-child",
    outputPolicy: OUTPUT_A32,
    processTreeOwned: false,
    sanitizedOutputClass: "owner-token-table-evidence",
    signalPolicy: PROVISION_DIRECT_SIGNAL,
    timeoutMs: 30000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.cache-verify",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("cache"),
      literal("verify")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: INITIAL_INSTALL_CWD,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-cache-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 180000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.ci-prefer-offline",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("ci"),
      literal("--prefer-offline"),
      literal("--no-audit"),
      literal("--no-fund"),
      literal("--ignore-scripts")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: INITIAL_INSTALL_CWD,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-install-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 2700000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.ls-provision-staged",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("ls"),
      literal("--all"),
      literal("--json")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: INITIAL_INSTALL_CWD,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 300000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.ls-provision-active",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("ls"),
      literal("--all"),
      literal("--json")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-attempt-initial",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 300000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.ls-requalification-staged",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("ls"),
      literal("--all"),
      literal("--json")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: REQUALIFICATION_INSTALL_CWD,
    environmentBinding: "provision-attempt-requalification",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 300000,
    browserCapable: false
  }),
  descriptor({
    commandId: "owner.dependency.npm.ls-requalification-active",
    argvTemplate: argv(
      validatedBinding("npm-cli"),
      literal("ls"),
      literal("--all"),
      literal("--json")
    ),
    executableBinding: NODE_EXECUTABLE,
    cwdBinding: PROVISION_REPOSITORY_CWD,
    environmentBinding: "provision-attempt-requalification",
    execution: "finite-owned-process",
    outputPolicy: OUTPUT_B64,
    processTreeOwned: true,
    sanitizedOutputClass: "npm-tree-evidence",
    signalPolicy: PROVISION_TREE_SIGNAL,
    timeoutMs: 300000,
    browserCapable: false
  })
].sort((left, right) => compareCodeUnits(left.commandId, right.commandId)));

export const REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS = nullRecord([
  [
    "environmentInventory",
    "required-browser-owned-process-environment-inventory-v1"
  ],
  ["launchReceipt", "required-browser-owned-process-launch-receipt-v1"],
  ["auditReceipt", "required-browser-owned-process-audit-v1"],
  ["outcomeReceipt", "required-browser-owned-process-outcome-receipt-v1"],
  [
    "lifecycleAuditReceipt",
    "required-browser-owned-lifecycle-audit-receipt-v1"
  ]
]);

const ownedProcessDescriptorById = new Map(
  REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS.map((descriptor) => [
    descriptor.commandId,
    descriptor
  ])
);
const ownedProcessDescriptorFingerprintEntries = OBJECT_FREEZE(
  REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS.map((descriptor) =>
    nullRecord([
      ["commandId", descriptor.commandId],
      [
        "descriptorFingerprint",
        hashCanonicalProof(OWNED_PROCESS_COMMAND_DESCRIPTOR_DOMAIN, descriptor)
      ]
    ])
  )
);
const ownedProcessDescriptorFingerprintEntryById = new Map(
  ownedProcessDescriptorFingerprintEntries.map((entry) => [
    entry.commandId,
    entry
  ])
);
const bootstrapCommandDescriptorFingerprintEntries = OBJECT_FREEZE(
  BOOTSTRAP_COMMAND_IDS.map((commandId) => {
    const entry = ownedProcessDescriptorFingerprintEntryById.get(commandId);
    if (!entry || !ownedProcessDescriptorById.has(commandId)) {
      throw new Error("Required-browser bootstrap descriptor is missing.");
    }
    return entry;
  })
);

export const REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS = nullRecord([
  [
    "bootstrapScopeFingerprint",
    hashCanonicalProof(
      BOOTSTRAP_SCOPE_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["commandIds", BOOTSTRAP_COMMAND_IDS]
      ])
    )
  ],
  [
    "bootstrapCommandCatalogFingerprint",
    hashCanonicalProof(
      BOOTSTRAP_COMMAND_CATALOG_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["descriptors", bootstrapCommandDescriptorFingerprintEntries]
      ])
    )
  ],
  [
    "ownedProcessCatalogFingerprint",
    hashCanonicalProof(
      OWNED_PROCESS_CATALOG_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["descriptors", ownedProcessDescriptorFingerprintEntries]
      ])
    )
  ]
]);

function launcherRepositoryRoot() {
  let launcherSourcePath;
  try {
    launcherSourcePath = fileURLToPath(import.meta.url);
  } catch {
    staticBindingFailure();
  }
  if (
    basename(launcherSourcePath) !== LAUNCHER_SOURCE_BASENAME
    || basename(dirname(launcherSourcePath)) !== "scripts"
    || stableRealpath(launcherSourcePath) !== launcherSourcePath
  ) {
    staticBindingFailure();
  }
  const repositoryRoot = dirname(dirname(launcherSourcePath));
  if (stableRealpath(repositoryRoot) !== repositoryRoot) {
    staticBindingFailure();
  }
  return repositoryRoot;
}

function buildLinkedWorktreeRepositoryBinding() {
  if (typeof process.getuid !== "function") staticBindingFailure();
  let currentUid;
  try {
    currentUid = BigInt(process.getuid());
  } catch {
    staticBindingFailure();
  }
  const filesystemRoot = stableLstat("/");
  if (!filesystemRoot || !filesystemRoot.isDirectory()) {
    staticBindingFailure();
  }
  const volume = observeDirectory(
    STARSHIP_VOLUME_ROOT,
    "volume-root",
    currentUid,
    undefined,
    false,
    true
  );
  if (filesystemRoot.dev === volume.dev) staticBindingFailure();

  const repositoryRoot = launcherRepositoryRoot();
  const repositoryRelative = relative(STARSHIP_VOLUME_ROOT, repositoryRoot);
  if (
    repositoryRelative.length === 0
    || repositoryRelative === ".."
    || repositoryRelative.startsWith(`..${String.fromCharCode(47)}`)
    || isAbsolute(repositoryRelative)
  ) {
    staticBindingFailure();
  }
  const repository = observeDirectory(
    repositoryRoot,
    "repository-root",
    currentUid,
    volume.dev,
    true
  );
  const tmpBasePath = join(repositoryRoot, ".tmp");
  const tmpBase = observeDirectory(
    tmpBasePath,
    "tmp-base",
    currentUid,
    repository.dev,
    true
  );

  const gitLinkPath = join(repositoryRoot, ".git");
  const gitLink = observeRegularFile(
    gitLinkPath,
    "repository-git-link",
    currentUid,
    repository.dev,
    4096
  );
  const gitLinkText = decodeExactUtf8(gitLink.bytes);
  const gitLinkMatch = REFLECT_APPLY(
    REGEXP_EXEC,
    /^gitdir: (\/[^\u0000\r\n]+)\n$/u,
    [gitLinkText]
  );
  if (!gitLinkMatch) staticBindingFailure();
  const worktreeGitDirectoryPath = gitLinkMatch[1];
  if (
    !isAbsolute(worktreeGitDirectoryPath)
    || resolve(worktreeGitDirectoryPath) !== worktreeGitDirectoryPath
    || stableRealpath(worktreeGitDirectoryPath) !== worktreeGitDirectoryPath
  ) {
    staticBindingFailure();
  }
  const worktreeGitDirectory = observeDirectory(
    worktreeGitDirectoryPath,
    "worktree-git-directory",
    currentUid,
    repository.dev,
    true
  );

  const gitdirBacklinkPath = join(worktreeGitDirectoryPath, "gitdir");
  const gitdirBacklink = observeRegularFile(
    gitdirBacklinkPath,
    "worktree-gitdir-backlink",
    currentUid,
    repository.dev,
    4096
  );
  if (decodeExactUtf8(gitdirBacklink.bytes) !== `${gitLinkPath}\n`) {
    staticBindingFailure();
  }

  const commondirFilePath = join(worktreeGitDirectoryPath, "commondir");
  const commondirFile = observeRegularFile(
    commondirFilePath,
    "worktree-commondir-file",
    currentUid,
    repository.dev,
    4096
  );
  if (decodeExactUtf8(commondirFile.bytes) !== "../..\n") {
    staticBindingFailure();
  }
  const commonGitDirectoryPath = resolve(worktreeGitDirectoryPath, "../..");
  if (
    basename(commonGitDirectoryPath) !== ".git"
    || stableRealpath(commonGitDirectoryPath) !== commonGitDirectoryPath
    || dirname(worktreeGitDirectoryPath)
      !== join(commonGitDirectoryPath, "worktrees")
  ) {
    staticBindingFailure();
  }
  const commonGitDirectory = observeDirectory(
    commonGitDirectoryPath,
    "common-git-directory",
    currentUid,
    repository.dev,
    true
  );

  const linkedWorktreeGitBindingFingerprint = hashCanonicalProof(
    LINKED_WORKTREE_GIT_BINDING_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["kind", "linked-worktree"],
      ["repositoryRootPathFingerprint", repository.pathFingerprint],
      ["gitLinkFileIdentityFingerprint", gitLink.identityFingerprint],
      [
        "declaredWorktreeGitDirectoryPathFingerprint",
        worktreeGitDirectory.pathFingerprint
      ],
      [
        "worktreeGitDirectoryIdentityFingerprint",
        worktreeGitDirectory.identityFingerprint
      ],
      [
        "gitdirBacklinkFileIdentityFingerprint",
        gitdirBacklink.identityFingerprint
      ],
      ["declaredWorktreeGitLinkPathFingerprint", gitLink.pathFingerprint],
      ["commondirFileIdentityFingerprint", commondirFile.identityFingerprint],
      [
        "declaredCommonGitDirectoryPathFingerprint",
        commonGitDirectory.pathFingerprint
      ],
      [
        "commonGitDirectoryIdentityFingerprint",
        commonGitDirectory.identityFingerprint
      ]
    ])
  );

  const repositoryBinding = nullRecord([
    ["schemaVersion", 1],
    ["repoRootPathFingerprint", repository.pathFingerprint],
    ["repoRootIdentityFingerprint", repository.identityFingerprint],
    ["gitDirectoryIdentityFingerprint", linkedWorktreeGitBindingFingerprint],
    ["tmpBaseIdentityFingerprint", tmpBase.identityFingerprint],
    ["volumeRootPathFingerprint", volume.pathFingerprint],
    ["volumeDevice", volume.dev.toString(10)]
  ]);
  return {
    repositoryBinding,
    repositoryBindingFingerprint: hashCanonicalProof(
      REPOSITORY_BINDING_DOMAIN,
      repositoryBinding
    ),
    repositoryDev: repository.dev,
    repositoryIdentityFingerprint: repository.identityFingerprint,
    repositoryRoot,
    repositoryUid: repository.uid,
    tmpBaseIdentityFingerprint: tmpBase.identityFingerprint,
    tmpBasePath
  };
}

function sourceInputSha256(
  repositoryRoot,
  repositoryUid,
  repositoryDev,
  relativePath
) {
  const exactPath = resolve(repositoryRoot, relativePath);
  const backReference = relative(repositoryRoot, exactPath);
  if (
    backReference.length === 0
    || backReference === ".."
    || backReference.startsWith(`..${String.fromCharCode(47)}`)
    || isAbsolute(backReference)
  ) {
    staticBindingFailure();
  }
  return readStableRegularFile(
    exactPath,
    repositoryUid,
    repositoryDev,
    64 * 1024 * 1024,
    false
  ).rawByteSha256;
}

function buildSourceSeedFingerprint(repositoryObservation) {
  const sourceSha256 = (relativePath) => sourceInputSha256(
    repositoryObservation.repositoryRoot,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    relativePath
  );
  return hashCanonicalProof(
    SOURCE_SEED_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["packageJsonSha256", sourceSha256("package.json")],
      ["packageLockJsonSha256", sourceSha256("package-lock.json")],
      [
        "proofPrimitivesSourceFingerprint",
        sourceSha256("scripts/required-browser-proof-primitives.mjs")
      ],
      [
        "liveHomeSourceFingerprint",
        sourceSha256("scripts/live-home-protection.mjs")
      ],
      [
        "authoritySourceFingerprint",
        sourceSha256(
          "scripts/required-browser-provision-attempt-authority.mjs"
        )
      ],
      [
        "launcherSourceFingerprint",
        sourceSha256("scripts/required-browser-owned-process-launch.mjs")
      ],
      [
        "provisionerSourceFingerprint",
        sourceSha256("scripts/provision-exact-browser-dependencies.mjs")
      ]
    ])
  );
}

function buildStableBootstrapStaticObservation() {
  const firstRepositoryObservation = buildLinkedWorktreeRepositoryBinding();
  const firstSourceSeedFingerprint = buildSourceSeedFingerprint(
    firstRepositoryObservation
  );
  const finalRepositoryObservation = buildLinkedWorktreeRepositoryBinding();
  const finalSourceSeedFingerprint = buildSourceSeedFingerprint(
    finalRepositoryObservation
  );
  if (
    firstRepositoryObservation.repositoryBindingFingerprint
      !== finalRepositoryObservation.repositoryBindingFingerprint
    || firstSourceSeedFingerprint !== finalSourceSeedFingerprint
  ) {
    staticBindingFailure();
  }
  return {
    repositoryObservation: finalRepositoryObservation,
    sourceSeedFingerprint: finalSourceSeedFingerprint
  };
}

function initialProvisionRootRelativePath(attemptId) {
  if (!isLowerHex64(attemptId)) bootstrapFinalizationFailure();
  return `.tmp/dependency-provision-${attemptId}`;
}

function assertProvisionRootAbsent(repositoryRoot, relativePath, failure) {
  const provisionRoot = join(repositoryRoot, relativePath);
  if (
    !isAbsolute(provisionRoot)
    || resolve(provisionRoot) !== provisionRoot
    || relative(repositoryRoot, provisionRoot) !== relativePath
    || stableLstat(provisionRoot) !== undefined
  ) {
    failure();
  }
  return provisionRoot;
}

export function createRequiredBrowserProvisionBootstrapStaticBinding() {
  const stableObservation = buildStableBootstrapStaticObservation();
  const result = nullRecord([
    ["schemaVersion", 1],
    [
      "repositoryBindingFingerprint",
      stableObservation.repositoryObservation.repositoryBindingFingerprint
    ],
    [
      "sourceSeedFingerprint",
      stableObservation.sourceSeedFingerprint
    ],
    [
      "bootstrapScopeFingerprint",
      REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
        .bootstrapScopeFingerprint
    ],
    [
      "bootstrapCommandCatalogFingerprint",
      REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
        .bootstrapCommandCatalogFingerprint
    ],
    [
      "ownedProcessCatalogFingerprint",
      REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS
        .ownedProcessCatalogFingerprint
    ]
  ]);
  return result;
}

function currentOwnHomeValue(liveHomeProof) {
  assertLiveHomeProof(liveHomeProof);
  const environment = process.env;
  if (
    environment === null
    || typeof environment !== "object"
    || IS_PROXY(environment)
  ) {
    bootstrapOperationFailure();
  }
  let homeDescriptor;
  try {
    homeDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(environment, "HOME");
  } catch {
    bootstrapOperationFailure();
  }
  if (
    !homeDescriptor
    || !OBJECT_HAS_OWN(homeDescriptor, "value")
    || !homeDescriptor.enumerable
    || typeof homeDescriptor.value !== "string"
  ) {
    bootstrapOperationFailure();
  }
  const homeValue = homeDescriptor.value;
  const homeValueSha256 = hashEnvironmentText("HOME", homeValue);
  if (homeValueSha256 !== liveHomeValueSha256(liveHomeProof)) {
    bootstrapOperationFailure();
  }
  return { homeValue, homeValueSha256 };
}

function buildBootstrapEnvironment(liveHomeProof, commandId) {
  if (!BOOTSTRAP_COMMAND_IDS.includes(commandId)) {
    bootstrapOperationFailure();
  }
  const { homeValue, homeValueSha256 } = currentOwnHomeValue(liveHomeProof);
  const nodeExecutable = stableRealpath(process.execPath);
  if (!isAbsolute(nodeExecutable) || resolve(nodeExecutable) !== nodeExecutable) {
    bootstrapOperationFailure();
  }
  const definitions = [
    ["HOME", "live-home", homeValue],
    [
      "PATH",
      "derived",
      `${dirname(nodeExecutable)}:/usr/bin:/bin:/usr/sbin:/sbin`
    ],
    ["LC_ALL", "fixed", "C"]
  ];
  if (BOOTSTRAP_GIT_COMMAND_IDS.has(commandId)) {
    definitions.push(
      ["GIT_CONFIG_GLOBAL", "fixed", "/dev/null"],
      ["GIT_CONFIG_NOSYSTEM", "fixed", "1"],
      ["GIT_OPTIONAL_LOCKS", "fixed", "0"],
      ["GIT_PAGER", "fixed", "cat"],
      ["GIT_TERMINAL_PROMPT", "fixed", "0"]
    );
  }
  definitions.sort((left, right) => compareCodeUnits(left[0], right[0]));
  const childEnvironment = nullRecord(
    definitions.map(([key, , value]) => [key, value])
  );
  const entries = OBJECT_FREEZE(
    definitions.map(([key, source, value]) => nullRecord([
      ["key", key],
      ["source", source],
      ["presence", "present"],
      ["valueSha256", hashEnvironmentText(key, value)]
    ]))
  );
  const inventoryFingerprint = hashCanonicalProof(
    BOOTSTRAP_ENVIRONMENT_INVENTORY_DOMAIN,
    nullRecord([
      ["schemaVersion", 2],
      ["environmentHashSchemaVersion", 2],
      ["commandId", commandId],
      ["entries", entries]
    ])
  );
  const publicEnvelope = nullRecord([
    ["schemaVersion", 1],
    ["commandId", commandId],
    ["environmentHashSchemaVersion", 2],
    ["requiresLiveHomeProtection", true],
    ["homeValueSha256", homeValueSha256],
    ["signalAuthority", false],
    ["inventoryFingerprint", inventoryFingerprint]
  ]);
  assertNoLiveHomeRetention(liveHomeProof, publicEnvelope);
  return {
    childEnvironment,
    inventoryFingerprint,
    publicEnvelope
  };
}

function buildBootstrapEnvironmentInventorySet(liveHomeProof) {
  const fingerprintFields = [];
  const inventoryLinks = [];
  for (const commandId of BOOTSTRAP_COMMAND_IDS) {
    const inventory = buildBootstrapEnvironment(liveHomeProof, commandId);
    fingerprintFields.push([commandId, inventory.inventoryFingerprint]);
    inventoryLinks.push(nullRecord([
      ["commandId", commandId],
      ["inventoryFingerprint", inventory.inventoryFingerprint]
    ]));
  }
  const fingerprints = nullRecord(fingerprintFields);
  const setFingerprint = hashCanonicalProof(
    BOOTSTRAP_ENVIRONMENT_INVENTORY_SET_DOMAIN,
    nullRecord([
      ["schemaVersion", 2],
      ["inventories", OBJECT_FREEZE(inventoryLinks)]
    ])
  );
  assertNoLiveHomeRetention(liveHomeProof, fingerprints);
  return { fingerprints, setFingerprint };
}

export function registerRequiredBrowserProvisionBootstrapLaunchContext(
  liveHomeProof,
  bootstrapAuthority,
  context
) {
  assertLiveHomeProof(liveHomeProof);
  const authorityBinding =
    readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
      liveHomeProof,
      bootstrapAuthority
    );
  if (bootstrapLaunchContexts.has(bootstrapAuthority)) {
    registrationFailure();
  }

  const registrationState = {
    context: undefined,
    status: "reserved"
  };
  bootstrapLaunchContexts.set(bootstrapAuthority, registrationState);
  try {
    const staticBinding =
      createRequiredBrowserProvisionBootstrapStaticBinding();
    const staticObservation = buildStableBootstrapStaticObservation();
    if (
      staticObservation.repositoryObservation.repositoryBindingFingerprint
        !== staticBinding.repositoryBindingFingerprint
      || staticObservation.sourceSeedFingerprint
        !== staticBinding.sourceSeedFingerprint
    ) {
      registrationFailure();
    }
    if (
      authorityBinding.bootstrapScopeFingerprint
        !== staticBinding
          .bootstrapScopeFingerprint
      || authorityBinding.bootstrapCommandCatalogFingerprint
        !== staticBinding
          .bootstrapCommandCatalogFingerprint
      || authorityBinding.ownedProcessCatalogFingerprint
        !== staticBinding
          .ownedProcessCatalogFingerprint
      || authorityBinding.sourceSeedFingerprint
        !== staticBinding.sourceSeedFingerprint
    ) {
      registrationFailure();
    }
    const validatedContext = validateBootstrapRegistrationContext(context);
    if (
      validatedContext.sourceSeedFingerprint
        !== authorityBinding.sourceSeedFingerprint
      || validatedContext.repositoryBindingFingerprint
        !== staticBinding.repositoryBindingFingerprint
    ) {
      registrationFailure();
    }
    const environmentInventorySet =
      buildBootstrapEnvironmentInventorySet(liveHomeProof);
    const authorityBindingFingerprint = hashCanonicalProof(
      BOOTSTRAP_AUTHORITY_BINDING_DOMAIN,
      authorityBinding
    );
    const registrationContextFingerprint = hashCanonicalProof(
      BOOTSTRAP_REGISTRATION_CONTEXT_DOMAIN,
      validatedContext
    );
    const provisionRootRelativePath = authorityBinding.mode === "initial"
      ? initialProvisionRootRelativePath(authorityBinding.attemptId)
      : undefined;
    if (provisionRootRelativePath !== undefined) {
      assertProvisionRootAbsent(
        staticObservation.repositoryObservation.repositoryRoot,
        provisionRootRelativePath,
        registrationFailure
      );
    }
    const retainedContext = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", authorityBinding.attemptId],
      ["mode", authorityBinding.mode],
      ["bootstrapAuthorityBindingFingerprint", authorityBindingFingerprint],
      ["sourceSeedFingerprint", authorityBinding.sourceSeedFingerprint],
      [
        "repositoryBindingFingerprint",
        validatedContext.repositoryBindingFingerprint
      ],
      [
        "repositoryRootIdentityFingerprint",
        staticObservation.repositoryObservation.repositoryIdentityFingerprint
      ],
      [
        "tmpBaseIdentityFingerprint",
        staticObservation.repositoryObservation.tmpBaseIdentityFingerprint
      ],
      [
        "bootstrapScopeFingerprint",
        authorityBinding.bootstrapScopeFingerprint
      ],
      [
        "bootstrapCommandCatalogFingerprint",
        authorityBinding.bootstrapCommandCatalogFingerprint
      ],
      [
        "ownedProcessCatalogFingerprint",
        authorityBinding.ownedProcessCatalogFingerprint
      ],
      [
        "bootstrapEnvironmentInventorySetFingerprint",
        environmentInventorySet.setFingerprint
      ],
      ["registrationContextFingerprint", registrationContextFingerprint],
      ["provisionRootRelativePath", provisionRootRelativePath]
    ]);
    assertNoLiveHomeRetention(liveHomeProof, retainedContext);
    registrationState.context = retainedContext;
    registrationState.environmentInventoryFingerprints =
      environmentInventorySet.fingerprints;
    registrationState.inFlightCommandId = undefined;
    registrationState.receipts = new Map();
    registrationState.results = new Map();
    registrationState.slots = new Map(
      BOOTSTRAP_COMMAND_IDS.map((commandId) => [commandId, "pending"])
    );
    registrationState.status = "registered";
  } catch (error) {
    registrationState.context = undefined;
    registrationState.status = "failed";
    throw error;
  }
}

function bootstrapResultDomain(commandId) {
  switch (commandId) {
    case "owner.dependency.probe.which-npm":
      return BOOTSTRAP_WHICH_NPM_RESULT_DOMAIN;
    case "owner.dependency.audit.process-table-preflight":
      return BOOTSTRAP_PROCESS_TABLE_RESULT_DOMAIN;
    case "owner.dependency.audit.owner-token-table-preflight":
      return BOOTSTRAP_OWNER_TOKEN_TABLE_RESULT_DOMAIN;
    case "owner.dependency.source.git-status":
      return BOOTSTRAP_GIT_STATUS_RESULT_DOMAIN;
    case "owner.dependency.source.git-head":
      return BOOTSTRAP_GIT_HEAD_RESULT_DOMAIN;
    default:
      bootstrapOperationFailure();
  }
}

function bootstrapReceiptDomain(commandId) {
  switch (commandId) {
    case "owner.dependency.probe.which-npm":
      return BOOTSTRAP_WHICH_NPM_RECEIPT_DOMAIN;
    case "owner.dependency.audit.process-table-preflight":
      return BOOTSTRAP_PROCESS_TABLE_RECEIPT_DOMAIN;
    case "owner.dependency.audit.owner-token-table-preflight":
      return BOOTSTRAP_OWNER_TOKEN_TABLE_RECEIPT_DOMAIN;
    case "owner.dependency.source.git-status":
      return BOOTSTRAP_GIT_STATUS_RECEIPT_DOMAIN;
    case "owner.dependency.source.git-head":
      return BOOTSTRAP_GIT_HEAD_RECEIPT_DOMAIN;
    default:
      bootstrapOperationFailure();
  }
}

function failBootstrapOperationState(state) {
  if (state) {
    state.inFlightCommandId = undefined;
    state.npmCliPrivateBinding = undefined;
    state.status = "failed";
  }
}

function reserveBootstrapOperation(
  liveHomeProof,
  bootstrapAuthority,
  commandId
) {
  assertLiveHomeProof(liveHomeProof);
  const authorityBinding =
    readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
      liveHomeProof,
      bootstrapAuthority
    );
  const state = bootstrapLaunchContexts.get(bootstrapAuthority);
  if (!state) bootstrapOperationFailure();
  if (
    (state.status !== "registered" && state.status !== "collecting")
    || state.inFlightCommandId !== undefined
    || state.slots?.get(commandId) !== "pending"
    || state.context?.attemptId !== authorityBinding.attemptId
    || state.context?.mode !== authorityBinding.mode
  ) {
    failBootstrapOperationState(state);
    bootstrapOperationFailure();
  }
  state.inFlightCommandId = commandId;
  state.slots.set(commandId, "in-flight");
  state.status = "collecting";
  return { authorityBinding, state };
}

function bootstrapDescriptor(commandId) {
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorFingerprint =
    ownedProcessDescriptorFingerprintEntryById.get(commandId)
      ?.descriptorFingerprint;
  if (
    !descriptor
    || !descriptorFingerprint
    || !BOOTSTRAP_COMMAND_IDS.includes(commandId)
    || descriptor.cwdBinding.kind !== "provision-repository-root"
    || descriptor.execution !== "finite-direct-child"
    || descriptor.processTreeOwned !== false
    || descriptor.browserCapable !== false
    || typeof descriptor.timeoutMs !== "number"
    || descriptor.timeoutMs !== 30000
    || descriptor.executableBinding.kind !== "fixed-system-executable"
    || descriptor.signalPolicy !== BOOTSTRAP_FIXED_DIRECT_SIGNAL
  ) {
    bootstrapOperationFailure();
  }
  const args = [];
  for (const token of descriptor.argvTemplate) {
    if (token.kind !== "literal" || typeof token.value !== "string") {
      bootstrapOperationFailure();
    }
    args.push(token.value);
  }
  let stdoutMaxBytes;
  let stderrMaxBytes;
  if (descriptor.outputPolicy.kind === "buffered-parse") {
    stdoutMaxBytes = descriptor.outputPolicy.stdoutMaxBytes;
    stderrMaxBytes = descriptor.outputPolicy.stderrMaxBytes;
  } else {
    bootstrapOperationFailure();
  }
  return {
    args,
    descriptor,
    descriptorFingerprint,
    executable: descriptor.executableBinding.absolutePath,
    stderrMaxBytes,
    stdoutMaxBytes
  };
}

function trustedRegularFileObservation(exactPath, maxBytes) {
  const initial = stableLstat(exactPath);
  if (!initial || !initial.isFile() || initial.isSymbolicLink()) {
    bootstrapOperationFailure();
  }
  let currentUid;
  try {
    currentUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : -1n;
  } catch {
    bootstrapOperationFailure();
  }
  if (initial.uid !== 0n && initial.uid !== currentUid) {
    bootstrapOperationFailure();
  }
  return readStableRegularFile(
    exactPath,
    initial.uid,
    initial.dev,
    maxBytes,
    false
  );
}

function observeFixedSystemExecutable(exactPath) {
  if (!isAbsolute(exactPath) || resolve(exactPath) !== exactPath) {
    bootstrapOperationFailure();
  }
  const initial = stableLstat(exactPath);
  if (
    !initial
    || !initial.isFile()
    || initial.isSymbolicLink()
    || initial.uid !== 0n
    || (initial.mode & 0o111n) === 0n
  ) {
    bootstrapOperationFailure();
  }
  const observation = readStableRegularFile(
    exactPath,
    0n,
    initial.dev,
    32 * 1024 * 1024,
    false,
    false
  );
  const pathFingerprint = hashCanonicalProof(
    CANONICAL_EXECUTABLE_PATH_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["canonicalPath", exactPath]
    ])
  );
  return hashCanonicalProof(
    OWNED_PROCESS_EXECUTABLE_IDENTITY_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["pathFingerprint", pathFingerprint],
      ["type", "regular-file"],
      ["dev", observation.entry.dev.toString(10)],
      ["ino", observation.entry.ino.toString(10)],
      ["mode", observation.entry.mode.toString(10)],
      ["uid", observation.entry.uid.toString(10)],
      ["gid", observation.entry.gid.toString(10)],
      ["nlink", observation.entry.nlink.toString(10)],
      ["contentSha256", observation.rawByteSha256]
    ])
  );
}

function observeLauncherNodeRuntime() {
  const canonicalPath = stableRealpath(process.execPath);
  if (!isAbsolute(canonicalPath) || resolve(canonicalPath) !== canonicalPath) {
    bootstrapFinalizationFailure();
  }
  const observation = trustedRegularFileObservation(
    canonicalPath,
    512 * 1024 * 1024
  );
  if ((observation.entry.mode & 0o111n) === 0n) {
    bootstrapFinalizationFailure();
  }
  const pathFingerprint = hashCanonicalProof(
    CANONICAL_EXECUTABLE_PATH_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["canonicalPath", canonicalPath]
    ])
  );
  const identityFingerprint = hashCanonicalProof(
    OWNED_PROCESS_EXECUTABLE_IDENTITY_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["pathFingerprint", pathFingerprint],
      ["type", "regular-file"],
      ["dev", observation.entry.dev.toString(10)],
      ["ino", observation.entry.ino.toString(10)],
      ["mode", observation.entry.mode.toString(10)],
      ["uid", observation.entry.uid.toString(10)],
      ["gid", observation.entry.gid.toString(10)],
      ["nlink", observation.entry.nlink.toString(10)],
      ["contentSha256", observation.rawByteSha256]
    ])
  );
  return {
    canonicalPath,
    contentSha256: observation.rawByteSha256,
    identityFingerprint
  };
}

function observeBoundNpmCli(privateBinding, expectedPublicBinding) {
  if (
    !privateBinding
    || typeof privateBinding.npmCliPath !== "string"
    || typeof privateBinding.npmManifestPath !== "string"
    || stableRealpath(privateBinding.npmCliPath) !== privateBinding.npmCliPath
    || stableRealpath(privateBinding.npmManifestPath)
      !== privateBinding.npmManifestPath
  ) {
    attemptOperationFailure();
  }
  const cliObservation = trustedRegularFileObservation(
    privateBinding.npmCliPath,
    16 * 1024 * 1024
  );
  const pathFingerprint = hashCanonicalProof(
    BOOTSTRAP_NPM_CLI_PATH_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["canonicalPath", privateBinding.npmCliPath]
    ])
  );
  const physicalIdentityFingerprint = hashCanonicalProof(
    BOOTSTRAP_NPM_CLI_IDENTITY_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["pathFingerprint", pathFingerprint],
      ["type", "regular-file"],
      ["dev", cliObservation.entry.dev.toString(10)],
      ["ino", cliObservation.entry.ino.toString(10)],
      ["mode", cliObservation.entry.mode.toString(10)],
      ["uid", cliObservation.entry.uid.toString(10)],
      ["gid", cliObservation.entry.gid.toString(10)],
      ["nlink", cliObservation.entry.nlink.toString(10)],
      ["contentSha256", cliObservation.rawByteSha256]
    ])
  );
  const manifestObservation = trustedRegularFileObservation(
    privateBinding.npmManifestPath,
    2 * 1024 * 1024
  );
  let manifest;
  try {
    manifest = JSON.parse(decodeExactUtf8(manifestObservation.bytes));
  } catch {
    attemptOperationFailure();
  }
  if (
    manifest === null
    || typeof manifest !== "object"
    || Array.isArray(manifest)
    || manifest.name !== "npm"
    || manifest.version !== privateBinding.npmVersion
    || manifestObservation.rawByteSha256
      !== privateBinding.npmManifestContentSha256
    || pathFingerprint !== expectedPublicBinding.npmCliPathFingerprint
    || physicalIdentityFingerprint
      !== expectedPublicBinding.npmCliPhysicalIdentityFingerprint
    || cliObservation.rawByteSha256 !== expectedPublicBinding.npmCliContentSha256
    || manifest.version !== expectedPublicBinding.npmVersion
  ) {
    attemptOperationFailure();
  }
  return {
    contentSha256: cliObservation.rawByteSha256,
    npmCliPath: privateBinding.npmCliPath,
    pathFingerprint,
    physicalIdentityFingerprint,
    version: manifest.version
  };
}

function parseWhichNpmResult(stdout) {
  const text = decodeExactUtf8(stdout);
  const match = REFLECT_APPLY(
    REGEXP_EXEC,
    /^(\/[\u0020-\u007e]+)\n$/u,
    [text]
  );
  if (!match) bootstrapOperationFailure();
  const reportedPath = match[1];
  if (!isAbsolute(reportedPath) || resolve(reportedPath) !== reportedPath) {
    bootstrapOperationFailure();
  }
  const npmCliPath = stableRealpath(reportedPath);
  if (!isAbsolute(npmCliPath) || resolve(npmCliPath) !== npmCliPath) {
    bootstrapOperationFailure();
  }
  const cliObservation = trustedRegularFileObservation(
    npmCliPath,
    16 * 1024 * 1024
  );
  const npmPackageRoot = dirname(dirname(npmCliPath));
  if (
    basename(dirname(npmCliPath)) !== "bin"
    || basename(npmCliPath) !== "npm-cli.js"
  ) {
    bootstrapOperationFailure();
  }
  const npmManifestPath = join(npmPackageRoot, "package.json");
  if (stableRealpath(npmManifestPath) !== npmManifestPath) {
    bootstrapOperationFailure();
  }
  const manifestObservation = trustedRegularFileObservation(
    npmManifestPath,
    2 * 1024 * 1024
  );
  let manifest;
  try {
    manifest = JSON.parse(decodeExactUtf8(manifestObservation.bytes));
  } catch {
    bootstrapOperationFailure();
  }
  if (
    manifest === null
    || typeof manifest !== "object"
    || Array.isArray(manifest)
    || manifest.name !== "npm"
    || typeof manifest.version !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, NPM_VERSION_PATTERN, [manifest.version])
  ) {
    bootstrapOperationFailure();
  }
  const npmCliPathFingerprint = hashCanonicalProof(
    BOOTSTRAP_NPM_CLI_PATH_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["canonicalPath", npmCliPath]
    ])
  );
  const npmCliPhysicalIdentityFingerprint = hashCanonicalProof(
    BOOTSTRAP_NPM_CLI_IDENTITY_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["pathFingerprint", npmCliPathFingerprint],
      ["type", "regular-file"],
      ["dev", cliObservation.entry.dev.toString(10)],
      ["ino", cliObservation.entry.ino.toString(10)],
      ["mode", cliObservation.entry.mode.toString(10)],
      ["uid", cliObservation.entry.uid.toString(10)],
      ["gid", cliObservation.entry.gid.toString(10)],
      ["nlink", cliObservation.entry.nlink.toString(10)],
      ["contentSha256", cliObservation.rawByteSha256]
    ])
  );
  const result = nullRecord([
    ["schemaVersion", 1],
    ["commandId", "owner.dependency.probe.which-npm"],
    ["outcome", "PASS"],
    ["npmCliPathFingerprint", npmCliPathFingerprint],
    [
      "npmCliPhysicalIdentityFingerprint",
      npmCliPhysicalIdentityFingerprint
    ],
    ["npmCliContentSha256", cliObservation.rawByteSha256],
    ["npmVersion", manifest.version]
  ]);
  bootstrapWhichNpmPrivateBindings.set(result, {
    npmCliPath,
    npmManifestContentSha256: manifestObservation.rawByteSha256,
    npmManifestPath,
    npmVersion: manifest.version
  });
  return result;
}

function parseProcessTableResult(stdout, repositoryRoot) {
  const text = decodeExactUtf8(stdout);
  const profilePattern = /--user-data-dir=(?:"([^"]+)"|'([^']+)'|(\S+))/gu;
  let examinedProcessCount = 0;
  let violationCount = 0;
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0) continue;
    const parsed = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/u);
    if (!parsed) bootstrapOperationFailure();
    examinedProcessCount += 1;
    const command = parsed[3];
    for (const profileMatch of command.matchAll(profilePattern)) {
      const candidate = profileMatch[1] ?? profileMatch[2] ?? profileMatch[3];
      const resolvedCandidate = typeof candidate === "string"
        ? resolve(candidate)
        : undefined;
      const profileFromRepositoryTmp = resolvedCandidate === undefined
        ? undefined
        : relative(join(repositoryRoot, ".tmp"), resolvedCandidate);
      if (
        candidate?.includes("playwright_chromiumdev_profile-")
        && profileFromRepositoryTmp !== undefined
        && profileFromRepositoryTmp !== ""
        && profileFromRepositoryTmp !== ".."
        && !profileFromRepositoryTmp.startsWith(`..${String.fromCharCode(47)}`)
        && !isAbsolute(profileFromRepositoryTmp)
      ) {
        violationCount += 1;
      }
    }
    if (
      command.includes(`${repositoryRoot}/.tmp/bug3-owner-`)
      || (
        command.includes(repositoryRoot)
        && /node_modules\/(?:@playwright\/test|playwright|next)\/.+(?:\btest\b|\bbuild\b|\bstart\b)/u.test(command)
      )
    ) {
      violationCount += 1;
    }
  }
  if (examinedProcessCount === 0 || violationCount !== 0) {
    bootstrapOperationFailure();
  }
  return nullRecord([
    ["schemaVersion", 1],
    ["commandId", "owner.dependency.audit.process-table-preflight"],
    ["outcome", "PASS"],
    ["examinedProcessCount", examinedProcessCount],
    ["violationCount", 0]
  ]);
}

function parseOwnerTokenTableResult(stdout) {
  const text = decodeExactUtf8(stdout);
  let examinedProcessCount = 0;
  let ownerTokenEntryCount = 0;
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0) continue;
    if (!/^\s*\d+\s+.*$/u.test(line)) bootstrapOperationFailure();
    examinedProcessCount += 1;
    if (REFLECT_APPLY(REGEXP_TEST, OWNER_TOKEN_ENVIRONMENT_PATTERN, [line])) {
      ownerTokenEntryCount += 1;
    }
  }
  if (examinedProcessCount === 0 || ownerTokenEntryCount !== 0) {
    bootstrapOperationFailure();
  }
  return nullRecord([
    ["schemaVersion", 1],
    ["commandId", "owner.dependency.audit.owner-token-table-preflight"],
    ["outcome", "PASS"],
    ["examinedProcessCount", examinedProcessCount],
    ["ownerTokenEntryCount", 0],
    ["violationCount", 0]
  ]);
}

function parseGitStatusResult(stdout, repositoryObservation) {
  const text = decodeExactUtf8(stdout);
  const statusEntryCount = text.split(/\r?\n/u).filter(Boolean).length;
  return nullRecord([
    ["schemaVersion", 1],
    ["commandId", "owner.dependency.source.git-status"],
    ["outcome", "PASS"],
    ["statusEntryCount", statusEntryCount],
    ["statusTextSha256", sha256Bytes(stdout)],
    [
      "packageJsonSha256",
      sourceInputSha256(
        repositoryObservation.repositoryRoot,
        repositoryObservation.repositoryUid,
        repositoryObservation.repositoryDev,
        "package.json"
      )
    ],
    [
      "packageLockJsonSha256",
      sourceInputSha256(
        repositoryObservation.repositoryRoot,
        repositoryObservation.repositoryUid,
        repositoryObservation.repositoryDev,
        "package-lock.json"
      )
    ]
  ]);
}

function parseGitHeadResult(stdout) {
  const text = decodeExactUtf8(stdout);
  const match = REFLECT_APPLY(REGEXP_EXEC, /^([a-f0-9]{40})\n$/u, [text]);
  if (!match || !REFLECT_APPLY(REGEXP_TEST, LOWER_HEX_40, [match[1]])) {
    bootstrapOperationFailure();
  }
  return nullRecord([
    ["schemaVersion", 1],
    ["commandId", "owner.dependency.source.git-head"],
    ["outcome", "PASS"],
    ["headCommit", match[1]],
    ["headTextSha256", sha256Bytes(stdout)]
  ]);
}

function parseBootstrapOperationResult(
  commandId,
  stdout,
  repositoryObservation
) {
  switch (commandId) {
    case "owner.dependency.probe.which-npm":
      return parseWhichNpmResult(stdout);
    case "owner.dependency.audit.process-table-preflight":
      return parseProcessTableResult(
        stdout,
        repositoryObservation.repositoryRoot
      );
    case "owner.dependency.audit.owner-token-table-preflight":
      return parseOwnerTokenTableResult(stdout);
    case "owner.dependency.source.git-status":
      return parseGitStatusResult(stdout, repositoryObservation);
    case "owner.dependency.source.git-head":
      return parseGitHeadResult(stdout);
    default:
      bootstrapOperationFailure();
  }
}

function waitForPromiseOrTimeout(promise, timeoutMs) {
  return new Promise((resolveWait) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      resolveWait(false);
    }, timeoutMs);
    promise.then(() => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolveWait(true);
    });
  });
}

function bootstrapLifecycleCode(observation) {
  if (observation.survivorCount > 0) return "survivor-after-kill";
  if (observation.killSent) return "reaped-after-kill";
  if (observation.termSent) return "reaped-after-term";
  if (observation.timedOut) return "timed-out";
  if (!observation.spawnOccurred) return "safety-unestablished";
  if (observation.exitSignal !== null) return "exit-signaled";
  if (observation.exitCode === 0) return "exit-zero";
  return "exit-nonzero";
}

async function executeBootstrapDirectChild({
  args,
  childEnvironment,
  cwd,
  executable,
  killGraceMs,
  handleCloseTimeoutMs,
  stderrMaxBytes,
  stdoutMaxBytes,
  termGraceMs,
  timeoutMs
}) {
  let ephemeralEnvironment = childEnvironment;
  let child;
  const eventCodes = [];
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutByteLength = 0;
  let stderrByteLength = 0;
  let stdoutOverflow = false;
  let stderrOverflow = false;
  let spawnOccurred = false;
  let exitObserved = false;
  let closeObserved = false;
  let spawnError = false;
  let abortAuthorityEstablished = false;
  let termAttempted = false;
  let termSent = false;
  let killAttempted = false;
  let killSent = false;
  let timedOut = false;
  let survivorCount = 0;
  let exitCode = null;
  let exitSignal = null;
  let failureTrigger = "none";
  let abortPromise;
  let handleCloseWatchStarted = false;
  let completed = false;
  let resolveTerminalSignal;
  let resolveSpawnSettlement;
  let resolveClose;
  let resolveCompletion;
  const spawnSettlementPromise = new Promise((resolveSettlement) => {
    resolveSpawnSettlement = resolveSettlement;
  });
  const terminalSignalPromise = new Promise((resolveSignal) => {
    resolveTerminalSignal = resolveSignal;
  });
  const closePromise = new Promise((resolveClosed) => {
    resolveClose = resolveClosed;
  });
  const completionPromise = new Promise((resolveCompleted) => {
    resolveCompletion = resolveCompleted;
  });

  function appendEvent(code) {
    eventCodes.push(code);
  }

  function setFailureTrigger(trigger) {
    if (failureTrigger === "none") failureTrigger = trigger;
  }

  function finishCompletion() {
    if (completed) return;
    completed = true;
    resolveCompletion();
  }

  function releaseSurvivorHandle() {
    appendEvent("cleanup-after-final-survivor");
    child?.stdout?.destroy();
    child?.stderr?.destroy();
    child?.unref();
  }

  async function startBoundedAbort(trigger) {
    setFailureTrigger(trigger);
    if (abortPromise) return abortPromise;
    abortPromise = (async () => {
      appendEvent(trigger);
      if (!spawnOccurred && !spawnError) {
        await spawnSettlementPromise;
      }
      if (spawnError && !spawnOccurred) {
        finishCompletion();
        return;
      }
      if (!spawnOccurred || closeObserved) {
        finishCompletion();
        return;
      }
      if (exitObserved) {
        await waitForPromiseOrTimeout(closePromise, handleCloseTimeoutMs);
        if (!closeObserved) {
          setFailureTrigger("handle-close-timeout");
          appendEvent("handle-close-timeout");
          releaseSurvivorHandle();
        }
        finishCompletion();
        return;
      }

      abortAuthorityEstablished = true;
      termAttempted = true;
      appendEvent("pre-term");
      try {
        termSent = child.kill("SIGTERM") === true;
      } catch {
        termSent = false;
      }
      appendEvent(termSent ? "term-sent" : "term-not-sent");
      await waitForPromiseOrTimeout(terminalSignalPromise, termGraceMs);

      if (!exitObserved && !closeObserved) {
        killAttempted = true;
        appendEvent("pre-kill");
        try {
          killSent = child.kill("SIGKILL") === true;
        } catch {
          killSent = false;
        }
        appendEvent(killSent ? "kill-sent" : "kill-not-sent");
        await waitForPromiseOrTimeout(terminalSignalPromise, killGraceMs);
      }

      if (exitObserved && !closeObserved) {
        await waitForPromiseOrTimeout(closePromise, handleCloseTimeoutMs);
      }
      if (!exitObserved && !closeObserved) {
        survivorCount = 1;
        appendEvent("final-survivor");
        releaseSurvivorHandle();
      } else if (!closeObserved) {
        setFailureTrigger("handle-close-timeout");
        appendEvent("handle-close-timeout");
        releaseSurvivorHandle();
      }
      finishCompletion();
    })();
    return abortPromise;
  }

  function retainChunk(kind, chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const isStdout = kind === "stdout";
    const limit = isStdout ? stdoutMaxBytes : stderrMaxBytes;
    const currentLength = isStdout ? stdoutByteLength : stderrByteLength;
    const remaining = Math.max(0, limit - currentLength);
    if (remaining > 0) {
      const retained = bytes.byteLength <= remaining
        ? bytes
        : bytes.subarray(0, remaining);
      (isStdout ? stdoutChunks : stderrChunks).push(retained);
    }
    const nextLength = Math.min(limit + 1, currentLength + bytes.byteLength);
    if (isStdout) {
      stdoutByteLength = nextLength;
      if (nextLength > limit && !stdoutOverflow) {
        stdoutOverflow = true;
        void startBoundedAbort("stdout-overflow");
      }
    } else {
      stderrByteLength = nextLength;
      if (nextLength > limit && !stderrOverflow) {
        stderrOverflow = true;
        void startBoundedAbort("stderr-overflow");
      }
    }
  }

  try {
    try {
      child = spawn(executable, args, {
        cwd,
        detached: false,
        env: ephemeralEnvironment,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
    } catch {
      spawnError = true;
      failureTrigger = "spawn-error";
      appendEvent("spawn-error");
      resolveSpawnSettlement();
      finishCompletion();
    }
  } finally {
    ephemeralEnvironment = undefined;
    childEnvironment = undefined;
  }

  let timeoutHandle;
  if (child) {
    child.once("spawn", () => {
      spawnOccurred = true;
      abortAuthorityEstablished = true;
      appendEvent("spawn");
      resolveSpawnSettlement();
    });
    child.once("exit", (code, signal) => {
      exitObserved = true;
      exitCode = Number.isInteger(code) ? code : null;
      exitSignal = typeof signal === "string" ? signal : null;
      appendEvent("exit");
      resolveTerminalSignal();
      if (!handleCloseWatchStarted) {
        handleCloseWatchStarted = true;
        void waitForPromiseOrTimeout(
          closePromise,
          handleCloseTimeoutMs
        ).then((closed) => {
          if (!closed) {
            setFailureTrigger("handle-close-timeout");
            appendEvent("handle-close-timeout");
            releaseSurvivorHandle();
            finishCompletion();
          }
        });
      }
    });
    child.once("close", (code, signal) => {
      closeObserved = true;
      if (!exitObserved) {
        exitObserved = true;
        exitCode = Number.isInteger(code) ? code : null;
        exitSignal = typeof signal === "string" ? signal : null;
        resolveTerminalSignal();
      }
      appendEvent("close");
      resolveClose();
      finishCompletion();
    });
    child.once("error", () => {
      spawnError = true;
      setFailureTrigger("spawn-error");
      appendEvent("spawn-error");
      if (!spawnOccurred) {
        resolveSpawnSettlement();
        resolveTerminalSignal();
        resolveClose();
        finishCompletion();
      } else {
        void startBoundedAbort("spawn-error");
      }
    });
    if (!child.stdout || !child.stderr) {
      setFailureTrigger("postcondition");
      void startBoundedAbort("postcondition");
    } else {
      child.stdout.on("data", (chunk) => retainChunk("stdout", chunk));
      child.stderr.on("data", (chunk) => retainChunk("stderr", chunk));
      child.stdout.once("error", () => {
        setFailureTrigger("postcondition");
        void startBoundedAbort("postcondition");
      });
      child.stderr.once("error", () => {
        setFailureTrigger("postcondition");
        void startBoundedAbort("postcondition");
      });
    }
    timeoutHandle = setTimeout(() => {
      if (closeObserved) return;
      timedOut = true;
      void startBoundedAbort("timeout");
    }, timeoutMs);
  }

  await completionPromise;
  if (abortPromise) await abortPromise;
  if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  const stdout = Buffer.concat(stdoutChunks);
  const stderr = Buffer.concat(stderrChunks);
  for (const chunk of stdoutChunks) chunk.fill(0);
  for (const chunk of stderrChunks) chunk.fill(0);
  stdoutChunks.length = 0;
  stderrChunks.length = 0;
  const observation = {
    abortAuthorityEstablished,
    closeObserved,
    eventCodes: OBJECT_FREEZE([...eventCodes]),
    exitCode,
    exitObserved,
    exitSignal,
    failureTrigger,
    identityEstablished: false,
    identityRevalidatedBeforeKill: false,
    identityRevalidatedBeforeTerm: false,
    killAttempted,
    killSent,
    spawnError,
    spawnOccurred,
    stderr,
    stderrByteLength,
    stderrOverflow,
    stdout,
    stdoutByteLength,
    stdoutOverflow,
    survivorCount,
    termAttempted,
    termSent,
    timedOut
  };
  observation.lifecycleCode = bootstrapLifecycleCode(observation);
  return observation;
}

function retainedComponentReceipt(domain, entries) {
  const receipt = nullRecord(entries);
  bootstrapComponentReceiptMembership.add(receipt);
  return nullRecord([
    ["fingerprint", hashCanonicalProof(domain, receipt)],
    ["receipt", receipt]
  ]);
}

function buildBootstrapProbeReceipts({
  authorityBinding,
  commandId,
  descriptor,
  descriptorFingerprint,
  execution,
  operationOutcome,
  postEnvironmentInventoryFingerprint,
  postExecutableIdentityFingerprint,
  postRepositoryBindingFingerprint,
  postSourceSeedFingerprint,
  preEnvironmentInventoryFingerprint,
  preExecutableIdentityFingerprint,
  preRepositoryBindingFingerprint,
  preSourceSeedFingerprint,
  rejectionCode,
  result,
  violationCode,
  violationCount
}) {
  const launch = retainedComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    [
      ["schemaVersion", 1],
      ["attemptId", authorityBinding.attemptId],
      ["commandId", commandId],
      ["descriptorFingerprint", descriptorFingerprint],
      ["executableIdentityFingerprint", preExecutableIdentityFingerprint],
      ["environmentInventoryFingerprint", preEnvironmentInventoryFingerprint],
      ["repositoryBindingFingerprint", preRepositoryBindingFingerprint],
      ["sourceSeedFingerprint", preSourceSeedFingerprint],
      ["signalPolicyKind", BOOTSTRAP_BOUNDED_ABORT_SIGNAL_POLICY_KIND],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished]
    ]
  );
  const audit = retainedComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["preEnvironmentInventoryFingerprint", preEnvironmentInventoryFingerprint],
      ["postEnvironmentInventoryFingerprint", postEnvironmentInventoryFingerprint],
      ["preRepositoryBindingFingerprint", preRepositoryBindingFingerprint],
      ["postRepositoryBindingFingerprint", postRepositoryBindingFingerprint],
      ["preSourceSeedFingerprint", preSourceSeedFingerprint],
      ["postSourceSeedFingerprint", postSourceSeedFingerprint],
      ["preExecutableIdentityFingerprint", preExecutableIdentityFingerprint],
      ["postExecutableIdentityFingerprint", postExecutableIdentityFingerprint],
      ["violationCode", violationCode],
      ["violationCount", violationCount]
    ]
  );
  const lifecycleAudit = retainedComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["signalPolicyKind", descriptor.signalPolicy.kind],
      ["lifecycleCode", execution.lifecycleCode],
      ["failureTrigger", execution.failureTrigger],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished],
      ["identityEstablished", execution.identityEstablished],
      ["identityRevalidatedBeforeTerm", execution.identityRevalidatedBeforeTerm],
      ["identityRevalidatedBeforeKill", execution.identityRevalidatedBeforeKill],
      ["termAttempted", execution.termAttempted],
      ["termSent", execution.termSent],
      ["killAttempted", execution.killAttempted],
      ["killSent", execution.killSent],
      ["exitCode", execution.exitCode],
      ["exitSignal", execution.exitSignal],
      ["timedOut", execution.timedOut],
      ["stdoutOverflow", execution.stdoutOverflow],
      ["stderrOverflow", execution.stderrOverflow],
      ["survivorCount", execution.survivorCount],
      ["eventCodes", execution.eventCodes],
      ["signalAuthority", false]
    ]
  );
  const resultFingerprint = result === null
    ? null
    : hashCanonicalProof(bootstrapResultDomain(commandId), result);
  const outcomeReceipt = retainedComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycleAudit.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["outcome", operationOutcome],
      ["rejectionCode", rejectionCode]
    ]
  );
  const probe = retainedComponentReceipt(bootstrapReceiptDomain(commandId), [
    ["schemaVersion", 1],
    ["attemptId", authorityBinding.attemptId],
    ["commandId", commandId],
    [
      "bootstrapAuthorityBindingFingerprint",
      hashCanonicalProof(BOOTSTRAP_AUTHORITY_BINDING_DOMAIN, authorityBinding)
    ],
    ["descriptorFingerprint", descriptorFingerprint],
    ["environmentInventoryFingerprint", preEnvironmentInventoryFingerprint],
    ["launchReceiptFingerprint", launch.fingerprint],
    ["auditReceiptFingerprint", audit.fingerprint],
    ["lifecycleAuditReceiptFingerprint", lifecycleAudit.fingerprint],
    ["outcomeReceiptFingerprint", outcomeReceipt.fingerprint],
    ["resultFingerprint", resultFingerprint],
    ["outcome", operationOutcome]
  ]);
  return nullRecord([
    ["launch", launch],
    ["audit", audit],
    ["lifecycleAudit", lifecycleAudit],
    ["outcome", outcomeReceipt],
    ["probe", probe]
  ]);
}

async function runBootstrapOperation(
  liveHomeProof,
  bootstrapAuthority,
  commandId
) {
  let reservation;
  let execution;
  try {
    reservation = reserveBootstrapOperation(
      liveHomeProof,
      bootstrapAuthority,
      commandId
    );
  } catch {
    bootstrapOperationFailure();
  }
  const { authorityBinding, state } = reservation;
  try {
    const preStaticObservation = buildStableBootstrapStaticObservation();
    const preRepositoryBindingFingerprint =
      preStaticObservation.repositoryObservation.repositoryBindingFingerprint;
    const preSourceSeedFingerprint =
      preStaticObservation.sourceSeedFingerprint;
    if (
      preRepositoryBindingFingerprint
        !== state.context.repositoryBindingFingerprint
      || preSourceSeedFingerprint !== state.context.sourceSeedFingerprint
    ) {
      bootstrapOperationFailure();
    }
    const operationDescriptor = bootstrapDescriptor(commandId);
    const preEnvironment = buildBootstrapEnvironment(
      liveHomeProof,
      commandId
    );
    if (
      preEnvironment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      bootstrapOperationFailure();
    }
    const preExecutableIdentityFingerprint = observeFixedSystemExecutable(
      operationDescriptor.executable
    );
    const executionPromise = executeBootstrapDirectChild({
      args: operationDescriptor.args,
      childEnvironment: preEnvironment.childEnvironment,
      cwd: preStaticObservation.repositoryObservation.repositoryRoot,
      executable: operationDescriptor.executable,
      handleCloseTimeoutMs:
        operationDescriptor.descriptor.signalPolicy.handleCloseTimeoutMs,
      killGraceMs: operationDescriptor.descriptor.signalPolicy.killGraceMs,
      stderrMaxBytes: operationDescriptor.stderrMaxBytes,
      stdoutMaxBytes: operationDescriptor.stdoutMaxBytes,
      termGraceMs: operationDescriptor.descriptor.signalPolicy.termGraceMs,
      timeoutMs: operationDescriptor.descriptor.timeoutMs
    });
    preEnvironment.childEnvironment = undefined;
    execution = await executionPromise;
    let operationOutcome = "PASS";
    let rejectionCode = "none";
    const violationKinds = new Set();
    const executionAccepted = !(
      execution.spawnError
      || !execution.spawnOccurred
      || !execution.abortAuthorityEstablished
      || !execution.exitObserved
      || !execution.closeObserved
      || execution.exitCode !== 0
      || execution.exitSignal !== null
      || execution.failureTrigger !== "none"
      || execution.lifecycleCode !== "exit-zero"
      || execution.termAttempted
      || execution.termSent
      || execution.killAttempted
      || execution.killSent
      || execution.timedOut
      || execution.stdoutOverflow
      || execution.stderrOverflow
      || execution.survivorCount !== 0
      || execution.stdoutByteLength > operationDescriptor.stdoutMaxBytes
      || execution.stderrByteLength > operationDescriptor.stderrMaxBytes
      || execution.stderrByteLength !== 0
    );
    if (!executionAccepted) {
      operationOutcome = "REJECT";
      if (execution.spawnError || !execution.spawnOccurred) {
        rejectionCode = "spawn-error";
      } else if (execution.timedOut) {
        rejectionCode = "timeout";
      } else if (execution.stdoutOverflow) {
        rejectionCode = "stdout-overflow";
      } else if (execution.stderrOverflow) {
        rejectionCode = "stderr-overflow";
      } else if (execution.survivorCount > 0) {
        rejectionCode = "survivor-after-kill";
      } else if (!execution.closeObserved) {
        rejectionCode = "handle-close-timeout";
      } else if (execution.exitSignal !== null) {
        rejectionCode = "exit-signaled";
      } else if (execution.exitCode !== 0) {
        rejectionCode = "exit-nonzero";
      } else if (execution.stderrByteLength !== 0) {
        rejectionCode = "stderr-output";
      } else {
        rejectionCode = "lifecycle-invalid";
      }
      violationKinds.add(
        execution.survivorCount > 0 ? "survivor" : "identity-mismatch"
      );
    }

    let result = null;
    if (executionAccepted) {
      try {
        result = parseBootstrapOperationResult(
          commandId,
          execution.stdout,
          preStaticObservation.repositoryObservation
        );
      } catch {
        operationOutcome = "REJECT";
        rejectionCode = "result-invalid";
        violationKinds.add(
          commandId
            === "owner.dependency.audit.owner-token-table-preflight"
            ? "owner-token-mismatch"
            : commandId
              === "owner.dependency.audit.process-table-preflight"
              ? "unexpected-descendant"
              : "identity-mismatch"
        );
      }
    }

    let postEnvironmentInventoryFingerprint = null;
    let postRepositoryBindingFingerprint = null;
    let postSourceSeedFingerprint = null;
    let postExecutableIdentityFingerprint = null;
    try {
      const postEnvironment = buildBootstrapEnvironment(
        liveHomeProof,
        commandId
      );
      postEnvironmentInventoryFingerprint =
        postEnvironment.inventoryFingerprint;
      postEnvironment.childEnvironment = undefined;
    } catch {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "environment-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    try {
      const postStaticObservation = buildStableBootstrapStaticObservation();
      postRepositoryBindingFingerprint =
        postStaticObservation.repositoryObservation.repositoryBindingFingerprint;
      postSourceSeedFingerprint =
        postStaticObservation.sourceSeedFingerprint;
    } catch {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "source-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    try {
      postExecutableIdentityFingerprint = observeFixedSystemExecutable(
        operationDescriptor.executable
      );
    } catch {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "executable-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }

    if (
      postEnvironmentInventoryFingerprint
        !== preEnvironment.inventoryFingerprint
      || postEnvironmentInventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "environment-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    if (
      postRepositoryBindingFingerprint !== preRepositoryBindingFingerprint
      || postRepositoryBindingFingerprint
        !== state.context.repositoryBindingFingerprint
      || postSourceSeedFingerprint !== preSourceSeedFingerprint
      || postSourceSeedFingerprint !== state.context.sourceSeedFingerprint
    ) {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "source-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    if (
      postExecutableIdentityFingerprint
        !== preExecutableIdentityFingerprint
    ) {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "executable-drift"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    const ledgerStillOwned = !(
      state.status !== "collecting"
      || state.inFlightCommandId !== commandId
      || state.slots.get(commandId) !== "in-flight"
    );
    if (!ledgerStillOwned) {
      operationOutcome = "REJECT";
      rejectionCode = rejectionCode === "none"
        ? "state-invalid"
        : rejectionCode;
      violationKinds.add("identity-mismatch");
    }
    if (operationOutcome === "REJECT" && execution.failureTrigger === "none") {
      execution.failureTrigger = "postcondition";
    }
    const violationCount = operationOutcome === "PASS"
      ? 0
      : Math.max(1, violationKinds.size);
    const violationCode = operationOutcome === "PASS"
      ? "none"
      : violationKinds.size > 1
        ? "multiple"
        : [...violationKinds][0] ?? "identity-mismatch";
    let receipts;
    if (execution.spawnOccurred) {
      receipts = buildBootstrapProbeReceipts({
        authorityBinding,
        commandId,
        descriptor: operationDescriptor.descriptor,
        descriptorFingerprint: operationDescriptor.descriptorFingerprint,
        execution,
        operationOutcome,
        postEnvironmentInventoryFingerprint,
        postExecutableIdentityFingerprint,
        postRepositoryBindingFingerprint,
        postSourceSeedFingerprint,
        preEnvironmentInventoryFingerprint: preEnvironment.inventoryFingerprint,
        preExecutableIdentityFingerprint,
        preRepositoryBindingFingerprint,
        preSourceSeedFingerprint,
        rejectionCode,
        result: operationOutcome === "PASS" ? result : null,
        violationCode,
        violationCount
      });
      state.receipts.set(commandId, receipts);
      assertNoLiveHomeRetention(liveHomeProof, receipts);
    }
    if (operationOutcome !== "PASS" || result === null) {
      bootstrapOperationFailure();
    }
    if (commandId === "owner.dependency.probe.which-npm") {
      const privateBinding = bootstrapWhichNpmPrivateBindings.get(result);
      if (!privateBinding || state.npmCliPrivateBinding !== undefined) {
        bootstrapOperationFailure();
      }
      state.npmCliPrivateBinding = privateBinding;
    }
    assertNoLiveHomeRetention(liveHomeProof, result);
    state.results.set(commandId, result);
    state.slots.set(commandId, "consumed");
    state.inFlightCommandId = undefined;
    state.status = [...state.slots.values()].every(
      (slotStatus) => slotStatus === "consumed"
    ) ? "probes-complete" : "collecting";
    return result;
  } catch {
    failBootstrapOperationState(state);
    bootstrapOperationFailure();
  } finally {
    execution?.stdout?.fill(0);
    execution?.stderr?.fill(0);
  }
}

export function runRequiredBrowserProvisionWhichNpm(
  liveHomeProof,
  bootstrapAuthority
) {
  return runBootstrapOperation(
    liveHomeProof,
    bootstrapAuthority,
    "owner.dependency.probe.which-npm"
  );
}

export function runRequiredBrowserProvisionProcessTablePreflight(
  liveHomeProof,
  bootstrapAuthority
) {
  return runBootstrapOperation(
    liveHomeProof,
    bootstrapAuthority,
    "owner.dependency.audit.process-table-preflight"
  );
}

export function runRequiredBrowserProvisionOwnerTokenTablePreflight(
  liveHomeProof,
  bootstrapAuthority
) {
  return runBootstrapOperation(
    liveHomeProof,
    bootstrapAuthority,
    "owner.dependency.audit.owner-token-table-preflight"
  );
}

export function runRequiredBrowserProvisionGitStatus(
  liveHomeProof,
  bootstrapAuthority
) {
  return runBootstrapOperation(
    liveHomeProof,
    bootstrapAuthority,
    "owner.dependency.source.git-status"
  );
}

export function runRequiredBrowserProvisionGitHead(
  liveHomeProof,
  bootstrapAuthority
) {
  return runBootstrapOperation(
    liveHomeProof,
    bootstrapAuthority,
    "owner.dependency.source.git-head"
  );
}

function verifiedBootstrapReceiptLink(state, authorityBinding, commandId) {
  const result = state.results?.get(commandId);
  const receipts = state.receipts?.get(commandId);
  const descriptorEntry =
    ownedProcessDescriptorFingerprintEntryById.get(commandId);
  const componentReceipts = [
    [receipts?.launch, REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt],
    [receipts?.audit, REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt],
    [
      receipts?.lifecycleAudit,
      REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt
    ],
    [receipts?.outcome, REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt],
    [receipts?.probe, bootstrapReceiptDomain(commandId)]
  ];
  if (
    state.slots?.get(commandId) !== "consumed"
    || !result
    || result.outcome !== "PASS"
    || !receipts
    || !descriptorEntry
    || componentReceipts.some(([wrapper, domain]) =>
      !wrapper
      || !bootstrapComponentReceiptMembership.has(wrapper.receipt)
      || wrapper.fingerprint !== hashCanonicalProof(domain, wrapper.receipt)
    )
  ) {
    bootstrapFinalizationFailure();
  }
  const resultFingerprint = hashCanonicalProof(
    bootstrapResultDomain(commandId),
    result
  );
  const probeReceiptFingerprint = hashCanonicalProof(
    bootstrapReceiptDomain(commandId),
    receipts.probe.receipt
  );
  const probeReceipt = receipts.probe.receipt;
  if (
    resultFingerprint !== receipts.probe.receipt.resultFingerprint
    || probeReceiptFingerprint !== receipts.probe.fingerprint
    || probeReceipt.attemptId !== authorityBinding.attemptId
    || probeReceipt.commandId !== commandId
    || probeReceipt.bootstrapAuthorityBindingFingerprint
      !== state.context.bootstrapAuthorityBindingFingerprint
    || probeReceipt.descriptorFingerprint
      !== descriptorEntry.descriptorFingerprint
    || probeReceipt.environmentInventoryFingerprint
      !== state.environmentInventoryFingerprints[commandId]
    || probeReceipt.launchReceiptFingerprint !== receipts.launch.fingerprint
    || probeReceipt.auditReceiptFingerprint !== receipts.audit.fingerprint
    || probeReceipt.lifecycleAuditReceiptFingerprint
      !== receipts.lifecycleAudit.fingerprint
    || probeReceipt.outcomeReceiptFingerprint !== receipts.outcome.fingerprint
    || receipts.audit.receipt.launchReceiptFingerprint
      !== receipts.launch.fingerprint
    || receipts.lifecycleAudit.receipt.launchReceiptFingerprint
      !== receipts.launch.fingerprint
    || receipts.outcome.receipt.launchReceiptFingerprint
      !== receipts.launch.fingerprint
    || receipts.outcome.receipt.auditReceiptFingerprint
      !== receipts.audit.fingerprint
    || receipts.outcome.receipt.lifecycleAuditReceiptFingerprint
      !== receipts.lifecycleAudit.fingerprint
    || receipts.outcome.receipt.resultFingerprint !== resultFingerprint
    || receipts.outcome.receipt.outcome !== "PASS"
    || probeReceipt.outcome !== "PASS"
  ) {
    bootstrapFinalizationFailure();
  }
  return nullRecord([
    ["commandId", commandId],
    ["resultFingerprint", resultFingerprint],
    ["probeReceiptFingerprint", probeReceiptFingerprint]
  ]);
}

function sealBootstrapFivePassAggregate(state, authorityBinding) {
  if (
    state.status !== "finalizing"
    || state.inFlightCommandId !== undefined
    || !state.context
    || state.context.attemptId !== authorityBinding.attemptId
    || state.context.mode !== authorityBinding.mode
    || state.results?.size !== BOOTSTRAP_COMMAND_IDS.length
    || state.receipts?.size !== BOOTSTRAP_COMMAND_IDS.length
  ) {
    bootstrapFinalizationFailure();
  }
  const links = new Map();
  for (const commandId of BOOTSTRAP_COMMAND_IDS) {
    links.set(
      commandId,
      verifiedBootstrapReceiptLink(state, authorityBinding, commandId)
    );
  }
  const passes = Object.freeze(
    BOOTSTRAP_COMMAND_IDS.map((commandId) => links.get(commandId))
  );
  const aggregate = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", authorityBinding.attemptId],
    ["mode", authorityBinding.mode],
    [
      "bootstrapAuthorityBindingFingerprint",
      state.context.bootstrapAuthorityBindingFingerprint
    ],
    ["repositoryBindingFingerprint", state.context.repositoryBindingFingerprint],
    ["sourceSeedFingerprint", state.context.sourceSeedFingerprint],
    [
      "bootstrapEnvironmentInventorySetFingerprint",
      state.context.bootstrapEnvironmentInventorySetFingerprint
    ],
    ["passes", passes]
  ]);
  return {
    aggregate,
    fingerprint: hashCanonicalProof(
      BOOTSTRAP_FIVE_PASS_AGGREGATE_DOMAIN,
      aggregate
    )
  };
}

function fsyncDirectory(exactPath) {
  let descriptor;
  let failed = false;
  try {
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_RDONLY
        | FS_CONSTANTS.O_NOFOLLOW
        | FS_CONSTANTS.O_DIRECTORY
    );
    fsyncSync(descriptor);
  } catch {
    failed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        failed = true;
      }
    }
  }
  if (failed) bootstrapFinalizationFailure();
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid;
}

function openRetainedProvisionRootDescriptor(exactPath, expectedEntry) {
  let descriptor;
  let retainedEntry;
  let failed = false;
  try {
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_RDONLY
        | FS_CONSTANTS.O_NOFOLLOW
        | FS_CONSTANTS.O_DIRECTORY
    );
    const first = fstatSync(descriptor, { bigint: true });
    const anchor = expectedEntry ?? first;
    const pathEntry = stableLstat(exactPath);
    const final = fstatSync(descriptor, { bigint: true });
    if (
      !first?.isDirectory()
      || first.isSymbolicLink()
      || !pathEntry?.isDirectory()
      || pathEntry.isSymbolicLink()
      || !final?.isDirectory()
      || final.isSymbolicLink()
      || stableRealpath(exactPath) !== exactPath
      || !sameDirectoryIdentity(anchor, first)
      || !sameDirectoryIdentity(first, pathEntry)
      || !sameDirectoryIdentity(pathEntry, final)
    ) {
      failed = true;
    }
    retainedEntry = final;
  } catch {
    failed = true;
  }
  if (failed) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Root remains retained; no alternate descriptor may be adopted.
      }
    }
    bootstrapFinalizationFailure();
  }
  return { descriptor, entry: retainedEntry };
}

function createInitialProvisionRoot(
  repositoryObservation,
  authorityBinding,
  retainedContext,
  finalizationState
) {
  const relativePath = initialProvisionRootRelativePath(
    authorityBinding.attemptId
  );
  if (relativePath !== retainedContext.provisionRootRelativePath) {
    bootstrapFinalizationFailure();
  }
  const provisionRoot = assertProvisionRootAbsent(
    repositoryObservation.repositoryRoot,
    relativePath,
    bootstrapFinalizationFailure
  );
  try {
    mkdirSync(provisionRoot, { mode: 0o700, recursive: false });
  } catch {
    bootstrapFinalizationFailure();
  }
  finalizationState.provisionRootWasCreated = true;
  let retainedRoot;
  let ownershipTransferred = false;
  try {
    retainedRoot = openRetainedProvisionRootDescriptor(provisionRoot);
    fsyncDirectory(repositoryObservation.tmpBasePath);
    const rootObservation = observeDirectory(
      provisionRoot,
      "initial-provision-install-root",
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      true
    );
    if (
      !rootObservation?.entry
      || (rootObservation.entry.mode & 0o7777n) !== 0o700n
      || rootObservation.dev !== repositoryObservation.repositoryDev
      || rootObservation.uid !== repositoryObservation.repositoryUid
      || !sameDirectoryIdentity(retainedRoot.entry, rootObservation.entry)
    ) {
      bootstrapFinalizationFailure();
    }
    const binding = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", authorityBinding.attemptId],
      ["mode", "initial"],
      [
        "repositoryBindingFingerprint",
        repositoryObservation.repositoryBindingFingerprint
      ],
      [
        "tmpBaseIdentityFingerprint",
        repositoryObservation.tmpBaseIdentityFingerprint
      ],
      ["provisionRootPathFingerprint", rootObservation.pathFingerprint],
      ["provisionRootIdentityFingerprint", rootObservation.identityFingerprint]
    ]);
    const result = {
      binding,
      fingerprint: hashCanonicalProof(PROVISION_ROOT_BINDING_DOMAIN, binding),
      provisionRoot,
      provisionRootDescriptor: retainedRoot.descriptor,
      relativePath,
      rootIdentityFingerprint: rootObservation.identityFingerprint
    };
    ownershipTransferred = true;
    return result;
  } finally {
    if (retainedRoot && !ownershipTransferred) {
      try {
        closeSync(retainedRoot.descriptor);
      } catch {
        // The newly created root remains retained after any close uncertainty.
      }
    }
  }
}

function buildInitialAttemptPolicies(
  repositoryBindingFingerprint,
  provisionRootBindingFingerprint
) {
  const privateCommandIds = INITIAL_ATTEMPT_PRIVATE_COMMAND_IDS;
  const publicCommandIds = INITIAL_ATTEMPT_PUBLIC_COMMAND_IDS;
  const commandScope = nullRecord([
    ["schemaVersion", 1],
    ["mode", "initial"],
    ["privateCommandIds", privateCommandIds],
    ["publicCommandIds", publicCommandIds]
  ]);
  const descriptorFields = [];
  for (const commandId of INITIAL_ATTEMPT_COMMAND_IDS) {
    const descriptorEntry =
      ownedProcessDescriptorFingerprintEntryById.get(commandId);
    if (!descriptorEntry) bootstrapFinalizationFailure();
    descriptorFields.push([commandId, descriptorEntry.descriptorFingerprint]);
  }
  const descriptorFingerprints = nullRecord(descriptorFields);
  const descriptorSet = nullRecord([
    ["schemaVersion", 1],
    ["mode", "initial"],
    ["descriptorFingerprints", descriptorFingerprints]
  ]);
  const dependencyPathPolicy = nullRecord([
    ["schemaVersion", 1],
    ["repositoryBindingFingerprint", repositoryBindingFingerprint],
    ["provisionRootBindingFingerprint", provisionRootBindingFingerprint],
    [
      "rootDirectories",
      Object.freeze([
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
      ])
    ],
    [
      "environmentDescendants",
      nullRecord([
        ["nodeCompileCache", "node-compile-cache"],
        ["npmCache", "npm-cache"],
        ["xdgCache", "npm-cache"],
        ["npmGlobalConfig", "config/npm-globalrc"],
        ["npmLogs", "logs"],
        ["npmPrefix", "npm-prefix"],
        ["npmUserConfig", "config/npm-userrc"],
        ["playwrightBrowsers", "playwright-browsers"],
        ["temp", "temp"],
        ["tmp", "temp"],
        ["tmpdir", "temp"],
        ["turboCache", "turbo-cache"],
        ["xdgConfig", "config"],
        ["xdgData", "data"],
        ["xdgState", "state"]
      ])
    ],
    [
      "treePaths",
      nullRecord([
        ["stagedCandidate", "install/node_modules"],
        ["retainedQuarantineCandidate", "quarantine/node_modules-partial"],
        ["rollbackCandidate", "rollback/node_modules"],
        ["sourcePackageEvidence", "evidence/source-package.json"],
        ["sourcePackageLockEvidence", "evidence/source-package-lock.json"],
        [
          "sourceInstallInputManifest",
          "evidence/source-install-input-manifest.json"
        ],
        ["installPackage", "install/package.json"],
        ["installPackageLock", "install/package-lock.json"]
      ])
    ],
    [
      "markerPaths",
      nullRecord([
        ["owner", ".mais-dependency-provision.json"],
        ["cache", "npm-cache/.mais-dependency-cache.json"],
        ["quarantine", "quarantine/.quarantine-marker.json"],
        ["rollback", "rollback/.rollback-marker.json"]
      ])
    ],
    ["activeNodeModulesRelativePath", "node_modules"],
    ["activationLockRelativePath", ".tmp/.mais-dependency-activation.lock"]
  ]);
  const evidencePolicy = nullRecord([
    ["schemaVersion", 1],
    ["dependencyEvidenceSchemaVersion", 2],
    ["activeDependencyProofSchemaVersion", 3],
    ["executionScopeSchemaVersion", 2],
    ["runPlanSchemaVersion", 3],
    ["dependencyEvidenceDomains", DEPENDENCY_EVIDENCE_DOMAINS],
    [
      "ownedProcessReceiptDomains",
      Object.freeze([
        REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.environmentInventory,
        REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
        REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
        REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
        REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt
      ])
    ],
    ["noFallback", true]
  ]);
  return {
    commandScopeFingerprint: hashCanonicalProof(
      ATTEMPT_COMMAND_SCOPE_DOMAIN,
      commandScope
    ),
    dependencyPathPolicyFingerprint: hashCanonicalProof(
      DEPENDENCY_PATH_POLICY_DOMAIN,
      dependencyPathPolicy
    ),
    descriptorFingerprints,
    descriptorSetFingerprint: hashCanonicalProof(
      ATTEMPT_DESCRIPTOR_SET_DOMAIN,
      descriptorSet
    ),
    evidencePolicyFingerprint: hashCanonicalProof(
      EVIDENCE_POLICY_DOMAIN,
      evidencePolicy
    ),
    publicCommandIds
  };
}

function optionalAmbientEntry(environment, key) {
  let descriptor;
  try {
    descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(environment, key);
  } catch {
    bootstrapFinalizationFailure();
  }
  if (!descriptor) {
    if (key in environment) bootstrapFinalizationFailure();
    return nullRecord([
      ["key", key],
      ["source", "ambient"],
      ["presence", "absent"]
    ]);
  }
  if (
    !OBJECT_HAS_OWN(descriptor, "value")
    || descriptor.enumerable !== true
    || typeof descriptor.value !== "string"
  ) {
    bootstrapFinalizationFailure();
  }
  return nullRecord([
    ["key", key],
    ["source", "ambient"],
    ["presence", "present"],
    ["valueSha256", hashEnvironmentText(key, descriptor.value)]
  ]);
}

function finalEnvironmentEntries(
  liveHomeProof,
  commandId,
  environmentBinding,
  provisionRoot,
  ownerToken
) {
  const { homeValue, homeValueSha256 } = currentOwnHomeValue(liveHomeProof);
  const nodeExecutable = stableRealpath(process.execPath);
  const pathValue = `${dirname(nodeExecutable)}:/usr/bin:/bin:/usr/sbin:/sbin`;
  const definitions = [];
  if (environmentBinding === "owned-audit") {
    definitions.push(
      ["HOME", "live-home", homeValue, homeValueSha256],
      ["LC_ALL", "fixed", "C"],
      ["PATH", "derived", pathValue]
    );
  } else if (environmentBinding === "provision-attempt-initial") {
    const paths = {
      config: join(provisionRoot, "config"),
      data: join(provisionRoot, "data"),
      logs: join(provisionRoot, "logs"),
      nodeCompile: join(provisionRoot, "node-compile-cache"),
      npmCache: join(provisionRoot, "npm-cache"),
      playwrightBrowsers: join(provisionRoot, "playwright-browsers"),
      prefix: join(provisionRoot, "npm-prefix"),
      state: join(provisionRoot, "state"),
      temp: join(provisionRoot, "temp"),
      turbo: join(provisionRoot, "turbo-cache")
    };
    definitions.push(
      ["HOME", "live-home", homeValue, homeValueSha256],
      ["MAIS_DEPENDENCY_OWNER_TOKEN", "derived", ownerToken],
      ["NEXT_TELEMETRY_DISABLED", "fixed", "1"],
      ["NODE_COMPILE_CACHE", "derived", paths.nodeCompile],
      ["NODE_OPTIONS", "fixed", "--dns-result-order=ipv4first"],
      ["NPM_CONFIG_AUDIT", "fixed", "false"],
      ["NPM_CONFIG_CACHE", "derived", paths.npmCache],
      ["NPM_CONFIG_FETCH_RETRIES", "fixed", "8"],
      ["NPM_CONFIG_FETCH_RETRY_FACTOR", "fixed", "2"],
      ["NPM_CONFIG_FETCH_RETRY_MINTIMEOUT", "fixed", "3000"],
      ["NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT", "fixed", "60000"],
      ["NPM_CONFIG_FETCH_TIMEOUT", "fixed", "300000"],
      ["NPM_CONFIG_FUND", "fixed", "false"],
      ["NPM_CONFIG_GLOBALCONFIG", "derived", join(paths.config, "npm-globalrc")],
      ["NPM_CONFIG_LOGS_DIR", "derived", paths.logs],
      ["NPM_CONFIG_MAXSOCKETS", "fixed", "1"],
      ["NPM_CONFIG_PREFIX", "derived", paths.prefix],
      ["NPM_CONFIG_PROGRESS", "fixed", "false"],
      ["NPM_CONFIG_REGISTRY", "fixed", "https://registry.npmjs.org/"],
      ["NPM_CONFIG_UPDATE_NOTIFIER", "fixed", "false"],
      ["NPM_CONFIG_USERCONFIG", "derived", join(paths.config, "npm-userrc")],
      ["PATH", "derived", pathValue],
      ["PLAYWRIGHT_BROWSERS_PATH", "derived", paths.playwrightBrowsers],
      ["PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "fixed", "1"],
      ["TEMP", "derived", paths.temp],
      ["TMP", "derived", paths.temp],
      ["TMPDIR", "derived", paths.temp],
      ["TURBO_CACHE_DIR", "derived", paths.turbo],
      ["TURBO_TELEMETRY_DISABLED", "fixed", "1"],
      ["XDG_CACHE_HOME", "derived", paths.npmCache],
      ["XDG_CONFIG_HOME", "derived", paths.config],
      ["XDG_DATA_HOME", "derived", paths.data],
      ["XDG_STATE_HOME", "derived", paths.state]
    );
  } else {
    bootstrapFinalizationFailure();
  }
  definitions.sort((left, right) => compareCodeUnits(left[0], right[0]));
  const entries = definitions.map(([key, source, value, knownHash]) =>
    nullRecord([
      ["key", key],
      ["source", source],
      ["presence", "present"],
      ["valueSha256", knownHash ?? hashEnvironmentText(key, value)]
    ])
  );
  if (environmentBinding === "provision-attempt-initial") {
    const environment = process.env;
    if (
      environment === null
      || typeof environment !== "object"
      || IS_PROXY(environment)
    ) {
      bootstrapFinalizationFailure();
    }
    for (const key of OPTIONAL_ATTEMPT_AMBIENT_KEYS) {
      entries.push(optionalAmbientEntry(environment, key));
    }
  }
  entries.sort((left, right) => compareCodeUnits(left.key, right.key));
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].key === entries[index].key) {
      bootstrapFinalizationFailure();
    }
  }
  return Object.freeze(entries);
}

function materializeInitialAttemptEnvironment(
  liveHomeProof,
  commandId,
  environmentBinding,
  provisionRoot,
  ownerToken
) {
  const { homeValue, homeValueSha256 } = currentOwnHomeValue(liveHomeProof);
  const nodeExecutable = stableRealpath(process.execPath);
  const pathValue = `${dirname(nodeExecutable)}:/usr/bin:/bin:/usr/sbin:/sbin`;
  const definitions = [];
  if (environmentBinding === "owned-audit") {
    definitions.push(
      ["HOME", "live-home", homeValue, homeValueSha256],
      ["LC_ALL", "fixed", "C"],
      ["PATH", "derived", pathValue]
    );
  } else if (environmentBinding === "provision-attempt-initial") {
    const paths = {
      config: join(provisionRoot, "config"),
      data: join(provisionRoot, "data"),
      logs: join(provisionRoot, "logs"),
      nodeCompile: join(provisionRoot, "node-compile-cache"),
      npmCache: join(provisionRoot, "npm-cache"),
      playwrightBrowsers: join(provisionRoot, "playwright-browsers"),
      prefix: join(provisionRoot, "npm-prefix"),
      state: join(provisionRoot, "state"),
      temp: join(provisionRoot, "temp"),
      turbo: join(provisionRoot, "turbo-cache")
    };
    definitions.push(
      ["HOME", "live-home", homeValue, homeValueSha256],
      ["MAIS_DEPENDENCY_OWNER_TOKEN", "derived", ownerToken],
      ["NEXT_TELEMETRY_DISABLED", "fixed", "1"],
      ["NODE_COMPILE_CACHE", "derived", paths.nodeCompile],
      ["NODE_OPTIONS", "fixed", "--dns-result-order=ipv4first"],
      ["NPM_CONFIG_AUDIT", "fixed", "false"],
      ["NPM_CONFIG_CACHE", "derived", paths.npmCache],
      ["NPM_CONFIG_FETCH_RETRIES", "fixed", "8"],
      ["NPM_CONFIG_FETCH_RETRY_FACTOR", "fixed", "2"],
      ["NPM_CONFIG_FETCH_RETRY_MINTIMEOUT", "fixed", "3000"],
      ["NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT", "fixed", "60000"],
      ["NPM_CONFIG_FETCH_TIMEOUT", "fixed", "300000"],
      ["NPM_CONFIG_FUND", "fixed", "false"],
      ["NPM_CONFIG_GLOBALCONFIG", "derived", join(paths.config, "npm-globalrc")],
      ["NPM_CONFIG_LOGS_DIR", "derived", paths.logs],
      ["NPM_CONFIG_MAXSOCKETS", "fixed", "1"],
      ["NPM_CONFIG_PREFIX", "derived", paths.prefix],
      ["NPM_CONFIG_PROGRESS", "fixed", "false"],
      ["NPM_CONFIG_REGISTRY", "fixed", "https://registry.npmjs.org/"],
      ["NPM_CONFIG_UPDATE_NOTIFIER", "fixed", "false"],
      ["NPM_CONFIG_USERCONFIG", "derived", join(paths.config, "npm-userrc")],
      ["PATH", "derived", pathValue],
      ["PLAYWRIGHT_BROWSERS_PATH", "derived", paths.playwrightBrowsers],
      ["PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "fixed", "1"],
      ["TEMP", "derived", paths.temp],
      ["TMP", "derived", paths.temp],
      ["TMPDIR", "derived", paths.temp],
      ["TURBO_CACHE_DIR", "derived", paths.turbo],
      ["TURBO_TELEMETRY_DISABLED", "fixed", "1"],
      ["XDG_CACHE_HOME", "derived", paths.npmCache],
      ["XDG_CONFIG_HOME", "derived", paths.config],
      ["XDG_DATA_HOME", "derived", paths.data],
      ["XDG_STATE_HOME", "derived", paths.state]
    );
  } else {
    attemptOperationFailure();
  }
  const environment = process.env;
  if (
    environment === null
    || typeof environment !== "object"
    || IS_PROXY(environment)
  ) {
    attemptOperationFailure();
  }
  if (environmentBinding === "provision-attempt-initial") {
    for (const key of OPTIONAL_ATTEMPT_AMBIENT_KEYS) {
      const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(environment, key);
      if (!descriptor) {
        if (key in environment) attemptOperationFailure();
        continue;
      }
      if (
        !OBJECT_HAS_OWN(descriptor, "value")
        || descriptor.enumerable !== true
        || typeof descriptor.value !== "string"
      ) {
        attemptOperationFailure();
      }
      definitions.push([key, "ambient", descriptor.value]);
    }
  }
  definitions.sort((left, right) => compareCodeUnits(left[0], right[0]));
  const entries = [];
  const childEnvironment = OBJECT_CREATE(null);
  for (const [key, source, value, knownHash] of definitions) {
    if (entries.length > 0 && entries[entries.length - 1].key === key) {
      attemptOperationFailure();
    }
    entries.push(nullRecord([
      ["key", key],
      ["source", source],
      ["presence", "present"],
      ["valueSha256", knownHash ?? hashEnvironmentText(key, value)]
    ]));
    OBJECT_DEFINE_PROPERTY(childEnvironment, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    });
  }
  if (environmentBinding === "provision-attempt-initial") {
    for (const key of OPTIONAL_ATTEMPT_AMBIENT_KEYS) {
      if (!OBJECT_HAS_OWN(childEnvironment, key)) {
        entries.push(nullRecord([
          ["key", key],
          ["source", "ambient"],
          ["presence", "absent"]
        ]));
      }
    }
    entries.sort((left, right) => compareCodeUnits(left.key, right.key));
  }
  const inventory = nullRecord([
    ["schemaVersion", 2],
    ["environmentHashSchemaVersion", 2],
    ["commandId", commandId],
    ["environmentBinding", environmentBinding],
    ["entries", Object.freeze(entries)]
  ]);
  return {
    childEnvironment,
    inventoryFingerprint: hashCanonicalProof(
      ATTEMPT_ENVIRONMENT_INVENTORY_DOMAIN,
      inventory
    )
  };
}

function wipeChildEnvironment(environment) {
  if (!environment || typeof environment !== "object") return;
  for (const key of REFLECT_OWN_KEYS(environment)) {
    if (typeof key !== "string") continue;
    try {
      OBJECT_DEFINE_PROPERTY(environment, key, {
        configurable: true,
        enumerable: true,
        value: "",
        writable: true
      });
      Reflect.deleteProperty(environment, key);
    } catch {
      // The null-prototype environment is discarded after this best-effort wipe.
    }
  }
}

function buildInitialAttemptEnvironmentInventorySet(
  liveHomeProof,
  authorityBinding,
  bootstrapAuthorityBindingFingerprint,
  provisionRoot
) {
  const ownerToken = hashCanonicalProof(
    ATTEMPT_OWNER_TOKEN_DOMAIN,
    nullRecord([
      ["schemaVersion", 1],
      ["attemptId", authorityBinding.attemptId],
      [
        "bootstrapAuthorityBindingFingerprint",
        bootstrapAuthorityBindingFingerprint
      ]
    ])
  );
  const inventoryLinks = [];
  const inventoryFingerprints = [];
  for (const commandId of INITIAL_ATTEMPT_COMMAND_IDS) {
    const descriptor = ownedProcessDescriptorById.get(commandId);
    if (!descriptor) bootstrapFinalizationFailure();
    const entries = finalEnvironmentEntries(
      liveHomeProof,
      commandId,
      descriptor.environmentBinding,
      provisionRoot,
      ownerToken
    );
    const inventory = nullRecord([
      ["schemaVersion", 2],
      ["environmentHashSchemaVersion", 2],
      ["commandId", commandId],
      ["environmentBinding", descriptor.environmentBinding],
      ["entries", entries]
    ]);
    const inventoryFingerprint = hashCanonicalProof(
      ATTEMPT_ENVIRONMENT_INVENTORY_DOMAIN,
      inventory
    );
    inventoryLinks.push(nullRecord([
      ["commandId", commandId],
      ["environmentBinding", descriptor.environmentBinding],
      ["inventoryFingerprint", inventoryFingerprint]
    ]));
    inventoryFingerprints.push([commandId, inventoryFingerprint]);
  }
  const set = nullRecord([
    ["schemaVersion", 2],
    ["environmentHashSchemaVersion", 2],
    ["mode", "initial"],
    ["inventories", Object.freeze(inventoryLinks)]
  ]);
  return {
    fingerprint: hashCanonicalProof(
      ATTEMPT_ENVIRONMENT_INVENTORY_SET_DOMAIN,
      set
    ),
    inventoryFingerprints: nullRecord(inventoryFingerprints)
  };
}

function observeBoundInitialProvisionRoot(
  repositoryObservation,
  attemptId,
  expectedRootBindingFingerprint,
  retainedDescriptor
) {
  const relativePath = initialProvisionRootRelativePath(attemptId);
  const provisionRoot = join(repositoryObservation.repositoryRoot, relativePath);
  let rootObservation;
  try {
    rootObservation = observeDirectory(
      provisionRoot,
      "initial-provision-install-root",
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      true
    );
  } catch {
    bootstrapFinalizationFailure();
  }
  if (
    !rootObservation?.entry
    || (rootObservation.entry.mode & 0o7777n) !== 0o700n
  ) {
    bootstrapFinalizationFailure();
  }
  if (retainedDescriptor !== undefined) {
    let descriptorEntry;
    try {
      descriptorEntry = fstatSync(retainedDescriptor, { bigint: true });
    } catch {
      bootstrapFinalizationFailure();
    }
    if (
      !descriptorEntry?.isDirectory()
      || descriptorEntry.isSymbolicLink()
      || !sameDirectoryIdentity(rootObservation.entry, descriptorEntry)
    ) {
      bootstrapFinalizationFailure();
    }
  }
  const binding = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", attemptId],
    ["mode", "initial"],
    [
      "repositoryBindingFingerprint",
      repositoryObservation.repositoryBindingFingerprint
    ],
    [
      "tmpBaseIdentityFingerprint",
      repositoryObservation.tmpBaseIdentityFingerprint
    ],
    ["provisionRootPathFingerprint", rootObservation.pathFingerprint],
    ["provisionRootIdentityFingerprint", rootObservation.identityFingerprint]
  ]);
  const fingerprint = hashCanonicalProof(PROVISION_ROOT_BINDING_DOMAIN, binding);
  if (
    expectedRootBindingFingerprint !== undefined
    && fingerprint !== expectedRootBindingFingerprint
  ) {
    bootstrapFinalizationFailure();
  }
  return {
    fingerprint,
    provisionRoot,
    relativePath,
    rootIdentityFingerprint: rootObservation.identityFingerprint
  };
}

function assertStaticObservationMatchesBootstrapContext(
  observation,
  retainedContext
) {
  if (
    observation.repositoryObservation.repositoryBindingFingerprint
      !== retainedContext.repositoryBindingFingerprint
    || observation.repositoryObservation.repositoryIdentityFingerprint
      !== retainedContext.repositoryRootIdentityFingerprint
    || observation.repositoryObservation.tmpBaseIdentityFingerprint
      !== retainedContext.tmpBaseIdentityFingerprint
    || observation.sourceSeedFingerprint !== retainedContext.sourceSeedFingerprint
  ) {
    bootstrapFinalizationFailure();
  }
}

export function finalizeRequiredBrowserProvisionBootstrap(
  liveHomeProof,
  bootstrapAuthority
) {
  const state = bootstrapLaunchContexts.get(bootstrapAuthority);
  if (!state) bootstrapFinalizationFailure();
  if (
    state.status !== "probes-complete"
    || state.inFlightCommandId !== undefined
  ) {
    failBootstrapFinalizationState(state);
    bootstrapFinalizationFailure();
  }
  state.status = "finalizing";
  try {
    assertLiveHomeProof(liveHomeProof);
    const authorityBinding =
      readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
        liveHomeProof,
        bootstrapAuthority
      );
    if (
      authorityBinding.mode !== "initial"
      || state.context?.mode !== "initial"
      || state.context?.attemptId !== authorityBinding.attemptId
    ) {
      failBootstrapFinalizationState(state);
      bootstrapFinalizationFailure();
    }
    const aggregate = sealBootstrapFivePassAggregate(state, authorityBinding);
    const initialObservation = buildStableBootstrapStaticObservation();
    assertStaticObservationMatchesBootstrapContext(
      initialObservation,
      state.context
    );
    const root = createInitialProvisionRoot(
      initialObservation.repositoryObservation,
      authorityBinding,
      state.context,
      state
    );
    state.provisionRootDescriptor = root.provisionRootDescriptor;

    const policies = buildInitialAttemptPolicies(
      state.context.repositoryBindingFingerprint,
      root.fingerprint
    );
    const environmentSet = buildInitialAttemptEnvironmentInventorySet(
      liveHomeProof,
      authorityBinding,
      state.context.bootstrapAuthorityBindingFingerprint,
      root.provisionRoot
    );
    const npmIdentityResult = state.results.get(
      "owner.dependency.probe.which-npm"
    );
    const npmCliPrivateBinding = state.npmCliPrivateBinding;
    if (
      !npmIdentityResult
      || npmIdentityResult.outcome !== "PASS"
      || !npmCliPrivateBinding
    ) {
      bootstrapFinalizationFailure();
    }
    const npmCliObservation = observeBoundNpmCli(
      npmCliPrivateBinding,
      npmIdentityResult
    );
    const nodeRuntimeObservation = observeLauncherNodeRuntime();
    const finalObservation = buildStableBootstrapStaticObservation();
    assertStaticObservationMatchesBootstrapContext(finalObservation, state.context);
    const finalRoot = observeBoundInitialProvisionRoot(
      finalObservation.repositoryObservation,
      authorityBinding.attemptId,
      root.fingerprint,
      root.provisionRootDescriptor
    );
    currentOwnHomeValue(liveHomeProof);

    const completion = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", authorityBinding.attemptId],
      ["mode", "initial"],
      [
        "bootstrapAuthorityBindingFingerprint",
        state.context.bootstrapAuthorityBindingFingerprint
      ],
      ["fivePassAggregateFingerprint", aggregate.fingerprint],
      ["sourceSeedFingerprint", state.context.sourceSeedFingerprint],
      ["repositoryBindingFingerprint", state.context.repositoryBindingFingerprint],
      ["provisionRootBindingFingerprint", root.fingerprint],
      ["bootstrapScopeFingerprint", state.context.bootstrapScopeFingerprint],
      [
        "bootstrapCommandCatalogFingerprint",
        state.context.bootstrapCommandCatalogFingerprint
      ],
      ["ownedProcessCatalogFingerprint", state.context.ownedProcessCatalogFingerprint],
      [
        "bootstrapEnvironmentInventorySetFingerprint",
        state.context.bootstrapEnvironmentInventorySetFingerprint
      ],
      ["finalCommandScopeFingerprint", policies.commandScopeFingerprint],
      ["finalDescriptorSetFingerprint", policies.descriptorSetFingerprint],
      ["finalEnvironmentInventorySetFingerprint", environmentSet.fingerprint],
      [
        "dependencyPathPolicyFingerprint",
        policies.dependencyPathPolicyFingerprint
      ],
      ["evidencePolicyFingerprint", policies.evidencePolicyFingerprint]
    ]);
    assertNoLiveHomeRetention(liveHomeProof, completion);
    completeRequiredBrowserProvisionBootstrapAuthority(
      liveHomeProof,
      bootstrapAuthority,
      completion
    );
    const attemptAuthority =
      promoteInitialRequiredBrowserProvisionBootstrapAuthority(
        liveHomeProof,
        bootstrapAuthority
      );
    const attemptBinding =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const attemptAuthorityBindingFingerprint = hashCanonicalProof(
      ATTEMPT_AUTHORITY_BINDING_DOMAIN,
      attemptBinding
    );
    if (
      attemptBinding.attemptId !== authorityBinding.attemptId
      || attemptBinding.mode !== "initial"
      || attemptBinding.sourceSeedFingerprint !== state.context.sourceSeedFingerprint
      || attemptBinding.bootstrapAuthorityBindingFingerprint
        !== state.context.bootstrapAuthorityBindingFingerprint
      || attemptBinding.repositoryBindingFingerprint
        !== state.context.repositoryBindingFingerprint
      || attemptBinding.provisionRootBindingFingerprint !== root.fingerprint
      || attemptBinding.ownedProcessCatalogFingerprint
        !== state.context.ownedProcessCatalogFingerprint
      || attemptBinding.finalCommandScopeFingerprint
        !== policies.commandScopeFingerprint
      || attemptBinding.finalDescriptorSetFingerprint
        !== policies.descriptorSetFingerprint
      || attemptBinding.finalEnvironmentInventorySetFingerprint
        !== environmentSet.fingerprint
      || attemptBinding.dependencyPathPolicyFingerprint
        !== policies.dependencyPathPolicyFingerprint
      || attemptBinding.evidencePolicyFingerprint
        !== policies.evidencePolicyFingerprint
    ) {
      bootstrapFinalizationFailure();
    }
    const attemptLaunchContext = OBJECT_FREEZE(OBJECT_CREATE(null));
    const attemptLaunchContextState = {
      attemptAuthority,
      attemptAuthorityBindingFingerprint,
      attemptId: authorityBinding.attemptId,
      bootstrapAuthorityBindingFingerprint:
        state.context.bootstrapAuthorityBindingFingerprint,
      dependencyPathPolicyFingerprint:
        policies.dependencyPathPolicyFingerprint,
      evidencePolicyFingerprint: policies.evidencePolicyFingerprint,
      environmentInventoryFingerprints:
        environmentSet.inventoryFingerprints,
      fivePassAggregateFingerprint: aggregate.fingerprint,
      finalCommandScopeFingerprint: policies.commandScopeFingerprint,
      finalDescriptorSetFingerprint: policies.descriptorSetFingerprint,
      finalEnvironmentInventorySetFingerprint: environmentSet.fingerprint,
      liveHomeProof,
      mode: "initial",
      npmCliContentSha256: npmIdentityResult.npmCliContentSha256,
      npmCliPathFingerprint: npmIdentityResult.npmCliPathFingerprint,
      npmCliPhysicalIdentityFingerprint:
        npmIdentityResult.npmCliPhysicalIdentityFingerprint,
      npmCliPath: npmCliObservation.npmCliPath,
      npmManifestContentSha256:
        npmCliPrivateBinding.npmManifestContentSha256,
      npmManifestPath: npmCliPrivateBinding.npmManifestPath,
      npmVersion: npmIdentityResult.npmVersion,
      nodeExecutableContentSha256: nodeRuntimeObservation.contentSha256,
      nodeExecutableIdentityFingerprint:
        nodeRuntimeObservation.identityFingerprint,
      nodeExecutablePath: nodeRuntimeObservation.canonicalPath,
      provisionRootBindingFingerprint: root.fingerprint,
      provisionRootDescriptor: root.provisionRootDescriptor,
      provisionRootIdentityFingerprint: finalRoot.rootIdentityFingerprint,
      provisionRootRelativePath: finalRoot.relativePath,
      publicCommandIds: policies.publicCommandIds,
      activationFilesystemDisposition: "not-started",
      auxiliaryProcessUncertainty: false,
      operationLogDisposition: "not-started",
      operationProcessTerminality: "not-started",
      repositoryBindingFingerprint: state.context.repositoryBindingFingerprint,
      repositoryDev: finalObservation.repositoryObservation.repositoryDev,
      repositoryRoot: finalObservation.repositoryObservation.repositoryRoot,
      repositoryRootIdentityFingerprint:
        state.context.repositoryRootIdentityFingerprint,
      repositoryUid: finalObservation.repositoryObservation.repositoryUid,
      sourceSeedFingerprint: state.context.sourceSeedFingerprint,
      status: "ready",
      tmpBaseIdentityFingerprint: state.context.tmpBaseIdentityFingerprint
    };
    if (pendingAttemptLaunchContextsByAuthority.has(attemptAuthority)) {
      bootstrapFinalizationFailure();
    }
    attemptLaunchContexts.set(attemptLaunchContext, attemptLaunchContextState);
    pendingAttemptLaunchContextsByAuthority.set(
      attemptAuthority,
      attemptLaunchContext
    );
    state.provisionRootDescriptor = undefined;
    state.npmCliPrivateBinding = undefined;
    state.status = "finalized";
    return nullRecord([
      ["attemptAuthority", attemptAuthority],
      ["attemptLaunchContext", attemptLaunchContext]
    ]);
  } catch (error) {
    failBootstrapFinalizationState(state);
    if (error?.message === "Required-browser bootstrap finalization rejected.") {
      throw error;
    }
    bootstrapFinalizationFailure();
  }
}

export function registerRequiredBrowserProvisionAttemptLaunchContext(
  liveHomeProof,
  attemptAuthority,
  attemptLaunchContext
) {
  const suppliedContextState = attemptLaunchContexts.get(attemptLaunchContext);
  const authorityContext = pendingAttemptLaunchContextsByAuthority.get(
    attemptAuthority
  );
  const authorityContextState = authorityContext === undefined
    ? undefined
    : attemptLaunchContexts.get(authorityContext);
  const reservedStates = [];
  for (const candidateState of [suppliedContextState, authorityContextState]) {
    if (
      candidateState
      && candidateState.status === "ready"
      && !reservedStates.includes(candidateState)
    ) {
      candidateState.status = "registering";
      reservedStates.push(candidateState);
    }
  }
  if (reservedStates.length === 0) {
    attemptRegistrationFailure();
  }
  const privateState = suppliedContextState;
  try {
    assertLiveHomeProof(liveHomeProof);
    if (
      !privateState
      || privateState.status !== "registering"
      || authorityContext !== attemptLaunchContext
      || authorityContextState !== privateState
      || privateState.liveHomeProof !== liveHomeProof
      || privateState.attemptAuthority !== attemptAuthority
      || registeredAttemptLaunchContexts.has(attemptAuthority)
    ) {
      attemptRegistrationFailure();
    }
    const attemptBinding =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const attemptAuthorityBindingFingerprint = hashCanonicalProof(
      ATTEMPT_AUTHORITY_BINDING_DOMAIN,
      attemptBinding
    );
    if (
      attemptBinding.mode !== "initial"
      || attemptBinding.attemptId !== privateState.attemptId
      || attemptAuthorityBindingFingerprint
        !== privateState.attemptAuthorityBindingFingerprint
    ) {
      attemptRegistrationFailure();
    }
    const observation = buildStableBootstrapStaticObservation();
    if (
      observation.repositoryObservation.repositoryBindingFingerprint
        !== privateState.repositoryBindingFingerprint
      || observation.repositoryObservation.repositoryIdentityFingerprint
        !== privateState.repositoryRootIdentityFingerprint
      || observation.repositoryObservation.tmpBaseIdentityFingerprint
        !== privateState.tmpBaseIdentityFingerprint
      || observation.sourceSeedFingerprint !== privateState.sourceSeedFingerprint
    ) {
      attemptRegistrationFailure();
    }
    const root = observeBoundInitialProvisionRoot(
      observation.repositoryObservation,
      privateState.attemptId,
      privateState.provisionRootBindingFingerprint,
      privateState.provisionRootDescriptor
    );
    if (
      root.relativePath !== privateState.provisionRootRelativePath
      || root.rootIdentityFingerprint
        !== privateState.provisionRootIdentityFingerprint
    ) {
      attemptRegistrationFailure();
    }
    const policies = buildInitialAttemptPolicies(
      privateState.repositoryBindingFingerprint,
      privateState.provisionRootBindingFingerprint
    );
    const environmentSet = buildInitialAttemptEnvironmentInventorySet(
      liveHomeProof,
      attemptBinding,
      privateState.bootstrapAuthorityBindingFingerprint,
      root.provisionRoot
    );
    if (
      policies.commandScopeFingerprint
        !== privateState.finalCommandScopeFingerprint
      || policies.descriptorSetFingerprint
        !== privateState.finalDescriptorSetFingerprint
      || policies.dependencyPathPolicyFingerprint
        !== privateState.dependencyPathPolicyFingerprint
      || policies.evidencePolicyFingerprint
        !== privateState.evidencePolicyFingerprint
      || environmentSet.fingerprint
        !== privateState.finalEnvironmentInventorySetFingerprint
    ) {
      attemptRegistrationFailure();
    }
    for (const commandId of INITIAL_ATTEMPT_COMMAND_IDS) {
      if (
        environmentSet.inventoryFingerprints[commandId]
          !== privateState.environmentInventoryFingerprints[commandId]
      ) {
        attemptRegistrationFailure();
      }
    }
    const nodeRuntimeObservation = observeLauncherNodeRuntime();
    if (
      nodeRuntimeObservation.canonicalPath !== privateState.nodeExecutablePath
      || nodeRuntimeObservation.identityFingerprint
        !== privateState.nodeExecutableIdentityFingerprint
      || nodeRuntimeObservation.contentSha256
        !== privateState.nodeExecutableContentSha256
    ) {
      attemptRegistrationFailure();
    }
    observeBoundNpmCli(
      {
        npmCliPath: privateState.npmCliPath,
        npmManifestContentSha256: privateState.npmManifestContentSha256,
        npmManifestPath: privateState.npmManifestPath,
        npmVersion: privateState.npmVersion
      },
      {
        npmCliContentSha256: privateState.npmCliContentSha256,
        npmCliPathFingerprint: privateState.npmCliPathFingerprint,
        npmCliPhysicalIdentityFingerprint:
          privateState.npmCliPhysicalIdentityFingerprint,
        npmVersion: privateState.npmVersion
      }
    );
    currentOwnHomeValue(liveHomeProof);
    registeredAttemptLaunchContexts.set(attemptAuthority, attemptLaunchContext);
    privateState.status = "registered";
  } catch (error) {
    for (const reservedState of reservedStates) {
      failAttemptLaunchContextState(reservedState);
    }
    if (
      error?.message
        === "Required-browser attempt launch-context registration rejected."
    ) {
      throw error;
    }
    attemptRegistrationFailure();
  }
}

function writeAllDescriptorBytes(descriptor, bytes, failure = attemptLockFailure) {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const written = writeSync(
      descriptor,
      bytes,
      offset,
      bytes.byteLength - offset,
      null
    );
    if (!Number.isSafeInteger(written) || written <= 0) failure();
    offset += written;
  }
}

function registeredAttemptState(attemptAuthority) {
  const attemptLaunchContext = registeredAttemptLaunchContexts.get(
    attemptAuthority
  );
  if (!attemptLaunchContext) return undefined;
  return attemptLaunchContexts.get(attemptLaunchContext);
}

function activationLockPaths(attemptId, repositoryRoot) {
  const activePath = join(repositoryRoot, ACTIVATION_LOCK_RELATIVE_PATH);
  return {
    activePath,
    parentPath: dirname(activePath),
    retainedPath: `${activePath}.retained-${attemptId}`
  };
}

function observeActivationLockFile(
  exactPath,
  role,
  repositoryObservation,
  expectedBytes,
  expectedNlink = 1n
) {
  const observation = observeRegularFile(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    64 * 1024,
    expectedNlink === 1n
  );
  if (
    (observation.entry.mode & 0o7777n) !== 0o600n
    || observation.entry.nlink !== expectedNlink
    || !Buffer.from(observation.bytes).equals(expectedBytes)
  ) {
    attemptLockFailure();
  }
  return observation;
}

function initialLayoutDirectoryRole(relativePath) {
  if (relativePath === "node-compile-cache") return "nodeCompileCache";
  if (relativePath === "npm-cache") return "npmCache";
  if (relativePath === "npm-prefix") return "npmPrefix";
  if (relativePath === "playwright-browsers") return "playwrightBrowsers";
  if (relativePath === "turbo-cache") return "turboCache";
  return relativePath;
}

function initialLayoutPaths(provisionRoot) {
  const paths = {
    provisionRoot
  };
  for (const relativePath of INITIAL_LAYOUT_ROOT_DIRECTORIES) {
    const key = initialLayoutDirectoryRole(relativePath);
    paths[key] = join(provisionRoot, relativePath);
  }
  return paths;
}

function sameDirectoryObservation(left, right) {
  return left.identityFingerprint === right.identityFingerprint
    && left.entry.dev === right.entry.dev
    && left.entry.ino === right.entry.ino
    && left.entry.mode === right.entry.mode
    && left.entry.uid === right.entry.uid
    && left.entry.gid === right.entry.gid;
}

function exactDirectoryEntries(
  exactPath,
  role,
  repositoryObservation,
  expectedEntries,
  expectedIdentityFingerprint
) {
  const before = observeDirectory(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    true
  );
  let entries;
  try {
    entries = readdirSync(exactPath, { encoding: "utf8" });
  } catch {
    attemptLayoutFailure();
  }
  entries.sort(compareCodeUnits);
  const after = observeDirectory(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    true
  );
  if (
    !sameDirectoryObservation(before, after)
    || (after.entry.mode & 0o7777n) !== 0o700n
    || (
      expectedIdentityFingerprint !== undefined
      && after.identityFingerprint !== expectedIdentityFingerprint
    )
    || entries.length !== expectedEntries.length
  ) {
    attemptLayoutFailure();
  }
  const expected = [...expectedEntries].sort(compareCodeUnits);
  for (let index = 0; index < expected.length; index += 1) {
    if (entries[index] !== expected[index]) attemptLayoutFailure();
  }
  return after;
}

function createInitialLayoutDirectory(
  exactPath,
  role,
  repositoryObservation
) {
  try {
    mkdirSync(exactPath, { mode: 0o700, recursive: false });
  } catch {
    attemptLayoutFailure();
  }
  const observation = observeDirectory(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    true
  );
  if ((observation.entry.mode & 0o7777n) !== 0o700n) {
    attemptLayoutFailure();
  }
  return observation;
}

function writeExclusiveInitialLayoutBytes(
  exactPath,
  role,
  bytes,
  repositoryObservation
) {
  let descriptor;
  let failed = false;
  try {
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600
    );
    writeAllDescriptorBytes(descriptor, bytes, attemptLayoutFailure);
    fsyncSync(descriptor);
    const entry = fstatSync(descriptor, { bigint: true });
    if (
      !entry.isFile()
      || entry.isSymbolicLink()
      || entry.nlink !== 1n
      || (entry.mode & 0o7777n) !== 0o600n
      || entry.uid !== repositoryObservation.repositoryUid
      || entry.dev !== repositoryObservation.repositoryDev
      || entry.size !== BigInt(bytes.byteLength)
    ) {
      attemptLayoutFailure();
    }
  } catch {
    failed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        failed = true;
      }
    }
  }
  if (failed) attemptLayoutFailure();
  fsyncDirectory(dirname(exactPath));
  const observation = observeRegularFile(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    64 * 1024 * 1024
  );
  if (
    (observation.entry.mode & 0o7777n) !== 0o600n
    || !Buffer.from(observation.bytes).equals(Buffer.from(bytes))
  ) {
    attemptLayoutFailure();
  }
  return observation;
}

function writeExclusiveInitialLayoutArtifact(
  exactPath,
  role,
  value,
  repositoryObservation
) {
  const artifact = canonicalizeClosedJsonArtifact(value);
  const bytes = artifact.copyBytes();
  const observation = writeExclusiveInitialLayoutBytes(
    exactPath,
    role,
    bytes,
    repositoryObservation
  );
  if (observation.rawByteSha256 !== artifact.sha256) {
    attemptLayoutFailure();
  }
  verifyCanonicalJsonArtifactBytes(
    observation.bytes,
    artifact.sha256,
    value
  );
  return { artifact, observation };
}

function revalidateInitialLayoutFile(
  exactPath,
  role,
  expectedObservation,
  repositoryObservation,
  expectedMode = 0o600n
) {
  const observation = observeRegularFile(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    64 * 1024 * 1024
  );
  if (
    observation.identityFingerprint !== expectedObservation.identityFingerprint
    || observation.rawByteSha256 !== expectedObservation.rawByteSha256
    || (
      expectedMode !== null
      && (observation.entry.mode & 0o7777n) !== expectedMode
    )
  ) {
    attemptLayoutFailure();
  }
  return observation;
}

function inventoryInitialNpmCache(
  paths,
  state,
  repositoryObservation
) {
  const expectedRootIdentity =
    state.layout?.directoryIdentityFingerprints?.npmCache;
  const cacheMarkerBinding = state.layout?.fileBindings?.cacheMarker;
  if (!expectedRootIdentity || !cacheMarkerBinding) {
    attemptOperationFailure();
  }
  const initialRoot = observeDirectory(
    paths.npmCache,
    "npmCache",
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    true
  );
  if (
    initialRoot.identityFingerprint !== expectedRootIdentity
    || (initialRoot.entry.mode & 0o7777n) !== 0o700n
  ) {
    attemptOperationFailure();
  }
  const markerObservation = revalidateInitialLayoutFile(
    join(paths.npmCache, ".mais-dependency-cache.json"),
    "initial-layout-cache-marker",
    cacheMarkerBinding,
    repositoryObservation
  );
  let marker;
  try {
    marker = parseStrictJsonObject(markerObservation.bytes);
  } catch {
    attemptOperationFailure();
  }
  if (
    canonicalizeClosedJson(marker)
      !== Buffer.from(markerObservation.bytes).toString("utf8")
    || hashCanonicalProof(PROVISION_CACHE_MARKER_DOMAIN, marker)
      !== state.layout.cacheMarkerFingerprint
  ) {
    attemptOperationFailure();
  }
  const entries = [];
  let totalBytes = 0;
  const walk = (directory) => {
    const relativeDirectory = relative(paths.npmCache, directory);
    const directoryRole = relativeDirectory === ""
      ? "npmCache"
      : `npm-cache-inventory-directory:${relativeDirectory}`;
    const before = observeDirectory(
      directory,
      directoryRole,
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      true
    );
    let children;
    try {
      children = readdirSync(directory, { encoding: "utf8" });
    } catch {
      attemptOperationFailure();
    }
    children.sort(compareCodeUnits);
    for (const childName of children) {
      const candidate = join(directory, childName);
      const relativePath = relative(paths.npmCache, candidate);
      if (relativePath === ".mais-dependency-cache.json") continue;
      if (
        relativePath === ""
        || relativePath === ".."
        || relativePath.startsWith(`..${String.fromCharCode(47)}`)
        || isAbsolute(relativePath)
        || relativePath.includes(String.fromCharCode(92))
        || entries.length >= 100_000
      ) {
        attemptOperationFailure();
      }
      const entry = stableLstat(candidate);
      if (!entry || entry.isSymbolicLink()) attemptOperationFailure();
      if (entry.isDirectory()) {
        const observedDirectory = observeDirectory(
          candidate,
          `npm-cache-inventory-directory:${relativePath}`,
          repositoryObservation.repositoryUid,
          repositoryObservation.repositoryDev,
          true
        );
        entries.push(nullRecord([
          ["relativePath", relativePath],
          ["type", "directory"],
          ["mode", observedDirectory.entry.mode.toString(10)]
        ]));
        walk(candidate);
        continue;
      }
      if (!entry.isFile() || entry.nlink !== 1n) attemptOperationFailure();
      const observedFile = readStableRegularFile(
        candidate,
        repositoryObservation.repositoryUid,
        repositoryObservation.repositoryDev,
        64 * 1024 * 1024,
        false
      );
      const size = Number(observedFile.entry.size);
      if (!Number.isSafeInteger(size) || size < 0) attemptOperationFailure();
      totalBytes += size;
      if (!Number.isSafeInteger(totalBytes) || totalBytes > 1024 * 1024 * 1024) {
        attemptOperationFailure();
      }
      entries.push(nullRecord([
        ["relativePath", relativePath],
        ["type", "file"],
        ["mode", observedFile.entry.mode.toString(10)],
        ["nlink", observedFile.entry.nlink.toString(10)],
        ["size", size],
        ["sha256", observedFile.rawByteSha256]
      ]));
    }
    const after = observeDirectory(
      directory,
      directoryRole,
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      true
    );
    if (!sameDirectoryObservation(before, after)) attemptOperationFailure();
  };
  walk(paths.npmCache);
  entries.sort((left, right) =>
    compareCodeUnits(left.relativePath, right.relativePath)
      || compareCodeUnits(left.type, right.type)
  );
  const finalRoot = observeDirectory(
    paths.npmCache,
    "npmCache",
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    true
  );
  if (!sameDirectoryObservation(initialRoot, finalRoot)) {
    attemptOperationFailure();
  }
  const fileCount = entries.filter((entry) => entry.type === "file").length;
  const inventory = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["cacheMarkerFingerprint", state.layout.cacheMarkerFingerprint],
    ["directoryCount", entries.length - fileCount],
    ["fileCount", fileCount],
    ["totalBytes", totalBytes],
    ["entries", Object.freeze(entries)]
  ]);
  return {
    fingerprint: hashCanonicalProof(NPM_CACHE_INVENTORY_DOMAIN, inventory),
    inventory
  };
}

function strictRelativeTreePath(root, candidate, maxUtf8Bytes) {
  const relativePath = relative(root, candidate);
  if (
    relativePath === ""
    || relativePath === ".."
    || relativePath.startsWith(`..${String.fromCharCode(47)}`)
    || isAbsolute(relativePath)
    || relativePath.includes(String.fromCharCode(92))
    || Buffer.byteLength(relativePath, "utf8") > maxUtf8Bytes
  ) {
    attemptOperationFailure();
  }
  return relativePath;
}

function stagedDirectoryIdentityPath(entry) {
  if (process.platform !== "darwin" || !entry?.isDirectory()) {
    attemptOperationFailure();
  }
  const identityPath = `/.vol/${entry.dev.toString(10)}/${entry.ino.toString(10)}`;
  let identityEntry;
  try {
    identityEntry = lstatSync(identityPath, { bigint: true });
  } catch {
    attemptOperationFailure();
  }
  if (
    !identityEntry.isDirectory()
    || identityEntry.isSymbolicLink()
    || !sameStableStats(entry, identityEntry)
  ) {
    attemptOperationFailure();
  }
  return identityPath;
}

function openStagedNodeModulesDescriptor(
  paths,
  state,
  repositoryObservation
) {
  let installDirectory;
  let stagedDirectory;
  let accepted = false;
  try {
    const provisionRootEntry = fstatSync(
      state.provisionRootDescriptor,
      { bigint: true }
    );
    if (
      !provisionRootEntry.isDirectory()
      || provisionRootEntry.isSymbolicLink()
      || provisionRootEntry.uid !== repositoryObservation.repositoryUid
      || provisionRootEntry.dev !== repositoryObservation.repositoryDev
      || (provisionRootEntry.mode & 0o7777n) !== 0o700n
    ) {
      attemptOperationFailure();
    }
    const provisionRootDirectory = {
      childName: undefined,
      descriptor: state.provisionRootDescriptor,
      entry: provisionRootEntry,
      identityPath: stagedDirectoryIdentityPath(provisionRootEntry),
      parentIdentityPath: undefined
    };
    assertStagedRetainedDirectoryAnchor(
      provisionRootDirectory,
      repositoryObservation
    );
    installDirectory = openStagedRetainedDirectory(
      provisionRootDirectory,
      "install",
      paths.install,
      "install",
      repositoryObservation
    );
    if (
      installDirectory.identityFingerprint
        !== state.layout.directoryIdentityFingerprints.install
    ) {
      attemptOperationFailure();
    }
    stagedDirectory = openStagedRetainedDirectory(
      installDirectory,
      "node_modules",
      join(paths.install, "node_modules"),
      "stagedNodeModules",
      repositoryObservation
    );
    accepted = true;
  } catch {
    accepted = false;
  } finally {
    if (installDirectory?.descriptor !== undefined) {
      try {
        closeSync(installDirectory.descriptor);
      } catch {
        accepted = false;
      }
    }
    if (!accepted && stagedDirectory?.descriptor !== undefined) {
      try {
        closeSync(stagedDirectory.descriptor);
      } catch {
        // A rejected staged-tree descriptor is never reused.
      }
    }
  }
  if (!accepted || !stagedDirectory) attemptOperationFailure();
  return stagedDirectory;
}

function assertStagedNodeModulesRootAnchor(
  retained,
  repositoryObservation
) {
  assertStagedRetainedDirectoryAnchor(retained, repositoryObservation);
  return fstatSync(retained.descriptor, { bigint: true });
}

function openStagedRetainedDirectory(
  parentDirectory,
  childName,
  logicalPath,
  identityRole,
  repositoryObservation
) {
  assertStagedRetainedDirectoryAnchor(
    parentDirectory,
    repositoryObservation
  );
  const identityCandidate = join(parentDirectory.identityPath, childName);
  let descriptor;
  let entry;
  let identityPath;
  let failed = false;
  try {
    const initial = lstatSync(identityCandidate, { bigint: true });
    if (!initial.isDirectory() || initial.isSymbolicLink()) {
      attemptOperationFailure();
    }
    descriptor = openSync(
      identityCandidate,
      FS_CONSTANTS.O_RDONLY
        | FS_CONSTANTS.O_NOFOLLOW
        | FS_CONSTANTS.O_DIRECTORY
    );
    const before = fstatSync(descriptor, { bigint: true });
    const identityAfterOpen = lstatSync(identityCandidate, { bigint: true });
    const descriptorAfterOpen = fstatSync(descriptor, { bigint: true });
    if (
      !before.isDirectory()
      || before.isSymbolicLink()
      || !identityAfterOpen.isDirectory()
      || identityAfterOpen.isSymbolicLink()
      || !descriptorAfterOpen.isDirectory()
      || descriptorAfterOpen.isSymbolicLink()
      || !sameStableStats(initial, before)
      || !sameStableStats(before, identityAfterOpen)
      || !sameStableStats(identityAfterOpen, descriptorAfterOpen)
      || descriptorAfterOpen.uid !== repositoryObservation.repositoryUid
      || descriptorAfterOpen.dev !== repositoryObservation.repositoryDev
      || (descriptorAfterOpen.mode & 0o700n) !== 0o700n
      || (descriptorAfterOpen.mode & 0o022n) !== 0n
    ) {
      attemptOperationFailure();
    }
    entry = descriptorAfterOpen;
    identityPath = stagedDirectoryIdentityPath(entry);
  } catch {
    failed = true;
  }
  if (failed || descriptor === undefined || !entry || !identityPath) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // A rejected staged directory descriptor is never reused.
      }
    }
    attemptOperationFailure();
  }
  const pathFingerprint = canonicalPathFingerprint(identityRole, logicalPath);
  return {
    descriptor,
    entry,
    identityFingerprint: filesystemEntryIdentityFingerprint({
      entry,
      pathFingerprint,
      role: identityRole,
      type: "directory"
    }),
    identityPath,
    parentIdentityPath: parentDirectory.identityPath,
    childName
  };
}

function assertStagedRetainedDirectoryAnchor(
  retainedDirectory,
  repositoryObservation
) {
  let descriptorEntry;
  let identityEntry;
  let parentEntry;
  try {
    descriptorEntry = fstatSync(retainedDirectory.descriptor, { bigint: true });
    identityEntry = lstatSync(retainedDirectory.identityPath, { bigint: true });
    parentEntry = retainedDirectory.parentIdentityPath === undefined
      ? identityEntry
      : lstatSync(
        join(
          retainedDirectory.parentIdentityPath,
          retainedDirectory.childName
        ),
        { bigint: true }
      );
  } catch {
    attemptOperationFailure();
  }
  if (
    !descriptorEntry.isDirectory()
    || descriptorEntry.isSymbolicLink()
    || !identityEntry.isDirectory()
    || identityEntry.isSymbolicLink()
    || !parentEntry.isDirectory()
    || parentEntry.isSymbolicLink()
    || !sameStableStats(retainedDirectory.entry, descriptorEntry)
    || !sameStableStats(descriptorEntry, identityEntry)
    || !sameStableStats(identityEntry, parentEntry)
    || descriptorEntry.uid !== repositoryObservation.repositoryUid
    || descriptorEntry.dev !== repositoryObservation.repositoryDev
    || (descriptorEntry.mode & 0o700n) !== 0o700n
    || (descriptorEntry.mode & 0o022n) !== 0n
  ) {
    attemptOperationFailure();
  }
}

function readStagedRetainedRegularFile(
  parentDirectory,
  childName,
  repositoryObservation,
  maxBytes
) {
  const identityCandidate = join(parentDirectory.identityPath, childName);
  let descriptor;
  let initial;
  let before;
  let after;
  let finalIdentityEntry;
  let bytes;
  let failed = false;
  try {
    initial = lstatSync(identityCandidate, { bigint: true });
    if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1n) {
      attemptOperationFailure();
    }
    descriptor = openSync(
      identityCandidate,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW
    );
    before = fstatSync(descriptor, { bigint: true });
    if (
      !sameStableStats(initial, before)
      || before.size < 0n
      || before.size > BigInt(maxBytes)
    ) {
      attemptOperationFailure();
    }
    bytes = readBoundedDescriptor(descriptor, maxBytes);
    after = fstatSync(descriptor, { bigint: true });
    finalIdentityEntry = lstatSync(identityCandidate, { bigint: true });
    const finalDescriptorEntry = fstatSync(descriptor, { bigint: true });
    if (
      !after.isFile()
      || after.isSymbolicLink()
      || !finalIdentityEntry.isFile()
      || finalIdentityEntry.isSymbolicLink()
      || !finalDescriptorEntry.isFile()
      || finalDescriptorEntry.isSymbolicLink()
      || after.nlink !== 1n
      || finalIdentityEntry.nlink !== 1n
      || finalDescriptorEntry.nlink !== 1n
      || !sameStableStats(before, after)
      || !sameStableStats(after, finalIdentityEntry)
      || !sameStableStats(finalIdentityEntry, finalDescriptorEntry)
      || !bytes
      || bytes.byteLength !== Number(before.size)
    ) {
      attemptOperationFailure();
    }
  } catch {
    failed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        failed = true;
      }
    }
  }
  if (failed || !bytes || !finalIdentityEntry) {
    if (bytes) bytes.fill(0);
    attemptOperationFailure();
  }
  assertOwnerControlledStats(
    finalIdentityEntry,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev
  );
  return {
    bytes,
    entry: finalIdentityEntry,
    rawByteSha256: sha256Bytes(bytes)
  };
}

function resolveStagedSymlinkTargetComponents(
  relativePath,
  linkTarget,
  maxUtf8Bytes
) {
  const basePath = dirname(relativePath);
  const stack = basePath === "." ? [] : basePath.split("/");
  const components = linkTarget.split("/");
  const traversedDirectoryPaths = new Set();
  const recordCurrentDirectory = () => {
    traversedDirectoryPaths.add(stack.length === 0 ? "." : stack.join("/"));
  };
  if (components.length === 0 || components.some(
    (component) => component.length === 0
  )) {
    attemptOperationFailure();
  }
  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    const hasFollowingComponent = index + 1 < components.length;
    if (component === ".") {
      if (hasFollowingComponent) recordCurrentDirectory();
      continue;
    }
    if (component === "..") {
      if (stack.length === 0) attemptOperationFailure();
      recordCurrentDirectory();
      stack.pop();
      if (hasFollowingComponent) recordCurrentDirectory();
      continue;
    }
    if (
      component.includes("\0")
      || component.includes(String.fromCharCode(47))
      || component.includes(String.fromCharCode(92))
      || basename(component) !== component
    ) {
      attemptOperationFailure();
    }
    stack.push(component);
    if (hasFollowingComponent) recordCurrentDirectory();
  }
  if (stack.length === 0) attemptOperationFailure();
  const resolvedRelativePath = stack.join("/");
  if (
    resolvedRelativePath === ".."
    || resolvedRelativePath.startsWith(`..${String.fromCharCode(47)}`)
    || isAbsolute(resolvedRelativePath)
    || Buffer.byteLength(resolvedRelativePath, "utf8") > maxUtf8Bytes
  ) {
    attemptOperationFailure();
  }
  return {
    resolvedRelativePath,
    traversedDirectoryPaths: Object.freeze([
      ...traversedDirectoryPaths
    ])
  };
}

function inventoryStagedNodeModulesPass(
  root,
  retained,
  state,
  repositoryObservation
) {
  const maxEntryCount = 100000;
  const maxDepth = 64;
  const maxRelativePathUtf8Bytes = 4096;
  const maxSymlinkTargetUtf8Bytes = 4096;
  const maxRegularFileBytes = 268435456;
  const maxTotalRegularFileBytes = 1073741824;
  const rootEntry = assertStagedNodeModulesRootAnchor(
    retained,
    repositoryObservation
  );
  const rootIdentityRole = "stagedNodeModules";
  const rootPathFingerprint = canonicalPathFingerprint(
    rootIdentityRole,
    root
  );
  const rootIdentityFingerprint = filesystemEntryIdentityFingerprint({
    entry: rootEntry,
    pathFingerprint: rootPathFingerprint,
    role: rootIdentityRole,
    type: "directory"
  });
  const entries = [];
  const symlinkDirectoryRequirements = new Map();
  let totalRegularFileBytes = 0;
  const walk = (directory, retainedDirectory, depth) => {
    if (depth > maxDepth) attemptOperationFailure();
    assertStagedRetainedDirectoryAnchor(
      retainedDirectory,
      repositoryObservation
    );
    let children;
    try {
      children = readdirSync(retainedDirectory.identityPath, {
        encoding: "utf8"
      });
    } catch {
      attemptOperationFailure();
    }
    assertStagedRetainedDirectoryAnchor(
      retainedDirectory,
      repositoryObservation
    );
    children.sort(compareCodeUnits);
    for (const childName of children) {
      if (entries.length >= maxEntryCount) attemptOperationFailure();
      if (
        typeof childName !== "string"
        || childName.length === 0
        || childName === "."
        || childName === ".."
        || childName.includes("\0")
        || childName.includes(String.fromCharCode(47))
        || childName.includes(String.fromCharCode(92))
        || basename(childName) !== childName
      ) {
        attemptOperationFailure();
      }
      const candidate = join(directory, childName);
      const identityCandidate = join(
        retainedDirectory.identityPath,
        childName
      );
      const relativePath = strictRelativeTreePath(
        root,
        candidate,
        maxRelativePathUtf8Bytes
      );
      let entry;
      try {
        entry = lstatSync(identityCandidate, { bigint: true });
      } catch {
        attemptOperationFailure();
      }
      if (
        entry.uid !== repositoryObservation.repositoryUid
        || entry.dev !== repositoryObservation.repositoryDev
      ) {
        attemptOperationFailure();
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        const identityRole =
          `staged-node-modules-directory:${relativePath}`;
        const childDirectory = openStagedRetainedDirectory(
          retainedDirectory,
          childName,
          candidate,
          identityRole,
          repositoryObservation
        );
        try {
          crossStagedInventoryTestBarrierIfArmed(
            state,
            relativePath,
            repositoryObservation
          );
          entries.push(nullRecord([
            ["relativePath", relativePath],
            ["type", "directory"],
            ["identityRole", identityRole],
            [
              "filesystemIdentityFingerprint",
              childDirectory.identityFingerprint
            ],
            ["mode", childDirectory.entry.mode.toString(10)]
          ]));
          walk(candidate, childDirectory, depth + 1);
        } finally {
          try {
            closeSync(childDirectory.descriptor);
          } catch {
            attemptOperationFailure();
          }
        }
        continue;
      }
      if (entry.isFile() && !entry.isSymbolicLink()) {
        if (entry.nlink !== 1n) attemptOperationFailure();
        const identityRole = `staged-node-modules-file:${relativePath}`;
        const observation = readStagedRetainedRegularFile(
          retainedDirectory,
          childName,
          repositoryObservation,
          maxRegularFileBytes
        );
        const byteLength = Number(observation.entry.size);
        if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
          observation.bytes.fill(0);
          attemptOperationFailure();
        }
        totalRegularFileBytes += byteLength;
        if (
          !Number.isSafeInteger(totalRegularFileBytes)
          || totalRegularFileBytes > maxTotalRegularFileBytes
        ) {
          observation.bytes.fill(0);
          attemptOperationFailure();
        }
        const pathFingerprint = canonicalPathFingerprint(
          identityRole,
          candidate
        );
        const identityFingerprint = filesystemEntryIdentityFingerprint({
          entry: observation.entry,
          pathFingerprint,
          rawByteSha256: observation.rawByteSha256,
          role: identityRole,
          type: "file"
        });
        entries.push(nullRecord([
          ["relativePath", relativePath],
          ["type", "regular-file"],
          ["identityRole", identityRole],
          ["filesystemIdentityFingerprint", identityFingerprint],
          ["mode", observation.entry.mode.toString(10)],
          ["nlink", "1"],
          ["byteLength", byteLength],
          ["sha256", observation.rawByteSha256]
        ]));
        observation.bytes.fill(0);
        continue;
      }
      if (!entry.isSymbolicLink() || entry.nlink !== 1n) {
        attemptOperationFailure();
      }
      let linkTarget;
      let after;
      try {
        linkTarget = readlinkSync(identityCandidate, "utf8");
        after = lstatSync(identityCandidate, { bigint: true });
      } catch {
        attemptOperationFailure();
      }
      if (
        typeof linkTarget !== "string"
        || linkTarget.length === 0
        || Buffer.byteLength(linkTarget, "utf8") > maxSymlinkTargetUtf8Bytes
        || linkTarget.includes("\0")
        || linkTarget.includes(String.fromCharCode(92))
        || isAbsolute(linkTarget)
        || !after.isSymbolicLink()
        || after.nlink !== 1n
        || !sameStableStats(entry, after)
      ) {
        attemptOperationFailure();
      }
      const targetResolution = resolveStagedSymlinkTargetComponents(
        relativePath,
        linkTarget,
        maxRelativePathUtf8Bytes
      );
      const { resolvedRelativePath } = targetResolution;
      symlinkDirectoryRequirements.set(
        relativePath,
        targetResolution.traversedDirectoryPaths
      );
      const identityRole =
        `staged-node-modules-symbolic-link:${relativePath}`;
      const pathFingerprint = canonicalPathFingerprint(
        identityRole,
        candidate
      );
      const identityFingerprint = filesystemEntryIdentityFingerprint({
        entry: after,
        pathFingerprint,
        role: identityRole,
        type: "symbolic-link"
      });
      entries.push(nullRecord([
        ["relativePath", relativePath],
        ["type", "symbolic-link"],
        ["identityRole", identityRole],
        ["filesystemIdentityFingerprint", identityFingerprint],
        ["mode", after.mode.toString(10)],
        ["linkTarget", linkTarget],
        ["linkTargetUtf8ByteLength", Buffer.byteLength(linkTarget, "utf8")],
        ["resolvedRelativePath", resolvedRelativePath]
      ]));
    }
    assertStagedRetainedDirectoryAnchor(
      retainedDirectory,
      repositoryObservation
    );
  };
  walk(root, retained, 0);
  entries.sort((left, right) =>
    compareCodeUnits(left.relativePath, right.relativePath)
      || compareCodeUnits(left.type, right.type)
  );
  const concretePaths = new Set(
    entries
      .filter((entry) => entry.type !== "symbolic-link")
      .map((entry) => entry.relativePath)
  );
  const concreteDirectoryPaths = new Set([
    ".",
    ...entries
      .filter((entry) => entry.type === "directory")
      .map((entry) => entry.relativePath)
  ]);
  for (const entry of entries) {
    if (entry.type === "symbolic-link") {
      if (!concretePaths.has(entry.resolvedRelativePath)) {
        attemptOperationFailure();
      }
      const traversalRequirements = symlinkDirectoryRequirements.get(
        entry.relativePath
      );
      if (!traversalRequirements) attemptOperationFailure();
      for (const directoryPath of traversalRequirements) {
        if (!concreteDirectoryPaths.has(directoryPath)) {
          attemptOperationFailure();
        }
      }
      let parentPath = dirname(entry.resolvedRelativePath);
      while (parentPath !== ".") {
        if (!concreteDirectoryPaths.has(parentPath)) {
          attemptOperationFailure();
        }
        const nextParentPath = dirname(parentPath);
        if (nextParentPath === parentPath) attemptOperationFailure();
        parentPath = nextParentPath;
      }
    }
  }
  const directoryCount = entries.filter(
    (entry) => entry.type === "directory"
  ).length;
  const regularFileCount = entries.filter(
    (entry) => entry.type === "regular-file"
  ).length;
  const symbolicLinkCount = entries.length
    - directoryCount
    - regularFileCount;
  assertStagedNodeModulesRootAnchor(
    retained,
    repositoryObservation
  );
  const inventory = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["commandId", "owner.dependency.npm.ci-prefer-offline"],
    ["rootRelativePath", "install/node_modules"],
    ["rootIdentityRole", rootIdentityRole],
    ["rootIdentityFingerprint", rootIdentityFingerprint],
    ["maxEntryCount", maxEntryCount],
    ["maxDepth", maxDepth],
    ["maxRelativePathUtf8Bytes", maxRelativePathUtf8Bytes],
    ["maxSymlinkTargetUtf8Bytes", maxSymlinkTargetUtf8Bytes],
    ["maxRegularFileBytes", maxRegularFileBytes],
    ["maxTotalRegularFileBytes", maxTotalRegularFileBytes],
    ["directoryCount", directoryCount],
    ["regularFileCount", regularFileCount],
    ["symbolicLinkCount", symbolicLinkCount],
    ["totalRegularFileBytes", totalRegularFileBytes],
    ["entries", Object.freeze(entries)]
  ]);
  return {
    fingerprint: hashCanonicalProof(
      STAGED_NODE_MODULES_INVENTORY_DOMAIN,
      inventory
    ),
    inventory,
    rootIdentityFingerprint
  };
}

function inventoryStableStagedNodeModules(
  paths,
  state,
  repositoryObservation
) {
  const root = join(paths.install, "node_modules");
  const retained = openStagedNodeModulesDescriptor(
    paths,
    state,
    repositoryObservation
  );
  let accepted = false;
  try {
    const first = inventoryStagedNodeModulesPass(
      root,
      retained,
      state,
      repositoryObservation
    );
    const second = inventoryStagedNodeModulesPass(
      root,
      retained,
      state,
      repositoryObservation
    );
    if (
      first.fingerprint !== second.fingerprint
      || first.rootIdentityFingerprint !== second.rootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    accepted = true;
    return {
      descriptor: retained.descriptor,
      fingerprint: second.fingerprint,
      inventory: second.inventory,
      rootIdentityFingerprint: second.rootIdentityFingerprint
    };
  } finally {
    if (!accepted) {
      try {
        closeSync(retained.descriptor);
      } catch {
        // A rejected staged-tree descriptor is never reused.
      }
    }
  }
}

function attemptLstat(exactPath) {
  try {
    return lstatSync(exactPath, {
      bigint: true,
      throwIfNoEntry: false
    });
  } catch {
    attemptOperationFailure();
  }
}

function openInitialActivationRepositoryRoot(repositoryObservation) {
  const repositoryRoot = repositoryObservation.repositoryRoot;
  let descriptor;
  let retained;
  let accepted = false;
  try {
    const initial = attemptLstat(repositoryRoot);
    if (!initial?.isDirectory() || initial.isSymbolicLink()) {
      attemptOperationFailure();
    }
    descriptor = openSync(
      repositoryRoot,
      FS_CONSTANTS.O_RDONLY
        | FS_CONSTANTS.O_NOFOLLOW
        | FS_CONSTANTS.O_DIRECTORY
    );
    const before = fstatSync(descriptor, { bigint: true });
    const identityPath = stagedDirectoryIdentityPath(before);
    const identityEntry = lstatSync(identityPath, { bigint: true });
    const logicalEntry = lstatSync(repositoryRoot, { bigint: true });
    const after = fstatSync(descriptor, { bigint: true });
    const pathFingerprint = canonicalPathFingerprint(
      "repository-root",
      repositoryRoot
    );
    const identityFingerprint = filesystemEntryIdentityFingerprint({
      entry: after,
      pathFingerprint,
      role: "repository-root",
      type: "directory"
    });
    if (
      !before.isDirectory()
      || before.isSymbolicLink()
      || !identityEntry.isDirectory()
      || identityEntry.isSymbolicLink()
      || !logicalEntry.isDirectory()
      || logicalEntry.isSymbolicLink()
      || !after.isDirectory()
      || after.isSymbolicLink()
      || !sameStableStats(initial, before)
      || !sameStableStats(before, identityEntry)
      || !sameStableStats(identityEntry, logicalEntry)
      || !sameStableStats(logicalEntry, after)
      || after.uid !== repositoryObservation.repositoryUid
      || after.dev !== repositoryObservation.repositoryDev
      || identityFingerprint
        !== repositoryObservation.repositoryIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    retained = {
      childName: undefined,
      descriptor,
      entry: after,
      identityFingerprint,
      identityPath,
      parentIdentityPath: undefined
    };
    accepted = true;
  } catch {
    accepted = false;
  } finally {
    if (!accepted && descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // A rejected repository descriptor is never reused.
      }
    }
  }
  if (!accepted || !retained) attemptOperationFailure();
  return retained;
}

function assertInitialActivationRepositoryRoot(
  retainedRepository,
  repositoryObservation
) {
  let descriptorEntry;
  let identityEntry;
  let logicalEntry;
  try {
    descriptorEntry = fstatSync(retainedRepository.descriptor, {
      bigint: true
    });
    identityEntry = lstatSync(retainedRepository.identityPath, {
      bigint: true
    });
    logicalEntry = lstatSync(repositoryObservation.repositoryRoot, {
      bigint: true
    });
  } catch {
    attemptOperationFailure();
  }
  const identityFingerprint = filesystemEntryIdentityFingerprint({
    entry: descriptorEntry,
    pathFingerprint: canonicalPathFingerprint(
      "repository-root",
      repositoryObservation.repositoryRoot
    ),
    role: "repository-root",
    type: "directory"
  });
  if (
    !descriptorEntry.isDirectory()
    || descriptorEntry.isSymbolicLink()
    || !identityEntry.isDirectory()
    || identityEntry.isSymbolicLink()
    || !logicalEntry.isDirectory()
    || logicalEntry.isSymbolicLink()
    || !sameStableStats(retainedRepository.entry, descriptorEntry)
    || !sameStableStats(descriptorEntry, identityEntry)
    || !sameStableStats(identityEntry, logicalEntry)
    || descriptorEntry.uid !== repositoryObservation.repositoryUid
    || descriptorEntry.dev !== repositoryObservation.repositoryDev
    || identityFingerprint
      !== repositoryObservation.repositoryIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  return descriptorEntry;
}

function snapshotInitialActivationRepositoryEntries(
  retainedRepository,
  repositoryObservation
) {
  assertInitialActivationRepositoryRoot(
    retainedRepository,
    repositoryObservation
  );
  let entries;
  try {
    entries = readdirSync(retainedRepository.identityPath, {
      encoding: "utf8"
    });
  } catch {
    attemptOperationFailure();
  }
  if (
    entries.some((entry) =>
      typeof entry !== "string"
      || entry.length === 0
      || entry === "."
      || entry === ".."
      || entry.includes("\0")
      || entry.includes(String.fromCharCode(47))
      || entry.includes(String.fromCharCode(92))
      || basename(entry) !== entry
    )
  ) {
    attemptOperationFailure();
  }
  entries.sort(compareCodeUnits);
  assertInitialActivationRepositoryRoot(
    retainedRepository,
    repositoryObservation
  );
  return Object.freeze(entries);
}

function refreshInitialActivationRepositoryAfterPublication(
  retainedRepository,
  repositoryObservation,
  entriesBeforePublication
) {
  let descriptorEntry;
  let identityEntry;
  let logicalEntry;
  let entriesAfterPublication;
  try {
    descriptorEntry = fstatSync(retainedRepository.descriptor, {
      bigint: true
    });
    identityEntry = lstatSync(retainedRepository.identityPath, {
      bigint: true
    });
    logicalEntry = lstatSync(repositoryObservation.repositoryRoot, {
      bigint: true
    });
    entriesAfterPublication = readdirSync(retainedRepository.identityPath, {
      encoding: "utf8"
    });
  } catch {
    attemptOperationFailure();
  }
  const samePhysicalDirectory = (left, right) => Boolean(
    left
    && right
    && left.isDirectory()
    && !left.isSymbolicLink()
    && right.isDirectory()
    && !right.isSymbolicLink()
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid
    && left.nlink === right.nlink
  );
  entriesAfterPublication.sort(compareCodeUnits);
  const expectedEntriesAfterPublication = [
    ...entriesBeforePublication,
    "node_modules"
  ].sort(compareCodeUnits);
  const identityFingerprint = filesystemEntryIdentityFingerprint({
    entry: descriptorEntry,
    pathFingerprint: canonicalPathFingerprint(
      "repository-root",
      repositoryObservation.repositoryRoot
    ),
    role: "repository-root",
    type: "directory"
  });
  if (
    !samePhysicalDirectory(retainedRepository.entry, descriptorEntry)
    || !sameStableStats(descriptorEntry, identityEntry)
    || !sameStableStats(identityEntry, logicalEntry)
    || entriesAfterPublication.length
      !== expectedEntriesAfterPublication.length
    || entriesAfterPublication.some(
      (entry, index) => entry !== expectedEntriesAfterPublication[index]
    )
    || identityFingerprint
      !== repositoryObservation.repositoryIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  retainedRepository.entry = descriptorEntry;
}

function initialActiveNodeModulesPaths(
  retainedRepository,
  repositoryObservation
) {
  return {
    identityPath: join(retainedRepository.identityPath, "node_modules"),
    logicalPath: join(repositoryObservation.repositoryRoot, "node_modules")
  };
}

function assertInitialActiveNodeModulesAbsent(
  retainedRepository,
  repositoryObservation,
  state,
  stableExistingIsSafe
) {
  assertInitialActivationRepositoryRoot(
    retainedRepository,
    repositoryObservation
  );
  const { identityPath, logicalPath } = initialActiveNodeModulesPaths(
    retainedRepository,
    repositoryObservation
  );
  const identityEntry = attemptLstat(identityPath);
  const logicalEntry = attemptLstat(logicalPath);
  if (identityEntry === undefined && logicalEntry === undefined) {
    assertInitialActivationRepositoryRoot(
      retainedRepository,
      repositoryObservation
    );
    return;
  }
  if (
    stableExistingIsSafe
    && identityEntry !== undefined
    && logicalEntry !== undefined
    && sameStableStats(identityEntry, logicalEntry)
  ) {
    const finalIdentityEntry = attemptLstat(identityPath);
    const finalLogicalEntry = attemptLstat(logicalPath);
    assertInitialActivationRepositoryRoot(
      retainedRepository,
      repositoryObservation
    );
    if (
      finalIdentityEntry !== undefined
      && finalLogicalEntry !== undefined
      && sameStableStats(identityEntry, finalIdentityEntry)
      && sameStableStats(finalIdentityEntry, finalLogicalEntry)
    ) {
      state.activationFilesystemDisposition = "no-mutation-proven";
    }
  }
  attemptOperationFailure();
}

function proveInitialActivationNoMutation(state) {
  let retainedRepository;
  try {
    const observation = buildStableBootstrapStaticObservation();
    if (
      observation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || observation.repositoryObservation.repositoryIdentityFingerprint
        !== state.repositoryRootIdentityFingerprint
      || observation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      return false;
    }
    retainedRepository = openInitialActivationRepositoryRoot(
      observation.repositoryObservation
    );
    assertInitialActiveNodeModulesAbsent(
      retainedRepository,
      observation.repositoryObservation,
      state,
      false
    );
    state.activationFilesystemDisposition = "no-mutation-proven";
    return true;
  } catch {
    return false;
  } finally {
    if (retainedRepository?.descriptor !== undefined) {
      try {
        closeSync(retainedRepository.descriptor);
      } catch {
        state.activationFilesystemDisposition = "unresolved";
      }
    }
  }
}

function assertRetainedStagedNodeModulesDescriptor(
  paths,
  state,
  repositoryObservation
) {
  if (state.stagedNodeModulesDescriptor === undefined) {
    attemptOperationFailure();
  }
  let descriptorEntry;
  let identityEntry;
  let logicalEntry;
  let identityPath;
  try {
    descriptorEntry = fstatSync(state.stagedNodeModulesDescriptor, {
      bigint: true
    });
    identityPath = stagedDirectoryIdentityPath(descriptorEntry);
    identityEntry = lstatSync(identityPath, { bigint: true });
    logicalEntry = lstatSync(join(paths.install, "node_modules"), {
      bigint: true
    });
  } catch {
    attemptOperationFailure();
  }
  const rootIdentityFingerprint = filesystemEntryIdentityFingerprint({
    entry: descriptorEntry,
    pathFingerprint: canonicalPathFingerprint(
      "stagedNodeModules",
      join(paths.install, "node_modules")
    ),
    role: "stagedNodeModules",
    type: "directory"
  });
  if (
    !descriptorEntry.isDirectory()
    || descriptorEntry.isSymbolicLink()
    || !identityEntry.isDirectory()
    || identityEntry.isSymbolicLink()
    || !logicalEntry.isDirectory()
    || logicalEntry.isSymbolicLink()
    || !sameStableStats(descriptorEntry, identityEntry)
    || !sameStableStats(identityEntry, logicalEntry)
    || descriptorEntry.uid !== repositoryObservation.repositoryUid
    || descriptorEntry.dev !== repositoryObservation.repositoryDev
    || rootIdentityFingerprint
      !== state.stagedNodeModulesRootIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  return {
    descriptorEntry,
    identityPath,
    rootIdentityFingerprint
  };
}

function validateInitialActiveLinkTargetChain(
  retainedRepository,
  paths,
  state,
  repositoryObservation
) {
  const opened = [];
  let closeFailed = false;
  try {
    assertInitialActivationRepositoryRoot(
      retainedRepository,
      repositoryObservation
    );
    const tmpBase = openStagedRetainedDirectory(
      retainedRepository,
      ".tmp",
      join(repositoryObservation.repositoryRoot, ".tmp"),
      "tmp-base",
      repositoryObservation
    );
    opened.push(tmpBase);
    if (tmpBase.identityFingerprint !== state.tmpBaseIdentityFingerprint) {
      attemptOperationFailure();
    }
    const provisionRootName = `dependency-provision-${state.attemptId}`;
    const provisionRoot = openStagedRetainedDirectory(
      tmpBase,
      provisionRootName,
      paths.provisionRoot,
      "initial-provision-install-root",
      repositoryObservation
    );
    opened.push(provisionRoot);
    if (
      provisionRoot.identityFingerprint
        !== state.provisionRootIdentityFingerprint
      || !sameStableStats(
        provisionRoot.entry,
        fstatSync(state.provisionRootDescriptor, { bigint: true })
      )
    ) {
      attemptOperationFailure();
    }
    const install = openStagedRetainedDirectory(
      provisionRoot,
      "install",
      paths.install,
      "install",
      repositoryObservation
    );
    opened.push(install);
    if (
      install.identityFingerprint
        !== state.layout.directoryIdentityFingerprints.install
    ) {
      attemptOperationFailure();
    }
    const staged = openStagedRetainedDirectory(
      install,
      "node_modules",
      join(paths.install, "node_modules"),
      "stagedNodeModules",
      repositoryObservation
    );
    opened.push(staged);
    const retainedStaged = assertRetainedStagedNodeModulesDescriptor(
      paths,
      state,
      repositoryObservation
    );
    if (
      staged.identityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
      || !sameStableStats(staged.entry, retainedStaged.descriptorEntry)
    ) {
      attemptOperationFailure();
    }
    return retainedStaged.rootIdentityFingerprint;
  } finally {
    for (let index = opened.length - 1; index >= 0; index -= 1) {
      try {
        closeSync(opened[index].descriptor);
      } catch {
        closeFailed = true;
      }
    }
    if (closeFailed) attemptOperationFailure();
  }
}

function observeInitialActiveNodeModulesLink(
  retainedRepository,
  repositoryObservation,
  state,
  relativeTarget,
  targetRootIdentityFingerprint
) {
  assertInitialActivationRepositoryRoot(
    retainedRepository,
    repositoryObservation
  );
  const { identityPath, logicalPath } = initialActiveNodeModulesPaths(
    retainedRepository,
    repositoryObservation
  );
  let initialIdentityEntry;
  let initialLogicalEntry;
  let identityTarget;
  let logicalTarget;
  let finalIdentityEntry;
  let finalLogicalEntry;
  try {
    initialIdentityEntry = lstatSync(identityPath, { bigint: true });
    initialLogicalEntry = lstatSync(logicalPath, { bigint: true });
    identityTarget = readlinkSync(identityPath, { encoding: "utf8" });
    logicalTarget = readlinkSync(logicalPath, { encoding: "utf8" });
    finalIdentityEntry = lstatSync(identityPath, { bigint: true });
    finalLogicalEntry = lstatSync(logicalPath, { bigint: true });
  } catch {
    attemptOperationFailure();
  }
  assertInitialActivationRepositoryRoot(
    retainedRepository,
    repositoryObservation
  );
  if (
    !initialIdentityEntry.isSymbolicLink()
    || !initialLogicalEntry.isSymbolicLink()
    || !finalIdentityEntry.isSymbolicLink()
    || !finalLogicalEntry.isSymbolicLink()
    || initialIdentityEntry.uid !== repositoryObservation.repositoryUid
    || initialIdentityEntry.dev !== repositoryObservation.repositoryDev
    || initialIdentityEntry.nlink !== 1n
    || !sameStableStats(initialIdentityEntry, initialLogicalEntry)
    || !sameStableStats(initialLogicalEntry, finalIdentityEntry)
    || !sameStableStats(finalIdentityEntry, finalLogicalEntry)
    || identityTarget !== relativeTarget
    || logicalTarget !== relativeTarget
  ) {
    attemptOperationFailure();
  }
  const activeNodeModulesPathFingerprint = canonicalPathFingerprint(
    "activeNodeModulesLink",
    logicalPath
  );
  const activeNodeModulesLinkIdentityFingerprint =
    filesystemEntryIdentityFingerprint({
      entry: finalIdentityEntry,
      pathFingerprint: activeNodeModulesPathFingerprint,
      role: "activeNodeModulesLink",
      type: "symbolic-link"
    });
  const linkTarget = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["relativeTarget", relativeTarget]
  ]);
  const activeNodeModulesLinkTargetFingerprint = hashCanonicalProof(
    ACTIVE_NODE_MODULES_LINK_TARGET_DOMAIN,
    linkTarget
  );
  const binding = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["activationKind", "exclusive-relative-symbolic-link-v1"],
    ["activeNodeModulesPathFingerprint", activeNodeModulesPathFingerprint],
    [
      "activeNodeModulesLinkIdentityFingerprint",
      activeNodeModulesLinkIdentityFingerprint
    ],
    [
      "activeNodeModulesLinkTargetFingerprint",
      activeNodeModulesLinkTargetFingerprint
    ],
    ["targetRootIdentityFingerprint", targetRootIdentityFingerprint],
    [
      "stagedNodeModulesInventoryFingerprint",
      state.stagedNodeModulesInventoryFingerprint
    ]
  ]);
  return {
    activeNodeModulesLinkIdentityFingerprint,
    activeNodeModulesLinkTargetFingerprint,
    activeNodeModulesPathFingerprint,
    binding,
    fingerprint: hashCanonicalProof(ACTIVE_NODE_MODULES_BINDING_DOMAIN, binding)
  };
}

function initialLayoutFileRecord(role, relativePath, observation) {
  return nullRecord([
    ["role", role],
    ["relativePath", relativePath],
    ["rawByteSha256", observation.rawByteSha256],
    ["filesystemIdentityFingerprint", observation.identityFingerprint]
  ]);
}

function initialLayoutPrivateFileBinding(observation) {
  return nullRecord([
    ["identityFingerprint", observation.identityFingerprint],
    ["rawByteSha256", observation.rawByteSha256]
  ]);
}

function initialLayoutEmptyDirectoryRecord(
  role,
  relativePath,
  observation
) {
  return nullRecord([
    ["role", role],
    ["relativePath", relativePath],
    ["filesystemIdentityFingerprint", observation.identityFingerprint],
    ["entryCount", 0]
  ]);
}

function releaseInitialLayoutTestBarrier(state) {
  const barrier = state?.initialLayoutTestBarrier;
  if (!barrier) return;
  state.initialLayoutTestBarrier = undefined;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
  } catch {
    // A failed test-only reservation is terminal and is never reused.
  }
}

function releaseStagedInventoryTestBarrier(state) {
  const barrier = state?.stagedInventoryTestBarrier;
  if (!barrier) return;
  state.stagedInventoryTestBarrier = undefined;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
  } catch {
    // A failed test-only reservation is terminal and is never reused.
  }
}

function releaseInitialActivationTestBarriers(state) {
  if (!state) return;
  for (const propertyName of [
    "initialActivationPrePublishTestBarrier",
    "initialActivationPostPublishTestFailure",
    "initialActivationFinalTargetSwapTestBarrier"
  ]) {
    const barrier = state[propertyName];
    if (!barrier) continue;
    state[propertyName] = undefined;
    try {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(
        barrier.reservation
      );
    } catch {
      // A failed test-only reservation is terminal and is never reused.
    }
  }
}

function crossInitialActivationPrePublishTestBarrierIfArmed(
  state,
  repositoryObservation
) {
  const barrier = state.initialActivationPrePublishTestBarrier;
  if (!barrier) return;
  state.initialActivationPrePublishTestBarrier = undefined;
  let accepted = false;
  try {
    writeExclusiveInitialLayoutBytes(
      barrier.readyPath,
      "initial-activation-prepublish-test-barrier-ready",
      Buffer.from("ready\n", "utf8"),
      repositoryObservation
    );
    const waitCell = new Int32Array(new SharedArrayBuffer(4));
    for (let attempt = 0; attempt < 10_000; attempt += 1) {
      if (stableLstat(barrier.ackPath) !== undefined) break;
      Atomics.wait(waitCell, 0, 0, 1);
    }
    const acknowledgement = readStableRegularFile(
      barrier.ackPath,
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      16,
      true
    );
    accepted = Buffer.from(acknowledgement.bytes).equals(
      Buffer.from("ack\n", "utf8")
    );
    acknowledgement.bytes.fill(0);
  } catch {
    accepted = false;
  }
  let released = false;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
    released = true;
  } catch {
    released = false;
  }
  if (!accepted || !released) attemptOperationFailure();
}

function injectInitialActivationPostPublishFailureIfArmed(state) {
  const barrier = state.initialActivationPostPublishTestFailure;
  if (!barrier) return;
  state.initialActivationPostPublishTestFailure = undefined;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
  } catch {
    attemptOperationFailure();
  }
  attemptOperationFailure();
}

function crossInitialActivationFinalTargetSwapTestBarrierIfArmed(
  state,
  paths,
  repositoryObservation
) {
  const barrier = state.initialActivationFinalTargetSwapTestBarrier;
  if (!barrier) return;
  state.initialActivationFinalTargetSwapTestBarrier = undefined;
  let accepted = false;
  try {
    const stagedPath = join(paths.install, "node_modules");
    const expectedBackupPath = join(
      repositoryObservation.repositoryRoot,
      ".tmp",
      `.required-browser-staged-target-final-swap-backup-${state.attemptId}`
    );
    if (
      barrier.backupPath !== expectedBackupPath
      || stableLstat(expectedBackupPath) !== undefined
    ) {
      attemptOperationFailure();
    }
    const originalEntry = lstatSync(stagedPath, { bigint: true });
    if (
      !originalEntry.isDirectory()
      || originalEntry.isSymbolicLink()
      || originalEntry.uid !== repositoryObservation.repositoryUid
      || originalEntry.dev !== repositoryObservation.repositoryDev
    ) {
      attemptOperationFailure();
    }
    renameSync(stagedPath, expectedBackupPath);
    mkdirSync(stagedPath, { mode: 0o700, recursive: false });
    fsyncDirectory(paths.install);
    const replacementEntry = lstatSync(stagedPath, { bigint: true });
    const retainedOriginalEntry = lstatSync(expectedBackupPath, {
      bigint: true
    });
    accepted = replacementEntry.isDirectory()
      && !replacementEntry.isSymbolicLink()
      && replacementEntry.uid === repositoryObservation.repositoryUid
      && replacementEntry.dev === repositoryObservation.repositoryDev
      && (replacementEntry.mode & 0o7777n) === 0o700n
      && !sameStableStats(replacementEntry, retainedOriginalEntry)
      && sameStableStats(originalEntry, retainedOriginalEntry);
  } catch {
    accepted = false;
  }
  let released = false;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
    released = true;
  } catch {
    released = false;
  }
  if (!accepted || !released) attemptOperationFailure();
}

function crossStagedInventoryTestBarrierIfArmed(
  state,
  relativePath,
  repositoryObservation
) {
  const barrier = state.stagedInventoryTestBarrier;
  if (!barrier) return;
  state.stagedInventoryTestBarrier = undefined;
  let accepted = false;
  try {
    writeExclusiveInitialLayoutBytes(
      barrier.readyPath,
      "staged-inventory-test-barrier-ready",
      Buffer.from(`${relativePath}\n`, "utf8"),
      repositoryObservation
    );
    const waitCell = new Int32Array(new SharedArrayBuffer(4));
    for (let attempt = 0; attempt < 10_000; attempt += 1) {
      if (stableLstat(barrier.ackPath) !== undefined) break;
      Atomics.wait(waitCell, 0, 0, 1);
    }
    const acknowledgement = readStableRegularFile(
      barrier.ackPath,
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      16,
      true
    );
    accepted = Buffer.from(acknowledgement.bytes).equals(
      Buffer.from("ack\n", "utf8")
    );
    acknowledgement.bytes.fill(0);
  } catch {
    accepted = false;
  }
  let released = false;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
    released = true;
  } catch {
    released = false;
  }
  if (!accepted || !released) attemptOperationFailure();
}

function crossInitialLayoutTestBarrierIfArmed(state, repositoryObservation) {
  const barrier = state.initialLayoutTestBarrier;
  if (!barrier) return;
  state.initialLayoutTestBarrier = undefined;
  let accepted = false;
  try {
    writeExclusiveInitialLayoutBytes(
      barrier.readyPath,
      "initial-layout-test-barrier-ready",
      Buffer.from("ready\n", "utf8"),
      repositoryObservation
    );
    const waitCell = new Int32Array(new SharedArrayBuffer(4));
    for (let attempt = 0; attempt < 10_000; attempt += 1) {
      if (stableLstat(barrier.ackPath) !== undefined) break;
      Atomics.wait(waitCell, 0, 0, 1);
    }
    const acknowledgement = readStableRegularFile(
      barrier.ackPath,
      repositoryObservation.repositoryUid,
      repositoryObservation.repositoryDev,
      16,
      true
    );
    accepted = Buffer.from(acknowledgement.bytes).equals(
      Buffer.from("ack\n", "utf8")
    );
  } catch {
    accepted = false;
  }
  let released = false;
  try {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(barrier.reservation);
    released = true;
  } catch {
    released = false;
  }
  if (!accepted || !released) attemptLayoutFailure();
}

function markAttemptOperationFailed(state) {
  if (!state || state.status === "registered") return;
  releaseInitialLayoutTestBarrier(state);
  clearAttemptOperationSecrets(state);
  state.status = "operation-failed";
}

export function armRequiredBrowserInitialLayoutTestBarrier(
  registeredTestFixtureCapability,
  attemptAuthority
) {
  const view = readTestFixtureCapabilityView(registeredTestFixtureCapability);
  const reservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  let armed = false;
  try {
    const state = registeredAttemptState(attemptAuthority);
    if (
      !state
      || state.status !== "lock-validated"
      || state.initialLayoutTestBarrier !== undefined
      || stableLstat(join(
        view.definition.leaf,
        "required-browser-initial-layout-test-barrier.ready"
      )) !== undefined
      || stableLstat(join(
        view.definition.leaf,
        "required-browser-initial-layout-test-barrier.ack"
      )) !== undefined
    ) {
      attemptLayoutFailure();
    }
    state.initialLayoutTestBarrier = {
      ackPath: join(
        view.definition.leaf,
        "required-browser-initial-layout-test-barrier.ack"
      ),
      readyPath: join(
        view.definition.leaf,
        "required-browser-initial-layout-test-barrier.ready"
      ),
      reservation
    };
    armed = true;
  } finally {
    if (!armed) {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
    }
  }
}

export function armRequiredBrowserStagedInventoryTestBarrier(
  registeredTestFixtureCapability,
  attemptAuthority
) {
  const view = readTestFixtureCapabilityView(registeredTestFixtureCapability);
  const reservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  let armed = false;
  try {
    const state = registeredAttemptState(attemptAuthority);
    const readyPath = join(
      view.definition.leaf,
      "required-browser-staged-inventory-test-barrier.ready"
    );
    const ackPath = join(
      view.definition.leaf,
      "required-browser-staged-inventory-test-barrier.ack"
    );
    if (
      !state
      || state.status !== "cache-verified"
      || state.stagedInventoryTestBarrier !== undefined
      || stableLstat(readyPath) !== undefined
      || stableLstat(ackPath) !== undefined
    ) {
      attemptOperationFailure();
    }
    state.stagedInventoryTestBarrier = {
      ackPath,
      readyPath,
      reservation
    };
    armed = true;
  } finally {
    if (!armed) {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
    }
  }
}

export function armRequiredBrowserInitialActivationPrePublishTestBarrier(
  registeredTestFixtureCapability,
  attemptAuthority
) {
  const view = readTestFixtureCapabilityView(registeredTestFixtureCapability);
  const reservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  let armed = false;
  try {
    const state = registeredAttemptState(attemptAuthority);
    const readyPath = join(
      view.definition.leaf,
      "required-browser-initial-activation-prepublish.ready"
    );
    const ackPath = join(
      view.definition.leaf,
      "required-browser-initial-activation-prepublish.ack"
    );
    if (
      !state
      || state.status !== "dependencies-listed-staged"
      || state.activationFilesystemDisposition !== "not-started"
      || state.initialActivationPrePublishTestBarrier !== undefined
      || state.initialActivationPostPublishTestFailure !== undefined
      || state.initialActivationFinalTargetSwapTestBarrier !== undefined
      || stableLstat(readyPath) !== undefined
      || stableLstat(ackPath) !== undefined
    ) {
      attemptOperationFailure();
    }
    state.initialActivationPrePublishTestBarrier = {
      ackPath,
      readyPath,
      reservation
    };
    armed = true;
  } finally {
    if (!armed) {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
    }
  }
}

export function armRequiredBrowserInitialActivationPostPublishTestFailure(
  registeredTestFixtureCapability,
  attemptAuthority
) {
  readTestFixtureCapabilityView(registeredTestFixtureCapability);
  const reservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  let armed = false;
  try {
    const state = registeredAttemptState(attemptAuthority);
    if (
      !state
      || state.status !== "dependencies-listed-staged"
      || state.activationFilesystemDisposition !== "not-started"
      || state.initialActivationPrePublishTestBarrier !== undefined
      || state.initialActivationPostPublishTestFailure !== undefined
      || state.initialActivationFinalTargetSwapTestBarrier !== undefined
    ) {
      attemptOperationFailure();
    }
    state.initialActivationPostPublishTestFailure = { reservation };
    armed = true;
  } finally {
    if (!armed) {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
    }
  }
}

export function armRequiredBrowserInitialActivationFinalTargetSwapTestBarrier(
  registeredTestFixtureCapability,
  attemptAuthority
) {
  readTestFixtureCapabilityView(registeredTestFixtureCapability);
  const reservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  let armed = false;
  try {
    const state = registeredAttemptState(attemptAuthority);
    const backupPath = state === undefined
      ? undefined
      : join(
        state.repositoryRoot,
        ".tmp",
        `.required-browser-staged-target-final-swap-backup-${state.attemptId}`
      );
    if (
      !state
      || state.status !== "dependencies-listed-staged"
      || state.activationFilesystemDisposition !== "not-started"
      || state.initialActivationPrePublishTestBarrier !== undefined
      || state.initialActivationPostPublishTestFailure !== undefined
      || state.initialActivationFinalTargetSwapTestBarrier !== undefined
      || stableLstat(backupPath) !== undefined
    ) {
      attemptOperationFailure();
    }
    state.initialActivationFinalTargetSwapTestBarrier = {
      backupPath,
      reservation
    };
    armed = true;
  } finally {
    if (!armed) {
      releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
    }
  }
}

export function acquireRequiredBrowserProvisionActivationLock(
  liveHomeProof,
  attemptAuthority
) {
  const state = registeredAttemptState(attemptAuthority);
  if (!state || state.status !== "registered") attemptLockFailure();
  state.status = "lock-acquiring";
  let descriptor;
  try {
    assertLiveHomeProof(liveHomeProof);
    if (
      state.liveHomeProof !== liveHomeProof
      || state.attemptAuthority !== attemptAuthority
    ) {
      attemptLockFailure();
    }
    const attemptBinding =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const attemptAuthorityBindingFingerprint = hashCanonicalProof(
      ATTEMPT_AUTHORITY_BINDING_DOMAIN,
      attemptBinding
    );
    if (
      attemptBinding.mode !== "initial"
      || attemptBinding.attemptId !== state.attemptId
      || attemptAuthorityBindingFingerprint
        !== state.attemptAuthorityBindingFingerprint
    ) {
      attemptLockFailure();
    }
    const observation = buildStableBootstrapStaticObservation();
    if (
      observation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || observation.repositoryObservation.repositoryIdentityFingerprint
        !== state.repositoryRootIdentityFingerprint
      || observation.repositoryObservation.tmpBaseIdentityFingerprint
        !== state.tmpBaseIdentityFingerprint
      || observation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLockFailure();
    }
    observeBoundInitialProvisionRoot(
      observation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    const { activePath, parentPath, retainedPath } = activationLockPaths(
      state.attemptId,
      observation.repositoryObservation.repositoryRoot
    );
    if (
      parentPath !== join(observation.repositoryObservation.repositoryRoot, ".tmp")
      || stableLstat(activePath) !== undefined
      || stableLstat(retainedPath) !== undefined
    ) {
      attemptLockFailure();
    }
    const ownerToken = hashCanonicalProof(
      ATTEMPT_OWNER_TOKEN_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["attemptId", state.attemptId],
        [
          "bootstrapAuthorityBindingFingerprint",
          state.bootstrapAuthorityBindingFingerprint
        ]
      ])
    );
    const ownerTokenFingerprint = hashEnvironmentText(
      "MAIS_DEPENDENCY_OWNER_TOKEN",
      ownerToken
    );
    const payload = nullRecord([
      ["schemaVersion", 2],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["repositoryBindingFingerprint", state.repositoryBindingFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      ["ownerTokenFingerprint", ownerTokenFingerprint],
      ["finalCommandScopeFingerprint", state.finalCommandScopeFingerprint]
    ]);
    const lockFingerprint = hashCanonicalProof(
      ACTIVATION_LOCK_DOMAIN,
      payload
    );
    const lockBytes = Buffer.from(`${canonicalizeClosedJson(payload)}\n`, "utf8");
    descriptor = openSync(
      activePath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600
    );
    writeAllDescriptorBytes(descriptor, lockBytes);
    fsyncSync(descriptor);
    const writtenEntry = fstatSync(descriptor, { bigint: true });
    if (
      !writtenEntry.isFile()
      || writtenEntry.isSymbolicLink()
      || writtenEntry.nlink !== 1n
      || (writtenEntry.mode & 0o7777n) !== 0o600n
      || writtenEntry.uid !== observation.repositoryObservation.repositoryUid
      || writtenEntry.dev !== observation.repositoryObservation.repositoryDev
    ) {
      attemptLockFailure();
    }
    closeSync(descriptor);
    descriptor = undefined;
    fsyncDirectory(parentPath);
    const lockObservation = observeActivationLockFile(
      activePath,
      "activation-lock-active",
      observation.repositoryObservation,
      lockBytes
    );
    const postObservation = buildStableBootstrapStaticObservation();
    if (
      postObservation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || postObservation.repositoryObservation.tmpBaseIdentityFingerprint
        !== state.tmpBaseIdentityFingerprint
      || postObservation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLockFailure();
    }
    observeBoundInitialProvisionRoot(
      postObservation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    currentOwnHomeValue(liveHomeProof);
    const receipt = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["lockFingerprint", lockFingerprint],
      ["lockFileIdentityFingerprint", lockObservation.identityFingerprint],
      [
        "parentIdentityFingerprint",
        observation.repositoryObservation.tmpBaseIdentityFingerprint
      ],
      ["state", "lock-validated"],
      ["signalAuthority", false]
    ]);
    hashCanonicalProof(ACTIVATION_LOCK_ACQUIRE_RECEIPT_DOMAIN, receipt);
    assertNoLiveHomeRetention(liveHomeProof, receipt);
    state.activationLock = {
      activeFileIdentityFingerprint: lockObservation.identityFingerprint,
      activePath,
      lockBytes,
      lockFingerprint,
      parentIdentityFingerprint:
        observation.repositoryObservation.tmpBaseIdentityFingerprint,
      parentPath,
      retainedPath
    };
    state.status = "lock-validated";
    return receipt;
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // The partially created active lock remains terminal evidence.
      }
    }
    failAttemptLaunchContextState(state);
    if (
      error?.message
        === "Required-browser provision activation-lock transaction rejected."
    ) {
      throw error;
    }
    attemptLockFailure();
  }
}

export function prepareInitialProvisionLayout(
  liveHomeProof,
  attemptAuthority
) {
  const state = registeredAttemptState(attemptAuthority);
  if (!state || state.status !== "lock-validated" || !state.activationLock) {
    attemptLayoutFailure();
  }
  state.status = "layout-preparing";
  try {
    assertLiveHomeProof(liveHomeProof);
    if (
      state.liveHomeProof !== liveHomeProof
      || state.attemptAuthority !== attemptAuthority
    ) {
      attemptLayoutFailure();
    }
    const attemptBinding =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const attemptAuthorityBindingFingerprint = hashCanonicalProof(
      ATTEMPT_AUTHORITY_BINDING_DOMAIN,
      attemptBinding
    );
    if (
      attemptBinding.mode !== "initial"
      || attemptBinding.attemptId !== state.attemptId
      || attemptAuthorityBindingFingerprint
        !== state.attemptAuthorityBindingFingerprint
      || attemptBinding.provisionRootBindingFingerprint
        !== state.provisionRootBindingFingerprint
      || attemptBinding.dependencyPathPolicyFingerprint
        !== state.dependencyPathPolicyFingerprint
      || attemptBinding.evidencePolicyFingerprint
        !== state.evidencePolicyFingerprint
    ) {
      attemptLayoutFailure();
    }
    const observation = buildStableBootstrapStaticObservation();
    if (
      observation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || observation.repositoryObservation.repositoryIdentityFingerprint
        !== state.repositoryRootIdentityFingerprint
      || observation.repositoryObservation.tmpBaseIdentityFingerprint
        !== state.tmpBaseIdentityFingerprint
      || observation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLayoutFailure();
    }
    const boundRoot = observeBoundInitialProvisionRoot(
      observation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    const activeLockObservation = observeActivationLockFile(
      state.activationLock.activePath,
      "activation-lock-active",
      observation.repositoryObservation,
      state.activationLock.lockBytes
    );
    if (
      activeLockObservation.identityFingerprint
        !== state.activationLock.activeFileIdentityFingerprint
      || stableLstat(state.activationLock.retainedPath) !== undefined
    ) {
      attemptLayoutFailure();
    }

    const paths = initialLayoutPaths(boundRoot.provisionRoot);
    exactDirectoryEntries(
      paths.provisionRoot,
      "initial-layout-empty-root",
      observation.repositoryObservation,
      []
    );
    const sourcePackageObservation = observeRegularFile(
      join(observation.repositoryObservation.repositoryRoot, "package.json"),
      "repositoryPackage",
      observation.repositoryObservation.repositoryUid,
      observation.repositoryObservation.repositoryDev,
      64 * 1024 * 1024
    );
    const sourcePackageLockObservation = observeRegularFile(
      join(observation.repositoryObservation.repositoryRoot, "package-lock.json"),
      "repositoryPackageLock",
      observation.repositoryObservation.repositoryUid,
      observation.repositoryObservation.repositoryDev,
      64 * 1024 * 1024
    );
    const packageManifest = parseStrictJsonObject(
      sourcePackageObservation.bytes
    );
    const packageLock = parseStrictJsonObject(
      sourcePackageLockObservation.bytes
    );
    validateInstallSourceContract(packageManifest, packageLock);
    const installManifest = buildInstallOnlyManifest(packageManifest);
    canonicalizeClosedJsonArtifact(installManifest);

    const ownerMarker = nullRecord([
      ["schemaVersion", 2],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["status", "provisioning"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["repositoryBindingFingerprint", state.repositoryBindingFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      ["sourceSeedFingerprint", state.sourceSeedFingerprint],
      [
        "dependencyPathPolicyFingerprint",
        state.dependencyPathPolicyFingerprint
      ],
      ["evidencePolicyFingerprint", state.evidencePolicyFingerprint],
      ["activationLockFingerprint", state.activationLock.lockFingerprint]
    ]);
    const ownerMarkerFingerprint = hashCanonicalProof(
      PROVISION_OWNER_MARKER_DOMAIN,
      ownerMarker
    );
    const ownerMarkerArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.provisionRoot, ".mais-dependency-provision.json"),
      "initial-layout-owner-marker",
      ownerMarker,
      observation.repositoryObservation
    );

    const directoryObservations = new Map();
    for (const relativePath of INITIAL_LAYOUT_ROOT_DIRECTORIES) {
      const exactPath = join(paths.provisionRoot, relativePath);
      directoryObservations.set(
        relativePath,
        createInitialLayoutDirectory(
          exactPath,
          initialLayoutDirectoryRole(relativePath),
          observation.repositoryObservation
        )
      );
    }
    fsyncDirectory(paths.provisionRoot);

    const cacheMarker = nullRecord([
      ["schemaVersion", 2],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["status", "fresh"],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      [
        "directoryIdentityFingerprint",
        directoryObservations.get("npm-cache").identityFingerprint
      ],
      ["sourceSeedFingerprint", state.sourceSeedFingerprint]
    ]);
    const quarantineMarker = nullRecord([
      ["schemaVersion", 2],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["status", "empty-before-npm"],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      [
        "directoryIdentityFingerprint",
        directoryObservations.get("quarantine").identityFingerprint
      ]
    ]);
    const rollbackMarker = nullRecord([
      ["schemaVersion", 2],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["status", "empty-before-npm"],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      [
        "directoryIdentityFingerprint",
        directoryObservations.get("rollback").identityFingerprint
      ]
    ]);
    const cacheMarkerFingerprint = hashCanonicalProof(
      PROVISION_CACHE_MARKER_DOMAIN,
      cacheMarker
    );
    const quarantineMarkerFingerprint = hashCanonicalProof(
      PROVISION_QUARANTINE_MARKER_DOMAIN,
      quarantineMarker
    );
    const rollbackMarkerFingerprint = hashCanonicalProof(
      PROVISION_ROLLBACK_MARKER_DOMAIN,
      rollbackMarker
    );
    const quarantineMarkerArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.quarantine, ".quarantine-marker.json"),
      "initial-layout-quarantine-marker",
      quarantineMarker,
      observation.repositoryObservation
    );
    const rollbackMarkerArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.rollback, ".rollback-marker.json"),
      "initial-layout-rollback-marker",
      rollbackMarker,
      observation.repositoryObservation
    );
    const cacheMarkerArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.npmCache, ".mais-dependency-cache.json"),
      "initial-layout-cache-marker",
      cacheMarker,
      observation.repositoryObservation
    );

    const sourcePackageEvidence = writeExclusiveInitialLayoutBytes(
      join(paths.evidence, "source-package.json"),
      "sourcePackageEvidence",
      sourcePackageObservation.bytes,
      observation.repositoryObservation
    );
    const sourcePackageLockEvidence = writeExclusiveInitialLayoutBytes(
      join(paths.evidence, "source-package-lock.json"),
      "sourcePackageLockEvidence",
      sourcePackageLockObservation.bytes,
      observation.repositoryObservation
    );
    const installPackageArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.install, "package.json"),
      "installPackage",
      installManifest,
      observation.repositoryObservation
    );
    const installPackageLock = writeExclusiveInitialLayoutBytes(
      join(paths.install, "package-lock.json"),
      "installPackageLock",
      sourcePackageLockObservation.bytes,
      observation.repositoryObservation
    );
    const npmConfigBytes = Buffer.from(
      "audit=false\nfund=false\nupdate-notifier=false\n",
      "utf8"
    );
    const npmGlobalConfig = writeExclusiveInitialLayoutBytes(
      join(paths.config, "npm-globalrc"),
      "npmGlobalConfig",
      npmConfigBytes,
      observation.repositoryObservation
    );
    const npmUserConfig = writeExclusiveInitialLayoutBytes(
      join(paths.config, "npm-userrc"),
      "npmUserConfig",
      npmConfigBytes,
      observation.repositoryObservation
    );

    crossInitialLayoutTestBarrierIfArmed(
      state,
      observation.repositoryObservation
    );

    const files = OBJECT_FREEZE([
      initialLayoutFileRecord(
        "repositoryPackage",
        "package.json",
        sourcePackageObservation
      ),
      initialLayoutFileRecord(
        "repositoryPackageLock",
        "package-lock.json",
        sourcePackageLockObservation
      ),
      initialLayoutFileRecord(
        "sourcePackageEvidence",
        "evidence/source-package.json",
        sourcePackageEvidence
      ),
      initialLayoutFileRecord(
        "sourcePackageLockEvidence",
        "evidence/source-package-lock.json",
        sourcePackageLockEvidence
      ),
      initialLayoutFileRecord(
        "installPackage",
        "install/package.json",
        installPackageArtifact.observation
      ),
      initialLayoutFileRecord(
        "installPackageLock",
        "install/package-lock.json",
        installPackageLock
      ),
      initialLayoutFileRecord(
        "npmGlobalConfig",
        "config/npm-globalrc",
        npmGlobalConfig
      ),
      initialLayoutFileRecord(
        "npmUserConfig",
        "config/npm-userrc",
        npmUserConfig
      )
    ]);
    const emptyDirectoryDefinitions = [
      ["data", "data"],
      ["logs", "logs"],
      ["nodeCompileCache", "node-compile-cache"],
      ["npmPrefix", "npm-prefix"],
      ["playwrightBrowsers", "playwright-browsers"],
      ["state", "state"],
      ["temp", "temp"],
      ["turboCache", "turbo-cache"]
    ];
    const emptyDirectories = [];
    for (const [role, relativePath] of emptyDirectoryDefinitions) {
      const directory = exactDirectoryEntries(
        join(paths.provisionRoot, relativePath),
        role,
        observation.repositoryObservation,
        []
      );
      emptyDirectories.push(initialLayoutEmptyDirectoryRecord(
        role,
        relativePath,
        directory
      ));
    }
    OBJECT_FREEZE(emptyDirectories);
    const absenceDefinitions = [
      ["stagedCandidate", "install/node_modules"],
      ["retainedQuarantineCandidate", "quarantine/node_modules-partial"],
      ["rollbackCandidate", "rollback/node_modules"]
    ];
    const absences = [];
    for (const [role, relativePath] of absenceDefinitions) {
      if (stableLstat(join(paths.provisionRoot, relativePath)) !== undefined) {
        attemptLayoutFailure();
      }
      absences.push(nullRecord([
        ["role", role],
        ["presence", "absent"]
      ]));
    }
    OBJECT_FREEZE(absences);
    const emptyDirectorySetFingerprint = hashCanonicalProof(
      INITIAL_LAYOUT_EMPTY_DIRECTORY_SET_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["directories", emptyDirectories]
      ])
    );
    const absenceSetFingerprint = hashCanonicalProof(
      INITIAL_LAYOUT_ABSENCE_SET_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["absences", absences]
      ])
    );

    const inputManifest = nullRecord([
      ["schemaVersion", 2],
      ["artifactKind", "dependency-source-install-input-manifest-v2"],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["status", "prepared-before-npm"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["repositoryBindingFingerprint", state.repositoryBindingFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      ["sourceSeedFingerprint", state.sourceSeedFingerprint],
      ["activationLockFingerprint", state.activationLock.lockFingerprint],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      ["cacheMarkerFingerprint", cacheMarkerFingerprint],
      ["quarantineMarkerFingerprint", quarantineMarkerFingerprint],
      ["rollbackMarkerFingerprint", rollbackMarkerFingerprint],
      ["files", files],
      ["emptyDirectories", emptyDirectories],
      ["absences", absences]
    ]);
    const inputManifestArtifact = writeExclusiveInitialLayoutArtifact(
      join(paths.evidence, "source-install-input-manifest.json"),
      "sourceInstallInputManifest",
      inputManifest,
      observation.repositoryObservation
    );

    exactDirectoryEntries(
      paths.provisionRoot,
      "initial-provision-install-root",
      observation.repositoryObservation,
      [".mais-dependency-provision.json", ...INITIAL_LAYOUT_ROOT_DIRECTORIES],
      boundRoot.rootIdentityFingerprint
    );
    const finalDirectoryEntries = new Map([
      ["config", ["npm-globalrc", "npm-userrc"]],
      ["data", []],
      [
        "evidence",
        [
          "source-package.json",
          "source-package-lock.json",
          "source-install-input-manifest.json"
        ]
      ],
      ["install", ["package.json", "package-lock.json"]],
      ["logs", []],
      ["node-compile-cache", []],
      ["npm-cache", [".mais-dependency-cache.json"]],
      ["npm-prefix", []],
      ["playwright-browsers", []],
      ["quarantine", [".quarantine-marker.json"]],
      ["rollback", [".rollback-marker.json"]],
      ["state", []],
      ["temp", []],
      ["turbo-cache", []]
    ]);
    for (const relativePath of INITIAL_LAYOUT_ROOT_DIRECTORIES) {
      const role = initialLayoutDirectoryRole(relativePath);
      const initialDirectory = directoryObservations.get(relativePath);
      const expectedEntries = finalDirectoryEntries.get(relativePath);
      if (!initialDirectory || !expectedEntries) attemptLayoutFailure();
      exactDirectoryEntries(
        join(paths.provisionRoot, relativePath),
        role,
        observation.repositoryObservation,
        expectedEntries,
        initialDirectory.identityFingerprint
      );
    }

    const filesToRevalidate = [
      [
        join(observation.repositoryObservation.repositoryRoot, "package.json"),
        "repositoryPackage",
        sourcePackageObservation,
        null
      ],
      [
        join(
          observation.repositoryObservation.repositoryRoot,
          "package-lock.json"
        ),
        "repositoryPackageLock",
        sourcePackageLockObservation,
        null
      ],
      [
        join(paths.provisionRoot, ".mais-dependency-provision.json"),
        "initial-layout-owner-marker",
        ownerMarkerArtifact.observation
      ],
      [
        join(paths.npmCache, ".mais-dependency-cache.json"),
        "initial-layout-cache-marker",
        cacheMarkerArtifact.observation
      ],
      [
        join(paths.quarantine, ".quarantine-marker.json"),
        "initial-layout-quarantine-marker",
        quarantineMarkerArtifact.observation
      ],
      [
        join(paths.rollback, ".rollback-marker.json"),
        "initial-layout-rollback-marker",
        rollbackMarkerArtifact.observation
      ],
      [
        join(paths.evidence, "source-package.json"),
        "sourcePackageEvidence",
        sourcePackageEvidence
      ],
      [
        join(paths.evidence, "source-package-lock.json"),
        "sourcePackageLockEvidence",
        sourcePackageLockEvidence
      ],
      [
        join(paths.install, "package.json"),
        "installPackage",
        installPackageArtifact.observation
      ],
      [
        join(paths.install, "package-lock.json"),
        "installPackageLock",
        installPackageLock
      ],
      [
        join(paths.config, "npm-globalrc"),
        "npmGlobalConfig",
        npmGlobalConfig
      ],
      [
        join(paths.config, "npm-userrc"),
        "npmUserConfig",
        npmUserConfig
      ],
      [
        join(paths.evidence, "source-install-input-manifest.json"),
        "sourceInstallInputManifest",
        inputManifestArtifact.observation
      ]
    ];
    for (const [exactPath, role, expectedFile, expectedMode] of filesToRevalidate) {
      revalidateInitialLayoutFile(
        exactPath,
        role,
        expectedFile,
        observation.repositoryObservation,
        expectedMode === undefined ? 0o600n : expectedMode
      );
    }

    const finalObservation = buildStableBootstrapStaticObservation();
    if (
      finalObservation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || finalObservation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLayoutFailure();
    }
    observeBoundInitialProvisionRoot(
      finalObservation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    const finalActiveLockObservation = observeActivationLockFile(
      state.activationLock.activePath,
      "activation-lock-active",
      finalObservation.repositoryObservation,
      state.activationLock.lockBytes
    );
    if (
      finalActiveLockObservation.identityFingerprint
        !== state.activationLock.activeFileIdentityFingerprint
      || stableLstat(state.activationLock.retainedPath) !== undefined
    ) {
      attemptLayoutFailure();
    }
    currentOwnHomeValue(liveHomeProof);

    const layoutBinding = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["cacheMode", "fresh"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["repositoryBindingFingerprint", state.repositoryBindingFingerprint],
      [
        "provisionRootBindingFingerprint",
        state.provisionRootBindingFingerprint
      ],
      ["activationLockFingerprint", state.activationLock.lockFingerprint],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      ["cacheMarkerFingerprint", cacheMarkerFingerprint],
      ["quarantineMarkerFingerprint", quarantineMarkerFingerprint],
      ["rollbackMarkerFingerprint", rollbackMarkerFingerprint],
      [
        "sourceInstallInputManifestSha256",
        inputManifestArtifact.artifact.sha256
      ],
      [
        "sourceInstallInputManifestIdentityFingerprint",
        inputManifestArtifact.observation.identityFingerprint
      ],
      ["emptyDirectorySetFingerprint", emptyDirectorySetFingerprint],
      ["absenceSetFingerprint", absenceSetFingerprint]
    ]);
    const layoutBindingFingerprint = hashCanonicalProof(
      INITIAL_LAYOUT_BINDING_DOMAIN,
      layoutBinding
    );
    const receipt = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["cacheMode", "fresh"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["layoutBindingFingerprint", layoutBindingFingerprint],
      ["ownerMarkerFingerprint", ownerMarkerFingerprint],
      ["cacheMarkerFingerprint", cacheMarkerFingerprint],
      ["quarantineMarkerFingerprint", quarantineMarkerFingerprint],
      ["rollbackMarkerFingerprint", rollbackMarkerFingerprint],
      [
        "sourceInstallInputManifestSha256",
        inputManifestArtifact.artifact.sha256
      ],
      [
        "sourceInstallInputManifestIdentityFingerprint",
        inputManifestArtifact.observation.identityFingerprint
      ],
      ["state", "fresh-layout-prepared"],
      ["signalAuthority", false]
    ]);
    hashCanonicalProof(INITIAL_LAYOUT_PREPARATION_RECEIPT_DOMAIN, receipt);
    assertNoLiveHomeRetention(liveHomeProof, receipt);
    state.layout = {
      absenceSetFingerprint,
      cacheMarkerFingerprint,
      directoryIdentityFingerprints: nullRecord(
        INITIAL_LAYOUT_ROOT_DIRECTORIES.map((relativePath) => [
          initialLayoutDirectoryRole(relativePath),
          directoryObservations.get(relativePath).identityFingerprint
        ])
      ),
      emptyDirectorySetFingerprint,
      fileBindings: nullRecord([
        [
          "repositoryPackage",
          initialLayoutPrivateFileBinding(sourcePackageObservation)
        ],
        [
          "repositoryPackageLock",
          initialLayoutPrivateFileBinding(sourcePackageLockObservation)
        ],
        [
          "ownerMarker",
          initialLayoutPrivateFileBinding(ownerMarkerArtifact.observation)
        ],
        [
          "cacheMarker",
          initialLayoutPrivateFileBinding(cacheMarkerArtifact.observation)
        ],
        [
          "quarantineMarker",
          initialLayoutPrivateFileBinding(quarantineMarkerArtifact.observation)
        ],
        [
          "rollbackMarker",
          initialLayoutPrivateFileBinding(rollbackMarkerArtifact.observation)
        ],
        [
          "sourcePackageEvidence",
          initialLayoutPrivateFileBinding(sourcePackageEvidence)
        ],
        [
          "sourcePackageLockEvidence",
          initialLayoutPrivateFileBinding(sourcePackageLockEvidence)
        ],
        [
          "installPackage",
          initialLayoutPrivateFileBinding(installPackageArtifact.observation)
        ],
        [
          "installPackageLock",
          initialLayoutPrivateFileBinding(installPackageLock)
        ],
        ["npmGlobalConfig", initialLayoutPrivateFileBinding(npmGlobalConfig)],
        ["npmUserConfig", initialLayoutPrivateFileBinding(npmUserConfig)],
        [
          "inputManifest",
          initialLayoutPrivateFileBinding(inputManifestArtifact.observation)
        ]
      ]),
      inputManifestIdentityFingerprint:
        inputManifestArtifact.observation.identityFingerprint,
      inputManifestSha256: inputManifestArtifact.artifact.sha256,
      layoutBindingFingerprint,
      ownerMarkerFingerprint,
      quarantineMarkerFingerprint,
      rollbackMarkerFingerprint
    };
    state.status = "layout-prepared-fresh";
    return receipt;
  } catch (error) {
    markAttemptOperationFailed(state);
    if (
      error?.message
        === "Required-browser initial provision layout preparation rejected."
    ) {
      throw error;
    }
    attemptLayoutFailure();
  }
}

function observeInitialAttemptOperationBindings(
  liveHomeProof,
  attemptAuthority,
  state,
  installPhase = "pre-node-modules"
) {
  if (
    installPhase !== "pre-node-modules"
    && installPhase !== "post-ci-staged"
  ) {
    attemptOperationFailure();
  }
  assertLiveHomeProof(liveHomeProof);
  if (
    state.liveHomeProof !== liveHomeProof
    || state.attemptAuthority !== attemptAuthority
    || !state.activationLock
    || !state.layout
  ) {
    attemptOperationFailure();
  }
  const attemptBinding =
    readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
      liveHomeProof,
      attemptAuthority
    );
  const attemptAuthorityBindingFingerprint = hashCanonicalProof(
    ATTEMPT_AUTHORITY_BINDING_DOMAIN,
    attemptBinding
  );
  if (
    attemptBinding.mode !== "initial"
    || attemptBinding.attemptId !== state.attemptId
    || attemptAuthorityBindingFingerprint
      !== state.attemptAuthorityBindingFingerprint
    || attemptBinding.provisionRootBindingFingerprint
      !== state.provisionRootBindingFingerprint
  ) {
    attemptOperationFailure();
  }
  const observation = buildStableBootstrapStaticObservation();
  if (
    observation.repositoryObservation.repositoryBindingFingerprint
      !== state.repositoryBindingFingerprint
    || observation.repositoryObservation.repositoryIdentityFingerprint
      !== state.repositoryRootIdentityFingerprint
    || observation.repositoryObservation.tmpBaseIdentityFingerprint
      !== state.tmpBaseIdentityFingerprint
    || observation.sourceSeedFingerprint !== state.sourceSeedFingerprint
  ) {
    attemptOperationFailure();
  }
  const boundRoot = observeBoundInitialProvisionRoot(
    observation.repositoryObservation,
    state.attemptId,
    state.provisionRootBindingFingerprint,
    state.provisionRootDescriptor
  );
  const activeLock = observeActivationLockFile(
    state.activationLock.activePath,
    "activation-lock-active",
    observation.repositoryObservation,
    state.activationLock.lockBytes
  );
  if (
    activeLock.identityFingerprint
      !== state.activationLock.activeFileIdentityFingerprint
    || stableLstat(state.activationLock.retainedPath) !== undefined
  ) {
    attemptOperationFailure();
  }
  const paths = initialLayoutPaths(boundRoot.provisionRoot);
  exactDirectoryEntries(
    paths.provisionRoot,
    "initial-provision-install-root",
    observation.repositoryObservation,
    [".mais-dependency-provision.json", ...INITIAL_LAYOUT_ROOT_DIRECTORIES],
    boundRoot.rootIdentityFingerprint
  );
  for (const relativePath of INITIAL_LAYOUT_ROOT_DIRECTORIES) {
    const role = initialLayoutDirectoryRole(relativePath);
    const expectedIdentity = state.layout.directoryIdentityFingerprints?.[role];
    const directory = observeDirectory(
      join(paths.provisionRoot, relativePath),
      role,
      observation.repositoryObservation.repositoryUid,
      observation.repositoryObservation.repositoryDev,
      true
    );
    if (
      !expectedIdentity
      || directory.identityFingerprint !== expectedIdentity
      || (directory.entry.mode & 0o7777n) !== 0o700n
    ) {
      attemptOperationFailure();
    }
  }
  exactDirectoryEntries(
    paths.install,
    "install",
    observation.repositoryObservation,
    installPhase === "post-ci-staged"
      ? ["node_modules", "package-lock.json", "package.json"]
      : ["package-lock.json", "package.json"],
    state.layout.directoryIdentityFingerprints.install
  );
  exactDirectoryEntries(
    paths.config,
    "config",
    observation.repositoryObservation,
    ["npm-globalrc", "npm-userrc"],
    state.layout.directoryIdentityFingerprints.config
  );
  exactDirectoryEntries(
    paths.evidence,
    "evidence",
    observation.repositoryObservation,
    [
      "source-install-input-manifest.json",
      "source-package-lock.json",
      "source-package.json"
    ],
    state.layout.directoryIdentityFingerprints.evidence
  );
  exactDirectoryEntries(
    paths.quarantine,
    "quarantine",
    observation.repositoryObservation,
    [".quarantine-marker.json"],
    state.layout.directoryIdentityFingerprints.quarantine
  );
  exactDirectoryEntries(
    paths.rollback,
    "rollback",
    observation.repositoryObservation,
    [".rollback-marker.json"],
    state.layout.directoryIdentityFingerprints.rollback
  );
  const fileDefinitions = [
    [
      join(observation.repositoryObservation.repositoryRoot, "package.json"),
      "repositoryPackage",
      "repositoryPackage"
    ],
    [
      join(observation.repositoryObservation.repositoryRoot, "package-lock.json"),
      "repositoryPackageLock",
      "repositoryPackageLock"
    ],
    [
      join(paths.provisionRoot, ".mais-dependency-provision.json"),
      "initial-layout-owner-marker",
      "ownerMarker"
    ],
    [
      join(paths.npmCache, ".mais-dependency-cache.json"),
      "initial-layout-cache-marker",
      "cacheMarker"
    ],
    [
      join(paths.quarantine, ".quarantine-marker.json"),
      "initial-layout-quarantine-marker",
      "quarantineMarker"
    ],
    [
      join(paths.rollback, ".rollback-marker.json"),
      "initial-layout-rollback-marker",
      "rollbackMarker"
    ],
    [
      join(paths.evidence, "source-package.json"),
      "sourcePackageEvidence",
      "sourcePackageEvidence"
    ],
    [
      join(paths.evidence, "source-package-lock.json"),
      "sourcePackageLockEvidence",
      "sourcePackageLockEvidence"
    ],
    [join(paths.install, "package.json"), "installPackage", "installPackage"],
    [
      join(paths.install, "package-lock.json"),
      "installPackageLock",
      "installPackageLock"
    ],
    [
      join(paths.config, "npm-globalrc"),
      "npmGlobalConfig",
      "npmGlobalConfig"
    ],
    [
      join(paths.config, "npm-userrc"),
      "npmUserConfig",
      "npmUserConfig"
    ],
    [
      join(paths.evidence, "source-install-input-manifest.json"),
      "sourceInstallInputManifest",
      "inputManifest"
    ]
  ];
  for (const [exactPath, role, bindingKey] of fileDefinitions) {
    const expected = state.layout.fileBindings?.[bindingKey];
    if (!expected) attemptOperationFailure();
    revalidateInitialLayoutFile(
      exactPath,
      role,
      expected,
      observation.repositoryObservation,
      bindingKey === "repositoryPackage"
        || bindingKey === "repositoryPackageLock"
        ? null
        : 0o600n
    );
  }
  const nodeRuntime = observeLauncherNodeRuntime();
  if (
    nodeRuntime.canonicalPath !== state.nodeExecutablePath
    || nodeRuntime.identityFingerprint
      !== state.nodeExecutableIdentityFingerprint
    || nodeRuntime.contentSha256 !== state.nodeExecutableContentSha256
  ) {
    attemptOperationFailure();
  }
  const npmCli = observeBoundNpmCli(
    {
      npmCliPath: state.npmCliPath,
      npmManifestContentSha256: state.npmManifestContentSha256,
      npmManifestPath: state.npmManifestPath,
      npmVersion: state.npmVersion
    },
    {
      npmCliContentSha256: state.npmCliContentSha256,
      npmCliPathFingerprint: state.npmCliPathFingerprint,
      npmCliPhysicalIdentityFingerprint:
        state.npmCliPhysicalIdentityFingerprint,
      npmVersion: state.npmVersion
    }
  );
  currentOwnHomeValue(liveHomeProof);
  return {
    attemptBinding,
    boundRoot,
    cwdIdentityFingerprint: state.layout.directoryIdentityFingerprints.install,
    nodeRuntime,
    npmCli,
    observation,
    paths
  };
}

function privateAttemptDescriptor(commandId) {
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorFingerprint =
    ownedProcessDescriptorFingerprintEntryById.get(commandId)
      ?.descriptorFingerprint;
  if (
    !descriptor
    || !descriptorFingerprint
    || !INITIAL_ATTEMPT_PRIVATE_COMMAND_IDS.includes(commandId)
    || descriptor.executableBinding.kind !== "fixed-system-executable"
    || descriptor.cwdBinding.kind !== "provision-repository-root"
    || descriptor.environmentBinding !== "owned-audit"
    || descriptor.execution !== "finite-direct-child"
    || descriptor.processTreeOwned !== false
    || descriptor.outputPolicy.kind !== "buffered-parse"
    || descriptor.signalPolicy.kind
      !== "identity-revalidated-direct-child-term-kill"
    || descriptor.timeoutMs !== 30000
  ) {
    attemptOperationFailure();
  }
  const args = descriptor.argvTemplate.map((token) => {
    if (token.kind !== "literal" || typeof token.value !== "string") {
      attemptOperationFailure();
    }
    return token.value;
  });
  return {
    args,
    descriptor,
    descriptorFingerprint,
    executable: descriptor.executableBinding.absolutePath,
    stderrMaxBytes: descriptor.outputPolicy.stderrMaxBytes,
    stdoutMaxBytes: descriptor.outputPolicy.stdoutMaxBytes
  };
}

function parseOwnedProcessTable(bytes) {
  const text = decodeExactUtf8(bytes);
  const rows = [];
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0) continue;
    const match = REFLECT_APPLY(
      REGEXP_EXEC,
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/u,
      [line]
    );
    if (!match) attemptOperationFailure();
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const pgid = Number(match[3]);
    if (
      !Number.isSafeInteger(pid)
      || pid <= 0
      || !Number.isSafeInteger(ppid)
      || ppid < 0
      || !Number.isSafeInteger(pgid)
      || pgid <= 0
    ) {
      attemptOperationFailure();
    }
    rows.push({
      command: match[5],
      pgid,
      pid,
      ppid,
      startedAt: match[4]
    });
  }
  if (rows.length === 0) attemptOperationFailure();
  return rows;
}

function parseOwnedTokenTable(bytes, ownerToken) {
  const text = decodeExactUtf8(bytes);
  const exactAssignment = `MAIS_DEPENDENCY_OWNER_TOKEN=${ownerToken}`;
  const tokenPids = new Set();
  let examinedCount = 0;
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0) continue;
    const match = REFLECT_APPLY(REGEXP_EXEC, /^\s*(\d+)\s+(.+)$/u, [line]);
    if (!match) attemptOperationFailure();
    const pid = Number(match[1]);
    if (!Number.isSafeInteger(pid) || pid <= 0) attemptOperationFailure();
    examinedCount += 1;
    if (match[2].includes(exactAssignment)) tokenPids.add(pid);
  }
  if (examinedCount === 0) attemptOperationFailure();
  return { examinedCount, tokenPids };
}

function activeOwnedProfileCount(rows, repositoryRoot) {
  let count = 0;
  for (const row of rows) {
    const command = row.command;
    if (
      command.includes(`${repositoryRoot}/.tmp/bug3-owner-`)
      || (
        command.includes(repositoryRoot)
        && /node_modules\/(?:@playwright\/test|playwright|next)\/.+(?:\btest\b|\bbuild\b|\bstart\b)/u.test(command)
      )
    ) {
      count += 1;
    }
  }
  return count;
}

async function runPrivateAttemptAuditCommand({
  commandId,
  liveHomeProof,
  operationDeadlineNanoseconds,
  ownerToken,
  state,
  staticObservation
}) {
  const operation = privateAttemptDescriptor(commandId);
  let environment;
  let postEnvironment;
  let execution;
  let executionTransferred = false;
  try {
    environment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      join(
        staticObservation.repositoryObservation.repositoryRoot,
        state.provisionRootRelativePath
      ),
      ownerToken
    );
    if (
      environment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      attemptOperationFailure();
    }
    const executableIdentityFingerprint = observeFixedSystemExecutable(
      operation.executable
    );
    let auditTimeoutMs = operation.descriptor.timeoutMs;
    if (typeof operationDeadlineNanoseconds === "bigint") {
      const remainingNanoseconds = operationDeadlineNanoseconds
        - PROCESS_HRTIME_BIGINT();
      if (remainingNanoseconds <= 0n) attemptOperationFailure();
      const remainingMilliseconds = Number(
        (remainingNanoseconds + 999999n) / 1000000n
      );
      if (!Number.isSafeInteger(remainingMilliseconds)) {
        attemptOperationFailure();
      }
      auditTimeoutMs = Math.max(
        1,
        Math.min(auditTimeoutMs, remainingMilliseconds)
      );
    }
    const executionPromise = executeBootstrapDirectChild({
      args: operation.args,
      childEnvironment: environment.childEnvironment,
      cwd: staticObservation.repositoryObservation.repositoryRoot,
      executable: operation.executable,
      handleCloseTimeoutMs:
        operation.descriptor.signalPolicy.handleCloseTimeoutMs,
      killGraceMs:
        operation.descriptor.signalPolicy.killPollAttempts
          * operation.descriptor.signalPolicy.pollIntervalMs,
      stderrMaxBytes: operation.stderrMaxBytes,
      stdoutMaxBytes: operation.stdoutMaxBytes,
      termGraceMs:
        operation.descriptor.signalPolicy.termPollAttempts
          * operation.descriptor.signalPolicy.pollIntervalMs,
      timeoutMs: auditTimeoutMs
    });
    wipeChildEnvironment(environment.childEnvironment);
    environment.childEnvironment = undefined;
    execution = await executionPromise;
    if (
      execution.spawnOccurred
      && (!execution.closeObserved || execution.survivorCount > 0)
    ) {
      state.auxiliaryProcessUncertainty = true;
      state.operationProcessTerminality = "uncertain";
    }
    if (
      execution.spawnError
      || !execution.spawnOccurred
      || !execution.exitObserved
      || !execution.closeObserved
      || execution.exitCode !== 0
      || execution.exitSignal !== null
      || execution.failureTrigger !== "none"
      || execution.lifecycleCode !== "exit-zero"
      || execution.termAttempted
      || execution.killAttempted
      || execution.stdoutOverflow
      || execution.stderrOverflow
      || execution.stderrByteLength !== 0
      || execution.survivorCount !== 0
    ) {
      attemptOperationFailure();
    }
    postEnvironment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      join(
        staticObservation.repositoryObservation.repositoryRoot,
        state.provisionRootRelativePath
      ),
      ownerToken
    );
    wipeChildEnvironment(postEnvironment.childEnvironment);
    postEnvironment.childEnvironment = undefined;
    if (
      postEnvironment.inventoryFingerprint
        !== environment.inventoryFingerprint
      || postEnvironment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
      || observeFixedSystemExecutable(operation.executable)
        !== executableIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    executionTransferred = true;
    return {
      descriptorFingerprint: operation.descriptorFingerprint,
      environmentInventoryFingerprint: environment.inventoryFingerprint,
      executableIdentityFingerprint,
      execution
    };
  } finally {
    if (environment) {
      wipeChildEnvironment(environment.childEnvironment);
      environment.childEnvironment = undefined;
    }
    if (postEnvironment) {
      wipeChildEnvironment(postEnvironment.childEnvironment);
      postEnvironment.childEnvironment = undefined;
    }
    if (execution && !executionTransferred) {
      execution.stdout.fill(0);
      execution.stderr.fill(0);
    }
  }
}

async function collectOwnedAuditSnapshotPair(
  liveHomeProof,
  state,
  ownerToken,
  staticObservation
) {
  const tokenSnapshot = await collectOwnedTokenSnapshot(
    liveHomeProof,
    state,
    ownerToken,
    staticObservation
  );
  let processSnapshot;
  try {
    processSnapshot = await collectOwnedProcessSnapshot(
      liveHomeProof,
      state,
      ownerToken,
      staticObservation
    );
  } catch (error) {
    clearOwnedTokenSnapshot(tokenSnapshot);
    throw error;
  }
  return combineOwnedAuditSnapshots(
    processSnapshot,
    tokenSnapshot,
    staticObservation
  );
}

async function collectOwnedProcessSnapshot(
  liveHomeProof,
  state,
  ownerToken,
  staticObservation,
  operationDeadlineNanoseconds
) {
  const processExecution = await runPrivateAttemptAuditCommand({
    commandId: "owner.dependency.audit.process-table-owned",
    liveHomeProof,
    operationDeadlineNanoseconds,
    ownerToken,
    state,
    staticObservation
  });
  const processRawOutputSha256 = sha256Bytes(
    processExecution.execution.stdout
  );
  let rows;
  try {
    rows = parseOwnedProcessTable(processExecution.execution.stdout);
  } finally {
    processExecution.execution.stdout.fill(0);
    processExecution.execution.stderr.fill(0);
  }
  return {
    descriptorFingerprint: processExecution.descriptorFingerprint,
    environmentInventoryFingerprint:
      processExecution.environmentInventoryFingerprint,
    examinedCount: rows.length,
    executableIdentityFingerprint:
      processExecution.executableIdentityFingerprint,
    rows,
    snapshotFingerprint: hashCanonicalProof(
      OWNED_PROCESS_TABLE_SNAPSHOT_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["rawOutputSha256", processRawOutputSha256],
        ["examinedCount", rows.length]
      ])
    )
  };
}

async function collectOwnedTokenSnapshot(
  liveHomeProof,
  state,
  ownerToken,
  staticObservation,
  operationDeadlineNanoseconds
) {
  const tokenExecution = await runPrivateAttemptAuditCommand({
    commandId: "owner.dependency.audit.owner-token-table-owned",
    liveHomeProof,
    operationDeadlineNanoseconds,
    ownerToken,
    state,
    staticObservation
  });
  const tokenRawOutputSha256 = sha256Bytes(tokenExecution.execution.stdout);
  let tokenTable;
  try {
    tokenTable = parseOwnedTokenTable(
      tokenExecution.execution.stdout,
      ownerToken
    );
  } finally {
    tokenExecution.execution.stdout.fill(0);
    tokenExecution.execution.stderr.fill(0);
  }
  return {
    descriptorFingerprint: tokenExecution.descriptorFingerprint,
    environmentInventoryFingerprint:
      tokenExecution.environmentInventoryFingerprint,
    examinedCount: tokenTable.examinedCount,
    executableIdentityFingerprint:
      tokenExecution.executableIdentityFingerprint,
    snapshotFingerprint: hashCanonicalProof(
      OWNED_OWNER_TOKEN_SNAPSHOT_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["rawOutputSha256", tokenRawOutputSha256],
        ["examinedCount", tokenTable.examinedCount],
        ["ownerTokenEntryCount", tokenTable.tokenPids.size]
      ])
    ),
    tokenPids: tokenTable.tokenPids
  };
}

function combineOwnedAuditSnapshots(
  processSnapshot,
  tokenSnapshot,
  staticObservation
) {
  return {
    activeProfileCount: activeOwnedProfileCount(
      processSnapshot.rows,
      staticObservation.repositoryObservation.repositoryRoot
    ),
    process: {
      descriptorFingerprint: processSnapshot.descriptorFingerprint,
      environmentInventoryFingerprint:
        processSnapshot.environmentInventoryFingerprint,
      examinedCount: processSnapshot.examinedCount,
      executableIdentityFingerprint:
        processSnapshot.executableIdentityFingerprint,
      snapshotFingerprint: processSnapshot.snapshotFingerprint
    },
    rows: processSnapshot.rows,
    token: {
      descriptorFingerprint: tokenSnapshot.descriptorFingerprint,
      environmentInventoryFingerprint:
        tokenSnapshot.environmentInventoryFingerprint,
      examinedCount: tokenSnapshot.examinedCount,
      executableIdentityFingerprint:
        tokenSnapshot.executableIdentityFingerprint,
      snapshotFingerprint: tokenSnapshot.snapshotFingerprint,
      tokenPids: tokenSnapshot.tokenPids
    }
  };
}

function clearOwnedProcessSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.rows)) return;
  for (const row of snapshot.rows) {
    if (row && typeof row === "object") row.command = "";
  }
  snapshot.rows.length = 0;
}

function clearOwnedTokenSnapshot(snapshot) {
  snapshot?.tokenPids?.clear?.();
}

function ownedAuditAggregate(state, publicCommandId, stage, snapshot) {
  const ownerAssociatedCount = snapshot.token.tokenPids.size;
  const violationCount = ownerAssociatedCount + snapshot.activeProfileCount;
  if (violationCount !== 0) attemptOperationFailure();
  const aggregate = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["publicCommandId", publicCommandId],
    ["stage", stage],
    ["processTableCommandId", "owner.dependency.audit.process-table-owned"],
    ["processTableDescriptorFingerprint", snapshot.process.descriptorFingerprint],
    [
      "processTableEnvironmentInventoryFingerprint",
      snapshot.process.environmentInventoryFingerprint
    ],
    [
      "processTableExecutableIdentityFingerprint",
      snapshot.process.executableIdentityFingerprint
    ],
    ["processTableSnapshotFingerprint", snapshot.process.snapshotFingerprint],
    ["processTableExaminedCount", snapshot.process.examinedCount],
    [
      "ownerTokenTableCommandId",
      "owner.dependency.audit.owner-token-table-owned"
    ],
    ["ownerTokenTableDescriptorFingerprint", snapshot.token.descriptorFingerprint],
    [
      "ownerTokenTableEnvironmentInventoryFingerprint",
      snapshot.token.environmentInventoryFingerprint
    ],
    [
      "ownerTokenTableExecutableIdentityFingerprint",
      snapshot.token.executableIdentityFingerprint
    ],
    ["ownerTokenTableSnapshotFingerprint", snapshot.token.snapshotFingerprint],
    ["ownerTokenTableExaminedCount", snapshot.token.examinedCount],
    ["ownerTokenEntryCount", 0],
    ["ownerAssociatedCount", 0],
    ["activeProfileCount", 0],
    ["violationCount", 0],
    ["outcome", "PASS"],
    ["signalAuthority", false]
  ]);
  return {
    aggregate,
    fingerprint: hashCanonicalProof(OWNED_AUDIT_AGGREGATE_DOMAIN, aggregate)
  };
}

function clearOwnedAuditSnapshot(snapshot) {
  if (!snapshot) return;
  if (Array.isArray(snapshot.rows)) {
    for (const row of snapshot.rows) {
      if (row && typeof row === "object") row.command = "";
    }
    snapshot.rows.length = 0;
  }
  snapshot.token?.tokenPids?.clear?.();
}

function waitMilliseconds(milliseconds, retainProcess = false) {
  return new Promise((resolveWait) => {
    const timer = setTimeout(resolveWait, milliseconds);
    if (!retainProcess) timer.unref?.();
  });
}

function npmRuntimeTitleClass(
  command,
  nodePath,
  npmCliPath,
  npmArguments,
  npmProcessTitle
) {
  if (typeof command !== "string") return undefined;
  const normalized = command.trim();
  const argumentText = npmArguments.join(" ");
  if (normalized === `${nodePath} ${npmCliPath} ${argumentText}`) {
    return "canonical-node-npm-argv";
  }
  if (normalized === npmProcessTitle) return "npm-process-title";
  return undefined;
}

function observedRootRuntimeTuple(
  rows,
  childPid,
  nodePath,
  npmCliPath,
  npmArguments,
  npmProcessTitle
) {
  const matches = rows.filter((row) => row.pid === childPid);
  if (matches.length !== 1) return undefined;
  const row = matches[0];
  const titleClass = npmRuntimeTitleClass(
    row.command,
    nodePath,
    npmCliPath,
    npmArguments,
    npmProcessTitle
  );
  if (
    row.ppid !== process.pid
    || row.pgid !== childPid
    || titleClass === undefined
  ) {
    return undefined;
  }
  return {
    pgid: row.pgid,
    pid: row.pid,
    ppid: row.ppid,
    startedAt: row.startedAt,
    titleClass
  };
}

function discoverOwnedTree(
  snapshot,
  childPid,
  nodePath,
  npmCliPath,
  npmArguments,
  npmProcessTitle
) {
  const rootTuple = observedRootRuntimeTuple(
    snapshot.rows,
    childPid,
    nodePath,
    npmCliPath,
    npmArguments,
    npmProcessTitle
  );
  const groupPids = new Set(
    snapshot.rows
      .filter((row) => row.pgid === childPid)
      .map((row) => row.pid)
  );
  if (!rootTuple) {
    const unprovenPids = new Set([
      ...groupPids,
      ...snapshot.token.tokenPids
    ]);
    return {
      identities: new Map(),
      rootEstablished: false,
      rootOwnerTokenObserved: false,
      rootRuntimeTitleClass: undefined,
      tokenCorroboratedProcessCount: 0,
      unknownProcessGroupMemberCount: groupPids.size,
      unprovenCount: unprovenPids.size
    };
  }
  const rowsByPid = new Map(snapshot.rows.map((row) => [row.pid, row]));
  const identities = new Map([
    [
      childPid,
      {
        depth: 0,
        pgid: rootTuple.pgid,
        pid: rootTuple.pid,
        ppid: rootTuple.ppid,
        startedAt: rootTuple.startedAt,
        titleClass: rootTuple.titleClass
      }
    ]
  ]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of snapshot.rows) {
      if (identities.has(row.pid)) continue;
      const parent = identities.get(row.ppid);
      if (
        !parent
        || row.pgid !== childPid
      ) {
        continue;
      }
      identities.set(row.pid, {
        depth: parent.depth + 1,
        pgid: row.pgid,
        pid: row.pid,
        ppid: row.ppid,
        startedAt: row.startedAt
      });
      changed = true;
    }
  }
  const unknownGroupPids = new Set(
    [...groupPids].filter((pid) => !identities.has(pid))
  );
  const foreignTokenPids = new Set(
    [...snapshot.token.tokenPids].filter((pid) => !identities.has(pid))
  );
  const unprovenPids = new Set([
    ...unknownGroupPids,
    ...foreignTokenPids
  ]);
  return {
    identities,
    rootEstablished: true,
    rootOwnerTokenObserved: snapshot.token.tokenPids.has(childPid),
    rootRuntimeTitleClass: rootTuple.titleClass,
    tokenCorroboratedProcessCount: [...snapshot.token.tokenPids]
      .filter((pid) => identities.has(pid)).length,
    unknownProcessGroupMemberCount: unknownGroupPids.size,
    unprovenCount: unprovenPids.size
  };
}

function mergeOwnedTreeIdentities(retained, discovered) {
  for (const [pid, identity] of discovered) {
    const prior = retained.get(pid);
    if (
      prior
      && (
        prior.pgid !== identity.pgid
        || prior.ppid !== identity.ppid
        || prior.startedAt !== identity.startedAt
      )
    ) {
      attemptOperationFailure();
    }
    if (!prior) retained.set(pid, identity);
  }
}

function revalidateOwnedTree(
  retained,
  snapshot,
  nodePath,
  npmCliPath,
  npmArguments,
  npmProcessTitle,
  rootPid
) {
  const rowsByPid = new Map(snapshot.rows.map((row) => [row.pid, row]));
  const live = [];
  const mismatchPids = new Set();
  for (const identity of retained.values()) {
    const row = rowsByPid.get(identity.pid);
    if (!row) continue;
    const rootSignatureValid = identity.depth !== 0 || (
      row.ppid === process.pid
      && npmRuntimeTitleClass(
        row.command,
        nodePath,
        npmCliPath,
        npmArguments,
        npmProcessTitle
      ) !== undefined
    );
    const parent = retained.get(identity.ppid);
    const parentStillLive = parent && rowsByPid.has(parent.pid);
    const parentValid = identity.depth === 0
      ? row.ppid === process.pid
      : row.ppid === identity.ppid || !parentStillLive;
    if (
      row.pid !== identity.pid
      || row.pgid !== identity.pgid
      || row.pgid !== rootPid
      || row.startedAt !== identity.startedAt
      || !parentValid
      || !rootSignatureValid
    ) {
      mismatchPids.add(identity.pid);
      continue;
    }
    live.push(identity);
  }
  const livePids = new Set(live.map((identity) => identity.pid));
  const unknownGroupPids = new Set(
    snapshot.rows
      .filter((row) => row.pgid === rootPid && !livePids.has(row.pid))
      .map((row) => row.pid)
  );
  const foreignTokenPids = new Set(
    [...snapshot.token.tokenPids].filter((pid) => !retained.has(pid))
  );
  const unprovenPids = new Set([
    ...mismatchPids,
    ...unknownGroupPids,
    ...foreignTokenPids
  ]);
  return {
    live,
    mismatchCount: mismatchPids.size,
    rootOwnerTokenObserved: snapshot.token.tokenPids.has(rootPid),
    tokenCorroboratedProcessCount: [...snapshot.token.tokenPids]
      .filter((pid) => retained.has(pid)).length,
    unknownProcessGroupMemberCount: unknownGroupPids.size,
    unprovenCount: unprovenPids.size
  };
}

function signalRevalidatedOwnedTree(identities, signal, child, rootPid) {
  let sentCount = 0;
  let failureCount = 0;
  const ordered = [...identities].sort((left, right) =>
    right.depth - left.depth || right.pid - left.pid
  );
  for (const identity of ordered) {
    try {
      if (identity.pid === rootPid) {
        if (!child || child.kill(signal) !== true) {
          failureCount += 1;
          continue;
        }
      } else {
        REFLECT_APPLY(PROCESS_KILL, process, [identity.pid, signal]);
      }
      sentCount += 1;
    } catch (error) {
      if (error?.code !== "ESRCH") failureCount += 1;
    }
  }
  return { failureCount, sentCount };
}

function ignoreLateOwnedChildError() {}

function detachUnreapedOwnedChild(child) {
  if (!child) return;
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    stream.removeAllListeners("data");
    stream.removeAllListeners("error");
    stream.on("error", ignoreLateOwnedChildError);
    stream.destroy();
  }
  child.removeAllListeners("spawn");
  child.removeAllListeners("exit");
  child.removeAllListeners("close");
  child.removeAllListeners("error");
  child.on("error", ignoreLateOwnedChildError);
  child.unref();
}

async function executeInitialOwnedNpmOperation({
  commandId,
  childEnvironment,
  liveHomeProof,
  nodePath,
  npmArguments,
  npmCliPath,
  npmProcessTitle,
  ownerToken,
  state,
  staticObservation
}) {
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorArguments = descriptor?.argvTemplate?.slice(1).map(
    (token) => token.kind === "literal" ? token.value : undefined
  );
  if (
    !descriptor
    || descriptor.argvTemplate?.[0]?.kind !== "validated-binding"
    || descriptor.argvTemplate[0].name !== "npm-cli"
    || !Array.isArray(npmArguments)
    || descriptorArguments.length !== npmArguments.length
    || descriptorArguments.some(
      (argument, index) => argument !== npmArguments[index]
    )
    || descriptor.execution !== "finite-owned-process"
    || descriptor.processTreeOwned !== true
    || descriptor.signalPolicy.kind
      !== "identity-revalidated-owned-tree-term-kill"
    || descriptor.outputPolicy.kind !== "buffered-parse-and-sanitized-log"
    || !Number.isSafeInteger(descriptor.timeoutMs)
    || descriptor.timeoutMs <= 0
  ) {
    wipeChildEnvironment(childEnvironment);
    attemptOperationFailure();
  }
  const operationDeadlineNanoseconds = PROCESS_HRTIME_BIGINT()
    + BigInt(descriptor.timeoutMs) * 1000000n;
  let child;
  let spawned = false;
  let spawnError = false;
  let exitObserved = false;
  let closeObserved = false;
  let exitCode = null;
  let exitSignal = null;
  let timedOut = false;
  let stdoutOverflow = false;
  let stderrOverflow = false;
  let failureTrigger = "none";
  let identityEstablished = false;
  let identityRevalidatedBeforeTerm = false;
  let identityRevalidatedBeforeKill = false;
  let termAttempted = false;
  let termSent = false;
  let killAttempted = false;
  let killSent = false;
  let rediscoveryCount = 0;
  let unprovenCount = 0;
  let survivorCount = 0;
  let rootRuntimeTitleClass;
  let rootOwnerTokenObserved = false;
  let tokenCorroboratedProcessCount = 0;
  let unknownProcessGroupMemberCount = 0;
  const eventCodes = [];
  const retainedIdentities = new Map();
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutByteLength = 0;
  let stderrByteLength = 0;
  let resolveSpawn;
  let resolveExit;
  let resolveClose;
  let resolveAbort;
  let operationTimeoutHandle;
  const spawnPromise = new Promise((resolvePromise) => {
    resolveSpawn = resolvePromise;
  });
  const exitPromise = new Promise((resolvePromise) => {
    resolveExit = resolvePromise;
  });
  const closePromise = new Promise((resolvePromise) => {
    resolveClose = resolvePromise;
  });
  const abortPromise = new Promise((resolvePromise) => {
    resolveAbort = resolvePromise;
  });
  const requestAbort = (trigger) => {
    if (failureTrigger !== "none") return;
    failureTrigger = trigger;
    eventCodes.push(trigger);
    resolveAbort(trigger);
  };
  const retainChunk = (target, kind, chunk) => {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const limit = kind === "stdout"
      ? descriptor.outputPolicy.stdoutMaxBytes
      : descriptor.outputPolicy.stderrMaxBytes;
    const current = kind === "stdout" ? stdoutByteLength : stderrByteLength;
    const remaining = Math.max(0, limit - current);
    if (remaining > 0) {
      target.push(bytes.subarray(0, Math.min(bytes.byteLength, remaining)));
    }
    const next = Math.min(limit + 1, current + bytes.byteLength);
    if (kind === "stdout") {
      stdoutByteLength = next;
      if (next > limit) {
        stdoutOverflow = true;
        requestAbort("stdout-overflow");
      }
    } else {
      stderrByteLength = next;
      if (next > limit) {
        stderrOverflow = true;
        requestAbort("stderr-overflow");
      }
    }
  };
  operationTimeoutHandle = setTimeout(() => {
    if (closeObserved) return;
    timedOut = true;
    requestAbort("timeout");
  }, descriptor.timeoutMs);
  try {
    try {
      child = spawn(nodePath, [npmCliPath, ...npmArguments], {
        cwd: join(
          staticObservation.repositoryObservation.repositoryRoot,
          state.provisionRootRelativePath,
          "install"
        ),
        detached: true,
        env: childEnvironment,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
    } catch {
      spawnError = true;
      failureTrigger = "spawn-error";
      eventCodes.push("spawn-error");
      resolveSpawn(false);
      resolveExit();
      resolveClose();
    }
  } finally {
    wipeChildEnvironment(childEnvironment);
    childEnvironment = undefined;
  }
  if (child) {
    child.once("spawn", () => {
      spawned = true;
      eventCodes.push("spawn");
      resolveSpawn(true);
    });
    child.once("exit", (code, signal) => {
      exitObserved = true;
      exitCode = Number.isInteger(code) ? code : null;
      exitSignal = typeof signal === "string" ? signal : null;
      eventCodes.push("exit");
      resolveExit();
    });
    child.once("close", (code, signal) => {
      closeObserved = true;
      if (!exitObserved) {
        exitObserved = true;
        exitCode = Number.isInteger(code) ? code : null;
        exitSignal = typeof signal === "string" ? signal : null;
        resolveExit();
      }
      eventCodes.push("close");
      resolveClose();
    });
    child.once("error", () => {
      spawnError = true;
      if (!spawned) {
        failureTrigger = "spawn-error";
        eventCodes.push("spawn-error");
        resolveSpawn(false);
        resolveExit();
        resolveClose();
      } else {
        requestAbort("spawn-error");
      }
    });
    if (!child.stdout || !child.stderr) {
      requestAbort("stream-missing");
    } else {
      child.stdout.on("data", (chunk) =>
        retainChunk(stdoutChunks, "stdout", chunk)
      );
      child.stderr.on("data", (chunk) =>
        retainChunk(stderrChunks, "stderr", chunk)
      );
      child.stdout.once("error", () => requestAbort("stdout-stream-error"));
      child.stderr.once("error", () => requestAbort("stderr-stream-error"));
    }
  }
  const spawnAccepted = await Promise.race([
    spawnPromise,
    waitMilliseconds(3000).then(() => false)
  ]);
  if (!spawnAccepted || !child || !Number.isSafeInteger(child.pid)) {
    requestAbort("spawn-unestablished");
  }
  if (spawnAccepted && child) {
    for (
      let attempt = 0;
      attempt < descriptor.signalPolicy.identityEstablishmentAttempts;
      attempt += 1
    ) {
      if (
        exitObserved
        || closeObserved
        || timedOut
        || failureTrigger !== "none"
      ) break;
      let processSnapshot;
      let tokenSnapshot;
      let snapshot;
      try {
        tokenSnapshot = await collectOwnedTokenSnapshot(
          liveHomeProof,
          state,
          ownerToken,
          staticObservation,
          operationDeadlineNanoseconds
        );
        if (
          exitObserved
          || closeObserved
          || timedOut
          || failureTrigger !== "none"
        ) break;
        processSnapshot = await collectOwnedProcessSnapshot(
          liveHomeProof,
          state,
          ownerToken,
          staticObservation,
          operationDeadlineNanoseconds
        );
        if (
          exitObserved
          || closeObserved
          || timedOut
          || failureTrigger !== "none"
        ) break;
        const rootTuple = observedRootRuntimeTuple(
          processSnapshot.rows,
          child.pid,
          nodePath,
          npmCliPath,
          npmArguments,
          npmProcessTitle
        );
        if (!rootTuple) continue;
        snapshot = combineOwnedAuditSnapshots(
          processSnapshot,
          tokenSnapshot,
          staticObservation
        );
        processSnapshot = undefined;
        tokenSnapshot = undefined;
        const discovered = discoverOwnedTree(
          snapshot,
          child.pid,
          nodePath,
          npmCliPath,
          npmArguments,
          npmProcessTitle
        );
        rediscoveryCount += 1;
        unprovenCount = Math.max(unprovenCount, discovered.unprovenCount);
        unknownProcessGroupMemberCount = Math.max(
          unknownProcessGroupMemberCount,
          discovered.unknownProcessGroupMemberCount
        );
        tokenCorroboratedProcessCount = Math.max(
          tokenCorroboratedProcessCount,
          discovered.tokenCorroboratedProcessCount
        );
        rootOwnerTokenObserved ||= discovered.rootOwnerTokenObserved;
        if (discovered.rootEstablished && discovered.unprovenCount === 0) {
          mergeOwnedTreeIdentities(retainedIdentities, discovered.identities);
          rootRuntimeTitleClass = discovered.rootRuntimeTitleClass;
          identityEstablished = true;
          eventCodes.push("identity-established");
          break;
        }
      } catch {
        if (PROCESS_HRTIME_BIGINT() >= operationDeadlineNanoseconds) {
          timedOut = true;
          requestAbort("timeout");
        } else {
          requestAbort("identity-audit-failed");
        }
        break;
      } finally {
        clearOwnedProcessSnapshot(processSnapshot);
        clearOwnedTokenSnapshot(tokenSnapshot);
        clearOwnedAuditSnapshot(snapshot);
      }
      await Promise.race([
        exitPromise,
        waitMilliseconds(
          descriptor.signalPolicy.identityEstablishmentPollIntervalMs
        )
      ]);
    }
  }
  if (!identityEstablished) {
    if (!closeObserved && child) {
      survivorCount = 1;
      detachUnreapedOwnedChild(child);
      eventCodes.push("safety-unestablished");
    }
    if (failureTrigger === "none") failureTrigger = "identity-unestablished";
  } else {
    await Promise.race([closePromise, abortPromise]);
    if (!closeObserved && failureTrigger !== "none") {
      let snapshot;
      try {
        snapshot = await collectOwnedAuditSnapshotPair(
          liveHomeProof,
          state,
          ownerToken,
          staticObservation
        );
        const discovered = discoverOwnedTree(
          snapshot,
          child.pid,
          nodePath,
          npmCliPath,
          npmArguments,
          npmProcessTitle
        );
        mergeOwnedTreeIdentities(retainedIdentities, discovered.identities);
        rediscoveryCount += 1;
        const revalidated = revalidateOwnedTree(
          retainedIdentities,
          snapshot,
          nodePath,
          npmCliPath,
          npmArguments,
          npmProcessTitle,
          child.pid
        );
        unprovenCount = Math.max(
          unprovenCount,
          discovered.unprovenCount,
          revalidated.unprovenCount
        );
        unknownProcessGroupMemberCount = Math.max(
          unknownProcessGroupMemberCount,
          discovered.unknownProcessGroupMemberCount,
          revalidated.unknownProcessGroupMemberCount
        );
        tokenCorroboratedProcessCount = Math.max(
          tokenCorroboratedProcessCount,
          discovered.tokenCorroboratedProcessCount,
          revalidated.tokenCorroboratedProcessCount
        );
        rootOwnerTokenObserved ||= (
          discovered.rootOwnerTokenObserved
          || revalidated.rootOwnerTokenObserved
        );
        if (
          revalidated.mismatchCount === 0
          && revalidated.unprovenCount === 0
          && revalidated.live.length > 0
          && !exitObserved
          && !closeObserved
        ) {
          identityRevalidatedBeforeTerm = true;
          termAttempted = true;
          eventCodes.push("pre-term");
          const term = signalRevalidatedOwnedTree(
            revalidated.live,
            "SIGTERM",
            child,
            child.pid
          );
          termSent = term.sentCount > 0;
          if (term.failureCount > 0) requestAbort("term-signal-failed");
        } else {
          requestAbort("term-safety-unestablished");
        }
      } catch {
        requestAbort("term-audit-failed");
      }
      clearOwnedAuditSnapshot(snapshot);
      snapshot = undefined;
      for (
        let attempt = 0;
        termSent
          && !closeObserved
          && attempt < descriptor.signalPolicy.termPollAttempts;
        attempt += 1
      ) {
        await Promise.race([
          closePromise,
          waitMilliseconds(descriptor.signalPolicy.pollIntervalMs)
        ]);
      }
      let postTermTreeTerminal = false;
      let postTermTreeUncertain = false;
      if (termSent) {
        try {
          snapshot = await collectOwnedAuditSnapshotPair(
            liveHomeProof,
            state,
            ownerToken,
            staticObservation
          );
          const rootTuple = observedRootRuntimeTuple(
            snapshot.rows,
            child.pid,
            nodePath,
            npmCliPath,
            npmArguments,
            npmProcessTitle
          );
          const discovered = rootTuple
            ? discoverOwnedTree(
              snapshot,
              child.pid,
              nodePath,
              npmCliPath,
              npmArguments,
              npmProcessTitle
            )
            : undefined;
          if (discovered) {
            mergeOwnedTreeIdentities(
              retainedIdentities,
              discovered.identities
            );
          }
          rediscoveryCount += 1;
          const revalidated = revalidateOwnedTree(
            retainedIdentities,
            snapshot,
            nodePath,
            npmCliPath,
            npmArguments,
            npmProcessTitle,
            child.pid
          );
          unprovenCount = Math.max(
            unprovenCount,
            discovered?.unprovenCount ?? 0,
            revalidated.unprovenCount
          );
          unknownProcessGroupMemberCount = Math.max(
            unknownProcessGroupMemberCount,
            discovered?.unknownProcessGroupMemberCount ?? 0,
            revalidated.unknownProcessGroupMemberCount
          );
          tokenCorroboratedProcessCount = Math.max(
            tokenCorroboratedProcessCount,
            discovered?.tokenCorroboratedProcessCount ?? 0,
            revalidated.tokenCorroboratedProcessCount
          );
          rootOwnerTokenObserved ||= (
            (discovered?.rootOwnerTokenObserved ?? false)
            || revalidated.rootOwnerTokenObserved
          );
          if (
            revalidated.mismatchCount === 0
            && revalidated.unprovenCount === 0
          ) {
            if (revalidated.live.length === 0) {
              postTermTreeTerminal = true;
            } else {
              identityRevalidatedBeforeKill = true;
              killAttempted = true;
              eventCodes.push("pre-kill");
              const kill = signalRevalidatedOwnedTree(
                revalidated.live,
                "SIGKILL",
                child,
                child.pid
              );
              killSent = kill.sentCount > 0;
              if (kill.failureCount > 0 || !killSent) {
                postTermTreeUncertain = true;
                requestAbort("kill-signal-failed");
              }
            }
          } else {
            postTermTreeUncertain = true;
            requestAbort("kill-safety-unestablished");
          }
        } catch {
          postTermTreeUncertain = true;
          requestAbort("kill-audit-failed");
        }
        clearOwnedAuditSnapshot(snapshot);
        snapshot = undefined;
      }
      for (
        let attempt = 0;
        termSent
          && !postTermTreeTerminal
          && attempt < descriptor.signalPolicy.killPollAttempts;
        attempt += 1
      ) {
        await waitMilliseconds(
          descriptor.signalPolicy.pollIntervalMs,
          true
        );
        let pollSnapshot;
        try {
          pollSnapshot = await collectOwnedAuditSnapshotPair(
            liveHomeProof,
            state,
            ownerToken,
            staticObservation
          );
          rediscoveryCount += 1;
          const revalidated = revalidateOwnedTree(
            retainedIdentities,
            pollSnapshot,
            nodePath,
            npmCliPath,
            npmArguments,
            npmProcessTitle,
            child.pid
          );
          unprovenCount = Math.max(
            unprovenCount,
            revalidated.unprovenCount
          );
          unknownProcessGroupMemberCount = Math.max(
            unknownProcessGroupMemberCount,
            revalidated.unknownProcessGroupMemberCount
          );
          tokenCorroboratedProcessCount = Math.max(
            tokenCorroboratedProcessCount,
            revalidated.tokenCorroboratedProcessCount
          );
          rootOwnerTokenObserved ||= revalidated.rootOwnerTokenObserved;
          if (
            revalidated.mismatchCount !== 0
            || revalidated.unprovenCount !== 0
          ) {
            postTermTreeUncertain = true;
          } else if (revalidated.live.length === 0) {
            postTermTreeTerminal = true;
            postTermTreeUncertain = false;
          }
        } catch {
          postTermTreeUncertain = true;
          break;
        } finally {
          clearOwnedAuditSnapshot(pollSnapshot);
        }
      }
      if (exitObserved && !closeObserved) {
        await Promise.race([
          closePromise,
          waitMilliseconds(descriptor.signalPolicy.handleCloseTimeoutMs)
        ]);
      }
      if (
        !closeObserved
        || postTermTreeUncertain
        || (termSent && !postTermTreeTerminal)
      ) {
        survivorCount = Math.max(1, retainedIdentities.size, unprovenCount);
        detachUnreapedOwnedChild(child);
        eventCodes.push("final-survivor");
      }
    }
  }
  if (operationTimeoutHandle !== undefined) {
    clearTimeout(operationTimeoutHandle);
    operationTimeoutHandle = undefined;
  }
  const stdout = Buffer.concat(stdoutChunks);
  const stderr = Buffer.concat(stderrChunks);
  for (const chunk of stdoutChunks) chunk.fill(0);
  for (const chunk of stderrChunks) chunk.fill(0);
  stdoutChunks.length = 0;
  stderrChunks.length = 0;
  let lifecycleCode;
  if (!identityEstablished) lifecycleCode = "safety-unestablished";
  else if (survivorCount > 0) lifecycleCode = "survivor-after-kill";
  else if (killSent) lifecycleCode = "reaped-after-kill";
  else if (termSent) lifecycleCode = "reaped-after-term";
  else if (timedOut) lifecycleCode = "timed-out";
  else if (exitSignal !== null) lifecycleCode = "exit-signaled";
  else if (exitCode === 0) lifecycleCode = "exit-zero";
  else lifecycleCode = "exit-nonzero";
  return {
    abortAuthorityEstablished: identityEstablished,
    closeObserved,
    eventCodes: OBJECT_FREEZE([...eventCodes]),
    exitCode,
    exitObserved,
    exitSignal,
    failureTrigger,
    identityEstablished,
    identityRevalidatedBeforeKill,
    identityRevalidatedBeforeTerm,
    killAttempted,
    killSent,
    lifecycleCode,
    rediscoveryCount,
    rootIdentityBasis: "trusted-spawn-handle-structural-v1",
    rootOwnerTokenObserved,
    rootPid: child?.pid,
    rootRuntimeTitleClass,
    spawnError,
    spawnOccurred: spawned,
    stderr,
    stderrByteLength,
    stderrOverflow,
    stdout,
    stdoutByteLength,
    stdoutOverflow,
    survivorCount,
    termAttempted,
    termSent,
    timedOut,
    tokenCorroboratedProcessCount,
    unknownProcessGroupMemberCount,
    unprovenCount
  };
}

function cacheVerifyDescriptor() {
  const commandId = "owner.dependency.npm.cache-verify";
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorFingerprint =
    ownedProcessDescriptorFingerprintEntryById.get(commandId)
      ?.descriptorFingerprint;
  if (
    !descriptor
    || !descriptorFingerprint
    || descriptor.argvTemplate.length !== 3
    || descriptor.argvTemplate[0].kind !== "validated-binding"
    || descriptor.argvTemplate[0].name !== "npm-cli"
    || descriptor.argvTemplate[1].kind !== "literal"
    || descriptor.argvTemplate[1].value !== "cache"
    || descriptor.argvTemplate[2].kind !== "literal"
    || descriptor.argvTemplate[2].value !== "verify"
    || descriptor.executableBinding.kind !== "launcher-node-runtime"
    || descriptor.cwdBinding.kind !== "initial-provision-install-root"
    || descriptor.environmentBinding !== "provision-attempt-initial"
    || descriptor.execution !== "finite-owned-process"
    || descriptor.processTreeOwned !== true
    || descriptor.outputPolicy.kind !== "buffered-parse-and-sanitized-log"
    || descriptor.outputPolicy.stdoutMaxBytes !== 67108864
    || descriptor.outputPolicy.stderrMaxBytes !== 67108864
    || descriptor.outputPolicy.retainedLogMaxBytes !== 524288
    || descriptor.signalPolicy.kind
      !== "identity-revalidated-owned-tree-term-kill"
    || descriptor.timeoutMs !== 180000
  ) {
    attemptOperationFailure();
  }
  return { commandId, descriptor, descriptorFingerprint };
}

function ciPreferOfflineDescriptor() {
  const commandId = "owner.dependency.npm.ci-prefer-offline";
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorFingerprint =
    ownedProcessDescriptorFingerprintEntryById.get(commandId)
      ?.descriptorFingerprint;
  const expectedArguments = [
    "ci",
    "--prefer-offline",
    "--no-audit",
    "--no-fund",
    "--ignore-scripts"
  ];
  if (
    !descriptor
    || !descriptorFingerprint
    || descriptor.argvTemplate.length !== expectedArguments.length + 1
    || descriptor.argvTemplate[0].kind !== "validated-binding"
    || descriptor.argvTemplate[0].name !== "npm-cli"
    || expectedArguments.some((value, index) =>
      descriptor.argvTemplate[index + 1]?.kind !== "literal"
      || descriptor.argvTemplate[index + 1]?.value !== value
    )
    || descriptor.executableBinding.kind !== "launcher-node-runtime"
    || descriptor.cwdBinding.kind !== "initial-provision-install-root"
    || descriptor.environmentBinding !== "provision-attempt-initial"
    || descriptor.execution !== "finite-owned-process"
    || descriptor.processTreeOwned !== true
    || descriptor.outputPolicy.kind !== "buffered-parse-and-sanitized-log"
    || descriptor.outputPolicy.stdoutMaxBytes !== 67108864
    || descriptor.outputPolicy.stderrMaxBytes !== 67108864
    || descriptor.outputPolicy.retainedLogMaxBytes !== 524288
    || descriptor.signalPolicy.kind
      !== "identity-revalidated-owned-tree-term-kill"
    || descriptor.timeoutMs !== 2700000
  ) {
    attemptOperationFailure();
  }
  return {
    commandId,
    descriptor,
    descriptorFingerprint,
    npmArguments: Object.freeze(expectedArguments)
  };
}

function npmLsProvisionStagedDescriptor() {
  const commandId = "owner.dependency.npm.ls-provision-staged";
  const descriptor = ownedProcessDescriptorById.get(commandId);
  const descriptorFingerprint =
    ownedProcessDescriptorFingerprintEntryById.get(commandId)
      ?.descriptorFingerprint;
  const expectedArguments = ["ls", "--all", "--json"];
  if (
    !descriptor
    || !descriptorFingerprint
    || descriptor.argvTemplate.length !== expectedArguments.length + 1
    || descriptor.argvTemplate[0].kind !== "validated-binding"
    || descriptor.argvTemplate[0].name !== "npm-cli"
    || expectedArguments.some((value, index) =>
      descriptor.argvTemplate[index + 1]?.kind !== "literal"
      || descriptor.argvTemplate[index + 1]?.value !== value
    )
    || descriptor.executableBinding.kind !== "launcher-node-runtime"
    || descriptor.cwdBinding.kind !== "initial-provision-install-root"
    || descriptor.environmentBinding !== "provision-attempt-initial"
    || descriptor.execution !== "finite-owned-process"
    || descriptor.processTreeOwned !== true
    || descriptor.outputPolicy.kind !== "buffered-parse-and-sanitized-log"
    || descriptor.outputPolicy.stdoutMaxBytes !== 67108864
    || descriptor.outputPolicy.stderrMaxBytes !== 67108864
    || descriptor.outputPolicy.retainedLogMaxBytes !== 524288
    || descriptor.signalPolicy.kind
      !== "identity-revalidated-owned-tree-term-kill"
    || descriptor.timeoutMs !== 300000
  ) {
    attemptOperationFailure();
  }
  return {
    commandId,
    descriptor,
    descriptorFingerprint,
    npmArguments: Object.freeze(expectedArguments)
  };
}

function readInitialInstallPackageIdentity(
  paths,
  state,
  repositoryObservation
) {
  const expected = state.layout?.fileBindings?.installPackage;
  if (!expected) attemptOperationFailure();
  const observation = revalidateInitialLayoutFile(
    join(paths.install, "package.json"),
    "installPackage",
    expected,
    repositoryObservation,
    0o600n
  );
  try {
    const manifest = parseStrictJsonObject(observation.bytes);
    const name = ownRecordValue(manifest, "name");
    const version = ownRecordValue(manifest, "version");
    if (!name.present || !version.present) attemptOperationFailure();
    assertNpmPackageName(name.value);
    if (
      typeof version.value !== "string"
      || !REFLECT_APPLY(REGEXP_TEST, NPM_VERSION_PATTERN, [version.value])
    ) {
      attemptOperationFailure();
    }
    return { name: name.value, version: version.value };
  } catch (error) {
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  } finally {
    observation.bytes.fill(0);
  }
}

function npmLsRecordHasOnlyKeys(record, requiredKeys, optionalKeys = []) {
  if (
    record === null
    || typeof record !== "object"
    || ARRAY_IS_ARRAY(record)
    || OBJECT_GET_PROTOTYPE_OF(record) !== null
  ) {
    attemptOperationFailure();
  }
  const required = new Set(requiredKeys);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const keys = REFLECT_OWN_KEYS(record);
  if (keys.length < required.size || keys.length > allowed.size) {
    attemptOperationFailure();
  }
  for (const key of keys) {
    if (typeof key !== "string" || !allowed.has(key)) {
      attemptOperationFailure();
    }
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, key);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")) {
      attemptOperationFailure();
    }
    required.delete(key);
  }
  if (required.size !== 0) attemptOperationFailure();
}

function compareNpmLsAncestry(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareCodeUnits(left[index], right[index]);
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
}

function parseNpmLsProvisionStagedTree(
  exactBytes,
  expectedRootName,
  expectedRootVersion
) {
  let parsed;
  try {
    parsed = parseStrictJsonObject(exactBytes);
    npmLsRecordHasOnlyKeys(parsed, ["name", "version", "dependencies"]);
    const rootName = ownRecordValue(parsed, "name").value;
    const rootVersion = ownRecordValue(parsed, "version").value;
    const rootDependencies = ownRecordValue(parsed, "dependencies").value;
    assertNpmPackageName(rootName);
    if (
      rootName !== expectedRootName
      || rootVersion !== expectedRootVersion
      || typeof rootVersion !== "string"
      || !REFLECT_APPLY(REGEXP_TEST, NPM_VERSION_PATTERN, [rootVersion])
      || rootDependencies === null
      || typeof rootDependencies !== "object"
      || ARRAY_IS_ARRAY(rootDependencies)
      || OBJECT_GET_PROTOTYPE_OF(rootDependencies) !== null
    ) {
      attemptOperationFailure();
    }

    const nodes = [];
    let dependencyNodeCount = 0;
    let maximumDependencyDepth = 0;
    const visitDependencies = (dependencies, ancestry, depth) => {
      if (depth > 64) attemptOperationFailure();
      for (const packageName of REFLECT_OWN_KEYS(dependencies)) {
        if (typeof packageName !== "string") attemptOperationFailure();
        assertNpmPackageName(packageName);
        const member = ownRecordValue(dependencies, packageName);
        if (!member.present) attemptOperationFailure();
        const node = member.value;
        const rawNodeKeys = REFLECT_OWN_KEYS(node);
        const unmaterializedOptional = rawNodeKeys.length === 0;
        if (unmaterializedOptional) {
          npmLsRecordHasOnlyKeys(node, []);
        } else {
          npmLsRecordHasOnlyKeys(
            node,
            ["version"],
            ["resolved", "overridden", "dependencies"]
          );
        }
        const version = unmaterializedOptional
          ? { value: null }
          : ownRecordValue(node, "version");
        const resolved = unmaterializedOptional
          ? { present: false, value: undefined }
          : ownRecordValue(node, "resolved");
        const overridden = unmaterializedOptional
          ? { present: false, value: undefined }
          : ownRecordValue(node, "overridden");
        const nested = unmaterializedOptional
          ? { present: false, value: undefined }
          : ownRecordValue(node, "dependencies");
        if (!unmaterializedOptional) {
          if (
            typeof version.value !== "string"
            || !REFLECT_APPLY(
              REGEXP_TEST,
              NPM_VERSION_PATTERN,
              [version.value]
            )
            || (
              resolved.present
              && (
                typeof resolved.value !== "string"
                || !REFLECT_APPLY(
                  REGEXP_TEST,
                  NPM_REGISTRY_RESOLVED_PATTERN,
                  [resolved.value]
                )
              )
            )
            || (overridden.present && typeof overridden.value !== "boolean")
          ) {
            attemptOperationFailure();
          }
          if (
            nested.present
            && (
              nested.value === null
              || typeof nested.value !== "object"
              || ARRAY_IS_ARRAY(nested.value)
              || OBJECT_GET_PROTOTYPE_OF(nested.value) !== null
            )
          ) {
            attemptOperationFailure();
          }
        }
        dependencyNodeCount += 1;
        if (dependencyNodeCount > 100000) attemptOperationFailure();
        maximumDependencyDepth = Math.max(maximumDependencyDepth, depth);
        const nodeAncestry = OBJECT_FREEZE([...ancestry, packageName]);
        REFLECT_APPLY(ARRAY_PUSH, nodes, [nullRecord([
          [
            "representation",
            unmaterializedOptional
              ? "unmaterialized-optional"
              : "materialized"
          ],
          ["ancestry", nodeAncestry],
          ["packageName", packageName],
          ["version", version.value],
          ["resolved", resolved.present ? resolved.value : null],
          ["overridden", overridden.present ? overridden.value : null]
        ])]);
        if (nested.present) {
          visitDependencies(nested.value, nodeAncestry, depth + 1);
        }
      }
    };
    visitDependencies(rootDependencies, OBJECT_FREEZE([]), 1);
    nodes.sort((left, right) =>
      compareNpmLsAncestry(left.ancestry, right.ancestry)
    );
    const normalized = nullRecord([
      ["schemaVersion", 1],
      ["rootName", rootName],
      ["rootVersion", rootVersion],
      ["dependencyNodeCount", dependencyNodeCount],
      ["maximumDependencyDepth", maximumDependencyDepth],
      ["nodes", OBJECT_FREEZE(nodes)]
    ]);
    return {
      dependencyNodeCount,
      fingerprint: hashCanonicalProof(NPM_LS_DEPENDENCY_TREE_DOMAIN, normalized),
      maximumDependencyDepth
    };
  } catch (error) {
    parsed = undefined;
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  }
}

{
  const validProjection = Buffer.from(
    "{\"name\":\"fixture-root\",\"version\":\"1.0.0\",\"dependencies\":{\"materialized\":{\"version\":\"2.0.0\",\"overridden\":false,\"dependencies\":{\"nested-optional\":{}}},\"optional-platform\":{}}}",
    "utf8"
  );
  const accepted = parseNpmLsProvisionStagedTree(
    validProjection,
    "fixture-root",
    "1.0.0"
  );
  validProjection.fill(0);
  if (
    accepted.dependencyNodeCount !== 3
    || accepted.maximumDependencyDepth !== 2
    || !isLowerHex64(accepted.fingerprint)
  ) {
    staticBindingFailure();
  }
  const materializedProjection = Buffer.from(
    "{\"name\":\"fixture-root\",\"version\":\"1.0.0\",\"dependencies\":{\"optional-platform\":{\"version\":\"2.0.0\"}}}",
    "utf8"
  );
  const materialized = parseNpmLsProvisionStagedTree(
    materializedProjection,
    "fixture-root",
    "1.0.0"
  );
  materializedProjection.fill(0);
  const unmaterializedProjection = Buffer.from(
    "{\"name\":\"fixture-root\",\"version\":\"1.0.0\",\"dependencies\":{\"optional-platform\":{}}}",
    "utf8"
  );
  const unmaterialized = parseNpmLsProvisionStagedTree(
    unmaterializedProjection,
    "fixture-root",
    "1.0.0"
  );
  unmaterializedProjection.fill(0);
  if (materialized.fingerprint === unmaterialized.fingerprint) {
    staticBindingFailure();
  }
  const assertRejectedNpmLsNode = (nodeJson) => {
    const rejectedProjection = Buffer.from(
      `{\"name\":\"fixture-root\",\"version\":\"1.0.0\",\"dependencies\":{\"forbidden\":${nodeJson}}}`,
      "utf8"
    );
    let rejected = false;
    try {
      parseNpmLsProvisionStagedTree(
        rejectedProjection,
        "fixture-root",
        "1.0.0"
      );
    } catch (error) {
      rejected = error?.message
        === "Required-browser initial provision owned operation rejected.";
    } finally {
      rejectedProjection.fill(0);
    }
    if (!rejected) staticBindingFailure();
  };
  for (const forbiddenFlag of [
    "dev",
    "optional",
    "devOptional",
    "peer",
    "peerOptional",
    "bundled"
  ]) {
    assertRejectedNpmLsNode(`{\"version\":\"2.0.0\",\"${forbiddenFlag}\":true}`);
  }
  for (const forbiddenField of [
    "problems",
    "error",
    "missing",
    "required",
    "invalid",
    "extraneous",
    "deduped",
    "link",
    "path",
    "name"
  ]) {
    assertRejectedNpmLsNode(`{\"version\":\"2.0.0\",\"${forbiddenField}\":true}`);
  }
  assertRejectedNpmLsNode("{\"dependencies\":{}}");
}

function retainedAttemptComponentReceipt(domain, entries) {
  const receipt = nullRecord(entries);
  attemptOperationReceiptMembership.add(receipt);
  return {
    fingerprint: hashCanonicalProof(domain, receipt),
    receipt
  };
}

function acceptedCacheVerifyLink(
  state,
  paths,
  repositoryObservation,
  verifyCacheInventory = true
) {
  const commandId = "owner.dependency.npm.cache-verify";
  const result = state.operationResults?.get(commandId);
  const retained = state.operationReceipts?.get(commandId);
  const closure = retained?.closure;
  if (
    !result
    || !retained
    || !closure
    || REFLECT_OWN_KEYS(closure).join(",")
      !== "launch,audit,lifecycleAudit,outcome,command"
  ) {
    attemptOperationFailure();
  }
  const { launch, audit, lifecycleAudit, outcome, command } = closure;
  for (const receipt of [launch, audit, lifecycleAudit, outcome, command]) {
    if (!attemptOperationReceiptMembership.has(receipt)) {
      attemptOperationFailure();
    }
  }
  const launchReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    launch
  );
  const auditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    audit
  );
  const lifecycleAuditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    lifecycleAudit
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_CACHE_VERIFY_RESULT_DOMAIN,
    result
  );
  const outcomeReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    outcome
  );
  const commandReceiptFingerprint = hashCanonicalProof(
    NPM_CACHE_VERIFY_RECEIPT_DOMAIN,
    command
  );
  if (
    retained.resultFingerprint !== resultFingerprint
    || retained.commandReceiptFingerprint !== commandReceiptFingerprint
    || result.commandId !== commandId
    || result.attemptId !== state.attemptId
    || result.mode !== "initial"
    || result.outcome !== "PASS"
    || result.state !== "cache-verified"
    || result.signalAuthority !== false
    || launch.commandId !== commandId
    || launch.attemptId !== state.attemptId
    || audit.commandId !== commandId
    || audit.launchReceiptFingerprint !== launchReceiptFingerprint
    || lifecycleAudit.commandId !== commandId
    || lifecycleAudit.launchReceiptFingerprint !== launchReceiptFingerprint
    || outcome.commandId !== commandId
    || outcome.launchReceiptFingerprint !== launchReceiptFingerprint
    || outcome.auditReceiptFingerprint !== auditReceiptFingerprint
    || outcome.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || outcome.resultFingerprint !== resultFingerprint
    || outcome.outcome !== "PASS"
    || outcome.rejectionCode !== "none"
    || command.commandId !== commandId
    || command.attemptId !== state.attemptId
    || command.mode !== "initial"
    || command.attemptAuthorityBindingFingerprint
      !== state.attemptAuthorityBindingFingerprint
    || command.layoutBindingFingerprint !== state.layout.layoutBindingFingerprint
    || command.launchReceiptFingerprint !== launchReceiptFingerprint
    || command.auditReceiptFingerprint !== auditReceiptFingerprint
    || command.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || command.outcomeReceiptFingerprint !== outcomeReceiptFingerprint
    || command.resultFingerprint !== resultFingerprint
    || command.outcome !== "PASS"
    || command.state !== "cache-verified"
    || command.signalAuthority !== false
  ) {
    attemptOperationFailure();
  }
  const logPath = join(paths.logs, "npm-cache-verify.log");
  const log = observeRegularFile(
    logPath,
    "npmCacheVerifySanitizedLog",
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    524288,
    true
  );
  let payload;
  try {
    payload = parseStrictJsonObject(log.bytes);
  } catch {
    log.bytes.fill(0);
    attemptOperationFailure();
  }
  const canonicalText = canonicalizeClosedJson(payload);
  const matches = (
    Buffer.from(log.bytes).toString("utf8") === canonicalText
    && (log.entry.mode & 0o7777n) === 0o600n
    && log.identityFingerprint === audit.sanitizedLogIdentityFingerprint
    && log.rawByteSha256 === audit.sanitizedLogSha256
    && hashCanonicalProof(NPM_CACHE_VERIFY_SANITIZED_LOG_DOMAIN, payload)
      === audit.sanitizedLogFingerprint
    && payload.commandId === commandId
    && payload.attemptId === state.attemptId
    && payload.outcome === "PASS"
    && payload.state === "cache-verified"
  );
  log.bytes.fill(0);
  if (!matches) attemptOperationFailure();
  if (verifyCacheInventory) {
    const cacheInventory = inventoryInitialNpmCache(
      paths,
      state,
      repositoryObservation
    );
    if (cacheInventory.fingerprint !== result.cacheInventoryFingerprint) {
      attemptOperationFailure();
    }
  }
  return {
    commandReceiptFingerprint,
    resultFingerprint
  };
}

function acceptedCiPreferOfflineLink(
  state,
  paths,
  repositoryObservation,
  cacheVerifyLink
) {
  const commandId = "owner.dependency.npm.ci-prefer-offline";
  const result = state.operationResults?.get(commandId);
  const retained = state.operationReceipts?.get(commandId);
  const closure = retained?.closure;
  if (
    !result
    || !retained
    || !closure
    || REFLECT_OWN_KEYS(result).join(",")
      !== "schemaVersion,attemptId,mode,commandId,outcome,stagedNodeModulesInventoryFingerprint,stdoutByteLength,stdoutSha256,stderrByteLength,stderrSha256,state,signalAuthority"
    || REFLECT_OWN_KEYS(closure).join(",")
      !== "launch,audit,lifecycleAudit,outcome,command"
  ) {
    attemptOperationFailure();
  }
  const { launch, audit, lifecycleAudit, outcome, command } = closure;
  for (const receipt of [launch, audit, lifecycleAudit, outcome, command]) {
    if (!attemptOperationReceiptMembership.has(receipt)) {
      attemptOperationFailure();
    }
  }
  const operation = ciPreferOfflineDescriptor();
  const launchReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    launch
  );
  const auditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    audit
  );
  const lifecycleAuditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    lifecycleAudit
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_CI_PREFER_OFFLINE_RESULT_DOMAIN,
    result
  );
  const outcomeReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    outcome
  );
  const commandReceiptFingerprint = hashCanonicalProof(
    NPM_CI_PREFER_OFFLINE_RECEIPT_DOMAIN,
    command
  );
  if (
    retained.resultFingerprint !== resultFingerprint
    || retained.commandReceiptFingerprint !== commandReceiptFingerprint
    || result.schemaVersion !== 1
    || result.commandId !== commandId
    || result.attemptId !== state.attemptId
    || result.mode !== "initial"
    || result.outcome !== "PASS"
    || result.state !== "dependencies-installed-staged"
    || result.signalAuthority !== false
    || result.stagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || launch.commandId !== commandId
    || launch.attemptId !== state.attemptId
    || launch.descriptorFingerprint !== operation.descriptorFingerprint
    || launch.environmentInventoryFingerprint
      !== state.environmentInventoryFingerprints[commandId]
    || launch.cwdIdentityFingerprint
      !== state.layout.directoryIdentityFingerprints.install
    || launch.nodeExecutableIdentityFingerprint
      !== state.nodeExecutableIdentityFingerprint
    || launch.npmCliPathFingerprint !== state.npmCliPathFingerprint
    || launch.npmCliPhysicalIdentityFingerprint
      !== state.npmCliPhysicalIdentityFingerprint
    || launch.signalPolicyKind
      !== "identity-revalidated-owned-tree-term-kill"
    || launch.spawnOccurred !== true
    || launch.abortAuthorityEstablished !== true
    || audit.commandId !== commandId
    || audit.launchReceiptFingerprint !== launchReceiptFingerprint
    || audit.environmentInventoryFingerprint
      !== launch.environmentInventoryFingerprint
    || audit.cacheVerifyCommandReceiptFingerprint
      !== cacheVerifyLink.commandReceiptFingerprint
    || audit.cacheVerifyResultFingerprint
      !== cacheVerifyLink.resultFingerprint
    || audit.stagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || audit.stagedNodeModulesRootIdentityFingerprint
      !== state.stagedNodeModulesRootIdentityFingerprint
    || audit.violationCode !== "none"
    || audit.violationCount !== 0
    || lifecycleAudit.commandId !== commandId
    || lifecycleAudit.launchReceiptFingerprint !== launchReceiptFingerprint
    || lifecycleAudit.signalPolicyKind
      !== "identity-revalidated-owned-tree-term-kill"
    || lifecycleAudit.lifecycleCode !== "exit-zero"
    || lifecycleAudit.failureTrigger !== "none"
    || lifecycleAudit.spawnOccurred !== true
    || lifecycleAudit.abortAuthorityEstablished !== true
    || lifecycleAudit.identityEstablished !== true
    || lifecycleAudit.unknownProcessGroupMemberCount !== 0
    || lifecycleAudit.termAttempted !== false
    || lifecycleAudit.termSent !== false
    || lifecycleAudit.killAttempted !== false
    || lifecycleAudit.killSent !== false
    || lifecycleAudit.exitCode !== 0
    || lifecycleAudit.exitSignal !== null
    || lifecycleAudit.timedOut !== false
    || lifecycleAudit.stdoutOverflow !== false
    || lifecycleAudit.stderrOverflow !== false
    || lifecycleAudit.unprovenCount !== 0
    || lifecycleAudit.survivorCount !== 0
    || lifecycleAudit.signalAuthority !== false
    || outcome.commandId !== commandId
    || outcome.launchReceiptFingerprint !== launchReceiptFingerprint
    || outcome.auditReceiptFingerprint !== auditReceiptFingerprint
    || outcome.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || outcome.resultFingerprint !== resultFingerprint
    || outcome.outcome !== "PASS"
    || outcome.rejectionCode !== "none"
    || command.commandId !== commandId
    || command.attemptId !== state.attemptId
    || command.mode !== "initial"
    || command.attemptAuthorityBindingFingerprint
      !== state.attemptAuthorityBindingFingerprint
    || command.layoutBindingFingerprint !== state.layout.layoutBindingFingerprint
    || command.cacheVerifyCommandReceiptFingerprint
      !== cacheVerifyLink.commandReceiptFingerprint
    || command.cacheVerifyResultFingerprint
      !== cacheVerifyLink.resultFingerprint
    || command.descriptorFingerprint !== operation.descriptorFingerprint
    || command.environmentInventoryFingerprint
      !== launch.environmentInventoryFingerprint
    || command.cwdIdentityFingerprint !== launch.cwdIdentityFingerprint
    || command.nodeExecutableIdentityFingerprint
      !== launch.nodeExecutableIdentityFingerprint
    || command.npmCliPathFingerprint !== launch.npmCliPathFingerprint
    || command.npmCliPhysicalIdentityFingerprint
      !== launch.npmCliPhysicalIdentityFingerprint
    || command.preOwnedAuditAggregateFingerprint
      !== audit.preOwnedAuditAggregateFingerprint
    || command.launchReceiptFingerprint !== launchReceiptFingerprint
    || command.auditReceiptFingerprint !== auditReceiptFingerprint
    || command.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || command.outcomeReceiptFingerprint !== outcomeReceiptFingerprint
    || command.resultFingerprint !== resultFingerprint
    || command.postOwnedAuditAggregateFingerprint
      !== audit.postOwnedAuditAggregateFingerprint
    || command.outcome !== "PASS"
    || command.state !== "dependencies-installed-staged"
    || command.signalAuthority !== false
  ) {
    attemptOperationFailure();
  }
  const logPath = join(paths.logs, "npm-ci-prefer-offline.log");
  const log = observeRegularFile(
    logPath,
    "npmCiPreferOfflineSanitizedLog",
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    524288,
    true
  );
  let payload;
  try {
    payload = parseStrictJsonObject(log.bytes);
  } catch {
    log.bytes.fill(0);
    attemptOperationFailure();
  }
  const canonicalText = canonicalizeClosedJson(payload);
  const matches = (
    Buffer.from(log.bytes).toString("utf8") === canonicalText
    && (log.entry.mode & 0o7777n) === 0o600n
    && log.identityFingerprint === audit.sanitizedLogIdentityFingerprint
    && log.rawByteSha256 === audit.sanitizedLogSha256
    && hashCanonicalProof(NPM_CI_PREFER_OFFLINE_SANITIZED_LOG_DOMAIN, payload)
      === audit.sanitizedLogFingerprint
    && payload.commandId === commandId
    && payload.attemptId === state.attemptId
    && payload.outcome === "PASS"
    && payload.state === "dependencies-installed-staged"
    && payload.stagedNodeModulesInventoryFingerprint
      === state.stagedNodeModulesInventoryFingerprint
    && payload.stagedNodeModulesRootIdentityFingerprint
      === state.stagedNodeModulesRootIdentityFingerprint
  );
  log.bytes.fill(0);
  if (!matches) attemptOperationFailure();
  return {
    commandReceiptFingerprint,
    resultFingerprint,
    stagedNodeModulesInventoryFingerprint:
      result.stagedNodeModulesInventoryFingerprint,
    stagedNodeModulesRootIdentityFingerprint:
      audit.stagedNodeModulesRootIdentityFingerprint
  };
}

function acceptedNpmLsProvisionStagedLink(
  state,
  paths,
  repositoryObservation,
  cacheVerifyLink,
  ciPreferOfflineLink
) {
  const commandId = "owner.dependency.npm.ls-provision-staged";
  const result = state.operationResults?.get(commandId);
  const retained = state.operationReceipts?.get(commandId);
  const closure = retained?.closure;
  if (
    !result
    || !retained
    || !closure
    || REFLECT_OWN_KEYS(result).join(",")
      !== "schemaVersion,attemptId,mode,commandId,outcome,npmDependencyTreeFingerprint,stagedNodeModulesInventoryFingerprint,stdoutByteLength,stdoutSha256,stderrByteLength,stderrSha256,state,signalAuthority"
    || REFLECT_OWN_KEYS(closure).join(",")
      !== "launch,audit,lifecycleAudit,outcome,command"
  ) {
    attemptOperationFailure();
  }
  const { launch, audit, lifecycleAudit, outcome, command } = closure;
  for (const receipt of [launch, audit, lifecycleAudit, outcome, command]) {
    if (!attemptOperationReceiptMembership.has(receipt)) {
      attemptOperationFailure();
    }
  }
  const operation = npmLsProvisionStagedDescriptor();
  const launchReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    launch
  );
  const auditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    audit
  );
  const lifecycleAuditReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    lifecycleAudit
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_LS_PROVISION_STAGED_RESULT_DOMAIN,
    result
  );
  const outcomeReceiptFingerprint = hashCanonicalProof(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    outcome
  );
  const commandReceiptFingerprint = hashCanonicalProof(
    NPM_LS_PROVISION_STAGED_RECEIPT_DOMAIN,
    command
  );
  if (
    retained.resultFingerprint !== resultFingerprint
    || retained.commandReceiptFingerprint !== commandReceiptFingerprint
    || result.schemaVersion !== 1
    || result.commandId !== commandId
    || result.attemptId !== state.attemptId
    || result.mode !== "initial"
    || result.outcome !== "PASS"
    || result.state !== "dependencies-listed-staged"
    || result.signalAuthority !== false
    || result.npmDependencyTreeFingerprint
      !== state.stagedNpmDependencyTreeFingerprint
    || result.stagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || launch.commandId !== commandId
    || launch.attemptId !== state.attemptId
    || launch.descriptorFingerprint !== operation.descriptorFingerprint
    || launch.environmentInventoryFingerprint
      !== state.environmentInventoryFingerprints[commandId]
    || launch.cwdIdentityFingerprint
      !== state.layout.directoryIdentityFingerprints.install
    || launch.nodeExecutableIdentityFingerprint
      !== state.nodeExecutableIdentityFingerprint
    || launch.npmCliPathFingerprint !== state.npmCliPathFingerprint
    || launch.npmCliPhysicalIdentityFingerprint
      !== state.npmCliPhysicalIdentityFingerprint
    || launch.signalPolicyKind
      !== "identity-revalidated-owned-tree-term-kill"
    || launch.spawnOccurred !== true
    || launch.abortAuthorityEstablished !== true
    || audit.commandId !== commandId
    || audit.launchReceiptFingerprint !== launchReceiptFingerprint
    || audit.preOwnedAuditAggregateFingerprint
      !== command.preOwnedAuditAggregateFingerprint
    || audit.postOwnedAuditAggregateFingerprint
      !== command.postOwnedAuditAggregateFingerprint
    || audit.environmentInventoryFingerprint
      !== launch.environmentInventoryFingerprint
    || audit.cacheVerifyCommandReceiptFingerprint
      !== cacheVerifyLink.commandReceiptFingerprint
    || audit.cacheVerifyResultFingerprint !== cacheVerifyLink.resultFingerprint
    || audit.ciPreferOfflineCommandReceiptFingerprint
      !== ciPreferOfflineLink.commandReceiptFingerprint
    || audit.ciPreferOfflineResultFingerprint
      !== ciPreferOfflineLink.resultFingerprint
    || audit.preNpmCacheInventoryFingerprint
      !== state.postCiCacheInventoryFingerprint
    || audit.postNpmCacheInventoryFingerprint
      !== state.postCiCacheInventoryFingerprint
    || audit.preStagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || audit.postStagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || audit.stagedNodeModulesRootIdentityFingerprint
      !== state.stagedNodeModulesRootIdentityFingerprint
    || audit.npmDependencyTreeFingerprint
      !== state.stagedNpmDependencyTreeFingerprint
    || audit.violationCode !== "none"
    || audit.violationCount !== 0
    || lifecycleAudit.commandId !== commandId
    || lifecycleAudit.launchReceiptFingerprint !== launchReceiptFingerprint
    || lifecycleAudit.signalPolicyKind
      !== "identity-revalidated-owned-tree-term-kill"
    || lifecycleAudit.lifecycleCode !== "exit-zero"
    || lifecycleAudit.failureTrigger !== "none"
    || lifecycleAudit.spawnOccurred !== true
    || lifecycleAudit.abortAuthorityEstablished !== true
    || lifecycleAudit.identityEstablished !== true
    || lifecycleAudit.unknownProcessGroupMemberCount !== 0
    || lifecycleAudit.termAttempted !== false
    || lifecycleAudit.termSent !== false
    || lifecycleAudit.killAttempted !== false
    || lifecycleAudit.killSent !== false
    || lifecycleAudit.exitCode !== 0
    || lifecycleAudit.exitSignal !== null
    || lifecycleAudit.timedOut !== false
    || lifecycleAudit.stdoutOverflow !== false
    || lifecycleAudit.stderrOverflow !== false
    || lifecycleAudit.unprovenCount !== 0
    || lifecycleAudit.survivorCount !== 0
    || lifecycleAudit.signalAuthority !== false
    || outcome.commandId !== commandId
    || outcome.launchReceiptFingerprint !== launchReceiptFingerprint
    || outcome.auditReceiptFingerprint !== auditReceiptFingerprint
    || outcome.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || outcome.resultFingerprint !== resultFingerprint
    || outcome.outcome !== "PASS"
    || outcome.rejectionCode !== "none"
    || command.commandId !== commandId
    || command.attemptId !== state.attemptId
    || command.mode !== "initial"
    || command.attemptAuthorityBindingFingerprint
      !== state.attemptAuthorityBindingFingerprint
    || command.layoutBindingFingerprint !== state.layout.layoutBindingFingerprint
    || command.cacheVerifyCommandReceiptFingerprint
      !== cacheVerifyLink.commandReceiptFingerprint
    || command.cacheVerifyResultFingerprint
      !== cacheVerifyLink.resultFingerprint
    || command.ciPreferOfflineCommandReceiptFingerprint
      !== ciPreferOfflineLink.commandReceiptFingerprint
    || command.ciPreferOfflineResultFingerprint
      !== ciPreferOfflineLink.resultFingerprint
    || command.descriptorFingerprint !== operation.descriptorFingerprint
    || command.environmentInventoryFingerprint
      !== launch.environmentInventoryFingerprint
    || command.cwdIdentityFingerprint !== launch.cwdIdentityFingerprint
    || command.nodeExecutableIdentityFingerprint
      !== launch.nodeExecutableIdentityFingerprint
    || command.npmCliPathFingerprint !== launch.npmCliPathFingerprint
    || command.npmCliPhysicalIdentityFingerprint
      !== launch.npmCliPhysicalIdentityFingerprint
    || command.launchReceiptFingerprint !== launchReceiptFingerprint
    || command.auditReceiptFingerprint !== auditReceiptFingerprint
    || command.lifecycleAuditReceiptFingerprint
      !== lifecycleAuditReceiptFingerprint
    || command.outcomeReceiptFingerprint !== outcomeReceiptFingerprint
    || command.resultFingerprint !== resultFingerprint
    || command.npmDependencyTreeFingerprint
      !== state.stagedNpmDependencyTreeFingerprint
    || command.stagedNodeModulesInventoryFingerprint
      !== state.stagedNodeModulesInventoryFingerprint
    || command.outcome !== "PASS"
    || command.state !== "dependencies-listed-staged"
    || command.signalAuthority !== false
  ) {
    attemptOperationFailure();
  }
  const logPath = join(paths.logs, "npm-ls-provision-staged.log");
  const log = observeRegularFile(
    logPath,
    "npmLsProvisionStagedSanitizedLog",
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    524288,
    true
  );
  let payload;
  try {
    payload = parseStrictJsonObject(log.bytes);
  } catch {
    log.bytes.fill(0);
    attemptOperationFailure();
  }
  const canonicalText = canonicalizeClosedJson(payload);
  const matches = (
    Buffer.from(log.bytes).toString("utf8") === canonicalText
    && (log.entry.mode & 0o7777n) === 0o600n
    && log.identityFingerprint === audit.sanitizedLogIdentityFingerprint
    && log.rawByteSha256 === audit.sanitizedLogSha256
    && hashCanonicalProof(NPM_LS_PROVISION_STAGED_SANITIZED_LOG_DOMAIN, payload)
      === audit.sanitizedLogFingerprint
    && payload.commandId === commandId
    && payload.attemptId === state.attemptId
    && payload.mode === "initial"
    && payload.outcome === "PASS"
    && payload.state === "dependencies-listed-staged"
    && payload.lifecycleCode === "exit-zero"
    && payload.preNpmCacheInventoryFingerprint
      === state.postCiCacheInventoryFingerprint
    && payload.postNpmCacheInventoryFingerprint
      === state.postCiCacheInventoryFingerprint
    && payload.preStagedNodeModulesInventoryFingerprint
      === state.stagedNodeModulesInventoryFingerprint
    && payload.postStagedNodeModulesInventoryFingerprint
      === state.stagedNodeModulesInventoryFingerprint
    && payload.stagedNodeModulesRootIdentityFingerprint
      === state.stagedNodeModulesRootIdentityFingerprint
    && payload.npmDependencyTreeFingerprint
      === state.stagedNpmDependencyTreeFingerprint
  );
  log.bytes.fill(0);
  if (!matches) attemptOperationFailure();
  return {
    commandReceiptFingerprint,
    resultFingerprint,
    npmDependencyTreeFingerprint: result.npmDependencyTreeFingerprint,
    stagedNodeModulesInventoryFingerprint:
      result.stagedNodeModulesInventoryFingerprint,
    stagedNodeModulesRootIdentityFingerprint:
      audit.stagedNodeModulesRootIdentityFingerprint
  };
}

function samePhysicalFileWithoutTimestamps(left, right) {
  return Boolean(
    left
    && right
    && left.isFile()
    && !left.isSymbolicLink()
    && right.isFile()
    && !right.isSymbolicLink()
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.uid === right.uid
    && left.gid === right.gid
    && left.nlink === right.nlink
    && left.size === right.size
  );
}

function scrubAndUnlinkNpmCacheVerifyLog(
  exactPath,
  role,
  repositoryObservation
) {
  const observation = observeRegularFile(
    exactPath,
    role,
    repositoryObservation.repositoryUid,
    repositoryObservation.repositoryDev,
    524288,
    true
  );
  let descriptor;
  let scrubFailed = false;
  const zeroBytes = Buffer.alloc(Number(observation.entry.size));
  try {
    const beforePath = lstatSync(exactPath, { bigint: true });
    if (!sameStableStats(beforePath, observation.entry)) {
      attemptOperationFailure();
    }
    descriptor = openSync(
      exactPath,
      FS_CONSTANTS.O_WRONLY | FS_CONSTANTS.O_NOFOLLOW
    );
    const beforeDescriptor = fstatSync(descriptor, { bigint: true });
    if (!sameStableStats(beforeDescriptor, observation.entry)) {
      attemptOperationFailure();
    }
    writeAllDescriptorBytes(descriptor, zeroBytes, attemptOperationFailure);
    fsyncSync(descriptor);
    const afterDescriptor = fstatSync(descriptor, { bigint: true });
    if (
      !samePhysicalFileWithoutTimestamps(observation.entry, afterDescriptor)
    ) {
      attemptOperationFailure();
    }
  } catch {
    scrubFailed = true;
  } finally {
    zeroBytes.fill(0);
    observation.bytes.fill(0);
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        scrubFailed = true;
      }
    }
  }
  if (scrubFailed) attemptOperationFailure();
  let scrubbedPath;
  try {
    scrubbedPath = lstatSync(exactPath, { bigint: true });
  } catch {
    attemptOperationFailure();
  }
  if (!samePhysicalFileWithoutTimestamps(observation.entry, scrubbedPath)) {
    attemptOperationFailure();
  }
  try {
    unlinkSync(exactPath);
    fsyncDirectory(dirname(exactPath));
  } catch {
    attemptOperationFailure();
  }
  if (stableLstat(exactPath) !== undefined) attemptOperationFailure();
  return {
    byteLength: Number(observation.entry.size),
    identityFingerprint: observation.identityFingerprint,
    sha256: observation.rawByteSha256
  };
}

function consumeNpmCacheVerifyDebugLog(
  paths,
  state,
  repositoryObservation
) {
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  if (
    names.length !== 1
    || !REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [names[0]])
  ) {
    attemptOperationFailure();
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  const exactPath = join(paths.logs, names[0]);
  const scrubbed = scrubAndUnlinkNpmCacheVerifyLog(
    exactPath,
    "npmCacheVerifyRawDebugLog",
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    [],
    state.layout.directoryIdentityFingerprints.logs
  );
  return scrubbed;
}

function discardNpmCacheVerifyLogsAfterFailedTerminal(
  state
) {
  const repositoryRoot = observeDirectory(
    state.repositoryRoot,
    "repository-root",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  const tmpBasePath = join(state.repositoryRoot, ".tmp");
  const tmpBase = observeDirectory(
    tmpBasePath,
    "tmp-base",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  if (
    repositoryRoot.identityFingerprint
      !== state.repositoryRootIdentityFingerprint
    || tmpBase.identityFingerprint !== state.tmpBaseIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  const repositoryObservation = {
    repositoryBindingFingerprint: state.repositoryBindingFingerprint,
    repositoryDev: state.repositoryDev,
    repositoryRoot: state.repositoryRoot,
    repositoryUid: state.repositoryUid,
    tmpBaseIdentityFingerprint: state.tmpBaseIdentityFingerprint,
    tmpBasePath
  };
  const boundRoot = observeBoundInitialProvisionRoot(
    repositoryObservation,
    state.attemptId,
    state.provisionRootBindingFingerprint,
    state.provisionRootDescriptor
  );
  const activeLock = observeActivationLockFile(
    state.activationLock.activePath,
    "activation-lock-active",
    repositoryObservation,
    state.activationLock.lockBytes
  );
  if (
    activeLock.identityFingerprint
      !== state.activationLock.activeFileIdentityFingerprint
    || stableLstat(state.activationLock.retainedPath) !== undefined
  ) {
    attemptOperationFailure();
  }
  const paths = initialLayoutPaths(boundRoot.provisionRoot);
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  for (const name of names) {
    const isRawDebugLog = REFLECT_APPLY(
      REGEXP_TEST,
      NPM_DEBUG_LOG_NAME_PATTERN,
      [name]
    );
    if (!isRawDebugLog && name !== "npm-cache-verify.log") {
      attemptOperationFailure();
    }
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  for (const name of names) {
    scrubAndUnlinkNpmCacheVerifyLog(
      join(paths.logs, name),
      name === "npm-cache-verify.log"
        ? "npmCacheVerifySanitizedLog"
        : "npmCacheVerifyRawDebugLog",
      repositoryObservation
    );
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    [],
    state.layout.directoryIdentityFingerprints.logs
  );
}

function writeCacheVerifySanitizedLog(
  paths,
  state,
  repositoryObservation,
  execution
) {
  const rawDebugLog = consumeNpmCacheVerifyDebugLog(
    paths,
    state,
    repositoryObservation
  );
  const payload = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["commandId", "owner.dependency.npm.cache-verify"],
    ["outcome", "PASS"],
    ["stdoutByteLength", execution.stdoutByteLength],
    ["stdoutSha256", sha256Bytes(execution.stdout)],
    ["stderrByteLength", execution.stderrByteLength],
    ["stderrSha256", sha256Bytes(execution.stderr)],
    ["npmDebugLogByteLength", rawDebugLog.byteLength],
    ["npmDebugLogSha256", rawDebugLog.sha256],
    [
      "npmDebugLogIdentityFingerprint",
      rawDebugLog.identityFingerprint
    ],
    ["lifecycleCode", execution.lifecycleCode],
    ["state", "cache-verified"]
  ]);
  const artifact = canonicalizeClosedJsonArtifact(payload);
  if (artifact.byteLength > 524288) attemptOperationFailure();
  const exactPath = join(paths.logs, "npm-cache-verify.log");
  const written = writeExclusiveInitialLayoutArtifact(
    exactPath,
    "npmCacheVerifySanitizedLog",
    payload,
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
  return {
    fingerprint: hashCanonicalProof(
      NPM_CACHE_VERIFY_SANITIZED_LOG_DOMAIN,
      payload
    ),
    identityFingerprint: written.observation.identityFingerprint,
    sha256: written.artifact.sha256
  };
}

function consumeNpmCiDebugLog(
  paths,
  state,
  repositoryObservation
) {
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  const rawNames = names.filter((name) =>
    REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
  );
  if (
    names.length !== 2
    || !names.includes("npm-cache-verify.log")
    || rawNames.length !== 1
  ) {
    attemptOperationFailure();
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  const scrubbed = scrubAndUnlinkNpmCacheVerifyLog(
    join(paths.logs, rawNames[0]),
    "npmCiPreferOfflineRawDebugLog",
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
  return scrubbed;
}

function discardNpmCiLogsAfterFailedTerminal(state) {
  const repositoryRoot = observeDirectory(
    state.repositoryRoot,
    "repository-root",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  const tmpBasePath = join(state.repositoryRoot, ".tmp");
  const tmpBase = observeDirectory(
    tmpBasePath,
    "tmp-base",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  if (
    repositoryRoot.identityFingerprint
      !== state.repositoryRootIdentityFingerprint
    || tmpBase.identityFingerprint !== state.tmpBaseIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  const repositoryObservation = {
    repositoryBindingFingerprint: state.repositoryBindingFingerprint,
    repositoryDev: state.repositoryDev,
    repositoryRoot: state.repositoryRoot,
    repositoryUid: state.repositoryUid,
    tmpBaseIdentityFingerprint: state.tmpBaseIdentityFingerprint,
    tmpBasePath
  };
  const boundRoot = observeBoundInitialProvisionRoot(
    repositoryObservation,
    state.attemptId,
    state.provisionRootBindingFingerprint,
    state.provisionRootDescriptor
  );
  const activeLock = observeActivationLockFile(
    state.activationLock.activePath,
    "activation-lock-active",
    repositoryObservation,
    state.activationLock.lockBytes
  );
  if (
    activeLock.identityFingerprint
      !== state.activationLock.activeFileIdentityFingerprint
    || stableLstat(state.activationLock.retainedPath) !== undefined
  ) {
    attemptOperationFailure();
  }
  const paths = initialLayoutPaths(boundRoot.provisionRoot);
  acceptedCacheVerifyLink(state, paths, repositoryObservation, false);
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  const rawNames = names.filter((name) =>
    REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
  );
  if (
    !names.includes("npm-cache-verify.log")
    || rawNames.length > 1
    || names.some((name) =>
      name !== "npm-cache-verify.log"
      && name !== "npm-ci-prefer-offline.log"
      && !REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
    )
  ) {
    attemptOperationFailure();
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  for (const name of names) {
    if (name === "npm-cache-verify.log") continue;
    scrubAndUnlinkNpmCacheVerifyLog(
      join(paths.logs, name),
      name === "npm-ci-prefer-offline.log"
        ? "npmCiPreferOfflineSanitizedLog"
        : "npmCiPreferOfflineRawDebugLog",
      repositoryObservation
    );
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
}

function writeNpmCiPreferOfflineSanitizedLog(
  paths,
  state,
  repositoryObservation,
  execution,
  stagedInventory
) {
  const rawDebugLog = consumeNpmCiDebugLog(
    paths,
    state,
    repositoryObservation
  );
  const payload = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["commandId", "owner.dependency.npm.ci-prefer-offline"],
    ["outcome", "PASS"],
    ["stdoutByteLength", execution.stdoutByteLength],
    ["stdoutSha256", sha256Bytes(execution.stdout)],
    ["stderrByteLength", execution.stderrByteLength],
    ["stderrSha256", sha256Bytes(execution.stderr)],
    ["npmDebugLogByteLength", rawDebugLog.byteLength],
    ["npmDebugLogSha256", rawDebugLog.sha256],
    ["npmDebugLogIdentityFingerprint", rawDebugLog.identityFingerprint],
    ["stagedNodeModulesInventoryFingerprint", stagedInventory.fingerprint],
    [
      "stagedNodeModulesRootIdentityFingerprint",
      stagedInventory.rootIdentityFingerprint
    ],
    ["lifecycleCode", execution.lifecycleCode],
    ["state", "dependencies-installed-staged"]
  ]);
  const artifact = canonicalizeClosedJsonArtifact(payload);
  if (artifact.byteLength > 524288) attemptOperationFailure();
  const exactPath = join(paths.logs, "npm-ci-prefer-offline.log");
  const written = writeExclusiveInitialLayoutArtifact(
    exactPath,
    "npmCiPreferOfflineSanitizedLog",
    payload,
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log", "npm-ci-prefer-offline.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
  return {
    fingerprint: hashCanonicalProof(
      NPM_CI_PREFER_OFFLINE_SANITIZED_LOG_DOMAIN,
      payload
    ),
    identityFingerprint: written.observation.identityFingerprint,
    sha256: written.artifact.sha256
  };
}

function consumeNpmLsProvisionStagedDebugLog(
  paths,
  state,
  repositoryObservation
) {
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  const rawNames = names.filter((name) =>
    REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
  );
  if (
    names.length !== 3
    || !names.includes("npm-cache-verify.log")
    || !names.includes("npm-ci-prefer-offline.log")
    || rawNames.length !== 1
  ) {
    attemptOperationFailure();
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  const scrubbed = scrubAndUnlinkNpmCacheVerifyLog(
    join(paths.logs, rawNames[0]),
    "npmLsProvisionStagedRawDebugLog",
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log", "npm-ci-prefer-offline.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
  return scrubbed;
}

function discardNpmLsProvisionStagedLogsAfterFailedTerminal(state) {
  const repositoryRoot = observeDirectory(
    state.repositoryRoot,
    "repository-root",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  const tmpBasePath = join(state.repositoryRoot, ".tmp");
  const tmpBase = observeDirectory(
    tmpBasePath,
    "tmp-base",
    state.repositoryUid,
    state.repositoryDev,
    true
  );
  if (
    repositoryRoot.identityFingerprint
      !== state.repositoryRootIdentityFingerprint
    || tmpBase.identityFingerprint !== state.tmpBaseIdentityFingerprint
  ) {
    attemptOperationFailure();
  }
  const repositoryObservation = {
    repositoryBindingFingerprint: state.repositoryBindingFingerprint,
    repositoryDev: state.repositoryDev,
    repositoryRoot: state.repositoryRoot,
    repositoryUid: state.repositoryUid,
    tmpBaseIdentityFingerprint: state.tmpBaseIdentityFingerprint,
    tmpBasePath
  };
  const boundRoot = observeBoundInitialProvisionRoot(
    repositoryObservation,
    state.attemptId,
    state.provisionRootBindingFingerprint,
    state.provisionRootDescriptor
  );
  const activeLock = observeActivationLockFile(
    state.activationLock.activePath,
    "activation-lock-active",
    repositoryObservation,
    state.activationLock.lockBytes
  );
  if (
    activeLock.identityFingerprint
      !== state.activationLock.activeFileIdentityFingerprint
    || stableLstat(state.activationLock.retainedPath) !== undefined
  ) {
    attemptOperationFailure();
  }
  const paths = initialLayoutPaths(boundRoot.provisionRoot);
  const cacheVerifyLink = acceptedCacheVerifyLink(
    state,
    paths,
    repositoryObservation,
    false
  );
  acceptedCiPreferOfflineLink(
    state,
    paths,
    repositoryObservation,
    cacheVerifyLink
  );
  let names;
  try {
    names = readdirSync(paths.logs, { encoding: "utf8" });
  } catch {
    attemptOperationFailure();
  }
  names.sort(compareCodeUnits);
  const rawNames = names.filter((name) =>
    REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
  );
  if (
    !names.includes("npm-cache-verify.log")
    || !names.includes("npm-ci-prefer-offline.log")
    || rawNames.length > 1
    || names.some((name) =>
      name !== "npm-cache-verify.log"
      && name !== "npm-ci-prefer-offline.log"
      && name !== "npm-ls-provision-staged.log"
      && !REFLECT_APPLY(REGEXP_TEST, NPM_DEBUG_LOG_NAME_PATTERN, [name])
    )
  ) {
    attemptOperationFailure();
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    names,
    state.layout.directoryIdentityFingerprints.logs
  );
  for (const name of names) {
    if (
      name === "npm-cache-verify.log"
      || name === "npm-ci-prefer-offline.log"
    ) {
      continue;
    }
    scrubAndUnlinkNpmCacheVerifyLog(
      join(paths.logs, name),
      name === "npm-ls-provision-staged.log"
        ? "npmLsProvisionStagedSanitizedLog"
        : "npmLsProvisionStagedRawDebugLog",
      repositoryObservation
    );
  }
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    ["npm-cache-verify.log", "npm-ci-prefer-offline.log"],
    state.layout.directoryIdentityFingerprints.logs
  );
}

function writeNpmLsProvisionStagedSanitizedLog(
  paths,
  state,
  repositoryObservation,
  execution,
  dependencyTree,
  preNpmCacheInventoryFingerprint,
  postNpmCacheInventoryFingerprint,
  preStagedNodeModulesInventoryFingerprint,
  postStagedNodeModulesInventoryFingerprint
) {
  const rawDebugLog = consumeNpmLsProvisionStagedDebugLog(
    paths,
    state,
    repositoryObservation
  );
  const payload = nullRecord([
    ["schemaVersion", 1],
    ["attemptId", state.attemptId],
    ["mode", "initial"],
    ["commandId", "owner.dependency.npm.ls-provision-staged"],
    ["outcome", "PASS"],
    ["stdoutByteLength", execution.stdoutByteLength],
    ["stdoutSha256", sha256Bytes(execution.stdout)],
    ["stderrByteLength", execution.stderrByteLength],
    ["stderrSha256", sha256Bytes(execution.stderr)],
    ["npmDebugLogByteLength", rawDebugLog.byteLength],
    ["npmDebugLogSha256", rawDebugLog.sha256],
    ["npmDebugLogIdentityFingerprint", rawDebugLog.identityFingerprint],
    ["npmDependencyTreeFingerprint", dependencyTree.fingerprint],
    ["dependencyNodeCount", dependencyTree.dependencyNodeCount],
    ["maximumDependencyDepth", dependencyTree.maximumDependencyDepth],
    ["preNpmCacheInventoryFingerprint", preNpmCacheInventoryFingerprint],
    ["postNpmCacheInventoryFingerprint", postNpmCacheInventoryFingerprint],
    [
      "preStagedNodeModulesInventoryFingerprint",
      preStagedNodeModulesInventoryFingerprint
    ],
    [
      "postStagedNodeModulesInventoryFingerprint",
      postStagedNodeModulesInventoryFingerprint
    ],
    [
      "stagedNodeModulesRootIdentityFingerprint",
      state.stagedNodeModulesRootIdentityFingerprint
    ],
    ["lifecycleCode", execution.lifecycleCode],
    ["state", "dependencies-listed-staged"]
  ]);
  const artifact = canonicalizeClosedJsonArtifact(payload);
  if (artifact.byteLength > 524288) attemptOperationFailure();
  const exactPath = join(paths.logs, "npm-ls-provision-staged.log");
  const written = writeExclusiveInitialLayoutArtifact(
    exactPath,
    "npmLsProvisionStagedSanitizedLog",
    payload,
    repositoryObservation
  );
  exactDirectoryEntries(
    paths.logs,
    "logs",
    repositoryObservation,
    [
      "npm-cache-verify.log",
      "npm-ci-prefer-offline.log",
      "npm-ls-provision-staged.log"
    ],
    state.layout.directoryIdentityFingerprints.logs
  );
  return {
    fingerprint: hashCanonicalProof(
      NPM_LS_PROVISION_STAGED_SANITIZED_LOG_DOMAIN,
      payload
    ),
    identityFingerprint: written.observation.identityFingerprint,
    sha256: written.artifact.sha256
  };
}

function buildCacheVerifyReceipts({
  cacheInventoryFingerprint,
  descriptorFingerprint,
  environmentInventoryFingerprint,
  execution,
  liveHomeProof,
  observation,
  postAudit,
  preAudit,
  result,
  sanitizedLog,
  state
}) {
  const launch = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["commandId", "owner.dependency.npm.cache-verify"],
      ["descriptorFingerprint", descriptorFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished]
    ]
  );
  const audit = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", "owner.dependency.npm.cache-verify"],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["cacheInventoryFingerprint", cacheInventoryFingerprint],
      ["sanitizedLogFingerprint", sanitizedLog.fingerprint],
      ["sanitizedLogIdentityFingerprint", sanitizedLog.identityFingerprint],
      ["sanitizedLogSha256", sanitizedLog.sha256],
      ["violationCode", "none"],
      ["violationCount", 0]
    ]
  );
  const lifecycle = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", "owner.dependency.npm.cache-verify"],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["lifecycleCode", execution.lifecycleCode],
      ["failureTrigger", execution.failureTrigger],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished],
      ["identityEstablished", execution.identityEstablished],
      ["rootIdentityBasis", execution.rootIdentityBasis],
      ["rootRuntimeTitleClass", execution.rootRuntimeTitleClass],
      ["rootOwnerTokenObserved", execution.rootOwnerTokenObserved],
      ["descendantIdentityBasis", "captured-ancestry-pgid-lstart-v1"],
      [
        "tokenCorroboratedProcessCount",
        execution.tokenCorroboratedProcessCount
      ],
      [
        "unknownProcessGroupMemberCount",
        execution.unknownProcessGroupMemberCount
      ],
      [
        "identityRevalidatedBeforeTerm",
        execution.identityRevalidatedBeforeTerm
      ],
      [
        "identityRevalidatedBeforeKill",
        execution.identityRevalidatedBeforeKill
      ],
      ["termAttempted", execution.termAttempted],
      ["termSent", execution.termSent],
      ["killAttempted", execution.killAttempted],
      ["killSent", execution.killSent],
      ["exitCode", execution.exitCode],
      ["exitSignal", execution.exitSignal],
      ["timedOut", execution.timedOut],
      ["stdoutOverflow", execution.stdoutOverflow],
      ["stderrOverflow", execution.stderrOverflow],
      ["rediscoveryCount", execution.rediscoveryCount],
      ["unprovenCount", execution.unprovenCount],
      ["survivorCount", execution.survivorCount],
      ["eventCodes", execution.eventCodes],
      ["signalAuthority", false]
    ]
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_CACHE_VERIFY_RESULT_DOMAIN,
    result
  );
  const outcome = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", "owner.dependency.npm.cache-verify"],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["outcome", "PASS"],
      ["rejectionCode", "none"]
    ]
  );
  const commandReceipt = retainedAttemptComponentReceipt(
    NPM_CACHE_VERIFY_RECEIPT_DOMAIN,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", "owner.dependency.npm.cache-verify"],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["layoutBindingFingerprint", state.layout.layoutBindingFingerprint],
      ["descriptorFingerprint", descriptorFingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["outcomeReceiptFingerprint", outcome.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["outcome", "PASS"],
      ["state", "cache-verified"],
      ["signalAuthority", false]
    ]
  );
  const closure = nullRecord([
    ["launch", launch.receipt],
    ["audit", audit.receipt],
    ["lifecycleAudit", lifecycle.receipt],
    ["outcome", outcome.receipt],
    ["command", commandReceipt.receipt]
  ]);
  assertNoLiveHomeRetention(liveHomeProof, closure);
  return {
    closure,
    commandReceiptFingerprint: commandReceipt.fingerprint,
    resultFingerprint
  };
}

function buildNpmCiPreferOfflineReceipts({
  cacheVerifyLink,
  descriptorFingerprint,
  environmentInventoryFingerprint,
  execution,
  liveHomeProof,
  observation,
  postAudit,
  preAudit,
  result,
  sanitizedLog,
  stagedInventory,
  state
}) {
  const commandId = "owner.dependency.npm.ci-prefer-offline";
  const launch = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["commandId", commandId],
      ["descriptorFingerprint", descriptorFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished]
    ]
  );
  const audit = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      [
        "cacheVerifyCommandReceiptFingerprint",
        cacheVerifyLink.commandReceiptFingerprint
      ],
      ["cacheVerifyResultFingerprint", cacheVerifyLink.resultFingerprint],
      ["stagedNodeModulesInventoryFingerprint", stagedInventory.fingerprint],
      [
        "stagedNodeModulesRootIdentityFingerprint",
        stagedInventory.rootIdentityFingerprint
      ],
      ["sanitizedLogFingerprint", sanitizedLog.fingerprint],
      ["sanitizedLogIdentityFingerprint", sanitizedLog.identityFingerprint],
      ["sanitizedLogSha256", sanitizedLog.sha256],
      ["violationCode", "none"],
      ["violationCount", 0]
    ]
  );
  const lifecycle = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["lifecycleCode", execution.lifecycleCode],
      ["failureTrigger", execution.failureTrigger],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished],
      ["identityEstablished", execution.identityEstablished],
      ["rootIdentityBasis", execution.rootIdentityBasis],
      ["rootRuntimeTitleClass", execution.rootRuntimeTitleClass],
      ["rootOwnerTokenObserved", execution.rootOwnerTokenObserved],
      ["descendantIdentityBasis", "captured-ancestry-pgid-lstart-v1"],
      [
        "tokenCorroboratedProcessCount",
        execution.tokenCorroboratedProcessCount
      ],
      [
        "unknownProcessGroupMemberCount",
        execution.unknownProcessGroupMemberCount
      ],
      [
        "identityRevalidatedBeforeTerm",
        execution.identityRevalidatedBeforeTerm
      ],
      [
        "identityRevalidatedBeforeKill",
        execution.identityRevalidatedBeforeKill
      ],
      ["termAttempted", execution.termAttempted],
      ["termSent", execution.termSent],
      ["killAttempted", execution.killAttempted],
      ["killSent", execution.killSent],
      ["exitCode", execution.exitCode],
      ["exitSignal", execution.exitSignal],
      ["timedOut", execution.timedOut],
      ["stdoutOverflow", execution.stdoutOverflow],
      ["stderrOverflow", execution.stderrOverflow],
      ["rediscoveryCount", execution.rediscoveryCount],
      ["unprovenCount", execution.unprovenCount],
      ["survivorCount", execution.survivorCount],
      ["eventCodes", execution.eventCodes],
      ["signalAuthority", false]
    ]
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_CI_PREFER_OFFLINE_RESULT_DOMAIN,
    result
  );
  const outcome = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["outcome", "PASS"],
      ["rejectionCode", "none"]
    ]
  );
  const commandReceipt = retainedAttemptComponentReceipt(
    NPM_CI_PREFER_OFFLINE_RECEIPT_DOMAIN,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", commandId],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["layoutBindingFingerprint", state.layout.layoutBindingFingerprint],
      [
        "cacheVerifyCommandReceiptFingerprint",
        cacheVerifyLink.commandReceiptFingerprint
      ],
      ["cacheVerifyResultFingerprint", cacheVerifyLink.resultFingerprint],
      ["descriptorFingerprint", descriptorFingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["outcomeReceiptFingerprint", outcome.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["outcome", "PASS"],
      ["state", "dependencies-installed-staged"],
      ["signalAuthority", false]
    ]
  );
  const closure = nullRecord([
    ["launch", launch.receipt],
    ["audit", audit.receipt],
    ["lifecycleAudit", lifecycle.receipt],
    ["outcome", outcome.receipt],
    ["command", commandReceipt.receipt]
  ]);
  assertNoLiveHomeRetention(liveHomeProof, closure);
  return {
    closure,
    commandReceiptFingerprint: commandReceipt.fingerprint,
    resultFingerprint
  };
}

function buildNpmLsProvisionStagedReceipts({
  cacheVerifyLink,
  ciPreferOfflineLink,
  dependencyTree,
  descriptorFingerprint,
  environmentInventoryFingerprint,
  execution,
  liveHomeProof,
  observation,
  postAudit,
  postNpmCacheInventoryFingerprint,
  postStagedNodeModulesInventoryFingerprint,
  preAudit,
  preNpmCacheInventoryFingerprint,
  preStagedNodeModulesInventoryFingerprint,
  result,
  sanitizedLog,
  state
}) {
  const commandId = "owner.dependency.npm.ls-provision-staged";
  const launch = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.launchReceipt,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["commandId", commandId],
      ["descriptorFingerprint", descriptorFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished]
    ]
  );
  const audit = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.auditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      [
        "cacheVerifyCommandReceiptFingerprint",
        cacheVerifyLink.commandReceiptFingerprint
      ],
      ["cacheVerifyResultFingerprint", cacheVerifyLink.resultFingerprint],
      [
        "ciPreferOfflineCommandReceiptFingerprint",
        ciPreferOfflineLink.commandReceiptFingerprint
      ],
      [
        "ciPreferOfflineResultFingerprint",
        ciPreferOfflineLink.resultFingerprint
      ],
      ["preNpmCacheInventoryFingerprint", preNpmCacheInventoryFingerprint],
      ["postNpmCacheInventoryFingerprint", postNpmCacheInventoryFingerprint],
      [
        "preStagedNodeModulesInventoryFingerprint",
        preStagedNodeModulesInventoryFingerprint
      ],
      [
        "postStagedNodeModulesInventoryFingerprint",
        postStagedNodeModulesInventoryFingerprint
      ],
      [
        "stagedNodeModulesRootIdentityFingerprint",
        state.stagedNodeModulesRootIdentityFingerprint
      ],
      ["npmDependencyTreeFingerprint", dependencyTree.fingerprint],
      ["dependencyNodeCount", dependencyTree.dependencyNodeCount],
      ["maximumDependencyDepth", dependencyTree.maximumDependencyDepth],
      ["sanitizedLogFingerprint", sanitizedLog.fingerprint],
      ["sanitizedLogIdentityFingerprint", sanitizedLog.identityFingerprint],
      ["sanitizedLogSha256", sanitizedLog.sha256],
      ["violationCode", "none"],
      ["violationCount", 0]
    ]
  );
  const lifecycle = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.lifecycleAuditReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["signalPolicyKind", "identity-revalidated-owned-tree-term-kill"],
      ["lifecycleCode", execution.lifecycleCode],
      ["failureTrigger", execution.failureTrigger],
      ["spawnOccurred", execution.spawnOccurred],
      ["abortAuthorityEstablished", execution.abortAuthorityEstablished],
      ["identityEstablished", execution.identityEstablished],
      ["rootIdentityBasis", execution.rootIdentityBasis],
      ["rootRuntimeTitleClass", execution.rootRuntimeTitleClass],
      ["rootOwnerTokenObserved", execution.rootOwnerTokenObserved],
      ["descendantIdentityBasis", "captured-ancestry-pgid-lstart-v1"],
      [
        "tokenCorroboratedProcessCount",
        execution.tokenCorroboratedProcessCount
      ],
      [
        "unknownProcessGroupMemberCount",
        execution.unknownProcessGroupMemberCount
      ],
      [
        "identityRevalidatedBeforeTerm",
        execution.identityRevalidatedBeforeTerm
      ],
      [
        "identityRevalidatedBeforeKill",
        execution.identityRevalidatedBeforeKill
      ],
      ["termAttempted", execution.termAttempted],
      ["termSent", execution.termSent],
      ["killAttempted", execution.killAttempted],
      ["killSent", execution.killSent],
      ["exitCode", execution.exitCode],
      ["exitSignal", execution.exitSignal],
      ["timedOut", execution.timedOut],
      ["stdoutOverflow", execution.stdoutOverflow],
      ["stderrOverflow", execution.stderrOverflow],
      ["rediscoveryCount", execution.rediscoveryCount],
      ["unprovenCount", execution.unprovenCount],
      ["survivorCount", execution.survivorCount],
      ["eventCodes", execution.eventCodes],
      ["signalAuthority", false]
    ]
  );
  const resultFingerprint = hashCanonicalProof(
    NPM_LS_PROVISION_STAGED_RESULT_DOMAIN,
    result
  );
  const outcome = retainedAttemptComponentReceipt(
    REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS.outcomeReceipt,
    [
      ["schemaVersion", 1],
      ["commandId", commandId],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["outcome", "PASS"],
      ["rejectionCode", "none"]
    ]
  );
  const commandReceipt = retainedAttemptComponentReceipt(
    NPM_LS_PROVISION_STAGED_RECEIPT_DOMAIN,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", commandId],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["layoutBindingFingerprint", state.layout.layoutBindingFingerprint],
      [
        "cacheVerifyCommandReceiptFingerprint",
        cacheVerifyLink.commandReceiptFingerprint
      ],
      ["cacheVerifyResultFingerprint", cacheVerifyLink.resultFingerprint],
      [
        "ciPreferOfflineCommandReceiptFingerprint",
        ciPreferOfflineLink.commandReceiptFingerprint
      ],
      [
        "ciPreferOfflineResultFingerprint",
        ciPreferOfflineLink.resultFingerprint
      ],
      ["descriptorFingerprint", descriptorFingerprint],
      ["environmentInventoryFingerprint", environmentInventoryFingerprint],
      ["cwdIdentityFingerprint", observation.cwdIdentityFingerprint],
      [
        "nodeExecutableIdentityFingerprint",
        state.nodeExecutableIdentityFingerprint
      ],
      ["npmCliPathFingerprint", state.npmCliPathFingerprint],
      [
        "npmCliPhysicalIdentityFingerprint",
        state.npmCliPhysicalIdentityFingerprint
      ],
      ["preOwnedAuditAggregateFingerprint", preAudit.fingerprint],
      ["launchReceiptFingerprint", launch.fingerprint],
      ["auditReceiptFingerprint", audit.fingerprint],
      ["lifecycleAuditReceiptFingerprint", lifecycle.fingerprint],
      ["outcomeReceiptFingerprint", outcome.fingerprint],
      ["resultFingerprint", resultFingerprint],
      ["postOwnedAuditAggregateFingerprint", postAudit.fingerprint],
      ["npmDependencyTreeFingerprint", dependencyTree.fingerprint],
      [
        "stagedNodeModulesInventoryFingerprint",
        postStagedNodeModulesInventoryFingerprint
      ],
      ["outcome", "PASS"],
      ["state", "dependencies-listed-staged"],
      ["signalAuthority", false]
    ]
  );
  const closure = nullRecord([
    ["launch", launch.receipt],
    ["audit", audit.receipt],
    ["lifecycleAudit", lifecycle.receipt],
    ["outcome", outcome.receipt],
    ["command", commandReceipt.receipt]
  ]);
  assertNoLiveHomeRetention(liveHomeProof, closure);
  return {
    closure,
    commandReceiptFingerprint: commandReceipt.fingerprint,
    resultFingerprint
  };
}

function buildInitialStagedActivationReceipts({
  activeBinding,
  cacheVerifyLink,
  ciPreferOfflineLink,
  liveHomeProof,
  npmLsProvisionStagedLink,
  result,
  state
}) {
  const binding = retainedAttemptComponentReceipt(
    ACTIVE_NODE_MODULES_BINDING_DOMAIN,
    REFLECT_OWN_KEYS(activeBinding.binding).map((key) => [
      key,
      activeBinding.binding[key]
    ])
  );
  if (binding.fingerprint !== activeBinding.fingerprint) {
    attemptOperationFailure();
  }
  const resultFingerprint = hashCanonicalProof(
    INITIAL_STAGED_ACTIVATION_RESULT_DOMAIN,
    result
  );
  const transition = retainedAttemptComponentReceipt(
    INITIAL_STAGED_ACTIVATION_RECEIPT_DOMAIN,
    [
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["operationId", INITIAL_STAGED_ACTIVATION_OPERATION_ID],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["layoutBindingFingerprint", state.layout.layoutBindingFingerprint],
      ["activationLockFingerprint", state.activationLock.lockFingerprint],
      [
        "cacheVerifyCommandReceiptFingerprint",
        cacheVerifyLink.commandReceiptFingerprint
      ],
      ["cacheVerifyResultFingerprint", cacheVerifyLink.resultFingerprint],
      [
        "ciPreferOfflineCommandReceiptFingerprint",
        ciPreferOfflineLink.commandReceiptFingerprint
      ],
      [
        "ciPreferOfflineResultFingerprint",
        ciPreferOfflineLink.resultFingerprint
      ],
      [
        "npmLsProvisionStagedCommandReceiptFingerprint",
        npmLsProvisionStagedLink.commandReceiptFingerprint
      ],
      [
        "npmLsProvisionStagedResultFingerprint",
        npmLsProvisionStagedLink.resultFingerprint
      ],
      [
        "stagedNodeModulesInventoryFingerprint",
        state.stagedNodeModulesInventoryFingerprint
      ],
      [
        "npmDependencyTreeFingerprint",
        state.stagedNpmDependencyTreeFingerprint
      ],
      [
        "stagedNodeModulesRootIdentityFingerprint",
        state.stagedNodeModulesRootIdentityFingerprint
      ],
      ["activeNodeModulesBindingFingerprint", activeBinding.fingerprint],
      ["preActivePresence", "absent"],
      ["postActivePresence", "symbolic-link"],
      ["postStagedPresence", "directory"],
      ["quarantineCandidatePresence", "absent"],
      ["rollbackCandidatePresence", "absent"],
      ["transitionDisposition", "committed"],
      ["resultFingerprint", resultFingerprint],
      ["outcome", "PASS"],
      ["state", "dependencies-activated-initial"],
      ["signalAuthority", false]
    ]
  );
  const closure = nullRecord([
    ["binding", binding.receipt],
    ["transition", transition.receipt]
  ]);
  assertNoLiveHomeRetention(liveHomeProof, closure);
  return {
    closure,
    resultFingerprint,
    transitionReceiptFingerprint: transition.fingerprint
  };
}

export async function runRequiredBrowserProvisionNpmCacheVerify(
  liveHomeProof,
  attemptAuthority
) {
  const commandId = "owner.dependency.npm.cache-verify";
  const state = registeredAttemptState(attemptAuthority);
  if (state?.inFlightCommandId !== undefined) {
    attemptOperationFailure();
  }
  if (
    !state
    || state.status !== "layout-prepared-fresh"
    || state.publicCommandIds?.[0] !== commandId
    || state.operationResults?.has(commandId)
  ) {
    if (state) markAttemptOperationFailed(state);
    attemptOperationFailure();
  }
  state.inFlightCommandId = commandId;
  state.status = "cache-verify-reserved";
  let execution;
  let childEnvironment;
  let preSnapshot;
  let postSnapshot;
  let ownerToken;
  try {
    const operation = cacheVerifyDescriptor();
    const initialObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state
    );
    exactDirectoryEntries(
      initialObservation.paths.logs,
      "logs",
      initialObservation.observation.repositoryObservation,
      [],
      state.layout.directoryIdentityFingerprints.logs
    );
    ownerToken = hashCanonicalProof(
      ATTEMPT_OWNER_TOKEN_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["attemptId", state.attemptId],
        [
          "bootstrapAuthorityBindingFingerprint",
          state.bootstrapAuthorityBindingFingerprint
        ]
      ])
    );
    state.status = "cache-verify-pre-auditing";
    preSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      initialObservation.observation
    );
    const preAudit = ownedAuditAggregate(
      state,
      commandId,
      "pre-launch",
      preSnapshot
    );
    clearOwnedAuditSnapshot(preSnapshot);
    preSnapshot = undefined;

    const preSpawnObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state
    );
    const environment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      preSpawnObservation.boundRoot.provisionRoot,
      ownerToken
    );
    childEnvironment = environment.childEnvironment;
    if (
      environment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      attemptOperationFailure();
    }
    state.status = "cache-verify-running";
    state.operationLogDisposition = "unresolved";
    state.operationProcessTerminality = "uncertain";
    execution = await executeInitialOwnedNpmOperation({
      commandId,
      childEnvironment,
      liveHomeProof,
      nodePath: preSpawnObservation.nodeRuntime.canonicalPath,
      npmArguments: ["cache", "verify"],
      npmCliPath: preSpawnObservation.npmCli.npmCliPath,
      npmProcessTitle: "npm cache verify",
      ownerToken,
      state,
      staticObservation: preSpawnObservation.observation
    });
    if (!state.auxiliaryProcessUncertainty) {
      if (!execution.spawnOccurred && execution.spawnError) {
        state.operationProcessTerminality = "no-process-awaiting-post-audit";
      } else if (execution.closeObserved && execution.survivorCount === 0) {
        state.operationProcessTerminality = "child-closed-awaiting-post-audit";
      }
    }
    childEnvironment = undefined;
    state.status = "cache-verify-post-auditing";
    postSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      preSpawnObservation.observation
    );
    const hasSafeRootPid = Number.isSafeInteger(execution.rootPid)
      && execution.rootPid > 0;
    if (!hasSafeRootPid && execution.spawnOccurred) {
      attemptOperationFailure();
    }
    const postTerminalProcessGroupMemberCount = hasSafeRootPid
      ? postSnapshot.rows.filter((row) => row.pgid === execution.rootPid).length
      : 0;
    execution.unknownProcessGroupMemberCount = Math.max(
      execution.unknownProcessGroupMemberCount,
      postTerminalProcessGroupMemberCount
    );
    execution.unprovenCount = Math.max(
      execution.unprovenCount,
      postTerminalProcessGroupMemberCount
    );
    const postAudit = ownedAuditAggregate(
      state,
      commandId,
      "post-terminal",
      postSnapshot
    );
    if (
      postTerminalProcessGroupMemberCount === 0
      && (
        state.operationProcessTerminality
          === "child-closed-awaiting-post-audit"
        || state.operationProcessTerminality
          === "no-process-awaiting-post-audit"
      )
    ) {
      state.operationProcessTerminality = "terminal-proven";
    }
    clearOwnedAuditSnapshot(postSnapshot);
    postSnapshot = undefined;
    const postObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state
    );
    const postEnvironment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      postObservation.boundRoot.provisionRoot,
      ownerToken
    );
    wipeChildEnvironment(postEnvironment.childEnvironment);
    postEnvironment.childEnvironment = undefined;
    if (
      postEnvironment.inventoryFingerprint !== environment.inventoryFingerprint
      || postEnvironment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
      || postObservation.cwdIdentityFingerprint
        !== preSpawnObservation.cwdIdentityFingerprint
      || postObservation.nodeRuntime.identityFingerprint
        !== preSpawnObservation.nodeRuntime.identityFingerprint
      || postObservation.npmCli.pathFingerprint
        !== preSpawnObservation.npmCli.pathFingerprint
      || postObservation.npmCli.physicalIdentityFingerprint
        !== preSpawnObservation.npmCli.physicalIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    if (
      execution.spawnError
      || !execution.spawnOccurred
      || !execution.abortAuthorityEstablished
      || !execution.identityEstablished
      || !execution.exitObserved
      || !execution.closeObserved
      || execution.exitCode !== 0
      || execution.exitSignal !== null
      || execution.failureTrigger !== "none"
      || execution.lifecycleCode !== "exit-zero"
      || execution.termAttempted
      || execution.termSent
      || execution.killAttempted
      || execution.killSent
      || execution.timedOut
      || execution.stdoutOverflow
      || execution.stderrOverflow
      || execution.unprovenCount !== 0
      || execution.survivorCount !== 0
      || execution.stdoutByteLength > operation.descriptor.outputPolicy.stdoutMaxBytes
      || execution.stderrByteLength > operation.descriptor.outputPolicy.stderrMaxBytes
    ) {
      attemptOperationFailure();
    }
    const cacheInventory = inventoryInitialNpmCache(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    const sanitizedLog = writeCacheVerifySanitizedLog(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation,
      execution
    );
    const result = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", commandId],
      ["outcome", "PASS"],
      ["cacheInventoryFingerprint", cacheInventory.fingerprint],
      ["stdoutByteLength", execution.stdoutByteLength],
      ["stdoutSha256", sha256Bytes(execution.stdout)],
      ["stderrByteLength", execution.stderrByteLength],
      ["stderrSha256", sha256Bytes(execution.stderr)],
      ["state", "cache-verified"],
      ["signalAuthority", false]
    ]);
    const receipts = buildCacheVerifyReceipts({
      cacheInventoryFingerprint: cacheInventory.fingerprint,
      descriptorFingerprint: operation.descriptorFingerprint,
      environmentInventoryFingerprint: environment.inventoryFingerprint,
      execution,
      liveHomeProof,
      observation: postObservation,
      postAudit,
      preAudit,
      result,
      sanitizedLog,
      state
    });
    assertNoLiveHomeRetention(liveHomeProof, result);
    if (!state.operationReceipts) state.operationReceipts = new Map();
    if (!state.operationResults) state.operationResults = new Map();
    state.operationReceipts.set(commandId, receipts);
    state.operationResults.set(commandId, result);
    state.inFlightCommandId = undefined;
    state.operationLogDisposition = "sanitized";
    state.status = "cache-verified";
    execution.stdout.fill(0);
    execution.stderr.fill(0);
    execution = undefined;
    ownerToken = undefined;
    return result;
  } catch (error) {
    if (
      state.operationProcessTerminality === "terminal-proven"
      && state.operationLogDisposition === "unresolved"
    ) {
      try {
        discardNpmCacheVerifyLogsAfterFailedTerminal(state);
        state.operationLogDisposition = "scrubbed";
      } catch {
        state.operationLogDisposition = "unresolved";
      }
    }
    markAttemptOperationFailed(state);
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  } finally {
    wipeChildEnvironment(childEnvironment);
    clearOwnedAuditSnapshot(preSnapshot);
    clearOwnedAuditSnapshot(postSnapshot);
    execution?.stdout?.fill(0);
    execution?.stderr?.fill(0);
    ownerToken = undefined;
  }
}

export async function runRequiredBrowserProvisionNpmCiPreferOffline(
  liveHomeProof,
  attemptAuthority
) {
  const commandId = "owner.dependency.npm.ci-prefer-offline";
  const state = registeredAttemptState(attemptAuthority);
  if (state?.inFlightCommandId !== undefined) {
    attemptOperationFailure();
  }
  if (
    !state
    || state.status !== "cache-verified"
    || state.publicCommandIds?.[1] !== commandId
    || state.operationResults?.has(commandId)
  ) {
    if (state) markAttemptOperationFailed(state);
    attemptOperationFailure();
  }
  state.inFlightCommandId = commandId;
  state.status = "ci-prefer-offline-reserved";
  let execution;
  let childEnvironment;
  let preSnapshot;
  let postSnapshot;
  let ownerToken;
  let stagedInventory;
  let stagedDescriptorTransferred = false;
  try {
    const operation = ciPreferOfflineDescriptor();
    const initialObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "pre-node-modules"
    );
    exactDirectoryEntries(
      initialObservation.paths.logs,
      "logs",
      initialObservation.observation.repositoryObservation,
      ["npm-cache-verify.log"],
      state.layout.directoryIdentityFingerprints.logs
    );
    const cacheVerifyLink = acceptedCacheVerifyLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation
    );
    ownerToken = hashCanonicalProof(
      ATTEMPT_OWNER_TOKEN_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["attemptId", state.attemptId],
        [
          "bootstrapAuthorityBindingFingerprint",
          state.bootstrapAuthorityBindingFingerprint
        ]
      ])
    );
    state.status = "ci-prefer-offline-pre-auditing";
    preSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      initialObservation.observation
    );
    const preAudit = ownedAuditAggregate(
      state,
      commandId,
      "pre-launch",
      preSnapshot
    );
    clearOwnedAuditSnapshot(preSnapshot);
    preSnapshot = undefined;

    const preSpawnObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "pre-node-modules"
    );
    const environment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      preSpawnObservation.boundRoot.provisionRoot,
      ownerToken
    );
    childEnvironment = environment.childEnvironment;
    if (
      environment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      attemptOperationFailure();
    }
    state.status = "ci-prefer-offline-running";
    state.operationLogDisposition = "unresolved";
    state.operationProcessTerminality = "uncertain";
    execution = await executeInitialOwnedNpmOperation({
      commandId,
      childEnvironment,
      liveHomeProof,
      nodePath: preSpawnObservation.nodeRuntime.canonicalPath,
      npmArguments: operation.npmArguments,
      npmCliPath: preSpawnObservation.npmCli.npmCliPath,
      npmProcessTitle: "npm ci",
      ownerToken,
      state,
      staticObservation: preSpawnObservation.observation
    });
    if (!state.auxiliaryProcessUncertainty) {
      if (!execution.spawnOccurred && execution.spawnError) {
        state.operationProcessTerminality = "no-process-awaiting-post-audit";
      } else if (execution.closeObserved && execution.survivorCount === 0) {
        state.operationProcessTerminality = "child-closed-awaiting-post-audit";
      }
    }
    childEnvironment = undefined;
    state.status = "ci-prefer-offline-post-auditing";
    postSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      preSpawnObservation.observation
    );
    const hasSafeRootPid = Number.isSafeInteger(execution.rootPid)
      && execution.rootPid > 0;
    if (!hasSafeRootPid && execution.spawnOccurred) {
      attemptOperationFailure();
    }
    const postTerminalProcessGroupMemberCount = hasSafeRootPid
      ? postSnapshot.rows.filter((row) => row.pgid === execution.rootPid).length
      : 0;
    execution.unknownProcessGroupMemberCount = Math.max(
      execution.unknownProcessGroupMemberCount,
      postTerminalProcessGroupMemberCount
    );
    execution.unprovenCount = Math.max(
      execution.unprovenCount,
      postTerminalProcessGroupMemberCount
    );
    const postAudit = ownedAuditAggregate(
      state,
      commandId,
      "post-terminal",
      postSnapshot
    );
    if (
      postTerminalProcessGroupMemberCount === 0
      && (
        state.operationProcessTerminality
          === "child-closed-awaiting-post-audit"
        || state.operationProcessTerminality
          === "no-process-awaiting-post-audit"
      )
    ) {
      state.operationProcessTerminality = "terminal-proven";
    }
    clearOwnedAuditSnapshot(postSnapshot);
    postSnapshot = undefined;
    const postObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    const postEnvironment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      postObservation.boundRoot.provisionRoot,
      ownerToken
    );
    wipeChildEnvironment(postEnvironment.childEnvironment);
    postEnvironment.childEnvironment = undefined;
    if (
      postEnvironment.inventoryFingerprint !== environment.inventoryFingerprint
      || postEnvironment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
      || postObservation.cwdIdentityFingerprint
        !== preSpawnObservation.cwdIdentityFingerprint
      || postObservation.nodeRuntime.identityFingerprint
        !== preSpawnObservation.nodeRuntime.identityFingerprint
      || postObservation.npmCli.pathFingerprint
        !== preSpawnObservation.npmCli.pathFingerprint
      || postObservation.npmCli.physicalIdentityFingerprint
        !== preSpawnObservation.npmCli.physicalIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    if (
      execution.spawnError
      || !execution.spawnOccurred
      || !execution.abortAuthorityEstablished
      || !execution.identityEstablished
      || !execution.exitObserved
      || !execution.closeObserved
      || execution.exitCode !== 0
      || execution.exitSignal !== null
      || execution.failureTrigger !== "none"
      || execution.lifecycleCode !== "exit-zero"
      || execution.termAttempted
      || execution.termSent
      || execution.killAttempted
      || execution.killSent
      || execution.timedOut
      || execution.stdoutOverflow
      || execution.stderrOverflow
      || execution.unprovenCount !== 0
      || execution.survivorCount !== 0
      || execution.stdoutByteLength
        > operation.descriptor.outputPolicy.stdoutMaxBytes
      || execution.stderrByteLength
        > operation.descriptor.outputPolicy.stderrMaxBytes
      || state.operationProcessTerminality !== "terminal-proven"
    ) {
      attemptOperationFailure();
    }
    state.status = "ci-prefer-offline-inventorying";
    const postCiCacheInventory = inventoryInitialNpmCache(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    stagedInventory = inventoryStableStagedNodeModules(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    state.status = "ci-prefer-offline-sanitizing";
    const sanitizedLog = writeNpmCiPreferOfflineSanitizedLog(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation,
      execution,
      stagedInventory
    );
    const result = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", commandId],
      ["outcome", "PASS"],
      ["stagedNodeModulesInventoryFingerprint", stagedInventory.fingerprint],
      ["stdoutByteLength", execution.stdoutByteLength],
      ["stdoutSha256", sha256Bytes(execution.stdout)],
      ["stderrByteLength", execution.stderrByteLength],
      ["stderrSha256", sha256Bytes(execution.stderr)],
      ["state", "dependencies-installed-staged"],
      ["signalAuthority", false]
    ]);
    state.status = "ci-prefer-offline-committing";
    const receipts = buildNpmCiPreferOfflineReceipts({
      cacheVerifyLink,
      descriptorFingerprint: operation.descriptorFingerprint,
      environmentInventoryFingerprint: environment.inventoryFingerprint,
      execution,
      liveHomeProof,
      observation: postObservation,
      postAudit,
      preAudit,
      result,
      sanitizedLog,
      stagedInventory,
      state
    });
    assertNoLiveHomeRetention(liveHomeProof, result);
    if (!state.operationReceipts) state.operationReceipts = new Map();
    if (!state.operationResults) state.operationResults = new Map();
    state.operationReceipts.set(commandId, receipts);
    state.operationResults.set(commandId, result);
    state.postCiCacheInventoryFingerprint = postCiCacheInventory.fingerprint;
    state.stagedNodeModulesDescriptor = stagedInventory.descriptor;
    state.stagedNodeModulesInventory = stagedInventory.inventory;
    state.stagedNodeModulesInventoryFingerprint = stagedInventory.fingerprint;
    state.stagedNodeModulesRootIdentityFingerprint =
      stagedInventory.rootIdentityFingerprint;
    stagedDescriptorTransferred = true;
    state.inFlightCommandId = undefined;
    state.operationLogDisposition = "sanitized";
    state.status = "dependencies-installed-staged";
    execution.stdout.fill(0);
    execution.stderr.fill(0);
    execution = undefined;
    ownerToken = undefined;
    return result;
  } catch (error) {
    if (
      state.operationProcessTerminality === "terminal-proven"
      && state.operationLogDisposition === "unresolved"
    ) {
      try {
        discardNpmCiLogsAfterFailedTerminal(state);
        state.operationLogDisposition = "scrubbed";
      } catch {
        state.operationLogDisposition = "unresolved";
      }
    }
    markAttemptOperationFailed(state);
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  } finally {
    if (
      stagedInventory?.descriptor !== undefined
      && !stagedDescriptorTransferred
    ) {
      try {
        closeSync(stagedInventory.descriptor);
      } catch {
        // A rejected staged-tree descriptor is never reused.
      }
    }
    wipeChildEnvironment(childEnvironment);
    clearOwnedAuditSnapshot(preSnapshot);
    clearOwnedAuditSnapshot(postSnapshot);
    execution?.stdout?.fill(0);
    execution?.stderr?.fill(0);
    ownerToken = undefined;
  }
}

export async function runRequiredBrowserProvisionNpmLsProvisionStaged(
  liveHomeProof,
  attemptAuthority
) {
  const commandId = "owner.dependency.npm.ls-provision-staged";
  const state = registeredAttemptState(attemptAuthority);
  if (state?.inFlightCommandId !== undefined) {
    attemptOperationFailure();
  }
  if (
    !state
    || state.status !== "dependencies-installed-staged"
    || state.publicCommandIds?.[2] !== commandId
    || state.operationResults?.has(commandId)
    || state.operationReceipts?.has(commandId)
  ) {
    if (state) markAttemptOperationFailed(state);
    attemptOperationFailure();
  }
  state.inFlightCommandId = commandId;
  state.status = "ls-provision-staged-reserved";
  let execution;
  let childEnvironment;
  let preSnapshot;
  let postSnapshot;
  let ownerToken;
  let preStagedInventory;
  let postStagedInventory;
  try {
    const operation = npmLsProvisionStagedDescriptor();
    const initialObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    exactDirectoryEntries(
      initialObservation.paths.logs,
      "logs",
      initialObservation.observation.repositoryObservation,
      ["npm-cache-verify.log", "npm-ci-prefer-offline.log"],
      state.layout.directoryIdentityFingerprints.logs
    );
    const cacheVerifyLink = acceptedCacheVerifyLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation,
      false
    );
    const ciPreferOfflineLink = acceptedCiPreferOfflineLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation,
      cacheVerifyLink
    );
    const preNpmCacheInventory = inventoryInitialNpmCache(
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );
    if (
      preNpmCacheInventory.fingerprint
        !== state.postCiCacheInventoryFingerprint
    ) {
      attemptOperationFailure();
    }
    preStagedInventory = inventoryStableStagedNodeModules(
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );
    if (
      preStagedInventory.fingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || preStagedInventory.fingerprint
        !== ciPreferOfflineLink.stagedNodeModulesInventoryFingerprint
      || preStagedInventory.rootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
      || preStagedInventory.rootIdentityFingerprint
        !== ciPreferOfflineLink.stagedNodeModulesRootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    closeSync(preStagedInventory.descriptor);
    preStagedInventory.descriptor = undefined;

    ownerToken = hashCanonicalProof(
      ATTEMPT_OWNER_TOKEN_DOMAIN,
      nullRecord([
        ["schemaVersion", 1],
        ["attemptId", state.attemptId],
        [
          "bootstrapAuthorityBindingFingerprint",
          state.bootstrapAuthorityBindingFingerprint
        ]
      ])
    );
    state.status = "ls-provision-staged-pre-auditing";
    preSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      initialObservation.observation
    );
    const preAudit = ownedAuditAggregate(
      state,
      commandId,
      "pre-launch",
      preSnapshot
    );
    clearOwnedAuditSnapshot(preSnapshot);
    preSnapshot = undefined;

    const preSpawnObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    const environment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      preSpawnObservation.boundRoot.provisionRoot,
      ownerToken
    );
    childEnvironment = environment.childEnvironment;
    if (
      environment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
    ) {
      attemptOperationFailure();
    }
    state.status = "ls-provision-staged-running";
    state.operationLogDisposition = "unresolved";
    state.operationProcessTerminality = "uncertain";
    execution = await executeInitialOwnedNpmOperation({
      commandId,
      childEnvironment,
      liveHomeProof,
      nodePath: preSpawnObservation.nodeRuntime.canonicalPath,
      npmArguments: operation.npmArguments,
      npmCliPath: preSpawnObservation.npmCli.npmCliPath,
      npmProcessTitle: "npm ls",
      ownerToken,
      state,
      staticObservation: preSpawnObservation.observation
    });
    if (!state.auxiliaryProcessUncertainty) {
      if (!execution.spawnOccurred && execution.spawnError) {
        state.operationProcessTerminality = "no-process-awaiting-post-audit";
      } else if (execution.closeObserved && execution.survivorCount === 0) {
        state.operationProcessTerminality = "child-closed-awaiting-post-audit";
      }
    }
    childEnvironment = undefined;
    state.status = "ls-provision-staged-post-auditing";
    postSnapshot = await collectOwnedAuditSnapshotPair(
      liveHomeProof,
      state,
      ownerToken,
      preSpawnObservation.observation
    );
    const hasSafeRootPid = Number.isSafeInteger(execution.rootPid)
      && execution.rootPid > 0;
    if (!hasSafeRootPid && execution.spawnOccurred) {
      attemptOperationFailure();
    }
    const postTerminalProcessGroupMemberCount = hasSafeRootPid
      ? postSnapshot.rows.filter((row) => row.pgid === execution.rootPid).length
      : 0;
    execution.unknownProcessGroupMemberCount = Math.max(
      execution.unknownProcessGroupMemberCount,
      postTerminalProcessGroupMemberCount
    );
    execution.unprovenCount = Math.max(
      execution.unprovenCount,
      postTerminalProcessGroupMemberCount
    );
    const postAudit = ownedAuditAggregate(
      state,
      commandId,
      "post-terminal",
      postSnapshot
    );
    if (
      postTerminalProcessGroupMemberCount === 0
      && (
        state.operationProcessTerminality
          === "child-closed-awaiting-post-audit"
        || state.operationProcessTerminality
          === "no-process-awaiting-post-audit"
      )
    ) {
      state.operationProcessTerminality = "terminal-proven";
    }
    clearOwnedAuditSnapshot(postSnapshot);
    postSnapshot = undefined;
    const postObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    const postEnvironment = materializeInitialAttemptEnvironment(
      liveHomeProof,
      commandId,
      operation.descriptor.environmentBinding,
      postObservation.boundRoot.provisionRoot,
      ownerToken
    );
    wipeChildEnvironment(postEnvironment.childEnvironment);
    postEnvironment.childEnvironment = undefined;
    if (
      postEnvironment.inventoryFingerprint !== environment.inventoryFingerprint
      || postEnvironment.inventoryFingerprint
        !== state.environmentInventoryFingerprints[commandId]
      || postObservation.cwdIdentityFingerprint
        !== preSpawnObservation.cwdIdentityFingerprint
      || postObservation.nodeRuntime.identityFingerprint
        !== preSpawnObservation.nodeRuntime.identityFingerprint
      || postObservation.npmCli.pathFingerprint
        !== preSpawnObservation.npmCli.pathFingerprint
      || postObservation.npmCli.physicalIdentityFingerprint
        !== preSpawnObservation.npmCli.physicalIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    if (
      execution.spawnError
      || !execution.spawnOccurred
      || !execution.abortAuthorityEstablished
      || !execution.identityEstablished
      || !execution.exitObserved
      || !execution.closeObserved
      || execution.exitCode !== 0
      || execution.exitSignal !== null
      || execution.failureTrigger !== "none"
      || execution.lifecycleCode !== "exit-zero"
      || execution.termAttempted
      || execution.termSent
      || execution.killAttempted
      || execution.killSent
      || execution.timedOut
      || execution.stdoutOverflow
      || execution.stderrOverflow
      || execution.unprovenCount !== 0
      || execution.survivorCount !== 0
      || execution.stdoutByteLength
        > operation.descriptor.outputPolicy.stdoutMaxBytes
      || execution.stderrByteLength
        > operation.descriptor.outputPolicy.stderrMaxBytes
      || state.operationProcessTerminality !== "terminal-proven"
    ) {
      attemptOperationFailure();
    }
    state.status = "ls-provision-staged-validating";
    const postNpmCacheInventory = inventoryInitialNpmCache(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    if (
      postNpmCacheInventory.fingerprint
        !== preNpmCacheInventory.fingerprint
      || postNpmCacheInventory.fingerprint
        !== state.postCiCacheInventoryFingerprint
    ) {
      attemptOperationFailure();
    }
    postStagedInventory = inventoryStableStagedNodeModules(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    if (
      postStagedInventory.fingerprint !== preStagedInventory.fingerprint
      || postStagedInventory.fingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || postStagedInventory.rootIdentityFingerprint
        !== preStagedInventory.rootIdentityFingerprint
      || postStagedInventory.rootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    closeSync(postStagedInventory.descriptor);
    postStagedInventory.descriptor = undefined;
    const installPackage = readInitialInstallPackageIdentity(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation
    );
    const dependencyTree = parseNpmLsProvisionStagedTree(
      execution.stdout,
      installPackage.name,
      installPackage.version
    );
    state.status = "ls-provision-staged-sanitizing";
    const sanitizedLog = writeNpmLsProvisionStagedSanitizedLog(
      postObservation.paths,
      state,
      postObservation.observation.repositoryObservation,
      execution,
      dependencyTree,
      preNpmCacheInventory.fingerprint,
      postNpmCacheInventory.fingerprint,
      preStagedInventory.fingerprint,
      postStagedInventory.fingerprint
    );
    const result = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["commandId", commandId],
      ["outcome", "PASS"],
      ["npmDependencyTreeFingerprint", dependencyTree.fingerprint],
      [
        "stagedNodeModulesInventoryFingerprint",
        postStagedInventory.fingerprint
      ],
      ["stdoutByteLength", execution.stdoutByteLength],
      ["stdoutSha256", sha256Bytes(execution.stdout)],
      ["stderrByteLength", execution.stderrByteLength],
      ["stderrSha256", sha256Bytes(execution.stderr)],
      ["state", "dependencies-listed-staged"],
      ["signalAuthority", false]
    ]);
    state.status = "ls-provision-staged-committing";
    const receipts = buildNpmLsProvisionStagedReceipts({
      cacheVerifyLink,
      ciPreferOfflineLink,
      dependencyTree,
      descriptorFingerprint: operation.descriptorFingerprint,
      environmentInventoryFingerprint: environment.inventoryFingerprint,
      execution,
      liveHomeProof,
      observation: postObservation,
      postAudit,
      postNpmCacheInventoryFingerprint: postNpmCacheInventory.fingerprint,
      postStagedNodeModulesInventoryFingerprint: postStagedInventory.fingerprint,
      preAudit,
      preNpmCacheInventoryFingerprint: preNpmCacheInventory.fingerprint,
      preStagedNodeModulesInventoryFingerprint: preStagedInventory.fingerprint,
      result,
      sanitizedLog,
      state
    });
    assertNoLiveHomeRetention(liveHomeProof, result);
    state.operationReceipts.set(commandId, receipts);
    state.operationResults.set(commandId, result);
    state.stagedNpmDependencyTreeFingerprint = dependencyTree.fingerprint;
    state.inFlightCommandId = undefined;
    state.status = "dependencies-listed-staged";
    state.operationLogDisposition = "sanitized";
    execution.stdout.fill(0);
    execution.stderr.fill(0);
    execution = undefined;
    ownerToken = undefined;
    return result;
  } catch (error) {
    if (
      state.operationProcessTerminality === "terminal-proven"
      && state.operationLogDisposition === "unresolved"
    ) {
      try {
        discardNpmLsProvisionStagedLogsAfterFailedTerminal(state);
        state.operationLogDisposition = "scrubbed";
      } catch {
        state.operationLogDisposition = "unresolved";
      }
    }
    markAttemptOperationFailed(state);
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  } finally {
    for (const inventory of [preStagedInventory, postStagedInventory]) {
      if (inventory?.descriptor !== undefined) {
        try {
          closeSync(inventory.descriptor);
        } catch {
          // A rejected fresh staged-tree observation is never reused.
        }
      }
    }
    wipeChildEnvironment(childEnvironment);
    clearOwnedAuditSnapshot(preSnapshot);
    clearOwnedAuditSnapshot(postSnapshot);
    execution?.stdout?.fill(0);
    execution?.stderr?.fill(0);
    ownerToken = undefined;
  }
}

export function activateRequiredBrowserProvisionStagedDependencies(
  liveHomeProof,
  attemptAuthority
) {
  const operationId = INITIAL_STAGED_ACTIVATION_OPERATION_ID;
  const state = registeredAttemptState(attemptAuthority);
  if (state?.inFlightCommandId !== undefined) {
    attemptOperationFailure();
  }
  if (
    !state
    || state.status !== "dependencies-listed-staged"
    || state.publicCommandIds?.[2]
      !== "owner.dependency.npm.ls-provision-staged"
    || state.activationFilesystemDisposition !== "not-started"
    || state.filesystemOperationResults?.has(operationId)
    || state.filesystemOperationReceipts?.has(operationId)
  ) {
    if (state) markAttemptOperationFailed(state);
    attemptOperationFailure();
  }
  state.inFlightCommandId = operationId;
  state.status = "activation-reserved";
  state.activationFilesystemDisposition = "unresolved";
  let retainedRepository;
  let preStagedInventory;
  let postStagedInventory;
  let repositoryEntriesBeforePublication;
  let publicationAttempted = false;
  try {
    state.status = "activation-prevalidating";
    const initialObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    exactDirectoryEntries(
      initialObservation.paths.logs,
      "logs",
      initialObservation.observation.repositoryObservation,
      [
        "npm-cache-verify.log",
        "npm-ci-prefer-offline.log",
        "npm-ls-provision-staged.log"
      ],
      state.layout.directoryIdentityFingerprints.logs
    );
    const cacheVerifyLink = acceptedCacheVerifyLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation,
      false
    );
    const ciPreferOfflineLink = acceptedCiPreferOfflineLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation,
      cacheVerifyLink
    );
    const npmLsProvisionStagedLink = acceptedNpmLsProvisionStagedLink(
      state,
      initialObservation.paths,
      initialObservation.observation.repositoryObservation,
      cacheVerifyLink,
      ciPreferOfflineLink
    );
    if (
      ciPreferOfflineLink.stagedNodeModulesInventoryFingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || ciPreferOfflineLink.stagedNodeModulesRootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
      || npmLsProvisionStagedLink.stagedNodeModulesInventoryFingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || npmLsProvisionStagedLink.stagedNodeModulesRootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
      || npmLsProvisionStagedLink.npmDependencyTreeFingerprint
        !== state.stagedNpmDependencyTreeFingerprint
    ) {
      attemptOperationFailure();
    }
    const currentNpmCacheInventory = inventoryInitialNpmCache(
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );
    if (
      currentNpmCacheInventory.fingerprint
        !== state.postCiCacheInventoryFingerprint
    ) {
      attemptOperationFailure();
    }
    assertRetainedStagedNodeModulesDescriptor(
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );
    preStagedInventory = inventoryStableStagedNodeModules(
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );
    if (
      preStagedInventory.fingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || preStagedInventory.rootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    closeSync(preStagedInventory.descriptor);
    preStagedInventory.descriptor = undefined;
    if (
      attemptLstat(join(
        initialObservation.paths.quarantine,
        "node_modules-partial"
      )) !== undefined
      || attemptLstat(join(
        initialObservation.paths.rollback,
        "node_modules"
      )) !== undefined
    ) {
      attemptOperationFailure();
    }
    retainedRepository = openInitialActivationRepositoryRoot(
      initialObservation.observation.repositoryObservation
    );
    assertInitialActiveNodeModulesAbsent(
      retainedRepository,
      initialObservation.observation.repositoryObservation,
      state,
      true
    );
    validateInitialActiveLinkTargetChain(
      retainedRepository,
      initialObservation.paths,
      state,
      initialObservation.observation.repositoryObservation
    );

    const prePublicationObservation =
      observeInitialAttemptOperationBindings(
        liveHomeProof,
        attemptAuthority,
        state,
        "post-ci-staged"
      );
    if (
      prePublicationObservation.observation.repositoryObservation
        .repositoryBindingFingerprint
        !== initialObservation.observation.repositoryObservation
          .repositoryBindingFingerprint
      || prePublicationObservation.observation.sourceSeedFingerprint
        !== initialObservation.observation.sourceSeedFingerprint
    ) {
      attemptOperationFailure();
    }
    assertInitialActivationRepositoryRoot(
      retainedRepository,
      prePublicationObservation.observation.repositoryObservation
    );
    assertInitialActiveNodeModulesAbsent(
      retainedRepository,
      prePublicationObservation.observation.repositoryObservation,
      state,
      false
    );
    repositoryEntriesBeforePublication =
      snapshotInitialActivationRepositoryEntries(
        retainedRepository,
        prePublicationObservation.observation.repositoryObservation
      );
    crossInitialActivationPrePublishTestBarrierIfArmed(
      state,
      prePublicationObservation.observation.repositoryObservation
    );
    const relativeTarget =
      `.tmp/dependency-provision-${state.attemptId}/install/node_modules`;
    const activePaths = initialActiveNodeModulesPaths(
      retainedRepository,
      prePublicationObservation.observation.repositoryObservation
    );
    state.status = "activation-publishing";
    publicationAttempted = true;
    symlinkSync(relativeTarget, activePaths.identityPath);
    refreshInitialActivationRepositoryAfterPublication(
      retainedRepository,
      prePublicationObservation.observation.repositoryObservation,
      repositoryEntriesBeforePublication
    );
    fsyncSync(retainedRepository.descriptor);
    injectInitialActivationPostPublishFailureIfArmed(state);

    state.status = "activation-postvalidating";
    const targetRootIdentityFingerprint = validateInitialActiveLinkTargetChain(
      retainedRepository,
      prePublicationObservation.paths,
      state,
      prePublicationObservation.observation.repositoryObservation
    );
    if (
      targetRootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    const firstActiveBinding = observeInitialActiveNodeModulesLink(
      retainedRepository,
      prePublicationObservation.observation.repositoryObservation,
      state,
      relativeTarget,
      targetRootIdentityFingerprint
    );
    postStagedInventory = inventoryStableStagedNodeModules(
      prePublicationObservation.paths,
      state,
      prePublicationObservation.observation.repositoryObservation
    );
    if (
      postStagedInventory.fingerprint
        !== state.stagedNodeModulesInventoryFingerprint
      || postStagedInventory.fingerprint !== preStagedInventory.fingerprint
      || postStagedInventory.rootIdentityFingerprint
        !== state.stagedNodeModulesRootIdentityFingerprint
      || postStagedInventory.rootIdentityFingerprint
        !== preStagedInventory.rootIdentityFingerprint
    ) {
      attemptOperationFailure();
    }
    closeSync(postStagedInventory.descriptor);
    postStagedInventory.descriptor = undefined;
    const finalObservation = observeInitialAttemptOperationBindings(
      liveHomeProof,
      attemptAuthority,
      state,
      "post-ci-staged"
    );
    exactDirectoryEntries(
      finalObservation.paths.logs,
      "logs",
      finalObservation.observation.repositoryObservation,
      [
        "npm-cache-verify.log",
        "npm-ci-prefer-offline.log",
        "npm-ls-provision-staged.log"
      ],
      state.layout.directoryIdentityFingerprints.logs
    );
    if (
      attemptLstat(join(
        finalObservation.paths.quarantine,
        "node_modules-partial"
      )) !== undefined
      || attemptLstat(join(
        finalObservation.paths.rollback,
        "node_modules"
      )) !== undefined
    ) {
      attemptOperationFailure();
    }
    const finalTargetRootIdentityFingerprint =
      validateInitialActiveLinkTargetChain(
        retainedRepository,
        finalObservation.paths,
        state,
        finalObservation.observation.repositoryObservation
      );
    crossInitialActivationFinalTargetSwapTestBarrierIfArmed(
      state,
      finalObservation.paths,
      finalObservation.observation.repositoryObservation
    );
    const activeBinding = observeInitialActiveNodeModulesLink(
      retainedRepository,
      finalObservation.observation.repositoryObservation,
      state,
      relativeTarget,
      finalTargetRootIdentityFingerprint
    );
    if (
      activeBinding.fingerprint !== firstActiveBinding.fingerprint
      || activeBinding.activeNodeModulesLinkIdentityFingerprint
        !== firstActiveBinding.activeNodeModulesLinkIdentityFingerprint
      || activeBinding.activeNodeModulesLinkTargetFingerprint
        !== firstActiveBinding.activeNodeModulesLinkTargetFingerprint
      || activeBinding.activeNodeModulesPathFingerprint
        !== firstActiveBinding.activeNodeModulesPathFingerprint
    ) {
      attemptOperationFailure();
    }
    const result = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      ["mode", "initial"],
      ["operationId", operationId],
      ["outcome", "PASS"],
      ["activeNodeModulesBindingFingerprint", activeBinding.fingerprint],
      [
        "stagedNodeModulesInventoryFingerprint",
        state.stagedNodeModulesInventoryFingerprint
      ],
      [
        "npmDependencyTreeFingerprint",
        state.stagedNpmDependencyTreeFingerprint
      ],
      ["state", "dependencies-activated-initial"],
      ["signalAuthority", false]
    ]);
    assertNoLiveHomeRetention(liveHomeProof, result);
    const receipts = buildInitialStagedActivationReceipts({
      activeBinding,
      cacheVerifyLink,
      ciPreferOfflineLink,
      liveHomeProof,
      npmLsProvisionStagedLink,
      result,
      state
    });
    closeSync(retainedRepository.descriptor);
    retainedRepository.descriptor = undefined;

    state.status = "activation-committing";
    if (!state.filesystemOperationReceipts) {
      state.filesystemOperationReceipts = new Map();
    }
    if (!state.filesystemOperationResults) {
      state.filesystemOperationResults = new Map();
    }
    state.filesystemOperationReceipts.set(operationId, receipts);
    state.filesystemOperationResults.set(operationId, result);
    state.activeNodeModulesBindingFingerprint = activeBinding.fingerprint;
    state.activeNodeModulesLinkIdentityFingerprint =
      activeBinding.activeNodeModulesLinkIdentityFingerprint;
    state.activeNodeModulesLinkTargetFingerprint =
      activeBinding.activeNodeModulesLinkTargetFingerprint;
    state.activeNodeModulesPathFingerprint =
      activeBinding.activeNodeModulesPathFingerprint;
    state.inFlightCommandId = undefined;
    state.status = "dependencies-activated-initial";
    state.activationFilesystemDisposition = "active-link-committed";
    return result;
  } catch (error) {
    if (
      !publicationAttempted
      && state.activationFilesystemDisposition === "unresolved"
    ) {
      proveInitialActivationNoMutation(state);
    }
    markAttemptOperationFailed(state);
    if (
      error?.message
        === "Required-browser initial provision owned operation rejected."
    ) {
      throw error;
    }
    attemptOperationFailure();
  } finally {
    for (const inventory of [preStagedInventory, postStagedInventory]) {
      if (inventory?.descriptor !== undefined) {
        try {
          closeSync(inventory.descriptor);
        } catch {
          state.activationFilesystemDisposition = "unresolved";
        }
      }
    }
    if (retainedRepository?.descriptor !== undefined) {
      try {
        closeSync(retainedRepository.descriptor);
      } catch {
        state.activationFilesystemDisposition = "unresolved";
      }
    }
  }
}

export function finalizeRequiredBrowserProvisionActivationLock(
  liveHomeProof,
  attemptAuthority
) {
  const state = registeredAttemptState(attemptAuthority);
  if (
    !state
    || !state.activationLock
    || (
      state.activationFilesystemDisposition !== "not-started"
      && state.activationFilesystemDisposition !== "no-mutation-proven"
    )
    || (
      state.status !== "lock-validated"
      && state.status !== "layout-prepared-fresh"
      && state.status !== "cache-verified"
      && state.status !== "dependencies-installed-staged"
      && state.status !== "dependencies-listed-staged"
      && state.status !== "operation-failed"
    )
  ) {
    attemptLockFailure();
  }
  state.status = "lock-releasing";
  try {
    if (
      state.auxiliaryProcessUncertainty !== false
      || (
        state.operationProcessTerminality !== "not-started"
        && state.operationProcessTerminality !== "terminal-proven"
      )
      || (
        state.operationLogDisposition !== "not-started"
        && state.operationLogDisposition !== "sanitized"
        && state.operationLogDisposition !== "scrubbed"
      )
    ) {
      attemptLockFailure();
    }
    assertLiveHomeProof(liveHomeProof);
    if (
      state.liveHomeProof !== liveHomeProof
      || state.attemptAuthority !== attemptAuthority
    ) {
      attemptLockFailure();
    }
    const attemptBinding =
      readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
        liveHomeProof,
        attemptAuthority
      );
    const attemptAuthorityBindingFingerprint = hashCanonicalProof(
      ATTEMPT_AUTHORITY_BINDING_DOMAIN,
      attemptBinding
    );
    if (
      attemptAuthorityBindingFingerprint
        !== state.attemptAuthorityBindingFingerprint
      || attemptBinding.attemptId !== state.attemptId
      || attemptBinding.mode !== "initial"
    ) {
      attemptLockFailure();
    }
    const observation = buildStableBootstrapStaticObservation();
    if (
      observation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || observation.repositoryObservation.tmpBaseIdentityFingerprint
        !== state.activationLock.parentIdentityFingerprint
      || observation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLockFailure();
    }
    observeBoundInitialProvisionRoot(
      observation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    const activeObservation = observeActivationLockFile(
      state.activationLock.activePath,
      "activation-lock-active",
      observation.repositoryObservation,
      state.activationLock.lockBytes
    );
    if (
      activeObservation.identityFingerprint
        !== state.activationLock.activeFileIdentityFingerprint
      || stableLstat(state.activationLock.retainedPath) !== undefined
    ) {
      attemptLockFailure();
    }
    linkSync(
      state.activationLock.activePath,
      state.activationLock.retainedPath
    );
    fsyncDirectory(state.activationLock.parentPath);
    const linkedActiveObservation = observeActivationLockFile(
      state.activationLock.activePath,
      "activation-lock-active-linked",
      observation.repositoryObservation,
      state.activationLock.lockBytes,
      2n
    );
    const linkedRetainedObservation = observeActivationLockFile(
      state.activationLock.retainedPath,
      "activation-lock-retained-linked",
      observation.repositoryObservation,
      state.activationLock.lockBytes,
      2n
    );
    if (
      linkedActiveObservation.entry.dev !== activeObservation.entry.dev
      || linkedActiveObservation.entry.ino !== activeObservation.entry.ino
      || linkedActiveObservation.entry.uid !== activeObservation.entry.uid
      || linkedActiveObservation.entry.gid !== activeObservation.entry.gid
      || linkedActiveObservation.entry.mode !== activeObservation.entry.mode
      || linkedRetainedObservation.entry.dev !== activeObservation.entry.dev
      || linkedRetainedObservation.entry.ino !== activeObservation.entry.ino
      || linkedRetainedObservation.entry.uid !== activeObservation.entry.uid
      || linkedRetainedObservation.entry.gid !== activeObservation.entry.gid
      || linkedRetainedObservation.entry.mode !== activeObservation.entry.mode
    ) {
      attemptLockFailure();
    }
    unlinkSync(state.activationLock.activePath);
    fsyncDirectory(state.activationLock.parentPath);
    if (stableLstat(state.activationLock.activePath) !== undefined) {
      attemptLockFailure();
    }
    const retainedObservation = observeActivationLockFile(
      state.activationLock.retainedPath,
      "activation-lock-retained",
      observation.repositoryObservation,
      state.activationLock.lockBytes
    );
    if (
      retainedObservation.entry.dev !== activeObservation.entry.dev
      || retainedObservation.entry.ino !== activeObservation.entry.ino
      || retainedObservation.entry.uid !== activeObservation.entry.uid
      || retainedObservation.entry.gid !== activeObservation.entry.gid
      || retainedObservation.entry.mode !== activeObservation.entry.mode
      || retainedObservation.entry.nlink !== activeObservation.entry.nlink
    ) {
      attemptLockFailure();
    }
    const finalObservation = buildStableBootstrapStaticObservation();
    if (
      finalObservation.repositoryObservation.repositoryBindingFingerprint
        !== state.repositoryBindingFingerprint
      || finalObservation.repositoryObservation.tmpBaseIdentityFingerprint
        !== state.activationLock.parentIdentityFingerprint
      || finalObservation.sourceSeedFingerprint !== state.sourceSeedFingerprint
    ) {
      attemptLockFailure();
    }
    observeBoundInitialProvisionRoot(
      finalObservation.repositoryObservation,
      state.attemptId,
      state.provisionRootBindingFingerprint,
      state.provisionRootDescriptor
    );
    currentOwnHomeValue(liveHomeProof);
    const receipt = nullRecord([
      ["schemaVersion", 1],
      ["attemptId", state.attemptId],
      [
        "attemptAuthorityBindingFingerprint",
        state.attemptAuthorityBindingFingerprint
      ],
      ["lockFingerprint", state.activationLock.lockFingerprint],
      [
        "activeFileIdentityFingerprint",
        activeObservation.identityFingerprint
      ],
      [
        "retainedFileIdentityFingerprint",
        retainedObservation.identityFingerprint
      ],
      [
        "retainedRelativePathFingerprint",
        retainedObservation.pathFingerprint
      ],
      ["parentIdentityFingerprint", state.activationLock.parentIdentityFingerprint],
      ["activePathAbsent", true],
      ["state", "retained-released"],
      ["signalAuthority", false]
    ]);
    hashCanonicalProof(ACTIVATION_LOCK_RELEASE_RECEIPT_DOMAIN, receipt);
    assertNoLiveHomeRetention(liveHomeProof, receipt);
    releaseInitialLayoutTestBarrier(state);
    closeProvisionRootDescriptor(state);
    clearAttemptOperationSecrets(state);
    state.activationLock = undefined;
    state.attemptAuthority = undefined;
    state.liveHomeProof = undefined;
    state.status = "failed";
    return receipt;
  } catch (error) {
    failAttemptLaunchContextState(state);
    if (
      error?.message
        === "Required-browser provision activation-lock transaction rejected."
    ) {
      throw error;
    }
    attemptLockFailure();
  }
}

export const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS =
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

const syntheticScenarioSet = new Set(
  REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS
);
const syntheticCapabilities = new WeakMap();
const syntheticResults = new WeakSet();

function syntheticEvents(...eventCodes) {
  return Object.freeze(eventCodes);
}

function syntheticDefinition(fields) {
  return Object.freeze(fields);
}

const syntheticResultDefinitions = new Map([
  [
    "discovery-exits-while-awaited",
    syntheticDefinition({
      eventCodes: syntheticEvents("wait"),
      identityEstablished: false,
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: false,
      killAttempted: false,
      killSent: false,
      kind: "lifecycle",
      lifecycleCode: "exit-zero",
      operationSucceeded: true,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: false,
      termSent: false,
      violationCode: "none"
    })
  ],
  [
    "fast-exit-before-identity",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      identityEstablished: false,
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: false,
      killAttempted: false,
      killSent: false,
      kind: "lifecycle",
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: false,
      termSent: false,
      violationCode: "identity-mismatch"
    })
  ],
  [
    "pid-reused-before-term",
    syntheticDefinition({
      eventCodes: syntheticEvents("identity-established", "pre-term"),
      identityEstablished: true,
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: false,
      killAttempted: false,
      killSent: false,
      kind: "lifecycle",
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: true,
      termSent: false,
      violationCode: "identity-mismatch"
    })
  ],
  [
    "pid-reused-between-term-and-kill",
    syntheticDefinition({
      eventCodes: syntheticEvents(
        "identity-established",
        "pre-term",
        "wait",
        "pre-kill"
      ),
      identityEstablished: true,
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: true,
      killAttempted: true,
      killSent: false,
      kind: "lifecycle",
      lifecycleCode: "safety-unestablished",
      operationSucceeded: false,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: true,
      termSent: true,
      violationCode: "identity-mismatch"
    })
  ],
  [
    "term-exits-cleanly",
    syntheticDefinition({
      eventCodes: syntheticEvents("identity-established", "pre-term", "wait"),
      identityEstablished: true,
      identityRevalidatedBeforeKill: false,
      identityRevalidatedBeforeTerm: true,
      killAttempted: false,
      killSent: false,
      kind: "lifecycle",
      lifecycleCode: "reaped-after-term",
      operationSucceeded: true,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: true,
      termSent: true,
      violationCode: "none"
    })
  ],
  [
    "term-timeout-kill-exits",
    syntheticDefinition({
      eventCodes: syntheticEvents(
        "identity-established",
        "pre-term",
        "timeout",
        "pre-kill",
        "wait"
      ),
      identityEstablished: true,
      identityRevalidatedBeforeKill: true,
      identityRevalidatedBeforeTerm: true,
      killAttempted: true,
      killSent: true,
      kind: "lifecycle",
      lifecycleCode: "reaped-after-kill",
      operationSucceeded: true,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: true,
      termSent: true,
      violationCode: "none"
    })
  ],
  [
    "descendant-appears-between-term-and-kill",
    syntheticDefinition({
      eventCodes: syntheticEvents(
        "identity-established",
        "pre-term",
        "wait",
        "descendant-discovered",
        "pre-kill",
        "wait"
      ),
      identityEstablished: true,
      identityRevalidatedBeforeKill: true,
      identityRevalidatedBeforeTerm: true,
      killAttempted: true,
      killSent: true,
      kind: "lifecycle",
      lifecycleCode: "reaped-after-kill",
      operationSucceeded: true,
      rediscoveryCount: 1,
      spawnOccurred: true,
      survivorCount: 0,
      termAttempted: true,
      termSent: true,
      violationCode: "none"
    })
  ],
  [
    "descendant-survives-kill",
    syntheticDefinition({
      eventCodes: syntheticEvents(
        "identity-established",
        "pre-term",
        "timeout",
        "pre-kill",
        "final-survivor"
      ),
      identityEstablished: true,
      identityRevalidatedBeforeKill: true,
      identityRevalidatedBeforeTerm: true,
      killAttempted: true,
      killSent: true,
      kind: "lifecycle",
      lifecycleCode: "survivor-after-kill",
      operationSucceeded: false,
      rediscoveryCount: 0,
      spawnOccurred: true,
      survivorCount: 1,
      termAttempted: true,
      termSent: true,
      violationCode: "survivor"
    })
  ],
  [
    "home-changed-before-spawn",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      kind: "home",
      spawnOccurred: false
    })
  ],
  [
    "home-changed-after-spawn-before-postassert",
    syntheticDefinition({
      eventCodes: syntheticEvents("spawned", "postassert-rejected"),
      kind: "home",
      spawnOccurred: true
    })
  ],
  [
    "home-inherited-before-spawn",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      kind: "home",
      spawnOccurred: false
    })
  ],
  [
    "home-accessor-before-spawn",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      kind: "home",
      spawnOccurred: false
    })
  ],
  [
    "home-present-undefined-before-spawn",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      kind: "home",
      spawnOccurred: false
    })
  ],
  [
    "home-nul-before-spawn",
    syntheticDefinition({
      eventCodes: syntheticEvents(),
      kind: "home",
      spawnOccurred: false
    })
  ]
]);

function createSyntheticLifecycleResult(scenario, definition) {
  return nullRecord([
    ["schemaVersion", 1],
    ["fixtureSchemaVersion", 2],
    ["scenario", scenario],
    ["lifecycleCode", definition.lifecycleCode],
    ["violationCode", definition.violationCode],
    ["identityEstablished", definition.identityEstablished],
    [
      "identityRevalidatedBeforeTerm",
      definition.identityRevalidatedBeforeTerm
    ],
    [
      "identityRevalidatedBeforeKill",
      definition.identityRevalidatedBeforeKill
    ],
    ["termAttempted", definition.termAttempted],
    ["termSent", definition.termSent],
    ["killAttempted", definition.killAttempted],
    ["killSent", definition.killSent],
    ["rediscoveryCount", definition.rediscoveryCount],
    ["survivorCount", definition.survivorCount],
    ["eventCodes", definition.eventCodes],
    ["spawnOccurred", definition.spawnOccurred],
    ["operationSucceeded", definition.operationSucceeded],
    ["rawHomeRetained", false],
    ["signalAuthority", false]
  ]);
}

function createSyntheticHomeResult(scenario, definition) {
  return nullRecord([
    ["schemaVersion", 1],
    ["fixtureSchemaVersion", 2],
    ["scenario", scenario],
    ["identityEstablished", false],
    ["identityRevalidatedBeforeTerm", false],
    ["identityRevalidatedBeforeKill", false],
    ["termAttempted", false],
    ["termSent", false],
    ["killAttempted", false],
    ["killSent", false],
    ["rediscoveryCount", 0],
    ["survivorCount", 0],
    ["eventCodes", definition.eventCodes],
    ["spawnOccurred", definition.spawnOccurred],
    ["operationSucceeded", false],
    ["rawHomeRetained", false],
    ["signalAuthority", false]
  ]);
}

function createSyntheticResult(scenario) {
  const definition = syntheticResultDefinitions.get(scenario);
  if (!definition) {
    throw new Error("Synthetic lifecycle test scenario definition is missing.");
  }
  return definition.kind === "home"
    ? createSyntheticHomeResult(scenario, definition)
    : createSyntheticLifecycleResult(scenario, definition);
}

function syntheticStateFor(value) {
  const state =
    value !== null && (typeof value === "object" || typeof value === "function")
      ? syntheticCapabilities.get(value)
      : undefined;
  if (!state || state.status !== "active") {
    throw new Error(
      "Synthetic lifecycle test capability is unregistered, stale, forged, or terminal."
    );
  }
  return state;
}

function releaseSyntheticFixture(state) {
  if (state.releaseAttempted) return;
  state.releaseAttempted = true;
  state.status = "terminal";
  const reservation = state.fixtureReservation;
  state.fixtureReservation = undefined;
  releaseRequiredBrowserSyntheticLifecycleTestFixture(reservation);
}

export function createRequiredBrowserSyntheticLifecycleTestCapability(
  registeredTestFixtureCapability
) {
  const view = readTestFixtureCapabilityView(registeredTestFixtureCapability);
  if (view.schemaVersion !== 2) {
    throw new Error("Synthetic lifecycle tests require fixture schemaVersion 2.");
  }
  const fixtureReservation =
    reserveRequiredBrowserSyntheticLifecycleTestFixture(
      registeredTestFixtureCapability
    );
  try {
    const capability = OBJECT_FREEZE(OBJECT_CREATE(null));
    syntheticCapabilities.set(capability, {
      fixtureReservation,
      fixtureView: view,
      inFlight: false,
      releaseAttempted: false,
      remainingScenarioSlots: new Set(
        REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS
      ),
      status: "active"
    });
    return capability;
  } catch (error) {
    releaseRequiredBrowserSyntheticLifecycleTestFixture(fixtureReservation);
    throw error;
  }
}

export function runRequiredBrowserSyntheticLifecycleTestScenario(
  syntheticTestCapability,
  scenario
) {
  const state = syntheticStateFor(syntheticTestCapability);
  if (typeof scenario !== "string" || !syntheticScenarioSet.has(scenario)) {
    throw new Error("Synthetic lifecycle test scenario is not registered.");
  }
  if (state.inFlight) {
    throw new Error("Synthetic lifecycle test capability already has a scenario in flight.");
  }
  if (!state.remainingScenarioSlots.has(scenario)) {
    throw new Error("Synthetic lifecycle test scenario slot is already consumed.");
  }

  state.remainingScenarioSlots.delete(scenario);
  state.inFlight = true;
  try {
    const result = createSyntheticResult(scenario);
    if (state.remainingScenarioSlots.size === 0) {
      releaseSyntheticFixture(state);
    }
    syntheticResults.add(result);
    return result;
  } catch (error) {
    if (!state.releaseAttempted) {
      try {
        releaseSyntheticFixture(state);
      } catch {
        // The reservation is already consumed; retain the originating failure.
      }
    }
    throw error;
  } finally {
    state.inFlight = false;
  }
}

export function assertRequiredBrowserSyntheticLifecycleTestResult(value) {
  const registered =
    value !== null && (typeof value === "object" || typeof value === "function")
      ? syntheticResults.has(value)
      : false;
  if (!registered) {
    throw new Error(
      "Synthetic lifecycle test result is unregistered, stale, forged, or cloned."
    );
  }
}
