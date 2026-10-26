# State adaptation seams: selective review

## Custody and scope

- Review owner: A25; accepted implementation lanes: A08 (shared topic state and types) and A03 (learning-roadmap integration).
- Source retained: `origin/claude/state-adaptation-seams` at `aa8ecf66778ae53d5986cf8ac086d3eeb2992f6f` (tree `f912ac294a8e72a714ed9ba1c04928d7065dce46`). No source ref or source worktree was changed.
- Target baseline: live `origin/main` and local `main` both at `8aeeda5565a03c41d56c139c298344466da813a9` (tree `719bce7e14565bcf6eb2c1ebb0e880021312e11e`) at review start.
- Candidate branch/worktree: `codex/a08-course-identity-from-main-20260923` at `/Volumes/Starship/项目衍生文件夹/MAIS的衍生文件/MAIS-course-identity-20260923`; created 2026-09-23 from the target baseline. Owner A08, target PR pending, expected closeout 2026-10-01. The registered worktree was relocated from its earlier `/Volumes/Starship/MAIS-course-identity-20260923` path.
- Mode: integrate-candidate. Nothing has been landed on `main`, pushed, merged, deployed, or removed.

## Separate dispositions

| id | intent | source branches/commits | paths | classification | validity evidence | method | dependencies | targeted verification | result commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| course | Represent a named course alongside a topic's persisted grade | `claude/state-adaptation-seams` / `a5c5dcd0e67e4619360e18e0cc767c3ecbe0cd2b` | Candidate has 12 exact files, listed below | `port` | The source helper has no production caller and falls back to a US grade label even for HK/mainland tracks. Its California `grade` designation cannot represent both traditional and integrated high-school pathways. The need for course identity remains valid. | Add paired optional `courseId`/`courseLabel`; carry source topic fields through seed records, SQLite snapshots, API reconstruction, and student roadmap/card/map display. On a withdrawn mapping, clear old seed metadata and persist the removal in SQLite. Keep current topics unchanged until a sourced course map is reviewed. | A08 shared types, A03 learning-roadmap integration; later A18/A23 content approval for actual course assignments | Source-to-SQLite integration, focused tests, `test:components`, `test:mvp`, `type-check`, build, targeted browser tests | Uncommitted candidate on `codex/a08-course-identity-from-main-20260923` |
| standards | Check a displayed standard code against the asset and crosswalk | `claude/state-adaptation-seams` / `315375ac7a36dd58675e11b12b3f8d6a1f004da1` | `lib/standards/*`, `components/standards/*` | `incomplete` | `StandardRef` is used only in its own module and tests; no lesson or student surface calls it. The ratchet permits 266 lesson files and 369 raw-code occurrences. `normalizeCcssId` drops a trailing substandard suffix such as `1a`, which can make distinct identifiers compare equal. | Do not transplant. Define and validate the actual asset-to-standard contract, preserve full identifier identity, then connect the real rendering surfaces. | A05 lesson surfaces, A18 curriculum QA, validated crosswalk | Actual lesson rendering and a collision regression test before reconsideration | None |
| k5-items | Add independently verifiable K–5 practice templates | `claude/state-adaptation-seams` / `213f99bc3e2a651a63f91b4a863181a3d7fd44af` | `lib/itemTemplates/k5Templates.ts`, `scripts/audit-k5-item-coverage.ts`, `lib/mvpReadiness.test.ts` | `incomplete` | The 37 families are exercised on their own generated prompts, but no new K–5 bank uses them and the existing quality audit does not invoke them. The new audit can exit successfully with zero covered items or an unreadable pack; it has no minimum coverage gate. | Keep in the source branch for revision. Require a generated candidate pack, a failing minimum-coverage gate, and integration with the existing item-quality audit. | A21 generation, A18 independent content QA, A23 promotion gate | Candidate pack coverage, answer-key mutation, full item-quality audit | None |

The course identity candidate is a foundation for future sourced topic metadata. It does not assert that a particular Arkansas, California, or North Carolina chapter belongs to a named course. Existing grade grouping and persistence remain intact. State adoption and live content promotion retain their separate A18/A23 gates.

The exact current course candidate consists of seven modified files: `components/learning/LearningRoadmap.tsx`, `components/learning/SubwayNetworkMap.tsx`, `lib/mvpReadiness.test.ts`, `lib/server/userStore.ts`, `lib/server/userStore/studentActivityPersistence.ts`, `lib/server/userStoreStudentActivityPersistence.test.ts`, and `types/index.ts`; plus five new files: `components/learning/courseIdentityPipeline.test.ts`, `lib/curriculumCourses.ts`, `lib/curriculumCourses.test.ts`, `tests/e2e/course-topic-label.spec.ts`, and this review record. The initial six-file wording no longer describes the reviewable slice and does not authorize staging or publishing all 12 files.

Independent A08 review passed the bounded source-to-roadmap data chain after the seed metadata add/withdrawal and SQLite persistence fixes. Independent A03 review passed the topic-card and subway-map display for a Draft PR foundation; grade-level terminals still show grade. Neither review accepted real course mappings. A08 noted that the separate adaptive-state Topic projection does not yet carry these fields and that a PostgreSQL add/withdrawal exercise was not run. A03 noted that the browser test covers an English HK demo with an injected API mapping; the first reviewed real mapping still needs US/Chinese-language visual checks, including long SVG labels.

Curriculum check: the [California Department of Education mathematics standards](https://www.cde.ca.gov/be/st/Ss/documents/ccssmathstandardaug2013.pdf) describe both traditional and integrated higher mathematics pathways, while the [North Carolina Department of Public Instruction](https://www.dpi.nc.gov/districts-schools/classroom-resources/office-teaching-and-learning/standard-course-study/mathematics/standard-course-study-supporting-resources) lists NC Math 1, 2, and 3 as named courses. These sources support a topic-level course field; they do not supply mappings for the current MAIS topics.

## Verification

- Isolated dependency install: `npm ci --ignore-scripts --no-audit --no-fund` with a worktree-local npm cache — passed (209 packages). The first attempt stopped because the user-level npm cache path was not a directory; it did not run tests.
- Focused unit tests: `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json --test lib/curriculumCourses.test.ts` — 4/4 passed.
- `npm run test:components` — 583/583 passed, including source add/withdrawal against a real SQLite snapshot and physical persisted-row readback.
- `npm run test:mvp` — 34/34 passed, including two course-reference assertions in the existing CI-reachable gate. The metadata assertion audits both `data/topics` and the client-safe `data/topicsMetadata` snapshot used by the roadmap.
- `npm run type-check` — passed (exit 0). An earlier attempt during dependency installation produced missing Next declarations; the completed-install rerun passed.
- `npm run build` — passed (exit 0) after the SQLite and UI changes.
- `PLAYWRIGHT_PORT=3081 npx playwright test tests/e2e/course-topic-label.spec.ts --project=desktop-chrome` — 2/2 passed against the final candidate, with a synthetic course pair injected into the roadmap API response.
- `PLAYWRIGHT_PORT=3082 npm run test:backend` — 6/6 passed against the final candidate, including authenticated student learning APIs.
- `git diff --check` — passed before this report edit; recheck at handoff. Candidate changes remain uncommitted for review. Local `main` remains at the baseline commit and a fresh `git ls-remote` confirmed `origin/main` at that commit and the source branch at `aa8ecf66778ae53d5986cf8ac086d3eeb2992f6f`.
- No current topic carries a sourced course identity. The tests demonstrate the data transport and conditional display, not A18-approved curriculum mapping or production browser acceptance. The full `npm run check` suite was not run for this bounded candidate.

## Separate follow-up candidates from the same main baseline

The table above is the review disposition of the **old source commits**. Its standards and K–5 `incomplete` findings were not silently accepted. Two separate worktrees were created from `8aeeda5565a03c41d56c139c298344466da813a9` and contain revised, uncommitted candidates:

- Standard claims: `codex/a05-standard-ref-claims-20260924` at `/Volumes/Starship/项目衍生文件夹/MAIS的衍生文件/MAIS-standard-ref-20260924`. Its report is `coordination/decisions/2026-09-24-standard-claim-repair.md` in that worktree. The repair preserves `7c`/`7d` identity and attaches validation to the actual CCSS lesson footer; a mounted-adapter regression, 586 component tests, type-check, and build passed. The 369 raw code occurrences in ported lesson body sources remain an explicitly bounded follow-up before any cross-track reuse.
- K–5 candidate: `codex/a21-k5-template-candidate-20260924` at `/Volumes/Starship/项目衍生文件夹/MAIS的衍生文件/MAIS-k5-templates-20260924`. V1 and v2 received independent A18 `needs-repair` and were preserved with their original hashes. V3 received `approved-for-integration-review` for its exact hash. V4 corrected provenance metadata while keeping all 111 question content fields identical; independent A18 reissued `approved-for-integration-review` for v4 SHA-256 `ef2c98236d2d7667f23c1ce1011895b9541b9409e3d3deb06474531db477ef81`. The v4 `qa-report.md` and `promotability-decision.md` are A23 intake inputs, not a Promotion Manifest/Receipt or live integration.

All three slices retain `main` as their common baseline and remain uncommitted for review. No remote source branch, `main`, or production surface was mutated by this work.


## 2026-09-26 continuation — adaptive course identity

The earlier sections are the 2026-09-24 evidence snapshot. A08 resumed the existing 12-file uncommitted candidate under the owner's continuation request; A11 independently reviewed the new repair. No Git ref or index was changed.

The previously disclosed adaptive projection gap was reproduced through the real `getAdaptiveLearningDecision` entry point: a seed topic carried `reviewed-course` through SQLite and the roadmap, while the adaptive decision dropped it to null. The regression was added to the existing `components/learning/courseIdentityPipeline.test.ts`, observed failing, and repaired in the existing `toTopicRecordTopic` conversion in `lib/server/userStore.ts`. The conversion now preserves the optional paired ID and localized label, without changing grade, ranking, recommendation guards, or content mappings.

Fresh checks against the repair:

- Real SQLite source injection/withdrawal plus course helper tests: 6/6 PASS. Both independent processes and direct persisted-row readback are exercised; no external provider request is made.
- Independent A11 rerun of the two SQLite pipeline tests: 2/2 PASS; no actionable finding in the bounded repair.
- `npm run type-check`: PASS.
- `npm run test:analytics`: 58/58 PASS, including adaptive behavior and coherence constraints.
- `npm run test:components`: 583/583 PASS.
- Extended the existing browser spec with California English and Simplified Chinese synthetic long course labels. Fresh browser/backend run is in progress at this update; no result is claimed yet.

The candidate is still a foundation. There is no sourced live course assignment, no PostgreSQL add/withdrawal proof, and no production acceptance. Earlier standards/K–5 "uncommitted" descriptions refer to the older snapshot: standard claims now has draft PR #259, and the K–5 candidate has a separate committed/pushed source. This course work does not modify either slice.


### Browser/backend completion and preserved failures

The fresh isolated build completed and all six `backend-api.spec.ts` cases passed. The first UI run had 3/4 passes: the added US Chinese-label expectation was wrong because current owner policy forces US curricula to English (`LanguageToggle`). The corrected test asserts English-only for requested en and zh-Hans, while a separate HK account performs actual UI language switching and renders the Chinese course label.

Manual reuse of the build exposed two fixture issues, both preserved in separate run directories: the server used a different synthetic session secret than the cookie helper, and HK language preference survived between runs. The final HK helper uses the real login API to initialize the owned test account's English preference, then explicitly verifies its session user ID. No product policy or rendering assertion was relaxed.

Final `course-topic-label.spec.ts`: 5/5 PASS, no retries, 16.4 seconds, run ID `course-identity-20260926-session-fixture-fixed`. It covers the topic label, selected subway station, US English-only for two login language inputs, and actual HK simplified-Chinese menu selection. Independent A11 source review confirms these changes preserve the intended behavior and stronger authentication check. US fixtures verify successful login and topic track; no broad authentication or narrow-screen layout claim is made.

The earlier six backend passes and final five course UI passes are different retained runs, not a fabricated single 11-case pass. All failed traces remain. The local server on 3093 was stopped through its owned session; read-only postflight found no listener. Existing build and synthetic database outputs remain intact. These are local, synthetic-mapping tests, not real course-map promotion or production acceptance.
