# 2026-06-28 A05 Lesson Image Root Cause

## Agent

- Agent ID: A05
- Role: Lesson lead

## Objective

Deeply investigate why the screenshots still show the Grade 1 math illustration figure as low-pixel/soft.

## Evidence

- Current source asset: `public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`.
- Current nominal dimensions: `2368x1536`, PNG, `2.56 MB`.
- Current browser path on `http://127.0.0.1:3007/student/lessons/us-ca-math-p1-1-oa-add-subtract` loads the source directly:
  - `src: /lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`
  - `srcset: null`
  - `currentSrc: http://127.0.0.1:3007/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`
  - `naturalWidth: 2368`
  - `naturalHeight: 1536`
  - `content-type: image/png`
  - `content-length: 2563123`
- On a DPR 2 viewport similar to the owner screenshot, the image rendered at about `819x531` CSS pixels, or `1638x1062` device pixels. The nominal source has enough pixels for that display size.
- The earlier display-setting issue was real: before the `preserveRasterFidelity` fix, the page requested `/_next/image?...w=2048&q=75`, which produced a lossy WebP response around `87 KB`. That is no longer the current path.
- The current image was previously enlarged from `592x384` to `2368x1536` by deterministic upscaling.
- Effective-resolution test:
  - Downsample current PNG to `592x384`.
  - Upscale it back to `2368x1536`.
  - Compare against the current PNG.
  - Result: RMSE `1339.34 (0.020437)`, PSNR `33.7917`, MAE `485.366 (0.00740621)`.
  - Interpretation: the current PNG is highly reconstructable from a `592x384` version, which is the signature of a 4x-upscaled low-information raster.

## Root Cause

The remaining softness in screenshots 1 and 2 is caused by source-image information loss, not by the current page display settings.

The file is now `2368x1536`, but its real visual detail comes from the earlier `592x384` raster. Upscaling increased the pixel dimensions but did not recreate crisp text, number-line ticks, formula edges, or small label detail. The page now serves the original PNG directly and displays it at a size that the nominal pixels can cover, but the source content itself is already soft.

## Conclusion

- Current display pipeline: fixed and no longer the main cause.
- Current source dimensions: large enough on paper.
- Current effective detail: still roughly low-resolution because the asset is an upscaled raster.
- Durable fix: replace this illustration with a true high-resolution source or rebuild it as a deterministic/vector exact-layer illustration. Another bitmap upscale will not recover crisp math text or number-line labels reliably.
