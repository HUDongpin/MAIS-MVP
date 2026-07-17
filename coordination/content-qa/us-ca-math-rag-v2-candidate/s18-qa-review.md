# S18 Candidate QA Review - California Math RAG v2

Package: `us-ca-math-rag-v2-candidate`

Date: 2026-06-19

Primary input: `$california-math-common-core` standards index

Review owner: S18 curriculum QA

Upstream owner: S21 content pipeline

## Verdict

Status: candidate-only, approved for downstream review planning, not approved for live app promotion.

## Coverage

- Grade-button targets covered: 11
- Records covered: 11
- Domain safe-card drafts: 67
- Cluster safe-card drafts: 68
- Canonical standard identifiers represented: 392
- S04 practice briefs: 68
- S05 lesson briefs: 68
- S04 representative candidate samples: 5
- S05 representative candidate samples: 3

## Source-Safety Check

- IXL is used only as navigation/alignment signal for grade buttons and directed page structure.
- The package does not copy IXL skill preview prompts, screenshots, answer choices, shortcut sequences, or exercise layouts.
- Official California/Common Core sources are represented through identifiers, structure, and attribution notes only.
- Student-facing text must still be authored fresh during S04/S05 generation.

## Math Correctness Scope

This package contains alignment cards, generation briefs, and a small representative sample set. The samples are candidate-only and are not final live student questions or lessons. S18 still must review any generated S04 question set and S05 lesson modules for answer correctness, grade fit, bilingual clarity, and misconception handling.

## Release Boundary

Use public wording such as "California Math Practice Beta" or "California standards-aligned practice coverage." Do not claim a complete California curriculum, official California course, or IXL-equivalent exercise set from this package alone.

## Required Follow-Up

1. S18 spot-checks representative K, Grade 1, Grade 6, Grade 8, and high-school cards against the skill index and source policy.
2. S04 uses `s04-practice-question-briefs.json` plus `s04-representative-practice-candidates.json` to generate or repair original practice candidates with independent solution evidence.
3. S05 uses `s05-textbook-lesson-briefs.json` plus `s05-representative-lesson-candidates.json` to draft original California textbook/lesson modules.
4. S11 regression runs only after candidate integration into a branch or review surface.
5. S23 owns the promotion decision and must keep this package candidate-only until the gates pass.
