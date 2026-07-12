#!/usr/bin/env node

const phase = "http_request_firewall_custom";
const ruleDescription = "MAIS AI training crawler block";
const rulesetName = "MAIS AI crawler WAF entrypoint";
const apiBase = "https://api.cloudflare.com/client/v4";

const trainingCrawlers = [
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "Google-CloudVertexBot",
  "Google-Extended",
  "GPTBot",
  "meta-externalagent",
  "FacebookBot"
];

const expression = `(
${trainingCrawlers.map((crawler) => `  lower(http.user_agent) contains "${crawler.toLowerCase()}"`).join(" or\n")}
)
and not http.request.uri.path eq "/robots.txt"`;

const rulePayload = {
  description: ruleDescription,
  expression,
  action: "block",
  action_parameters: {
    response: {
      status_code: 403,
      content: "AI training crawler access is not permitted.",
      content_type: "text/plain"
    }
  },
  enabled: true
};

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function redactIdentifier(value) {
  if (!value) return null;
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}

function usage() {
  return {
    usage: [
      "node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs",
      "CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node coordination/reports/cloudflare-ai-crawl-control-waf-upsert.mjs --apply"
    ],
    defaultMode: "dry-run",
    applyFlag: "--apply",
    requiredEnvironmentVariableNames: {
      token: ["CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"],
      zoneId: ["CLOUDFLARE_ZONE_ID", "CF_ZONE_ID"]
    }
  };
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, textPreview: text.slice(0, 200) };
  }
}

function summarizeCloudflareErrors(body) {
  if (!Array.isArray(body?.errors)) return [];
  return body.errors.map((error) => ({
    code: error?.code ?? null,
    message: error?.message ?? "Cloudflare API returned an error"
  }));
}

async function cloudflareFetch({ token, path, method = "GET", body }) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await readJson(response);
  return { response, json };
}

async function expectCloudflareSuccess(request) {
  const { response, json } = await cloudflareFetch(request);
  if (!response.ok || json?.success === false) {
    const error = new Error("Cloudflare API request failed");
    error.status = response.status;
    error.errors = summarizeCloudflareErrors(json);
    throw error;
  }
  return json;
}

async function getEntrypoint({ token, zoneId }) {
  const path = `/zones/${encodeURIComponent(zoneId)}/rulesets/phases/${phase}/entrypoint`;
  const { response, json } = await cloudflareFetch({ token, path });
  if (response.status === 404) return null;
  if (!response.ok || json?.success === false) {
    const error = new Error("Cloudflare entrypoint lookup failed");
    error.status = response.status;
    error.errors = summarizeCloudflareErrors(json);
    throw error;
  }
  return json?.result ?? null;
}

async function applyRule({ token, zoneId }) {
  const entrypoint = await getEntrypoint({ token, zoneId });

  if (!entrypoint?.id) {
    const body = {
      name: rulesetName,
      kind: "zone",
      phase,
      rules: [rulePayload]
    };
    const created = await expectCloudflareSuccess({
      token,
      path: `/zones/${encodeURIComponent(zoneId)}/rulesets`,
      method: "POST",
      body
    });
    const createdRule = created?.result?.rules?.find((rule) => rule?.description === ruleDescription) ?? null;
    return {
      action: "created-entrypoint",
      phase,
      rulesetIdRedacted: redactIdentifier(created?.result?.id),
      ruleIdRedacted: redactIdentifier(createdRule?.id)
    };
  }

  const rulesetId = entrypoint.id;
  const existingRule = Array.isArray(entrypoint.rules)
    ? entrypoint.rules.find((rule) => rule?.description === ruleDescription)
    : null;

  if (existingRule?.id) {
    const updated = await expectCloudflareSuccess({
      token,
      path: `/zones/${encodeURIComponent(zoneId)}/rulesets/${encodeURIComponent(rulesetId)}/rules/${encodeURIComponent(existingRule.id)}`,
      method: "PATCH",
      body: rulePayload
    });
    return {
      action: "updated-rule",
      phase,
      rulesetIdRedacted: redactIdentifier(rulesetId),
      ruleIdRedacted: redactIdentifier(updated?.result?.id ?? existingRule.id)
    };
  }

  const created = await expectCloudflareSuccess({
    token,
    path: `/zones/${encodeURIComponent(zoneId)}/rulesets/${encodeURIComponent(rulesetId)}/rules`,
    method: "POST",
    body: rulePayload
  });
  return {
    action: "created-rule",
    phase,
    rulesetIdRedacted: redactIdentifier(rulesetId),
    ruleIdRedacted: redactIdentifier(created?.result?.id)
  };
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  printJson(usage());
  process.exit(0);
}

const apply = args.has("--apply");
const token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? process.env.CF_ZONE_ID;
const credentialStatus = {
  tokenEnvPresent: Boolean(token),
  zoneIdEnvPresent: Boolean(zoneId),
  zoneIdRedacted: redactIdentifier(zoneId)
};

if (!apply) {
  printJson({
    mode: "dry-run",
    mutation: "none",
    note: "No Cloudflare changes are made without --apply.",
    ...usage(),
    credentialStatus,
    target: {
      phase,
      ruleDescription,
      endpoints: {
        lookupEntrypoint: `GET /zones/{zone_id}/rulesets/phases/${phase}/entrypoint`,
        createEntrypoint: "POST /zones/{zone_id}/rulesets",
        createRule: "POST /zones/{zone_id}/rulesets/{ruleset_id}/rules",
        updateRule: "PATCH /zones/{zone_id}/rulesets/{ruleset_id}/rules/{rule_id}"
      }
    },
    trainingCrawlers,
    payload: rulePayload
  });
  process.exit(0);
}

if (!token || !zoneId) {
  printJson({
    mode: "apply",
    applied: false,
    error: "Missing required Cloudflare environment variable names.",
    requiredEnvironmentVariableNames: usage().requiredEnvironmentVariableNames,
    credentialStatus
  });
  process.exit(1);
}

try {
  const summary = await applyRule({ token, zoneId });
  printJson({
    mode: "apply",
    applied: true,
    credentialStatus,
    ...summary
  });
} catch (error) {
  printJson({
    mode: "apply",
    applied: false,
    credentialStatus,
    status: error?.status ?? null,
    error: error instanceof Error ? error.message : String(error),
    cloudflareErrors: error?.errors ?? []
  });
  process.exit(1);
}
