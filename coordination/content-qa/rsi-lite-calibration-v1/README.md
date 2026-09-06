# RSI-lite calibration v1.1.1 F2-R candidate package

## Offline integration boundary — 2026-09-06

The blind-review builder now recomputes the aggregate candidate commitment from the supplied package contents using the generator's exact serialization and ordering before constructing review packets. Changes to a question or lesson, and duplicate package substitutions, are rejected against the frozen aggregate commitment. This verifies content binding, not the authenticity or current authorization of the supplied manifests.

This package preserves the dated F0–F2-R research source and the later F3 tools, including `run-f3-formal-campaign.mjs`, `run-f3-provider-smoke.mjs`, `run-f3-rehearsal.mjs`, the F3 authorization/preflight modules, provider adapter, campaign runner, and persistent budget ledger. The F2-R section below is the historical account of an earlier package state. In particular, its statement that no F3 entrypoint exists does not describe the complete retained source.

Current acceptance is limited to offline source and synthetic-fixture tests. Retaining or integrating this code, historical receipts, waiver, manifests, or past owner-instruction text grants no current live-provider, formal-campaign, protected-input replay, content-promotion, production, or deployment authority. The later F3 entrypoints and their existing gates are preserved; this integration does not mechanically disable them or certify their gates as a current authorization contract. A future live run requires a separately reviewed current authorization and execution plan. Historical numerical and completion claims remain dated source claims, not newly reproduced experimental results.

The default test suite uses test-owned deterministic synthetic candidates. The A18 packet and CLI tests construct a fixed-seed candidate set with the same 48-package/432-review-surface topology; they do not reopen the historical `.local` seed, gold ledger, or candidate packages. Stale-lease tests create and reap their own writer subprocesses. No test requires real provider credentials. From the worktree root:

```sh
node --test coordination/content-qa/rsi-lite-calibration-v1/*.test.mjs
```

The acceptance validation uses Node 24.15.0, an environment without inherited credentials, a fail-closed fetch guard, and an external temporary directory under a Unicode path. macOS Seatbelt checks exercise synthetic canaries and denied loopback networking; their platform skips on other hosts are not equivalent to passing isolation evidence. Provider and campaign test receipts are synthetic and cannot serve as live-run evidence.

For a new offline candidate or isolation check, explicitly provide fresh external output paths. The bare regeneration commands in the historical section can target frozen package files or protected `.local` defaults and are retained for provenance only. Use a test-only seed and a new scratch directory when generating synthetic artifacts:

```sh
RSI_OFFLINE_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/mais-rsi-offline.XXXXXX")
node coordination/content-qa/rsi-lite-calibration-v1/generate-calibration-artifacts.mjs \
  --public-dir "$RSI_OFFLINE_ROOT/public" \
  --sealed-dir "$RSI_OFFLINE_ROOT/synthetic-inputs" \
  --seed-file "$RSI_OFFLINE_ROOT/synthetic-inputs/randomization-seed.txt"
node coordination/content-qa/rsi-lite-calibration-v1/generate-a18-blind-review-materials.mjs \
  --sealed-root "$RSI_OFFLINE_ROOT/synthetic-inputs" \
  --public-manifest "$RSI_OFFLINE_ROOT/public/public-manifest.json" \
  --public-registration "$RSI_OFFLINE_ROOT/review/registration.json" \
  --restricted-root "$RSI_OFFLINE_ROOT/review/packets"
node coordination/content-qa/rsi-lite-calibration-v1/run-isolation-proof.mjs \
  --output "$RSI_OFFLINE_ROOT/isolation-receipt.json"
```

Historical protected-input replay is separate from the default suite and was not performed for this repair. With a separately authorized replay scope, the blind-review CLI can consume explicitly supplied `--sealed-root` and `--public-manifest` inputs: the exact historical `sealed-manifest.json`, `gold-ledger.json`, all 48 `packages/*.json`, and corresponding public manifest are required. Input commitments must match. Reconstructing or verifying the original candidate generation also requires its exact protected randomization seed and snapshot commit markers. Always choose new external `--public-registration` and `--restricted-root` outputs. Synthetic tests establish tooling behavior only; they do not verify protected historical hashes, human-review evidence, research metrics, or A18 content acceptance.

## Historical F2-R record (preserved)

Status: `candidate-only`. Formal 48-run execution, live providers, production, and deployment are not authorized. Git commit and push require a separate instruction.

Owner amendment `MAIS-RSI-LITE-CAL-V1-A18-HW-1` removes reviewer-owned and adjudicator-owned evidence as a hard A18/F3-intake requirement for this feasibility/calibration pilot. It accepts the independent machine-ready A18 receipt plus a hash-valid owner waiver. It does not claim human signatures or independently verified human evidence and does not authorize F3.

This directory contains the public F2-R protocol support, deterministic candidate generator, semantic receipt validators, sacrificial attempt lifecycle, deny-default isolation proof, tests, redacted manifests, and unsigned packets for independent A18/A11/A22 review. The A25 packet is under `coordination/release-intake/`.

The estimand is `content-surfaces-only`: 4,800 questions and 96 lessons across forty-eight packages, with zero browser routes. Browser QA is excluded because this slice contains no owned route implementation.

## Restricted artifacts

These remain ignored under `.local/rsi-lite-calibration-v1/`:

- randomization seed;
- arm and latent-bundle mapping;
- clean/defect status;
- all forty-eight full candidate packages;
- latent-defect and mutation ledger;
- gold answers.

No live-provider credential or raw response belongs in either the public or restricted artifact set. F2-R did not need to access the owner credential document.

## Local commands

Run the full test suite from the isolated worktree root:

```sh
node --test coordination/content-qa/rsi-lite-calibration-v1/*.test.mjs
```

Regenerate F1 candidate artifacts from the existing restricted seed:

```sh
node coordination/content-qa/rsi-lite-calibration-v1/generate-calibration-artifacts.mjs
```

Run one sacrificial attempt only in a newly created operating-system temporary root:

```sh
F2_R_OUTPUT_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/mais-f2-r-attempt.XXXXXX")
node coordination/content-qa/rsi-lite-calibration-v1/run-sacrificial-dry-run.mjs --output-root "$F2_R_OUTPUT_ROOT" --attempt-id f2-r-review-001
```

Refresh the five-role Seatbelt candidate receipt:

```sh
node coordination/content-qa/rsi-lite-calibration-v1/run-isolation-proof.mjs --output coordination/content-qa/rsi-lite-calibration-v1/f2-r-isolation-receipt-candidate.json
```

Verify the frozen public and sealed snapshot:

```sh
node coordination/content-qa/rsi-lite-calibration-v1/verify-f0-f2-local.mjs
```

Regenerate the deterministic, privacy-safe A18 human-evidence owner waiver:

```sh
node coordination/content-qa/rsi-lite-calibration-v1/a18-owner-waiver.mjs
```

The generation, dry-run, isolation, and formal-preflight CLIs fail closed on formal/live/production/deployment requests as applicable. `formal-preflight-cli.mjs --execute` always exits 2 because no F3 execution entrypoint exists.

## Evidence interpretation

- `public-manifest.json`: redacted package IDs, content hashes, aggregate counts, seed commitment, and candidate-set commitment.
- `f1-generation-receipt.json`: candidate-generation counts and explicit false authorization fields.
- `f1-artifact-commit.json`: final public marker binding the public files and sealed snapshot marker.
- `.local/.../artifact-commit-manifest.json`: restricted marker binding the exact 48 package files plus sealed manifest and gold ledger.
- `sacrificial-bundle.json`: pinned public synthetic fixture, outside the twelve matched clusters.
- `sacrificial-receipts/*.json`: four semantically validated deterministic receipts.
- `f2-snapshot-commit-manifest.json`: final marker binding the public sacrificial snapshot.
- `f2-r-isolation-receipt-candidate.json`: five-role same-UID Seatbelt enforcement evidence, not an A22 approval.
- `f0-f2-verification-receipt.json`: local semantic reconstruction and snapshot verification; all independent gates remain false.
- `review-gates/A18-human-evidence-owner-waiver.json`: owner-authorized waiver bound to the frozen candidate, protected owner-attestation hash, historical blocked decision, and exact independent machine-ready A18 receipt; it contains no participant names and grants no execution authority.
- `review-gates/`: author-produced packets for independent reviewers, not reviewer receipts.
- `review-gates/a18-blind-review-registration-v2.json`: public commitment for the current two-slot A18 human-review input. It binds a census of all 216 construction-target instances, a pre-registered 10-of-100 sample from each of the three clean bundles (120 instances), all 96 lessons, and twelve blueprint groups without exposing allocation or gold labels. The older un-suffixed registration remains historical `1.1.0-f2-r` evidence and must not be used for this candidate.
- `.local/.../a18-independent-human-review-v2/`: restricted reviewer-1/reviewer-2 phase-1 and phase-2 packets plus the separate adjudication key. Phase 1 is answer-blind; phase 2 must not be released until the corresponding reviewer has committed the phase-1 decision. Reviewers must never receive the adjudication key. The `v1` directory is historical evidence for the superseded candidate.

No artifact may be promoted into `data/`, `app/`, `components/`, a provider environment, or production without the separate content-promotion, QA, release, and owner gates required by the project contract.

The blind-review input generator is deterministic and idempotent for identical inputs:

```sh
node coordination/content-qa/rsi-lite-calibration-v1/generate-a18-blind-review-materials.mjs
```

It refuses to overwrite a non-identical frozen review artifact and rejects formal, live-provider, production, and deploy flags. These packets preserve the preferred high-evidence review path. Under `A18-HW-1`, collecting reviewer-owned/adjudicator-owned signatures, qualifications, independence declarations, phase records, adjudication, and agreement is optional for this pilot intake, while their absence remains a mandatory disclosure and limits every human-review claim.

The remediated isolation receipt records thirteen invariants per role, including strict role-ID containment and denial of descendant-process creation. Sacrificial interruption cleanup converts the active reservation into an explicit aborted terminal record, removes the attempt-specific staging directory, and requires any retry to use a new attempt ID. Bounded processes are fully reaped after a `SIGTERM` grace period and `SIGKILL` escalation when necessary. These are author-side candidate claims until superseding A11 and A22 independent receipts verify them.
