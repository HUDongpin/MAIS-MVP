# Cloudflare AI Crawl Control Stage 2 Readiness

- Date: 2026-06-16
- Responsible session: S22 production reliability
- Target: `www.mais.hk`

## Current State

- `www.mais.hk` is currently served by Vercel, not Cloudflare.
- DNS evidence: `mais.hk` nameservers are `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
- HTTP evidence: `https://www.mais.hk` returns `server: Vercel` and no Cloudflare edge headers.
- Cloudflare credentials are not present in the approved local credential source, based on a redacted search of `All API Keys.docx`.
- No `CLOUDFLARE*` or `CF_*` environment variable names are present in this shell.

## Completed Immediate Control

Added and deployed `public/robots.txt` with explicit AI-use restrictions:

- `Content-Signal: search=yes, ai-train=no, ai-input=no`
- `Disallow: /` for known AI training / model-building crawlers:
  - `Amazonbot`
  - `Applebot-Extended`
  - `Bytespider`
  - `CCBot`
  - `ClaudeBot`
  - `Google-Extended`
  - `GPTBot`
  - `meta-externalagent`

Production deployment:

- Deployment id: `dpl_HYepD2qavsxfPWqV5PvTitjHkrzt`
- Production deployment URL: `https://mais-lzd1uslth-peter-dongpin-hu-s-projects.vercel.app`
- Live verification: `https://www.mais.hk/robots.txt` returns HTTP 200 as `text/plain` and includes the AI training refusal policy.
- Expanded production deployment id: `dpl_7dtP3XKybEW92Dj9AiopmeKzVkjL`
- Expanded production deployment URL: `https://mais-ds6jhipwh-peter-dongpin-hu-s-projects.vercel.app`
- Expanded live verification: `https://www.mais.hk/robots.txt` now also includes Cloudflare AI Crawler reference entries `Google-CloudVertexBot` and `FacebookBot`.
- Content Signals policy deployment id: `dpl_5XCaBNDUumEgjtemoayg8617zRTc`
- Content Signals policy deployment URL: `https://mais-izq4hauxr-peter-dongpin-hu-s-projects.vercel.app`
- Content Signals live verification: `https://www.mais.hk/robots.txt` includes a human-readable Content Signals Policy definition block plus the machine-readable `Content-Signal: search=yes, ai-train=no, ai-input=no`.

## Completed Current-Edge Enforcement

Because `www.mais.hk` is not yet behind Cloudflare, S22 added the equivalent enforceable block at the current Vercel edge:

- Vercel Firewall rule: `MAIS AI training crawler block`
- Rule id: `rule_mais_ai_training_crawler_block_HAdljp`
- Action: `Deny`
- Matching user agents:
  - `Amazonbot`
  - `Applebot-Extended`
  - `Bytespider`
  - `CCBot`
  - `ClaudeBot`
  - `Google-CloudVertexBot`
  - `Google-Extended`
  - `GPTBot`
  - `meta-externalagent`
  - `FacebookBot`
- Exception: `/robots.txt` remains readable so compliant crawlers can see the explicit policy.

Live verification:

- `GPTBot/1.1` request to `/` returns HTTP 403.
- `gptbot/1.1` lowercase request to `/` returns HTTP 403.
- `ClaudeBot/1.0` request to `/api/questions` returns HTTP 403.
- `claudebot/1.0` lowercase request to `/api/questions` returns HTTP 403.
- `Google-Extended` and lowercase `google-extended` requests to `/` return HTTP 403.
- `Google-CloudVertexBot/1.0` request to `/` returns HTTP 403.
- `meta-externalagent/1.1` request to `/` returns HTTP 403.
- `FacebookBot/1.0` request to `/` returns HTTP 403.
- `CCBot/2.0` request to `/robots.txt` returns HTTP 200 and includes the Content Signal.
- Normal browser-like request to `/api/questions` still returns 20 preview questions with `limited: true`.

## Existing Stage 1 Still Live

- Vercel Firewall enabled.
- Four active custom rate-limit rules plus one active AI training crawler deny rule.
- System Mitigations active.
- Attack Mode off.
- No pending Vercel Firewall draft changes.
- Live API smoke still passes:
  - `/api/questions` returns 20 anonymous preview questions with `limited: true`.
  - `/api/lessons/quadratic-functions` returns `access: "preview"`, 2 blocks, and 0 practice questions.
  - `/api/ai-tutor/status` has no `provider` or `model`.

## Cloudflare AI Crawl Control Activation Requirements

Cloudflare documentation says AI Crawl Control requires:

1. A Cloudflare account.
2. The domain connected as a Cloudflare zone.
3. Traffic proxied through Cloudflare.

After those prerequisites are true:

1. Open Cloudflare Dashboard -> select `mais.hk`.
2. Go to AI Crawl Control.
3. Review crawler traffic in Overview / Metrics.
4. In Crawlers, set unwanted AI training crawlers to `Block`.
5. Turn on managed robots/directives if desired so Cloudflare can serve and monitor Content Signals.
6. Monitor Directives / Robots.txt compliance and create WAF enforcement rules for non-compliant crawlers.

## Recommended Policy

- Keep ordinary search allowed for discoverability.
- Block model-training crawlers by default.
- Keep AI assistant / referral crawlers in observe mode first, unless they ignore robots directives or create load.
- Do not enable Pay Per Crawl until the owner has a licensing/contact policy.

## Blocker

Cloudflare AI Crawl Control cannot be activated from the current state because `www.mais.hk` is not onboarded/proxied through Cloudflare and no Cloudflare credentials are available in the approved local credential source.

## Sources

- Cloudflare AI Crawl Control overview: https://developers.cloudflare.com/ai-crawl-control/
- Cloudflare AI Crawl Control get started: https://developers.cloudflare.com/ai-crawl-control/get-started/
- Cloudflare AI Crawl Control bot reference: https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- Cloudflare AI Crawl Control with WAF: https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/
- Cloudflare manage AI crawlers: https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/
- Cloudflare Block AI Bots: https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- Cloudflare managed robots.txt / Content Signals: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
