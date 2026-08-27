# Adapting California math into other states — a scalable, reliable plan

**Date:** 2026-08-26
**Author:** Claude (Opus 5)
**Base tree:** `origin/main` @ `7f7c485987`
**Method:** 4 grounding researchers → 3 independent competing architectures → 2 judges (staff-engineer lens, curriculum-lead lens) → 1 red team. Both judges independently chose the same architecture. The red team then found three *fatal* sequencing defects in it, all verified against the tree before being written down here.
**Companion:** [Claude's Cross-State Visualization Lab Audit 2026-08-26.md](Claude's Cross-State Visualization Lab Audit 2026-08-26.md)

---

## The bet

**Do not build a canonical curriculum layer. Build the gate wall.**

CCSS-M is already the pivot — it is the join key for 100% of the curated asset base (192 benches, 270 lesson bodies, every CA question pack), and it is already committed and CI-tested at `data/ccss/` (385 standards, 65 domains, 147 clusters). What is missing is not a data structure. It is (a) a place for each state to *declare* its crosswalk into that pivot, and (b) gates that refuse to ship a state whose declaration is fiction.

This is not a preference — it is what the evidence says. **Every defect the audit found was a missing gate, not a missing abstraction:** `FL.BEST.Math.G6.RP`, Arkansas's 227-of-3,000 verified bank, the 26 decapitated titles, the school-garden problem printed on the Pythagorean chapter, California's own 810 items whose "independent solution" is a byte copy of the explanation. No canonical layer would have stopped any of them.

So: **generalize the ~24 California-named constructs that block a second state, define one directory of pure data per state, make its completeness a compile error, and spend every remaining hour on gates.**

Two architectures were rejected. A *CCSS spine* layer scored well but is derived mechanically from `data/ccss` — a maintained abstraction with no independent information content, and it takes an irreversible mastery-key migration for a feature nobody needs yet. A *concept graph* scored highest on long-run scalability and contains the single best idea in the set (below), but asks a small team to hand-author ~400 concept records and ~400 evidence rows *before Arkansas improves at all*, then makes that judgment a permanent database key. Both were mined for grafts; neither is the plan.

---

## Status: all three blockers are now implemented

Branch `claude/state-adaptation-seams` (pushed 2026-08-26, based on `origin/main` @ `c8009edf70`) lands all three, each verified against the tree first and each gate mutation-checked:

| Blocker | What landed | Gate |
|---|---|---|
| No verified K-5 item machinery | 37 template families in `lib/itemTemplates/k5Templates.ts`, deterministic generation + re-solve from prompt text | `test:mvp` + `scripts/audit-k5-item-coverage.ts --self-test` |
| No course seam | `SecondaryOrganization`, `Topic.courseId`/`courseLabel`, `lib/curriculumCourses.ts` with an exhaustive per-track registry | `test:mvp`, AR ratchet at 20 |
| Displayed standard codes unverified | `lib/standards/standardRef.ts` + `components/standards/StandardRef.tsx` | `test:components`, prose ratchet at 266 files / 369 occurrences |

One correction to §3 below from implementation: the raw-code-in-prose problem is **266 of 270 lesson bodies (369 occurrences)**, not 141 — measured with a precise CCSS-code pattern, all inside rendered JSX.

---

## Three things that must land before any state work

The red team found these by attacking the winning plan. Each is a **persisted-schema** change, so doing it later is a data migration across three tables rather than a config edit.

### 1. There is no verified K–5 item machinery anywhere in this repo

I verified every question pack on disk:

| Pack | Items | With `generationTemplate` |
|---|---:|---:|
| `us-ca-math-g6-g12-generated-bank-v2-1500` | 1,500 | **1,500** |
| `ccss-textbook-practice-v1` (K–S5) | 810 | **0** |
| `us-ca-k5-knowledge-point-practice-v1` | 492 | **0** |
| `us-ca-math-k-g5-generated-bank-v3-deepseek-1500` | 1,500 | **0** |
| `us-ar-math-k-g5-generated-bank-v1-1500` | 1,500 | **0** |
| …11 other packs (HK, Mainland, AR 6–12) | — | **0** |

**One pack out of sixteen carries verified item machinery, and it is grades 6–12 only.** California's 100% re-solve rate comes entirely from those 67 templated families. There is *no verified K–5 item asset for a crosswalk to inherit.*

This is decisive, because Arkansas K–5 (174 of its 209 topics) is the plan's first-value phase. Under a launch gate requiring verified practice, **Arkansas could never go live no matter how good the crosswalk is.** Fix: author ~30–40 solver-backed K–5 template families as a shared asset *before* the first state phase — it is the true bottleneck, and every state inherits it. And split the launch flag into `live-lessons` and `live-practice` so a state can honestly ship benches and lesson bodies with practice explicitly dark and labelled.

### 2. There is no way to represent a course

`Topic.grade` is a **required, single-valued** `GradeId` ([types/index.ts:1632](types/index.ts:1632)), and `courseId` **does not exist anywhere in the codebase** — I grepped `types`, `data`, `lib`, `components`: zero hits.

Texas TEKS and Virginia SOL are course-organized (Algebra I, Geometry, Algebra II), and Algebra I is commonly taken in grade 8 *or* 9. North Carolina — the state you'd use to measure marginal cost — is worse: NC Math 1/2/3 is an integrated pathway with no Algebra/Geometry split at all.

**This has already shipped wrong.** Arkansas's own profile in `data/rag/usMath.ts` declares Algebra I / Geometry course organization assessed by EOC exams, while its topics ship as `us-ar-math-g09-chapter-01` … `g12-chapter-05` and render as *"Grade 10"* to a student whose school teaches Geometry in grade 9.

Fix in P0: `secondaryOrganization: "grade" | "course" | "integrated"` on the state profile, `courseId`/`courseLabel` on the topic contract, and a gate refusing a bare grade label for a course-organized state.

### 3. The displayed standard code is an unverified claim

This is the plan's most likely way to ship something untrue, and one gate fixes it.

When Arkansas renders a CCSS lesson body under the label `AR.Math.3.GM.x`, that is an assertion to a parent, a teacher, and a district. Today nothing verifies it: the crosswalk row's only correctness check is a free-text rationale, and for the entire 6–12 half the join is *domain-level* — `data/ccssLessonAssignments.test.ts` explicitly exempts chapter topics from the per-standard check. Meanwhile **141 of the 270 lesson bodies print a raw CCSS code in student-visible prose** (e.g. `time-to-minute.tsx:94` renders "3.MD.A.1"), so an Arkansas learner would see an Arkansas code in the chrome and a Common Core code in the body of the same lesson.

Fix: every state standard code that reaches the DOM passes through one `<StandardRef state assetStandardIds>` component that resolves through the crosswalk to the CCSS ids **the asset itself carries** — bare code only when the relation is `exact`, a qualifier ("develops part of…") for narrower/broader/partial, nothing for `none`. Plus a source scan forbidding standard-id-shaped literals in rendered strings (baseline 141 → 0).

---

## Phases

| Phase | Goal | Size |
|---|---|---|
| **P0** — De-Californiaize + schema seams | Make the bench/lesson/alignment machinery state-neutral, and add the three seams above. **Zero change to California output**, proven by a byte-identical catalog hash. | ~47 edit sites, one mechanical PR |
| **P1** — The adapter contract | One directory of pure data per state; completeness enforced by the repo's first exhaustive `Record<CurriculumTrack, …>` (today that grep returns **zero** results, which is why adding a track produces no compile error at all). California becomes adapter #1. | Medium |
| **P2** — The gate wall | Build every gate *before* the content it judges, and calibrate each on California first. | Large, highest value |
| **P2.5** — K–5 item template family | ~30–40 solver-backed template families. The real bottleneck; a shared asset, not a state cost. | Large |
| **P3** — Arkansas K–5 | 174 topics through the contract, keyed off `safeFocus` (verified 1:1 with `officialStandardId` on 1,500/1,500 rows). | 174 curated rows ×3 tables |
| **P4** — Arkansas 6–12 | Re-model as **course-organized**, not "repair or withdraw" — as currently modelled it is unrepairable. Retire the 35 fictional `AR.Math.G6.RP`-style codes. | Medium |
| **P5** — Florida | Rebuild on transcribed B.E.S.T. All 15 chapters. Proves the contract handles a non-CCSS framework. | 15 chapters, ~180 benchmark rows |
| **P6** — North Carolina | The marginal-cost meter: measure — don't assert — that state N+1 costs no engineering. Instrument the pivot triggers. | Small by design |

**Sequencing rule:** P0 is mechanical and must be provably behaviour-preserving. Never combine a rename with a semantic change — that is exactly how you lose the ability to tell a refactor bug from an intended coverage drop.

---

## The gate wall

Each gate ships with a `--self-test` that must fire on a defect **already proven to exist in this tree**. A gate that has never gone green on good data and red on bad data is not a gate.

| Gate | What it proves | Calibration defect |
|---|---|---|
| **G1 Standards reality** | Every emitted standard id traces to a human transcription citing a source anchor. Kills `stateSpecificStandardIds` (`data/rag/usMath.ts:1704`) — the generator that manufactures `${prefix}.${ccssDomainLetters}` for **all eleven states**, not just Florida. | FL 15/15 fictional; AR 6–12 35/35 |
| **G2 Provenance** | `authoredBy`, `authoredAt`, `reviewedBy`, `benchSha`, `tagsSha` required on every curated row — a missing field is a compile error. | 0 of 76 CA rows carry any |
| **G3 Bench fit** | *Two independent signals*: CCSS-tag intersection **and** a cited step title extracted **live from the shipped `.jsx` at test time**. | `make-ten → PowersOfTenLab` |
| **G4 Item verification** | Enumerates packs **from disk**, not from the adapter — an artifact must not declare its own audit scope. Retires `inferred` mode: templated, mathfact, or not live. | A 1,500-item CA pack sits one boolean from live and invisible to the audit |
| **G5 Displayed claim** | The `<StandardRef>` gate above. | 141 of 270 lesson bodies |
| **G6 Grade agreement** | `ccssClusterIdForTopic(topic.id, topic.grade)` must match a crosswalked cluster. Without it a state-correct grade plus a topic-id token silently yields the *wrong* CCSS cluster — and `lib/diagnosticPlacement.ts:154` and `lib/adaptiveLearning.ts:18` consume that as truth. | Any grade-shifted state |
| **G7 Prose honesty** | Worked-example distinctness; no regex-derived titles. | AR 4 distinct openings / 30; 26 titles |
| **G8 Launch** | `launch.status` may go `live` only when G1–G7 pass with a named owner — and registration, login, OAuth, question routing and hub filtering all **derive** from that one field, replacing ~23 hand-maintained allowlists whose drift is already provable (`app/api/auth/google/start/route.ts:11` admits NC but omits AR and FL). | — |
| **G9 Revision watch** | Per-state `standardsVersion` + `maxStaleDays`; `live` downgrades to `review-required` on staleness. G1 alone is self-consistent by construction and would certify a *retired* framework forever. | — |

**G8 is the structural answer to "a state cannot ship broken."** It is the difference between a process rule and an invariant, and only invariants survive three years.

**G3's live extraction is also the bench-staleness detector the repo lacks.** `scripts/check-port-drift.mjs:24-30` says outright that the upstream library lives outside the repo and CI cannot see it, so it exits 0 when blind. The window is open right now: `bench-standards.json` is stamped **2026-07-25** while `port-manifest.json` is **2026-08-25** — every bench assignment is being checked against a one-month-old view of the tag library.

---

## Marginal cost, stated honestly

The plan's headline is "one registry line plus one directory." That is true of **engineering** cost and false of **curation** cost. Publish both:

- **Engineering, per state: ~constant and near zero.** One row in the registry, one adapter directory. No renderer, gate, or component code.
- **Curation, per state: linear in that state's standards.** Arkansas K–5 alone is 174 crosswalk rows + 174 bench-assignment rows + 174 lesson-assignment rows, each with a rationale. At a realistic ~30 curated rows/day that is weeks, not days.

The compounding term is real but must not be oversold: content is denominated in **CCSS nodes**, so a bench authored for `4.NF.1` completes that node for every state whose crosswalk touches it, and the global debt (`385 − covered`) decreases monotonically. The K–5 template family from P2.5 amortizes the same way.

**Tiering by `crosswalkRelationToCcss`** — a field that already exists per state at `data/rag/usMath.ts` and is wired to nothing:

- **Tier A `exact`** (CA, IL, MI): identity crosswalk. Cheapest possible state.
- **Tier B `near`** (AR, FL, NC, NY, PA, OH, GA): real per-standard crosswalk + a declared gap list. **All three near-term targets are here.** This is the design centre.
- **Tier C `state-only`** (TX): the shared pool of 192 benches and 270 lesson bodies is unreachable and 100% of the asset base evaporates at once. **Texas is not adaptable under this plan** — it is a content project, and it is the pivot trigger.

---

## What we are deliberately not doing, and the trigger to reconsider

No canonical concept layer — **yet**. Instrument the decision instead of guessing: `report-state-crosswalk-residue` emits candidate concept labels drawn from the states' own vocabularies, and when two or more live states share residue concepts, or a Tier-C state enters the roadmap, that is the signal to build it. Write the freeze discipline into `data/states/README.md` **now**, while `canonicalTopicId` is still pinned to identity (verified: 684/684 topics): *ids are added or retired-with-`supersededBy`, never renamed, never deleted*, because they would become `adaptive_skill_states.skill_id`. Writing that rule down today costs nothing and prevents the one irreversible mistake in this problem space.

---

## California's own debt, declared before it is exported

A state adapter must not inherit a verification claim California never earned. Record each as a numbered ceiling that can only fall:

1. **810 of 2,802 CA items** have `independentSolution` byte-identical to `explanation`. Honest provenance is `passed-ccss-textbook-hand-check`, not independent verification.
2. **52 of 76 CA labs** claim a whole CCSS domain by auto-fill, producing 49 standards in depth tier D ("no bench; the only claim came from the whole-domain fallback"). Do not launder this into hand-blessed "curated" data during P0 — freeze it as declared, ratcheted debt and fix it as a content ticket.
3. **The safeguard reviews are a heuristic template.** All 76 share exactly **one** distinct summary string, which self-identifies: *"Heuristic review found this California math canvas bench…"*. Do not replicate this per state — it would add cost and zero assurance. Use a per-state `sourcePolicy` plus a named human signature on the launch record, and leave the safeguard slot empty-and-default-deny until a real review exists.
4. **The student note has no renderer.** Defined at `data/visualizationLabs.ts:129`, populated at `:2607`, read by nothing. Either render it or delete it.
5. **The benches emit no telemetry** (0 of 192, though 171 have sliders). Fix before scaling, or you scale a system you cannot measure.

---

## Standards text and attribution — a real compliance gap

`data/ccss/types.ts:15-17` claims descriptions are *"concise, faithful paraphrases … not the verbatim copyrighted text."* That claim is false for the short-standard tail: `data/ccss/grades-k2.ts:23` ships `"Count to 100 by ones and by tens."` — the official K.CC.A.1 text, verbatim. And `data/usCaliforniaLessons.ts:641-666` renders `${id} — ${description}` into a shipped teacher-guide block whose own copy says *"The full CCSS standard text each lesson develops is listed below."*

CCSS is publicly licensed, so this is not automatically an infringement — but the license's **attribution and no-endorsement notices are stored in `data/rag/usMath.ts` and rendered nowhere** (a repo-wide grep across `app`, `components`, `lib` returns nothing). And at least one prospective state's registry entry — Texas — is `derivativeUse: "permission-required"`, `rawCorpusAllowed: false`.

Fix: render the attribution; add a prose gate; either rewrite the short tail or drop the paraphrase claim. **Get a lawyer's read before a second state's label goes on any standards prose** — I am not one, and this is the kind of thing that is cheap now and expensive later.

---

## Decisions only you can make

1. **Is Texas on the roadmap?** If yes, the pivot decision moves from "instrument and wait" to "build now," and the plan's shape changes.
2. **Cross-state mastery portability** — should a student moving CA → AR keep their mastery history? This plan defers it deliberately. Saying "yes" makes `canonicalTopicId` a real key and adds the one irreversible migration.
3. **Who owns curation?** The plan is bounded by curated rows per day, and it needs a *named* owner per state on the launch record. Without that, G2 and G8 are decoration.
4. **Is a CCSS-shaped internal pivot acceptable in states that politically rejected Common Core?** It is internal, never student-visible under this plan — but confirm before P3, not after.
5. **Arkansas 6–12: course-model it, or withdraw it?** As modelled today it is unrepairable, and its 35 chapter topics carry fictional codes.
