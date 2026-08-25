# MAIS Natural CA60 V5 activation record

This directory records the append-only activation of the independently reviewed
V5 method registration. It does not modify the sealed bytes under
`versions/design-v5/` and it does not authorize a provider request.

## Current state

- Active method pointer: `MAIS-NATURAL-CA60-V5`.
- V5 registration hash:
  `e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632`.
- V5 sealed package root:
  `66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1`.
- A11 preactivation review: `CONCURRED`, review hash
  `2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9`.
- Activation receipt hash:
  `086c84b661ba9f9720f6afea8c4e0fcd50e3c4d0247da318f23235c52c3d2442`.
- Provider events at activation: `0`.
- First provider execution allowed: `false`.
- Decision ceiling: `INCONCLUSIVE_MACHINE_REFERENCE`.

The prior V3 pointer is preserved byte-for-byte in
`prior-active-design-pointer.json`. `activation-receipt.json` binds both pointer
hashes, the sealed V5 design roots, the reviewed A21 runner/adapter/custody roots,
and the A11 verification and review hashes.

## Remaining gates

Activation only makes V5 the current method. It leaves frame and sample
registration, fine-grained rights/lineage review, clean execution environment,
OpenAI project-route and credential readiness, current price evidence, both live
provider authorizations, the reference-label seal, and the final execution
registration unresolved. The production guard therefore continues to fail closed
with zero HTTP requests.

## Historical test interpretation

The sealed V5 candidate and reviewed A21 runner contain four assembly-time tests
whose literal premise is that the mutable active pointer is still V3. Those exact
bytes are retained because changing them would invalidate the reviewed V5 package
or runner roots. After activation, a combined historical glob therefore reports
72 passing tests and four expected lifecycle-premise failures. This is not a
runtime-contract failure: the activation suite separately verifies the current V5
pointer, A11 binding, and zero-dispatch behavior. Current-state verification must
run `activation.test.mjs`; historical candidate tests remain evidence of the
preactivation snapshot.

No natural question, credential, provider response, reference label, evaluation
result, or execution authorization is stored in this directory.
