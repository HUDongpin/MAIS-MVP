#!/usr/bin/env node

import { resolveNs } from "node:dns/promises";

const domain = "mais.hk";
const host = "www.mais.hk";
const baseUrl = `https://${host}`;

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

const assistantOrSearchCrawlersToObserve = [
  "ChatGPT-User",
  "OAI-SearchBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "DuckAssistBot",
  "MistralAI-User"
];

const wafExpression = `(
${trainingCrawlers.map((crawler) => `  lower(http.user_agent) contains "${crawler.toLowerCase()}"`).join(" or\n")}
)
and not http.request.uri.path eq "/robots.txt"`;

const args = new Set(process.argv.slice(2));
const requireCloudflare = args.has("--require-cloudflare");
const requireTrainingCrawlerBlocks = args.has("--require-training-crawler-blocks");
const requireApiPreviewLimit = args.has("--require-api-preview-limit");

function usage() {
  return {
    usage: [
      "node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs",
      "node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-training-crawler-blocks",
      "node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-api-preview-limit",
      "node coordination/reports/cloudflare-ai-crawl-control-preflight.mjs --require-cloudflare --require-training-crawler-blocks"
    ],
    optionalEnvironmentVariableNames: {
      token: ["CLOUDFLARE_API_TOKEN", "CF_API_TOKEN"],
      zoneId: ["CLOUDFLARE_ZONE_ID", "CF_ZONE_ID"]
    },
    flags: {
      "--require-cloudflare": "Exit nonzero unless www.mais.hk is actively served through Cloudflare edge headers.",
      "--require-training-crawler-blocks": "Exit nonzero unless robots policy and crawler-blocking smoke checks pass.",
      "--require-api-preview-limit": "Exit nonzero unless anonymous /api/questions returns the expected preview-limited payload."
    }
  };
}

if (args.has("--help") || args.has("-h")) {
  console.log(JSON.stringify(usage(), null, 2));
  process.exit(0);
}

function redactIdentifier(value) {
  if (!value) return null;
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeFetchText(url, init = {}) {
  const attempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        ...init,
        signal: init.signal ?? controller.signal,
        headers: {
          "cache-control": "no-cache",
          "user-agent": "MAIS-S22-crawl-control-preflight/1.0",
          ...(init.headers ?? {})
        }
      });
      return {
        ok: true,
        attempts: attempt,
        status: response.status,
        contentType: response.headers.get("content-type"),
        server: response.headers.get("server"),
        cfRay: response.headers.get("cf-ray"),
        text: await response.text()
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < attempts) {
        await sleep(750);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    attempts,
    error: lastError
  };
}

async function currentEdgeState() {
  const nameservers = await resolveNs(domain).catch((error) => ({ error: error.message }));
  const homepage = await safeFetchText(baseUrl);
  const robots = await safeFetchText(`${baseUrl}/robots.txt?preflight=${Date.now()}`);
  const questions = await safeFetchText(`${baseUrl}/api/questions?preflight=${Date.now()}`);
  const gptbot = await safeFetchText(baseUrl, { headers: { "user-agent": "GPTBot/1.1" } });
  const vertex = await safeFetchText(baseUrl, { headers: { "user-agent": "Google-CloudVertexBot/1.0" } });

  let questionsSummary = {
    fetchOk: questions.ok === true,
    attempts: questions.attempts ?? null,
    status: questions.status ?? null,
    contentType: questions.contentType ?? null
  };
  if (questions.ok) {
    try {
      const body = JSON.parse(questions.text);
      questionsSummary = {
        ...questionsSummary,
        questionCount: Array.isArray(body.questions) ? body.questions.length : null,
        limited: body.limited === true
      };
    } catch {
      questionsSummary = {
        ...questionsSummary,
        parseError: true
      };
    }
  } else {
    questionsSummary = {
      ...questionsSummary,
      error: questions.error ?? "fetch failed before an HTTP response was available"
    };
  }

  return {
    nameservers,
    homepage: {
      status: homepage.status,
      server: homepage.server,
      hasCloudflareHeader: Boolean(homepage.cfRay),
      cfRayPresent: Boolean(homepage.cfRay)
    },
    robots: {
      status: robots.status,
      contentType: robots.contentType,
      hasContentSignal: robots.text?.includes("Content-Signal: search=yes, ai-train=no, ai-input=no") ?? false,
      coveredTrainingCrawlers: trainingCrawlers.filter((crawler) => robots.text?.includes(`User-agent: ${crawler}`))
    },
    apiQuestions: questionsSummary,
    crawlerBlockingSmoke: {
      gptbotStatus: gptbot.status,
      googleCloudVertexBotStatus: vertex.status
    }
  };
}

async function cloudflareCredentialReadiness() {
  const token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? process.env.CF_ZONE_ID;
  const readiness = {
    tokenEnvPresent: Boolean(token),
    zoneIdEnvPresent: Boolean(zoneId),
    zoneIdRedacted: redactIdentifier(zoneId)
  };

  if (!token || !zoneId) {
    return {
      ...readiness,
      apiReachable: false,
      reason: "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to query Cloudflare without printing secrets."
    };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const body = await response.json();
    return {
      ...readiness,
      apiReachable: response.ok,
      status: response.status,
      zoneName: body?.result?.name ?? null,
      zoneStatus: body?.result?.status ?? null,
      nameServersCount: Array.isArray(body?.result?.name_servers) ? body.result.name_servers.length : null
    };
  } catch (error) {
    return {
      ...readiness,
      apiReachable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function evaluateGates({ activeOnCloudflare, edge }) {
  const coveredTrainingCrawlers = new Set(edge.robots.coveredTrainingCrawlers);
  const missingRobotsCrawlers = trainingCrawlers.filter((crawler) => !coveredTrainingCrawlers.has(crawler));
  const checks = {
    cloudflareEdgeActive: {
      required: requireCloudflare,
      passed: activeOnCloudflare,
      evidence: {
        server: edge.homepage.server ?? null,
        cfRayPresent: edge.homepage.cfRayPresent === true
      }
    },
    robotsTrainingPolicy: {
      required: requireTrainingCrawlerBlocks,
      passed:
        edge.robots.status === 200 &&
        edge.robots.hasContentSignal === true &&
        missingRobotsCrawlers.length === 0,
      evidence: {
        status: edge.robots.status ?? null,
        hasContentSignal: edge.robots.hasContentSignal === true,
        coveredTrainingCrawlerCount: edge.robots.coveredTrainingCrawlers.length,
        missingRobotsCrawlers
      }
    },
    anonymousQuestionsPreviewLimited: {
      required: requireApiPreviewLimit,
      passed: edge.apiQuestions?.questionCount === 20 && edge.apiQuestions?.limited === true,
      evidence: edge.apiQuestions
    },
    trainingCrawlerRequestBlocked: {
      required: requireTrainingCrawlerBlocks,
      passed:
        edge.crawlerBlockingSmoke.gptbotStatus === 403 &&
        edge.crawlerBlockingSmoke.googleCloudVertexBotStatus === 403,
      evidence: edge.crawlerBlockingSmoke
    }
  };

  const failedRequiredChecks = Object.entries(checks)
    .filter(([, check]) => check.required && !check.passed)
    .map(([name, check]) => ({ name, evidence: check.evidence }));

  return {
    requested: {
      requireCloudflare,
      requireTrainingCrawlerBlocks,
      requireApiPreviewLimit
    },
    checks,
    passed: failedRequiredChecks.length === 0,
    failedRequiredChecks
  };
}

const edge = await currentEdgeState();
const cloudflare = await cloudflareCredentialReadiness();
const activeOnCloudflare = Boolean(edge.homepage?.hasCloudflareHeader);
const gates = evaluateGates({ activeOnCloudflare, edge });

const result = {
  checkedAt: new Date().toISOString(),
  target: { domain, host, baseUrl },
  mode: gates.requested,
  activeOnCloudflare,
  cloudflare,
  edge,
  gates,
  recommendedTrainingCrawlerBlocks: trainingCrawlers,
  assistantOrSearchCrawlersToObserve,
  cloudflareWafFallbackExpression: wafExpression,
  nextAction: activeOnCloudflare
    ? "Open Cloudflare AI Crawl Control and set the recommended training crawlers to Block."
    : "Onboard/proxy mais.hk through Cloudflare before AI Crawl Control can enforce on this domain."
};

console.log(JSON.stringify(result, null, 2));

if (!gates.passed) {
  process.exit(1);
}
