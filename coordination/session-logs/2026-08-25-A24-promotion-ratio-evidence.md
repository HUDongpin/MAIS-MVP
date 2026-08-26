# A24 session — Grade 6 ratio Promotion Gate exact-layer evidence

## Session custody

- Owner / lane: `A24` illustration exact-layer lead.
- Branch: `codex/a24-promotion-ratio-evidence-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a24-promotion-ratio-evidence-20260825`.
- Baseline SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Target PR: `pending` (composition PR owned by A23).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Declared write scope:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a24-exact-layer.v1.json`
  - `coordination/session-logs/2026-08-25-A24-promotion-ratio-evidence.md`

## Baseline proof

- `git rev-parse HEAD`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Initial `git status --porcelain=v1 --untracked-files=all`: empty.
- `npm run release:package-gate -- --json`: pass (`valid: true`, 8 release packages); the existing `content-rag-candidate-chain` remains a baseline `blocker report`, so this A24 evidence does not claim release or live readiness.
- Dependencies were reused through the worktree-local ignored `node_modules` symlink; no dependency or lockfile changed.

## Exact-layer applicability method

Following the MAIS exact-layer workflow, the review first distinguished answer-critical deterministic visual data from non-binding textual representation suggestions. The three frozen records were loaded directly from the declared JSON pointers at the exact baseline SHA:

| Kind | ID | Source pointer | Objects | Arrays | Field keys | Scalars | Exact-layer key matches |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Safe card | `ca-rag-v2-cluster-grade-6-6-rp-ratios` | `coordination/content-qa/us-ca-math-rag-v2-candidate/safe-card-drafts.json#/108` | 4 | 9 | 48 | 56 | 0 |
| Practice | `s04-ca-rag-v2-q031-6-rp-ratios` | `coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json#/questions/30` | 11 | 11 | 56 | 60 | 0 |
| Lesson | `s05-ca-rag-v2-lesson-031-6-rp-ratios` | `coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json#/lessons/30` | 10 | 8 | 57 | 61 | 0 |
| **Total** | three exact records | frozen Promotion Unit | **25** | **28** | **161** | **177** | **0** |

The recursive key scan lower-cased each object key, removed hyphens, underscores, and whitespace, and compared it with this closed set of 14 normalized names:

`asset`, `assets`, `coordinate`, `coordinates`, `diagram`, `diagrams`, `exactlayer`, `formulaoverlay`, `illustration`, `illustrations`, `image`, `images`, `plotly`, `svg`.

No matching field path was found in any of the three records. The scan was over field names, arrays, and nested objects—not a flat text search.

## Textual representation mentions and boundary

The records do contain ten scalar text mentions related to possible representations:

- Safe card: five mentions, including a source-distance statement, generation guidance, and the three `itemDesignAffordances` values `double number lines`, `ratio tables`, and `tape diagrams`.
- Practice: zero mentions.
- Lesson: five mentions, including the three `metadata.representationOptions` values, prose in `lessonModule.conceptExplanation`, and a generic `visual model` remediation instruction.

These strings are pedagogical suggestions only. None supplies an image/asset path, SVG/Plotly payload, coordinate system, exact formula overlay, renderer, geometry, scale, label placement, or answer-critical diagram values. Shadow v1 maps text and metadata only and must not synthesize an illustration from these suggestions. If a later candidate version adds any watched field—or if future integration chooses to materialize one of these representation options—A24 `not_applicable` becomes stale and a new exact-layer review is required.

## A24 decision

- Evidence result: `not_applicable`.
- Scope: only Promotion Unit `us-ca-math-rag-v2-g6-ratios-v1` at candidate digest `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7` and source/baseline SHA `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Exact rationale preserved in the machine evidence: selected safe-card `/108`, practice `/questions/30`, and lesson `/lessons/30` contain no diagram, illustration, image, asset, coordinate, formula-overlay, SVG, Plotly, or deterministic exact-layer fields; Shadow v1 maps text and metadata only.
- Independent enforcement boundary: A23's checker must recursively reload all three bound records and reject this N/A if any watched field exists. This log is not a substitute for that machine cross-check.
- No image generation, provider call, credential access, asset creation, candidate mutation, live registry access, deployment, or production write occurred.
- This evidence does not approve content correctness, adapter mapping, integration, Preview, deployment, or live promotion.

## Machine verification and digests

- The current A23 `validatePromotionEvidence` implementation accepted the evidence wrapper and exact A24 semantic contract.
- Raw evidence file SHA-256: `fceef4f7a70959b85edf7acc07687b29e48a432eea5c36f3c9e5165978b94dde`.
- Stable-key canonical semantic payload SHA-256: `4acf3dbb1405326d304611e26e622f68cf424ced47058fdae11419a666fc0d75`.
- Independently recomputed aggregate candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Recomputed file and record digests matched the declared frozen A21 values for all three source pointers.

## Closeout checklist

- [x] Exact baseline and clean initial worktree recorded.
- [x] Three exact records and IDs resolved independently.
- [x] Recursive watched-key scan measured and documented.
- [x] Textual representation suggestions separated from actual exact-layer payloads.
- [x] Machine evidence uses the A23 `promotion-evidence.v1` wrapper and exact A24 semantic payload.
- [x] Raw evidence and semantic payload SHA-256 recorded.
- [ ] Exact commit, push/upstream, and post-commit clean status are recorded in the immutable parent handoff; a tracked file cannot include its own containing commit hash without changing that hash.
