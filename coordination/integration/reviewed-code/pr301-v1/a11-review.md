# Independent A11 review of immutable PR301 source, tooling and runtime evidence

Reviewer: /root/pr286_source_review

Reviewed at: 2026-10-28T19:46:11.036Z

Decision: approved-for-exact-pr301-required-check

Scope: exact-pr301-nova-voice-formatting-required-check-only

This report is an independently authored review of the actual immutable source S, tooling T, and bound runtime evidence. No blocking actionable finding remains in this bounded package. Earlier uncommitted reviews, harness failures, mobile overflow failures, and PR300 approvals are separate records and are not substituted for this decision.

## Exact reviewed identities

| Item | Verified value |
| --- | --- |
| Base B | 638d6e7e0a16f1693a6a1afca72bb43ef9debbac |
| Source S | 5e20119b246f3b4d34d8fbfc079f12cae17affdc |
| Exact source parent | 324355a3c6245f24fbee1f7d3a28b9e2595c1790 |
| Source tree | f2b917b9b696fc85464810412bf8a611e46450e7 |
| B-to-S inventory digest | ac767603f4afb4ac1767ddc84317a11abf1125945ca95775d2b9c02c86cd526e |
| Tooling T | 86d83e89ceed45c50d1ffb4d8ac0794fec134c51 |
| Tooling tree | 2fdc779531a779d185e68216c51c3f96d1fcf632 |
| S-to-T tooling inventory digest | cd3bfb97e1f8576d9852a0639f4f0710a7f91d384e9609724ea2c504baa9d9f3 |
| Source-check JSON raw SHA-256 | c51a01272d74dd9958ee33ea78590732380e348078411377c3ce03a0828f6a23 |
| Runtime-evidence JSON raw SHA-256 | a16f7217aa8598c57e3ba4d35c7e9a63f331dae8ec0f56e32ca4eb2794c9d859 |

I verified the source ancestry and exact parent, direct S -> T relation, both trees, exact twelve-path source and four-path tooling inventories, all tooling freeze hashes, and committed/worktree byte equality. All twenty-two runtime source/dependency hashes agree with S, T and the working files. HEAD, hashes and tracked/untracked cleanliness remained stable throughout the review.

## Source correctness and scope

The escaped-newline normalizer now decodes plain prose, including lowercase continuations, while preserving complete recognized n-prefixed mathematical commands, delimited math, complete inline backtick runs, backtick/tilde fences, longer valid closers and unclosed fences through end-of-reply. The previously reproduced double-backtick, tilde-fence, shorter-inner-fence and unclosed-fence defects are covered by the committed exact-byte tests. Display normalization preserves paragraph CR/LF. The earlier direct probes remain consistent with the immutable source hashes and fresh unit suite.

The voice route catches synchronous send failures through its existing error-settlement path, and the Next configuration externalizes ws. The source CI workflow adds the compiled-route loopback transport test immediately after Build. The E2E build-path helper validates the explicitly selected BUILD_ID, fails instead of falling back when it is missing, and returns the equivalent project-relative runtime distDir required by Next. The Dashboard correction is limited to grid minimum sizing and welcome-name wrapping; the long display-name fixture, ordinary launcher click, auth/data logic and tutor semantics remain unchanged. The committed browser assertions cover normal launcher access, document width, actual paragraph separation, two rendered math expressions and absence of page errors.

## Tooling and workflow assessment

The checker binds exact source bytes, source checks, runtime descriptor, twenty-two dependencies, tooling tree/inventory and actual independent reviewer JSON/Markdown hashes. Closed schemas, canonical times and all-false permissions constrain the decision. The prospective E must be a direct T child containing exactly eight first-added evidence records. Same-repository PR301 must use exact B and E; an authorized main event must have ordered [B, E] parents and E's exact tree. Wrong events, forks, bases, descendants, extra paths, byte/mode drift, malformed/duplicate JSON, stale/future reviews, altered runtime claims, dirty/aliased files, history mutation, permission widening and invalid test output fail closed.

I verified that the actual Promotion workflow equals deterministic insertions into S: PR301 selector precedence, the accepted-mode addition, and its dedicated verify/upload steps. Older checkers, evidence, modes, controls and action pins are retained. A present invalid PR301 marker cannot fall through to prior approval. Full source materialization remains before and after commands, followed by a fresh preflight/currentness check. Child environment filtering excludes inherited provider/database credentials, NODE_OPTIONS and NODE_PATH. Output requires a fresh private canonical temporary directory outside the repository.

The Promotion checker consumes the local build/browser evidence by its frozen raw descriptor hash; it does not replay those build/browser sessions. That boundary is accurately retained as buildReexecutedInPromotion=false, browserReexecutedInCi=false and liveVoiceProven=false. Ordinary final-head CI remains a separate requirement.

## Fresh independent tests at actual T

All commands below ran with Node v24.15.0, caller umask 077 and the checker's restricted environment.

| Command | Fresh result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr301.test.mjs | 41 passed; zero failures, skips, cancellations or TODOs |
| node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --incremental false | Exit 0; empty stdout and stderr |
| node --import tsx --test --test-reporter=tap lib/server/llmProvider.test.ts lib/server/llmProviderNewlines.test.ts components/math/mathTextFormatting.test.ts | 40 passed; zero failures, skips, cancellations or TODOs |
| git diff --check B T | Passed |

I read the original clean-S source-check JSON and raw stdout/stderr pairs, recomputed every recorded raw hash, validated the schema and complete TAP test names/counts, and checked execution chronology between S and T. Fresh reruns occurred at T with S's unchanged source files. Synthetic contract fixtures demonstrate accept/reject behavior; they are not the actual independent approval records.

## Runtime and visual evidence independently verified

The retained clean/stable S production build is M-lRkZo1mG8k0xmqg5RWi in .tmp/china-lesson-e2e-runtime/outputs/pr258-20261029/next-dist-v3. I verified its local and build-directory attestation bytes, candidate SHA, BUILD_ID, build stdout/stderr hashes, clean/stable flags and completion time. I independently reran the read-only artifact digest verifier and recomputed the artifact tree: 2,560 files, 104,819,306 bytes and SHA-256 root 558f6f163d478da769bd9a8021370bc90a3a57d5be190f46206cf093b74ac60e. The declared exclusions are the attestation itself, cache, diagnostics and trace files. This artifact verification is distinct from the pending full Git source-materialization guard.

I verified the full raw hashes of desktop-v3.json, mobile-v3.json and backend-v3.json before parsing. For backend-v3.json only, I matched and removed exactly the fixed two-line npm command banner plus its surrounding newlines, then used the strict duplicate-key-safe JSON parser. I did not search for an arbitrary JSON substring. Parsed reports agree with the descriptor's exact test titles, projects, one successful attempt per test, zero retries/skips/flaky/failures, empty report errors, Playwright version and execution chronology. Desktop has 3 passed tests, mobile 1, and backend 6. The compiled voice raw TAP log independently matches its bound one-test passing summary and empty stderr.

Both screenshot files match their raw hashes, byte sizes, PNG dimensions and matching screenshot-producing Playwright project output directories. I visually inspected them. Desktop and mobile show separate First step and next step paragraphs, the inequality and nabla expressions rendered as math, and no visible math-error output or horizontal clipping in the captured panel. The mobile greeting is partly scrolled within the conversation region, which does not obscure the tested reply. These are panel screenshots; page-width and ordinary-click acceptance come from the passing source-bound browser assertions rather than from a claim of full-page visual coverage. Passing screenshots are written by the awaited screenshot call, not automatically attached to the Playwright result JSON.

This review consumes and verifies the actual runtime records and artifacts; I did not independently rerun the build, browser/backend sessions or compiled WebSocket session during this formal review. Earlier failed build-path and mobile runs remain failure records. I inspected the separate broader tooling-regression record of 164 release-governance passes with 11 historical fixture skips, plus 5 strict-JSON passes; those suites were not independently rerun here, and the historical skips are not revalidation of old Promotion contracts.

## Limits and remaining acceptance

The actual-T .local/pr301-admission/local-materialization.json records blocked-local, ENAMETOOLONG and fullMaterialization=false on the historical long integration path. I read and bound that receipt. I did not rerun, weaken or waive the guard. The final actual Ubuntu evidence-head and any authorized main checks must pass the unchanged full materialization checks before and after command execution.

No final E/main or remote required-check success is established by this review. The source-only CI success reported by the parent is not final T/E/main acceptance and was not independently fetched in this review. No live provider, microphone, speaker, Preview, deployment, production-health or real-user capacity acceptance is asserted. Browser/backend data and provider behavior were synthetic/mocked and loopback based. Every admission permission remains false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred.

This approval establishes only bounded eligibility of the exact reviewed S/T pair and its fixed runtime descriptor for the PR301 required-check evidence package. It does not authorize or claim merge, deployment, historical authority transfer, native content promotion or live operation.

Independent raw logs and verification receipts are retained under .local/pr301-admission/reviews/a11/: verification.json; gate-contract, types and provider-display stdout/stderr; and runtime-verification.json.
