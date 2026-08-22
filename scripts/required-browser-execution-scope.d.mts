import type { LiveHomeProof } from "./live-home-protection.mjs";

export type RequiredBrowserExecutionMode =
  | "discovery"
  | "required-matrix"
  | "static-no-browser";

export interface RequiredBrowserExecutionMatrixContract {
  readonly allowedMobileSkipTitle?: string;
  readonly contractId: string;
  readonly expectedSelected: number;
  readonly file: string;
  readonly grep: string;
  readonly label: string;
  readonly minimumPassed?: number;
  readonly minimumSelected: number;
}

export interface RequiredBrowserExecutionMatrixRow {
  readonly contracts: readonly RequiredBrowserExecutionMatrixContract[];
  readonly project: "desktop-chrome" | "mobile-chrome";
}

export interface RequiredBrowserExecutableIdentity {
  readonly canonicalPath: string;
  readonly dev: string;
  readonly ino: string;
  readonly role: string;
  readonly sha256: string;
}

export interface RequiredBrowserSourceAttestation {
  readonly canonicalPath: string;
  readonly path: string;
  readonly sha256: string;
}

export type RequiredBrowserStaticEnvironmentSemanticClass =
  | "command-id"
  | "exact-literal"
  | "home-hash"
  | "owner-identity"
  | "owner-path"
  | "sha256-digest";

export interface RequiredBrowserStaticEnvironmentEntry {
  readonly key: string;
  readonly semanticClass: RequiredBrowserStaticEnvironmentSemanticClass;
  readonly valueSha256: string;
}

export interface RequiredBrowserStaticEnvironmentBinding {
  readonly entries: readonly RequiredBrowserStaticEnvironmentEntry[];
  readonly inventorySha256: string;
  readonly schemaVersion: 1;
}

export interface RequiredBrowserStaticEnvironmentPolicy {
  readonly allowedKeys: readonly string[];
  readonly digestKeys: readonly string[];
  readonly exactLiterals: Readonly<Record<string, string>>;
  readonly homeKey: "HOME";
  readonly identityKeys: readonly string[];
  readonly inheritAmbient: false;
  readonly pathOwningKeys: readonly string[];
  readonly schemaVersion: 1;
  readonly sha256: string;
}

export interface RequiredBrowserCommandCapabilities {
  readonly browserCapable: boolean;
  readonly networkCapable: boolean;
  readonly subprocessCapable: boolean;
}

export type RequiredBrowserCapabilityClass =
  | "browser"
  | "dynamic-code"
  | "filesystem-delete"
  | "filesystem-read"
  | "filesystem-write"
  | "network"
  | "shell"
  | "subprocess"
  | "unknown";

export interface RequiredBrowserCapabilityFinding {
  readonly capability: RequiredBrowserCapabilityClass;
  readonly column: number;
  readonly file: string;
  readonly kind: string;
  readonly line: number;
  readonly member: string | null;
  readonly sourceKind: string;
  readonly syntaxSha256: string;
}

export interface RequiredBrowserSensitiveImportCounts {
  readonly browser: number;
  readonly dynamicCode: number;
  readonly filesystem: number;
  readonly network: number;
  readonly subprocess: number;
}

export interface RequiredBrowserCapabilityParserProof {
  readonly canonicalPath: string;
  readonly loadedApiSha256: string;
  readonly packageManifestCanonicalPath: string;
  readonly packageManifestSha256: string;
  readonly schemaVersion: 1;
  readonly sha256: string;
  readonly sourceSha256: string;
  readonly version: string;
}

export interface RequiredBrowserCapabilityRuleset {
  readonly browserCallMembers: readonly string[];
  readonly browserModules: readonly string[];
  readonly capabilityClasses: readonly RequiredBrowserCapabilityClass[];
  readonly childProcessMembers: readonly string[];
  readonly childProcessModules: readonly string[];
  readonly defaultForbiddenCapabilities: readonly RequiredBrowserCapabilityClass[];
  readonly dynamicCodeModules: readonly string[];
  readonly filesystemDeleteMembers: readonly string[];
  readonly filesystemModules: readonly string[];
  readonly filesystemReadMembers: readonly string[];
  readonly filesystemWriteMembers: readonly string[];
  readonly inertDataFiles: readonly string[];
  readonly networkModules: readonly string[];
  readonly prodCertificationForbiddenCapabilities: readonly RequiredBrowserCapabilityClass[];
  readonly schemaVersion: 1;
  readonly sha256: string;
  readonly shellExecutableBasenames: readonly string[];
}

export interface RequiredBrowserCapabilityAnalyzerProof {
  readonly parser: RequiredBrowserCapabilityParserProof;
  readonly ruleset: RequiredBrowserCapabilityRuleset;
  readonly schemaVersion: 1;
  readonly sha256: string;
  readonly source: RequiredBrowserSourceAttestation;
}

export type RequiredBrowserCapabilityFileRole =
  | "capability-analyzer"
  | "command-catalog"
  | "runtime"
  | "trusted-source";

export interface RequiredBrowserCapabilityFileProof {
  readonly capabilityFindings: readonly RequiredBrowserCapabilityFinding[];
  readonly inertCapabilitySites: readonly RequiredBrowserCapabilityFinding[];
  readonly path: string;
  readonly proofSha256: string;
  readonly roles: readonly RequiredBrowserCapabilityFileRole[];
  readonly schemaVersion: 1;
  readonly sensitiveImportCounts: RequiredBrowserSensitiveImportCounts;
  readonly sourceSha256: string;
}

export interface RequiredBrowserCapabilityCommandProof {
  readonly analyzerSha256: string;
  readonly catalogCapabilities: {
    readonly browserCapable: boolean | null;
    readonly networkCapable: boolean | null;
    readonly subprocessCapable: boolean | null;
  };
  readonly catalogSha256: string;
  readonly closureSha256: string;
  readonly commandDefinitionSha256: string;
  readonly commandId: string;
  readonly descriptorFingerprint: string | null;
  readonly files: readonly RequiredBrowserCapabilityFileProof[];
  readonly findingCounts: Readonly<Record<RequiredBrowserCapabilityClass, number>>;
  readonly forbiddenCapabilities: readonly RequiredBrowserCapabilityClass[];
  readonly mode: RequiredBrowserExecutionMode;
  readonly parserSha256: string;
  readonly proofSha256: string;
  readonly rulesetSha256: string;
  readonly schemaVersion: 1;
}

export interface RequiredBrowserCapabilityProofs {
  readonly analyzer: RequiredBrowserCapabilityAnalyzerProof;
  readonly catalogSha256: string;
  readonly closureSha256: string;
  readonly commands: readonly RequiredBrowserCapabilityCommandProof[];
  readonly mode: RequiredBrowserExecutionMode;
  readonly schemaVersion: 1;
  readonly sha256: string;
}

export interface RequiredBrowserCommandIoPolicy {
  readonly stderr: {
    readonly maxBytes: number;
    readonly pathBinding: string;
    readonly sanitizeBeforeWrite: true;
  };
  readonly stdin: "ignore";
  readonly stdout: {
    readonly maxBytes: number;
    readonly pathBinding: string;
    readonly sanitizeBeforeWrite: true;
  };
}

export type RequiredBrowserArgvTemplateEntry =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "validated-slot"; readonly name: string; readonly prefix: string };

export interface RequiredBrowserCommandDefinition {
  readonly allowedBindings?: readonly {
    readonly contractId: string;
    readonly grep: string;
    readonly project: string;
    readonly spec: string;
  }[];
  readonly argv: readonly RequiredBrowserArgvTemplateEntry[];
  readonly capabilities?: RequiredBrowserCommandCapabilities;
  readonly cwd: "repo-root" | "owner-root";
  readonly descriptorFingerprint?: string;
  readonly entrypointPaths: readonly string[];
  readonly environmentBinding: string;
  readonly environmentPolicySha256?: string;
  readonly executable: RequiredBrowserExecutableIdentity;
  readonly id: string;
  readonly ioPolicy?: RequiredBrowserCommandIoPolicy;
  readonly maySpawnCommandIds: readonly string[];
  readonly modes: readonly RequiredBrowserExecutionMode[];
  readonly script?: RequiredBrowserSourceAttestation;
  readonly trustedSources?: readonly RequiredBrowserSourceAttestation[];
  readonly typedSlotNames?: readonly string[];
}

export interface RequiredBrowserExecutionScope {
  readonly capabilityProofs: RequiredBrowserCapabilityProofs;
  readonly schemaVersion: 1;
  readonly status: "validated";
  readonly mode: RequiredBrowserExecutionMode;
  readonly repoRoot: string;
  readonly dependencyAttestationFingerprint: string;
  readonly sourceFingerprints: Readonly<Record<string, string>>;
  readonly proofInputs: {
    readonly files: readonly string[];
    readonly sha256: string;
  };
  readonly commandCatalog: {
    readonly definitions: readonly RequiredBrowserCommandDefinition[];
    readonly allowedCommandIds: readonly string[];
    readonly deniedExecutableBasenames: readonly string[];
    readonly deniedArgumentPatterns: readonly string[];
    readonly typedSlots: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    readonly sha256: string;
  };
  readonly closure: {
    readonly commandEntrypoints: readonly {
      readonly commandId: string;
      readonly paths: readonly string[];
    }[];
    readonly files: readonly {
      readonly path: string;
      readonly reachableFromCommandIds: readonly string[];
      readonly sha256: string;
    }[];
    readonly importEdges: readonly {
      readonly from: string;
      readonly kind: string;
      readonly to: string;
    }[];
    readonly spawnEdges: readonly {
      readonly commandId: string;
      readonly file: string;
      readonly line: number;
      readonly syntaxSha256: string;
    }[];
    readonly unresolvedLocalImports: readonly [];
    readonly unresolvedSpawnSites: readonly [];
    readonly sha256: string;
  };
  readonly destructiveLedger: {
    readonly entries: readonly RequiredBrowserDestructiveLedgerEntry[];
    readonly reachableEntries: readonly RequiredBrowserDestructiveLedgerEntry[];
    readonly outOfScopeEntries: readonly RequiredBrowserDestructiveLedgerEntry[];
    readonly sha256: string;
  };
  readonly staticEnvironmentPolicy: RequiredBrowserStaticEnvironmentPolicy;
  readonly scopeFingerprint: string;
}

export interface RequiredBrowserDestructiveLedgerEntry {
  readonly column: number;
  readonly disposition:
    | "CAPABILITY_DOMINATED_EXACT_LEAF"
    | "DORMANT_PACKAGE_SCRIPT"
    | "INERT_LITERAL_OR_COMMENT"
    | "NO_IMPORT_OR_SPAWN_PATH_FROM_SCOPE";
  readonly file: string;
  readonly kind: string;
  readonly line: number;
  readonly reachableFromCommandIds: readonly string[];
  readonly semanticClass:
    | "active-child-process-delete"
    | "active-filesystem-delete"
    | "active-non-ecma-delete"
    | "dormant-package-script"
    | "inert-literal-or-comment";
  readonly sourceSha256: string;
  readonly statementSha256: string;
}

export interface RequiredBrowserResolvedCommand {
  readonly args: readonly string[];
  readonly argvSha256: string;
  readonly command: string;
  readonly commandId: string;
  readonly cwd: string;
  readonly environmentInventorySha256: string;
  readonly executable: RequiredBrowserExecutableIdentity;
  readonly scopeFingerprint: string;
}

export const REQUIRED_BROWSER_PROOF_INPUT_FILES: readonly string[];
export const REQUIRED_BROWSER_EXECUTION_MATRIX: readonly RequiredBrowserExecutionMatrixRow[];

export function requiredBrowserEnvironmentValueSha256(
  key: string,
  value: string
): string;

export function validateRequiredBrowserStaticEnvironmentBindingSnapshot(
  binding: RequiredBrowserStaticEnvironmentBinding
): RequiredBrowserStaticEnvironmentBinding;

export function validateAndHashRequiredBrowserStaticEnvironment(input: {
  environment: Readonly<Record<string, string | undefined>>;
  homeValueSha256: string;
  liveHomeProof: LiveHomeProof;
  ownerRoot: string;
}): RequiredBrowserStaticEnvironmentBinding;

export function analyzeRequiredBrowserSourceSemanticsForTest(
  source: string,
  options?: { readonly file?: string }
): {
  readonly capabilityFindings: readonly RequiredBrowserCapabilityFinding[];
  readonly childProcessCalls: readonly {
    readonly column: number;
    readonly line: number;
    readonly member: string;
    readonly syntaxSha256: string;
  }[];
  readonly destructiveCalls: readonly {
    readonly column: number;
    readonly file: string;
    readonly kind: string;
    readonly line: number;
    readonly semanticClass:
      | "active-child-process-delete"
      | "active-filesystem-delete";
    readonly statementSha256: string;
  }[];
  readonly imports: readonly Readonly<Record<string, string>>[];
  readonly inertCapabilitySites: readonly RequiredBrowserCapabilityFinding[];
  readonly inertDestructiveSites: readonly {
    readonly column: number;
    readonly file: string;
    readonly kind: string;
    readonly line: number;
    readonly semanticClass: "inert-literal-or-comment";
    readonly statementSha256: string;
  }[];
  readonly sensitiveImportCounts: RequiredBrowserSensitiveImportCounts;
};

export function requiredBrowserSourceFingerprints(repoRoot?: string): Readonly<Record<string, string>>;

export function assertRequiredBrowserSourceFingerprintsUnchanged(
  repoRoot: string,
  expectedFingerprints: Readonly<Record<string, string>>
): Readonly<Record<string, string>>;

export function buildRequiredBrowserExecutionScope(input: {
  dependencyAttestation: unknown;
  mode: RequiredBrowserExecutionMode;
  repoRoot: string;
  sourceFingerprints: Readonly<Record<string, string>>;
}): RequiredBrowserExecutionScope;

export function assertLiveRequiredBrowserExecutionScope(
  scope: RequiredBrowserExecutionScope,
  context: {
    dependencyAttestation: unknown;
    repoRoot: string;
    sourceFingerprints: Readonly<Record<string, string>>;
  }
): RequiredBrowserExecutionScope;

export function validateRequiredBrowserExecutionScopeSnapshot(
  scope: RequiredBrowserExecutionScope
): RequiredBrowserExecutionScope;

export function resolveRequiredBrowserCommandSet(input: {
  dependencyAttestation: unknown;
  executionScope: RequiredBrowserExecutionScope;
  plan: Readonly<Record<string, unknown>>;
  repoRoot: string;
}): {
  readonly allowedCommandIds: readonly string[];
  readonly scopeFingerprint: string;
  resolve(commandId: string, bindings?: Readonly<Record<string, unknown>>): RequiredBrowserResolvedCommand;
};

export interface RequiredBrowserInvocationReceipt {
  readonly argvSha256: string;
  readonly capabilityProofSha256: string;
  readonly commandDefinitionSha256: string;
  readonly commandId: string;
  readonly descriptorFingerprint: string;
  readonly environmentInventorySha256: string;
  readonly executableSha256: string;
  readonly resolvedArgsSha256: string;
  readonly scopeFingerprint: string;
}

export interface RequiredBrowserPortablePhysicalDirectoryIdentity {
  readonly canonicalPath: string;
  readonly dev: string;
  readonly ino: string;
  readonly physical: true;
}

export interface RequiredBrowserPortablePhysicalFileIdentity
  extends RequiredBrowserPortablePhysicalDirectoryIdentity {
  readonly sha256: string;
}

export interface RequiredBrowserPortableConfigImportFact {
  readonly defaultImport: string | null;
  readonly module: string;
  readonly namedImports: readonly Readonly<{
    imported: string;
    local: string;
    typeOnly: boolean;
  }>[];
  readonly namespaceImport: string | null;
  readonly sideEffectOnly: boolean;
  readonly typeOnly: boolean;
}

export interface RequiredBrowserPortableConfigSemanticFacts {
  readonly forbiddenCapabilityCounts: Readonly<Record<
    Exclude<RequiredBrowserCapabilityClass, "filesystem-read">,
    number
  >>;
  readonly imports: readonly RequiredBrowserPortableConfigImportFact[];
  readonly loaderCalls: readonly Readonly<{
    argument: "@playwright/test" | "typescript";
    container: "e2eTempTsconfigExcludeGlobs" | "owner-config-branch";
  }>[];
  readonly sensitiveImportCounts: RequiredBrowserSensitiveImportCounts;
  readonly syntaxSha256: Readonly<{
    captureDetachedPlaywrightConfigContext: string;
    detachedProcessEnvironment: string;
    directImportBranch: string;
    initialPortableBranch: string;
    portableExportBranch: string;
    revalidatePortableListAuthority: string;
  }>;
  readonly topLevelDeclarations: readonly string[];
}

export interface RequiredBrowserPortableConfigProfile {
  readonly expectedFacts: RequiredBrowserPortableConfigSemanticFacts;
  readonly schemaVersion: 1;
  readonly sha256: string;
}

export interface RequiredBrowserPortableConfigSemanticProof {
  readonly analyzer: Readonly<{
    authoritySource: RequiredBrowserPortablePhysicalFileIdentity & Readonly<{
      path: "scripts/required-browser-execution-scope.mjs";
    }>;
    parser: RequiredBrowserCapabilityParserProof;
    profile: RequiredBrowserPortableConfigProfile;
    ruleset: RequiredBrowserCapabilityRuleset;
    schemaVersion: 1;
    sha256: string;
  }>;
  readonly configSourceSha256: string;
  readonly facts: RequiredBrowserPortableConfigSemanticFacts;
  readonly schemaVersion: 1;
  readonly sha256: string;
}

export interface RequiredBrowserPortableListInvocationCapture {
  readonly argvSha256: string;
  readonly captureFingerprint: string;
  readonly cli: RequiredBrowserPortablePhysicalFileIdentity;
  readonly config: RequiredBrowserPortablePhysicalFileIdentity;
  readonly cwd: string;
  readonly environment: Readonly<{
    entries: readonly [
      Readonly<{
        key: "HOME";
        semanticClass: "home-hash";
        valueSha256: string;
      }>,
      Readonly<{
        key: "PLAYWRIGHT_PORTABLE_LIST_ONLY";
        semanticClass: "exact-literal";
        valueSha256: string;
      }>
    ];
    inventorySha256: string;
    schemaVersion: 1;
  }>;
  readonly executable: RequiredBrowserPortablePhysicalFileIdentity;
  readonly homeValueSha256: string;
  readonly mode: "portable-list-only";
  readonly nodeModules: RequiredBrowserPortablePhysicalDirectoryIdentity;
  readonly playwrightPackage: Readonly<{
    manifest: RequiredBrowserPortablePhysicalFileIdentity;
    name: "@playwright/test";
    packageRoot: string;
    schemaVersion: 1;
    sha256: string;
    version: "1.59.1";
  }>;
  readonly requiresLiveHomeProtection: true;
  readonly schemaVersion: 1;
  readonly semanticProof: RequiredBrowserPortableConfigSemanticProof;
}

export function validateRequiredBrowserPlaywrightInvocation(input: {
  argv: readonly string[];
  cwd?: string;
  dependencyAttestation: unknown;
  executionScope: RequiredBrowserExecutionScope;
  plan: Readonly<Record<string, unknown>>;
  repoRoot: string;
}): RequiredBrowserInvocationReceipt & {
  readonly commandId: "owner.playwright.discovery" | "owner.playwright.final";
};

export function validateRequiredBrowserNextInvocation(input: {
  argv: readonly string[];
  cwd?: string;
  dependencyAttestation: unknown;
  executionScope: RequiredBrowserExecutionScope;
  plan: Readonly<Record<string, unknown>>;
  repoRoot: string;
}): RequiredBrowserInvocationReceipt & {
  readonly commandId: "owner.next.build" | "owner.next.service";
};

export function validateRequiredBrowserPortableListInvocationCaptureSnapshot(
  capture: RequiredBrowserPortableListInvocationCapture
): RequiredBrowserPortableListInvocationCapture;

export function captureRequiredBrowserPortableListInvocation(input: {
  argv: readonly string[];
  cwd?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  liveHomeProof: LiveHomeProof;
}): RequiredBrowserPortableListInvocationCapture;

export function assertRequiredBrowserPortableListInvocationUnchanged(
  capture: RequiredBrowserPortableListInvocationCapture,
  input: {
    argv: readonly string[];
    cwd?: string;
    environment?: Readonly<Record<string, string | undefined>>;
    liveHomeProof: LiveHomeProof;
  }
): RequiredBrowserPortableListInvocationCapture;
