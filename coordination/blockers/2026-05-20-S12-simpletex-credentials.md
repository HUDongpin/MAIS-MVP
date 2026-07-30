# Blocker Report

- Date: 2026-05-20
- Session ID: S12
- Task: SimpleTex OCR APP signing hardening and live provider verification
- Blocker type: Secret/credential
- What happened: The SimpleTex signing implementation was updated to sort non-file request data and APP auth header fields together before appending `secret`. Deterministic tests pass against the official SimpleTex sample signature. A redacted direct provider smoke using the current local APP credentials and the official signing method still returned HTTP `401` with `req_unauthorized`.
- Files involved: `app/api/handwriting-recognition/route.ts`, `lib/server/simpletexAuth.ts`, `lib/server/simpletexAuth.test.ts`, `.env.local`
- Why the session stopped: S12 can fix route signing, but cannot make upstream SimpleTex accept an invalid or inactive credential pair. No secret values were printed or written.
- Decision needed from owner: Verify that the APP ID belongs to an active SimpleTex open-platform APP and regenerate/rotate the APP Secret if the current pair is expired, copied incorrectly, tied to another account/region, or exposed.
- Safe next step: S19 should update only server-side local/Vercel env vars with a fresh APP ID/Secret, run a redacted direct provider smoke until it returns HTTP 200, then ask S11 to rerun the 20-attempt Lesson/Arena OCR matrix.
