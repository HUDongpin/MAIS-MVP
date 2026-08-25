# A21 MAIS Natural CA60 V5 formal frame and sample freeze

## Session identity

- Lane: `A21` frame, cluster, deterministic sampling, and protected custody.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a21-natural-ca60-formal-freeze-v5-20260826`.
- Branch: `codex/a21-natural-ca60-formal-freeze-v5-20260826`.
- Base/owner-decision commit: `30ab4c6c748d9fde6c92bcb81ea142efd0638e35`.
- Target PR: `pending`.
- Creation date: `2026-08-26`.
- Expected closeout date: `2026-08-27`.

## Write scope

- package-local implementation, closed schemas, and tests under
  `coordination/content-qa/mais-natural-ca60-v1/`
- aggregate-only formal-freeze evidence under
  `coordination/research/mais-natural-ca60-v1/`
- this A21 session log
- protected content-bearing artifacts under `.local/mais-natural-ca60-v1/`
  only during a later clean exact-SHA A22 execution

## Frozen authority boundary

- Owner decision request:
  `2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78`.
- Rights policy:
  `c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66`.
- Lineage rule:
  `8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449`.
- Owner decision receipt:
  `855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0`.

This session may implement and test formal frame/sample freeze only. It may not
read credentials, make OpenAI or DeepSeek requests, egress natural-question
content, or create token, attempt, or USD authorization.

## Preservation-first registration clarification

The inherited V5 registration changed the provider-named chronology event from
the V4 Qwen reference attempt to the V5 OpenAI GPT-5.6 Luna reference attempt,
but retained the inherited V4 nested extraction-method hash. The registration
and prior receipts were not rewritten. Instead, this slice adds an append-only
dual-root erratum that binds:

- inherited extraction-method contract hash:
  `050572da562fba695e6ff654c50fb0810a0ac60028779decad005fb016b20f61`;
- recomputed V5 provider-chronology contract hash:
  `71711b180d65e43aca32470a0edb02d0ea8e3c51095303baea0444e23147b8d3`;
- erratum self-hash:
  `d4050ab3070985dd4689dda4f51f44cf1d2f5f8f286cc548ac98919c8e8b540d`.

The erratum was recorded before any provider event and changes no frame,
sample, eligibility, rights, lineage, threshold, route, or authorization rule.

## Implemented slice

- Added a V5-local copy of the frozen V4 full-frame, clustering, Hamilton
  sampling, pseudonym, and C0 audit contracts. Frozen algorithm hashes and
  golden vectors remain byte-identical; only the V5 design/provider receipt
  vocabulary is migrated.
- Added a batch egress-decision evaluator that validates shared owner rights and
  scanner inventories once, then preserves byte-identical per-item decisions.
  This removes accidental quadratic validation cost across the full frame.
- Added the formal runtime builder for the actual `US_CA_MATH` question-store
  projection, full duplicate/homology/source connected components, closed
  rights/visual/asset exclusions, local PII/secret screens, frame registration,
  deterministic 60-cluster sample, and deterministic 12-item C0 audit.
- Added an exact-SHA clean-worktree CLI. It verifies all 17 owner-bound runtime
  source paths against approved readiness commit
  `bd44971158979b5e31acf5bf0b1fabc360c9a53a`, binds the committed runner/schema/
  erratum closure, and fails closed on any dirty-tree or content drift.
- Added append-only atomic protected storage. The content-bearing frame,
  manifests, screens, evidence, and original IDs remain under `.local`; the
  public receipt contains only sample pseudonyms, content hashes, cluster
  hashes, aggregate counts, and limitations.
- Added closed machine-readable schemas for the public formal-freeze receipt,
  protected custody manifest, and nested-hash erratum.

## Real-runtime validation evidence

The complete integration fixture recomputed the current runtime population and
passed with:

- full frame rows: `2,802`;
- eligible rows: `482`;
- excluded rows: `2,320`;
- eligible homology clusters: `106`;
- selected sample: `60` items from `60` distinct clusters;
- frozen C0 random audit: `12` items;
- protected payload files: `23`;
- protected total files including custody manifest and public receipt: `25`;
- provider requests, credential reads, natural-question egress, and natural
  results: all `0`.

Checks completed in this implementation worktree:

- V5 contract/CLI/erratum tests: `7/7` passed;
- real full-frame/formal-freeze/custody tests: `4/4` passed in
  `132,041 ms`;
- readiness/extractor/clustering regression tests: `16/16` passed;
- full TypeScript `tsc --noEmit`: passed;
- `git diff --check`: passed.

The integration test additionally proved append-only conflict detection,
`0700` protected directory mode, `0600` protected file modes, per-file custody
hashes, receipt self-hashes, no original item ID or question text in the public
receipt, result-blind timestamp-stable selection, and fail-closed rejection of
tampered or broadened owner authority.

## Handoff boundary

This A21 slice implements and validates the formal-freeze mechanism; it does
not itself claim that the canonical frame/sample artifacts have been frozen.
The next gate is an A22 clean exact-SHA execution that writes the protected
artifacts, followed by an A11 independent recomputation. Provider authorization,
reference labeling, DeepSeek execution, scoring, and any result remain pending.
