# MAIS-NATURAL-CA60-V5 provider authorization sequencing

## Outcome

The California frame and 60-cluster sample are now frozen, independently
recomputed, and method/claim reviewed. The two full provider authorizations are
still **not safely issuable**. This document is a blocker and sequencing report,
not an authorization.

Machine-readable report self-hash:
`9261eaa9300935be7ec2a73ba05be11107baa13ab5d8d031b7af621d863e47af`.

The reason is procedural rather than financial: V5 still declares the live
runner incomplete; `label-openai` and `execute-deepseek` fail closed; A21's
OpenAI transport is fixture-only; there is no implemented OpenAI project-route
preflight runner or direct DeepSeek adapter. A full authorization must bind the
exact final runner/adapter hashes and their fresh A11 review. It cannot bind a
future implementation by placeholder.

## Current frozen roots

- design registration:
  `e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632`
- frame registration:
  `b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f`
- sample manifest:
  `d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159`
- 60-item payload-set root:
  `952d8b54540e6ef000be2cbc9b3aff3e0686c8c49d65c283f1b98b2a3c3ccda0`
- selected privacy-screen root:
  `eaf318921d47d8832c54a5df42b0e6fb6abe4d7e7484bc65153bae4043a9e446`
- selected rights-screen root:
  `62afebea22efc89645134100f082cfaf4d82d024e7c15a26c16861fac1d784cb`
- A11 independent frame/sample review:
  `431c06140638d9bd278f99c5bc9c373895ce8c133bc0bdf03e51ae152f6b38f9`
- A18 method/claim review:
  `74eebf0c90780036ebcd86f9b39cd14bbc13b4215504091bde1828ad346c5b96`

The payload and screen roots were computed only from the selected item hashes
and their already-protected screen/egress receipt hashes. No item text or
original item ID is published here.

## Frozen provider order

1. Implement a versioned live runner offline, declare `supersedes`, and obtain
   fresh A11 concurrence. This needs no credential or provider authority.
2. Obtain a narrow OpenAI credential-readiness and project-route-preflight
   authorization. The probe contains no natural-question text.
3. After the exact preflight, price, entitlement, and billing hashes exist,
   obtain the full OpenAI machine-reference authorization.
4. Complete and seal all 60 machine-reference labels.
5. Only then obtain a separate DeepSeek credential-readiness and route-probe
   authorization; its probe contains no natural-question text.
6. After that exact route receipt exists, obtain the full DeepSeek evaluation
   authorization and freeze the execution registration.

The order cannot be collapsed into two immediately effective full grants. In
particular, DeepSeek authorization cannot precede the reference-label seal, and
OpenAI full authorization cannot precede the exact US-project route receipt.

## Preliminary OpenAI cost check

OpenAI's public model page currently lists GPT-5.6 Luna at USD 0.20 per million
input tokens, USD 0.02 per million cached-input tokens, and USD 1.20 per million
output tokens. OpenAI's data-residency documentation requires the
`us.api.openai.com` prefix for US regional storage and processing; the pricing
page states a 10% regional-processing uplift for eligible recent models.

On that public list-price basis, the deliberately conservative case in which
all 4,000,000 authorized tokens are billed at the regional output rate is USD
5.28; applying the frozen 20% buffer gives USD 6.336, below the USD 25 cap.
This arithmetic does not replace project entitlement, service-tier, invoice,
or billing-route evidence. A project-bound price snapshot is still mandatory.

## Authority boundary

No credential was read. No provider API was called. No natural-question text
was egressed. No token, attempt, or USD authority was created. Reference labels,
DeepSeek evaluations, and natural-question results remain zero.

Current claim ceiling:

> `FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED_INDEPENDENTLY_REVIEWED`

No `PASS`, `APPROVED`, `PRODUCTION_READY`,
`LIMITED_GENERALIZATION_EVIDENCE`, or general machine-QA validity claim is
permitted.
