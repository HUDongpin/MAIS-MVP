# A23 Candidate-To-Live Gate

- Date: 2026-06-27
- Agent ID: A23
- Candidate package: 2026-06-27 content/RAG and lesson-visual evidence set
- Upstream owner: A21
- Independent QA owner: A18
- Exact-layer owner, if needed: A24
- Live-surface owner: A04 practice | A05 lesson | A03 roadmap, depending on selected package
- Regression owner: A11
- Release owner: A22
- Current decision: Candidate-only / approved-for-integration-review evidence exists for selected subpackages; no live production promotion is authorized by this gate.

## Required Evidence

- A21 candidate artifacts complete:
  - Partial. Fresh evidence exists for California concept-story package mirrors and worked-example illustration logistics, but the broader dirty tree also contains many unrelated generated-content/RAG packages.
- A18 QA decision:
  - Present for `coordination/content-qa/2026-06-27-A18-california-concept-story-qa.md`.
  - Present for `coordination/content-qa/2026-06-27-A18-A21-A24-worked-example-illustration-qa.md`.
  - Not present for every dirty content/RAG package in `data/generated-content/`, `data/rag/`, and `lib/rag/`.
- A24 exact-layer decision, if needed:
  - Present for the worked-example illustration QA boundary as conceptual/original support visuals.
  - Exact answer-critical visuals still require per-asset A24 review before release.
- Owning live-surface integration plan:
  - Missing for broad content/RAG promotion.
  - A05 lesson surface has integration-review evidence for concept stories and worked-example visuals.
  - A04 practice/A03 roadmap live integration is not authorized by this gate.
- A11 targeted regression:
  - Missing for content/RAG promotion.
  - A11 student regression split now exists at `coordination/reports/2026-06-27-A11-student-regression-split.md`, but it is bug-routing evidence, not content-promotion regression.
- A22 clean release slice or release blocker:
  - Release blocker remains: current root is dirty; `npm run release:root-deploy-preflight -- --json` blocks direct root deploy.
- Owner production approval, if needed:
  - Not recorded.

## Promotion Decision

- Decision: Hold at candidate/integration-review. Do not promote broad A18/A21/A24 content/RAG packages into live production from the dirty root.
- Files allowed into live integration:
  - None by default from this gate.
  - A05 may prepare a narrow lesson-surface review slice for the California concept-story and worked-example illustration evidence only after A11/A22 regression/release gates are selected.
- Files explicitly excluded:
  - Live aggregate data such as `data/questions.ts`, `data/topics.ts`, `data/grades.ts`, and broad `data/lessons.ts` changes unless assigned to the owning live-surface session.
  - App routes, API routes, provider/env files, raw/private corpus text, and unreviewed generated-content/RAG packages.
  - Public production assets that are answer-critical but lack A24 exact-layer validation.
- Release path:
  - A23 selects one package.
  - A21 confirms package completeness and source policy.
  - A18 confirms QA decision.
  - A24 validates exact layers if visual/answer-critical.
  - A04/A05/A03 owning live-surface session integrates only the selected slice.
  - A11 runs targeted regression.
  - A22 builds from clean worktree, clean clone, reviewed release slice, or pruned staging.
- Rollback/downlist path:
  - Downlist by removing the selected adapter/live-surface slice from the release candidate.
  - Do not delete candidate packages from the dirty root as a release rollback.
- Owner decisions needed:
  - Choose the first content/RAG package for live-integration review.
  - Confirm whether California concept-story and worked-example visual evidence should be treated as a lesson-surface beta slice or held for broader art/content direction.
  - Confirm whether any generated-content/RAG package may enter A04 practice or A03 roadmap surfaces.

