# A08/A11 session privacy UX repair

## Session identity

- Owner lanes: A08 shared provider/session state semantics and A11 focused
  browser regression coverage.
- Branch: `codex/a08-a11-session-privacy-ux-20260828`.
- Worktree:
  `/Volumes/Starship/MAIS-MVP/.worktrees/a08-a11-session-privacy-ux-20260828`.
- Baseline: protected `main` commit
  `fb7234a8f17563467edad4fa318cc8602d080741`, tree
  `f072812bcdb8e7c341cb823454d00800fd61d7f6`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after review, CI, merge, exact-main deploy,
  and production login/foreground verification.

## User-visible defect and reproduction

After a successful Student Shirleen login, an ordinary browser `blur` event
reproduces the screenshot exactly: a full-screen `Verifying your account`
privacy gate replaces the dashboard. Returning focus requests
`/api/auth/session-state?includeLessonEntry=false`; a 200 response removes the
gate. The screenshot was created by the macOS screenshot UI, which also takes
focus from the browser. This is a frontend foreground-policy defect, not
evidence of account disclosure, provider failure, or a legal Privacy/Terms
prompt.

## Accepted behavior contract

- Ordinary blur, screenshot capture, app switching, tab switching, and brief
  backgrounding do not hide, inert, or replace the authenticated account UI.
- Returning to the page silently revalidates the session once when needed.
- A same-account success preserves the mounted UI and any local drafts.
- A transient same-account foreground revalidation failure leaves the current
  UI usable; it does not create an indefinite full-screen retry state.
- Explicit cross-tab identity uncertainty, sign-out, different-account
  confirmation, authenticated-document bootstrap mismatch, and stale BFCache
  restoration remain fail-closed behind the identity gate or a full-document
  replacement.
- Initial authenticated-document validation uses neutral loading copy, not a
  privacy warning or manual `Check again` prompt.

## Coordination and scope

Open PR #199 also contains one frozen, non-overlapping change to
`components/providers/AppProviders.tsx`: it exports `SettingsContext` as a
visualization render-test seam near the top of the file. Its linked worktree
has no uncommitted change to this shared file. This session does not touch that
line or the PR #199 worktree; its write range is the session verification state
machine and focused regression expectations only.

Planned write scope:

- `components/providers/AppProviders.tsx`;
- `components/providers/appProvidersSessionIsolation.test.ts`;
- `tests/e2e/teacher-parent-p1-regressions.spec.ts` for the smallest existing
  foreground/identity-boundary browser regression block;
- `scripts/parent-console-gates.test.mjs` to keep the explicit parent gate
  contract synchronized with the neutral initial state;
- this session log.

Forbidden scope includes auth API/storage implementation, secrets, provider
configuration, unrelated UI, package/config changes, and PR #199 files outside
the shared provider path.

## Implemented state-machine change

- Session verification modes are now `none`, `initial`, and `identity`.
  Ordinary foreground transitions are no longer modeled as identity
  uncertainty.
- `blur` and hidden visibility only mark that a future silent server check is
  needed. The first focus/visible return performs one no-store session check
  without unmounting, hiding, or making the current UI inert.
- A same-account response preserves mounted UI, local drafts, and queued
  learning events. A transient silent-check transport failure likewise keeps
  the current same-account UI usable.
- Server-confirmed sign-out, a different account, a cross-tab identity signal,
  a bootstrap mismatch, or a persisted BFCache restore still enters the hard
  `identity` gate and replaces the complete document where required.
- Authenticated initial documents retain an authoritative session check, but
  present neutral `Loading your workspace` copy. That check has a ten-second
  bound and exposes `Try again` only after an actual failure.
- The former `Verifying your account`, `For your privacy`, and `Check again`
  strings are absent from the runtime provider.

## TDD evidence

1. The ordinary-foreground/neutral-loading contract was written first and
   failed against the previous `foreground` quarantine behavior: 6 tests,
   2 passed and 4 expected failures.
2. The minimal foreground state-machine change made the focused provider
   contract green.
3. A completion audit identified the missing bounded recovery path for an
   initial session-state failure. Its new assertion first failed 4/5, then
   passed 5/5 after adding timeout and failure-only retry state.
4. The final diff audit identified a silent-check/different-account edge: the
   hard gate could depend on the caller's `shouldGateDuringCheck` flag. The new
   fail-closed assertion first failed 4/5, then passed 5/5 after making an
   accepted-bootstrap mismatch unconditionally retain the identity gate.
5. Structured race review identified an in-flight silent request that could
   overlap `pagehide`. Its BFCache invalidation assertion first failed 4/5,
   then passed 5/5 after `pagehide` invalidated and aborted any older session
   check before synchronously committing the identity gate.

## Final local verification on the completed diff

- `npm run type-check`: passed.
- `node --import tsx --test components/providers/*.test.ts`: 11/11 passed.
- `npm run test:parent-console`: tooling 76/76 and runtime 403/403 passed;
  zero failures and zero runtime skips.
- `npm run test:release-governance`: 91 passed, 11 explicit skips, zero
  failures.
- Focused desktop Playwright state-machine regression: 3/3 passed, covering
  neutral initial failure/retry, ordinary blur/focus with mounted drafts, and
  cross-account plus same-role replacement hard gates.
- Student Shirleen login Playwright regression: desktop and mobile 2/2 passed.
- `npm run build`: passed on Next.js 15.5.23; compile/type validation completed
  and 202/202 static pages generated.
- `git diff --check`: passed. `next-env.d.ts` has zero diff after all isolated
  builds. The runtime provider has zero matches for the three old privacy-gate
  strings.
- An earlier real local browser reproduction on the same foreground behavior
  additionally confirmed the Student Shirleen dashboard remained visible
  through `blur`, performed one silent session-state request on `focus`, and
  recorded zero console errors or warnings. The final one-line change after
  that run only tightened the different-account hard-gate condition; the final
  exact diff is covered by the Playwright and build results above.

Independent review, Git/CI, merge, exact-main deployment, and production
acceptance remain separate gates and will be recorded in the PR/release
evidence rather than claimed by this local log.
