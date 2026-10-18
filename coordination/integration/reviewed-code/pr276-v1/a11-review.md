# Independent A11 review of PR276 frozen source and tooling

Reviewer: /root/a11_pr276_review. Reviewed at 2026-10-18T13:10:27.183Z.

Decision: approved for ordinary-code required-check eligibility, limited to the exact S/T composition below and the genuine checks recorded here. Final E and merge event acceptance still require the unmodified native Linux CI checker, historical verification and Shadow. This review does not authorize deployment or promote any curriculum content.

- B: 656ac319b2ad5812d31ad952cbb18430b5e58065
- S: a05d123e75139eeb36e0ca3b564652880fa38545; source tree c7b163a6958cf6fce846eed5570e1b76a35ee3f0. S has exactly B as its parent.
- T: 15bfc5a0fb3e2ec8c35fec624aea5025ac8715bc; tree ffb000bf5de6878a6cae12d1c35020450dcb99e2. T has exactly S as its parent.
- Source inventory digest: b0b7fa498aedb5e3bfac3afcea151b28cafad448a7dcf6f1dd76e6f72c2d718a
- Tooling digest: cbe282ab50ee93e59c529e7dc3d5ed9968027b41de215823da0cfd97440e889e
- Fresh observation SHA-256: bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766
- Source-checks SHA-256: e78017a1f63e7d0896cdf832d6b6b079cadf3e585b02021ca16600375320955e

S changes exactly the owner-selected image and PedaNovaHomeHero component. I independently reviewed the diff and selected desktop, phone and tablet screenshots. The source retains wording, localized definitions, typography classes, colors, CTA treatment and /login destination, and decorative-image accessibility. The desktop aspect and lowered copy address the requested placement; smaller breakpoints provide separate photo and copy regions. No confirmed source defect remains from that review.

T contains exactly the five assigned tooling paths. I reviewed the additive workflow, exact source/tooling/evidence parent and tree checks, preserved historical contracts, strict reviewer/schema/hash bindings, and the real browser spec. My two draft findings were corrected: document language now uses the expected region-qualified tags, and the visible desktop image is bound to the same original bytes as the mobile image. The final spec includes both 639/640 and 1023/1024 breakpoint pairs, three locales, dark mode, text containment and non-overlap, visible asset decode/hash, header/hero/footer adjacency, keyboard focus/Enter, touch activation and strict page/console/HTTP/asset failure handling. Prior checker and evidence bytes remain preserved.

Fresh independent execution at committed T:

- Four contract suites: 74/74 passed, 0 failed/skipped/cancelled, 2026-10-18T12:59:55.108Z to 2026-10-18T13:02:55.802Z.
- Original nonincremental TypeScript command: exit 0, 2026-10-18T13:02:55.804Z to 2026-10-18T13:03:49.762Z.
- Original browser command: one new isolated production build followed by 31/31 first-attempt passing cases, 0 skips/retries/flaky/unexpected results, 2026-10-18T13:04:59.373Z to 2026-10-18T13:07:41.950Z. The production verifyTestRecords and verifyBrowserReport functions accepted the raw outputs.
- Independently recomputed observePreparation at T equals the frozen observation and canonical audit registry.
- Before and after, all 11,684 tracked regular files, modes and Git blob hashes matched T via descriptor-relative O_NOFOLLOW reads; index flags were all H, Git status clean, HEAD unchanged, and the complete inventory digest was identical. The run finished with no listener on its owned port 3396.

The original preliminary v2 React418 failure is preserved. It occurred on the initial 768x1024 English page load before language interaction and represented a host-node hydration mismatch. It was not reproduced during my bounded 60 fresh-context CDP navigations or this fresh-T 31-case run. No root cause was established and no app fix was made; I do not claim it fixed. This is a retained reliability limitation, not permission to suppress the assertion or accept a retried/flaky CI result. A recurrence in required CI must block acceptance and be diagnosed.

The native absolute-path materialization helper and initial native historical-manifest read both failed with macOS ENAMETOOLONG; their exact raw errors are retained. Local independent byte readback and a descriptor-relative, hash-verified read of the historical manifest enabled the unchanged observePreparation function to run against the actual root. These local checks do not replace successful native Linux CI.

Raw logs, exact commands/timestamps/hashes, scripts, inventories and observation receipts are in /private/tmp/pr276-a11-review/frozen-T and bound by source-checks.json. The original preparation failure and bounded diagnostic are referenced there by exact paths and hashes. Only this A11 decision is authored by this reviewer; no A23 decision is implied.

Permissions: ordinaryCodeEligible=true; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false.
