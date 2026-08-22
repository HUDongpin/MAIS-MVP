declare const liveHomeProofBrand: unique symbol;

export interface LiveHomeProof {
  readonly [liveHomeProofBrand]: "LiveHomeProof";
}

export function createLiveHomeProof(options?: {
  readonly expectedHomeValueSha256?: string;
}): LiveHomeProof;

export function assertLiveHomeProof(
  proof: LiveHomeProof,
  options?: { readonly expectedHomeValueSha256?: string }
): void;

export function liveHomeValueSha256(proof: LiveHomeProof): string;

export function assertPathOutsideLiveHome(
  proof: LiveHomeProof,
  candidatePath: string
): void;

export function assertNoLiveHomeRetention(
  proof: LiveHomeProof,
  candidate: unknown
): void;
