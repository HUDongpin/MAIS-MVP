# Handwriting OCR Misrecognition Analysis

- Date: 2026-05-16
- Session ID: S12
- Issue: Handwritten `x^2 + 4x` was shown in the UI as converted answer `4`.
- Status: Analysis completed; SimpleTex live smoke test completed on a separately configured local server.

## Executive Summary

The original local server inspected for this run was not configured to call SimpleTex. No `SIMPLETEX_*`, `MATHPIX_*`, or handwriting LLM fallback variables were found in the server-side local configuration inspected for that server. Therefore, the reported `Converted to "4"` result could not be treated as proof of a SimpleTex OCR failure in that setup.

A follow-up live smoke test was then run against a separately started SimpleTex-configured local server on port `3100`. Using the saved cropped/padded diagnostic PNG, the app API returned `provider: "simpletex"`, `latex: "x^{2}+4x"`, `text: "x^2+4x"`, confidence approximately `0.938`, and `accepted: true`.

Most likely root-cause class: **configuration/fallback plus low observability**.

The UI success banner hides the provider, so a fallback result can look like a SimpleTex result. The current provider chain attempts SimpleTex first only when `SIMPLETEX_UAT` is configured, then Mathpix, LLM vision, and finally the local numeric recognizer. If all external providers are unconfigured or fail, any accepted numeric local result can still auto-fill the answer.

## Evidence Collected

Diagnostic artifacts were saved under:

`coordination/reports/handwriting-diagnostics-2026-05-16/`

Files:

- `raw-canvas.png`: exact raw canvas payload style from `canvas.toDataURL("image/png")`.
- `white-background.png`: same canvas composited onto a white background.
- `cropped-padded-white.png`: ink-bounds crop with padding and white background.
- `reproduction-page.png`: full-page reproduction screenshot.
- `reproduction.json`: captured request and response metadata.

Controlled reproduction route:

- URL: `/practice`
- Filters: `S3`, `polynomials`, `short-answer`
- Visible prompt in this run: `Expand: (x+3)(x+2).`
- Drawn diagnostic handwriting: `x^2 + 4x`

Captured request:

- `strokesLength`: `9`
- `language`: `en`
- `imageDataUrlPrefix`: `data:image/png;base64,iVBORw0K`
- `imageDataUrlLength`: `20166`

Captured response:

```json
{
  "text": "",
  "confidence": 0,
  "provider": "none",
  "alternatives": [],
  "accepted": false,
  "reason": "Draw clearer handwriting, then convert again."
}
```

Controlled reproduction result:

- UI status: `Draw clearer handwriting, then convert again.`
- Answer field: empty.
- Exact `4` result was not reproduced with the synthetic diagnostic strokes.

## Findings

1. SimpleTex was not active in the originally inspected local environment.
   - `SIMPLETEX_UAT` was not present in the shell environment.
   - No handwriting OCR provider variables were found in `.env.local` for this run.
   - The initially running local server therefore fell through to non-SimpleTex paths.

2. SimpleTex itself recognized the diagnostic expression correctly when configured.
   - Server: `http://127.0.0.1:3100`
   - Input: `coordination/reports/handwriting-diagnostics-2026-05-16/cropped-padded-white.png`
   - API result: `provider: "simpletex"`, `latex: "x^{2}+4x"`, `text: "x^2+4x"`, confidence `0.9383785724639893`, `accepted: true`.

3. The current implementation can fall through to local numeric recognition.
   - The route order is SimpleTex, Mathpix, LLM vision, local numeric fallback.
   - Local numeric fallback can auto-accept numeric-looking results with confidence `0.82`.
   - For algebra/short-answer prompts, this fallback can be risky if it recognizes a fragment such as `4`.

4. The UI hides the response provider.
   - The success banner says only `Converted to "{text}". Review before checking the answer.`
   - It stores provider/confidence in component state but does not display it.
   - This makes fallback output indistinguishable from SimpleTex output during manual QA.

5. The raw OCR image uses transparent canvas pixels outside the ink.
   - The generated raw PNG is transparent except for ink strokes.
   - For external OCR, a white composited background and crop/pad step may improve reliability.
   - The successful live smoke test used the cropped/padded white-background diagnostic PNG.

## Root-Cause Classification

Primary classification: **configuration/fallback + observability**.

The current evidence shows that the originally active local server did not have SimpleTex configured, while a SimpleTex-configured server recognized the diagnostic expression correctly. The screenshot’s `Converted to "4"` should therefore be investigated as either:

- a fallback result from local numeric recognition, or
- a result from another runtime/configuration where SimpleTex was configured but the provider was hidden by the UI.

The analysis does not support concluding that SimpleTex itself misread the expression. It supports fixing runtime configuration, fallback gating, and provider observability.

## Recommended Fix Direction

1. Add provider-aware diagnostics for manual QA.
   - In development or test mode, show or log provider, confidence, and alternatives for handwriting conversions.
   - This will immediately answer whether future suspicious conversions came from SimpleTex or fallback.

2. Restrict local numeric fallback for algebra/short-answer use.
   - Do not auto-accept `provider: "local"` on `short-answer` algebra-style prompts.
   - Either return local numeric results as low-confidence suggestions or reserve local fallback for numeric fill-in contexts.

3. Improve image preprocessing before external OCR.
   - Composite the canvas onto white before upload.
   - Crop to ink bounds with padding for SimpleTex.
   - Keep the original raw image available only for diagnostics.

4. Keep the SimpleTex-enabled server startup path explicit.
   - Use server process environment variables or deployment secrets for `SIMPLETEX_UAT`.
   - Do not rely on unconfigured dev servers when validating handwriting OCR.

## Checks Run

- Browser/API reproduction against `http://127.0.0.1:3001/practice`: completed.
- Diagnostic artifacts saved: completed.
- Live SimpleTex app API smoke test against `http://127.0.0.1:3100`: passed.
- `npm run type-check`: passed.

## Checks Not Run

- Raw and white-background live SimpleTex variant comparison: not run to limit external/billable provider calls; the cropped/padded variant passed.
- Build: not run for this analysis-only report; the last known build blocker was unrelated gamification code in `components/gamification/QuadraticBonusGame.tsx`.

## Follow-Up Test Cases For A Fix

- Unit test: local numeric fallback does not auto-accept a single digit for an algebra short-answer context.
- API test: mocked SimpleTex `latex: "x^{2}+4x"` returns normalized `text: "x^2+4x"` with provider `simpletex`.
- Playwright test: suspicious local fallback is surfaced as review/suggestion rather than auto-filled answer for `short-answer`.
- Manual smoke: with `SIMPLETEX_UAT` configured, draw `x^2 + 4x` and verify provider/result on raw, white, and cropped images.
