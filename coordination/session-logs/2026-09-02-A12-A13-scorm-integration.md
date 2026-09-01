# A12/A13 SCORM current-main integration

- Owner lanes: A12 backend/API platform; A13 teacher workflow authorization boundary.
- Target PR: pending.
- Created: 2026-09-02 HKT.
- Expected closeout: 2026-09-02 HKT.
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-a12-a13-scorm-integration-20260902`.
- Branch: `codex/a12-a13-scorm-integration-20260902`.
- Exact base: live `main` and live `origin/main` at `be92640f4bb8933ed8a99ed7c1ea604428c6a56f` when work began.
- Read-only source: local and live remote `codex/a12-a13-scorm-import-current-main-20260829` at `d9bc31dd71f39d73062a8c3d9d118fd7319381be`; its 11 feature commits begin at `911c8b6c360f7dbaf1d13eaa9b1db87f65f84697` from historical base `baca84e77abae1e16cfd53d497c6f7ee734d4679`.
- Git binding note: repository-wide `core.worktree` pointed at an unrelated temporary promotion-review checkout. Every authoritative Git operation for this session used the linked gitdir `/Volumes/Starship/MAIS-MVP/.git/worktrees/MAIS-a12-a13-scorm-integration-20260902` together with the exact worktree path.

## Scope and plan

- Port the final source-branch SCORM API and `lib/courseIntegration` state onto current main without importing unrelated historical-base diffs.
- Preserve the current-main package, lock, release-governance, Next, PostCSS, YAML, and security-version state; add only direct `jszip` and `saxes` records plus the transitive `xmlchars` lock record.
- Keep the route teacher-authorized and deterministic; parse uploaded multipart/ZIP/XML content as untrusted static data only.
- Add no provider configuration or call, LMS write, course publication, enrollment mutation, roster access, grade passback, SCO execution, LTI launch, or live course-package import.

## TDD evidence

- RED command: `node --import tsx --test lib/courseIntegration/diff.test.ts lib/courseIntegration/importer.test.ts lib/courseIntegration/model.test.ts lib/courseIntegration/readiness.test.ts lib/courseIntegration/sideEffects.test.ts lib/courseIntegration/xml.test.ts app/api/teacher/course-imports/handler.test.ts`.
- RED result: 0 passed, 7 failed at the file level because live main had no `handler`, `diff`, `importer`, `model`, `readiness`, or `xml` implementation; the static side-effect test found no production modules. This was the expected feature-missing failure before implementation.
- Initial GREEN result after porting the final implementation and dependency records: 100 passed, 0 failed.

## Claim ceiling

This package can prove only static, local behavior for the exact committed source: bounded teacher-authorized multipart intake, archive/XML safety checks, provider-neutral deterministic normalization/version diff/readiness, executable-resource blocking metadata, and absence of course-integration filesystem/network/code-execution surfaces covered by the tests. It does not prove SCORM conformance, SCO runtime behavior, LMS compatibility, deployed route behavior, publication, enrollment, roster sync, grade passback, provider acceptance, LTI behavior, or learner-visible readiness.

## Verification and handoff

- Focused SCORM and route tests: final fresh GREEN, 100 passed and 0 failed.
- Negative archive/XML/side-effect coverage: included in the focused suite. It covers missing manifest, traversal, absolute paths, duplicate canonical paths, encrypted entries, symlinks, forged directories, entry/package/file expansion bounds, contradictory ZIP declarations, signed and unsigned data descriptors, corrupt referenced and unreferenced payloads, Unicode-path and malformed extra fields, DOCTYPE/ENTITY, malformed XML relationships/syntax/namespaces, executable resources, external references, deterministic version identity/diff, teacher authorization, bounded multipart intake, and static no-side-effect surfaces.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: passed, 86 passed and 11 intentional skips. The candidate Git-index assertions preserve current-main scripts and security versions while freezing direct JSZip/Saxes records.
- `npm run test:release-governance`: 91 passed, 2 failed, 11 skipped. Both failures are unchanged `scripts/release-build-gate.test.mjs` assertions that compare a decoded filesystem path with the URI-encoded Chinese worktree path. The candidate-specific governance assertions passed; the unrelated A22-owned path harness was not changed.
- `npm run type-check`: passed. An earlier run showed unresolved local `saxes` resolution because this worktree inherited a shared `node_modules` symlink; an ignored task-local dependency overlay resolved the installed direct dependency without a tracked config change.
- `npm run build`: passed for Next.js 15.5.23 and generated the `/api/teacher/course-imports` dynamic route. This is buildability evidence only.
- `git diff --check` and `git diff --cached --check`: passed.
- Implementation commit: `47a2d4a5472b4d43307eb8997121370569654c6a`.
- Self-review: all 18 feature production/test files match the source branch's final blobs exactly; the three current-main integration files (`package.json`, `package-lock.json`, and `scripts/release-governance.test.mjs`) contain only the required JSZip/Saxes dependency and lock/governance additions. No historical promotion, visualization, or source-session changes were imported.
- Session decision: `DONE_WITH_CONCERNS` because the assigned Unicode worktree path leaves the unchanged combined A22 release-build harness at 91 passed, 2 path-encoding failures, and 11 skips; all candidate-specific checks, type-check, and build passed.
- Dirty state final action: reviewed commits.
- Worktree lifecycle action: retained clean for pending PR/review; no PR, merge, deployment, or cleanup was performed.
- Final handoff commit and ordinary upstream push: pending at the time this log entry was written.

## Teacher quality-review remediation

The independent Teacher review identified missing semantic-diff, amplification, XML Base, extension-namespace, ZIP host-node, and API-admission boundaries. The remediation remains inside `lib/courseIntegration/**` and `app/api/teacher/course-imports/**`; it does not modify shared `lib/server/authRouteGuards.ts`.

- Canonical course extensions now bind a deterministic aggregate digest for every non-manifest asset and a bounded digest/count for unsupported extension or sequencing subtrees. The ordinary canonical diff therefore reports asset-byte and unsupported-semantic changes without treating ZIP timestamps/compression metadata as course semantics.
- Identifiers, titles, unique warnings, and final serialized reports have explicit fail-closed limits. Warnings are deterministic and deduplicated, with one bounded truncation summary.
- Hierarchical `xml:base` is resolved only as package-relative canonical paths; external, absolute, encoded-separator, and traversal bases fail closed.
- Core namespace validation is contextual: expected-position namespace impersonation remains rejected, while LOM/vendor extension subtrees with overlapping local names are retained as unsupported-semantic digests instead of being misclassified as core.
- ZIP host 19 uses Unix-like type interpretation. Symlinks and FIFO/device/socket special nodes fail closed before decompression.
- SCORM schema/version text and ADLCP namespace/type signals must be strict and mutually consistent.
- Blocked executable reverse attribution compares canonical archive paths case-insensitively.
- A course-import-owned admission controller consumes hashed user and IP rate-limit keys, caps per-user/per-IP concurrency, links request abort to a 20-second deadline signal, and runs after authentication/expected-user/teacher checks but before content-type or body access. Multipart reads race stalled streams against that signal, the importer observes the same signal, and the lease is always released.

Remediation TDD:

- RED 1: 111 focused tests produced 100 pass and 11 expected failures covering every Teacher P1/P2/P3 gap.
- RED 2: a dedicated stalled-body test failed at 150 ms because the original reader could not be interrupted by the admission deadline.
- GREEN: final focused suite passed 114/114, including stalled-body cancellation, rate/concurrency/deadline admission, asset/sequencing diff, XML Base, LOM/extensions, amplification caps, Host 19 special nodes, strict versioning, and case-insensitive attribution.

Fresh checks after remediation:

- `node --import tsx --test ...courseIntegration... handler.test.ts`: 114 passed, 0 failed.
- `tsc --noEmit --incremental false`: passed.
- `npm run build`: passed on Next.js 15.5.23; `/api/teacher/course-imports` remains a dynamic server route.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 86 passed, 0 failed, 11 intentional skips.
- Final combined `npm run test:release-governance`: 91 passed, 2 failed, 11 skipped. The same two unchanged A22-owned Unicode-path assertions compare decoded physical paths with percent-encoded `import.meta.url` paths; all candidate-specific governance assertions passed. The now-reviewed A22 fix exists on a separate branch and was not copied into this SCORM slice.
- Working/staged `git diff --check`: passed. Exact remediation commit/remote identity and post-push clean proof remain pending.

The claim ceiling is unchanged: this is local static-import, admission, test, and build evidence only. It is not SCORM conformance, SCO runtime, LMS compatibility, provider acceptance, persistence/publication/enrollment/grade/roster behavior, deployment, or live evidence.

## Post-fix review round two

The second independent review found four remaining implementation gaps and one warning-regression quality gap. The repairs stay within the existing course-import handler/importer and focused tests; `lib/server/authRouteGuards.ts`, A22 Unicode-path files, providers, persistence, and live integrations remain untouched.

- Unsupported attributes on core structural elements and accepted vendor attributes now join extension/sequencing roots in one bounded deterministic semantic-loss projection. Only `rootCount`, `attributeCount`, and SHA-256 enter the canonical extension; raw unsupported values do not. Element paths and sorted expanded attribute names make placement and value changes visible while ignoring XML attribute source order. Because the fixture's manifest `version` and resource `type` are intentionally not modeled, otherwise-valid reports now honestly carry the unsupported-semantic warning.
- Package-relative references now resolve through RFC 3986 base-URI semantics. A base ending in `/` remains a directory; a base such as `xml:base="package"` is a file base whose final path segment is replaced by the next relative reference. Existing traversal, absolute/scheme, encoded-separator, backslash, query/fragment-on-base, and canonical-path rejection remains fail closed.
- The route now races the import promise against the admission abort signal even when an injected importer ignores that signal. A deadline produces the stable private 408, the `finally` releases the lease immediately, and a following same-user request can acquire capacity. Late importer rejection remains observed rather than becoming unhandled.
- Version detection collects every supported core `metadata/schema/schemaversion` declaration. Empty, unsupported, cross-version, cross-metadata, and distinct 2004-edition duplicate declarations fail closed instead of trusting the first occurrence.
- The warning-cap regression now creates distinct resource source IDs, proves multiple distinct warnings were admitted, and requires `WARNING_LIMIT_REACHED`; it no longer passes merely because deduplication collapsed twenty identical-source warnings.

Round-two TDD evidence:

- Initial RED selection: five tests, four expected production failures and one passing warning-quality correction. Failures were an empty canonical diff for unsupported attributes, directory-style handling of no-slash `xml:base`, a handler that did not return within 150 ms when the importer ignored abort, and acceptance of conflicting duplicate metadata/version declarations.
- A malformed first attribute fixture was corrected before it was counted as RED; the authoritative attribute RED failed specifically because the canonical diff was empty.
- Additional RED/GREEN: `2004` plus `2004 4th Edition` duplicate declarations initially passed because both collapsed to the same major version; normalized declaration-text consistency now rejects them.
- Final focused GREEN: 118/118 course-integration and teacher-handler tests passed with zero fail/skip/cancel/todo.

Fresh round-two verification:

- `./node_modules/.bin/tsc --noEmit --incremental false`: PASS.
- `npm run build`: PASS on Next.js 15.5.23, including the dynamic `/api/teacher/course-imports` route and all 202 generated route entries; only the existing extended-tsconfig and edge static-generation warnings appeared.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 86 passed, 0 failed, 11 intentional skips.
- Working diff check: PASS. Final exact staging, commit, remote readback, and clean proof remain pending at the time this entry is written.

The evidence remains local and static-only. It does not establish SCORM conformance, SCO runtime/sequencing execution, LMS/provider compatibility, persistence, publication, enrollment, grades, roster behavior, deployment, or live behavior.
