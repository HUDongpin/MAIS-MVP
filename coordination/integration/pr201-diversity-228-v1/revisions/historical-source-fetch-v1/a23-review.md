# A23 review of the append-only historical-source fetch repair

Reviewer: /root/pr201_minimal_gate_review
Reviewed at: 2026-10-18T13:16:26Z
Result: approved-for-nonlive-candidate-admission

This review approves the exact S2 repair for the revised non-live admission
process. It does not establish a successful revised GitHub CI or native Shadow
result and grants no merge, deployment, live-access or whole-pack acceptance.

## Verified immutable source

- Predecessor E1: ac9260368713c2ab364dedd5508c07fa6fc3b91d.
- Source S2: e7cc0a52a7e8ef50d94f631936e7b8f58bdbda5d.
- Source tree: c8513cf4cf15529820969bfc176707814471be98.
- Inventory digest for E1 -> S2: 2bb95fd61f67994da92bf1aa489d4ea6ae3cbaebbded32a1949aa547800ee1f2.
- Working-source digest: 5feb321e93f51458cc48ba98eb59156de31384bab959586c4a8b63c16f333612.

The reviewer independently verified that E1 is S2's sole parent, the checkout
is clean, and the actual delta contains exactly four regular 100644 files:
the Promotion workflow, PR201 checker, checker tests and repair documentation.
The independently computed inventory and local inspection digests match the
values above.

All five original E1 admission/review files, the plan, source observation,
228-row candidate, original 1500-row bank, Arkansas loaders/topics, shared types,
legacy required-check implementation and PR264 checker remain byte-identical
to E1. The exact four-path Git delta also preserves every other predecessor path.
The content validator still verifies the A18 hashes, 228-row membership,
1272-row preservation and q014=38000.

## Root cause and bounded repair

The retained first-run native verification failed because original PR262 import
commit fc6c24446659c54f92482cffd2de6e180bbb03c2 was absent from the runner's Git
objects. The first current-composition check passed; the historical failure
and its original logs remain valid and preserved.

The new workflow fetches only refs/pull/262/head before historical execution,
with credential helpers disabled and without depth or blob filtering. It
requires FETCH_HEAD to equal the fixed historical commit, then checks that
the commit and four source objects are present. The existing native
ancestry, delta, mode and hash verification remains unchanged. The public
repository accessibility check was performed by the coordinator; revised
Linux CI must prove the complete retrieval and verification path.

## Admission integrity

The v2 checker fixes E1 as predecessor, requires S2's exact four-path delta,
and requires E2 to first-add only five records in the dedicated revision
namespace. Admission and both role reviews bind the actual predecessor,
source commit and new inventory digest. The original E1 evidence is preserved.

The actual GitHub event must retain the fixed main base and match the reviewed
head/PR. HEAD must preserve E2 ancestry and equal its entire tree. Missing or
invalid revision admission cannot fall back to the old E1 admission. Fresh
current checks and complete historical native evidence remain mandatory
before finalization. All permission flags remain false.

## Validation and remaining boundary

The reviewer independently reran read-only local inspection successfully and
reviewed the actual repair diff. Retained final logs show 22/22 contract tests
and 3/3 prior-workflow preservation tests passing, with no skips; these test
runs were executed by the coordinator.

No concrete source-review blocker remains. The revised E2 records and actual
GitHub CI/native outcome still require verification. The known local macOS
path-length limitation was not bypassed, and no complete local native run
is claimed. This source review cannot be represented as an already successful
revised CI result or authorization to merge or deploy.
