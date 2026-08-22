import type { RequiredBrowserExecutionScope } from "./required-browser-execution-scope.mjs";
import type { LiveHomeProof } from "./live-home-protection.mjs";

export interface PlaywrightOwnerPaths {
  readonly e2eRoot: string;
  readonly nextDist: string;
  readonly nextTsconfig: string;
  readonly db: string;
  readonly dbWal: string;
  readonly dbShm: string;
  readonly outputDir: string;
  readonly reportDir: string;
  readonly requiredGeneratedDir: string;
  readonly requiredConfig: string;
  readonly requiredJsonReport: string;
  readonly tmpDir: string;
  readonly tmp: string;
  readonly temp: string;
  readonly cacheDir: string;
  readonly npmCacheDir: string;
  readonly npmLogsDir: string;
  readonly turboCacheDir: string;
  readonly xdgStateDir: string;
  readonly buildLog: string;
  readonly playwrightLog: string;
  readonly serviceLog: string;
  readonly servicePid: string;
}

export interface ValidatedRunPlan {
  readonly schemaVersion: number;
  readonly runId: string;
  readonly nonce: string;
  readonly servicePort: number;
  readonly serviceBaseUrl: string;
  readonly repoRoot: string;
  readonly tmpBase: string;
  readonly ownerRoot: string;
  readonly markerPath: string;
  readonly terminalFallbackPath: string;
  readonly cleanupMarkerName: string;
  readonly quarantineMarkerName: string;
  readonly ephemeralRoot: string;
  readonly evidenceRoot: string;
  readonly quarantineRoot: string;
  readonly cleanupLeaves: Readonly<{
    browser: string;
    build: string;
    cache: string;
    config: string;
    data: string;
    generated: string;
    nodeCompileCache: string;
    state: string;
    temp: string;
  }>;
  readonly evidencePaths: Readonly<{
    artifacts: string;
    buildLog: string;
    finalReport: string;
    finalResults: string;
    pathAudit: string;
    playwrightLog: string;
    preflightManifest: string;
    processAudit: string;
    serviceLog: string;
    validatedSummary: string;
  }>;
  readonly environmentBinding: Readonly<{
    inventoryKeys: readonly string[];
    inventorySha256: string;
  }>;
  readonly homeValueSha256: string;
  readonly paths: Readonly<PlaywrightOwnerPaths>;
  readonly protectedRoots: readonly string[];
  readonly requiresLiveHomeProtection: true;
  readonly validationContext: Readonly<{
    cwd: string;
    osTempDir: string;
  }>;
  readonly dependencyAttestation: Readonly<Record<string, unknown>>;
  readonly executionScope: RequiredBrowserExecutionScope;
  readonly sourceFingerprints: Readonly<Record<string, string>>;
  readonly starship: Readonly<{
    repoRoot: string;
    volumeDevice: string;
    volumeRoot: string;
  }>;
  readonly planFingerprint: string;
}

export interface PlaywrightOwnerValidation {
  ownerRoot: string;
  environment: Record<string, string>;
  interfaces: { nextDist: string; nextTsconfig: string };
  paths: Readonly<PlaywrightOwnerPaths>;
  plan: ValidatedRunPlan;
}

export interface CreateValidatedRunPlanOptions {
  repoRoot: string;
  nonce: string;
  dependencyAttestation: Record<string, unknown>;
  executionScope: RequiredBrowserExecutionScope;
  liveHomeProof: LiveHomeProof;
  sourceFingerprints: Record<string, string>;
  cwd?: string;
  osTempDir?: string;
  ownerRoot?: string;
}

export function createValidatedRunPlan(
  options: CreateValidatedRunPlanOptions
): ValidatedRunPlan;

export function assertCanonicalStarshipBrowserHost(options: {
  repoRoot: string;
}): Readonly<{
  repoRoot: string;
  volumeDevice: string;
  volumeRoot: string;
}>;

export function classifyPlaywrightCliInvocation(argv?: readonly string[]): {
  cliArgs: string[];
  cliKind: "core" | "shim" | "test" | null;
  cliPath: string | null;
  isCli: boolean;
  noBrowserList: boolean;
  portableListCandidate: boolean;
};

export function bootstrapValidatedRunPlan(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof
): ValidatedRunPlan;

export function materializeValidatedRunPlan(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof,
  options?: { fingerprints?: Record<string, string> }
): ValidatedRunPlan;

export function validateMaterializedRunPlan(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof
): ValidatedRunPlan;

export interface CleanupFilesystemIdentity {
  readonly dev: string;
  readonly ino: string;
  readonly mode: number;
  readonly type: "directory" | "file" | "other";
}

export interface CleanupFilesystemSnapshot {
  readonly identity: CleanupFilesystemIdentity | null;
  readonly kind: "directory" | "file" | "missing" | "other" | "symlink";
  readonly path: string;
}

export function validateCleanupSnapshotTransition(input: {
  readonly expectedIdentity: CleanupFilesystemIdentity;
  readonly expectedPath: string;
  readonly observed: CleanupFilesystemSnapshot;
  readonly phase: string;
}): CleanupFilesystemIdentity;

export function cleanupValidatedEphemeralLeaves(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof,
  requestedLeaves: readonly string[],
  operations?: {
    afterQuarantineRename?: (context: { quarantinePath: string; target: string }) => void;
  }
): string[];

export function writeValidatedEvidenceJsonAtomic(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof,
  targetPath: string,
  value: unknown
): string;

export function buildValidatedRunEnvironment(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof,
  baseEnvironment?: Record<string, string | undefined>
): Record<string, string | undefined>;

export function loadValidatedRunPlanFromManifest(
  manifestPath: string,
  liveHomeProof: LiveHomeProof,
  options?: {
    cwd?: string;
    osTempDir?: string;
    repoRoot?: string;
  }
): ValidatedRunPlan;

export function validateOwnedWritablePath(
  plan: ValidatedRunPlan,
  liveHomeProof: LiveHomeProof,
  label: string,
  candidatePath: string,
  options?: { cwd?: string }
): {
  absolutePath: string;
  canonicalPath: string;
  nearestExistingAncestor: string;
};

export function validatePlanOwnedEnvironmentInventory(
  plan: ValidatedRunPlan,
  environment: Record<string, string | undefined>,
  liveHomeProof: LiveHomeProof
): Record<string, string>;

export function validatePlaywrightOwnerEnvironment(
  environment: Record<string, string | undefined>,
  liveHomeProof: LiveHomeProof,
  options?: {
    cwd?: string;
    osTempDir?: string;
    processId?: number;
  }
): PlaywrightOwnerValidation | null;

export function applyValidatedPlaywrightOwnerEnvironment(
  validated: PlaywrightOwnerValidation | null,
  liveHomeProof: LiveHomeProof,
  targetEnvironment?: Record<string, string | undefined>
): Record<string, string | undefined>;
