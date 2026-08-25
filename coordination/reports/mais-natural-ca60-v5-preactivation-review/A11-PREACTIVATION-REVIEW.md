# MAIS Natural CA60 V5 — A11 pre-activation review

## Review outcome

> `CONCURRED_FOR_PREACTIVATION_METHOD_AND_RUNNER_ROOTS_ONLY`

A11 independently recomputed the frozen V5 design/package roots and the A21
runner/custody roots without importing A21 implementation modules. All 34
registered checks passed. The negative tamper fixture changed a copied custody
runner root and correctly produced `DISCREPANCY`.

This concurrence establishes only that the reviewed V5 candidate and offline
runner/custody evidence are internally reproducible at the exact roots below.
It is not a provider authorization, a route-entitlement proof, an execution
result, the later 60-item independent recomputation, or human gold-label review.

## Exact reviewed roots

- V5 design registration: `e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632`
- V5 design package: `66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1`
- A21 runner implementation commit: `1dc093a1d0a300495dcd671091c849d24410fd5e`
- runner source manifest: `2d333700f464fc856beea60f8f96c276eaaaaaed10b476b841c06ba4b9a127b0`
- OpenAI reference adapter: `63beb1ca15a26c71563a73447f347383bdaa31cb27a2b932b33d534007767013`
- runner root: `cfef4f67e1c294e60f10de594dea59828c4f4a94b8465e55ab36b5b65285789c`
- protected custody registry: `aa48b5d02996ceed02daff2579b8961a4e5ea3c373dfdc023085fa181c2914a1`
- independent verification: `f57d16b7a6603960511d2aae59b36911cbb9fec1bffaa63967cbd125da98ade4`
- A11 review receipt: `2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9`

## What was independently recomputed

- V5 registration self-hash and zero-provider-event state.
- Exact OpenAI reference tuple: `OPENAI_DIRECT`, `US_STORAGE_PROCESSING`,
  `https://us.api.openai.com/v1/responses`, `gpt-5.6-luna`, Responses API v1.
- Threshold chronology, structural CA60 infeasibility, and
  `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling.
- Every V5 package-manifest byte, package root, and manifest self-hash.
- The unchanged active pointer to V3 and its `firstProviderExecutionAllowed=false` state.
- Protected custody mode `0600`, self-hash, design/package bindings, and both
  nonauthorization flags.
- All 17 runner source rows directly from Git object bytes at the reviewed
  implementation commit, not from the mutable working tree.
- Runner source-manifest root, unique adapter source/hash, and composite runner root.
- Static absence of live HTTP/SDK/socket, credential, key, or environment
  primitives in the committed runner source closure.
- CLI migration to `label-openai` and production guard pinning to on-disk
  design/pointer roots plus fixture-only transport.

## Remaining gates

This review does not clear the following:

1. An append-only activation/pointer decision must explicitly bind this A11
   review and must not rewrite V5, V4, or historical receipts.
2. Fine-grained source lineage and rights/egress decisions remain required.
3. A22 must establish an exact-SHA clean execution environment and runtime parity.
4. The complete California frame, whole-frame cluster audit, and deterministic
   60-cluster sample remain unfrozen.
5. The owner project's exact US route/model entitlement, current price snapshot,
   and redacted credential readiness remain unverified.
6. Separate, unexpired, hash-bound OpenAI and DeepSeek authorizations remain absent.
7. No OpenAI reference label, DeepSeek canary/result, score, final receipt, or
   post-execution A11/A18 review exists.

The reference panel still uses the same GPT-5.6 Luna model for A, B, and
adjudication, so correlated machine error remains a stated limitation. Even a
complete CA60 run cannot emit `PASS`, `APPROVED`, `PRODUCTION_READY`, or
`LIMITED_GENERALIZATION_EVIDENCE`; the registered ceiling remains
`INCONCLUSIVE_MACHINE_REFERENCE`.
