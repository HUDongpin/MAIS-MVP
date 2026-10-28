# Independent A23 review of immutable PR301 tooling

Reviewer: /root/pr300_a23

Reviewed at: 2026-10-28T19:43:53.786Z

Decision: approved-for-exact-pr301-required-check

Scope: exact-pr301-nova-voice-formatting-required-check-only

This is a distinct formal review of actual committed T. The preliminary uncommitted review and prior PR300 reviews were not used as immutable-PR301-T approval. No actionable correctness or security issue was found in the exact source/tooling admission. This decision establishes scoped ordinary-code source/tooling eligibility and consumption of the specific verified local runtime record only. It does not establish E, final-head remote checks, main merge acceptance, historical Promotion revalidation, native content approval, deployment, live provider voice, microphone or speaker acceptance.

## Actual immutable bindings

- Main base B: 638d6e7e0a16f1693a6a1afca72bb43ef9debbac.
- Source S: 5e20119b246f3b4d34d8fbfc079f12cae17affdc; tree f2b917b9b696fc85464810412bf8a611e46450e7; sole parent 324355a3c6245f24fbee1f7d3a28b9e2595c1790.
- B-to-S source inventory digest: ac767603f4afb4ac1767ddc84317a11abf1125945ca95775d2b9c02c86cd526e, exactly twelve paths.
- Tooling T: 86d83e89ceed45c50d1ffb4d8ac0794fec134c51; tree 2fdc779531a779d185e68216c51c3f96d1fcf632; sole parent S.
- S-to-T tooling inventory digest: cd3bfb97e1f8576d9852a0639f4f0710a7f91d384e9609724ea2c504baa9d9f3, exactly four paths.
- Frozen source-check raw SHA-256: c51a01272d74dd9958ee33ea78590732380e348078411377c3ce03a0828f6a23.
- Consumed runtime-evidence raw SHA-256: a16f7217aa8598c57e3ba4d35c7e9a63f331dae8ec0f56e32ca4eb2794c9d859.

Actual HEAD/tree matched T before and after verification. Git status --porcelain=v1 --untracked-files=all was empty before the checks, after them and before report creation. I independently checked full Git history, absence of replace refs and graft files, the regular Git entry, direct source/tooling parents, B ancestry, both inventories, and the exact current regular-file bytes/modes of all source/tooling and runtime dependency files. git diff --check S T passed. The eight future E evidence records are absent from T.

The source preserves the external compiled ws loading fix and send-error settlement, adds escaped-newline handling with math/code protection and paragraph-preserving display normalization, repairs isolated harness paths, and bounds the Dashboard grid/name wrapping needed for the ordinary mobile launcher. Its CI delta adds the compiled voice check after the normal build. Source review and tests retain the long-name fixture and ordinary click path. No provider configuration, credentials, live curriculum, auth policy or database policy is changed by this source slice.

## Gate review

PR301 adds its own selector before PR300 v2. A present invalid marker fails closed without falling back. Removing the three deterministic selector/mode/check/upload insertions reconstructs the prior workflow bytes exactly, retaining pinned actions and all historical step controls. Existing checkers and evidence are unchanged.

T must directly follow S and change exactly four tooling files; E must directly follow T and first-add exactly eight files, including its own runtime record and independently authored A11/A23 JSON/Markdown pairs. The same-repository PR301 event must use exact B and E; an authorized main push must have ordered parents [B, E] and E's exact tree. Forks, changed bases/heads, descendants, extra paths, reused evidence, changed modes/hashes, permission widening and stale/future review identities/times are rejected.

The admission, both independent reviews and emitted decision bind the runtime record by its fixed raw SHA-256. Strict JSON schemas, source/check/runtime/tree/inventory/report/review hashes, source-before-check-before-tooling chronology, runtime-before-tooling chronology and tooling-before-review-before-evidence ordering remain enforced. The twenty-two runtime source/dependency hashes are checked against S, current HEAD and actual current file bytes. Synthetic review records in tests are not evidence of actual independent review.

The checker freshly runs only the fixed contract, TypeScript and provider/display commands. Its restricted environment excludes inherited credentials, NODE_OPTIONS and NODE_PATH. Output requires a fresh private canonical temporary directory outside the repository. The unchanged full-tree materialization guard runs before and after commands, followed by renewed preflight/currentness checks before a decision may be emitted. All six permission fields remain false.

## Fresh actual-T verification

This reviewer freshly executed the exact fixed commands at actual T under v24.15.0 and umask 0077:

| Check | Result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr301.test.mjs | 41 of 41 passed |
| node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --incremental false | exit 0; empty stdout/stderr |
| node --import tsx --test --test-reporter=tap lib/server/llmProvider.test.ts lib/server/llmProviderNewlines.test.ts components/math/mathTextFormatting.test.ts | 40 of 40 passed |

All tests had zero failures, cancellations, skips and TODOs. The checker parsed the new TAP output and matched the fixed source test-name digest/count. Contract tests exercise exact event and merge composition, inventories, old-checker protection, workflow weakening, source/runtime record alteration, review identities/bindings/timing, permission widening, strict JSON, hidden index flags, incomplete TAP, command failure, private output roots, runtime gaps/retries/screenshots/dependencies and consumed-proof limitations.

I independently rehashed each frozen source stdout/stderr file, matched source-checks.json, parsed its actual unit TAP, checked its empty type output and recomputed CHECKS_SHA. The new test logs are actual-t-*.stdout/.stderr under .local/pr301-admission/reviews/a23/. The independently generated actual-t-verification.json has SHA-256 4c1c9d78e8d38bd6c11990875b6d0bc01d11fe1472dbb44f9f0f261d4fc3cc1e.

## Independent consumption of local runtime evidence

I revalidated the actual runtime record and its twenty-two dependency bindings against S and T. I rehashed the original build attestation and build stdout/stderr; its candidate S, clean/stable flags, start/completion time and build ID M-lRkZo1mG8k0xmqg5RWi match. The build began after S. The saved attestation equals the attestation inside the build output. I independently recomputed all release build artifact digests and the complete artifact tree: 2,560 files, 104,819,306 bytes, SHA-256 root 558f6f163d478da769bd9a8021370bc90a3a57d5be190f46206cf093b74ac60e, using the established attestation/cache/diagnostics/trace exclusions.

The original compiled-route WebSocket stdout/stderr hashes match the record, and its TAP proves one passing long-frame loopback case. I independently checked the raw desktop/mobile/backend report and stderr hashes and parsed their actual results. Desktop has 3 expected passes, mobile 1 and backend 6; each result has retry 0, one successful attempt and no errors. No skipped, flaky or unexpected results exist; exact project/title lists and timing match the descriptor.

The backend .json file is the original npm stdout with a fixed two-line script preamble. I verified the complete raw file hash before removing only the exact observed npm preamble and strictly parsing the remaining JSON payload. I did not search loosely for an arbitrary JSON substring or change that evidence. Desktop/mobile files are directly strict-parsed JSON.

Both screenshot hashes, byte counts and PNG dimensions match. The exact same hash-bound desktop/mobile screenshots were independently visually inspected during this review task and show the requested paragraph separation and rendered LaTeX; actual-T verification reconfirmed their bytes. A mocked UI's configured-voice label is not live provider/microphone/speaker acceptance.

These are consumed local production-build/runtime results with mocked providers and loopback services. This reviewer did not rebuild the app or rerun browser/backend sessions in the formal pass, and the Promotion checker does not do so. browserReexecutedInCi=false, buildReexecutedInPromotion=false and liveVoiceProven=false remain explicit. Ordinary CI separately builds its final head and runs the compiled voice test; it remains separate acceptance evidence.

## Full-materialization limit and remaining gates

The parent executed an actual-T full-materialization probe. I independently inspected its T-bound .local/pr301-admission/local-materialization.json receipt, raw SHA-256 ad533d24cfe660be8aba703b7c947ae299e0df95807ef63f81c10049acb0eb12. It reports blocked-local / ENAMETOOLONG / fullMaterialization=false at an existing long historical integration path. The whole-tree guard has NOT passed locally. Individual byte checks, complete build-artifact hashing and synthetic materialization tests do not substitute for this repository-wide traversal. No waiver is granted: the unchanged full before/after guards must pass in actual final-E Ubuntu PR and main runs. Earlier PR300 successes do not supply PR301 proof.

Actual E does not exist at this review point. A11 must independently review the same T, then the assembled E, exact-head Promotion, ordinary CI, preserving main merge and actual main checks require their own verification. No new GitHub/provider API query was made in this review. No native content Manifest or Shadow Receipt, historical Promotion authority, production health, deployment, live voice, microphone or speaker result is asserted.

Permissions: historicalPromotionRevalidated=false; liveAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false.

I created only ignored A23 reports and verification logs under .local/pr301-admission/reviews/a23/. Existing PR300 reports, source, tracked evidence, Git refs/index and credentials were not changed.
