# www.mais.hk Visualization Lab Functional QA

- Date: 2026-06-04
- Session: S11
- Target: `https://www.mais.hk/visualization-lab`
- Environment: live production, anonymous guest flow, desktop Chrome viewport 1440x1100
- Result: PASS for current visible production Visualization Lab runtime health

## Executive Result

The live production Visualization Lab currently advertises 389 labs and renders 389 lab sections. The production DOM self-discovery smoke test checked all 389 discovered labs and found 389 passing labs, 0 failing labs.

Each lab was checked for:

- Visible lab section after selecting `Explore all labs`.
- Visible `[data-viz-surface]` rendering.
- Visible visual marks inside the surface.
- No rendered `NaN` or `Infinity`.
- No invalid SVG attributes containing `NaN` or `Infinity`.
- All visible range/number controls can be set to min and max values.
- Safe non-mutating in-lab buttons can be clicked without breaking the lab.
- Pointer probe over the first visualization surface.

## Coverage Summary

| Metric | Result |
| --- | ---: |
| Advertised production lab count | 389 |
| Discovered production lab sections | 389 |
| Passing labs | 389 |
| Failing labs | 0 |
| Visible controls found | 778 |
| Min control mutations | 778 |
| Max control mutations | 778 |
| Safe in-lab button clicks | 1485 |
| Pointer probes | 389 |

Raw per-lab evidence is saved at:

- `coordination/reports/2026-06-04-www-mais-hk-visualization-lab-smoke.json`

## Runtime Issues

No visualization runtime failure was found.

One browser console error appeared during anonymous production browsing:

- `Failed to load resource: the server responded with a status of 401 ()`

Follow-up network verification identified this as:

- `401 /api/me`

This is expected for an anonymous guest session and is not a Visualization Lab failure.

## Additional Checks Attempted

1. Production value sweep:
   - Command targeted `https://www.mais.hk` with `PLAYWRIGHT_SKIP_WEBSERVER=1`.
   - It discovered 389 lab sections and verified that home count, page count, and DOM count all matched.
   - It checked 2023 states, 81 distinct controls, and 77 non-mutating buttons before timing out at the 900 second limit.
   - No runtime issues were recorded before timeout.
   - Partial report: `coordination/reports/2026-06-04-production-visualization-lab-values.md`

2. Existing catalog-based stress spec:
   - It was not used as the final result because it depends on the current local source catalog while the task target is live production.
   - The production DOM self-discovery smoke is the authoritative check for this report.

## Conclusion

For the current live production guest experience on `www.mais.hk`, every visible Visualization Lab can be considered operational: all 389 discovered labs rendered a visualization surface, had visible marks, tolerated control changes, accepted safe button interactions, and did not produce visualization-specific runtime failures.

## Residual Risk

- This run covered desktop Chrome only.
- This run covered anonymous guest visualization behavior only. It did not verify authenticated progress persistence or saved `Mark explored` writes.
- The exhaustive per-discrete-value sweep is too large for a single 900 second test. If exact value-domain certification is needed, split it by grade or curriculum track and raise the per-shard timeout.
