# A11 independent v2 review — legacy successor activation test repair

- Actual A11 reviewer/session: `/root/a11_pr172_copy_verify`.
- Reviewed UTC: 2026-09-28T11:30:56.061Z.
- Exact new code commit: `75d4d37710f7159ddaa4a6674abda1196e43b209`, direct child of Receipt storage commit `5b1445e32f72156e1effa27ae31c3e08ec4d0fab`.
- Verdict: **approved-for-required-check-integration** for the exact reviewed **code candidate only**. This does not certify a GitHub global required-check PASS, live promotion, merge, deployment, whole-pack acceptance, or closure of #172/#262.

## Exact five-file binding

A11 independently re-read C1b Git blobs and modes. All five files are regular `100644` blobs and match the working bytes. The stable digest of sorted `[path, mode, rawSha256]` rows is `d97017ffa1c321715b119b6a127ee305de49e705530114c8bef6f818568f29a4`.

| Path | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `c6912ec7afc23a6377d1a81f76998a4d9c10d890c9ee2862a45e74ba3037859c` |
| `scripts/promotion-required-check-legacy-successor-v1.mjs` | `9944d4b6e4c8fa819a66ab5efe739a3975009cdf7a33308a448f5e46b3e4bbff` |
| `scripts/promotion-required-check-legacy-successor-v1.test.mjs` | `0b94914e3dd333095a63e834fc09a9f3287841beea08ed1b8244c0ad112a72eb` |
| `scripts/promotion-shadow-workflow-legacy-successor-v1.test.mjs` | `b0b130d554742780f760486ff5132d5f7f45ada45acded56d49ab3aa7e980d57` |
| `scripts/promotion-shadow-workflow-v2.test.mjs` | `b25f95237961612d6e645c096ebfa457074758b04bcd7e8f3c4a18241c50a37c` |

Four files remain byte-for-byte identical to the previously reviewed C1 `fae1dd93ff05810ef19e4623b030068aa742bb26`. Only `scripts/promotion-required-check-legacy-successor-v1.test.mjs` changes, from raw `b75e3bf5b49ab02c8bb69fb967d55f80fee941ae3b8c83973c1eb3ba7924c0ce` to `0b94914e3dd333095a63e834fc09a9f3287841beea08ed1b8244c0ad112a72eb`. A11 compared both files line by line: 176 lines each, exactly one removed and one added line. The artifact fixture now uses `process.env.RUNNER_TEMP ?? os.tmpdir()` as the temporary-directory base. The production `assertArtifactSet` already requires the physical `RUNNER_TEMP` boundary; no production code, native checker, workflow condition, artifact mode requirement, Receipt assertion or negative test was weakened.

## Actual #265 failure and bounded local regression

A11 independently read [GitHub Actions run 36415236020](https://github.com/HUDongpin/MAIS-MVP/actions/runs/36415236020) for #265 at old activation head `cb651023a3cd606d571aba46238a6b1b33d27a13`. Checkout, selector and preflight passed. The old Promotion suite passed **107/107**; the new suite passed **9/10** and the artifact fixture failed with `ACTIVATION_ARTIFACT_ROOT` because it was created under `os.tmpdir()` while GitHub set `RUNNER_TEMP=/home/runner/work/_temp`. The frozen execution preparation and native evaluate steps were skipped; final enforcement and missing-artifact upload failed. This run is a genuine failed global check, not a native outcome or a reason to rewrite the old C1/C2 evidence.

After the one-line repair, the coordinator ran a local new suite under a distinct task `RUNNER_TEMP`; A11 read the terminal logs and raw SHA-256, without rerunning the fixture tests:

- New tests **10/10 PASS**, no failures/skips; `/private/tmp/mais-successor-activation-v2-new-tests.log`, raw SHA-256 `fd8eb40bbc85de96da3b3c03b1504748625412a28e5685a6c21e5d9935f83910`.
- Old Promotion tests **107/107 PASS**, no failures/skips; `/private/tmp/mais-successor-activation-v2-old-tests.log`, raw SHA-256 `1930c6cdbe01e1b31af65fde4b2e2b719e2c2e4c68a9dc60e5713dd1e629eade`.

A11 additionally ran read-only `node --check` on the changed test and `git diff --check`; both passed. This is a bounded local repair review. C1b has not yet produced a successful GitHub required check. The old C1 code digest and old C2 marker/A11/A23 decisions remain historical and cannot authorize this new test byte; a new exact code digest, fresh independent review decisions and a new bounded marker are required.

## Outstanding authority limits

**External P1 remains open:** on 2026-09-28 A11 independently read the main branch protection using the GitHub API. The required contexts are `validate` and `promotion-shadow-gate`, but required approving review count is **0**, code-owner review is disabled and there are no repository rulesets. The PR-supplied workflow can be altered by a writer while keeping a same-named job; reviewer identity/session strings and in-workflow hashes do not create a protected external authority. Actual independent A11/A23 authorship and raw review bytes must be checked out of band, and repository protection needs a separate owner decision before this check can be called tamper-resistant.

**Actual global CI remains pending:** the new C1b/C2b GitHub run must execute and be read back. The existing native local attempt-009 validate, non-live Shadow, Git Receipt transport and native replay remain separate exact-source PASS records; they do not convert old run 36415236020 or a local test into a global gate PASS. Any future candidate/content/runtime change needs its own reviewed authority. `liveAllowed` is false throughout this decision.

This report is authored by A11 as the source for a byte-for-byte copy to `coordination/integration/legacy-successor/activation/a11-review.md`. Its raw SHA-256 is stored in the accompanying A11 decision JSON. A11 wrote only the two assigned primary review files; no source, workflow, Git, PR, installed skill or historical evidence was modified.
