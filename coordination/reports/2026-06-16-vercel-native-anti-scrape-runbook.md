# Vercel Native Anti-Scrape Runbook

- Date: 2026-06-16
- Responsible session: S22 production reliability
- Coordinating sessions: S12 backend/API platform, S07 AI tutor lead, S11 release quality
- Target: `www.mais.hk`

## Code-side boundary now expected

- Anonymous `/api/questions` returns at most 20 preview questions and marks the response as limited.
- Authenticated `/api/questions` keeps full learning payload access.
- Anonymous `/api/lessons/[slug]` returns a preview response without bundled practice questions.
- Authenticated `/api/lessons/[slug]` keeps complete lesson practice access.
- `/api/ai-tutor/status` reports capability readiness without provider or model names.
- Content API responses set `Cache-Control: private, no-store` and vary by `Cookie`.

## Vercel dashboard actions

Status as of 2026-06-16:

- Completed via Vercel CLI: four production custom Firewall rate-limit rules are live.
- Completed via clean production deployment: API payload-redaction code is live on `https://www.mais.hk`.
- Production deployment id: `dpl_2r12LAze9NNL8ZUeA7PC5HYhdpbd`.
- Production deployment URL: `https://mais-b56zd8myv-peter-dongpin-hu-s-projects.vercel.app`.
- Still dashboard-only / pending: Bot Protection Managed Ruleset and AI Bots Managed Ruleset log/challenge/deny toggles.
- S22 did not deploy the dirty root checkout directly. The deployed production package came from a clean temporary slice at `/tmp/mais-api-release-slice.GcCiNv`, built from committed `HEAD` plus only the three API route edits.
- Live smoke after deployment returned HTTP 200 for `/api/questions`, `/api/lessons/quadratic-functions`, and `/api/ai-tutor/status`; response shape confirms production now has the payload-redaction code.

1. Open Vercel project for `www.mais.hk` -> Firewall -> Bot Management.
2. Enable Bot Protection Managed Ruleset in challenge/log mode first.
3. Observe 24 hours of events, then switch high-confidence non-browser automation to block.
4. Open Firewall -> Configure -> New Rule for API preview routes.
5. Add fixed-window rate-limit rules:
   - Completed: `/api/questions*`: 60 requests / 10 minutes per IP, action `Rate Limit`.
   - Completed: `/api/lessons/*`: 120 requests / 10 minutes per IP, action `Rate Limit`.
   - Completed: `/api/ai-tutor/*`: 30 requests / 10 minutes per IP, action `Rate Limit`.
   - Completed: `/api/handwriting-recognition`: 20 requests / 10 minutes per IP, action `Rate Limit`.
6. Add a stricter anonymous-content rule after validating normal traffic:
   - Path starts with `/api/questions` and request has no session cookie: 30 requests / 10 minutes per IP.
   - Path starts with `/api/lessons/` and request has no session cookie: 60 requests / 10 minutes per IP.
7. Keep Attack Challenge Mode disabled during normal operations; enable temporarily only during traffic spikes.

## Rollback path

- Disable the new Vercel Firewall rate-limit rules first.
- If users are still blocked, return Bot Protection Managed Ruleset to log-only mode.
- Code rollback is narrow: revert `app/api/questions/route.ts`, `app/api/lessons/[slug]/route.ts`, and `app/api/ai-tutor/status/route.ts`.

## Verification checklist

- Completed: Anonymous `/api/questions` response has `limited: true` and exactly 20 preview questions on `www.mais.hk`.
- Completed locally in the clean slice: Authenticated `/api/questions?grade=S3` keeps full payload access.
- Completed: Anonymous `/api/lessons/quadratic-functions` has `access: "preview"`, 2 blocks, and `practiceQuestions: []` on `www.mais.hk`.
- Completed locally in the clean slice: Authenticated `/api/lessons/quadratic-functions` keeps full practice access.
- Completed: `/api/ai-tutor/status` has no `provider` or `model` fields on `www.mais.hk`.
- Completed: Vercel Firewall overview shows Firewall enabled, 4 active custom rules, System Mitigations active, Attack Mode off, and no pending draft changes.
- Pending: Vercel Firewall event view should be monitored for false positives after real teacher/student traffic.
