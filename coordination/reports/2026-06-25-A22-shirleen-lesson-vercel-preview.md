# 2026-06-25 A22 Shirleen Lesson Vercel Preview Evidence

## Objective

Deploy the Shirleen Dashboard Lesson fix to `www.mais.ac` / `www.mais.hk` through Vercel production.

## Release Slice Status

- Current root is dirty and production root deploy is blocked by the release guard.
- A25 dirty-tree map was refreshed for this deploy attempt.
- Pruned Vercel staging package was prepared from current runtime tree:
  - Staging directory: `.tmp/vercel-staging/a22-shirleen-lesson-fix-20260625`
  - Files: `2292`
  - Size: `160.8 MB`
  - Forbidden paths: `0`
- Staging manifest confirms deploy exclusions:
  - `data/ease`: excluded
  - `public/question-illustrations`: excluded
  - local secrets/generated outputs: excluded

## Fix Presence In Staging

- `lib/server/internalCaliforniaFastLogin.ts`
  - includes US California fast lesson entry slug map
  - returns a non-null fast `lessonEntryTarget` for Student Shirleen/P1
- `app/dashboard/page.tsx`
  - includes `lessonShortcutReady`
  - disables Dashboard Lesson shortcut while a concrete target is not ready
- `lib/server/userStore/studentActivityPersistence.ts`
  - validates lesson-entry targets against the public lesson catalog
  - falls back from stale authenticated/fast targets to a renderable public target
- `components/lesson/StudentLessonEntryPage.tsx`
  - renders `StudentLessonPage` directly for the resolved target slug

## Checks

- Root preflight: `npm run release:preflight -- --json` passed.
- Production env preflight: `npm run release:env-preflight -- --json` passed with all required production variable names present.
- Publish preflight: blocked by dirty-root guard, as expected.
- Staging build: `npm run build` inside `.tmp/vercel-staging/a22-shirleen-lesson-fix-20260625` passed.
- Staging `npm run type-check` was not a valid deploy-package check because the pruned staging package excludes `coordination/` and selected scripts while root-level test files still reference them. Root type-check had already passed before staging.

## Vercel Preview

- Deployment id: `dpl_9XaysXieGM9EtDTwCZe6miKjHn8S`
- Preview URL: `https://mais-myarel1ik-peter-dongpin-hu-s-projects.vercel.app`
- Inspect URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/9XaysXieGM9EtDTwCZe6miKjHn8S`
- Vercel inspect status: `Ready`
- Target: `preview`
- Current preview alias from inspect:
  - `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`

## Current Production Alias Evidence

- `www.mais.ac` currently resolves in Vercel inspect to old deployment:
  - `https://mais-ozkgxu6jd-peter-dongpin-hu-s-projects.vercel.app`
- `www.mais.hk` currently resolves in Vercel inspect to the same old deployment:
  - `https://mais-ozkgxu6jd-peter-dongpin-hu-s-projects.vercel.app`
- Production aliases on that old deployment include:
  - `https://www.mais.ac`
  - `https://www.mais.hk`
  - `https://mais.ac`
  - `https://mais.hk`

## Live Smoke Limitation

The local shell network can resolve Vercel DNS and run `vercel inspect`, but HTTPS requests to Vercel domains fail at TLS connection setup:

- `curl https://vercel.com`: `SSL_ERROR_SYSCALL`
- `curl https://mais-myarel1ik-peter-dongpin-hu-s-projects.vercel.app`: TLS timeout / SSL error
- `vercel logs`: TLS setup failure against Vercel logs API

This blocks local live browser/API smoke from this machine. It does not prove the preview app is broken; Vercel inspect reports the deployment as `Ready`.

## Production Blocker

Production deploy still requires an explicit owner-approved dirty-root pruned staging exception, because clean HEAD would roll back the Dashboard Lesson UI while the current root has a large unrelated dirty tree.

Required owner wording:

> allow dirty-root pruned staging production deploy

After that approval, A22 can run the guarded production deploy path with `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1`.
