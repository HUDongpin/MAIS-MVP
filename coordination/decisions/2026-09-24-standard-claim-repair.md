# Standard claim repair candidate

## Identity and scope

- Owner lane: A05 lesson rendering, with shared standard resolver behavior in `lib/standards/`.
- Branch/worktree: `codex/a05-standard-ref-claims-20260924` at `/Volumes/Starship/项目衍生文件夹/MAIS的衍生文件/MAIS-standard-ref-20260924`.
- Baseline: current `main` and `origin/main` at `8aeeda5565a03c41d56c139c298344466da813a9` when created on 2026-09-24. Target PR pending; expected closeout 2026-10-02.
- Reviewed source: retained `origin/claude/state-adaptation-seams` at `aa8ecf66778ae53d5986cf8ac086d3eeb2992f6f`; its standard candidate commit is `315375ac7a36dd58675e11b12b3f8d6a1f004da1`. No source ref was changed.
- Status: A05 reviewable candidate; use the branch and remote refs for current commit/push state. No live content, crosswalk rows, deployment, or curriculum mapping was added.

## Repair

The source candidate's `normalizeCcssId` discarded a lower-case substandard suffix. This candidate accepts complete syntactic CCSS identifiers only, keeps suffixes such as `6.NS.C.7c` and `7d` distinct, and rejects malformed codes. A crosswalk relation marked `exact` now requires an asset to carry **every** mapped CCSS code; partial/broader/narrower relations still require an overlap. The existing track registry continues to hide untranscribed state standards.

The real student `CcssLessonAdapter` footer now renders through `CcssLessonStandardsFooter` and `StandardRef`. `LessonView` supplies the requested block standard IDs and the student's curriculum track; the adapter compares those requests with the ported lesson asset's IDs before showing a label. A mismatch or untranscribed track produces no footer label. Rendered-component tests exercise both valid and invalid claims, including the mounted adapter, rather than only the resolver.

The ported lesson bodies still contain inline CCSS codes. A source audit found one code unsupported by its asset metadata: `ratio-double-number-line` used `6.RP.A.2` in prose while its metadata lists `6.RP.A.1` and `6.RP.A.3`. The unsupported parenthetical code was removed without changing the mathematical explanation. A regression now checks every inline code in the ported lesson source against that lesson's metadata. Until a separate cross-curriculum prose review exists, the adapter withholds the entire ported body on non-California tracks and shows a localized availability message; it also omits the learning probe for that withheld body.

Exact modified files: `components/lesson/LessonView.tsx`, `components/lesson/ccss/CcssLessonAdapter.tsx`, `components/lesson/ccss/lessons/ratio-double-number-line.tsx`. Exact new files: `components/lesson/ccss/CcssLessonStandardsFooter.tsx`, `components/lesson/ccss/standardClaimRendering.test.tsx`, `components/standards/StandardRef.tsx`, `lib/standards/ccssId.ts`, `lib/standards/standardRef.ts`, and this report.

## Verification and limits

- RED was observed before repair: `6.NS.C.7c` normalized to `6.NS.7`, a two-subpart exact row passed with only one subpart in the asset, and a malformed string repeated in asset metadata printed as a California standard. All cases are now GREEN.
- `node --import tsx --test components/lesson/ccss/standardClaimRendering.test.tsx`: 7/7 passed after the body guard and inline-code audit.
- `npm run type-check`: passed.
- `npm run test:components`: 588/588 passed on the current candidate.
- `npm run build`: passed on the current candidate.
- `git diff --check`: passed at handoff.

This remains a bounded repair to the CCSS lesson display path, not a universal student-code gate. A fresh scan finds 368 inline CCSS-code occurrences across 266 ported lesson source files. The source audit checks their consistency with each asset's metadata, but it does not independently certify the curriculum alignment of every code or convert the prose to `StandardRef`. The current ported interactive-lesson assignment is California-only; no reviewed Arkansas, Florida, or North Carolina crosswalk was created. Cross-curriculum reuse needs its own body-prose decision and curriculum review before the non-California guard can be lifted. The server-rendered adapter regression is not a full browser route acceptance test.
