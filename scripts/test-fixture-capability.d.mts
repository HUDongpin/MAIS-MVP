declare const REQUIRED_BROWSER_TEST_FIXTURE_CAPABILITY_V2_BRAND: unique symbol;
declare const REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_FIXTURE_RESERVATION_V1_BRAND:
  unique symbol;

export type RequiredBrowserTestFixtureCapabilityV2 = Readonly<{
  readonly [REQUIRED_BROWSER_TEST_FIXTURE_CAPABILITY_V2_BRAND]: never;
}>;

export type RequiredBrowserSyntheticLifecycleTestFixtureReservationV1 =
  Readonly<{
    readonly [
      REQUIRED_BROWSER_SYNTHETIC_LIFECYCLE_TEST_FIXTURE_RESERVATION_V1_BRAND
    ]: never;
  }>;

export type RequiredBrowserTestFixturePhysicalIdentityV1 = Readonly<{
  dev: string;
  ino: string;
}>;

export type RequiredBrowserTestFixtureDefinitionV2 = Readonly<{
  schemaVersion: 2;
  kind: "mais-test-fixture-removal-capability";
  creatorProcessBindingFingerprint: string;
  nonce: string;
  repoRoot: string;
  repoTmpRoot: string;
  parent: string;
  parentIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  leaf: string;
  leafIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  protectedRoots: readonly string[];
}>;

export type RequiredBrowserTestFixtureMarkerV2 = Readonly<{
  schemaVersion: 2;
  definition: RequiredBrowserTestFixtureDefinitionV2;
  definitionFingerprint: string;
  markerFingerprint: string;
}>;

export type RequiredBrowserTestFixtureViewV2 = Readonly<{
  schemaVersion: 2;
  definition: RequiredBrowserTestFixtureDefinitionV2;
  definitionFingerprint: string;
  markerFingerprint: string;
  markerIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  markerSha256: string;
  viewFingerprint: string;
}>;

export type RequiredBrowserTestFixtureFilesystemSnapshotV2 = Readonly<{
  leaf: string;
  leafIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  leafKind: "directory";
  markerIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  markerKind: "file";
  markerSha256: string;
  parentIdentity: RequiredBrowserTestFixturePhysicalIdentityV1;
  parentKind: "directory";
  tree: readonly unknown[];
}>;

export type RequiredBrowserTestFixtureHookContextV2 = Readonly<{
  view: RequiredBrowserTestFixtureViewV2;
  absolutePath?: string;
  leaf?: string;
  phase: string;
  quarantine?: string;
  relativePath?: string;
  target?: string;
}>;

export type RequiredBrowserTestFixtureRemovalHooksV2 = Readonly<{
  beforeLstat?(context: RequiredBrowserTestFixtureHookContextV2): void;
  beforeRename?(context: RequiredBrowserTestFixtureHookContextV2): void;
}>;

export type RequiredBrowserTestFixtureRemovalResultV2 = Readonly<{
  leaf: string;
  quarantine: string;
  removed: false;
  status: "quarantined-retained";
}>;

export function createTestFixtureCapability(
  repoRoot?: string,
  options?: Readonly<{
    nonce?: string;
    protectedRoots?: readonly string[];
  }>
): RequiredBrowserTestFixtureCapabilityV2;

export function readTestFixtureCapabilityView(
  capability: RequiredBrowserTestFixtureCapabilityV2
): RequiredBrowserTestFixtureViewV2;

export function validateRegisteredTestFixtureCapability(
  value: unknown
): RequiredBrowserTestFixtureCapabilityV2;

export function reserveRequiredBrowserSyntheticLifecycleTestFixture(
  capability: RequiredBrowserTestFixtureCapabilityV2
): RequiredBrowserSyntheticLifecycleTestFixtureReservationV1;

export function releaseRequiredBrowserSyntheticLifecycleTestFixture(
  reservation: RequiredBrowserSyntheticLifecycleTestFixtureReservationV1
): void;

export function validateFixtureRemovalRequestDefinition(
  capability: RequiredBrowserTestFixtureCapabilityV2
): true;

export function validateFixtureRemovalTransition(
  capability: RequiredBrowserTestFixtureCapabilityV2,
  preflight: RequiredBrowserTestFixtureFilesystemSnapshotV2,
  beforeRename: RequiredBrowserTestFixtureFilesystemSnapshotV2
): true;

export function removeTestFixtureCapability(
  capability: RequiredBrowserTestFixtureCapabilityV2,
  options?: Readonly<{ hooks?: RequiredBrowserTestFixtureRemovalHooksV2 }>
): RequiredBrowserTestFixtureRemovalResultV2;
