export const REQUIRED_BROWSER_PROOF_PRIMITIVES_SCHEMA_VERSION: 5;
export const REQUIRED_BROWSER_ENVIRONMENT_HASH_SCHEMA_VERSION: 2;
export const REQUIRED_BROWSER_PROOF_FRAME_TAG: "MAIS_PROOF_V1";
export const REQUIRED_BROWSER_ENVIRONMENT_FRAME_TAG: "MAIS_ENV_V2";
export const REQUIRED_BROWSER_ENVIRONMENT_KEY_PATTERN: "^[A-Z][A-Z0-9_]*$";

export type RequiredBrowserCanonicalJsonArtifact = Readonly<{
  text: string;
  byteLength: number;
  sha256: string;
  copyBytes(): Uint8Array;
}>;

export type RequiredBrowserVerifiedCanonicalJsonArtifact = Readonly<{
  value: unknown;
  text: string;
  byteLength: number;
  sha256: string;
  copyBytes(): Uint8Array;
}>;

type RequiredBrowserProofCompatibilityBase = Readonly<{
  byteLength: number;
  canonicalUtf8Hex: string;
  expectedSha256: string;
  framedBytesHex: string;
  id: string;
}>;

export type RequiredBrowserProofCompatibilityVector =
  | (RequiredBrowserProofCompatibilityBase & Readonly<{
      inputBytesHex: string;
      primitive: "sha256-sanity";
    }>)
  | (RequiredBrowserProofCompatibilityBase & Readonly<{
      canonicalText: string;
      inputJson: string;
      primitive: "canonicalizeClosedJson" | "canonicalizeClosedJsonArtifact";
    }>)
  | (RequiredBrowserProofCompatibilityBase & Readonly<{
      domain: string;
      inputJson: string;
      primitive: "hashCanonicalProof";
    }>)
  | (RequiredBrowserProofCompatibilityBase & Readonly<{
      exactBytesHex: string;
      key: string;
      primitive: "hashEnvironmentValue";
    }>)
  | (RequiredBrowserProofCompatibilityBase & Readonly<{
      exactText: string;
      key: string;
      primitive: "hashEnvironmentText";
    }>);

export type RequiredBrowserProofByteInputPolicy = Readonly<{
  accepted: readonly (
    | "base-uint8array"
    | "cross-realm-uint8array"
    | "node-buffer"
    | "uint8array-subclass-with-ignored-overrides"
  )[];
  rejected: readonly (
    | "proxy"
    | "shared-array-buffer-backing"
    | "resizable-array-buffer-backing"
    | "detached-array-buffer-backing"
    | "out-of-bounds-view"
    | "data-view"
    | "non-uint8-typed-array"
    | "non-view"
  )[];
  schemaVersion: 1;
}>;

export type RequiredBrowserProofRejectPrimitive =
  | "canonicalizeClosedJson"
  | "hashCanonicalProof"
  | "hashEnvironmentText"
  | "hashEnvironmentValue"
  | "verifyCanonicalJsonArtifactBytes";

export type RequiredBrowserProofRejectCode =
  | "REQUIRED_BROWSER_PROOF_VALUE_REJECTED"
  | "REQUIRED_BROWSER_PROOF_DOMAIN_REJECTED"
  | "REQUIRED_BROWSER_ENVIRONMENT_KEY_REJECTED"
  | "REQUIRED_BROWSER_ENVIRONMENT_BYTES_REJECTED"
  | "REQUIRED_BROWSER_ENVIRONMENT_TEXT_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_BYTES_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_SHA256_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_UTF8_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_JSON_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_CANONICALITY_REJECTED"
  | "REQUIRED_BROWSER_CANONICAL_ARTIFACT_EXPECTED_VALUE_REJECTED";

export type RequiredBrowserProofRejectVector = readonly [
  primitive: RequiredBrowserProofRejectPrimitive,
  caseId: string,
  errorCode: RequiredBrowserProofRejectCode
];

export const REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS:
  readonly RequiredBrowserProofCompatibilityVector[];
export const REQUIRED_BROWSER_PROOF_BYTE_INPUT_POLICY:
  RequiredBrowserProofByteInputPolicy;
export const REQUIRED_BROWSER_PROOF_REJECT_VECTORS:
  readonly RequiredBrowserProofRejectVector[];

export function canonicalizeClosedJsonArtifact(
  value: unknown
): RequiredBrowserCanonicalJsonArtifact;
export function canonicalizeClosedJson(value: unknown): string;
export function hashCanonicalProof(domain: string, value: unknown): string;
export function hashEnvironmentText(key: string, exactText: string): string;

export function hashEnvironmentValue(
  key: string,
  exactBytes: Uint8Array
): string;
export function verifyCanonicalJsonArtifactBytes(
  exactBytes: Uint8Array,
  expectedSha256: string,
  expectedValue?: unknown
): RequiredBrowserVerifiedCanonicalJsonArtifact;
