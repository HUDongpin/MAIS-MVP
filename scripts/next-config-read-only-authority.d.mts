import type { LiveHomeProof } from "./live-home-protection.mjs";
import type { PlaywrightOwnerValidation } from "./playwright-owner-paths.mjs";
import type { RequiredBrowserInvocationReceipt } from "./required-browser-execution-scope.mjs";

export type NextConfigInvocationClassification = Readonly<{
  commandId:
    | "owner.next.build"
    | "owner.next.service"
    | "static.next-config-read-only-import";
  expectedPhase:
    | "mais-next-config-read-only-import"
    | "phase-production-build"
    | "phase-production-server";
  mode: "owner-build" | "owner-service" | "read-only-import";
}>;

export type NextConfigPhysicalFileIdentity = Readonly<{
  canonicalPath: string;
  dev: string;
  ino: string;
  physical: true;
  sha256: string;
}>;

export type NextConfigPhysicalDirectoryIdentity = Readonly<{
  canonicalPath: string;
  dev: string;
  ino: string;
  physical: true;
}>;

export type NextConfigPhysicalObservation = Readonly<{
  canonicalPath: string;
  ctimeNs: string;
  dev: string;
  ino: string;
  kind: "directory" | "file";
  mode: string;
  mtimeNs: string;
  nlink: string;
  physical: true;
  realpath: string;
  size: string;
}>;

export type NextConfigPhysicalTransition = Readonly<{
  after: NextConfigPhysicalObservation;
  before: NextConfigPhysicalObservation;
}>;

export type NextConfigDependencyAuthority = Readonly<{
  cli: NextConfigPhysicalFileIdentity;
  manifest: NextConfigPhysicalFileIdentity;
  nodeModules: NextConfigPhysicalDirectoryIdentity;
  packageRoot: string;
  schemaVersion: 1;
  sha256: string;
  sources: readonly (NextConfigPhysicalFileIdentity & Readonly<{
    path:
      | "dist/bin/next"
      | "dist/server/lib/router-server.js"
      | "dist/server/lib/start-server.js"
      | "dist/shared/lib/constants.js";
  }>)[];
  version: "15.5.23";
}>;

export type NextConfigReadOnlyAuthority = Readonly<{
  argvSha256: string;
  authorityFingerprint: string;
  commandId: "static.next-config-read-only-import";
  controlEnvironment: Readonly<{
    flagValueSha256: string;
    inventorySha256: string;
  }>;
  cwd: string;
  executable: NextConfigPhysicalFileIdentity;
  homeValueSha256: string;
  mode: "read-only-import";
  repo: NextConfigPhysicalDirectoryIdentity;
  requiresLiveHomeProtection: true;
  schemaVersion: 1;
  sources: readonly (NextConfigPhysicalFileIdentity & Readonly<{ path: string }>)[];
}>;

export type OwnerNextConfigAuthority = Readonly<{
  authorityFingerprint: string;
  command: RequiredBrowserInvocationReceipt;
  cwd: string;
  dependencyAttestationFingerprint: string;
  executable: NextConfigPhysicalFileIdentity;
  expectedPhase: "phase-production-build" | "phase-production-server";
  frameworkInjectedEnvironment: Readonly<{
    entries: readonly Readonly<{
      key: string;
      semanticClass: "framework-exact-literal";
      valueSha256: string;
    }>[];
    inventorySha256: string;
    schemaVersion: 1;
  }>;
  homeValueSha256: string;
  interfaces: Readonly<{
    nextDist: string;
    nextTsconfig: string;
    serviceBaseUrl: string;
    servicePort: number;
  }>;
  manifest: NextConfigPhysicalFileIdentity;
  mode: "owner-build" | "owner-service";
  next: NextConfigDependencyAuthority;
  planFingerprint: string;
  repoRoot: string;
  requiresLiveHomeProtection: true;
  schemaVersion: 1;
  scopeFingerprint: string;
  sourceFingerprintsSha256: string;
}>;

export function validateNextConfigPhysicalObservationSnapshot(
  observation: NextConfigPhysicalObservation,
  expectedKind: "directory" | "file"
): NextConfigPhysicalObservation;

export function validateNextConfigPhysicalTransitionSnapshot(
  transition: NextConfigPhysicalTransition,
  expectedKind: "directory" | "file"
): NextConfigPhysicalTransition;

export function validateNextConfigPhysicalDirectoryIdentitySnapshot(
  identity: NextConfigPhysicalDirectoryIdentity
): NextConfigPhysicalDirectoryIdentity;

export function validateNextConfigPhysicalFileIdentitySnapshot(
  identity: NextConfigPhysicalFileIdentity
): NextConfigPhysicalFileIdentity;

export function validateNextConfigDependencyAuthoritySnapshot(
  authority: NextConfigDependencyAuthority
): NextConfigDependencyAuthority;

export function classifyNextConfigInvocationContext(input?: {
  argv?: readonly string[];
  cwd?: string;
  environment?: Readonly<Record<string, string | undefined>>;
}): NextConfigInvocationClassification;

export function captureNextConfigReadOnlyAuthority(input: {
  argv?: readonly string[];
  cwd?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  liveHomeProof: LiveHomeProof;
}): NextConfigReadOnlyAuthority;

export function assertNextConfigReadOnlyAuthorityUnchanged(
  capture: NextConfigReadOnlyAuthority,
  input: Parameters<typeof captureNextConfigReadOnlyAuthority>[0]
): NextConfigReadOnlyAuthority;

export function captureOwnerNextConfigAuthority(input: {
  argv?: readonly string[];
  cwd?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  liveHomeProof: LiveHomeProof;
  ownerValidation: PlaywrightOwnerValidation;
  invocationReceipt: RequiredBrowserInvocationReceipt;
}): OwnerNextConfigAuthority;

export function assertOwnerNextConfigAuthorityUnchanged(
  capture: OwnerNextConfigAuthority,
  input: Parameters<typeof captureOwnerNextConfigAuthority>[0]
): OwnerNextConfigAuthority;

export const NEXT_CONFIG_READ_ONLY_IMPORT_PHASE: "mais-next-config-read-only-import";
