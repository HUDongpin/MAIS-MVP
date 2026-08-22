import type { LiveHomeProof } from "./live-home-protection.mjs";
import type {
  RequiredBrowserProvisionAttemptAuthority,
  RequiredBrowserProvisionBootstrapAuthority
} from "./required-browser-provision-attempt-authority.mjs";
import type { RequiredBrowserTestFixtureCapabilityV2 } from "./test-fixture-capability.mjs";

export type RequiredBrowserOwnedProcessCommandId =
  | "owner.audit.owner-token-table"
  | "owner.audit.pid-environment"
  | "owner.audit.process-table"
  | "owner.dependency.audit.owner-token-table-owned"
  | "owner.dependency.audit.owner-token-table-preflight"
  | "owner.dependency.audit.process-table-owned"
  | "owner.dependency.audit.process-table-preflight"
  | "owner.dependency.npm.cache-verify"
  | "owner.dependency.npm.ci-prefer-offline"
  | "owner.dependency.npm.ls-provision-active"
  | "owner.dependency.npm.ls-provision-staged"
  | "owner.dependency.npm.ls-requalification-active"
  | "owner.dependency.npm.ls-requalification-staged"
  | "owner.dependency.probe.which-npm"
  | "owner.dependency.source.git-head"
  | "owner.dependency.source.git-status"
  | "owner.next.build"
  | "owner.next.service"
  | "owner.playwright.discovery"
  | "owner.playwright.final";

export type RequiredBrowserOwnedProcessSanitizedOutputClass =
  | "next-build-evidence"
  | "next-service-evidence"
  | "playwright-discovery-evidence"
  | "playwright-final-evidence"
  | "process-table-evidence"
  | "pid-environment-evidence"
  | "owner-token-table-evidence"
  | "npm-cli-identity-evidence"
  | "git-status-evidence"
  | "git-head-evidence"
  | "npm-cache-evidence"
  | "npm-install-evidence"
  | "npm-tree-evidence";

export type RequiredBrowserOwnedProcessValidatedBindingName =
  | "next-cli"
  | "playwright-test-cli"
  | "required-config-path"
  | "service-port"
  | "owned-process-pid"
  | "npm-cli";

export type RequiredBrowserOwnedProcessLiteralArgvToken = Readonly<{
  kind: "literal";
  value: string;
}>;

export type RequiredBrowserOwnedProcessValidatedBindingArgvToken = Readonly<{
  kind: "validated-binding";
  name: RequiredBrowserOwnedProcessValidatedBindingName;
  prefix: "";
}>;

export type RequiredBrowserOwnedProcessArgvToken =
  | RequiredBrowserOwnedProcessLiteralArgvToken
  | RequiredBrowserOwnedProcessValidatedBindingArgvToken;

export type RequiredBrowserOwnedProcessExecutableBinding =
  | Readonly<{
      kind: "launcher-node-runtime";
    }>
  | Readonly<{
      kind: "fixed-system-executable";
      name: "ps";
      absolutePath: "/bin/ps";
    }>
  | Readonly<{
      kind: "fixed-system-executable";
      name: "which";
      absolutePath: "/usr/bin/which";
    }>
  | Readonly<{
      kind: "fixed-system-executable";
      name: "git";
      absolutePath: "/usr/bin/git";
    }>;

export type RequiredBrowserOwnedProcessCwdBinding =
  | Readonly<{ kind: "runner-repository-root" }>
  | Readonly<{ kind: "provision-repository-root" }>
  | Readonly<{ kind: "initial-provision-install-root" }>
  | Readonly<{ kind: "requalification-provision-install-root" }>;

export type RequiredBrowserOwnedProcessEnvironmentBinding =
  | "runner-main"
  | "owned-audit"
  | "provision-bootstrap-base"
  | "provision-bootstrap-git"
  | "provision-attempt-initial"
  | "provision-attempt-requalification";

export type RequiredBrowserOwnedProcessExecution =
  | "finite-direct-child"
  | "finite-owned-process"
  | "owned-service";

export type RequiredBrowserOwnedProcessBufferedParseOutputPolicy =
  | Readonly<{
      kind: "buffered-parse";
      stdoutMaxBytes: 4194304;
      stderrMaxBytes: 4194304;
      overflow: "reject";
      retainedLog: "none";
    }>
  | Readonly<{
      kind: "buffered-parse";
      stdoutMaxBytes: 16777216;
      stderrMaxBytes: 16777216;
      overflow: "reject";
      retainedLog: "none";
    }>
  | Readonly<{
      kind: "buffered-parse";
      stdoutMaxBytes: 33554432;
      stderrMaxBytes: 33554432;
      overflow: "reject";
      retainedLog: "none";
    }>;

export type RequiredBrowserOwnedProcessBufferedSanitizedLogOutputPolicy =
  | Readonly<{
      kind: "buffered-parse-and-sanitized-log";
      stdoutMaxBytes: 16777216;
      stderrMaxBytes: 16777216;
      overflow: "reject";
      retainedLogMaxBytes: 524288;
    }>
  | Readonly<{
      kind: "buffered-parse-and-sanitized-log";
      stdoutMaxBytes: 67108864;
      stderrMaxBytes: 67108864;
      overflow: "reject";
      retainedLogMaxBytes: 524288;
    }>;

export type RequiredBrowserOwnedProcessStreamedDigestOutputPolicy = Readonly<{
  kind: "streamed-digest-and-sanitized-log";
  stdoutDigestMaxBytes: 67108864;
  stderrDigestMaxBytes: 67108864;
  overflow: "reject";
  retainedLogMaxBytes: 524288;
}>;

export type RequiredBrowserOwnedProcessOutputPolicy =
  | RequiredBrowserOwnedProcessBufferedParseOutputPolicy
  | RequiredBrowserOwnedProcessBufferedSanitizedLogOutputPolicy
  | RequiredBrowserOwnedProcessStreamedDigestOutputPolicy;

export type RequiredBrowserOwnedProcessReadiness =
  | Readonly<{
      kind: "none";
    }>
  | Readonly<{
      kind: "http-status";
      overallTimeoutMs: 90000;
      pollIntervalMs: 250;
      requestTimeoutMs: 1500;
      redirectMode: "manual";
      acceptedStatusUpperBoundExclusive: 500;
      urlBinding: "service-base-url";
    }>;

export type RequiredBrowserOwnedProcessSignalPolicy =
  | Readonly<{
      kind: "identity-revalidated-direct-child-term-kill";
      identityEstablishmentAttempts: 40;
      identityEstablishmentPollIntervalMs: 25;
      termPollAttempts: 20;
      killPollAttempts: 20;
      pollIntervalMs: 150 | 250;
      handleCloseTimeoutMs: 3000;
      revalidateBeforeTerm: true;
      revalidateBeforeKill: true;
    }>
  | Readonly<{
      kind: "bootstrap-fixed-direct-child-explicit-bounded-abort";
      signalApi: "child-process-handle-only";
      spawnEventRequired: true;
      termGraceMs: 5000;
      killGraceMs: 5000;
      handleCloseTimeoutMs: 3000;
      revalidateBeforeTerm: false;
      revalidateBeforeKill: false;
    }>
  | Readonly<{
      kind: "identity-revalidated-owned-tree-term-kill";
      identityEstablishmentAttempts: 40;
      identityEstablishmentPollIntervalMs: 25;
      termPollAttempts: 20;
      killPollAttempts: 20;
      pollIntervalMs: 150 | 250;
      handleCloseTimeoutMs: 3000;
      revalidateBeforeTerm: true;
      revalidateBeforeKill: true;
    }>;

export type RequiredBrowserOwnedProcessTimeoutMs =
  | 30000
  | 120000
  | 180000
  | 300000
  | 600000
  | 900000
  | 2700000
  | "service-lifetime";

export type RequiredBrowserOwnedProcessCommandDescriptor<
  CommandId extends RequiredBrowserOwnedProcessCommandId =
    RequiredBrowserOwnedProcessCommandId
> = Readonly<{
  argvTemplate: readonly RequiredBrowserOwnedProcessArgvToken[];
  browserCapable: boolean;
  commandId: CommandId;
  cwdBinding: RequiredBrowserOwnedProcessCwdBinding;
  environmentBinding: RequiredBrowserOwnedProcessEnvironmentBinding;
  executableBinding: RequiredBrowserOwnedProcessExecutableBinding;
  execution: RequiredBrowserOwnedProcessExecution;
  outputPolicy: RequiredBrowserOwnedProcessOutputPolicy;
  processTreeOwned: boolean;
  readiness: RequiredBrowserOwnedProcessReadiness;
  sanitizedOutputClass: RequiredBrowserOwnedProcessSanitizedOutputClass;
  signalPolicy: RequiredBrowserOwnedProcessSignalPolicy;
  timeoutMs: RequiredBrowserOwnedProcessTimeoutMs;
}>;

export type RequiredBrowserOwnedProcessCommandDescriptors = readonly [
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.audit.owner-token-table">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.audit.pid-environment">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.audit.process-table">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.audit.owner-token-table-owned">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.audit.owner-token-table-preflight">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.audit.process-table-owned">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.audit.process-table-preflight">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.cache-verify">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.ci-prefer-offline">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.ls-provision-active">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.ls-provision-staged">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.ls-requalification-active">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.npm.ls-requalification-staged">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.probe.which-npm">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.source.git-head">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.dependency.source.git-status">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.next.build">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.next.service">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.playwright.discovery">,
  RequiredBrowserOwnedProcessCommandDescriptor<"owner.playwright.final">
];

export const REQUIRED_BROWSER_OWNED_PROCESS_COMMAND_DESCRIPTORS:
  RequiredBrowserOwnedProcessCommandDescriptors;

export type RequiredBrowserOwnedProcessFingerprintDomains = Readonly<{
  environmentInventory:
    "required-browser-owned-process-environment-inventory-v1";
  launchReceipt: "required-browser-owned-process-launch-receipt-v1";
  auditReceipt: "required-browser-owned-process-audit-v1";
  outcomeReceipt: "required-browser-owned-process-outcome-receipt-v1";
  lifecycleAuditReceipt:
    "required-browser-owned-lifecycle-audit-receipt-v1";
}>;

export const REQUIRED_BROWSER_OWNED_PROCESS_FINGERPRINT_DOMAINS:
  RequiredBrowserOwnedProcessFingerprintDomains;

export type RequiredBrowserOwnedProcessCatalogFingerprints = Readonly<{
  bootstrapScopeFingerprint: string;
  bootstrapCommandCatalogFingerprint: string;
  ownedProcessCatalogFingerprint: string;
}>;

export const REQUIRED_BROWSER_OWNED_PROCESS_CATALOG_FINGERPRINTS:
  RequiredBrowserOwnedProcessCatalogFingerprints;

export type RequiredBrowserProvisionBootstrapStaticBindingV1 = Readonly<{
  schemaVersion: 1;
  repositoryBindingFingerprint: string;
  sourceSeedFingerprint: string;
  bootstrapScopeFingerprint: string;
  bootstrapCommandCatalogFingerprint: string;
  ownedProcessCatalogFingerprint: string;
}>;

export function createRequiredBrowserProvisionBootstrapStaticBinding():
  RequiredBrowserProvisionBootstrapStaticBindingV1;

export type RequiredBrowserProvisionBootstrapRegistrationContextV1 =
  Readonly<{
    schemaVersion: 1;
    repositoryBindingFingerprint: string;
    sourceSeedFingerprint: string;
  }>;

export function registerRequiredBrowserProvisionBootstrapLaunchContext(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority,
  context: RequiredBrowserProvisionBootstrapRegistrationContextV1
): void;

export type RequiredBrowserProvisionBootstrapWhichNpmResultV1 = Readonly<{
  schemaVersion: 1;
  commandId: "owner.dependency.probe.which-npm";
  outcome: "PASS";
  npmCliPathFingerprint: string;
  npmCliPhysicalIdentityFingerprint: string;
  npmCliContentSha256: string;
  npmVersion: string;
}>;

export type RequiredBrowserProvisionBootstrapProcessTablePreflightResultV1 =
  Readonly<{
    schemaVersion: 1;
    commandId: "owner.dependency.audit.process-table-preflight";
    outcome: "PASS";
    examinedProcessCount: number;
    violationCount: 0;
  }>;

export type RequiredBrowserProvisionBootstrapOwnerTokenTablePreflightResultV1 =
  Readonly<{
    schemaVersion: 1;
    commandId: "owner.dependency.audit.owner-token-table-preflight";
    outcome: "PASS";
    examinedProcessCount: number;
    ownerTokenEntryCount: 0;
    violationCount: 0;
  }>;

export type RequiredBrowserProvisionBootstrapGitStatusResultV1 = Readonly<{
  schemaVersion: 1;
  commandId: "owner.dependency.source.git-status";
  outcome: "PASS";
  statusEntryCount: number;
  statusTextSha256: string;
  packageJsonSha256: string;
  packageLockJsonSha256: string;
}>;

export type RequiredBrowserProvisionBootstrapGitHeadResultV1 = Readonly<{
  schemaVersion: 1;
  commandId: "owner.dependency.source.git-head";
  outcome: "PASS";
  headCommit: string;
  headTextSha256: string;
}>;

export function runRequiredBrowserProvisionWhichNpm(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Promise<RequiredBrowserProvisionBootstrapWhichNpmResultV1>;

export function runRequiredBrowserProvisionProcessTablePreflight(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Promise<RequiredBrowserProvisionBootstrapProcessTablePreflightResultV1>;

export function runRequiredBrowserProvisionOwnerTokenTablePreflight(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Promise<RequiredBrowserProvisionBootstrapOwnerTokenTablePreflightResultV1>;

export function runRequiredBrowserProvisionGitStatus(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Promise<RequiredBrowserProvisionBootstrapGitStatusResultV1>;

export function runRequiredBrowserProvisionGitHead(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Promise<RequiredBrowserProvisionBootstrapGitHeadResultV1>;

declare const requiredBrowserProvisionAttemptLaunchContextBrand: unique symbol;

export type RequiredBrowserProvisionAttemptLaunchContext = Readonly<{
  readonly [requiredBrowserProvisionAttemptLaunchContextBrand]: never;
}>;

export type RequiredBrowserProvisionBootstrapPromotionResultV1 = Readonly<{
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority;
  attemptLaunchContext: RequiredBrowserProvisionAttemptLaunchContext;
}>;

export function finalizeRequiredBrowserProvisionBootstrap(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): RequiredBrowserProvisionBootstrapPromotionResultV1;

export function registerRequiredBrowserProvisionAttemptLaunchContext(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority,
  attemptLaunchContext: RequiredBrowserProvisionAttemptLaunchContext
): void;

export type RequiredBrowserProvisionActivationLockAcquireReceiptV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    attemptAuthorityBindingFingerprint: string;
    lockFingerprint: string;
    lockFileIdentityFingerprint: string;
    parentIdentityFingerprint: string;
    state: "lock-validated";
    signalAuthority: false;
  }>;

export type RequiredBrowserProvisionActivationLockReleaseReceiptV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    attemptAuthorityBindingFingerprint: string;
    lockFingerprint: string;
    activeFileIdentityFingerprint: string;
    retainedFileIdentityFingerprint: string;
    retainedRelativePathFingerprint: string;
    parentIdentityFingerprint: string;
    activePathAbsent: true;
    state: "retained-released";
    signalAuthority: false;
  }>;

export function acquireRequiredBrowserProvisionActivationLock(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): RequiredBrowserProvisionActivationLockAcquireReceiptV1;

export type RequiredBrowserProvisionInitialLayoutPreparationReceiptV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    mode: "initial";
    cacheMode: "fresh";
    attemptAuthorityBindingFingerprint: string;
    layoutBindingFingerprint: string;
    ownerMarkerFingerprint: string;
    cacheMarkerFingerprint: string;
    quarantineMarkerFingerprint: string;
    rollbackMarkerFingerprint: string;
    sourceInstallInputManifestSha256: string;
    sourceInstallInputManifestIdentityFingerprint: string;
    state: "fresh-layout-prepared";
    signalAuthority: false;
  }>;

export function prepareInitialProvisionLayout(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): RequiredBrowserProvisionInitialLayoutPreparationReceiptV1;

export type RequiredBrowserProvisionNpmCacheVerifyResultV1 = Readonly<{
  schemaVersion: 1;
  attemptId: string;
  mode: "initial";
  commandId: "owner.dependency.npm.cache-verify";
  outcome: "PASS";
  cacheInventoryFingerprint: string;
  stdoutByteLength: number;
  stdoutSha256: string;
  stderrByteLength: number;
  stderrSha256: string;
  state: "cache-verified";
  signalAuthority: false;
}>;

export function runRequiredBrowserProvisionNpmCacheVerify(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): Promise<RequiredBrowserProvisionNpmCacheVerifyResultV1>;

export type RequiredBrowserProvisionNpmCiPreferOfflineResultV1 = Readonly<{
  schemaVersion: 1;
  attemptId: string;
  mode: "initial";
  commandId: "owner.dependency.npm.ci-prefer-offline";
  outcome: "PASS";
  stagedNodeModulesInventoryFingerprint: string;
  stdoutByteLength: number;
  stdoutSha256: string;
  stderrByteLength: number;
  stderrSha256: string;
  state: "dependencies-installed-staged";
  signalAuthority: false;
}>;

export function runRequiredBrowserProvisionNpmCiPreferOffline(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): Promise<RequiredBrowserProvisionNpmCiPreferOfflineResultV1>;

export type RequiredBrowserProvisionNpmLsProvisionStagedResultV1 = Readonly<{
  schemaVersion: 1;
  attemptId: string;
  mode: "initial";
  commandId: "owner.dependency.npm.ls-provision-staged";
  outcome: "PASS";
  npmDependencyTreeFingerprint: string;
  stagedNodeModulesInventoryFingerprint: string;
  stdoutByteLength: number;
  stdoutSha256: string;
  stderrByteLength: number;
  stderrSha256: string;
  state: "dependencies-listed-staged";
  signalAuthority: false;
}>;

export function runRequiredBrowserProvisionNpmLsProvisionStaged(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): Promise<RequiredBrowserProvisionNpmLsProvisionStagedResultV1>;

export type RequiredBrowserProvisionStagedActivationResultV1 = Readonly<{
  schemaVersion: 1;
  attemptId: string;
  mode: "initial";
  operationId: "owner.dependency.activate-provision-staged";
  outcome: "PASS";
  activeNodeModulesBindingFingerprint: string;
  stagedNodeModulesInventoryFingerprint: string;
  npmDependencyTreeFingerprint: string;
  state: "dependencies-activated-initial";
  signalAuthority: false;
}>;

export function activateRequiredBrowserProvisionStagedDependencies(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): RequiredBrowserProvisionStagedActivationResultV1;

export function armRequiredBrowserInitialLayoutTestBarrier(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): void;

export function armRequiredBrowserStagedInventoryTestBarrier(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): void;

export function armRequiredBrowserInitialActivationPrePublishTestBarrier(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): void;

export function armRequiredBrowserInitialActivationPostPublishTestFailure(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): void;

export function armRequiredBrowserInitialActivationFinalTargetSwapTestBarrier(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): void;

export function finalizeRequiredBrowserProvisionActivationLock(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): RequiredBrowserProvisionActivationLockReleaseReceiptV1;

declare const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_CAPABILITY_BRAND:
  unique symbol;

export type RequiredBrowserSyntheticLifecycleTestCapability = Readonly<{
  readonly [
    REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_CAPABILITY_BRAND
  ]: never;
}>;

export type RequiredBrowserSyntheticLifecycleTestScenario =
  | "discovery-exits-while-awaited"
  | "fast-exit-before-identity"
  | "pid-reused-before-term"
  | "pid-reused-between-term-and-kill"
  | "term-exits-cleanly"
  | "term-timeout-kill-exits"
  | "descendant-appears-between-term-and-kill"
  | "descendant-survives-kill"
  | "home-changed-before-spawn"
  | "home-changed-after-spawn-before-postassert"
  | "home-inherited-before-spawn"
  | "home-accessor-before-spawn"
  | "home-present-undefined-before-spawn"
  | "home-nul-before-spawn";

export type RequiredBrowserSyntheticLifecycleTestLifecycleScenario =
  | "discovery-exits-while-awaited"
  | "fast-exit-before-identity"
  | "pid-reused-before-term"
  | "pid-reused-between-term-and-kill"
  | "term-exits-cleanly"
  | "term-timeout-kill-exits"
  | "descendant-appears-between-term-and-kill"
  | "descendant-survives-kill";

export type RequiredBrowserSyntheticLifecycleTestHomeScenario =
  | "home-changed-before-spawn"
  | "home-changed-after-spawn-before-postassert"
  | "home-inherited-before-spawn"
  | "home-accessor-before-spawn"
  | "home-present-undefined-before-spawn"
  | "home-nul-before-spawn";

export type RequiredBrowserSyntheticLifecycleCode =
  | "safety-unestablished"
  | "exit-zero"
  | "exit-nonzero"
  | "exit-signaled"
  | "timed-out"
  | "reaped-after-term"
  | "reaped-after-kill"
  | "survivor-after-kill";

export type RequiredBrowserSyntheticLifecycleViolationCode =
  | "none"
  | "identity-mismatch"
  | "survivor";

export type RequiredBrowserSyntheticLifecycleEventCode =
  | "identity-established"
  | "descendant-discovered"
  | "wait"
  | "timeout"
  | "pre-term"
  | "pre-kill"
  | "final-survivor"
  | "spawned"
  | "postassert-rejected";

export type RequiredBrowserSyntheticLifecycleTestLifecycleResultV1 =
  Readonly<{
    schemaVersion: 1;
    fixtureSchemaVersion: 2;
    scenario: RequiredBrowserSyntheticLifecycleTestLifecycleScenario;
    lifecycleCode: RequiredBrowserSyntheticLifecycleCode;
    violationCode: RequiredBrowserSyntheticLifecycleViolationCode;
    identityEstablished: boolean;
    identityRevalidatedBeforeTerm: boolean;
    identityRevalidatedBeforeKill: boolean;
    termAttempted: boolean;
    termSent: boolean;
    killAttempted: boolean;
    killSent: boolean;
    rediscoveryCount: number;
    survivorCount: number;
    eventCodes: readonly RequiredBrowserSyntheticLifecycleEventCode[];
    spawnOccurred: boolean;
    operationSucceeded: boolean;
    rawHomeRetained: false;
    signalAuthority: false;
  }>;

export type RequiredBrowserSyntheticLifecycleTestHomeResultV1 = Readonly<{
  schemaVersion: 1;
  fixtureSchemaVersion: 2;
  scenario: RequiredBrowserSyntheticLifecycleTestHomeScenario;
  identityEstablished: boolean;
  identityRevalidatedBeforeTerm: boolean;
  identityRevalidatedBeforeKill: boolean;
  termAttempted: false;
  termSent: false;
  killAttempted: false;
  killSent: false;
  rediscoveryCount: number;
  survivorCount: number;
  eventCodes: readonly RequiredBrowserSyntheticLifecycleEventCode[];
  spawnOccurred: boolean;
  operationSucceeded: false;
  rawHomeRetained: false;
  signalAuthority: false;
}>;

export type RequiredBrowserSyntheticLifecycleTestResultV1 =
  | RequiredBrowserSyntheticLifecycleTestLifecycleResultV1
  | RequiredBrowserSyntheticLifecycleTestHomeResultV1;

export type RequiredBrowserSyntheticLifecycleTestScenarios = readonly [
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
];

export const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_SCENARIOS:
  RequiredBrowserSyntheticLifecycleTestScenarios;

export function createRequiredBrowserSyntheticLifecycleTestCapability(
  registeredTestFixtureCapability: RequiredBrowserTestFixtureCapabilityV2
): RequiredBrowserSyntheticLifecycleTestCapability;

export function runRequiredBrowserSyntheticLifecycleTestScenario(
  syntheticTestCapability: RequiredBrowserSyntheticLifecycleTestCapability,
  scenario: RequiredBrowserSyntheticLifecycleTestScenario
): RequiredBrowserSyntheticLifecycleTestResultV1;

export function assertRequiredBrowserSyntheticLifecycleTestResult(
  value: unknown
): void;
