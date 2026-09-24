# A11 runner-receipt F2-R candidate packet

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Frozen source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Author: A16 remediation session, not the independent A11 reviewer
- Current status: `REMEDIATED CANDIDATE FOR SUPERSEDING INDEPENDENT A11 REVIEW`
- A11 receipt: historical initial receipt preserved; superseding receipt absent after A22 lifecycle findings
- F3 implication: `BLOCKED`

## Machine-remediated runner evidence

- The public fixture is pinned by a literal SHA-256 and contains exactly 24 questions, two lessons, and zero browser routes: 26 mandatory surfaces.
- A and B execute their declared deterministic/same-reviewer tasks.
- C0 executes the five declared roles serially with shared controller state.
- C executes the same five role tasks in distinct child processes; only topology differs from C0.
- Each role execution records role, task, boundary, exit code, finding IDs, inspected surfaces, lesson evidence, and a recomputed result hash.
- Each receipt contains exactly one result for every mandatory surface, with a permitted disposition and evidence hash.
- Coverage, material-result hash, finding linkage, open P0/P1 counts, completion state, and resource use are re-derived by the validator rather than trusted from receipt fields.
- A mutated fixture, removed lesson, stale material hash, false completion, role drift, missing/duplicate surface, altered resource accounting, or re-signed tampered receipt is rejected.
- Public F2 files are atomically published and bound by a final snapshot marker.
- External sacrificial attempts require a unique ID, exclusive reservation, staging directory, commit manifest, and atomic directory rename.
- Duplicate and concurrent writers are rejected. A SIGTERM/pre-commit interruption leaves no committed attempt, active lock, or attempt-specific staging directory; it leaves a hash-bound aborted terminal record, and retry requires a new ID.
- Bounded child execution now proves `SIGTERM` grace, `SIGKILL` escalation for a non-cooperative child, final exit/reaping, and no live child PID before return.
- F1 snapshot validation regenerates the entire candidate design from the sealed seed, so downstream hash re-signing cannot conceal semantic package drift.
- Formal-result validation rejects source/candidate/denominator drift, gold fields, missing/duplicated surfaces, and completion with open P0/P1 or incomplete surfaces.
- Generation and sacrificial CLIs reject formal, live-provider, production, and deployment flags. No formal executor exists.

## Current local commands for independent replay

```sh
node --test coordination/content-qa/rsi-lite-calibration-v1/*.test.mjs
node coordination/content-qa/rsi-lite-calibration-v1/generate-calibration-artifacts.mjs
node coordination/content-qa/rsi-lite-calibration-v1/verify-f0-f2-local.mjs
```

The sacrificial CLI must be run with a fresh external OS-temporary output root and a unique A11-owned attempt ID. It must not target the source tree or reuse the authoring-session attempt ID.

## Evidence deliberately absent

- No live model call, token use, provider latency, or provider cost.
- No browser launch or route assertion; browser scope is excluded.
- No A18 gold or adjudicated quality result.
- No confirmatory analysis or arm-effect calculation.
- No A11-owned clean-worktree replay or signed receipt yet.

## Required independent A11 review

1. Verify the exact source baseline and candidate-set commitment from an A11-controlled clean worktree or clone.
2. Re-run the full tests and record command, start/end time, exit code, pass/fail/skip counts, host, and runtime version.
3. Regenerate F1 into A11-owned temporary public/sealed directories and compare semantic/candidate commitments without exposing the seed or mapping.
4. Run a new sacrificial attempt with a unique ID; independently validate its commit manifest and all four receipts.
5. Reproduce at least the fixture-tamper, re-signed-receipt, missing-surface, false-completion, duplicate-writer, concurrent-writer, interrupted-precommit cleanup/tombstone, terminal-ID non-reuse/new-ID retry, and timeout escalation/reaping cases.
6. Review the formal-result and formal-preflight contracts and confirm no gold read, denominator mutation, skipped-surface completion, provider mode, or execution entrypoint can be reached.
7. List checks not run and issue an A11-owned verdict. Do not reuse this author-produced packet as the receipt.

## Independent A11 receipt fields

- Reviewer: ______________________  Date: __________
- Clean worktree/clone path: __________________________________________
- Verified source SHA: _________________________________________________
- Candidate-set SHA-256: ______________________________________________
- Test result and exact counts: ________________________________________
- Adversarial cases reproduced: ________________________________________
- Checks not run: _____________________________________________________
- Verdict: `approved-for-F3-intake` / `needs-repair` / `blocked`
- Independent receipt path: ___________________________________________
- Receipt SHA-256: ____________________________________________________

Until A11 independently completes this replay and signs its own receipt, the A11 gate remains absent.
