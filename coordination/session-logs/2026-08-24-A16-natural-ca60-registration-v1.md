# A16 session log — MAIS-NATURAL-CA60-V1 registration

- Agent ID / owner: `A16` — Research and learning science
- Objective: freeze the natural California 60-cluster machine-reference pilot design, governance clarification, schemas, power evidence, and zero-network validator before any sampling or provider execution.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-natural-ca60-registration-v1-20260824`
- Branch: `codex/a16-natural-ca60-registration-v1-20260824`
- Baseline / live `origin/main` supplied for the assignment: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Creation date: `2026-08-24`
- Original expected closeout date: `2026-08-24`
- Updated expected and actual handoff date: `2026-08-25` (the session crossed midnight Asia/Hong_Kong; no same-day closeout is claimed)
- Target PR: `pending`
- Write scope: `coordination/research/mais-natural-ca60-v1/**` and this session log only.

## Frozen result

- Registered `MAIS-NATURAL-CA60-V1` for 60 distinct California runtime-visible, provider-egress-eligible homology clusters across 3 response forms × 3 difficulties.
- Bound the immutable registration to the baseline commit, preserved prior natural-design SHA-256, preservation archive SHA-256, and fixed UTC freeze timestamp.
- Froze Qwen `qwen3.8-max` as machine reference and DeepSeek `deepseek-v4-pro` as evaluated provider; this is explicitly not human-gold evidence.
- Froze NFKC/template-skeleton homology rules, Hamilton allocation, deterministic SHA-256 selection, no result-aware reroll/replacement, taxonomy/severity, raw/final-label separation, adjudication, metrics, Wilson methods, threshold precedence, claim ceiling, egress controls, and budget caps.
- Recorded `25 + 52 = 77 > 60`, so CA60 cannot make `LIMITED_MACHINE_REFERENCE` available; the ceiling remains `INCONCLUSIVE_MACHINE_REFERENCE`.
- Added nine closed-root JSON Schemas and a read-only validator with a machine-readable `--json` mode.
- Clarified that synthetic v2 offline readiness did not establish natural-item readiness and that the prior California/Hong Kong/Mainland 180-cluster design is `SUPERSEDED_NOT_EXECUTED` under append-only governance.

## TDD evidence and checks

The implementation used vertical red→green slices. Observed red states included missing `design-contract.mjs`, missing `design-registration.json`, missing `statistical-power.json`, missing `schemas/`, and missing `validate-design-registration.mjs`. Each public behavior was then made green before the next package slice.

- `node --test coordination/research/mais-natural-ca60-v1/*.test.mjs` — passed 12/12.
- `node coordination/research/mais-natural-ca60-v1/validate-design-registration.mjs` — passed: registration hash `663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7`, 9 schemas, 0 provider events, ceiling `INCONCLUSIVE_MACHINE_REFERENCE`.
- `node coordination/research/mais-natural-ca60-v1/validate-design-registration.mjs --json` — returned `ok: true`, 9 schemas, 0 provider events, `thresholdFreezePrecedesProviderEvents: true`, and no errors; it created no output file.
- No app build, type-check, browser check, or deployment check was required because the authorized slice is dependency-free research artifacts and package-local Node tests only.

## Limitations and non-claims

- No natural sampling frame or 60-cluster sample manifest has been created.
- No provider authorization exists. `firstProviderExecutionAllowed` remains `false`.
- No credentials or secret sources were read, copied, changed, or validated.
- No Qwen or DeepSeek call, network request, cost, result, human-gold label, independent review, or production smoke occurred.
- This package makes no PASS, approval, production, promotion, live-runtime, deployment, or curriculum-acceptance claim.
- No upstream push, PR creation, merge, deployment, or other Git delivery is claimed here. The controller owns any upstream delivery after review.

## Handoff

- `A18` curriculum QA: independently review the taxonomy, label instructions, unresolved rule, and future item-level adjudication evidence; do not treat machine reference as human gold.
- `A21` content/RAG operations: build a rights/privacy-screened, runtime-visible California frame and homology components only after this design hash is accepted; freeze the frame and manifest as separate artifacts.
- `A11` QA/release quality: independently exercise drift failures, schema/receipt fixtures, decision precedence, and the no-provider default before accepting a future evaluation package.
- `A19` API configuration: prepare only redacted provider-readiness and separately signed authorization evidence; do not expose or record credentials.
- `A22` release engineering: validate only from a clean reviewed slice and keep registration, execution, deployment, and live behavior as distinct evidence boundaries.
- `A07` provider behavior: any provider request/response implementation or model behavior remains separately owned and must preserve the frozen model/role separation.
- `A25` release intake: verify exact-path custody and the local reviewable commit; no broad staging or cleanup is authorized.
