# Cloudflare Owner Action Checklist

- Date: 2026-06-17
- Responsible session: S22 production reliability
- Required owner/support: Owner, S19 API configuration lead
- Target: `mais.hk` / `www.mais.hk`
- Purpose: Finish the external Cloudflare work required before S22 can enable Cloudflare AI Crawl Control or the Cloudflare WAF fallback.

## Current State

- `www.mais.hk` is still served by Vercel, not Cloudflare.
- The Vercel substitute layer is already live:
  - `robots.txt` expresses `Content-Signal: search=yes, ai-train=no, ai-input=no`.
  - Known AI training crawler user agents are blocked by the Vercel Firewall substitute rule.
  - Anonymous `/api/questions` is preview-limited.
- Cloudflare activation is blocked only because the domain is not yet on Cloudflare edge and no approved Cloudflare token/zone variables are available to S19/S22.

## Owner Actions

1. Create or open the Cloudflare account that will manage `mais.hk`.
2. Add `mais.hk` as a Cloudflare site/zone using full DNS setup.
3. Before importing records, have S22/S19 run:

```bash
node coordination/reports/cloudflare-dns-cutover-inventory.mjs
```

4. In Cloudflare DNS, create/import the required web and policy records:
   - Apex `A`: `216.150.16.129`
   - Apex `A`: `216.150.16.193`
   - `www` `A`: `216.150.1.129`
   - `www` `A`: `216.150.1.1`
   - Apex `CAA issue`: `sectigo.com`
   - Apex `CAA issue`: `pki.goog`
   - Apex `CAA issue`: `letsencrypt.org`
5. Keep non-web records and verification-style records DNS-only until reviewed.
6. Do not recreate wildcard `*` records until S22/S12 review whether unknown subdomains should keep resolving.
7. Set apex `mais.hk` and `www.mais.hk` to proxied after validating the DNS import.
8. Change the registrar nameservers from Vercel DNS to Cloudflare-assigned nameservers.
9. Wait until Cloudflare shows the zone as active.
10. Ask S22 to verify:

```bash
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-cloudflare --require-training-crawler-blocks
```

## S19 Credential Handoff

If S22 needs API-based verification or WAF fallback mutation, S19 should provide runtime-only environment variables without logging values:

- `CLOUDFLARE_API_TOKEN` or `CF_API_TOKEN`
- `CLOUDFLARE_ZONE_ID` or `CF_ZONE_ID`

Never paste real Cloudflare token values into chat, reports, session logs, screenshots, Git, or shell transcript summaries.

## S22 Activation After Cloudflare Edge Is Live

1. Re-run the Cloudflare-required gate:

```bash
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-cloudflare --require-training-crawler-blocks
```

2. In Cloudflare Dashboard, open AI Crawl Control for `mais.hk`.
3. Set AI training crawler entries to `Block`:
   - `GPTBot`
   - `ClaudeBot`
   - `Google-CloudVertexBot`
   - `Google-Extended`
   - `Bytespider`
   - `CCBot`
   - `Meta-ExternalAgent`
   - `FacebookBot`
   - `Amazonbot`
   - `Applebot-Extended`
4. Keep AI Search / AI Assistant entries in observe or allow mode unless the owner chooses a stricter policy.
5. If AI Crawl Control is unavailable, use the dry-run WAF helper first:

```bash
node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs
```

Then apply only with approved S19 runtime credentials:

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs --apply
```

## Done Criteria

- `node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-cloudflare --require-training-crawler-blocks` exits `0`.
- `https://www.mais.hk` has Cloudflare edge evidence such as `cf-ray`.
- Blocked training crawler smoke requests return 403.
- `robots.txt` remains readable and includes `ai-train=no`.
- Anonymous `/api/questions` remains preview-limited.
