# 2026-08-25 A16 — MAIS Natural CA60 Design V3

## Session identity and custody

- Lane: `A16` research and learning-science design registration.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-natural-ca60-registration-v1-20260824`.
- Branch: `codex/a16-natural-ca60-registration-v1-20260824`.
- Baseline/unchanged HEAD during this V3 work: `ea67cac702c47b971666766ae13fe2a5494377f1`.
- Target PR: `pending`; this session did not push or open a PR.
- Session status: `READY_FOR_PRECOMMIT_REVIEW / DONE_WITH_CONCERNS`.
- Git status: no stage, commit, push, merge, rebase, stash, reset, cleanup, or predecessor rewrite was performed.

## Outcome

An append-only `NaturalCaPilotDesignRegistrationV3` now supersedes V2 before any frame freeze or provider call. The mutable, explicitly non-registration active pointer selects V3 and binds V2 as its predecessor. Every committed V1/V2 byte remains protected by the predecessor golden-hash ledger.

- V3 design registration root: `08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d`.
- V2 predecessor root: `a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8`.
- Canonical 23-schema set root: `a9167ab56cff6afb6336cab2ed7c9d9bc8236a538935128ecfbb426fe7951120`.
- External statistical-power artifact self-hash: `4aa1761d345a94b90ed6168d509cdf5122f725145b6887d4d7f13b21e455549a`.
- Hash-DAG definition root: `60267bd7fcf2c09ce9209b904f0e4f5f7214b9894063cd1ae86eda383c359fef`.
- Sample algorithm descriptor root: `952bf9d73d0aeec80add57af3b7da9b11ba892feb52eb4bcaa31e7691187ba94`.
- C0 audit algorithm descriptor root: `c503026d8ecb4b00c491b2c28be4a2704cddff884706c0fea03ca177bb063899`.
- Runtime source-enumeration evidence-contract root: `7dbcce3a4f723fdfa8c9aa08acb0bcf4b78f3a696d144209f352d7c7677e005f`.
- Provider event count: `0`.

The registration freezes the all-runtime-visible versus egress-eligible estimand boundary; complete source enumeration and 13-grade evidence; full-frame homology recomputation; deterministic capacity-aware Hamilton CA60 sampling; random C0-12 plus mandatory-trigger union; exact Qwen/DeepSeek prompt, role, egress, authorization, price, cap, attempt, receipt, and call-graph contracts; machine-reference sealing; final raw-leaf metric recomputation; unified nonresolved accounting; and A11/A18 public-export gates.

The all-zero sample golden-vector input was removed. Its non-execution fixture `designHash` is now the nonzero semantic hash `4b2c011701d713fd41162dbaaa452e5d8ed35ce3439e53db3a702f7ab9c2e7b8`; actual sampling still uses the frozen registration root as `designHash`.

## TDD and validation evidence

- V3 complete suite: `node --test *.test.mjs` from `versions/design-v3/` — `177/177` pass, `0` fail, `249241.397 ms`.
- V3 schema suite: `14/14` pass, including the final `unifiedNonresolvedItemCount` schema and no-cycle downstream-hash scan.
- V3 A11 review-gate suite: `45/45` pass, including a distinct post-execution source-enumeration rerun and stable missing-evidence fail-closed behavior.
- V3 package-integrity suite: `6/6` pass.
- V3 zero-network validator: `ok=true`, `schemaCount=23`, `providerEventCount=0`, `decisionCeiling=INCONCLUSIVE_MACHINE_REFERENCE`, no errors.
- V1 fresh regression after pointer transition: `12/12` pass.
- V2 fresh regression before pointer transition: `76/76` pass.
- V2 after the authorized pointer transition: `75/76` pass; the sole expected historical failure is V2's immutable assertion that the mutable active pointer still selects V2. V3 package-integrity independently proves the V2 bytes are unchanged and the V3 predecessor link is exact. The V2 test was not rewritten to hide that lifecycle transition.

High-risk adversarial cases covered include cross-item/provider role mixing, fabricated labels and bounds, best-of-N calls, stale/missing authorization, owner-root substitution, token/cost double counting, cap bypass, source-inventory deletion, duplicate ID and homology manipulation, time-based reroll, result-dependent replacement, counterfactual/observed count mixing, cache poisoning, denominator inflation by repeated findings, four-item nonresolved overflow, summary-only A11 concurrence, copied source rerun receipts, public-report unknown fields, sensitive leaves, and overclaim wording.

## Claim and execution boundary

This is a design-only package. It did not freeze a real frame or sample, obtain provider/egress/token/attempt/USD authorization, send any California item to Qwen or DeepSeek, produce a natural-item result, or perform an actual A11/A18 review. It does not modify the app, API, question bank, credentials, deployment, or live content.

The reference source remains a correlated same-model `machine_reference_panel`, not human gold. The CA60 structural gate remains impossible to satisfy jointly for sensitivity and specificity under the frozen bounds (`25 + 52 = 77 > 60`). An integrity-preserving run therefore normally tops out at `INCONCLUSIVE_MACHINE_REFERENCE`; severe observed failure may yield `POLICY_REVISION_REQUIRED_MACHINE_REFERENCE`, while protocol/integrity breakage has higher precedence.

`DONE_WITH_CONCERNS` is used because provider execution, atomic/`0600` receipt persistence, runtime extraction, real authorization, live price snapshots, and independent rerun evidence are deliberately future A21/A07/A19/A11/A22 implementation and execution obligations. Their contracts are frozen and adversarially modeled here, but no live execution evidence exists.

## Handoff

Do not execute a provider request from this design artifact. The next authorized phase is an independent precommit spec/method/code-quality review of the uncommitted V3 files. Only after that review clears may an exact-scope local commit be authorized. Any pre-call change requires a new append-only design version with `supersedes`; any post-call material drift invalidates the affected run and requires preserved receipts plus a restart from the first item.
