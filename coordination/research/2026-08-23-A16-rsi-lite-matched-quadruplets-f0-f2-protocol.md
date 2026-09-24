# RSI-lite matched quadruplets: frozen F2-R protocol

- Protocol ID: `MAIS-RSI-LITE-CAL-V1`
- Protocol version: `1.1.1-f2-r`
- Protocol owner: A16
- Authorization: F2-R remediation only, received 2026-08-23 Asia/Hong_Kong
- Source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Estimand scope: `content-surfaces-only`
- Verdict ceiling: `candidate-only`
- Formal 48-run status: `NOT AUTHORIZED`
- Owner amendment: `MAIS-RSI-LITE-CAL-V1-A18-HW-1`, effective 2026-08-23 Asia/Hong_Kong
- Human-owned evidence as an A18/F3-intake hard gate: `WAIVED FOR THIS FEASIBILITY/CALIBRATION PILOT`

Version `1.1.1-f2-r` supersedes `1.1.0-f2-r` before F3 because A18 independent review found two California curriculum-envelope P1 construction families. Grade 4 fraction candidates now use only denominators 6, 8, 10, and 12, all inside the official 4.NF denominator set. Grade 3 rectangle-area products are capped at 100. The full candidate set, blind-review registration, and every independent receipt must be regenerated and rebound; `1.1.0-f2-r` receipts are historical evidence only.
Amendment `A18-HW-1` does not modify any question, lesson, package, randomization, arm, denominator, source baseline, or candidate-set commitment. It changes only the F3-intake evidence policy: a valid owner waiver may pair with the existing independent A18 machine-ready receipt instead of requiring reviewer-owned or adjudicator-owned signatures, qualification files, conflict declarations, phase records, adjudication records, agreement statistics, or protected human-decision comparisons. The waiver is additive and hash-bound, so the base A18 receipt and the earlier blocked record remain unchanged historical evidence. Existing A11/A22/A25 receipts remain bound to the same protocol version, baseline, and candidate set.

- Live provider, production, and deployment: `NOT AUTHORIZED`
- Git commit and push: separately controlled and currently not authorized

## 1. Purpose and boundary

This protocol constructs and checks the measurement system for a possible later four-arm comparison of MAIS mathematics content-QA workflows. F2-R repairs machine-detectable bundle, runner, receipt-lifecycle, and isolation blockers. It may establish local feasibility of those mechanisms. It cannot establish an arm effect, causal multi-agent benefit, live-model quality, formal-run readiness, release readiness, or production safety.

There is no formal package executor, provider adapter, or 48-run loop in this protocol version. The browser estimand has been removed because these candidate packages contain questions, lessons, answer contracts, misconception maps, and static evidence labels, but no owned renderable route implementation. Browser-route count is therefore exactly zero; missing browser execution is an exclusion, not a passed browser check.

## 2. Independent units and frozen inventory

- Regions: California, Hong Kong, and Mainland China.
- Latent bundles: four per region, twelve independent matched clusters in total.
- Isomorphic variants: four per latent bundle.
- Candidate packages: forty-eight.
- Questions: 100 per package, 4,800 in total.
- Lessons: two per package, 96 in total.
- Browser routes: zero.
- Defect-bearing latent bundles: three per region, nine total.
- Clean latent bundles: one per region, three total.
- Latent defects: six per defect-bearing bundle, 54 total.
- Homologous defect instances: 216 repeated observations, not 216 independent defects.

The twelve latent bundles—not the forty-eight packages and not the 216 repeated instances—are the future independent units.

## 3. Frozen latent strata and curriculum anchors

Every region contains the same four knowledge-component structures:

1. `L1-number-operations`: whole-number addition.
2. `L2-fraction-operations`: like-denominator fraction addition and reduction.
3. `L3-rectangle-area`: rectangle area from two side lengths.
4. `L4-linear-function-evaluation`: evaluate a linear rule at a stated input.

Matching preserves knowledge component, reasoning-step count, response form, numeric-complexity band, language-complexity band, misconception map, and static evidence burden. It is structural matching, not verbatim cross-curriculum matching.

Candidate alignment metadata is anchored to primary official sources:

- California Department of Education standards: `2.NBT.5`, `4.NF.3`, `3.MD.7`, and `8.F.1` in the [California mathematics standards](https://www2.cde.ca.gov/cacs/math).
- Hong Kong Education Bureau learning units: `1N4`, `4N6`, `4M2`, and junior-secondary `LU7.4` (the preliminary idea of functions through input-processing-output), using the [Mathematics Curriculum documents](https://www.edb.gov.hk/en/curriculum-development/kla/ma/curr/index2.html) and [Junior Secondary explanatory notes](https://www.edb.gov.hk/attachment/en/curriculum-development/kla/ma/curr/EN_KS3_e.pdf).
- Mainland curriculum-stage anchors use the Ministry of Education's [义务教育数学课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582346895190.pdf). Delivery-context metadata references the [2024 national teaching-material catalog](https://www.moe.gov.cn/srcsite/A26/s8001/202408/W020240805496325238752.pdf).

The Mainland delivery-context allocation is two PEP bundles, one BNU bundle, and one HJB bundle. It is candidate metadata only: machine validation confirms internal consistency, while independent A18 reviewers must ratify actual grade, curriculum, publisher, language, and age fit. The generator records `humanRatificationRequired: true` and must not convert metadata consistency into an alignment approval.

Under amendment `A18-HW-1`, the existing `humanRatificationRequired: true` candidate field is preserved to avoid candidate/hash mutation, but its missing human-owned artifact is advisory rather than a hard F3-intake blocker. This waiver does not convert machine consistency into independently evidenced curriculum or publisher approval; those claims remain outside the pilot's scientific claim ceiling.

## 4. Defect families and severity

The nine sealed defect families are:

- `F1` P0: stored answer differs from an independently derived answer.
- `F2` P1: multiple-choice values become numerically equivalent or multiply correct.
- `F3` P1: a worked explanation contains an incorrect arithmetic step.
- `F4` P0: the independently correct answer is falsely rejected by accepted-answer logic.
- `F5` P1: a static evidence label differs from its declared expected label.
- `F6` P1: numeric semantics differ across English, Traditional Chinese, and Simplified Chinese.
- `F7` P1: grade, standard, or delivery-context alignment fields drift from the frozen candidate contract.
- `F8` P0: an internal template label is exposed.
- `F9` P0: the purported independent oracle records contaminated provenance.

Severity is family-based and is never changed to satisfy a per-bundle quota. A18 must independently ratify these provisional severities.

Within each region, the three defect-bearing bundles receive a concealed permutation of:

- `D1`: F1-F6.
- `D2`: F1, F2, F3, F7, F8, F9.
- `D3`: F4-F9.

Each family occurs twice per region and six times globally.

## 5. One-mutation and isomorphism contracts

Every latent defect instance records exactly one declared semantic mutation group, the changed paths, before/after surface hashes, and matching commitments for all unmodified fields. A mutation is invalid if any undeclared field changes.

For every latent item, V1-V4 must preserve:

- curriculum skill and knowledge component;
- reasoning-step count and solution operator;
- item type and response representation;
- answer-normalization burden;
- misconception map;
- numeric- and language-complexity bands;
- static evidence-surface kind;
- latent defect family, severity, changed-field group, and detection burden.

Numbers, names, option order, and opaque identifiers may vary. Prompt copying, English slugs in Chinese lesson titles, generic fallback distractors, and cross-variant changes in solution burden are invalid natural defects.

## 6. Randomization, concealment, and deterministic regeneration

Each region uses a 4-by-4 Latin square over V1-V4, followed by seed-derived permutation of bundle rows, arm columns, and variant labels. This balances each variant once per arm in each region. Clean-bundle selection and D1-D3 assignment are also seed-derived and concealed.

The seed remains in the ignored restricted store with mode `0600`; public artifacts contain only its SHA-256 commitment. Package, mapping, and gold artifacts remain sealed. Public and sealed manifests share a candidate-set SHA-256 commitment over the exact forty-eight opaque package IDs and content hashes.

The verifier does not trust re-signed manifests. It regenerates the full design from the restricted seed plus frozen source baseline and compares exact public manifest, sealed manifest, gold ledger, package filenames, and package semantics. A modified package remains invalid even if an attacker recomputes every downstream candidate and file hash.

F1 files are atomically renamed into place. A sealed snapshot marker binds all fifty sealed manifest/gold/package files; a public marker is published last and binds the public files plus the sealed marker. Missing markers, unsafe paths, duplicates, extra files, or hash drift make the snapshot incomplete.

## 7. Frozen sacrificial arm contracts

- A: deterministic baseline plus mandatory-surface inventory.
- B: A plus one same-reviewer critique and one normalization/revision pass; no heterogeneous verifier.
- C0: five role tasks run serially with shared controller state.
- C: the same five role tasks run in separate child processes; the controller is the only receipt writer.

C0 and C use the same answer-blind solver, tool verifier, adversarial grader, bilingual/curriculum critic, and evidence verifier tasks. Only topology changes.

The public sacrificial fixture is pinned by a literal SHA-256 commitment and contains 24 questions, two lessons, and zero routes. Every receipt must enumerate all 26 surfaces, link findings to surface dispositions, derive coverage and open P0/P1 counts, record observed role executions, and pass a semantic validator that recomputes all material hashes. Changing the fixture, dropping a lesson, inventing completion, changing role topology, or re-signing altered results remains invalid.

## 8. Attempt lifecycle and interruption safety

The sacrificial CLI requires an explicit attempt ID and an external output root under the operating-system temporary directory. It refuses source-tree output and the legacy fixed-output option.

Each attempt uses:

- an exclusive reservation lock to reject duplicate/concurrent writers;
- a unique staging directory;
- a manifest binding bundle, four receipts, summary, and runtime observation;
- atomic directory rename as the commit point;
- no overwrite of an existing attempt ID.

Termination before the commit rename leaves no committed attempt, no active reservation lock, and no attempt-specific staging directory. The active reservation is atomically converted to a hash-bound `.aborted.json` terminal record. A successful attempt similarly receives a `.committed.json` terminal record. Terminal IDs cannot be reused; a retry must use a new attempt ID. The public candidate snapshot also uses atomic file publication and a final snapshot marker.

Every child is launched as its own process group. Timeout handling sends `SIGTERM`, waits a bounded grace period, escalates to `SIGKILL` for a non-cooperative process, and awaits/reaps the child before returning or removing the execution root.

## 9. A22 deny-default isolation proof

The F2-R isolation harness uses macOS Seatbelt with `(deny default)` and the system policy import. It creates an external temporary runtime without `node_modules`, sanitizes each role environment to exactly `LANG`, `LC_ALL`, `MAIS_ROLE_ID`, `NO_PROXY`, and `TMPDIR`, and grants each role only:

- read access to its one immutable input;
- execution/read access to the minimal copied worker runtime;
- write access to its own outbox.

Role IDs must match a strict opaque-slug grammar before any derived path is created, and each derived outbox is checked to remain inside its assigned root. The profile permits the initial copied worker execution but denies process fork; every role actively verifies that a descendant Node process cannot be created. The five-role matrix also verifies that a role cannot read the content or metadata of a synthetic protected credential canary, write or chmod its input, write a sibling outbox, read the repository, use the network, or inherit credential-like environment variables. It attempts protected-read and sibling-write escapes through symlinks created inside the allowed outbox; both must be denied. Input hashes must remain unchanged. If Seatbelt is unavailable, the harness fails closed. No real credentials are accessed: the canary is synthetic.

This is candidate enforcement evidence for independent A22 review. It is not an A22-owned approval and is not a browser proof; browser scope is excluded from this protocol.

## 10. Resource and authorization accounting

F2-R records provider calls, tokens, API cost, browser launches, child processes, deterministic passes, and observed local orchestration time. Current F2 evidence requires zero provider calls, zero tokens, zero API cost, and zero browser launches. Local elapsed time is not live-provider latency.

All generation, sacrificial, isolation, and formal-preflight CLIs reject formal, live-provider, production, or deployment requests where applicable. The formal-preflight module only validates whether a future envelope could be presented for an owner decision. It always returns `formalExecutionAuthorized: false` and has no execution entrypoint.

## 11. Owner-waived human-evidence path and future estimands

The preferred high-evidence design remains two qualified bilingual mathematics-education reviewers judging independently, with a third adjudicator, preserved blinding, fixed phase chronology, signed decisions, adjudication, and agreement estimation. Those artifacts would be required before claiming independently evidenced human review, inter-rater reliability, adjudicator reliability, publisher authenticity, age fit, bilingual naturalness, or protected-corpus source distance.

For this feasibility/calibration pilot only, owner amendment `A18-HW-1` removes those human-owned artifacts as hard A18/F3-intake requirements. The owner reports that three named participants reviewed and approved; their identities remain in a restricted `0600` owner-attestation artifact. The public waiver records the owner's instruction and binds the protected attestation by SHA-256 without publishing names. It explicitly records that human signatures, independently verified qualifications/independence, reviewer-owned phase records, adjudicator-owned decisions, agreement statistics, and protected human-decision comparisons were not collected.

The A18 intake gate may therefore be satisfied by both: (a) the independent A18 machine receipt bound to the frozen candidate and reporting zero natural-construction P0/P1 findings, and (b) the valid owner waiver bound to that exact A18 receipt. This acceptance basis is `owner-attested-human-review-without-human-owned-artifacts`; it must never be described as independently evidenced human approval or as a human-review reliability result.

If a later protocol is independently approved, intended comparisons remain `C-A`, `C-C0`, and exploratory `B-A`. The independent denominator remains twelve matched clusters. No F2-R result estimates these contrasts. The waiver permits intake mechanics; it does not repair the missing human-gold estimands.

## 12. F2-R exit evidence and remaining gates

Machine-remediation evidence requires:

- 12/48 balance and deterministic candidate regeneration;
- 4,800 unique question prompts, 96 natural-language lesson titles, and zero browser routes;
- exact family incidence, severity, one-mutation, and V1-V4 homology checks;
- clean-package audit with zero deterministic natural-defect signals;
- semantically validated A/B/C0/C receipts over all 26 sacrificial surfaces;
- duplicate writer, tamper, missing-surface, concurrent-writer, interruption, retry, and commit-marker tests;
- a real five-role deny-default isolation matrix with fail-closed behavior;
- a canonical local verification receipt that keeps every independent gate false.

F3 remains blocked until A18 is accepted either through a standard independent approved receipt or through the independent machine-ready receipt plus valid `A18-HW-1` owner waiver; A11, A22, and A25 each provide their required independent receipt; the owner reviews all four receipt hashes plus the waiver hash when used and signs explicit resource caps; and the owner later issues a separate, unambiguous F3-start instruction. Passing this F2-R implementation or the waiver alone does not authorize F3.

## 13. Stop conditions

Stop on hidden-ledger access, arm crossover, package or source-baseline drift, evaluator/denominator mutation, solver gaps treated as passes, missing commit markers, duplicate writers, source/main/shared-worktree writes, secret/private/copyright exposure, credential inheritance, network access in isolated roles, open-P0/P1 completion, irreproducible receipts, unapproved spend, or claims beyond candidate-only scope.

Absence of reviewer-owned/adjudicator-owned signatures, qualification attachments, conflict declarations, phase records, adjudication records, agreement statistics, or protected human-decision comparisons is no longer itself a stop condition for this pilot's F3 intake when—and only when—the exact `A18-HW-1` waiver validates against the independent machine-ready A18 receipt. It remains a mandatory disclosure and continues to block any claim of independently evidenced human review or human-review reliability.

An infrastructure defect found after future formal randomization would require stopping and issuing a new protocol version; pre- and post-fix evidence must never be mixed.

## 14. Authorization boundary

The owner authorized F2-R remediation and amendment `A18-HW-1` only. F3, live provider use, formal forty-eight-run execution, deployment, and production remain `NOT AUTHORIZED`. Git commit and push require a separate explicit instruction. No automatic transition is permitted.
