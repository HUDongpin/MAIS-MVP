# Evidence boundaries

Report each boundary independently:

| Boundary | Sufficient evidence | What it does not prove |
| --- | --- | --- |
| Design | docs, schema, checker source, workflow source | that the checker ran |
| Manifest validation | clean exact registered-execution native validation with its exported Manifest fields matched | complete Shadow binding, Receipt authority, or closure; validate PASS cannot set `shadow_passed` |
| Named Receipt verification | native verification report matched to the named Receipt's Manifest/execution/raw/semantic digests | complete candidate/checker binding, current Shadow authority, lifecycle transition, or closure |
| Native Receipt | recomputed canonical/fresh/distinct-replay Receipts with equal closed semantics | external enforcement or live behavior |
| Shadow closure | schema/digest/direct-parent-valid Closure and Registry plus bound A11/A22/GitHub/A25 repository evidence | fresh GitHub API authenticity, integration, deployment, or production behavior |
| CI enforcement | fresh exact-commit check run and required branch-protection readback | provider configuration, deployment, or live route |
| Deployment | provider deployment bound to exact release SHA | correct user-visible behavior |
| Live | same-SHA route readback, interaction, rollback and monitoring evidence | population-level content generalization |

The maturity phrase `Shadow-mature / live-unproven` is deliberately bounded. It is valid only when the standalone handoff's `shadow_passed` conditions are met: closed canonical/fresh/distinct-replay comparison passes, Closure/Registry and required external evidence are verified, and every non-live binding is exact. `liveAllowed=false` must remain explicit in every Receipt comparison and handoff.

A tracked Closure may be valid for its direct base and still be only `historical-direct-base` evidence for a later re-affirmation. Discovery must show that scope rather than silently transferring the old lifecycle transition to the active revision.

Repository evidence files bind roles and artifacts. They are not cryptographic person identity and do not prove that each role file came from a distinct human or session. In particular, N role evidence files must be reported as N evidence records, not N independent reviewers.

## Redaction

Do not include:

- question or lesson bodies;
- accepted answers, private corpora, student/research rows, or protected content;
- credentials, environment values, provider responses, prompts, reasoning, or tokens;
- absolute local paths, raw GitHub/run identifiers, or broad opaque IDs in handoffs.

Use full SHA-256 values, 40-character Git commits, enum states, counts, and `ref-<sha256>` logical references. A file path may be used internally for a read-only command, but the emitted handoff should bind the file by hash and redacted reference.

## Rollback

Shadow rollback evidence covers only the runner-owned temporary output root and restoration of its preimage. It cannot be promoted to claims about live content stores, databases, routes, deployments, or operational monitoring.
