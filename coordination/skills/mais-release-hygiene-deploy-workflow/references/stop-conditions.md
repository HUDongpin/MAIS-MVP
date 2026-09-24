# Stop Conditions

Stop and report `release-blocked` when:

- the request is actually for Manifest, Shadow, Receipt, replay, Closure, Registry, or Promotion currentness;
- a content-candidate release lacks a current same-candidate/same-SHA A18/A23 Promotion handoff, or the handoff is stale, historical-only, replay-only, or mismatched;
- readiness generation lacks an A25-reviewed clean source, or deployment/live mutation lacks current same-SHA A11 regression, independently issued A22 release-readiness, A25 clean-slice/release-intake, exact owner target/action authorization, or A19 environment-parity evidence when configuration matters;
- live `origin/main`, exact SHA, target, owner, writers, or dirty state cannot be resolved;
- unrelated dirty files would enter the release slice or the only proposed source is an unapproved dirty root;
- required preflights, build, regression, environment parity, provider scope, or project binding fail;
- deployment or live testing would expose private corpus, protected content, secrets, personal data, or unrelated assets;
- the requested action exceeds its authorization, fee, network, production-side-effect, rollback, or monitoring boundary;
- the requested conclusion relies only on build, CI, configured provider variables, Vercel READY, HTTP 200, or a prepared rollback command.

Do not clear a blocker with a dirty-root shortcut, broad staging, destructive cleanup, stale receipt, or broader claim wording.

These mutation gates do not block an `inventory-only` report: unresolved or missing facts remain explicit inventory findings, and inventory grants no release authority.
