# 2026-06-21 S16 Research and Learning Science - KE-to-MAIS Stealth Assessment

## Objective

Produce an implementation-facing distillation of the Knowledge Explorer learning analytics framework for embedding into MAIS-MVP.

## Files Added

- `coordination/research/2026-06-21-ke-to-mais-stealth-assessment-integration-spec.md`
- `coordination/research/2026-06-21-ke-to-mais-stealth-assessment-integration-spec.provenance.md`
- `coordination/research/2026-06-21-ke-to-mais-behavior-event-dictionary.csv`

## Work Completed

- Re-fetched `https://ke.skoonline.org/LAforKE` and `https://ke.skoonline.org/aboutKE.html`; both matched the previously captured HTML.
- Parsed the public LAforKE behavior table into a machine-readable CSV with visible behavior ID ranges preserved.
- Mapped KE behavior groups to proposed MAIS event names, sources, payload fields, xAPI verbs, privacy tiers, model consumers, and session owners.
- Drafted a technical integration spec covering V2 event shape, derived feature schema, learner profile TypeScript proposal, Q2L/WTB/Wonderment rubrics, AI collaboration rubric, surface mapping, teacher workflow, validation/privacy model, roadmap, and ownership.

## Checks

- Verified the companion CSV has 99 visible grouped behavior rows plus header.
- Verified the spec includes the required sections: behavior event dictionary, derived feature schema, learner profile type, rubrics/prompts, MAIS surface mapping, teacher workflow, validation/privacy model, model roadmap, and exact S08/S15/S12/S02/S13 ownership.
- No source code files were edited.

## Risks and Notes

- The public KE page claims 158 behaviors, but exposes many as compressed ranges. The CSV preserves ranges rather than inventing hidden atomic rows.
- MAIS-MVP had a large pre-existing dirty worktree before this S16 artifact was added. This session did not modify existing source files.
- Implementation should start with a narrow event-schema slice owned by S08/S12 before UI work begins.

