# Independent A23 review of PR276 frozen source and tooling

Reviewer: /root/a23_pr276_review.
Reviewed at: 2026-10-18T13:13:35.330Z.
Decision: approved-for-ordinary-code-required-check, limited to the exact S/T objects and A11 evidence identified below. This approves assembling the exact E evidence child for PR276. It is not a claim that E exists, that final required CI has passed, or that production has been deployed. The owner's separate release authorization remains subject to the protected release workflow.

## Exact reviewed objects

- Base B: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- Source S: a05d123e75139eeb36e0ca3b564652880fa38545; sole parent B; source tree c7b163a6958cf6fce846eed5570e1b76a35ee3f0.
- Tooling T: 15bfc5a0fb3e2ec8c35fec624aea5025ac8715bc; sole parent S; tooling tree ffb000bf5de6878a6cae12d1c35020450dcb99e2.
- Source inventory digest: b0b7fa498aedb5e3bfac3afcea151b28cafad448a7dcf6f1dd76e6f72c2d718a.
- Tooling inventory digest: cbe282ab50ee93e59c529e7dc3d5ed9968027b41de215823da0cfd97440e889e.
- Fresh source observation SHA-256: bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766.
- Source-checks SHA-256: e78017a1f63e7d0896cdf832d6b6b079cadf3e585b02021ca16600375320955e.
- Frozen checker SHA-256: 70b6e223ca55b34849d774b3abae10605ca27210cccd24371283feceaf8ac5ea.

I independently read the actual Git objects, source diff, frozen checker, unit tests, browser spec, workflow and documentation. I recomputed both inventories and verified the parent, tree, path, byte and file-mode bindings. S changes exactly the PedaNovaHomeHero component and selected PNG, both mode 100644. The component SHA-256 is 5e0eaa78369b7c163ee2f8086ae7f0f6e224711e93e52899f08c9e87edaa7b54; the PNG SHA-256 is d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889. T changes exactly the five closed tooling paths. The seven future E evidence files were absent at T. My final readback found T unchanged and the worktree clean.

## Contract review and resolved preparation finding

No unresolved contract finding remains. My preparation review identified that desktop cases originally hashed only the hidden CSS image without binding the visible img source. Frozen T fixes this: the browser spec returns currentSrc, resolves a Next image URL to its underlying asset or accepts a direct static URL, and requires equality with the original PNG whose response bytes are hashed. The canonical document-language assertions also match the application's region-qualified values. This conclusion comes from reviewing the frozen implementation and its fresh execution evidence, not from relabelling the preparation review.

The checker binds S to exactly one fixed baseline parent, the exact source tree and two-file inventory. T must be a direct child of S with the exact five tooling paths, tree and inventory digest. E must be a direct child of T that first-adds exactly seven regular evidence files. A future accepted HEAD must descend E and have its complete tree, including all file modes. Event checks bind the actual PR number 276 and fixed baseline; main pushes retain the baseline ancestry and evidence-tree conditions. Missing or re-added evidence, wrong parents, extra paths, changed runtime bytes, sparse or hidden materialization, bad review identities/hashes, expanded permissions and incomplete proof fail closed. Production bindings have no environment or CLI override; synthetic fixture replacements are confined to temporary test copies.

All 12 explicit prior-contract path/tree bindings match B. The 44 pre-existing workflow steps other than the selector remain unchanged, as do top-level triggers/permissions and job controls/environment. Seven PR276 steps are additive. The selector tests both existence and symlink presence before older markers and does not fall through after failure. The required job retains its name. Current browser/types checks, runtime observation, historical baseline evaluation, finalization and final verification remain mandatory; no continue-on-error or skip was introduced. The historical evaluator still runs against its own 03717842b19e8b8fa9a3a2dbecf1b359bb842233 baseline and ff709c0141ef8660604a20340b1c476bf2941f60 execution commit, with prior contracts and records intact.

## Fresh evidence independently consumed

I consumed the A11 evidence from /private/tmp/pr276-a11-review/frozen-T, read its actual launcher and descriptor-relative helper code, and independently recomputed every one of the 30 artifactHashes entries. I also verified the retained original hydration report, trace, error context, bounded reproduction report and preliminary v3 report against their five recorded hashes. I strict-parsed the authoritative JSON, cross-checked manifest/registry hashes and the canonical audit, and invoked the frozen production verifyTestRecords and verifyBrowserReport functions on the actual command records and raw output bytes. Both passed.

- Contract suites: 74 passed, zero failed, skipped, cancelled or todo; the original three suites are preserved. These temporary synthetic fixtures prove checker behavior and are not production admission.
- TypeScript: the exact noEmit, incremental=false command exited 0, with empty stdout and stderr.
- Browser: the exact committed spec ran through one new isolated production build. All 31 cases passed on their first attempt, with zero skips, retries, flakes or unexpected results. The raw browser stdout SHA-256 is 18eb3e801e1fbaa0c41fd395671479e5648ec54208e82cc419d18befba31fc26. The cases cover three locales at nine sizes, both breakpoint boundaries, two dark-mode sizes, keyboard focus/Enter and touch navigation, visible image source/bytes, text/layout and strict page/console/HTTP/asset error assertions. This is local Chromium evidence, not physical-device or live-user acceptance.
- Fresh A11 observePreparation at T matches the frozen observation and canonical audit registry. Comparing the retained previous observation with this one changes only six expectedRuntimePolicy fields, including covered-file count 3886 to 3887 and relevant digests; the canonical audit and all other fields are unchanged. Old observations were not overwritten.
- The A11 decision SHA-256 is eeca2624d5d3cd3aaf7eedd2990e552a1819523b82f11e5ebe93d69bd918c6e6 and its report SHA-256 is 803888f5936c78a22d7284709980d74ab7af8610451774509495656b777d55ee. Its exact schema, S/T/checks/report bindings and non-live decision were independently checked. This report is my separate A23 judgment.

## Materialization evidence and retained limitations

The native absolute-path materialization helper and initial native historical-manifest read failed locally with macOS ENAMETOOLONG. I inspected their retained errors and verified their hashes, respectively 1b9d511ed6210df34d0fe84169b693cdf7301584f3897df61289259e1413d214 and cd7ee0ad8a546bf23de914ddf99f7660c645d8ca20e583956645a21f191f859f. Neither is reported as a native pass.

The inspected descriptor-relative verifier traverses each directory and file with O_NOFOLLOW, checks regular type and executable mode, recomputes Git blob hashes, checks stable fstat, all-H index flags, clean status and unchanged HEAD. A11's before/after inventories are identical across 11,684 tracked files and 1,027,687,792 bytes. I independently reran that unchanged helper at 2026-10-18T13:07:47Z to 13:07:56Z and obtained the same clean T and inventory digest 30589389ac793a051e071f097653ada512e15f507d1e4b5dacfa3c52f89e30cc. The helper's own producer label remains A11; this statement records my separate invocation and inspection. Its script SHA-256 is 74d821c3b6d9db5fb0b69450004522004ee7fe89b13e328918ca752912fee16b. The hash-verified descriptor-relative historical-manifest read enabled the unchanged observation function to run against the actual checkout. These local checks do not replace native Linux CI.

The original preparation v2 English 768x1024 case recorded one React error 418 during initial hydration, before language interaction. Its report SHA-256 is 357d772cb7c9bd3ac289323b4c91c1d15f0a3aab0bbef3116457d4c7d9c18ddc. The focused three-case run, bounded 60 fresh-context diagnostic, later preparation run and fresh T run did not reproduce it. No root cause was established, source repair was not claimed, and non-reproduction is not proof of absence. This remains a recorded reliability limitation. A recurrence in required CI must remain a failure; this review provides no permission to suppress errors or accept a retry/flaky result.

## Admission boundary

Final E and a subsequent merge must still pass the real event-bound Linux required check: native full-tree materialization, fresh current-head browser/types and observation, the unchanged historical non-live evaluator, and final proof verification. This source/tooling approval does not substitute for those results. Any change to reviewed source, tooling, evidence or base must satisfy the contract's corresponding binding and review requirements. In-repository reviewer identifiers and hashes bind evidence content; they are not cryptographic authentication of an external approval.

Permissions remain ordinaryCodeEligible=true; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false. No curriculum promotion, historical-authority transfer, deployment acceptance or cleanup is granted by this report. I made no repository, Git, credential or production changes and authored only my own A23 review files.
