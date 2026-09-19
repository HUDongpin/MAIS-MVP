# Probes for `ccss-math-universe-4.0.html`

Headless Playwright scripts used to verify the groups-first revision (spec §16, 2026-09-19). They open the generated page from `file://`;
nothing is served and no window opens. Chromium and Chrome come from the main repo's Playwright
(`createRequire("/Volumes/Starship/MAIS-MVP/package.json")`), WebKit and Firefox from the matched `playwright-core` in
`/Volumes/Starship/From WestWorld/AAIS`. Run them from this folder after `node ../build.mjs`:

| Script | What it does |
|---|---|
| `node check.mjs ../../ccss-math-universe-4.0.html LABEL [--q=home=galaxy&panels=00]` | The page's own `?check` at the five spec viewports in Chromium |
| `node check-x.mjs ../../ccss-math-universe-4.0.html` | The same in WebKit and Firefox, default view and whole galaxy with collapsed panels |
| `node regress.mjs PAGE > out.json` then `diff regress.baseline-2026-09-19.json out.json` | Behaviour that must not change: deep-link trace, course, path, search, learner, Launch and Reset, keyboard walks (385 of 385 stars), facts, a hash of all positions. The baseline was recorded on the page before the revision |
| `node edge.mjs PAGE OUTDIR` / `node edge2.mjs PAGE OUTDIR` | Filters with bodies, reduced motion, phone taps, body tooltip (WCAG 1.4.13), panel persistence, resize and home views, figure mode, forced opening, Launch at the constellation level, split hysteresis |
| `node interact.mjs PAGE OUTDIR` | A walk through hover, tap-to-open, H, selection, keyboard and the panel toggles, with screenshots |
| `node measure.mjs OLDPAGE NEWPAGE` | Nearest-neighbour spacing of what is drawn at the default views (the §16.5 table) |
| `node perf.mjs OLDPAGE NEWPAGE` | `?selftest` flights and a wheel sweep through the split threshold, Chromium and Chrome |
| `node header.mjs PAGE` | Header overflow, overlaps and touch-target sizes from 320 to 1512 px |
| `node portals.mjs PAGE_A PAGE_B` | Preview-portal placement at four zoomed-in selections, compared between two builds |
| `node shot.mjs PAGE out.png [--vp=1512x860@2] [--q=…] [--hash=…] [--js=…] [--mobile]` | One screenshot plus the camera and draw counts |

## Merging later repairs from the sibling worktree

`merge-base.sibling-template-2026-09-19T1558.html.gz` is the template of the sibling worktree `knowledge-galaxy-ccss-math-c9590a`
(tooltip and preview-portal repair) as it stood when it was merged into this one. If that worktree's template changes again:

```bash
gunzip -c merge-base.sibling-template-2026-09-19T1558.html.gz > /tmp/base.html
git merge-file ../page.template.html /tmp/base.html /Volumes/Starship/MAIS-MVP/.claude/worktrees/knowledge-galaxy-ccss-math-c9590a/docs/concepts/ccss-math-universe-4.0.src/page.template.html
node ../build.mjs && node check.mjs ../../ccss-math-universe-4.0.html merged
```

In `updatePortals`, `crosses()` must keep counting closed constellation bodies (and skipping stars of closed cells) as hover obstacles.
