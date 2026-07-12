# 2026-06-28 A22 Preview Performance

## Agent

- Agent ID: A22
- Role: Production reliability and release engineering lead

## Objective

Fix the slow `http://127.0.0.1:3007` local preview.

## Diagnosis

- The original `3007` dev server timed out with no first byte after 30 seconds.
- The dev log showed a webpack/static-path error followed by a stuck `Compiling /student/tools/visualizations ...` state with near-zero CPU.
- The repo also had multiple MAIS-MVP dev servers sharing the default `.next` directory (`3000`, `3007`, `3008`), while `.next` had grown to about `1.2G`.
- Root cause: shared `.next` dev compiler/cache contention and a stale stuck `3007` process, not a slow homepage render.

## Fix

- Stopped only the stale `3007` MAIS-MVP process family.
- Restarted `3007` in a detached `screen` session named `mais-dev-3007`.
- The new `3007` server uses isolated Next output with `NEXT_DIST_DIR=.tmp/a22-preview-3007-next`, so it no longer competes with the other shared `.next` dev servers.
- Warmed the homepage and the Grade 1 lesson route after startup.

## Verification

- Before fix: `curl --max-time 10 http://127.0.0.1:3007/` timed out with `status=000`.
- After fix:
  - Cold homepage: `4.920s`, `200`.
  - Warm homepage: `0.041s`, `200`.
  - Final homepage: `0.218s`, `200`.
  - Warm browser homepage: DOM visible in `73ms`; app/API/chunk requests stayed under about `112ms`.
  - Warm Grade 1 lesson page: concept content visible in `380ms`; lesson route request `243ms`.
- `3007` remains available from the detached `screen` session `mais-dev-3007`.

## Notes

- `networkidle` is not a reliable success metric in Next dev because dev/runtime connections can remain open. DOM/content visibility and route/API timings are the relevant checks here.
- `node scripts/cleanup-generated-artifacts.mjs --scope next-builds --dry-run` found `2.1G` of generated Next artifacts, but no cleanup apply was run because other Next processes were active.
