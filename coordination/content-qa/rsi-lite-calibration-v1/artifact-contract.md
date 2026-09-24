# F2-R artifact contract

Status: frozen for `MAIS-RSI-LITE-CAL-V1` version `1.1.1-f2-r` at source baseline `b6c7c347a49a813e454e707dd3c16399dcf29909`. Version `1.1.1-f2-r` supersedes the independently reviewed `1.1.0-f2-r` candidate after A18 identified California curriculum-envelope P1s; evidence from the two versions must not be mixed.

## Public F1 snapshot

`public-manifest.json` requires:

- exact protocol ID, version, and source baseline;
- `candidate-only` and `not-authorized` status;
- `content-surfaces-only` estimand;
- seed commitment, never the seed;
- candidate-set commitment;
- 12 cluster, 48 package, 4,800 question, 96 lesson, and zero route counts;
- opaque package ID, content SHA-256, candidate status, and surface counts.

`f1-generation-receipt.json` repeats the commitments and explicit false values for formal and production authorization. Forbidden public fields include latent-bundle ID, variant, arm assignment, clean/defect status, defect family, mutation paths, gold answers, and seed.

`f1-artifact-commit.json` is published last. It binds exact byte hashes for the public manifest, F1 receipt, and seed-commitment file, plus the exact restricted snapshot-marker hash. Without this marker, F1 is incomplete.

## Restricted F1 snapshot

The ignored store contains:

- `randomization-seed.txt`;
- `sealed-manifest.json`;
- `gold-ledger.json`;
- `packages/*.json` for exactly forty-eight packages;
- `artifact-commit-manifest.json` binding the two metadata files and forty-eight package files.

Every restricted file has no group or other permission bits. Package semantics must exactly regenerate from the restricted seed and frozen baseline. Re-signing a modified package and its downstream manifests does not make it valid.

The store is not an arm inbox and cannot be mounted into a future role environment.

## Sacrificial fixture and receipts

The fixture is pinned to one literal SHA-256 commitment and contains exactly 24 questions, two lessons, and zero routes. Each A/B/C0/C receipt contains:

- exact protocol, baseline, run, arm, and fixture identity;
- `offline-deterministic` execution mode;
- false formal, production, and live-provider fields;
- role contract and observed role executions;
- one result for each of all 26 required surfaces;
- finding-to-surface linkage and evidence hashes;
- recomputed coverage and open P0/P1 counts;
- material-result and self hashes;
- zero provider calls, tokens, and API cost;
- no formal completion claim.

Semantic validation rejects fixture drift, role drift, stale material hashes, missing/duplicate surfaces, false completion, provider spend, or a merely re-signed altered receipt.

`f2-snapshot-commit-manifest.json` is the final public marker and binds the fixture, summary, and all four receipts.

## External sacrificial attempts

An attempt requires an external OS-temporary output root and a unique explicit attempt ID. A reservation lock prevents duplicate/concurrent writers. Files are written into a unique staging directory, bound by `commit-manifest.json`, and exposed only by an atomic rename into `attempts/<attempt-id>/`. Interruption before that rename produces no committed attempt, removes the attempt's staging directory and active lock, and atomically leaves a commitment-bound `.aborted.json` terminal record. A successful commit similarly replaces the active lock with `.committed.json`. Terminal IDs are never reused or overwritten; retry uses a new ID.

Every bounded child process is launched as its own process group. On timeout the controller sends `SIGTERM`, waits a bounded grace period, escalates to `SIGKILL` if needed, and awaits/reaps the child before returning an error or removing its execution root.

## Isolation receipt

`f2-r-isolation-receipt-candidate.json` records the five-role macOS Seatbelt matrix. It must show:

- `(deny default)` enforcement and same-UID adversary scope;
- exact five-variable environment allowlist;
- runtime inventory containing only the copied standalone worker;
- one immutable input and one writable outbox per role;
- denied protected-canary content/metadata reads, input write/chmod, sibling write, repository read, and network access;
- denied protected-read and sibling-write escape attempts through allowed-outbox symlinks;
- absent credential-like environment variables;
- a denied descendant-process spawn attempt while the initial copied worker execution remains allowed;
- unchanged input hashes and zero process failures;
- false formal/live/production fields and browser exclusion;
- a valid semantic self-hash.

The canary is synthetic; no real credential file is used. This is candidate evidence only.

## Canonical verification receipt

The local verifier:

- re-derives the candidate set from the restricted seed;
- compares exact public/sealed/gold/package semantics;
- validates both F1 commit markers and all file hashes;
- validates the F2 fixture, four receipts, summary, and commit marker;
- verifies restricted permissions and public/secret separation;
- keeps A18, A11, A22, A25, and owner-budget gates false.

The verification receipt is atomically written and contains no seed.

## Fail-closed CLI contract

- Generator rejects `--formal-run`, `--live-provider`, `--production`, and `--deploy`.
- Sacrificial runner rejects those flags, legacy fixed output, missing output root, and source-tree output.
- Isolation proof rejects formal, live-provider, and production flags and fails if Seatbelt is unavailable.
- Formal preflight has no execution path; `--execute` exits 2.
- No provider adapter, formal package executor, deployment command, or 48-run loop exists in F2-R.
