# AI Tutor QA Implementation Report

- Date: 2026-05-15
- Session: S11
- Workstream: QA and release quality
- Scope: AI Tutor role differences, multilingual inputs, context authorization, frontend smoke, fallback privacy

## Executive Summary

Implemented automated QA coverage for the AI Tutor role matrix across guest, student, teacher, and parent states. The coverage uses the existing mocked DeepSeek/OpenAI-compatible harness, so it does not call live LLM providers or consume production credentials.

Result: Pass. `tests/e2e/ai-tutor-deepseek.spec.ts` now covers the requested guest gate, student/teacher authorized context, parent denied context, identity normalization, multilingual inputs, attachment behavior, frontend open/send/receive/close, graph rendering, and friendly fallback behavior.

## Coverage Added

| Area | Implemented coverage | Result |
| --- | --- | --- |
| Guest / not logged in | API accepts English, Traditional Chinese, Simplified Chinese, and mixed input but returns registration-required guidance without provider calls or personalized context. | Pass |
| Student | Existing and retained checks verify student dashboard/adaptive context, graph visualization, attachments, fallback handling, and privacy from teacher-only scopes. | Pass |
| Teacher | Existing and retained checks verify teacher support mode, teacher dashboard context, verified student profile/adaptive context, and no Teacher Chan identity confusion. | Pass |
| Parent | Added API check proving parent chat remains usable while student-dashboard, teacher-dashboard, teacher-student-profile, and adaptive-engine scopes are denied. | Pass |
| Frontend role smoke | Added UI smoke for guest plus student, teacher, and parent: panel opens, sends, shows thinking state, receives mocked reply, hides technical fallback text, and closes. | Pass |
| Language and identity | Added identity checks across student, teacher, and parent English/Chinese inputs; replies normalize to Professor Nova and reject stale Teacher Chan identity contamination. | Pass |
| Safety/privacy | Assertions cover no raw authorized snapshots for guests/parents, no candidate signatures, no technical LLM/provider errors in frontend fallback copy, and no restricted teacher/student profile leakage. | Pass |

## Checks Run

- `npm run type-check` - Passed.
- `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts --project=desktop-chrome` - Default port `3020` was already occupied, so the run was restarted with `PLAYWRIGHT_PORT=3037`.
- `PLAYWRIGHT_PORT=3037 npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts --project=desktop-chrome` - Passed, 24/24 tests in about 1.1 minutes.

## Files Changed

- `tests/e2e/ai-tutor-deepseek.spec.ts`
- `coordination/reports/2026-05-15-ai-tutor-qa.md`
- `coordination/session-logs/2026-05-15-S11.md`

## Residual Risks

- The QA run intentionally uses mocked LLM responses. It validates contracts, authorization, frontend behavior, fallback handling, and prompt/context shape, but not live provider latency or live model answer quality.
- Parent AI Tutor currently has no dedicated parent data scope. The QA treats denied child-dashboard/profile access as expected current behavior, not as a product decision that parent-specific context should never exist.
- Mobile role smoke was not added in this implementation pass; desktop Chrome coverage verifies the requested role/function matrix.

## Follow-Up Recommendations

1. Add a separate mobile Chrome smoke for the AI Tutor panel once the desktop role matrix remains stable.
2. If parent-specific AI context becomes a product requirement, define a new explicit parent-safe scope before changing the tests.
3. Run one manually approved live-provider smoke only after owner approval, using a low-risk prompt and no real student data.
