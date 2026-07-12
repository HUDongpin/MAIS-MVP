# 2026-06-04 S11 Homepage Mobile Bug Detection

- Session: S11 QA and release quality
- Scope: MAIS homepage mobile functional/UI bug detection
- Local target attempted: `http://127.0.0.1:3024/`
- Production target tested: `https://www.mais.hk/`
- Write scope used: this report plus `coordination/session-logs/2026-06-04-S11.md`
- Source code changed: none

## Executive Summary

No production P0/P1 homepage functional failure was found on mobile. Production homepage loaded in all 36 mobile combinations tested, and core guest flows passed: primary CTA, visualization CTA, mobile menu route to Practice Arena, language persistence, and AI Tutor shell open/close.

Confirmed issues:

1. P1 local QA blocker: current local dev homepage returned `500` from `npm run dev` because `.next` manifests were missing.
2. P2 mobile UI: 320 px and 360 px production homepage reports measurable horizontal overflow from the header/control area.
3. P2 mobile accessibility: header touch targets are below the 44 px mobile target-size guideline.
4. P2 semantic accessibility: homepage renders three `<h1>` elements.
5. P3 console noise: guest homepage logs repeated `/api/me` `401` resource errors in the browser console.

## Test Matrix

Production matrix:

- Widths: 320, 360, 375, 390, 414, 430 px
- Height: 844 px
- Languages: English, Traditional Chinese, Simplified Chinese
- Themes: light, dark
- Total combinations: 36
- Result: 36 loaded successfully

Functional flows on production:

- `Start Learning` -> `/login`: pass, 85 ms
- `Explore Visualizations` -> `/visualization-lab`: pass, 81 ms
- Mobile menu open -> `Practice Arena` -> `/practice`: pass, 383 ms
- Language toggle to Traditional Chinese updates text, `<html lang>`, and `localStorage`: pass, 133 ms
- AI Tutor shell open/close: pass, 182 ms

Artifacts:

- JSON: `output/playwright/homepage-mobile-audit/production-mobile-audit-results.json`
- Screenshots:
  - `output/playwright/homepage-mobile-audit/prod-home-320-en-dark.png`
  - `output/playwright/homepage-mobile-audit/prod-home-320-zh-Hans-dark.png`
  - `output/playwright/homepage-mobile-audit/prod-home-390-en-dark.png`
  - `output/playwright/homepage-mobile-audit/prod-home-390-zh-Hans-dark.png`
  - `output/playwright/homepage-mobile-audit/prod-home-430-en-dark.png`
  - `output/playwright/homepage-mobile-audit/prod-home-430-zh-Hans-dark.png`

## Findings

### P1 - Local Dev Homepage Returns 500

Owner: S22 release reliability, with S10/S01 coordination if config or homepage code is implicated.

Evidence:

- Command: `npm run dev -- --port 3024`
- Probe: `curl -sS --max-time 80 -o /dev/null -w '%{http_code} %{time_total}\n' http://127.0.0.1:3024/`
- Result: `500 25.117681`
- Server errors:
  - `ENOENT: no such file or directory, open '/Users/dongpinhu/Desktop/MAIS-MVP/.next/routes-manifest.json'`
  - `ENOENT: no such file or directory, open '/Users/dongpinhu/Desktop/MAIS-MVP/.next/static/development/_buildManifest.js.tmp...'`

Impact:

- Blocks reliable local mobile homepage QA.
- Caused the existing `tests/e2e/home-functional.spec.ts --project=mobile-chrome` run against local dev to produce timeout/no-route symptoms that are not reliable product evidence.

Recommendation:

- S22 should isolate local dev/build output for QA runs or repair the `.next` manifest generation race before S11 reruns local mobile homepage detection.

### P2 - 320/360 px Horizontal Overflow

Owner: S01 app shell/home/navigation.

Evidence from production mobile matrix:

- 320 px: `documentElement.scrollWidth=365`, overflow `45 px`, all languages/themes.
- 360 px: `documentElement.scrollWidth=366`, overflow `6 px`, Simplified Chinese light/dark.
- 375 px and wider: overflow `0 px`.
- 320 px header offender: header control group text `ENG繁简🌙≡`, rect left `117`, right `365`, width `248`.

Relevant code:

- `components/layout/Navbar.tsx:122` uses `page-container flex h-16 items-center justify-between`.
- `components/layout/Navbar.tsx:198` keeps the whole language/theme/menu cluster as `flex shrink-0`.
- `components/ui/LanguageToggle.tsx:33` makes three always-visible language buttons.
- `components/ui/ThemeToggle.tsx:16` and `components/layout/Navbar.tsx:219` add two 40 px icon buttons.
- `app/globals.css:18` does not constrain page-level `overflow-x`.

Impact:

- Can fail no-horizontal-overflow regression gates.
- Creates a narrow-device layout debt at 320 px, especially where browsers expose horizontal scroll width.

Notes:

- A direct `window.scrollTo(45, 0)` probe at 320 px did not move `scrollX`, so this is lower severity than a visibly pannable page. It is still a real layout metric failure.

### P2 - Header Touch Targets Are Too Small

Owner: S01 app shell/navigation; S09 may review accessibility copy.

Evidence from production 320 px:

- Site logo link: 89 x 40
- Language buttons: 50 x 32, 48 x 32, 48 x 32
- Theme toggle: 40 x 40
- Mobile menu toggle: 40 x 40

Relevant code:

- `components/ui/LanguageToggle.tsx:33` uses `py-1.5`, producing 32 px high buttons.
- `components/ui/ThemeToggle.tsx:16` uses `h-10 w-10`.
- `components/layout/Navbar.tsx:219` uses `h-10 w-10`.
- `components/layout/Navbar.tsx:123` homepage logo link resolves to 40 px height.

Impact:

- Below the common 44 px mobile target-size guideline.
- More likely to cause missed taps on small phones, especially because all header controls sit close together.

### P2 - Homepage Has Three H1 Elements

Owner: S01 for homepage structure; S09 for accessibility semantics.

Evidence:

- Production matrix consistently reported `h1Count=3`.
- H1 texts in English:
  - `MAIS Adaptive interactive math learning`
  - `Adaptive learning that responds to each student`
  - `Interactive learning that makes abstract ideas visible`

Relevant code:

- `components/ui/SectionHeader.tsx:8` always renders section titles as `<h1>`.
- `components/home/HomePageClient.tsx` uses `SectionHeader` twice below the hero.

Impact:

- Weakens heading hierarchy for screen reader navigation and mobile accessibility.
- This is not mobile-only, but it affects mobile assistive technology users.

### P3 - Guest Session Probe Emits Console 401 Noise

Owner: S12 backend/API platform with S01/S08 coordination if client handling changes.

Evidence:

- Production matrix captured 41 instances of browser console error: `Failed to load resource: the server responded with a status of 401 ()`.
- Request source: `/api/me?includeLessonEntry=false` for guest users.

Impact:

- Does not break the homepage.
- Pollutes console/network error monitoring and can hide real resource failures during QA.

Recommendation:

- Consider returning a non-error guest response or explicitly accepting this as known console noise in S11 test expectations.

## Passing Checks

- No page crash or blank production homepage in 36 mobile combinations.
- No clipped text detected in production matrix.
- CTA links, stat-card links, footer links, language labels, dark mode, and AI Tutor shell were visible in sampled screenshots.
- PedaNova card remained visible in the existing mobile E2E check at 360/390 widths.
- Production language toggle correctly updated `<html lang>` to `en-HK`, `zh-Hant-HK`, and `zh-Hans-CN`.

## Checks Run

- `git status --short`: inspected; workspace is heavily dirty with many unrelated owner/session changes.
- Read AGENTS.md and S11 scope.
- Loaded Playwright, systematic debugging, and Web Interface Guidelines workflows.
- Existing local homepage E2E:
  - `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 npx playwright test tests/e2e/home-functional.spec.ts --project=mobile-chrome`
  - Result: 4 failed, 1 passed, 2 skipped; failures are not accepted as product evidence because local dev later reproduced `.next` manifest 500s and route compile delays.
- Local dev probe:
  - `npm run dev -- --port 3024`
  - `curl http://127.0.0.1:3024/`
  - Result: homepage 500 with `.next` manifest ENOENT.
- Production Playwright matrix:
  - 36 mobile language/theme/width combinations.
  - Core homepage functional flows.

## Checks Not Run

- `npm run type-check`: not run because this was report-only QA work with no app source edits.
- `npm run build`: not run because the local dev-server artifact failure should be handled by S22 before further local release checks.
- Live authenticated student homepage account flow: not in this homepage guest-mobile scope; prior S11 reports cover authenticated student storage/session risks.

## Handoff

Recommended next owners:

- S22: fix/triage local `.next` manifest 500 and build/dev-server isolation.
- S01: compact mobile header at <=360 px and restore no-overflow regression.
- S01/S09: increase header tap targets and fix homepage heading hierarchy.
- S12/S08/S01: decide whether guest `/api/me` 401 console noise is acceptable or should be made quieter.
