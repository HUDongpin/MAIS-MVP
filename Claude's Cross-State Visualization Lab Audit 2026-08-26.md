# Are the other states' visualization labs as good as California's?

**Date:** 2026-08-26
**Author:** Claude (Opus 5)
**Audited tree:** `origin/main` @ `7f7c485987` ("Merge pull request #143 from HUDongpin/claude/ca-codex-viz-replacement") — the post-CA-migration state
**Method:** direct enumeration of the live catalog under `tsx`, plus a 13-agent audit (6 investigators, 6 adversarial verifiers, 1 completeness critic). 70 of the investigators' claims were refuted or corrected before reaching this report; every number below survived that pass or was re-derived here.

---

## The short answer

**No — and not by a small margin.** But the framing "other states need to catch up with California" is the wrong model, and acting on it would waste effort.

The accurate version is: **California is a pilot of a second-generation visualization system. Every other track in the product — Arkansas, Florida, North Carolina, and also Hong Kong and Mainland China — is still on the first-generation renderer.** The template renderer is not a "non-CA" fallback; it is **89.0% of the entire catalog (613 of 689 labs)** and it serves the tracks that have actual live self-service registration.

So the real question is not "why is Arkansas behind California" but "when does the second-generation system leave the California pilot" — and Arkansas is not necessarily first in line.

---

## Scoreboard

| | California | Arkansas | Florida | North Carolina |
|---|---:|---:|---:|---:|
| Topics | 76 | 209 | 15 | **0** |
| Labs | 76 | 209 | 15 | **0** |
| On the signature-bench renderer | **76 (100%)** | 0 | 0 | — |
| On the template renderer | 0 | **209 (100%)** | **15 (100%)** | — |
| Distinct interactive models behind those labs | 53 benches in-lesson / 188 on the hub | **31** | ~8 | — |
| Lessons | 76 | 15 | 15 | 0 |
| Lessons embedding a visualization | **76 / 76 (100%)** | **0 / 15** | **0 / 15** | — |
| Topics with no lesson at all | 0 | **194 of 209** | 0 | — |
| CCSS interactive lesson bodies | **286 blocks** | 0 | 0 | 0 |
| Labs with a safeguard content review | 76, but **1 distinct summary** (heuristic template) | 0 | 0 | — |
| Labs with a student "read me first" note | 76 — but **no component renders it** | 0 | 0 | — |
| Labs carrying structured standards ids | **76 (100%)** | **0** | **0** | — |
| Per-lab machine proof of the mathematics | **192 audits, 192/192 pass** | **0** | **0** | — |
| State-specific audit scripts in `scripts/` | **20** | **0** | **0** | 0 |
| `aria-*` attributes in the renderer | **1,834** | 10 | 10 | — |
| `role=` attributes | **804** | 3 | 3 | — |
| Files honouring `prefers-reduced-motion` | **192 / 192** | **0** | **0** | — |
| Practice questions per lab | 36.9 | 14.4 | 5.0 | — |

For context, the tracks that are *not* US states sit alongside Arkansas, not alongside California: Hong Kong 54 labs and Mainland China 335 labs are all on the template renderer, with 0 safeguard reviews and 0 signature benches between them. Hong Kong is the only track other than California with lesson-embedded visualizations (29 of 49).

---

## 1. What California actually has

Seven distinct assets, **all of them California-only**:

1. **192 signature benches** (`components/visualizations/signature/*.jsx`) — light paper canvas, staged `STEPS` that unlock one capability at a time, predict-then-check gating, and an exact-arithmetic `CALIBRATED` capstone. Reached through 53 primaries in lessons and 188 benches on the hub.
2. **192 machine proofs**, one per bench. I re-ran the whole gate independently: **192 pass, 0 fail.** 116 of them slice the shipped `.jsx`, `eval` the model out of it, and re-derive every quiz key — so the proof cannot drift from the file that ships.
3. **270 CCSS interactive lesson bodies** (`components/lesson/ccss/`) — 27,169 lines, all using `<Figure>` and `MathCheck`, 127 with inline SVG, curated onto topics with the same primary/related/rationale contract the benches use. **286 live blocks, 100% California, 0 for every other track.** This is a larger interactive-visual asset than the bench library and it has its own green CI gate.
4. **Structured standards metadata** — `californiaAlignment` with `standardIds`, `domainId`, `clusterId`. Present on 76/76 CA labs, `undefined` on all 613 others.
5. **Safeguard content review** — an 8-dimension review record on 76/76 CA labs, 0 everywhere else. **Corrected 2026-08-26: this is weaker than it looks.** All 76 share exactly *one* distinct summary string, which self-identifies as *"Heuristic review found this California math canvas bench…"*; there are 2 distinct bodies across 76 labs. It is a template applied 76 times, not 76 human reviews. Related inversion: `labAllowsExternalDistribution` returns `true` when a lab has **no** safeguard and otherwise demands `status === "approved"` — all 76 CA labs are `"reviewed"/"concerns"`, so **California's labs are blocked from external sharing precisely because they carry a review, while all 613 unreviewed labs are allowed.**
6. **20 `audit-us-ca-*` scripts**, four of which are figure-quality gates. There are **zero** Arkansas or Florida audit scripts.
7. **A curriculum depth ratchet** — 329 of 385 CCSS-M standards reachable (85%), tracked in `signature/COVERAGE.md`.

**Correction (2026-08-26).** Two further CA assets are weaker than first reported. The student "read me first" note is defined at `data/visualizationLabs.ts:129` and populated at `:2607`, but **no component reads it** — PR #143 made that copy truthful for a surface with zero renderers. And the safeguard review is the heuristic template described above. Neither changes the direction of the verdict; both narrow the margin.

**Two honest qualifiers.** First, **187 of the 192 benches were ported byte-for-byte from an external library; only 5 are MAIS-authored.** The audits came with them. California's advantage is largely an *integration* achievement, not 192 units of in-house authorship — which is good news, because integration generalizes. Second, **almost none of that apparatus runs in CI.** Only 5 of the 32 audit scripts are wired to npm, none of the 20 CA-specific ones appear in `.github/workflows/ci.yml`, and CI runs exactly **one** visualization browser spec — `visualization-contract.spec.ts`, which is Hong Kong and Capstone only.

---

## 2. Where the other states are genuinely ahead

Reporting this fairly matters, because two of these are regressions California introduced.

- **Interaction telemetry — California is analytically dark.** `ConfiguredVisualizationLab` fires `visualization-slider` on every slider commit, `visualization-probe` on point entry, and `visualization-reset`. **Zero of the 192 signature benches emit anything**, despite 171 of them containing `<input type="range">`. Since engagement is scored as `min(25, (visualizationEvents + hintRequests + answers) * 2)`, **an Arkansas student working a template lab generates measurable engagement while a California student working a bench generates almost none.** Worse, `VisualizationCard` — the component that fires `visualization-complete` and POSTs to `/api/visualization-sessions` — is not used by the lesson path at all, so no lesson-embedded lab on any track records a session. California is the only track whose labs are lesson-embedded.
- **3D.** Arkansas keeps 6 premium-3D labs and Florida 1, on the Three.js runtime California was deliberately descoped from. Whether those scenes are mathematically sound is **unresolved** — the two agents who looked disagreed, and nobody rendered one. What is certain: that directory carries **45 failing tests** and is excluded from the component gate behind a rationale comment that is now stale.
- **Browser exercise.** `visualization-overlap.spec.ts` sweeps the full guest catalog in three languages, driving every slider on all 689 labs — so Arkansas and Florida get *more* real browser exercise than California, whose canvas benches emit none of the SVG text nodes the collision assertion looks for. But that sweep is a ~60-minute manual job, not a gate.
- **Practice depth.** Arkansas is mid-table, not empty: 14.4 questions per lab, above Hong Kong (5.8) and Florida (5.0), at 39% of California's 36.9.
- **Question diagrams.** On the highest-volume visual surface in the product — diagrams inside practice questions — everyone is close to nothing (27 diagrams in 24,566 questions), and **Hong Kong beats California** (5.9% vs 0.4%). Arkansas, Florida and all Mainland tracks have zero.

---

## 3. Defects a user could hit today

These are live on `origin/main`, not hypotheticals. Note that **guests see the entire 689-lab catalog** (`VisualizationLabPage.tsx:1877` returns `true` when there is no user, behind a *dismissible* prompt), and the premium-3D direct routes have **no auth check and no curriculum check at all**. So "Arkansas isn't launched yet" does not mean these are unreachable.

| # | Defect | Scope | Severity |
|---|---|---|---|
| 1 | **North Carolina is a trapdoor.** A valid, API-selectable track with zero content; the learner lands on a bare "No labs match this account curriculum and grade yet." | NC | High |
| 2 | **26 Arkansas lab titles are missing their first word** — a regex strips the leading token: *"Arkansas AR.Math.G8.F: And Rate Of Change Visual Lab"* | AR (26 of 209) | High |
| 3 | **All 15 Arkansas worked examples are the same school-garden unit-rate problem** in two number variants — including on the Pythagorean, transformations, statistics and bivariate-data chapters. The auto-illustrator faithfully infers from that text, so **all 15 render a ratio-and-percent bar**. Florida recycles a mean-of-samples problem across three chapters. | AR, FL | High |
| 4 | **Lab card copy is ungrammatical**: *"explore arkansas k.car.1: represent add subtract with sliders, diagrams, and live feedback."* | AR, FL | Medium |
| 5 | **Teacher "Sync visual" is broken.** It pushes the class to `${lessonHref}#visualization`, an anchor that does not exist on AR/FL lessons — because those lessons have no visualization section. | AR, FL | Medium |
| 6 | **Premium-3D direct routes show a raw slug title** and the wrong curriculum badge, publicly, with no auth. | AR (6), FL (1) | Medium |
| 7 | **Arkansas question banks are effectively unverified.** The item-quality gate re-solves 100% of California's 1,500-item bank; for Arkansas it re-solves **0 of 1,500** (K–G5) and **227 of 1,500** (G6–G12). All 8 findings it produces are Arkansas, and all are graded P2 so CI stays green. | AR | Medium |
| 8 | **Florida's standards are a fiction.** Its `standardIds` are CCSS domain letters wearing an `FL.BEST.Math.` prefix. | FL | Medium |
| 9 | **California's own residual drift.** CA labs still carry a legacy `templateId` and a template-derived description — *"a focused number line model… with sliders"* — while a signature bench renders. PR #143 fixed the student note but not this. | CA | Low |
| 10 | **7 registered lesson visualization modules are dead code** (3,743 lines), and two of the six analytics verbs can never fire because only those dead modules emit them. | All | Low |

---

## 4. Why the gap exists

One structural cause, stated by the repo itself at [scripts/build-signature-lab-candidates.ts:19](scripts/build-signature-lab-candidates.ts:19):

> *"Only California labs join automatically: they are the sole US track carrying CCSS standard ids. Arkansas uses Arkansas codes (K.CAR.1) and Florida is chapter-level, so neither has a join key and both keep the template renderer."*

The bench library is tagged by CCSS. Without a CCSS identifier on a topic, no bench can be assigned, and everything downstream — the audit, the safeguard review, the student note, the lesson embed, the test coverage — is gated on having a bench. **The gap is one missing join, deliberately scoped, not 224 pieces of neglect.**

One correction worth recording: no `Topic` object carries a standards field, **not even California's**. The CA path regex-scrapes CCSS codes out of `topic.description`. The join key is softer than the documentation implies — which makes it easier to extend, not harder.

---

## 5. What closing the gap would actually cost

Much less than "build 209 labs" — and the audit found an enabling asset both the plan and `COVERAGE.md` overlooked.

**The bench system is already publisher-agnostic in code.** `LessonSignatureLab` and `componentForDirectoryLab` key purely off `getSignatureLabAssignment(topicId)`. The only California-specific artifacts are a **76-row data table** and **three `isCaliforniaTopic` guards** (`data/visualizationLabs.ts:2123`, `:2172`, `:2607`).

**Arkansas already ships a concept vocabulary.** Every Arkansas question in both generated packs carries `safeFocus` — **170 distinct concept slugs covering 174 of the 209 topics** (`counting-sequence`, `make-ten`, `decompose-within-ten`, `subitizing`, `skip-count-by-fives`…) — plus 229 distinct `conceptIds`. That is the same shape of vocabulary the bench library is organised around.

**So the unit of work for Arkansas is a curated ~170–209 row concept→bench assignment table with rationales — the same artifact California already maintains at 76 rows.** Not a standards crosswalk, which does not exist in this tree.

Two cautions. A naive token-match from `safeFocus` slugs to bench filenames produces `make-ten → PowersOfTenLab` and `compare-object-groups → CompareFunctionsLab`; **this table has to be hand-curated**, exactly as California's was. And Florida is a different, smaller problem: 15 topics whose first honest step is fixing the standards fiction, not authoring labs.

---

## 6. Recommended next steps

**Step 0 — Decide what Arkansas and Florida are for.** This gates everything else and only you can answer it. 194 of Arkansas's 209 topics have no lesson; Florida has 15 topics, no illustrations file, and zero test references anywhere. Neither can be chosen at registration. If these are dormant content packs, the right move is to *narrow the promise* — not to invest bench-authoring effort in them.

**Step 1 — Fix what is publicly reachable and wrong (days, small, do regardless of Step 0).** Because guests browse the full catalog, these are live defects, not pre-launch debt: North Carolina's dead end (#1), the 26 truncated Arkansas titles (#2), the ungrammatical card copy (#4), the raw-slug 3D pages (#6), and California's own stale description copy (#9). Independently, decide whether the guest catalog *should* expose unlaunched tracks at all — closing that would shrink the blast radius of everything else in one change.

**Step 2 — Fix the analytics inversion (small, high value, California-facing).** The benches emit no interaction telemetry and the lesson path records no sessions. Right now the migration that made California's labs better made California's *data* worse, and that will quietly distort every engagement comparison you run. Fix this before drawing conclusions from bench-usage numbers.

**Step 3 — Fix the Arkansas worked examples (#3) before touching the labs.** Fifteen lessons all teaching the same garden-edging unit-rate problem, illustrated with a ratio bar on the Pythagorean chapter, is a worse student experience than any lab-renderer gap — and it is 15 rows of content, not a system change.

**Step 4 — If Step 0 says Arkansas is real: pilot the concept→bench table on the 15 topics that have lessons.** Those are the only Arkansas topics with a lesson surface, so a bench pays off twice (hub + embed). Prove the curation workflow and the three-guard generalization at 15 rows before committing to 209. **Do not add the lesson visualization block before the bench lands** — that would ship the weaker renderer into the lesson flow, the exact thing PR #143 spent its effort undoing.

**Step 5 — Put a parity ratchet in CI.** Today nothing notices that safeguard review is 76/76 for California and 0 for 613 other labs. This repo's idiom is exactly right for it: record per-track parity counts (labs with a safeguard review, a student note, a bench) and fail when any track regresses. While you are there, note that CI currently runs one visualization spec covering only Hong Kong and Capstone, and that the 3D directory with 45 failing tests is excluded behind a stale comment.

**What I would not do:** author new benches for Arkansas or Florida. The 192-bench library already reaches 85% of CCSS-M; the constraint is the join, not the catalog. And do not regenerate the AR/FL question packs to add metadata — regeneration wipes hand repairs.

One practical constraint: `package.json` scripts are frozen by the CI governance gate, so any new tooling must run via `npx tsx scripts/…` rather than a new npm script.

---

## 7. Confidence and limits

**Dropped as unreliable:** the "millions of assertions" headline for the audit suite — the 192 audits print in at least five formats and two reasonable parsers disagree by 4×. Use the reproducible fact instead: **192 audits, 192 pass, 0 fail, one per bench.**

**Unresolved, flagged rather than asserted:**
- Whether the 6 Arkansas / 1 Florida 3D scenes compute sound mathematics. Two agents reached opposite conclusions and nobody rendered a page. The 45 failing tests in that directory are governance-pipeline tests, not scene geometry — reporting them as "the 3D scenes are broken" would overstate what was verified.
- A claimed responsive-collapse risk in 79 benches was refuted by its own verifier as inert. Treat as an unenforced style rule until someone reproduces it at 375px.
- Whether real users reach the AR/FL surfaces. The code does not support "unreachable"; production analytics would be needed to say more.

**Scope note:** this audit read the tree. It did not run the app, render a lab, or execute Playwright — the machine's boot disk is at 100% (118 MB free on `/`), which currently breaks writes to `/tmp` and will break builds. That is worth fixing independently of anything in this report.
