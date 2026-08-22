import type { LiveHomeProof } from "./live-home-protection.mjs";

declare const requalificationCandidateAuthorityBrand: unique symbol;
declare const bootstrapAuthorityBrand: unique symbol;
declare const attemptAuthorityBrand: unique symbol;

export type RequiredBrowserProvisionRequalificationCandidateAuthority =
  Readonly<{
    readonly [requalificationCandidateAuthorityBrand]: never;
  }>;

export type RequiredBrowserProvisionBootstrapAuthority = Readonly<{
  readonly [bootstrapAuthorityBrand]: never;
}>;

export type RequiredBrowserProvisionAttemptAuthority = Readonly<{
  readonly [attemptAuthorityBrand]: never;
}>;

export type RequiredBrowserProvisionRequalificationCandidateBindingV1 =
  Readonly<{
    schemaVersion: 1;
    repositoryBindingFingerprint: string;
    priorProvisionFailureAttestationFingerprint: string;
    ownerMarkerFingerprint: string;
    cacheMarkerFingerprint: string;
    seedManifestFingerprint: string;
    seedProvenanceFingerprint: string;
    launcherSourceFingerprint: string;
    provisionerSourceFingerprint: string;
    sourcePackageJsonFingerprint: string;
    sourcePackageLockFingerprint: string;
    copiedPackageJsonFingerprint: string;
    copiedPackageLockFingerprint: string;
    retainedAttemptNonceFingerprint: string;
    retainedAttemptRootBindingFingerprint: string;
    quarantinedCandidateDirectoryIdentityFingerprint: string;
    liveNodeModulesSymlinkIdentityFingerprint: string;
    liveNodeModulesTargetFingerprint: string;
    retainedLayoutFingerprint: string;
    retainedLogsFingerprint: string;
    failedPhase: "staged-tree-attestation";
  }>;

export type RequiredBrowserProvisionInitialBootstrapRequestV1 = Readonly<{
  schemaVersion: 1;
  mode: "initial";
  attemptNonce: string;
  sourceSeedFingerprint: string;
  bootstrapScopeFingerprint: string;
  bootstrapCommandCatalogFingerprint: string;
  ownedProcessCatalogFingerprint: string;
}>;

export type RequiredBrowserProvisionRequalificationBootstrapRequestV1 =
  Readonly<{
    schemaVersion: 1;
    mode: "requalification";
    attemptNonce: string;
    sourceSeedFingerprint: string;
    bootstrapScopeFingerprint: string;
    bootstrapCommandCatalogFingerprint: string;
    ownedProcessCatalogFingerprint: string;
  }>;

export type RequiredBrowserProvisionInitialBootstrapAuthorityBindingV1 =
  Readonly<{
    schemaVersion: 1;
    requestFingerprint: string;
    attemptId: string;
    mode: "initial";
    attemptNonce: string;
    sourceSeedFingerprint: string;
    bootstrapScopeFingerprint: string;
    bootstrapCommandCatalogFingerprint: string;
    ownedProcessCatalogFingerprint: string;
  }>;

export type RequiredBrowserProvisionRequalificationBootstrapAuthorityBindingV1 =
  Readonly<{
    schemaVersion: 1;
    requestFingerprint: string;
    attemptId: string;
    mode: "requalification";
    attemptNonce: string;
    sourceSeedFingerprint: string;
    bootstrapScopeFingerprint: string;
    bootstrapCommandCatalogFingerprint: string;
    ownedProcessCatalogFingerprint: string;
    requalificationCandidateBindingFingerprint: string;
    priorProvisionFailureAttestationFingerprint: string;
    retainedAttemptRootBindingFingerprint: string;
  }>;

export type RequiredBrowserProvisionBootstrapAuthorityBindingV1 =
  | RequiredBrowserProvisionInitialBootstrapAuthorityBindingV1
  | RequiredBrowserProvisionRequalificationBootstrapAuthorityBindingV1;

export type RequiredBrowserProvisionInitialBootstrapCompletionV1 = Readonly<{
  schemaVersion: 1;
  attemptId: string;
  mode: "initial";
  bootstrapAuthorityBindingFingerprint: string;
  fivePassAggregateFingerprint: string;
  sourceSeedFingerprint: string;
  repositoryBindingFingerprint: string;
  provisionRootBindingFingerprint: string;
  bootstrapScopeFingerprint: string;
  bootstrapCommandCatalogFingerprint: string;
  ownedProcessCatalogFingerprint: string;
  bootstrapEnvironmentInventorySetFingerprint: string;
  finalCommandScopeFingerprint: string;
  finalDescriptorSetFingerprint: string;
  finalEnvironmentInventorySetFingerprint: string;
  dependencyPathPolicyFingerprint: string;
  evidencePolicyFingerprint: string;
}>;

export type RequiredBrowserProvisionRequalificationBootstrapCompletionV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    mode: "requalification";
    bootstrapAuthorityBindingFingerprint: string;
    fivePassAggregateFingerprint: string;
    sourceSeedFingerprint: string;
    repositoryBindingFingerprint: string;
    provisionRootBindingFingerprint: string;
    bootstrapScopeFingerprint: string;
    bootstrapCommandCatalogFingerprint: string;
    ownedProcessCatalogFingerprint: string;
    bootstrapEnvironmentInventorySetFingerprint: string;
    finalCommandScopeFingerprint: string;
    finalDescriptorSetFingerprint: string;
    finalEnvironmentInventorySetFingerprint: string;
    dependencyPathPolicyFingerprint: string;
    evidencePolicyFingerprint: string;
    requalificationCandidateBindingFingerprint: string;
    priorProvisionFailureAttestationFingerprint: string;
  }>;

export type RequiredBrowserProvisionBootstrapCompletionV1 =
  | RequiredBrowserProvisionInitialBootstrapCompletionV1
  | RequiredBrowserProvisionRequalificationBootstrapCompletionV1;

export type RequiredBrowserProvisionInitialAttemptAuthorityBindingV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    mode: "initial";
    sourceSeedFingerprint: string;
    bootstrapAuthorityBindingFingerprint: string;
    bootstrapCompletionFingerprint: string;
    repositoryBindingFingerprint: string;
    provisionRootBindingFingerprint: string;
    ownedProcessCatalogFingerprint: string;
    finalCommandScopeFingerprint: string;
    finalDescriptorSetFingerprint: string;
    finalEnvironmentInventorySetFingerprint: string;
    dependencyPathPolicyFingerprint: string;
    evidencePolicyFingerprint: string;
  }>;

export type RequiredBrowserProvisionRequalificationAttemptAuthorityBindingV1 =
  Readonly<{
    schemaVersion: 1;
    attemptId: string;
    mode: "requalification";
    sourceSeedFingerprint: string;
    bootstrapAuthorityBindingFingerprint: string;
    bootstrapCompletionFingerprint: string;
    repositoryBindingFingerprint: string;
    provisionRootBindingFingerprint: string;
    ownedProcessCatalogFingerprint: string;
    finalCommandScopeFingerprint: string;
    finalDescriptorSetFingerprint: string;
    finalEnvironmentInventorySetFingerprint: string;
    dependencyPathPolicyFingerprint: string;
    evidencePolicyFingerprint: string;
    requalificationCandidateBindingFingerprint: string;
    priorProvisionFailureAttestationFingerprint: string;
  }>;

export type RequiredBrowserProvisionAttemptAuthorityBindingV1 =
  | RequiredBrowserProvisionInitialAttemptAuthorityBindingV1
  | RequiredBrowserProvisionRequalificationAttemptAuthorityBindingV1;

export function issueRequiredBrowserProvisionRequalificationCandidateAuthority(
  liveHomeProof: LiveHomeProof,
  binding: RequiredBrowserProvisionRequalificationCandidateBindingV1
): RequiredBrowserProvisionRequalificationCandidateAuthority;

export function issueInitialRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof: LiveHomeProof,
  request: RequiredBrowserProvisionInitialBootstrapRequestV1
): RequiredBrowserProvisionBootstrapAuthority;

export function issueRequalificationRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof: LiveHomeProof,
  requalificationCandidateAuthority:
    RequiredBrowserProvisionRequalificationCandidateAuthority,
  request: RequiredBrowserProvisionRequalificationBootstrapRequestV1
): RequiredBrowserProvisionBootstrapAuthority;

export function completeRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority,
  completion: RequiredBrowserProvisionBootstrapCompletionV1
): void;

export function promoteInitialRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): RequiredBrowserProvisionAttemptAuthority;

export function promoteRequalificationRequiredBrowserProvisionBootstrapAuthority(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): RequiredBrowserProvisionAttemptAuthority;

export function assertRequiredBrowserProvisionBootstrapAuthorityBinding(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority,
  expectedBindingFingerprint: string
): void;

export function readRequiredBrowserProvisionBootstrapAuthorityBindingForLauncher(
  liveHomeProof: LiveHomeProof,
  bootstrapAuthority: RequiredBrowserProvisionBootstrapAuthority
): Readonly<RequiredBrowserProvisionBootstrapAuthorityBindingV1>;

export function assertRequiredBrowserProvisionAttemptAuthorityBinding(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority,
  expectedBindingFingerprint: string
): void;

export function readRequiredBrowserProvisionAttemptAuthorityBindingForLauncher(
  liveHomeProof: LiveHomeProof,
  attemptAuthority: RequiredBrowserProvisionAttemptAuthority
): Readonly<RequiredBrowserProvisionAttemptAuthorityBindingV1>;
