# 2026-06-29 A08 Learning Event Throttle

Agent: A08 state and analytics lead, with narrow A12 learning-events API coordination, A06 visualization instrumentation impact, and A04 Practice answer-path verification.

Objective: throttle and batch high-frequency visualization learning events while keeping Practice answer attempts on their fast synchronous write path and ensuring optional LRS delivery cannot slow the local analytics response.

Plan:
- Add failing focused tests for high-frequency visualization event coalescing and non-blocking LRS delivery.
- Implement A08-owned analytics helpers and provider-side buffering for visualization slider, drag, and probe events.
- Adjust the A12-owned learning-events route so local append returns before optional LRS delivery.
- Verify with focused analytics/type checks where practical.

Intended files:
- `lib/learningAnalytics.ts`
- `lib/learningAnalytics.test.ts`
- `components/providers/AppProviders.tsx`
- `app/api/learning-events/route.ts`
- this session log

Scope guard: no staging, commits, branch changes, secret files, or unrelated dirty-tree cleanup.

Handoff:
- Added A08 analytics helpers to classify and coalesce high-frequency `visualization-slider`, `visualization-drag`, and `visualization-probe` events while leaving Practice answer events as immediate normal events.
- Wired `AppProviders` to buffer those visualization events, flush roughly once per second, and flush pending/buffered events on `visibilitychange`, `pagehide`, `beforeunload`, and provider cleanup while preserving the 100-event POST ceiling in chunks.
- Updated the A12 learning-events route so local analytics append responds immediately and optional LRS delivery runs in the background.
- Kept A04 Practice answer submission on `/api/attempts`; no Practice answer-path code was changed.

Checks:
- `npm run test:analytics` passed.
- `npx tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts` passed.
- `npm run type-check` was attempted and is still blocked by pre-existing dirty-tree errors in `lib/server/practiceAttemptStore.ts` and `lib/server/userStore.ts`.

Risks/follow-up:
- Full repo type-check needs the existing A12/A08 storage typing errors resolved before it can serve as a green gate for this slice.
