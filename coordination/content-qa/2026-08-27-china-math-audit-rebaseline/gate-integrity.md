Everything measured. Here is the report.

---

# China math audit — "the release gate" family, re-measured on current main

**Repo:** `/Volumes/Starship/MAIS-main-wt` @ `1112f9af33` (clean, unmodified)
**Gate run:** `npx tsx` → `buildFullQuestionBankSolvabilityAudit()`, 2026-08-27, full report at `/private/tmp/claude-501/-Volumes-Starship-MAIS-MVP/d75c3b6b-06d8-4c69-8105-e940eee6fc7c/scratchpad/rebase/work/gate-report.json`

| Finding | Original claim | Re-measured on main | Verdict |
|---|---|---|---|
| **G1 mechanism** — `isExpectedAnswerRepresented` compares the key to a copy of itself because bank wrappers set `independentAnswer: question.answer` | 6 of 9 mainland wrappers, cited by file:line | Mechanism **byte-for-byte unchanged**. `isExpectedAnswerRepresented` is still `lib/questionBankSolvability.ts:612`, still called at `:1377`. All 6 wrapper lines still present and untouched since the initial snapshot commit (`git log -L` → `2294d3cab6`). 3 are live, 3 are dark. Two further live slices self-verify by other routes (below). No independence guard exists anywhere in `lib/`, `tests/`, `scripts/`. | **SURVIVES** |
| **China self-verification rate** | 17,700 / 17,700 (100.0%) | **11,700 / 11,700 (100.0%)** — strict `storedAnswer === independentAnswer`, track `MAINLAND_PEP_HIGH`. Zero rows differ, before or after normalization. | **CHANGED** (smaller, not better) |
| **Platform-wide self-verification** | 24,502 / 24,566 (99.7%) | **16,482 / 16,499 (99.90%)** — HK 989/989 (100.0%), US_CA 2,310/2,310 (100.0%), China 11,700/11,700 (100.0%), US_AR 1,483/1,500 (98.9%). The rate went **up**: the corpus shed more independently-checked rows than tautological ones. | **CHANGED — worse** |
| **"Only US_AR had 64 genuinely independent rows"** | 64 rows, 2.1% | **17 rows, 1.1%** — and *none of them is an independent derivation*. All 17 are the same value with a unit, comma, or label stripped: `"8 apples"`/`"8"`, `"406,231"`/`"406231"`, `"1/6 of a pizza"`/`"1/6"`, `"5 inches"`/`"5"`. Pack-level check confirms: `usArkansasQuestionGenerationMetadata[id].independentAnswer === question.answer` for 1,483/1,500. | **CHANGED**, and the *"genuinely independent"* reading is **DEAD** — platform-wide, the number of rows where a second derivation actually produced a different value is **0** |
| **Gate output** | `passRows: 24566, failingRows: 0`, Green | `totalQuestions: 16499`, `passRows: 16499`, `failingRows: 0`, `statusCounts: {pass:16499, content-error:0, solver-gap:0, answer-mismatch:0, ambiguous-mc:0, grader-gap:0}`, `trackCounts: {HK:989, MAINLAND_PEP_HIGH:11700, US_AR_MATH:1500, US_CA_MATH:2310}`, `releaseRecommendation: "Green: all current questions are deterministically solvable and answer-key matched."` Recommendation logic (`:1489`) is still `failingRows.length ? Red : Green` — unchanged. | **SURVIVES** (magnitude only) |
| **Smoking gun `pep-primary-p1-u-mc-051`** | storedAnswer `"sphere"`, independentAnswer `"sphere"`, status pass, notes `["OK"]` | **Identical, verbatim.** Row still emitted: `storedAnswer:"sphere", independentAnswer:"sphere", status:"pass", severity:"none", notes:["OK"]`, grade P1, batch `primary-rag-v1`. Corpus row confirms prompt `小林摸到一个立体图形，它从各个方向都能滚动…` with options `正方体 / 圆柱 / 球 / 长方体` — the key is still an English word absent from every option. | **SURVIVES** |
| **G1 in the three withdrawn slices** (bnu-primary 3,000; hjb-primary 1,500; hjb-high 1,500) | part of the 17,700 | Dropped from `data/questions.ts` by `cf1a4822a9` "fix(promotion): de-reach unapproved practice candidates" (2026-08-26). Gate reports 0 for all three, and `expectedMainlandBnuPrimaryQuestionCount / HjbPrimary / HjbHigh` are now literal `0` (`:247-250`). **The defect in their code is untouched**: `mainlandBnuPrimaryQuestions.ts:146`, `mainlandHjbPrimaryQuestions.ts:111`, `mainlandHjbHighQuestions.ts:101` all still read `independentAnswer: question.answer`, `independentAnswerFor` (`:1196`, `:1212`, `:1216`) still dispatches to them, and their accessors still fall back `?? question.answer`. Re-promotion restores the defect with no further change. | **MOOT for shipped content; returns verbatim if re-promoted** |

### Live self-verification, by mechanism (all 11,700 shipped China rows)

| Slice | Rows | How `independentAnswer` is produced | Independent? |
|---|---|---|---|
| bnu-junior | 1,500 | `data/mainlandBnuJuniorQuestions.ts:130` — `independentAnswer: question.answer` | No — literal copy |
| bnu-high | 1,500 | `data/mainlandBnuHighQuestions.ts:117` — same | No — literal copy |
| hjb-junior | 1,500 | `data/mainlandHjbJuniorQuestions.ts:162` — same | No — literal copy |
| pep-junior | 1,200 | `data/mainlandPepJuniorQuestions.ts:376` — `independentAnswer: translateVisibleAnswer(question.answer)`; `translateVisibleAnswer` is `visibleMath`, a formatting pass (`:75-77`) | No — cosmetic transform of the key |
| pep-primary | 1,200 | `independentMainlandPepPrimaryAnswer` (`data/mainlandPepPrimaryQuestions.ts:1540-1546`) re-invokes `draftForFamily(family, type, itemIndex).answer` — **the identical pure call**, with identical args, whose `.answer` became `question.answer` at `:1299` → `:1335` | No — tautology by generator replay. Worse than a copy: it *looks* like a solver |
| pep-high | 4,800 | `mainlandIndependentAnswer` (`lib/questionBankSolvability.ts:1130`) → 18 prompt-parsing solvers (`solveQuadratic`, `solveConics`, …) that never read `question.answer` | **Yes, structurally** — but 4,800/4,800 agree exactly on the first pass, which for machine-generated items built from the same topic-family templates is agreement between two expressions of one generator, not corroboration |

So **6,900 of 11,700 live China rows (59.0%)** are verified against their own key by direct copy or replay. The remaining 4,800 route through a real solver and produce a 100.0% match rate that I did not independently corroborate.

### One thing the original audit missed

`lib/fullQuestionBankSolvability.test.ts:35` is named *"full question bank is independently solvable and answer-key matched"* and asserts `report.summary.passRows === expectedFullQuestionBankCount`, `failingRows === 0`, `deepEqual(report.failingRows, [])`. It contains **no assertion of independence at all**. The vacuous Green is pinned by CI: any genuine solver that disagrees with even one stored key breaks the build, so the fix and the test have to land together.

Also worth recording: `cf1a4822a9` *did* strip the hard-coded `mathQaStatus: "pass" / manualQaStatus: "approved"` literals from `mainlandHjbHighQuestions.ts` (the G2 laundering pattern) and replaced them with `manualQaStatus: "not-approved"` — but only for the slice it was de-promoting, and it left the `independentAnswer: question.answer` line on the very next lines untouched.

---

## What this means for the remediation plan

**Do not downgrade G1.** It is the single most-intact finding in the audit — the mechanism, the wrapper lines, the dispatch, the release-recommendation logic, and the exact smoking-gun row are all bit-identical to what was reported against a 360-commit-old branch. The 17,700→11,700 withdrawal did not touch it. Any remediation item that was sized against "6 wrappers, 17,700 rows" should be re-sized to "6 wrappers of which 3 are live, plus two additional live self-verification routes the original audit did not name (pep-junior's `visibleMath` pass and pep-primary's `draftForFamily` replay), covering 6,900 live China rows." The pep-primary replay is the more dangerous of the two new ones, because it presents as an independent solver function and will pass a code review that greps only for `question.answer`.

**Two claims must be rewritten before the plan is re-issued.** First, every headcount in the G1 section is stale — use 11,700 China / 16,499 platform / 16,482 self-verified. Second, and more importantly, the plan's implicit consolation that "US_AR shows the pipeline *can* produce independent answers" is false: the 64 rows became 17, and inspection shows all 17 are unit/comma stripping, not derivation. There is currently **no** slice on this platform demonstrating a working independent-answer path, so the fix cannot be scoped as "extend the US_AR approach" — it has to be built from zero.

**The withdrawal made the corpus smaller, not safer, and it made the gate's blind spot proportionally larger** (99.7% → 99.90% self-verified). Worse, `expectedMainland{BnuPrimary,HjbPrimary,HjbHigh}QuestionCount` were set to `0` and the regression test now asserts those zeros, which means the withdrawal is recorded in the gate as a *satisfied expectation* rather than as suppressed content. Re-promoting any of the three slices restores 6,000 tautologically-verified rows with a one-line import change and no gate objection. If the remediation plan has a "re-promote after review" step for bnu-primary or hjb-primary, it must be gated on G1 being fixed first, not run in parallel.

**Sequencing consequence for Japan/Korea.** The original report's rollout warning stands and is now stronger, since the only track that looked like a counterexample no longer does. Fix order should be: (1) land a real independent-answer path plus a gate rule reporting self-verified rows as `unverified` rather than `pass`; (2) rewrite `lib/fullQuestionBankSolvability.test.ts:35` in the same change, since it currently blocks the fix; (3) only then touch slice promotion or new-locale generation.