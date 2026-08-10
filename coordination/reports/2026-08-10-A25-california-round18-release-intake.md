# A25 California Round 18 non-destructive release intake

Date: 2026-08-10 (Asia/Hong_Kong)

Lane: A25, coordinated with A10/A11/A18/A22

Worktree: `/Volumes/Starship/MAIS-ca-content-qa-wt`

Status: **AWAITING OWNER APPROVAL; NO-GO FOR PACKAGING, PREVIEW, OR RELEASE**

## Authorization boundary

The owner authorized non-destructive release intake only. This pass produced an ownership and package proposal. It did not stage, commit, create or switch a branch, push, create a pull request, clean artifacts, start or stop a server, create a preview, or deploy.

The release-hygiene workflow was applied as a hard boundary: package paths are explicit, runtime/test/evidence slices stay separate, the authoritative dirty QA worktree remains preserved, and any later candidate must start from a freshly verified clean `origin/main` worktree.

## Verified source snapshot

| Evidence | Current value |
| --- | --- |
| Branch | `content/us-ca-math-lesson-qa` |
| Source HEAD | `295b8c2929a30aaacb096bec1d7bcf6e44044ff1` |
| Remote feature branch | `aa889fea75e73969c2787564e10cc6f139b033b9` |
| Read-only verified `origin/main` | `bd0928ef52ff000976d9abab279bc79fc1aef1ae` |
| Merge base | `1d81110c60df2695917947f3198df06b5bc384ba` |
| Divergence | 38 commits unique to `origin/main`; 90 unique to the source branch |
| Feature branch lead over its remote | 10 commits |
| Current frozen dirty snapshot | 275 tracked modifications + 40 untracked = 315 exact paths |
| Staged paths | 0 |
| Frozen porcelain SHA-256 | `38322bbd13b15010919e9a24beee427c35dec57f4562152c08878e90c0408813` |
| Fresh A25 no-report map | 315 entries; 15 unblocked unmapped; 0 ambiguous; signature `44ec3a15b8f3a5d5e289e177fa63f74a8b16c46756946bd0f1fabc8347a0c73e` |
| Merge-base-to-working-tree cumulative candidate | 333 tracked final-state differences + 40 untracked = 373 exact paths |
| Cumulative tracked status | 304 modified + 28 added + 1 deleted |
| Sorted cumulative path-list SHA-256 | `aaab977293c034be9bd4ca765ac932341a5e56924d782fad9d32637ecaccefe2` |
| Open PR for source branch | None |

The earlier canonical dirty map captured 295 entries and signature `63623d8bceb1d34fc0ce922473292f222d45bb81037196ed2e45a445c264592c`. Its two timestamped outputs then became untracked files, taking the source snapshot to 297. The map is valid historical intake evidence but is not a current strict-gate result.

The original machine-readable allocation froze 297 currently dirty paths. Its
current-snapshot supplement in
`coordination/release-intake/2026-08-10-A25-california-round18-proposed-packages.json`
assigns the 18 later paths and amendments exactly once. The base allocation and
supplement therefore cover all 315 current dirty paths: zero unassigned and zero
duplicated. The supplement includes the three A25 evidence artifacts themselves;
they remain evidence-only and are excluded from the runtime candidate.

That 315-path dirty overlay is not sufficient to rebuild a clean candidate from
`origin/main`: 58 additional tracked paths already differ in the branch's
committed history. Together, the 18 later dirty paths and those 58 committed
paths form a 76-path cumulative delta over the original 297-path manifest. The
cumulative clean-candidate allocation below is therefore the authoritative
release proposal: **373 paths, zero unassigned, zero duplicated**.

## Proposed owner/path review packages

| Package | Paths | Primary owner(s) | Reviewers | Proposed disposition |
| --- | ---: | --- | --- | --- |
| `CA-R18-01` K-Grade 5 lesson bodies | 108 | A05 | A18, A11 | Reviewed lesson-content package |
| `CA-R18-02` Grade 6-12 lesson bodies | 149 | A05 | A18, A11 | Reviewed lesson-content package |
| `CA-R18-03` Shared lesson shell, registry, narration, seed, and numeric-presentation helpers | 18 | A05 | A18, A09, A11; coordinate A06/A24 | Reviewed shared-runtime package |
| `CA-R18-04` Math-text and speech accessibility helpers | 5 | A09 | A05, A04, A11 | Reviewed accessibility/runtime helper package |
| `CA-R18-05` Checkpoints, diagrams, read-aloud, question types | 16 | A04, A24, A08 | A18, A09, A11, A12 | Reviewed commit or small reviewed series |
| `CA-R18-06` Backend grading and persistence | 7 | A12 | A04, A18, A11 | Reviewed grading-contract commit |
| `CA-R18-07` Visualization alignment and quarantine | 6 | A06 | A18, A05, A11 | Independent review; hunk-split minimal quarantine if catalog work is deferred |
| `CA-R18-08` Generated/source packs and topic metadata | 8 | A21, A03 | A18, A04, A05, A23 | Promote only after A18 acceptance and A23 review |
| `CA-R18-09` Static/browser/E2E gates, content-authority audits, and synthesized command wiring | 32 | A11, A22; A10 for `package.json` | A18, A10 | Review as four exact sub-slices; never copy source `package.json` wholesale |
| `CA-R18-10` California content-QA evidence set | 18 | A18 | A10, A11, A22 | Evidence commit or evidence archive; not runtime |
| `CA-R18-11` A25 intake evidence | 5 | A25 | A10, A22 | Evidence archive or owner-approved discard; not runtime |
| `CA-R18-12` Superseded unreachable Grade 1 raster | 1 | A05, A24 | A18, A21, A23 | Explicit delete-or-archive decision; never silently carried |

Count proof: `108 + 149 + 18 + 5 + 16 + 7 + 6 + 8 + 32 + 18 + 5 + 1 = 373`.

This is the exact current cumulative source allocation. If the owner approves
the durable wiring design, `CA-R18-09` will add two new files—
`scripts/run-us-ca-lesson-content-regressions.mjs` and
`scripts/run-us-ca-lesson-browser-gates.mjs`—and synthesize commands into the
already counted `package.json`. That implementation would raise the candidate
to 375 paths and requires a fresh A25 count/allocation proof before staging.

The exact base lists and the exact 76-path cumulative supplement are in the
machine manifest. In particular:

- `CA-R18-01` is the 90-path dirty K-Grade 5 package plus 18 committed lesson
  bodies; `CA-R18-02` is its 134-path P6-S6 base plus 15 exact lesson bodies,
  including the later `linear-equations.tsx` repair.
- The assignment-derived lesson split has zero shared changed slugs and zero
  unassigned changed lesson slugs. A later package author must stage the frozen
  lists, never either whole lesson directory.
- `CA-R18-03` adds `numberPresentation.ts`, its test, and
  `data/usCaliforniaLessonIllustrations.ts` to the 15-path shared lesson surface.
- `CA-R18-04` adds `lib/mathSpeech.ts` and its test to the three-path MathText
  extraction.
- `CA-R18-05` owns the displayed checkpoint/data/content contracts; A11 owns
  their regression acceptance even though runtime changes span A04/A24/A08.
- `CA-R18-06` includes `teacherOpsSubmissionPersistence.ts` deliberately: it
  propagates question identity into unit-aware grading and is not spillover.
- `CA-R18-08` adds the committed California K-Grade 5 textbook lesson source;
  promotion still requires A18 acceptance and A23 sequencing.
- `CA-R18-09` is an umbrella review boundary. It must be committed as four
  smaller reviewed slices: A18 content-authority gates/ledgers; A11 static
  tests and count-enforcing runner; A22 browser audits/wrapper; then A10
  current-main `package.json` command wiring. No lockfile change is proposed.
- `CA-R18-10` contains the terminal reports plus the historical California QA
  trail. `CA-R18-11` contains only intake evidence. Neither is deployable
  runtime.
- `CA-R18-12` is the single cumulative deletion of the unreachable,
  mathematically inconsistent Grade 1 PNG. The owner must explicitly choose
  deletion or an external evidence archive.

## Owner-pathspec governance changes required before any staging approval

The current canonical map has 15 unmapped paths. This proposal resolves them as follows, but it does not modify `owner-pathspecs.json` without owner approval.

| Exact paths | Proposed routing |
| --- | --- |
| `data/ccssTextbookNarrations.ts`, `data/ccssTextbookRegistry.ts` | A05; A18 review |
| `data/signatureLabAssignments.ts`, `data/signatureLabAssignments.test.ts` | A06; A18/A11 review |
| `lib/practiceFigureAudit.test.ts` | A24/A04; A11/A18 review |
| `lib/practiceQuestionDeduping.ts` | A04; A11 review |
| `lib/practiceReadAloud.ts`, `lib/practiceReadAloud.test.ts` | A04/A09; A11 review |
| `data/usCaliforniaAnswerUnitAliases.ts` | A04; A18/A12 review |
| Five `data/usCaliforniaDisplayed*` / Grade 1 / S5 contract tests | A11; A04/A05/A18/A24 review as applicable |
| `data/usCaliforniaLessonVisualizationAvailability.ts` | A06; A05/A18/A11 review |

A more-specific A11/A22 California QA-script rule is also required to override the current broad A10 `scripts/**` routing. Strict package gating must remain red until canonical routing has zero unblocked unmapped paths.

## Spillover, exclusions, and non-spillover dependencies

### Definite runtime exclusion

The cumulative branch final state deletes
`public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`.
The current registry no longer reaches it and current tests reject it as a live
source because its mathematics is inconsistent. Approve that deletion or move
the bitmap to an external evidence archive; do not silently restore or carry it
into the runtime candidate.

### Related but independently optional

`CA-R18-07` is California-related work, but its broad Visualization Lab catalog corrections are outside the student-visible Round 18 PASS. The student surface currently passes because the production visualization allowlist is empty. Preserve the quarantine as release-blocking. If catalog review is deferred, A05/A06 must hunk-split the minimal allowlist and its consumers rather than dropping a required import or re-enabling unapproved visualizations.

`scripts/audit-us-math-item-quality.mjs` adds useful California template solvers
and mutation checks, but it also audits Arkansas and Florida and is not part of
the 119-test lesson-page manifest. It is allocated exactly once inside
`CA-R18-09`, but must remain its own A21/A11/A18-reviewed sub-slice rather than
being silently treated as a California lesson-page gate.

### Evidence-only material

- `CA-R18-10` and `CA-R18-11` are evidence, not deployable runtime.
- Historical California QA reports from the cumulative branch snapshot should
  be handled as an A18 evidence archive, with Round 18 and the final taxonomy as
  the terminal current-snapshot evidence pair.
- The A25 proposal JSON, this report, and the A25 session log are evidence-only
  paths in cumulative `CA-R18-11`; they are intentionally outside the
  deployable runtime candidate.

### Confirmed dependencies, not accidental spillover

- `types/index.ts` supplies deterministic data-display diagrams and strict answer-unit semantics.
- `lib/server/userStore/teacherOpsSubmissionPersistence.ts` forwards question IDs into the shared matcher.
- `data/generated-content/topics-metadata/topics-metadata.json` corrects California topic metadata.
- `data/usCaliforniaHighSchoolLessonIllustrations.ts` derives preview labels from assigned lesson content.
- `components/practice/PracticeQuestionCard.tsx` makes diagram givens audible.
- `components/visualizations/visualizationDiagnostics.test.ts` protects changed California lab metadata, although its package remains independently reviewed.

No secret, `.env`, private corpus, `.tmp`, `.next`, `node_modules`, or local RAG path is present in the frozen 315-path Git status.

## Round 18 regression-gate wiring

The current durability set contains **18 untracked Round 18 regression
artifacts**: 16 static test files and two authenticated browser audits. The
static manifest additionally depends on the reviewed tracked versions of
`data/usCaliforniaLessons.test.ts` and `lib/server/answerMatching.test.ts` and
now executes **119/119** tests.

The 16 exact untracked static files are:

```text
components/lesson/ccss/lessons/add-subtract-algorithm-model.test.ts
components/lesson/ccss/numberPresentation.test.ts
components/math/MathText.test.ts
data/usCaliforniaDisplayedCheckpointDataDisplays.test.ts
data/usCaliforniaDisplayedCheckpointSemantics.test.ts
data/usCaliforniaDisplayedLessonContent.test.ts
data/usCaliforniaGrade1CheckpointConstructs.test.ts
data/usCaliforniaS5Chapter04CheckpointDiversity.test.ts
lib/server/answerGrading.test.ts
scripts/audit-ccss-lesson-interaction.test.mjs
scripts/ccss-k5-component-boundary-regressions.test.ts
scripts/ccss-k5-content-corrections.test.ts
scripts/ccss-p6-s6-semantic-corrections.test.mjs
scripts/ccss-p6-s6-state-defects-a.test.mjs
scripts/ccss-p6-s6-student-state-corrections.test.mjs
scripts/us-ca-browser-gate-navigation.test.mjs
```

The two exact browser audits are
`scripts/audit-us-ca-displayed-checkpoint-data.mts` and
`scripts/audit-us-ca-lesson-semantic-states.mjs`.

After owner approval, A11 should add a count-enforcing
`scripts/run-us-ca-lesson-content-regressions.mjs` that embeds the exact
18-file static manifest (the 16 files above plus the two tracked tests), invokes
candidate-local `tsx --tsconfig tsconfig.json --test --test-concurrency=1`, and
fails unless TAP reports exactly 119 tests, 119 passed, and zero
failed/cancelled/skipped/todo. A10 should then add only this command to the
current-main `package.json` for the static runner:

```json
{
  "test:us-ca-lesson-content": "node scripts/run-us-ca-lesson-content-regressions.mjs"
}
```

The explicit manifest and count assertion are both gates: a glob can omit a
renamed file, while an explicit list alone can still go green after tests inside
a listed file are deleted.

A18's source-of-truth gate should remain separate and run, in order, source/pack
parity, K-P5 explanation review, and P6-S6 explanation review. Its acceptance
contracts are 810/810 source-pack parity with the full K–P6–S6 span, 336/336
K-P5 explanations, and 474/474 P6-S6 explanations, all with zero drift or
content findings. The K-P5 explanation review JSON is a required input, not an
optional report. The three independent answer-audit artifacts in `CA-R18-09`
remain A18 evidence unless A18 separately approves them as release gates.

The two browser audits must not be wired as a bare command chain against an
assumed server. Before approval, A22 should make both audits require explicit
`BASE_URL` and `AUTH_SESSION_SECRET`, require valid finite viewport dimensions,
and add an owned `scripts/run-us-ca-lesson-browser-gates.mjs` wrapper. That
wrapper must use a candidate-local production build, unique dist directory and
port, generate one non-logged ephemeral secret for server and audits, wait for
readiness, run the data-display and 46-state audits sequentially at 1280×900 and
390×844, stop only its own server in `finally`, and preserve evidence until
cleanup is separately authorized. A10 should wire the wrapper only after the
A11/A18/A22 files exist.

### Owner-mandated Starship-only E2E boundary

The owner requires **all E2E execution to take place on the Starship volume**.
This is a fail-closed A22 acceptance condition, not an optimization. Before
starting a build, server, or browser, the wrapper must resolve and verify that
every E2E-owned path is physically under `/Volumes/Starship/` (including after
following symlinks). The required Starship-resident paths are:

- the clean candidate worktree and its physical candidate-local `node_modules`;
- `NEXT_DIST_DIR` and every other build/cache output;
- dedicated `TMPDIR`, `TMP`, and `TEMP` directories;
- `PLAYWRIGHT_BROWSERS_PATH`, browser user-data/cache directories, and any
  downloaded browser executable used by the run;
- Playwright `outputDir`, HTML/JUnit reports, screenshots, traces, videos,
  storage-state files, logs, server stdout/stderr, and port/process metadata;
- test databases, SQLite handles, fixtures, generated auth state, and any other
  writable E2E runtime artifact.

The wrapper must set explicit absolute Starship paths rather than accept tool
defaults, verify that `/Volumes/Starship` is mounted and writable with adequate
free space, reject unresolved or external symlinks, and abort before launching
the server or browser if any path resolves outside `/Volumes/Starship/`. It must
not fall back to `/tmp`, `/private/tmp`, a user Library/cache directory, or the
internal disk. It must not repurpose `HOME`; browser and tool caches must be
redirected through their supported explicit path variables/options. Evidence
cleanup remains a separate owner decision.

### Gate disposition

| Gate | Release classification |
| --- | --- |
| Displayed California lesson content | PASS for the tested dirty working-tree snapshot |
| Durable Round 18 regression package | BLOCKED until all 18 untracked artifacts, the count-enforcing A11 runner, the A22 browser wrapper, and A10 `package.json` wiring are approved and included |
| Broad California cross-surface gate | PASS: current direct rerun is 18/18 |
| Original depth targets | ADVISORY RED: 322/329 real visual, 62/50 paper-only, 26/28 Grade 8 real visual |
| Round 18 depth no-regression barrier | RELEASE-BLOCKING: real visual at least 322, paper-only at most 62, Grade 8 real visual at least 26, and no previously green depth assertion may turn red |
| Student visualization quarantine | RELEASE-BLOCKING: empty allowlist until independent renderer-level approval |

The earlier 16/18 result was stale gate drift, not a displayed-content defect.
The current tests now assert the actual `defaultLoginGrade` declaration/use and
the current 76-seed visibility contract; a fresh direct run passed 18/18. A11
must preserve that exact green gate in the clean candidate.

Do not weaken the existing 329/50/28 depth targets, add `|| true`, or re-enable quarantined visualizations. If automated, add a separate Round 18 no-regression contract for 322/62/26 while leaving the aspirational gate visibly red.

## Clean-candidate sequence from current `origin/main`

This is a proposal only. Execute it only after separate owner authorization for Git operations.

1. Reverify remote `origin/main`. If it differs from `bd0928ef52ff000976d9abab279bc79fc1aef1ae`, stop and regenerate divergence and overlap evidence.
2. Freeze exact approved package paths and hashes for all untracked inputs. Resolve the 15 canonical owner-pathspec gaps.
3. Preserve `/Volumes/Starship/MAIS-ca-content-qa-wt` unchanged as the authoritative QA snapshot.
4. Create clean package worktrees from the verified remote-main SHA under `/Volumes/Starship/`. Do not use the dirty integration root as a release source.
5. For each package, derive the cumulative California final-state patch from merge base `1d81110c60df2695917947f3198df06b5bc384ba`, restricted to that package's exact path list. Add untracked files explicitly and run a no-write applicability check first.
6. Three-way reconcile the four overlap paths at hunk level; never replace them wholesale.
7. For each approved package, verify there is no outside path, run focused gates, stage exact paths only, and create one reviewed rollback boundary.
8. Review runtime/import packages in this order: `CA-R18-04` -> `08` -> `05` -> `06` -> `07` -> `03` -> `01` -> `02`. Apply `CA-R18-12` only after the owner chooses deletion versus external evidence archive. Then add the four reviewed `CA-R18-09` gate/wiring sub-slices and freeze the tested candidate before adding `CA-R18-10` evidence. Keep `CA-R18-11` outside the deployable candidate.
9. Retain current-main package versions and lockfile. Run candidate-local `npm ci` in the Starship candidate; do not reuse the source worktree's shared dependency symlink or any dependency tree that resolves outside `/Volumes/Starship/`.
10. Run package/import and source-authority gates, the count-enforced 119-test static manifest, the current 18/18 cross-surface gate, depth integrity/no-regression gate, type-check, build, isolated desktop/mobile semantic/data/runtime gates, label-motion and figure-bounds gates, then a fresh clean-source/release preflight. For every E2E phase, first enforce the Starship-only path preflight above and record the resolved paths without exposing secrets.
11. Keep Draft PR, preview, merge, cleanup, and deployment as separate owner decisions.

Do not apply `git diff origin/main` wholesale, copy the whole California worktree over current main, or cherry-pick the entire 90-commit branch history as one unit. Because the source branch is 38 mainline commits behind, the two-tip endpoint diff contains apparent deletions of current-main work that are not California changes.

### Four mainline overlap paths

| Path | Required hunk-level resolution |
| --- | --- |
| `components/lesson/LessonView.tsx` | Preserve current-main compact section audio; integrate California math/diagram read-aloud and renderer corrections |
| `components/lesson/ccss/lessons/precise-definitions.tsx` | Preserve current-main angle-arc geometry; integrate California selected-state accessibility/content corrections |
| `components/lesson/lessonVisualPlacement.test.ts` | Preserve compact-audio assertions and California exact-SVG/no-stale-raster contracts |
| `package.json` | Preserve Next 15.5.23, PostCSS 8.5.26, current lockfile and `test:parent-console`; add only approved California commands |

## Additional release blockers

- A fresh strict worktree-lifecycle run reports 28 worktrees and 28 open
  decisions: 19 dirty and 9 clean-but-diverged, with zero prunable or
  indeterminate entries. The gate remains red; this authorization does not
  permit cleaning, archiving, or bypassing those decisions.
- The release guard's default canonical root still names `/Users/dongpinhu/Desktop/MAIS-MVP`; the current canonical integration root is `/Volumes/Starship/MAIS-MVP`. A10/A22 must either land a reviewed repair or use an explicitly reviewed `MAIS_CANONICAL_RELEASE_ROOT` setting for later preflight.
- Current source dependencies do not prove current-main lock parity. The source worktree shares Next 15.5.20/PostCSS 8.5.16 dependencies, while verified current main requires Next 15.5.23/PostCSS 8.5.26.
- The system temporary volume reached `ENOSPC` during a preserved isolated-copy
  attempt. The exact-snapshot build succeeded only after placing the copy and
  `TMPDIR` on `/Volumes/Starship`. A22 must give the clean candidate its own
  Starship-backed temporary/build directory. The owner's later instruction now
  makes this mandatory for the complete E2E filesystem boundary, so obtaining
  cleanup approval does not permit an internal-disk fallback. A22 must not
  delete preserved evidence as an implicit workaround.
- Existing `.tmp` and `.next` evidence in the authoritative QA worktree must remain preserved. Candidate-local disposable outputs may be considered for cleanup only after evidence archival and separate approval.

## Owner decisions requested

Before any staging authorization, the owner should:

1. Approve, reject, or revise each of `CA-R18-01` through `CA-R18-12` and assign each a final state.
2. Approve the proposed owner-pathspec governance routes, including the more-specific A11/A22 California QA-script rule.
3. Confirm whether `CA-R18-07` should land as one reviewed package or be hunk-split into minimal quarantine versus deferred catalog work.
4. Approve the count-enforced 119-test static manifest, A18 source-authority commands, and isolated A22 browser-wrapper design with the mandatory Starship-only path preflight.
5. Require the current 18/18 cross-surface result and approve creation of a separate depth no-regression barrier without weakening the aspirational thresholds.
6. Choose the disposition for the unreachable Grade 1 PNG and historical QA evidence.
7. Only then issue separate authorization for package worktrees, exact staging, commits, candidate composition, or any later preview/release phase.

Until those decisions are made, the correct state is: **content QA evidence preserved; exact release packages proposed; all Git packaging and release actions stopped.**
