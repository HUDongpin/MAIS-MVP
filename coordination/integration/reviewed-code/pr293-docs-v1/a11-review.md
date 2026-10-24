# Independent A11 decision for exact PR293 documentation admission

Reviewer: /root/a11_pr293
Reviewed at: 2026-10-24T16:28:37.137Z
Result: approved-for-exact-documentation-required-check

I independently approve the exact frozen tooling commit c3736f9ccf62f9e5573d50a870618c4f791cb700, with source dfe90dbcfee1d6dd4a827d40a31af206604a0c90, for the bounded PR293 historical-documentation and owner-routing required-check adapter. No actionable issue remains from the source review. This decision is restricted to the hashes and evidence identified below.

## Exact binding verified

- Fixed reviewed base: b69384c4036fe347275b363768cd497c50c131b5
- Original documentation head: 3e554af94e14cefd689fb3a34e8c16046add2d95
- Source commit: dfe90dbcfee1d6dd4a827d40a31af206604a0c90
- Source tree: fe21a7a9fb2a364e66b59715626c7157d9ef754e
- Source inventory SHA-256: 93a42a7749d992c785fbb0612c04933bd5c6a278c1ca34e18b0c5f91aac19ae1
- Tooling commit: c3736f9ccf62f9e5573d50a870618c4f791cb700
- Tooling tree: 216c7a56436112b080b44c2d36a44a686827ec51
- Tooling inventory SHA-256: d7ba7d728720eee6bde58d7234c26031753d268faa5af09e4608217b9bcf59a2
- source-checks.json raw SHA-256: bf306f8d183575adbfb09bdab6f7919b88ecfe2dcde23f0f12b9328c9ca9fb5e

I freshly verified from actual Git objects that T is a direct child of SOURCE; SOURCE retains the ordered [DOCS_HEAD, BASE] parents; the source tree and exact 24-path inventory match their frozen values; and T changes exactly the four reviewed tooling paths. Every committed file and current working file matches the independently reviewed r2 bytes. The workflow equals the fixed baseline plus the exact bounded PR293 insertion. No replacement ref or shallow history was present.

| Tooling file | Raw SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | 376c8c0fe6ab823e6fc65e70baecc2a151efa6cd0dc08d16cbe2137b17901573 |
| docs/pr293-documentation-gate.md | 99692e2f5d5a5283a1ac1d092411de0c9a5426c03463582ffc11404fa685c9ab |
| scripts/promotion-docs-pr293.mjs | f2fd18e4e1dd5dca94a20d9ec7951c0c9cdbb5c4de278ff4393e9608eb034bb2 |
| scripts/promotion-docs-pr293.test.mjs | 9aedc5db966d9d752129c6da756ede86bed9ac23e4a0b4832e866a3b7b7897c2 |

## Independent verification consumed

The following tests were independently executed by this A11 reviewer on the identical r2 file bytes before T was committed. They were not rerun after the commit because the byte comparison proves no test, checker, workflow, source inventory, owner routing or native gate input changed. The source-checks.json values were freshly parsed, closed-schema compared, raw-hashed, and checked against these preserved independent results.

- New exact PR293 contract suite: 22 passed; 0 failed, cancelled, skipped or TODO. TAP was also accepted by the strict report parser. Log SHA-256: 9efe34650592a92a72b2c0a68c3742047c5aa090f5df7c5016452585487a9152.
- Contract test stderr: empty. SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.
- Selected owner-routing regressions: 3 passed; 0 failed, cancelled, skipped or TODO. Log SHA-256: 6546d68333d17701227862230e60c6da8fa5ef527912cf9186cc8f83457c0d51.
- Native owner package gate: valid=true, errors=[], owner-pathspecs valid=true, 42 resolution checks. Output SHA-256: 5d7715e07fd8571389db9888ca75cf115c15740b420ca9486a68f1620dbc0c47.

The independent logs are preserved outside the repository in /Volumes/Mars/MAIS-root-docs-closeout-20261024-01a16e91/reviews/A11/. Their hashes were rechecked when producing this decision. The producer's preserved generic workflow log reports 40/40 pass and was supporting evidence only, not an independently rerun result.

## Review scope and conclusions

The implementation fixes source parents/tree/inventory and the exact 24 paths; requires a direct four-path tooling child and a direct seven-file first-added evidence child; rejects dirty or aliased source, replacement/grafted/shallow history, unsafe checked blob modes, mismatched bytes and altered evidence ancestry; limits events to exact PR293 or its preserving two-parent main merge; and validates independent role/tooling/source/check bindings. The full checker additionally verifies complete tracked materialization before and after executing current tests and the native owner gate.

The independent tests cover wrong PR/repository/base/ref/head, extra tooling/source/evidence paths, historical workflow weakening, review identity/tooling mismatch, widened live permission, duplicate/unknown JSON fields, recorded failing tests, later evidence amendments, dirty state, sparse/index flags, replacement/graft/root aliases, admission symlinks, malformed/forged/skipped/truncated TAP and injected child environment variables. Static review also examined the imported materialization and duplicate-key JSON helpers, as recorded in the pre-freeze report.

The synthetic metadata fixtures establish validator behavior only. They are not independent approval evidence. This actual A11-authored report and its exact JSON decision provide my independent approval for the named T and source-check bytes. The prospective E has not yet been created or checked in this decision; its exact first-added composition, real event-bound full check and required GitHub checks remain to be validated after assembly.

This approval has liveAllowed=false. It transfers no content approval, historical authority, Preview/deployment authority, whole-pack acceptance or cleanup authority. It does not certify an already merged, published, deployed or live state. Repository source and Git were not mutated by this reviewer.
