# 2026-06-07 S12 Forum Copy And Accessibility Review

## Scope

- Surface reviewed: `/forum`, `components/forum/ForumWorkspace.tsx`, `data/forum.ts`, and `tests/e2e/class-forum.spec.ts`.
- Reviewer context: S12 executed this scoped forum review because the forum backend/API goal included the prior S09 copy/accessibility gap. This is a forum-slice final pass, not a full-site terminology audit.

## Evidence Checked

- `ForumWorkspace` renders all new user-facing controls through localized `{ en, zh, zhHans }` copy.
- The forum page uses the authenticated account role and does not expose the old "Posting role" spoofing control.
- Form controls have visible labels and stable names:
  - `thread-kind`
  - `forum-subject`
  - `forum-title`
  - `forum-body`
  - `forum-tags`
  - `forum-class-space`
  - `forum-live-response`
  - `forum-reply`
- Status and error messages use `role="status"` plus `aria-live="polite"`.
- Interactive mode/filter controls expose selected state through `aria-pressed`.
- User-generated discussion text uses `break-words` to reduce overflow risk in compact layouts.
- The formal forum E2E asserts that `/forum` uses the real API and that the old `Posting role` label is absent.
- `rg` confirmed no forum UI or route code reads/writes browser `localStorage`; remaining old forum storage helpers were removed from `lib/forum.ts`.

## Copy Review

- Pass: English, Traditional Chinese, and Simplified Chinese strings are present for the new forum labels, helper text, statuses, and moderation controls.
- Pass: "Class space", "Server-checked class access", "Report concern", "Hide for review", "Close thread", and "Review queue" accurately describe the current server-backed MVP behavior.
- Pass: The copy does not promise broad production moderation workflows beyond the implemented report/review/audit behavior.
- Follow-up for independent S09/global terminology owner: if the forum ships alongside other teacher-console moderation surfaces, S09 should align whether the preferred Chinese term is consistently `舉報/举报`, `報告/报告`, or `提交審核/提交审核` across the full product.

## Accessibility Review

- Pass: The primary composer, class selector, thread list, thread detail, reply form, and live-response form can be discovered by accessible labels or section labels.
- Pass: Button text is explicit enough for screen-reader command lists; no icon-only controls were introduced.
- Pass: Disabled states are used for unauthorized or locked actions, while server routes still enforce the same rules.
- Pass: Async post/report/error feedback is announced through live regions.
- Pass: Focus styling is applied through the project `focus-ring` utility on interactive controls.
- Follow-up for future S09/S11 full sweep: add keyboard-flow screenshots or an accessibility snapshot in the broader E2E suite once disk space allows full regression artifacts.

## Decision

- Forum-slice copy/accessibility status: pass for MVP release gate.
- Residual risk: this does not replace a full-product S09 terminology pass across all current teacher/student/parent surfaces.
