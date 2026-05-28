# Handwriting OCR Provider Smoke Report

- Date: 2026-05-21
- Session: S19
- Scope: Local MAIS-MVP `/api/handwriting-recognition` provider smoke checks
- Secret handling: Credential values were never printed, logged, screenshotted, or written to this report. Environment checks recorded presence only.

## Redacted Configuration Status

| Provider path | Local credential status | Live call status |
| --- | --- | --- |
| SimpleTex | `SIMPLETEX_UAT` present; APP ID/secret empty; API URL present | Ran 1 live app-route call |
| Mathpix | `MATHPIX_APP_ID` empty; `MATHPIX_APP_KEY` empty | Not run live; blocked by missing credentials |
| LLM vision fallback | `HANDWRITING_RECOGNITION_LLM_API_KEY`, `AI_TUTOR_VISION_API_KEY`, and `OPENAI_API_KEY` empty | Not run live; blocked by missing credentials |

## Preflight

- `npm run type-check`: Passed.
- Local app servers were started on loopback-only ports with temporary SQLite database paths.
- A temporary smoke-test student was registered through `/api/auth/register` for each local run.

## Results

| Scenario | HTTP | Route provider | Accepted | Text | Confidence | Alternatives | Latency bucket | Result |
| --- | ---: | --- | --- | --- | ---: | ---: | --- | --- |
| SimpleTex live clear `25` image | 200 | `simpletex` | true | `25` | 0.95 | 1 | 3-8s | Pass |
| No live providers configured sanity path | 200 | `none` | false | empty | 0 | 0 | <3s | Pass |

## Notes

- SimpleTex live route wiring is healthy locally for the tested `25` image: authenticated app route call completed, returned `provider: "simpletex"`, accepted normalized text `25`, and produced no provider warning in the local dev log.
- Mathpix and LLM vision were not live-tested because no local credentials are configured. The no-provider sanity run confirmed the route returns a safe non-accepted response instead of crashing when live providers are unavailable.
- No Vercel or production smoke test was run.

## Follow-Up

- S19 can run Mathpix and LLM live smoke tests once owner-approved credentials are placed in `.env.local` or shell-only env vars.
- Keep each future provider run isolated by blanking earlier providers in the fallback order.
- Continue to record only provider name, HTTP status, accepted flag, normalized text, confidence, alternatives count, latency bucket, and redacted configuration status.
