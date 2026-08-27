# MAIS Routing and Currentness

Status: **normative** for this skill's routing and evidence claims. Repository role names can evolve; re-read the current repository coordination contract before acting.

## Lane Routing

| Intent or evidence | Owner/workflow | This skill's action |
| --- | --- |
| Synthetic RSI calibration or frozen exact-package machine review | Machine-QA workflow, coordinated through content operations | Execute/audit within authorization. |
| Natural or representative sample evaluation | Natural-sample evaluation workflow | Route; do not treat synthetic calibration as a substitute. |
| Curriculum alignment, answer correctness adjudication, final question/lesson acceptance | A18 content QA | Hand off machine evidence; do not decide. |
| Candidate repair or generation | A21/content owner, with owning live-surface lane | Report findings; do not self-repair and certify. |
| Candidate-to-live sequencing and promotion plan | A23 integration/promotion | Route after current A18 evidence. |
| Product regression evidence | A11 QA | Route after integration candidate exists. |
| Build, release readiness, deployment hygiene | A22 release engineering | Route; machine QA is not a release gate receipt. |
| Git ownership/currentness and release intake | A25 | Request current exact-path/commit evidence before A23 handoff. |
| Generic AI answer or prose critique | General review workflow | Do not trigger this specialized skill. |

When a request spans lanes, complete only the machine-QA portion, label its boundary, and name the next owner and resume gate. Do not simulate another lane's decision.

For a synthetic-calibration request that tries to infer both natural-bank quality and content approval, a complete answer names both independent routes: natural-population estimation goes to the natural-sample evaluation workflow; exact candidate or item acceptance goes to A18. A generic “no approval follows” disclaimer does not replace these two explicit routes.

## Seven Evidence-Location Boundaries

The machine envelope records where evidence was actually demonstrated. These are not A18/A23/A11/A22 role verdicts:

| Boundary | What it establishes |
| --- | --- | --- |
| `localTest` | A named local check ran against the bound candidate/tool state. |
| `receipt` | Receipt structure, semantics, hashes, and currentness were validated. |
| `trackedCommitted` | Evidence exists in a tracked exact commit. |
| `main` | The bound evidence is present on main. |
| `ci` | CI evidence is bound to the exact result identity. |
| `deployment` | A deployment receipt exists for the bound result. |
| `live` | Same-version live behavior was directly verified. |

`passed` at one boundary never fills another. Every passed boundary needs its own pairwise-distinct evidence hash, and no passed proof hash may equal a deterministic, B-prime critique/revision, active C0-prime, or independent-review receipt hash. A branch name, task card, local file, green unit test, CI run, deployment status, and browser observation remain different evidence locations.

A18 content acceptance, A23 promotion planning, A11 regression ownership, and A22 release readiness are routed downstream decisions with their own receipts. They are not keys in `proofBoundaries` and cannot be inferred from machine evidence.

## Currentness Questions

Before reusing any packet, answer all of these from current evidence:

1. Does the candidate ID/version/hash still match the bytes under review?
2. Does the canonical active receipt manifest equal the complete identity/control plane; does each closed redacted `ValidationReceiptBodyV1` bind nonempty response bytes, output equality, passed parse/projection/schema/role/taxonomy/coverage, exact slot-derived role and surface parity, current schema/taxonomy/control-plane identities, and false redaction flags; do all six active domains—output, validation receipt, validation projection, result, artifact, and bound receipt—recompute and remain disjoint as required; and are all current SHA-256 references covered by `evidenceHashes`?
3. Is the receipt explicitly current and not superseded?
4. If live provider use occurred, does the complete redacted authorization projection recompute to its declared digest, remain unexpired, use the fixed common authority reference, bind the exact full control plane/scopes/caps/executable-code-manifest/runner, carry a source-bound `VERIFIED` external-comparison anchor with a recomputable receipt identity, and match `liveExecution`? Does the canonical code manifest recompute across every plane, bind current commit and Node runtime, contain sorted unique exact `package.json`/`package-lock.json`/`100755` entrypoint/recursive local closure, reject symlink/submodule/untracked/dynamic/unresolved/custom-loader/outside dependencies, and match both HEAD and working bytes/modes? Are both declared and observed repositories clean, is the packet outside that repository or in a verified ignored quarantine, and is the performed-role set exactly B-prime plus the five C0 roles iff C0 is canonically required/complete? Has fresh exact authorization from the current task also been compared to the external trusted receipt, rather than inferred from structural validity?
5. Is fresh independent review passed, candidate-bound, and backed by a distinct receipt?
6. Is each passed proof boundary backed by its own non-reused hash, pairwise distinct from the other proofs and disjoint from the complete active review-receipt set?
7. Did D-prime remediation record distinct prior/new candidates, the exact canonical prior-envelope body/hash, external-comparison anchor and receipt identity, canonical prior receipt manifest including prior C0 state, exact-equal invalidation coverage, and a fully covered/disjoint fresh current reference set? If the prior body/anchor identity changed, was it treated as a different untrusted evidence source until externally re-verified?
8. Is the claim about local files, receipt integrity, a tracked commit, main, CI, deployment, or live behavior?
9. Does every complete-packet string satisfy its field-specific path, timestamp, commit, hash, enum, strict-version, typed-logical-ID, uppercase-code, or hash/reference grammar?
10. Does the shared evidence-class/status/disposition/action/receipt-proof/independent-review transition resolve exactly, with synthetic calibration restricted to calibration actions and never A18?

If any answer is unknown, retain `unverified` or `blocked`; do not infer.

## Default Read-Only Audit

Unless explicitly authorized to create a new run:

- inspect packet structure and hashes;
- run only offline validators and safe summary tools;
- avoid provider/network calls;
- do not mutate the candidate, packet, receipts, Git state, or release state;
- do not access credential sources merely to prove that a credential might exist;
- return blocker codes, evidence boundary, and next owner.

## Trigger Conflict Resolution

- “AI checked these questions; can we ship?” triggers this skill for the machine-packet audit, then routes the ship decision to A18/A23/A11/A22.
- “Evaluate a random sample from the real bank” does **not** trigger this skill; it is natural-sample evaluation.
- “Approve these answers/curriculum labels” does **not** trigger this skill; it is A18 content QA.
- “Promote the accepted package” does **not** trigger this skill; it is A23.
- “Deploy or verify production” does **not** trigger this skill; it is A22/release/live verification.
- “Review this chatbot answer” does **not** trigger this skill without a frozen MAIS candidate/evidence packet.
