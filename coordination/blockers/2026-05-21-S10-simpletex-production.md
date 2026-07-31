# Blocker Report

- Date: 2026-05-21
- Session ID: S10
- Task: Vercel Production SimpleTex APP-auth preflight and AI-OCR smoke
- Blocker type: Secret/credential
- What happened: Vercel Production has `SIMPLETEX_APP_ID`, `SIMPLETEX_APP_SECRET`, and `SIMPLETEX_API_URL` present, but a direct redacted SimpleTex APP-auth smoke using the Production env returned HTTP `401` with `req_unauthorized`. The temporary Production env file was stored outside the repo and deleted after the check.
- Files involved: none in feature code; evidence recorded in `coordination/reports/2026-05-21-production-smoke.md`.
- Why the session stopped: The plan requires direct SimpleTex HTTP 2xx before running the 20-run Lesson/Practice OCR matrix. Production credentials are rejected upstream, so the UI OCR matrix would only reproduce provider-auth failure.
- Decision needed from owner: Verify that the SimpleTex APP ID belongs to an active open-platform APP and rotate/regenerate the APP Secret if needed, then update Vercel Production env variables.
- Safe next step: S19 should update only Vercel Production server-side SimpleTex env vars with a verified pair, run a redacted direct provider smoke until it returns HTTP 2xx, then S11 should rerun the 10 Lesson plus 10 Practice OCR matrix.
