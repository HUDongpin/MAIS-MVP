# Cloudflare AI Crawl Control Activation Packet

- Date: 2026-06-16
- Responsible session: S22 production reliability
- Target domain: `mais.hk` / `www.mais.hk`
- Current production edge: Vercel
- Desired stage-2 edge: Cloudflare proxy in front of Vercel origin

## Current Verified State

- `mais.hk` nameservers are `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
- `https://www.mais.hk` returns `server: Vercel`; Cloudflare is not in the request path.
- No Cloudflare credential is present in the approved local credential source or current shell environment.
- Vercel substitute controls are live:
  - `public/robots.txt` includes `Content-Signal: search=yes, ai-train=no, ai-input=no`.
  - Vercel Firewall has 5 active custom rules and no pending drafts.
  - Vercel Firewall rule `MAIS AI training crawler block` denies known AI training crawler user agents except on `/robots.txt`.

## Preconditions

Cloudflare AI Crawl Control cannot be activated until all of these are true:

1. Owner has a Cloudflare account with access to manage `mais.hk`.
2. `mais.hk` is added as a Cloudflare zone.
3. DNS records are imported or recreated in Cloudflare.
4. `www.mais.hk` and `mais.hk` are proxied through Cloudflare.
5. Cloudflare account access or an API token is available to S19/S22 for verification.

## DNS Cutover Plan

1. In Cloudflare, add zone `mais.hk`.
2. Run the no-secret public DNS inventory helper before importing records:

```bash
node coordination/reports/cloudflare-dns-cutover-inventory.mjs
```

The helper currently finds these required public web/policy records:

   - Apex `mais.hk` A records: `216.150.16.129`, `216.150.16.193`.
   - `www.mais.hk` A records: `216.150.1.129`, `216.150.1.1`.
   - Apex CAA `issue` records: `sectigo.com`, `pki.goog`, `letsencrypt.org`.
   - Vercel wildcard A behavior is present for unknown subdomains; recreate `*` only after S22/S12 review, and keep it DNS-only until intentionally approved.

3. Import current Vercel DNS records, preserving:
   - `www.mais.hk` pointing to the current Vercel target.
   - apex `mais.hk` pointing to the current Vercel target or Vercel-approved A/CNAME configuration.
   - any email, verification, or ownership records that exist outside this report.
   - Do not import current NS/SOA records; Cloudflare assigns its own authoritative nameservers during full setup.
4. Set `www` and apex records to proxied after validating records are correct.
5. Change registrar nameservers from Vercel DNS to the Cloudflare-assigned nameservers.
6. Wait for Cloudflare zone status to become active.
7. Verify:
   - `dig +short mais.hk NS` returns Cloudflare nameservers.
   - `curl -I https://www.mais.hk` returns Cloudflare headers such as `cf-ray`.
   - `https://www.mais.hk/api/questions` still returns 20 preview questions with `limited: true`.
   - `https://www.mais.hk/robots.txt` still returns the Content Signal policy.

## Cloudflare AI Crawl Control Settings

In Cloudflare Dashboard:

1. Open `mais.hk`.
2. Go to AI Crawl Control.
3. Open Overview / Metrics first and confirm traffic is visible.
4. Open Crawlers.
5. Set these AI Crawler category entries to `Block`:
   - `GPTBot`
   - `ClaudeBot`
   - `Google-CloudVertexBot`
   - `Bytespider`
   - `CCBot`
   - `Meta-ExternalAgent`
   - `FacebookBot`
   - `Amazonbot`
6. Keep AI Search / AI Assistant entries in observe/allow mode unless the owner explicitly chooses a stricter policy:
   - `ChatGPT-User`
   - `OAI-SearchBot`
   - `Claude-SearchBot`
   - `Claude-User`
   - `PerplexityBot`
   - `Perplexity-User`
   - `Applebot`
   - `DuckAssistBot`
   - `MistralAI-User`
7. In Directives / Robots.txt, verify:
   - HTTP status 200 for `https://www.mais.hk/robots.txt`.
   - Content Signal includes `ai-train=no`.
   - Known blocked crawlers are listed or governed by Cloudflare managed robots settings.

## Cloudflare WAF Fallback Expression

If AI Crawl Control is not yet available in the dashboard, create a Cloudflare WAF custom rule with action `Block` and place it before broad allow/skip rules.

Free/all-plan user-agent expression:

```txt
(
  lower(http.user_agent) contains "amazonbot" or
  lower(http.user_agent) contains "applebot-extended" or
  lower(http.user_agent) contains "bytespider" or
  lower(http.user_agent) contains "ccbot" or
  lower(http.user_agent) contains "claudebot" or
  lower(http.user_agent) contains "google-cloudvertexbot" or
  lower(http.user_agent) contains "google-extended" or
  lower(http.user_agent) contains "gptbot" or
  lower(http.user_agent) contains "meta-externalagent" or
  lower(http.user_agent) contains "facebookbot"
)
and not http.request.uri.path eq "/robots.txt"
```

Bot Management customers can use Cloudflare detection IDs from the AI Crawl Control bot reference instead of user-agent matching. This is stronger because user agents can be spoofed.

No-secret API helper:

```bash
node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs --apply
```

The helper defaults to dry-run, prints the payload and endpoint plan without mutating Cloudflare, and only records Cloudflare token/zone readiness in redacted form.

## Post-Activation Smoke

Before and after activation, run the no-secret preflight helper:

```bash
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-training-crawler-blocks
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-api-preview-limit
node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-cloudflare --require-training-crawler-blocks
```

Optional Cloudflare API checks are enabled only when these environment variable names are set:

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs
```

The helper redacts identifiers and never prints token values.

Use the plain preflight before DNS cutover because it reports current state without failing. Use `--require-training-crawler-blocks` for the crawler-control layer. Use `--require-api-preview-limit` as a separate S12/S11 API收口 health gate. Use `--require-cloudflare --require-training-crawler-blocks` only after the registrar nameserver/proxy cutover, because it must fail until Cloudflare is in the live request path.

Run these after Cloudflare is active:

```bash
dig +short mais.hk NS
curl -I https://www.mais.hk
curl -A 'GPTBot/1.1' -I https://www.mais.hk/
curl -A 'Google-CloudVertexBot/1.0' -I https://www.mais.hk/
curl -A 'CCBot/2.0' -I https://www.mais.hk/robots.txt
node -e "fetch('https://www.mais.hk/api/questions').then(r=>r.json()).then(j=>console.log(j.questions.length, j.limited))"
```

Expected:

- Nameservers are Cloudflare nameservers.
- Response headers include Cloudflare edge headers.
- Blocked AI training crawler requests return 403 or the configured Cloudflare block response.
- `/robots.txt` remains readable and includes `ai-train=no`.
- Anonymous `/api/questions` still returns 20 preview questions with `limited: true`.

## Rollback

1. Disable Cloudflare AI Crawl Control crawler blocks first.
2. If traffic is still affected, disable the Cloudflare WAF custom rule.
3. If Cloudflare proxying causes application issues, set DNS records to DNS-only while preserving Cloudflare zone records.
4. If needed, revert registrar nameservers to Vercel DNS.
5. Confirm `www.mais.hk` still serves the Vercel deployment and Vercel Firewall rules remain active.

## Evidence To Capture

- Cloudflare zone id, redacted account name, and active zone status.
- Screenshots or exported settings for AI Crawl Control Crawlers actions.
- WAF rule name, expression, order, and action.
- Live smoke command output.
- Output of `node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs`.
- Any false-positive reports from teacher/student workflows.

## Sources

- Cloudflare AI Crawl Control get started: https://developers.cloudflare.com/ai-crawl-control/get-started/
- Cloudflare AI Crawl Control bot reference: https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- Cloudflare AI Crawl Control with WAF: https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/
- Cloudflare manage AI crawlers: https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/
- Cloudflare Block AI Bots: https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- Cloudflare managed robots.txt / Content Signals: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- Cloudflare create custom rule via API: https://developers.cloudflare.com/waf/custom-rules/create-api/
- Cloudflare Rulesets API create: https://developers.cloudflare.com/ruleset-engine/rulesets-api/create/
- Cloudflare Rulesets API update rule: https://developers.cloudflare.com/ruleset-engine/rulesets-api/update-rule/
- Cloudflare Rules language functions: https://developers.cloudflare.com/ruleset-engine/rules-language/functions/
- Cloudflare full DNS setup: https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- Cloudflare DNS import/export records: https://developers.cloudflare.com/dns/manage-dns-records/how-to/import-and-export/
- Vercel managing DNS records: https://vercel.com/docs/domains/managing-dns-records
