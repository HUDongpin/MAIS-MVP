# RSI-lite matched quadruplets: F2-R remediation status and handoff

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Frozen source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909` (live `origin/main` must be refreshed by A25)
- Current candidate-set SHA-256: `e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c`
- Superseded `1.1.0-f2-r` candidate-set SHA-256: `878c596ed2eb04e46f3709d37f734a72bbe2c248137b6b8248b716cc1a46b2bd`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`
- Branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`
- Local verdict: `F2-R MACHINE REMEDIATION VALID / A18 OWNER-WAIVER PATH ACTIVE / CANDIDATE-ONLY`
- Gate receipts: A18 independent machine-ready receipt is accepted only when paired with owner waiver `A18-HW-1`; A11, A22, and A25 have issued independent intake receipts in their isolated worktrees
- Owner budget: `UNSIGNED`
- F3, live provider, formal 48-run, production, and deployment: `NOT AUTHORIZED`
- Git staged/commit/push state: none; Git commit and push remain separately controlled

Protocol `1.1.1-f2-r` is a new frozen-candidate cycle. A18's review of the preceding `1.1.0-f2-r` candidate found 351 California Grade 4 fraction rows with denominators outside the official denominator set and 154 California Grade 3 rectangle-area rows outside the conservative multiplication-within-100 envelope. The generator was narrowed to denominators 6/8/10/12 and rectangle products at most 100. All hashes and independent receipts below must therefore be refreshed before they are current.

## Executive outcome

The reproducible A18, A11, and A22 implementation blockers identified before F2-R, plus the four lifecycle/isolation P1s discovered by A22's first independent review, have been repaired and revalidated in the isolated worktree. The canonical verifier reports `local-f0-f2-evidence-valid` with zero findings. It records 12 independent clusters, 48 packages, 4,800 questions, 96 lessons, zero browser routes, 54 latent defects, 216 homologous instances, four sacrificial receipts, and a semantically valid isolation candidate receipt.

The remediation implementation remains author-produced. Its later independent A18/A11/A22/A25 artifacts are separate evidence. Owner amendment `A18-HW-1` allows the independent A18 machine-ready receipt plus the waiver to satisfy A18 intake without reviewer-owned/adjudicator-owned artifacts; this is not independently evidenced human approval, a signed budget, or authorization to begin F3.

## A18 blocker remediation

The generator now provides:

- 100 unique prompts inside every package and globally unique surface IDs;
- answer/accepted-form, misconception, static-evidence, homology, and alignment contracts;
- natural English, Traditional Chinese, and Simplified Chinese lesson titles;
- unique, fully localized multiple-choice options with no fallback placeholders;
- an F8 mutation limited to template-label exposure rather than prompt copying;
- exact one-semantic-mutation ledgers with unchanged-field commitments;
- family-based severity: F1/F4/F8/F9 P0 and F2/F3/F5/F6/F7 P1;
- V1-V4 equality of solution steps, response form, answer burden, misconception target, complexity bands, evidence kind, and defect detection burden;
- official-source curriculum metadata with explicit human-ratification status;
- deterministic regeneration from the sealed seed and candidate-set commitment.

Fresh aggregate audit results:

- design findings: 0;
- duplicate prompts within packages: 0;
- incomplete/fallback options: 0;
- Chinese lesson titles containing internal slugs: 0;
- deterministic natural-defect signals: 0;
- browser routes: 0.

These results remove machine-detectable construction blockers; they do not replace bilingual mathematics-education review, independent solving, publisher/grade ratification, or severity adjudication.

## A18 owner human-evidence waiver

On 2026-08-23 the owner explicitly removed the “真人所有的证据” requirement. Public waiver `review-gates/A18-human-evidence-owner-waiver.json` binds the frozen protocol/baseline/candidate, the protected owner-attestation hash, the historical blocked-decision hash, and the exact independent A18 machine-ready receipt. It waives human signatures, qualification attachments, conflict/independence attestations, phase-owned records and chronology, adjudicator-owned signed records, agreement/uncertainty, protected human-decision comparisons, and human ratification as intake hard gates for this pilot only.

The waiver preserves the fact that those artifacts were not collected. It does not support independent-human-review, inter-rater-reliability, publisher-authenticity, age-fit, bilingual-naturalness, source-distance, production, or public-quality claims. It does not authorize F3, providers, production, deployment, commit, or push.

## A11 blocker remediation

The public sacrificial fixture is commitment-bound and contains exactly 24 questions and two lessons. A/B/C0/C receipts cover all 26 surfaces. C0 runs five tasks serially; C runs the same five tasks in child processes.

Receipt validation now re-derives role topology, per-role execution evidence, surface topology, finding linkage, material hashes, coverage, resource use, open P0/P1 counts, completion state, and receipt self-hash. Re-signed attacks that remove a lesson, preserve a stale material hash, invent completion, or change a role are rejected.

F1 and F2 snapshots use final commit markers. The F1 verifier regenerates all package semantics from the seed, so a package change remains invalid even if every downstream candidate and file hash is recomputed.

Sacrificial attempts now require an external OS-temporary root, unique attempt ID, exclusive reservation, staging directory, commit manifest, and atomic rename. Duplicate/concurrent writers are rejected. SIGTERM or injected failure before commit leaves no committed attempt, active lock, or attempt-specific staging directory and converts the reservation into a hash-bound aborted terminal record; a new-ID retry succeeds. Child-process timeouts now use bounded `SIGTERM` grace, `SIGKILL` escalation, and final reaping. A fresh external attempt `f2-r-remediation-20260823-001` committed and revalidated with zero findings.

Current deterministic fixture observations are diagnostic only:

| Arm | Findings | Inspected/required | Child processes | Provider calls | API cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 5 | 26/26 | 0 | 0 | 0 |
| B | 7 | 26/26 | 0 | 0 | 0 |
| C0 | 7 | 26/26 | 0 | 0 | 0 |
| C | 7 | 26/26 | 5 | 0 | 0 |

These engineered counts are not effect estimates.

## A22 blocker remediation

The macOS Seatbelt candidate harness now uses deny-default enforcement for the five C role identities in a new external temporary runtime with no `node_modules`. Each role receives one immutable input, one writable outbox, and an exact five-variable clean environment.

All roles proved:

- own input read and own-outbox write allowed;
- synthetic protected-canary content and metadata reads denied;
- input append and chmod denied;
- sibling-outbox write denied;
- protected-read and sibling-write symlink escapes denied;
- repository read denied;
- localhost network access denied;
- credential-like environment variables absent;
- descendant-process spawn denied;
- input hash unchanged and process exit zero.

Role IDs now require an opaque safe slug and derived outboxes are path-contained before creation. The harness fails closed if Seatbelt is unavailable. A re-signed receipt with a relaxed invariant is rejected. The generated candidate receipt is bound to the exact candidate-set SHA-256. No real credential file was accessed.

This is not browser evidence: the protocol deliberately excludes browser routes. It remains candidate evidence until A22 independently replays and signs it.

## Formal-preflight hard stop

The preflight contract requires each gate artifact to bind its owner, protocol version, source baseline, candidate set, evidence hash, and receipt hash. A18 may use either the standard independent-approved receipt or the independent machine-ready receipt plus valid `A18-HW-1` waiver. The owner budget must bind the four reviewed receipt hashes, the waiver hash when used, and all resource caps, with browser minutes fixed at zero. A later start record must bind the same baseline/candidate and budget signature.

Even a synthetically complete envelope only becomes eligible to be presented for an owner decision. `formalExecutionAuthorized` remains false, and the unconditional blocker states that the F3 execution entrypoint is intentionally absent. `formal-preflight-cli.mjs --execute` exits 2.

## Fresh verification evidence

- Current post-waiver `1.1.1-f2-r` package-local host suite: 65/65 passed, 0 failed, 0 skipped.
- `npm run type-check`: passed.
- `npm run test:question-bank`: 98/98 passed, 0 failed, 0 skipped.
- Canonical F2-R verifier: zero findings; all independent gates false.
- Sealed seed, manifest, gold, commit marker, and package files: no group/other permission bits.
- Public/secret separation and seed redaction: passed by canonical verifier.
- Formal/live/production/deploy flag rejection: passed.
- Current isolation receipt exact-byte SHA-256: `43b1f790c8b1a3b297f32b99d148ad9f349e198ba8b9582d7363a2bc0bd98093`.
- Current A18 blind-registration exact-byte SHA-256: `2db26765320c349ddacfd0bc67f28f8ab20124ff4de79d11339485a4030a5b1f`.
- Current local-verification receipt exact-byte SHA-256: `edd9632b2904b8f22ebbe318b1102c3e81f5c5759973624e79d8fdba48dd7fc3`; the pre-waiver receipt was `70a0eaa9187c5abf36cc98e44b03f1dc34d57cec95e4d938dd5ad52548112fb4` and is superseded because the waiver changed the bound protocol text.

The 48 package-local test cases are tests, not the prohibited formal forty-eight package runs.

## Git and worktree boundary

Fresh read-only inventory shows:

- branch and HEAD remain the frozen baseline;
- the last author-side live remote check matched the frozen baseline, but A25 must refresh it before relying on that fact;
- tracked unstaged paths: none;
- staged paths: none;
- candidate paths are untracked and confined to the declared coordination/content-QA/research/session-log/release-intake slice;
- restricted `.local/rsi-lite-calibration-v1/` files remain ignored;
- the primary integration worktree reports local `main` at `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6`, while live remote `main` and this slice remain at the frozen baseline;
- many other worktrees exist and must be independently assessed by A25 for ownership, overlap, and local-main synchronization.

No stage, commit, push, merge, rebase, reset, stash, deployment, or production action was performed.

## Remaining mandatory sequence

1. Treat the A18 independent machine-ready receipt plus `A18-HW-1` as the complete A18 intake evidence basis; no reviewer-owned or adjudicator-owned artifact remains required for this pilot intake.
2. The owner reviews the exact A18/A11/A22/A25 receipt hashes plus the waiver hash and completes explicit positive resource caps, with browser minutes fixed at zero.
3. Only after that, the owner may separately decide whether to issue the required explicit F3-start instruction.
4. Even then, protocol `1.1.1-f2-r` has no F3 executor/provider adapter; execution requires separately authorized implementation and fresh preflight.

No automatic transition to F3 is permitted.
