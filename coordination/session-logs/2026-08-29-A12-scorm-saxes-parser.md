# A12 SCORM Saxes Parser Session

- Date: 2026-08-29
- Agent: A12 backend/API platform
- Worktree: `.worktrees/a12-a13-scorm-import-current-main-20260829`
- Branch: `codex/a12-a13-scorm-import-current-main-20260829`
- Baseline: `fc2e6ed962c6f55955e5f3861f7914557f96d0f6`
- Target PR: pending
- Expected closeout: 2026-08-29

## Declared slice and plan

- Add differential parser and full-import regressions before implementation.
- Replace the handwritten SCORM manifest parser with a bounded namespace-aware `saxes` adapter.
- Restrict SCORM structural namespaces and attributes, preserve deterministic source order, and replace linear dedupe with ordered sets.
- Bind the direct dependency and exact lock records in release governance.
- Run the assigned focused and release checks, self-review the exact diff, stage exact authored paths, and commit without pushing.

## RED evidence

- Initial differential command: `node --import tsx --test lib/courseIntegration/xml.test.ts lib/courseIntegration/importer.test.ts`
- Observed result before dependency or production edits: exit 1; 64 tests; 56 passed; 8 expected failures.
- Differential failures: uppercase hexadecimal character reference, comment ending in a hyphen, undeclared element/attribute prefixes, multiple/trailing-colon QNames, duplicate expanded-name attributes, and full-ZIP arbitrary namespace impersonation.
- Expanded pre-implementation RED: exit 1; 80 tests; 62 passed; 18 expected failures, including frozen namespace metadata and independent structural namespace policy cases.
- Self-review RED: exit 1; 82 tests; 79 passed; 3 expected failures for innocent `xmlns:*` declaration names and inert `<!ENTITY` text inside comments/CDATA.
- Independent SPEC review found that the exact `saxes`/`xmlchars` lock records were governed but the direct JSZip archive dependency was constrained only by its root `^3.10.1` range. The focused guard test was added first and failed as expected (exit 1, 0 passed, 1 failed) because `assertFrozenJsZipLockRecord` did not yet exist.
- Independent quality/security review reproduced two archive-integrity gaps: corrupted non-manifest payload bytes were accepted because only the manifest was decompressed and CRC-checked, and Info-ZIP `0x7075` Unicode Path extras bypassed the raw-name path policy through JSZip's effective-name handling.
- Quality-remediation RED: `node --import tsx --test lib/courseIntegration/importer.test.ts` exited 1 with 52 tests, 50 passed, and 2 expected `Missing expected rejection` failures before any production edit.

## Changes

- Replaced the handwritten parser with `SaxesParser({ xmlns: true, fragment: false })` and default throwing behavior.
- Enforced XML 1.0 declaration/UTF-8 declaration policy, immediate DOCTYPE rejection, bounded input/depth/elements/attributes/text/work, partial-tree discard, and deeply frozen QName/attribute metadata.
- Added case-sensitive SCORM structural and attribute namespace allowlists for the two supported IMS CP and two supported ADLCP URIs while preserving legacy unnamespaced manifests.
- Preserved Saxes well-formedness plus explicit SCORM namespace policy as the demonstrated boundary; this is not XML-schema, SCORM conformance, runtime, or LMS validation.
- Replaced file/dependency linear dedupe with insertion-ordered `Set` handling and covered a 19,999-element source-order fixture.
- Added direct runtime `saxes@^6.0.0`, exact root-lock records, and exact `jszip`/`saxes`/`xmlchars` release-governance assertions. The JSZip guard now freezes version, resolved URL, integrity, license, and dependency map, with a mutation regression proving drift is rejected.
- Added one shared bounded ZIP-extra TLV policy for local and central headers. Malformed TLVs fail generically, and every `0x7075` Unicode Path field is rejected before JSZip can select or sanitize an alternate filename identity.
- Added sequential bounded decompression, exact uncompressed-size validation, and CRC-32 verification for every non-directory entry before an import report can return. The implementation uses no concurrent all-entry expansion and retains no non-manifest payload.
- Closed quality-review test gaps with referenced and unreferenced STORE/DEFLATE corruption fixtures plus a positive unknown local-and-central TLV whose payload contains `75 70` bytes without being a `0x7075` field.

## Verification

- Focused course integration/API suite: 100/100 passed, including clean STORE acceptance, corrupted referenced and unreferenced STORE/DEFLATE rejection, and valid unknown-TLV acceptance.
- Focused importer suite after quality remediation: 54/54 passed.
- `npm run type-check`: passed.
- `npm run check:imports`: passed.
- `npm run test:imports`: 7/7 passed.
- `npm run test:release-governance`: 92 passed, 0 failed, 11 skipped (103 total), including the JSZip lock-record mutation regression.
- `npm install --package-lock-only --offline --ignore-scripts --dry-run`: passed; lock already up to date.
- Source invariants: Saxes options exact; obsolete handwritten parser symbols absent; no `additionalNamespaces`, `resolvePrefix`, entity-table setup, or custom error handler; dedupe sites use ordered sets.
- `git diff --check` and `git diff --cached --check`: passed before implementation commit `2a9c84f5d14396d6eadf663156d231b8e1fa630a`.

## Residual boundaries and closeout

- `npm install` reported five repository audit findings (one moderate, four high); this session did not run an audit-fix mutation or attribute those findings to Saxes.
- No push, PR, merge, deploy, live LMS operation, or package execution was performed.
- Status at this log revision: both quality/security findings are locally remediated and GREEN; repeated independent SPEC review and then independent quality/security re-review remain required before branch closeout.
- Dirty-state final action: exact reviewed implementation, governance, and archive-integrity remediation commits; no uncommitted product or evidence state is intended at handoff.
- Worktree lifecycle action: retained for parent review; no push.
