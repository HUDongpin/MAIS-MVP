# 2026-06-24 A22 P0 US CA Example Login Production Deploy

- Responsible owners: A01 app shell/auth entry; A11 targeted regression; A22 release engineering; A25 dirty-tree intake; A19 redacted env-name readiness.
- Production issue: On `www.mais.ac/login?next=%2Fdashboard`, clicking the US CA `Student Shirleen` example account filled credentials but did not send `/api/auth/login` or navigate to `/dashboard`.
- Root cause: A01 login example-account buttons only populated the form. The normal separate `Log In` submit path already authenticated successfully.
- Runtime fix: `app/login/page.tsx` now keeps the selected example account state and immediately reuses the normal `submitLogin` path with the example account's locked grade and curriculum profile.
- Regression updates: A11 auth and student matrix tests now assert immediate US CA example-account login.

## Verification

- `npm run type-check`: passed.
- `PLAYWRIGHT_BROWSER_CHANNEL=chrome npx playwright test tests/e2e/app-shell-auth.spec.ts --project=desktop-chrome -g "US CA student example account"`: 1 passed.
- `PLAYWRIGHT_BROWSER_CHANNEL=chrome npx playwright test tests/e2e/student-button-dropdown-matrix.spec.ts --project=desktop-chrome -g "login page opens fixed US CA|login page opens an example"`: 2 passed.
- `npm run release:env-preflight -- --json`: production required env variable names present; no secret values read or printed.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight -- --json`: passed with dirty-root emergency override and pruned staging root `.tmp/vercel-staging`.
- `npm run build`: passed; 223 static pages generated.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 node scripts/deploy-vercel-production.mjs --dry-run --json`: passed; 2,274 deployable files, 167,859,577 bytes, 0 forbidden paths.

## Deployment

- Command: `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 node scripts/deploy-vercel-production.mjs --json`
- Vercel scope/project: `peter-dongpin-hu-s-projects` / `mais-mvp`
- Target: production
- Deployment ID: `dpl_8D1WESCPnY8DwohRaFY1VhG23yLB`
- Deployment URL: `https://mais-ozkgxu6jd-peter-dongpin-hu-s-projects.vercel.app`
- Staging directory: `.tmp/vercel-staging/20260624T083809Z`
- Vercel inspect status after wait: Ready.
- Emergency release note: root worktree remained dirty, so A22 used the project pruned staging deploy path and the dirty-root emergency override requested by the P0 production-fix assignment. Direct root deploy remained blocked by guard.

## Live Smoke

- `https://www.mais.ac/login?next=%2Fdashboard`: clicked `Student Shirleen`; `/api/auth/login` returned 200; final URL `https://www.mais.ac/dashboard`; `/api/me?includeLessonEntry=false` returned username `Student Shirleen`, curriculum track `US_CA_MATH`, selected grade `P1`.
- `https://www.mais.hk/login?next=%2Fdashboard`: clicked `Student Shirleen`; `/api/auth/login` returned 200; final URL `https://www.mais.hk/dashboard`; `/api/me?includeLessonEntry=false` returned username `Student Shirleen`, curriculum track `US_CA_MATH`, selected grade `P1`.
