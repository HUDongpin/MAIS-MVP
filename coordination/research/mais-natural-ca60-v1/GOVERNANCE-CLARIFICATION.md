# Governance clarification: natural CA60 registration

## Supersession status

The earlier synthetic v2 package being offline-ready did **not** mean that a natural-item evaluation was ready, authorized, executed, reviewed, or suitable for production. Synthetic-fixture readiness and natural runtime-visible sampling are different evidence classes with different privacy, rights, homology, authorization, receipt, and statistical requirements.

The earlier natural plan for 180 clusters—California 60, Hong Kong 60, and Mainland China 60—is now recorded as `SUPERSEDED_NOT_EXECUTED`. It did not produce a valid sampling frame, sample manifest, provider authorization, provider-attempt chain, item-result set, final evaluation receipt, or independent review receipt under this registration.

## Append-only rule

Historical design files, source hashes, preservation archives, and any historical receipts remain immutable. They must not be deleted, rewritten, backdated, or relabeled to look like CA60-v1 evidence. Supersession is append-only: a new artifact may point to an old artifact and state its status, but it must not mutate the old artifact or reuse its identity.

The frozen provenance links are:

- preserved prior natural-design SHA-256: `85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867`;
- preservation archive SHA-256: `2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71`; and
- baseline commit: `b6c7c347a49a813e454e707dd3c16399dcf29909`.

These links establish provenance, not correctness or execution.

## Authority boundary

This A16 design registration freezes research assumptions and analysis rules only. It does not authorize A21 sampling or payload preparation, A19 credential or environment placement, A07 provider behavior changes, A11 quality conclusions, A22 deployment, A18 curriculum acceptance, or any provider call.

Before a first provider event, the future chain must separately freeze and hash the eligible sampling frame, the deterministic 60-cluster manifest, and provider-specific authorizations that bind origin, model, payload-set hash, expiry, and hard budget caps. Attempt receipts must then be append-only and hash-chained. Final evaluation and independent review remain distinct downstream artifacts. No downstream artifact may retrospectively change this design or its thresholds.
