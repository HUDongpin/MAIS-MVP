# PR276 homepage ordinary-code admission

The owner authorized a strict PR276 admission and independent review after the existing PR274 contract rejected the new homepage tree. This contract is additive: previous checkers, tests, admissions, and historical records retain their original scope and bytes.

## Frozen source

- Base B: `656ac319b2ad5812d31ad952cbb18430b5e58065`.
- Source S: `a05d123e75139eeb36e0ca3b564652880fa38545`, with exactly `[B]` as its parents.
- Source tree: `c7b163a6958cf6fce846eed5570e1b76a35ee3f0`.
- Source inventory digest: `b0b7fa498aedb5e3bfac3afcea151b28cafad448a7dcf6f1dd76e6f72c2d718a`.
- Current source observation SHA-256: `bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766`.
- Pull request: [276](https://github.com/HUDongpin/MAIS-MVP/pull/276).

S changes exactly `components/home/PedaNovaHomeHero.tsx` and the owner-selected `components/home/brand-assets/pedanova-home-background-20260809-owner-selected-white-stylus.png`. The PNG SHA-256 is `d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889`. It adjusts responsive image/copy placement and retains the existing words, type treatment, colors, CTA, and accessibility. No curriculum or candidate content is promoted.

## Exact source, tooling and evidence chain

T is a direct child of S and changes exactly five tooling paths: this document, the new checker and unit test, the additive Promotion workflow change, and `tests/e2e/home-selected-hero.spec.ts`. E is a direct child of T and first-adds exactly seven files under `coordination/integration/reviewed-code/pr276-v1`: admission, source observation, source checks, and independent A11/A23 report/decision pairs. Reviewers bind the actual committed S/T, inventories, observation, checks and report bytes. Preparation reviews cannot be reused as frozen-T approvals.

The final candidate descends E and must have the identical complete tree. PR events bind number 276 and exact B; main push events bind ancestry and the identical evidence tree. Unknown files, changed bytes/modes, wrong parents/base/PR, re-added evidence, dirty or hidden materialization, altered prior contracts, forged reviews and expanded permissions fail. There is no environment/CLI override.

The new marker is checked before PR264 with both existence and symlink checks. A present invalid marker cannot fall through to another mode. The required job name, old execution legs, old checkers/tests/evidence and historical evaluator remain intact.

## Fresh execution and independent review

The current-head check runs nonincremental TypeScript and the committed homepage browser spec using the existing isolated Playwright production server, synthetic/offline provider configuration, bundled Chromium, one worker and zero retries. It requires exactly 31 first-attempt passing cases: three locales at nine viewport sizes (including 639/640 and 1023/1024), two dark-mode sizes, keyboard focus/Enter and phone touch navigation. The spec verifies actual visible-image decoding and original PNG bytes, text containment and non-overlap, active-layer geometry, header/hero/footer adjacency, wording/color/weight, accessibility and `/login`. Page/console errors, HTTP failures, failed assets and non-abort request failures are rejected. Known navigation prefetch cancellation is not treated as a page failure.

The checker verifies all checked-out source bytes, modes and index flags before and after a newly computed runtime/content observation. The observation must equal the newly frozen source observation and canonical audit. The unchanged historical evaluator and replay run on their own historical baseline, not on current source. Finalization rechecks all proofs and only then emits a passing ordinary-code decision.

The existing absolute-path materialization helper remains unchanged. If macOS cannot traverse a deeply nested historical path, retain the native error and use an independent descriptor-relative readback for local review. That local receipt does not replace successful native Linux CI.

Run the new unit suite alongside the unchanged PR259, PR270/PR271 and PR264 suites. Synthetic temporary repositories test both acceptance and rejection; their bindings/review records never populate production evidence.

All admission permissions except `ordinaryCodeEligible` remain false, including live, integration, preview, deploy, whole-pack acceptance and historical authority transfer. The owner's separate merge/deploy instruction is consumed only after genuine final-head checks and the protected production workflow's own gates. A local build or admission decision is not live publication. In-repository review identities/hashes bind evidence bytes; they are not cryptographic proof of an external human approval.
