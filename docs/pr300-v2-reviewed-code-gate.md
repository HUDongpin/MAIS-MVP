# Exact PR300 v2 classroom fixture-repair admission

The first PR300 Ubuntu gate selected the correct v1 contract and passed its initial full materialization and 35 contract tests, then failed one classroom self-test. Its private `umask 077` turned a requested unsafe `0644` fixture into safe `0600`, so the expected rejection did not occur. The actual artifact writer was behaving correctly. The verified failed artifact and its result remain historical failure evidence, not a successful gate.

The repair explicitly applies `chmod(0644)` and checks the fixture mode before testing rejection. A new subprocess test sets `umask 077` and runs the real CLI self-test. The writer's production permission rules, workflow's private umask, and existing gate controls are unchanged. The classroom suite passes under both `022` and `077`; a red run of the new test is preserved.

## Immutable inputs

- Main base B: `1b03f8f1300c360188ada33a382070eba06cb075`.
- Preserved v1 evidence head E1: `c9c934621e0b9c53a3830d988332f941381df785`.
- Repaired source R: `455d6ed9247163341599e219d2deef18271d01d2`, sole parent E1.
- R tree: `b4cdfd4a8eb5794e3471b6816efc9125d4550110`.
- Exact E1 → R repair inventory: `326d7e7e0e9b07afecea68eeb832972f7083953048dcc15180b5fb2c24933d30`, only the classroom runner and its test, 13 added lines.
- B → R inventory: `d452d4d2eb7b0bfbd97424beebf6b5432812d301aca7beb2b3b64cbe6632e7ab`, 15 paths retaining the entire v1 source/tooling/evidence tree plus the two-file repair.
- Fresh clean-R execution record SHA-256: `99840b075cb5c81935bfca74f239bc2980005657b828db2854af024e1ff6ccd9`.
- Failed v1 run: `40721242913`; downloaded artifact `12830351941`, ZIP SHA-256 `cd0a441d9112bef8dbc0ed07f3d327042b603e9e0dd192905412c931985b593a`.

The original v1 checker, tests, documentation, source/check records and A11/A23 reviews are not edited or reinterpreted as v2 approval. The v2 source check proves the exact repair relationship as well as the complete base-to-R inventory. Current non-tooling source bytes must match R; the sole overlapping workflow path is separately constrained by exact deterministic reconstruction.

## New tooling and evidence

T2 is a direct child of R, changing exactly this document, the new v2 checker/test and deterministic workflow additions before the v1 selector. E2 is a direct child of T2 and uniquely first-adds seven records in `coordination/integration/reviewed-code/pr300-v2/`: admission, source inventory/checks and independently authored actual-T2 A11/A23 JSON/Markdown pairs. Existing v1 records do not substitute for these reviews.

Only same-repository PR300 with exact base B and head E2 is admitted. An authorized main merge must have ordered parents `[B, E2]` and exactly E2's tree. Forks, another PR/base, descendants, wrong paths/modes/hashes, stale or future reviews, malformed authority JSON, permission widening and invalid marker fallback remain rejected. No prospective event checker grants merge or deployment authority.

Removing the three deterministic v2 insertions reconstructs R's entire workflow byte-for-byte. All prior step controls, pins, modes and historical contracts remain intact. A failing selected v2 marker cannot fall through to v1.

## Execution and evidence limits

The gate runs 37 adversarial contracts and three fixed offline commands: 71 classroom, 7 release-build-tool and 24 production-certification-tool tests. Complete exact TAP names/counts, zero failures/cancellations/skips/TODOs, successful process status and raw output hashes are required. Clean-R source execution used the same private umask as CI. The new child-process regression also exercises that umask independently of its parent.

The broader release-governance result is 164 passed, 11 existing historical skips, zero failed. These skips are explicitly separate from the zero-skip fixed commands and are not historical Promotion revalidation. Ordinary final-head CI remains required independently.

The restricted child environment and fresh private repository-external artifact directory remain unchanged. Full tree materialization still runs before and after commands, followed by final source/evidence currentness checks. The known local macOS long-path limitation is not waived; actual Ubuntu PR and main checks must pass the unchanged guard. Prior v1 initial materialization does not replace this v2 proof.

All six permissions are false and `liveClassroomProven=false`. This is bounded ordinary-code admission, not a native content Manifest, Shadow Receipt, content acceptance, live classroom capacity test, provider call or deployment.

## Ownership

A10/A22 owns this tooling slice on `codex/pr286-current-main-20261028`, target PR300. Independent A11 `/root/pr286_source_review` and A23 `/root/pr300_a23` inspect actual immutable T2. Created 2026-10-29 Asia/Taipei; closeout remains conditional on final PR/main verification and preservation. The owner goal remains PR300/#286, then #258 → #269 → #275 → #225 with corresponding branch closeout; unrelated and historical source branches remain retained.
