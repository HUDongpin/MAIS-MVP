# MAIS-MVP AgentOps v1

AgentOps v1 is a repository-local, read-only orchestration control plane. It
turns a host-compiled `AgentOpsRequestV1` into a deterministic task contract,
performs registered discovery and validation, routes the work to one primary
`A01`-`A25` lane, and emits a redacted handoff. It does not execute the work in
that handoff.

The source of truth is the canonical `AgentTaskContractV1`. A projected prompt
may be handed to Codex, Claude, a specialist skill, GraphOps, or a human, but the
projection cannot broaden the contract or AgentOps authority.

## Authority boundary

AgentOps v1 may:

- read repository metadata and registered repository paths;
- run deterministic, registered validation probes;
- write ignored local checkpoints and handoff artifacts below
  `.local/agentops/<runId>/`.

AgentOps v1 may never:

- write product code or content;
- read credentials or protected student/question/provider payloads;
- call an LLM or other provider;
- stage, commit, branch, merge, rebase, push, or otherwise mutate Git;
- invoke deployment, production-data, or release GraphOps runners;
- create content acceptance, promotion, release, deployment, or live claims.

These restrictions are implemented in the request schema, immutable authority
policy, fixed probe registry, persistence sanitizer, workflow decisions, and
tests. Request text, attachments, old prompts, configured secrets, or existing
receipts cannot change them.

## Runtime flow

The graph has exactly eight ordered nodes:

```text
agentops.intake
  -> agentops.contract
  -> agentops.discovery
  -> agentops.authority
  -> agentops.route
  -> agentops.specialist-preflight
  -> agentops.eval-plan
  -> agentops.handoff
```

The graph can end in only four states:

| State | Meaning |
| --- | --- |
| `handoff-ready` | A bounded handoff is ready for owner review. No delegated work was executed. |
| `clarification-required` | Up to three high-impact questions need answers. A run can interrupt at most twice. |
| `authorization-required` | The intended task needs an effect denied to AgentOps v1. A separate owner session must receive exact authorization. |
| `blocked` | Ownership, worktree, specialist currentness, integrity, or context prevents a unique safe handoff. |

Independent subcontracts are ordered; AgentOps never starts parallel writer
sessions. Release requests produce an A22/GraphOps handoff only. The GraphOps
runner registry is neither imported nor callable from this subsystem. Release
ordering always places the read-only A25 hygiene/intake preflight before the A22
GraphOps handoff. A registered discovery failure after bootstrap becomes a
sanitized `blocked:tool-failure` handoff rather than an unbounded tool error.

## Quick start

Use the direct wrapper; v1 intentionally adds no package script:

```sh
coordination/agentops/bin/agentops help
coordination/agentops/bin/agentops run \
  --request /absolute/path/to/request.json \
  --repo "$(git rev-parse --show-toplevel)" \
  --json
```

The request must match
[`schemas/agentops-request-v1.schema.json`](schemas/agentops-request-v1.schema.json).
The thin host-compilation rules and a complete example are in
[`skills/mais-agentops-intake/references/request-contract.md`](skills/mais-agentops-intake/references/request-contract.md).

For a clarification interrupt, copy the exact `runId`, `requestDigest`,
`contractDigest`, and question IDs into a strict clarification response, then
resume the same run:

```sh
coordination/agentops/bin/agentops resume \
  --run-id agentops-0123456789abcdef0123 \
  --clarification /absolute/path/to/clarification.json \
  --repo "$(git rev-parse --show-toplevel)" \
  --json
```

Inspect local integrity or verify a terminal handoff against the current
repository identity:

```sh
coordination/agentops/bin/agentops status \
  --run-id agentops-0123456789abcdef0123 \
  --repo "$(git rev-parse --show-toplevel)" \
  --json

coordination/agentops/bin/agentops verify \
  --handoff .local/agentops/agentops-0123456789abcdef0123/handoff.json \
  --json
```

`verify` is deliberately currentness-sensitive. It fails if the contract,
request, policy digests, Git root, `HEAD`, or tracked/untracked status no longer
matches the handoff snapshot. Re-run AgentOps instead of treating a stale
handoff as current.

## Contracts and persistence

The four public JSON contracts are:

- `AgentOpsRequestV1`: host-decoded intent, scope, assumptions, unresolved
  items, context references, and honestly recorded requested effects;
- `AgentTaskContractV1`: immutable canonical source of truth, routing,
  authority, schemas, prompt projection, evidence requirements, and policy
  digests;
- `AgentOpsHandoffV1`: exact next owner, checks, blockers, permitted effects,
  next action, resume gate, redaction declaration, and claim ceiling;
- `AgentOpsEventV1`: append-only, sequence-checked event entries linked by
  SHA-256 digests.

Canonical JSON rejects accessors, cycles, sparse arrays, hidden or symbol
properties, prototype-sensitive keys, non-finite numbers, and excessive
depth/size. Public artifacts are validated with strict JSON Schema before their
digests are accepted.

Each run writes only to the ignored directory:

```text
.local/agentops/<runId>/
├── manifest.json
├── contract.json
├── graph-state.json
├── langgraph-memory.json
├── events/
└── handoff.json            # terminal handoffs only
```

Writes use a temporary file, `fsync`, and atomic rename. A short file lock
protects each checkpoint mutation, while a separate execution lock covers the
whole `run` or `resume` graph lifecycle and rejects a second executor. The
file-backed LangGraph saver also serializes its own checkpoint writes. State
parents and artifact files must remain inside the repository and must be
non-symlink, regular, single-link nodes; unknown event entries and missing event
directories fail closed. History is not deleted by v1, and the saver rejects
`deleteThread`.

Persisted evidence may contain only sanitized summaries, digests, and validated
repository-relative paths. Credential-like values, raw student data, protected
questions or answer keys, raw provider responses, and private reasoning are
rejected or redacted before persistence.

## Routing and specialist boundaries

Routing uses the object being decided, task type, owned path, shared-file owner,
and active-writer evidence before natural-language hints. Every route has one
primary lane or an explicit clarification/blocker, and at most three
collaborating lanes.

The canonical registry digest binds the A01-A25 lane table, shared-path owner
table, fixed probe registry, and specialist workflow registry. Parity checks tie
lane/shared ownership to `AGENTS.md` and both release-intake ownership sources;
the combined digest ensures any executable registry or policy change invalidates
old contracts and handoffs.

Specialist evidence classes remain separate:

```text
A21 immutable candidate
  -> machine-QA packet
  -> A18 independent content review
  -> A23 promotion plan
  -> A11 regression
  -> A22 release/GraphOps handoff
```

No arrow is automatic. A machine packet is not natural-sample evidence, A18's
`approved-for-integration-review` ceiling is not promotion, and release
readiness is not deployment or same-SHA live proof. The question-machine-QA
registry pins the exact reviewed external source commit
`e33bf615846b708edf8339a4a82c6b760574c349` for
`mais-rsi-machine-qa-workflow`, plus the receipt-bearing suite tip
`a49914a4dc34212354a64dbcad13c28f899c3782`. The registry binds the committed
source, package-view, archive, installed-readback, and installation-receipt
hashes. That redacted receipt records package build, installation/readback, and
the compatibility backup/rollback drill as verified; AgentOps did not rerun
those external operations.

Package/install provenance is not repository currentness. The adapter stays
`currentness-blocked` until its reviewed-currentness marker is available in the
repository; an installation under `$CODEX_HOME/skills` cannot satisfy that
repo-local gate. AgentOps does not copy, install, or execute the source branch.
The suite's separate `WORKFLOW_JSON_PARSE_UNTRUSTED` observation belongs to the
Promotion workflow and does not become a machine-QA availability claim.

### Question machine-QA currentness marker

The fixed marker path is
`coordination/agentops/currentness/question-machine-qa.reviewed-current.json`.
Path existence, a `reviewed: true` field, or a valid self-hash is insufficient.
`repo.specialist-availability` accepts the marker only when
[`currentness.ts`](currentness.ts) independently verifies all of the following:

- the reviewed-main, AgentOps, exact source, and receipt commits are the exact
  registry-bound identities and are ancestors of the current clean `HEAD`;
- the source commit has the registry-bound base as its sole parent, and the
  receipt tip has the source commit as its sole parent;
- the current canonical Skill tree and package view recompute to the committed
  source/package hashes, while the suite manifest and installation receipt
  remain byte-identical to the receipt tip;
- the committed redacted receipt, not `$CODEX_HOME/skills`, supplies the
  archive and installed-readback provenance;
- a clean pre-marker integration commit and Git tree are bound, and every
  protected package, receipt, registry, currentness, workflow, ownership, and
  package/lockfile path remains unchanged in descendant `HEAD`s;
- the registry digest, `AGENTS.md` digest, both release-ownership digests, each
  fixed policy-source byte hash, and their aggregate policy digest recompute;
- the marker is tracked, regular, non-symlink, canonical JSON with a valid
  digest and all three redaction declarations fixed to `false`.

The marker's ceiling is `repository-specialist-currentness-only`. It does not
create a machine packet or disposition, provider authority, A18 acceptance,
A23 promotion, A11 regression, A22 release readiness, deployment, or live
proof. A policy/package change requires a new clean integration snapshot and a
new reviewed marker; editing and rehashing the old marker cannot retain
currentness.

Nova and Adaptive Learning adapters are audits only. They preserve Nova's
owner-controlled runtime/fallback contract and Adaptive Learning's deterministic
BKT floor, candidate-only rerank, validator, deterministic fallback, and no-answer
boundary.

## Thin intake skill

[`skills/mais-agentops-intake/SKILL.md`](skills/mais-agentops-intake/SKILL.md)
runs Decode/Compile in the current host model. It:

- separates facts, explicit requirements, disclosed assumptions, and unresolved
  high-impact questions;
- asks no more than three questions per round and no more than two rounds;
- creates only `AgentOpsRequestV1` input;
- invokes only the fixed local CLI commands;
- explains the handoff in the user's language without claiming implementation.

It is an intake skill, not an additional question-QA approval skill and not an
LLM/provider call.

## Tests

Run the AgentOps suite and project type gate from the repository root:

```sh
node --import tsx --test coordination/agentops/*.test.ts
npm run type-check
```

The suite covers strict schemas and canonical hashing, sensitive-data denial,
scope/path/symlink/hardlink confinement, fixed probes, full registry parity,
routing conflicts and release ordering, checkpoint recovery and tampering,
whole-run concurrency, LangGraph interrupt/resume and tool failure, CLI
fail-closed behavior, 100 routing cases repeated twice, two complete
clean-context host compilations, and the read-only pilot adapters.

The implementation is accepted only when AgentOps tests, relevant existing MAIS
mocked regressions, tracked-path invariance, and the formal skill validator pass.
Those results establish only safe handoff generation—not implementation,
approval, promotion, merge, deployment, or live operation.
