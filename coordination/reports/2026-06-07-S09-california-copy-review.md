# S09 Review: California English, Traditional Chinese, And Simplified Chinese Copy

- Date: 2026-06-07 Asia/Hong_Kong
- Session: S09 copy/accessibility gate artifact, prepared in the owner-requested cross-session release closure pass
- Scope: California public naming, registration/practice copy, generated lesson seed trilingual copy, and Simplified Chinese audit status

## Decision

`PASS_FOR_CALIFORNIA_MATH_PRACTICE_BETA`

`DO_NOT_UPGRADE_PUBLIC_NAME_BEYOND_BETA`

The public naming guardrail is now consistent with the current release evidence: California remains `California Math Practice Beta` in public app surfaces checked in this pass.

## Copy Fix Applied

- `app/register/page.tsx` no longer strips `Beta` from the selected California publisher label.
- This closes the public-copy risk where the registration step could display `California Math Practice` while other surfaces correctly said `California Math Practice Beta`.

## Review Findings

- English public copy describes standards-aligned practice and diagnostics, with lesson content still in progress.
- Traditional Chinese and Simplified Chinese public copy preserve the beta boundary and do not claim full curriculum launch.
- Generated California lesson seeds have English, Traditional Chinese, and Simplified Chinese in block titles/content/items for the audited seed layer.
- Teacher-guide copy explicitly warns that any label beyond `California Math Practice Beta` needs teacher review across all three language variants.

## Checks Run

- `npm run audit:zh-hans:strict`: passed with 0 critical issues, 0 warnings, 3970 existing advisories.
- California naming scan across `app`, `components`, `data`, `lib`, and `tests/e2e`: passed with no forbidden `California Curriculum`, no `selectedPublisherLabel.replace(...)`, and no public upgrade phrase found.
- Read-only California lesson seed copy audit: passed with 0 trilingual missing-copy issues.
- Targeted S11 Playwright California E2E: passed, including visible `California Math Practice Beta` in student surfaces.

## Caveats

- Existing global Simplified Chinese advisories remain broad project cleanup work; they are not California release blockers because the strict audit reports no critical issues.
- Final non-beta naming still needs owner/release approval after full curriculum readiness, not copy-only approval.
