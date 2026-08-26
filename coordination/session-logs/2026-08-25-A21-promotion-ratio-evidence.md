# A21 Session Log — Promotion Ratio Candidate Evidence

- Owner/lane: `A21` — Content pipeline and RAG operations
- Session scope: one machine-verifiable candidate-source evidence input for Promotion Unit `us-ca-math-rag-v2-g6-ratios-v1`
- Branch: `codex/a21-promotion-ratio-evidence-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a21-promotion-ratio-evidence-20260825`
- Baseline/source SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Target baseline SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Target PR: `pending` (compose through the A23 clean integration branch)
- Created: `2026-08-25`
- Expected closeout: `2026-08-25`

## Contract and scope

- Applied `mais-content-generation-workflow` and routed this artifact as the A21 candidate-source input to an A23 Promotion/integration dossier.
- Applied the one-session/one-branch/one-worktree guardrail and did not use the dirty primary root as an implementation or evidence source.
- The only evidence artifact is `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a21-candidate-generation.v1.json`.
- Candidate package remains `candidate-only`; this session does not grant A18 content acceptance, integration authorization, live promotion, deployment, or production release.
- No candidate source, live data, registry, application code, provider, credential, deployment, or branch-protection state was modified.

## Source-object verification

All candidate facts were recomputed from Git object `b6c7c347a49a813e454e707dd3c16399dcf29909`, not from the dirty primary root:

- Safe card: exact pointer `/108`, ID `ca-rag-v2-cluster-grade-6-6-rp-ratios`, source inventory `146`, unique IDs `146`.
- Practice: exact pointer `/questions/30`, ID `s04-ca-rag-v2-q031-6-rp-ratios`, source inventory `68`, unique IDs `68`.
- Lesson: exact pointer `/lessons/30`, ID `s05-ca-rag-v2-lesson-031-6-rp-ratios`, source inventory `68`, unique IDs `68`.
- Recomputed aggregate candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Candidate package source version: `sha256:35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- The evidence semantic payload follows the current A23 `promotion-a21-candidate.v1` exact contract and binds checker `promotion-gate-shadow-v1`.

## Baseline checks

- `npm run release:package-gate -- --json`: pass; eight release packages; the existing content/RAG candidate chain remains a recorded `blocker report` at this baseline.
- `npm run test:release-governance`: pass; 84 tests, 0 failures.
- `npm run type-check`: pass.
- Current A23 `validatePromotionEvidence` against the exact A21 role contract: pass.
- Evidence raw SHA-256: `faeeba4bcc20630ac29dbb6a430aad2ed26b5a9e88f6caa638e84a5e9bf0d38d`.
- Evidence semantic payload SHA-256: `9e55e15c7d1c69df5e8a43c2338b83de55531b3432484426afc4fce1b759b6c5`.
- Precision follow-up validation: pass; JSON parse, exact `sourceVersion`, raw and canonical semantic summaries, and all three Git-object artifact/pointer/hash/parent/state/inventory bindings were verified; `git diff --check` passed.

## Handoff boundary

- Next owner: `A23` for Manifest binding and Shadow execution.
- Missing gates remain independent A18, A04, A05, A11, A22, A24, A25, and A23 evidence/decisions.
- A21 claim: candidate provenance and immutable digest binding only.
- Final action: reviewed commit; retain the branch/worktree clean after the authorized upstream push for A23 composition intake.
