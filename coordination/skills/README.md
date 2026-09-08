# MAIS Question-QA Skill Suite

This directory is the canonical, reviewable source for five narrowly routed MAIS Skills. It is a suite, not an umbrella router: each Skill must be independently triggerable, testable, packageable, installable, and removable.

## Current source and historical verification

The 1.1.1 candidate adds the PR #240 evidence-reader, release-authority, calendar-date and cross-platform test repairs to the September 7 rules and Skill adaptations. Its source hashes describe these files, while package builds, model evaluations, installation, commit, push and merge are pending for this version. The unchanged August 27 manifest and benchmark/installation receipts are historical evidence linked from `suite-manifest.json`; they do not certify the current files. Repository integration does not install these Skills into a global runtime.

The current native Promotion workflow remains outside this suite's closed recognizer (`WORKFLOW_STRUCTURE_INVALID` at native main `34c10c20`). See [native compatibility](native-compatibility.json). Offline tests validate their frozen fixtures; they do not authorize current native execution or remove this compatibility hold.

The release-handoff builder now requires independently authenticated raw evidence from a trusted host I/O adapter. The ordinary Git adapter has no such production identity protocol and fails closed. Synthetic offline adapters test verification logic only; they do not establish real release authorization. The prior source manifest is preserved under `reviewBaseline` in the current manifest.

## Routing Topology

| Object being decided | Primary Skill | Highest native authority |
| --- | --- | --- |
| Deterministic/RSI, B-prime, conditional C0-prime, D-prime, machine packet | `mais-rsi-machine-qa-workflow` | Machine disposition only |
| Registered natural sample, provider/reference execution state, aggregate generalization | `mais-natural-sample-evaluation` | Registered natural-evaluation claim ceiling |
| Question/lesson correctness, curriculum, ambiguity, answers, pedagogy | `mais-content-qa-approval-workflow` | A18 `approved-for-integration-review` |
| Exact candidate Manifest/Receipt/Shadow/replay/currentness/Closure | `mais-content-promotion-gate` | Shadow lifecycle/currentness handoff |
| Dirty-tree slicing, readiness, build, CI, deployment, same-SHA route readback, live behavior, rollback | `mais-release-hygiene-deploy-workflow` | Exact independently proven release/live layer |

The object controls routing. Similar words do not merge evidence classes: a machine-review pass is not natural-population evidence, content acceptance is not Promotion, Shadow is not deployment, and `READY` is not same-SHA live behavior.

## Shared Evidence Envelope

The three specialist Skills each ship a complete self-contained JSON Schema for `EvidenceEnvelopeV1`. They do not import one another at runtime. `suite-tools/check-contract-parity.mjs` verifies the shared public fields:

- `schemaVersion`, `skill`, `mode`, and canonical `observedAt`;
- repository identity;
- evidence class and source identities;
- resolved state and authority;
- checks, blockers, claim ceiling, and next allowed action;
- evidence hashes;
- exact-false protected-content, credential, and raw-provider-response redaction declarations.

Specialist fields remain local to their Skill. Repository-native Manifest, Receipt, Closure, Registry, runner registration, provider grant, CI artifact, deployment record, and live readback remain authoritative; a Skill envelope is a redacted orchestration summary.

## Default Safety Posture

- Default operations are read-only discovery, state audit, offline validation, and non-authoritative redacted drafts.
- Provider calls, credential access, protected-content access, external transmission, fees, Git writes, deployment, database mutation, and live side effects require fresh exact authorization for the current task.
- Skills and committed fixtures contain no real credentials, protected natural-question text or IDs, raw provider responses, production data, or private account information.
- Dated model names, counts, prices, commits, attempt numbers, metrics, and maturity observations belong in non-normative case studies or the evidence snapshot in `suite-manifest.json`, not in stable workflow rules.

## Source, Package, Installation, and Live Boundaries

These are separate states:

1. canonical source exists in this branch/worktree;
2. source is committed;
3. `.skill` packages are built from a named source commit;
4. local installed Skills match package/source hashes;
5. branch is pushed or reviewed in a PR;
6. question content is integrated;
7. an application SHA is deployed;
8. intended same-SHA live behavior is proven.

No earlier state implies a later one. `suite-manifest.json` records each component's source hash, package hash, compatibility status, provenance snapshot, and installation readback once those facts exist.

## Validation

From the suite root:

```text
node suite-tools/check-contract-parity.mjs
node --test suite-tools/check-contract-parity.test.mjs
node suite-tools/hash-skill-tree.mjs SKILL_DIRECTORY
node suite-tools/hash-skill-tree.mjs --package-view SKILL_DIRECTORY
```

Run each Skill's own tests and the official Skill Creator `quick_validate.py` separately. Evaluation transcripts and built `.skill` archives belong in ignored local storage, not in this canonical source tree.

## 中文速览

这五个 Skill 分别回答五种不同问题：机器策略是否发现缺陷、策略是否在注册自然总体上泛化、内容本身是否可接受、精确候选包是否通过 Shadow 治理、已治理的 SHA 是否完成发布与 live 证明。任何一个绿灯都不能自动替代后续证据层。
