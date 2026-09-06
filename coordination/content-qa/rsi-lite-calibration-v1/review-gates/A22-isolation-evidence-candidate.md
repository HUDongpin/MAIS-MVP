# A22 isolation-evidence F2-R candidate packet

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Frozen source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Author: A16 remediation session, not the independent A22 reviewer
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`
- Branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`
- Current status: `REMEDIATED CANDIDATE FOR SUPERSEDING INDEPENDENT A22 REVIEW`
- A22 receipt: historical `needs-repair` receipt preserved; superseding receipt absent
- F3 implication: `BLOCKED`

## Machine-remediated isolation evidence

The F2-R harness now performs a real same-UID enforcement matrix on macOS Seatbelt:

- policy starts with `(deny default)` and imports the system policy; it never uses `(allow default)`;
- execution root is a newly created OS-temporary directory outside the repository;
- runtime inventory contains only a copied standalone probe worker and no `node_modules`;
- each of the five C-role identities receives one mode-`0400` JSON input and one private writable outbox;
- environment is rebuilt from an exact allowlist: `LANG`, `LC_ALL`, `MAIS_ROLE_ID`, `NO_PROXY`, and role-local `TMPDIR`;
- no real key source is read; the protected target is a synthetic canary named like a credential document;
- each role actively proves its own input read and own-outbox write are allowed;
- each role actively proves protected-canary content and metadata reads, input append, input chmod, sibling-outbox write, repository read, and localhost network access are denied;
- protected-read and sibling-write escapes through symlinks created inside the allowed outbox are denied;
- each role proves credential-like environment keys are absent;
- the profile denies process fork while permitting the initial sandbox worker execution; each role actively proves a descendant Node spawn is denied;
- pre/post input hashes are equal and every probe exits zero;
- if `sandbox-exec` is absent or non-executable, the harness fails closed;
- a semantically re-signed receipt with any relaxed invariant is rejected;
- candidate receipt writes are atomic.

The candidate receipt path is:

`coordination/content-qa/rsi-lite-calibration-v1/f2-r-isolation-receipt-candidate.json`

It records profile hashes and invariant results, not raw policy paths, credential values, or protected contents.

## Process and lifecycle evidence

- C0 and C task lists are identical; C uses distinct child processes while C0 is serial/shared-state.
- The sacrificial controller is the sole receipt writer.
- Role processes run in their own process groups. Timeout handling sends `SIGTERM`, waits a bounded grace period, escalates to `SIGKILL` if needed, and awaits/reaps the child before cleanup or return.
- Attempt IDs have exclusive reservations and cannot be overwritten.
- Staged attempts become visible only by atomic directory rename.
- SIGTERM before that rename leaves no committed attempt, no active lock, and no attempt-specific staging directory; it leaves a hash-bound `.aborted.json` terminal record. Retry uses a new ID; the terminal ID remains non-reusable.
- F2-R launched zero provider calls, spent zero API currency, launched zero browsers, and did not run a dev server, Vercel command, deployment, or production action.

## Scope boundary

The Seatbelt matrix proves the proposed deny-default mechanism on this host for five role identities. It is author-produced candidate evidence, not an A22-owned receipt. It does not prove a browser environment because browser routes are outside this content-only estimand. It also does not authorize mounting the sealed seed, mapping, mutation ledger, gold store, common `.git`, source repository, provider credentials, or production data into a future runner.

## Required independent A22 review

1. Verify the source baseline, host/platform, Seatbelt availability, and exact candidate receipt hash.
2. Re-run the five-role matrix from an A22-controlled clean worktree and confirm every allow/deny invariant.
3. Inspect the generated policy for path traversal, symlink, metadata, executable-map, process, network, and environment escape risks.
4. Confirm input/outbox permissions, strict role-ID/path containment, descendant-process denial, one-writer behavior, bounded SIGTERM-to-SIGKILL escalation and reaping, attempt reservation, atomic commit, explicit aborted/committed terminal records, new-ID retry, and orphan-cleanup boundaries.
5. Confirm the formal runner is absent and no sealed/gold/provider/production path is reachable.
6. Confirm browser exclusion is appropriate for the frozen content-only estimand; do not request ports or `NEXT_DIST_DIR` unless a later protocol explicitly adds owned browser routes.
7. Record checks not run and issue a new A22-owned receipt. Do not sign this author packet in place.

## Independent A22 receipt fields

- Reviewer: ______________________  Date: __________
- Isolation host/environment ID: ______________________________________
- Verified source SHA: _________________________________________________
- Candidate-set SHA-256: ______________________________________________
- Candidate isolation receipt SHA-256: _________________________________
- Replayed role count and invariant result: ____________________________
- Checks not run: _____________________________________________________
- Verdict: `approved-for-F3-intake` / `needs-repair` / `blocked`
- Independent receipt path: ___________________________________________
- Independent receipt SHA-256: ________________________________________

Until A22 independently replays and signs its own receipt, isolation approval remains absent.
