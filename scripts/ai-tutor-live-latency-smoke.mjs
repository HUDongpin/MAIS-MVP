#!/usr/bin/env node
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_BASE_URL = "https://www.mais.hk";
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "ai-tutor-live-latency-smoke");
const DEFAULT_PROMPT = "Give one short hint for factorising x^2 - 9. Do not give the final answer.";
const requestAgents = new Map();

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.AI_TUTOR_LIVE_BASE_URL || DEFAULT_BASE_URL,
    json: false,
    selfTest: false,
    statusOnly: false,
    textOnly: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = argv[++index];
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--self-test") {
      args.selfTest = true;
    } else if (arg === "--status-only") {
      args.statusOnly = true;
    } else if (arg === "--text-only") {
      args.textOnly = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function percentile(values, percentileValue) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function smokeConfig(args) {
  return {
    artifactDir: process.env.AI_TUTOR_LIVE_LATENCY_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    baseUrl: stripTrailingSlash(args.baseUrl),
    finalP95ThresholdMs: boundedInteger(process.env.AI_TUTOR_LIVE_FINAL_P95_MS, 8_000, 500, 60_000),
    finalP99ThresholdMs: boundedInteger(process.env.AI_TUTOR_LIVE_FINAL_P99_MS, 12_000, 500, 60_000),
    firstEventThresholdMs: boundedInteger(process.env.AI_TUTOR_LIVE_FIRST_EVENT_MS, 1_000, 100, 10_000),
    prompt: process.env.AI_TUTOR_LIVE_PROMPT || DEFAULT_PROMPT,
    resolveIp: validResolveIp(process.env.AI_TUTOR_LIVE_RESOLVE_IP),
    statusIntervalMs: boundedInteger(process.env.AI_TUTOR_LIVE_STATUS_INTERVAL_MS, 2_000, 0, 60_000),
    statusP95ThresholdMs: boundedInteger(process.env.AI_TUTOR_LIVE_STATUS_P95_MS, 2_000, 100, 60_000),
    statusSamples: boundedInteger(process.env.AI_TUTOR_LIVE_STATUS_SAMPLES, 5, 1, 20),
    statusWarmupSamples: boundedInteger(process.env.AI_TUTOR_LIVE_STATUS_WARMUP_SAMPLES, 2, 0, 5),
    textIntervalMs: boundedInteger(process.env.AI_TUTOR_LIVE_TEXT_INTERVAL_MS, 2_000, 0, 120_000),
    textSamples: boundedInteger(process.env.AI_TUTOR_LIVE_TEXT_SAMPLES, 3, 1, 10),
    totalAbortMs: boundedInteger(process.env.AI_TUTOR_LIVE_TOTAL_ABORT_MS, 15_000, 2_000, 90_000)
  };
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function validResolveIp(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return isIP(trimmed) ? trimmed : null;
}

function cookieHeaderFromSetCookie(value) {
  if (!value) return "";
  const serialized = Array.isArray(value) ? value.join(", ") : value;
  return serialized
    .split(/,(?=\s*[^;,=\s]+=)/)
    .map((cookie) => cookie.trim().split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookieHeaders(...values) {
  const cookies = new Map();
  for (const value of values) {
    for (const part of value.split(";")) {
      const cookie = part.trim();
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex <= 0) continue;
      const name = cookie.slice(0, separatorIndex).trim();
      const cookieValue = cookie.slice(separatorIndex + 1).trim();
      if (!name || !cookieValue) continue;
      cookies.set(name, `${name}=${cookieValue}`);
    }
  }
  return [...cookies.values()].join("; ");
}

function namedCookieFromSetCookie(value, name) {
  const cookieHeader = cookieHeaderFromSetCookie(value);
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`)) ?? "";
}

function vercelBypassCookieFromSetCookie(value) {
  return namedCookieFromSetCookie(value, "_vercel_jwt");
}

function appSessionCookieFromSetCookie(value) {
  return namedCookieFromSetCookie(value, "hk_math_session");
}

function loginCredentials() {
  const username = process.env.AI_TUTOR_LIVE_USERNAME;
  const password = process.env.AI_TUTOR_LIVE_PASSWORD;
  if (username && password) return { username, password };

  if (process.env.AI_TUTOR_LIVE_USE_DEMO_LOGIN === "1") {
    return {
      username: "HK Student Peter",
      password: "12345"
    };
  }

  return null;
}

function requireLoginCredentials() {
  const credentials = loginCredentials();
  if (!credentials) {
    throw new Error(
      [
        "Authenticated AI Tutor live latency smoke is disabled.",
        "Set AI_TUTOR_LIVE_USERNAME and AI_TUTOR_LIVE_PASSWORD, or set AI_TUTOR_LIVE_USE_DEMO_LOGIN=1 for the demo account.",
        "This guard is intentional because text probes can write production tutor message/usage records."
      ].join(" ")
    );
  }
  return credentials;
}

function vercelProtectionBypassSecret() {
  return process.env.AI_TUTOR_LIVE_VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || "";
}

function vercelProtectionBypassHeaders() {
  const secret = vercelProtectionBypassSecret();
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

function requestLookup(config) {
  if (!config.resolveIp) return undefined;
  const family = isIP(config.resolveIp);
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address: config.resolveIp, family }]);
      return;
    }
    callback(null, config.resolveIp, family);
  };
}

function requestModuleForUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol === "http:") return http;
  if (parsed.protocol === "https:") return https;
  throw new Error(`Unsupported URL protocol for smoke request: ${parsed.protocol}`);
}

function requestOptions(url, config, {
  body,
  headers = {},
  method = "GET"
} = {}) {
  const parsed = new URL(url);
  const requestHeaders = {
    ...headers
  };
  if (typeof body === "string" && !Object.keys(requestHeaders).some((key) => key.toLowerCase() === "content-length")) {
    requestHeaders["Content-Length"] = String(Buffer.byteLength(body));
  }

  return {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: `${parsed.pathname}${parsed.search}`,
    method,
    headers: requestHeaders,
    agent: requestAgentForUrl(url, config),
    lookup: requestLookup(config),
    protocol: parsed.protocol
  };
}

function requestAgentForUrl(url, config) {
  const parsed = new URL(url);
  const key = `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === "https:" ? 443 : 80)}:${config.resolveIp ?? "dns"}`;
  const existing = requestAgents.get(key);
  if (existing) return existing;

  const options = {
    keepAlive: true,
    keepAliveMsecs: 60_000,
    maxSockets: 1,
    lookup: requestLookup(config)
  };
  const agent = parsed.protocol === "https:"
    ? new https.Agent(options)
    : new http.Agent(options);
  requestAgents.set(key, agent);
  return agent;
}

function requestTextWithTiming(url, config, {
  body,
  headers = {},
  method = "GET",
  timeoutMs = config.totalAbortMs
} = {}) {
  const startedAt = Date.now();
  const requestModule = requestModuleForUrl(url);

  return new Promise((resolve, reject) => {
    const request = requestModule.request(
      requestOptions(url, config, { body, headers, method }),
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const elapsedMs = Date.now() - startedAt;
          const status = response.statusCode ?? 0;
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            elapsedMs,
            headers: response.headers,
            ok: status >= 200 && status < 300,
            status,
            text
          });
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      const error = new Error("request-timeout");
      error.name = "AbortError";
      request.destroy(error);
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function primeVercelProtectionBypassCookie(baseUrl, config) {
  if (!vercelProtectionBypassSecret()) return "";

  try {
    const response = await requestTextWithTiming(`${baseUrl}/api/ai-tutor/status`, config, {
      headers: {
        "Accept": "text/html",
        "User-Agent": "MAIS-AI-Tutor-Live-Latency-Smoke/1.0",
        ...vercelProtectionBypassHeaders(),
        "x-vercel-set-bypass-cookie": "true"
      }
    });
    const cookieHeader = vercelBypassCookieFromSetCookie(response.headers["set-cookie"]);
    if (response.status < 200 || response.status >= 400 || !cookieHeader) {
      throw new Error("missing-bypass-cookie");
    }
    return cookieHeader;
  } catch {
    throw new Error("Vercel protection bypass cookie setup failed.");
  }
}

async function login(baseUrl, config, credentials, protectionCookieHeader = "") {
  const response = await requestTextWithTiming(`${baseUrl}/api/auth/login`, config, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "MAIS-AI-Tutor-Live-Latency-Smoke/1.0",
      ...(protectionCookieHeader ? { Cookie: protectionCookieHeader } : {})
    },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
      grade: "S3",
      language: "en",
      theme: "dark"
    })
  });

  const appSessionCookieHeader = appSessionCookieFromSetCookie(response.headers["set-cookie"]);

  if (!response.ok || !appSessionCookieHeader) {
    throw new Error(`AI Tutor live latency smoke login failed with HTTP ${response.status}.`);
  }

  return {
    cookieHeader: mergeCookieHeaders(protectionCookieHeader, appSessionCookieHeader),
    usernameRedacted: "configured"
  };
}

async function fetchJsonWithTiming(url, config) {
  const response = await requestTextWithTiming(url, config, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "MAIS-AI-Tutor-Live-Latency-Smoke/1.0",
      ...vercelProtectionBypassHeaders()
    }
  });
  let body = {};
  try {
    body = JSON.parse(response.text);
  } catch {
    body = {};
  }
  return {
    body,
    elapsedMs: response.elapsedMs,
    ok: response.ok,
    status: response.status,
    vercelCache: response.headers["x-vercel-cache"],
    vercelId: response.headers["x-vercel-id"]
  };
}

async function runStatusSamples(config) {
  const samples = [];
  for (let index = 0; index < config.statusSamples; index += 1) {
    if (index > 0 && config.statusIntervalMs > 0) await delay(config.statusIntervalMs);
    const sample = await fetchJsonWithTiming(`${config.baseUrl}/api/ai-tutor/status`, config);
    samples.push({
      configured: Boolean(sample.body?.configured),
      elapsedMs: sample.elapsedMs,
      model: typeof sample.body?.model === "string" ? sample.body.model : null,
      ok: sample.ok,
      provider: typeof sample.body?.provider === "string" ? sample.body.provider : null,
      status: sample.status,
      vercelCache: sample.vercelCache,
      vercelId: sample.vercelId
    });
  }
  return samples;
}

function parseSseEvent(block) {
  let event = "message";
  const dataLines = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) return null;

  let data = {};
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    data = { parseError: true };
  }

  return { event, data };
}

async function readSseResponse(response, startedAt) {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return {
      events: [],
      finalBody: {},
      finalEventMs: Date.now() - startedAt,
      firstEventMs: null,
      rawBytes: Buffer.byteLength(text)
    };
  }

  const decoder = new TextDecoder();
  const events = [];
  let buffer = "";
  let firstEventMs = null;
  let finalBody = {};
  let finalEventMs = null;
  let rawBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    rawBytes += value.byteLength;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundaryIndex = buffer.search(/\r?\n\r?\n/);
      if (boundaryIndex < 0) break;
      const block = buffer.slice(0, boundaryIndex);
      const boundary = buffer.slice(boundaryIndex).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
      buffer = buffer.slice(boundaryIndex + boundary.length);
      const parsed = parseSseEvent(block);
      if (!parsed) continue;
      if (firstEventMs === null) firstEventMs = Date.now() - startedAt;
      events.push(parsed);

      if (parsed.event === "final") {
        finalEventMs = Date.now() - startedAt;
        const body = parsed.data?.body;
        finalBody = body && typeof body === "object" ? body : {};
      }
    }
  }

  return {
    events,
    finalBody,
    finalEventMs: finalEventMs ?? Date.now() - startedAt,
    firstEventMs,
    rawBytes
  };
}

function requestSseWithTiming(url, config, {
  body,
  headers = {},
  method = "POST",
  timeoutMs = config.totalAbortMs
} = {}) {
  const startedAt = Date.now();
  const requestModule = requestModuleForUrl(url);

  return new Promise((resolve, reject) => {
    const request = requestModule.request(
      requestOptions(url, config, { body, headers, method }),
      (response) => {
        const decoder = new TextDecoder();
        const events = [];
        let buffer = "";
        let finalBody = {};
        let finalEventMs = null;
        let firstEventMs = null;
        let rawBytes = 0;

        const parseBufferedEvents = () => {
          while (true) {
            const boundaryIndex = buffer.search(/\r?\n\r?\n/);
            if (boundaryIndex < 0) break;
            const block = buffer.slice(0, boundaryIndex);
            const boundary = buffer.slice(boundaryIndex).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
            buffer = buffer.slice(boundaryIndex + boundary.length);
            const parsed = parseSseEvent(block);
            if (!parsed) continue;
            if (firstEventMs === null) firstEventMs = Date.now() - startedAt;
            events.push(parsed);

            if (parsed.event === "final") {
              finalEventMs = Date.now() - startedAt;
              const parsedBody = parsed.data?.body;
              finalBody = parsedBody && typeof parsedBody === "object" ? parsedBody : {};
            }
          }
        };

        response.on("data", (chunk) => {
          const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          rawBytes += value.byteLength;
          buffer += decoder.decode(value, { stream: true });
          parseBufferedEvents();
        });
        response.on("end", () => {
          buffer += decoder.decode();
          parseBufferedEvents();
          const status = response.statusCode ?? 0;
          resolve({
            events,
            finalBody,
            finalEventMs: finalEventMs ?? Date.now() - startedAt,
            firstEventMs,
            ok: status >= 200 && status < 300,
            rawBytes,
            status
          });
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      const error = new Error("request-timeout");
      error.name = "AbortError";
      request.destroy(error);
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

async function runTextSample(config, cookieHeader, index) {
  const startedAt = Date.now();

  try {
    const parsed = await requestSseWithTiming(`${config.baseUrl}/api/ai-tutor`, config, {
      method: "POST",
      headers: {
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
        "User-Agent": "MAIS-AI-Tutor-Live-Latency-Smoke/1.0",
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        input: `${config.prompt} Smoke sample ${index + 1}.`,
        context: {
          mode: "general",
          title: "A11/A22 live AI Tutor latency smoke"
        },
        grade: "S3",
        language: "en",
        page: "/practice"
      })
    });
    const finalReply = typeof parsed.finalBody?.reply === "string" ? parsed.finalBody.reply : "";
    const finalMode = typeof parsed.finalBody?.mode === "string" ? parsed.finalBody.mode : null;
    const providerStart = parsed.events.find((event) =>
      event.event === "status" && event.data?.phase === "provider-start"
    );

    return {
      eventCount: parsed.events.length,
      finalEventMs: parsed.finalEventMs,
      firstEventMs: parsed.firstEventMs,
      mode: finalMode,
      ok: parsed.ok && Boolean(finalReply),
      provider: typeof providerStart?.data?.provider === "string" ? providerStart.data.provider : null,
      rawBytes: parsed.rawBytes,
      replyChars: finalReply.length,
      status: parsed.status
    };
  } catch (error) {
    return {
      errorKind: error instanceof Error ? error.name : "UnknownError",
      eventCount: 0,
      finalEventMs: Date.now() - startedAt,
      firstEventMs: null,
      mode: null,
      ok: false,
      provider: null,
      rawBytes: 0,
      replyChars: 0,
      status: 0
    };
  }
}

async function runTextSamples(config) {
  const credentials = requireLoginCredentials();
  const protectionCookieHeader = await primeVercelProtectionBypassCookie(config.baseUrl, config);
  const session = await login(config.baseUrl, config, credentials, protectionCookieHeader);
  const samples = [];
  await requestTextWithTiming(`${config.baseUrl}/api/ai-tutor`, config, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "MAIS-AI-Tutor-Live-Latency-Smoke/1.0",
      Cookie: session.cookieHeader
    }
  }).catch(() => undefined);

  for (let index = 0; index < config.textSamples; index += 1) {
    if (index > 0 && config.textIntervalMs > 0) await delay(config.textIntervalMs);
    samples.push(await runTextSample(config, session.cookieHeader, index));
  }

  return {
    login: {
      username: session.usernameRedacted
    },
    samples
  };
}

function summarizeStatus(samples, config) {
  const durations = samples.map((sample) => sample.elapsedMs);
  const p95Ms = percentile(durations, 95);
  const failures = [];
  const latest = samples.at(-1);

  if (samples.some((sample) => !sample.ok)) failures.push("status endpoint returned a non-2xx response");
  if (samples.some((sample) => sample.provider !== "qwen")) failures.push("status provider is not qwen");
  if (samples.some((sample) => !sample.configured)) failures.push("status endpoint does not report configured live mode");
  if (p95Ms !== null && p95Ms > config.statusP95ThresholdMs) failures.push(`status p95 ${p95Ms}ms > ${config.statusP95ThresholdMs}ms`);

  return {
    configured: latest?.configured ?? false,
    count: samples.length,
    failures,
    model: latest?.model ?? null,
    p95Ms,
    provider: latest?.provider ?? null,
    success: failures.length === 0
  };
}

function summarizeText(samples, config) {
  const firstEventDurations = samples.map((sample) => sample.firstEventMs).filter((value) => value !== null);
  const finalDurations = samples.map((sample) => sample.finalEventMs);
  const firstEventMaxMs = firstEventDurations.length ? Math.max(...firstEventDurations) : null;
  const finalP95Ms = percentile(finalDurations, 95);
  const finalP99Ms = percentile(finalDurations, 99);
  const failures = [];

  if (samples.some((sample) => !sample.ok)) failures.push("one or more text samples did not return a non-empty final/fallback reply");
  if (samples.some((sample) => sample.status !== 200)) failures.push("one or more text samples did not return HTTP 200");
  if (samples.some((sample) => sample.firstEventMs === null)) failures.push("one or more text samples did not expose an SSE event");
  if (firstEventMaxMs !== null && firstEventMaxMs > config.firstEventThresholdMs) {
    failures.push(`first visible event max ${firstEventMaxMs}ms > ${config.firstEventThresholdMs}ms`);
  }
  if (finalP95Ms !== null && finalP95Ms > config.finalP95ThresholdMs) failures.push(`final/fallback p95 ${finalP95Ms}ms > ${config.finalP95ThresholdMs}ms`);
  if (finalP99Ms !== null && finalP99Ms > config.finalP99ThresholdMs) failures.push(`final/fallback p99 ${finalP99Ms}ms > ${config.finalP99ThresholdMs}ms`);

  return {
    count: samples.length,
    failures,
    finalP95Ms,
    finalP99Ms,
    firstEventMaxMs,
    firstEventP95Ms: percentile(firstEventDurations, 95),
    success: failures.length === 0
  };
}

function buildReport({ config, status, statusSamples, text, textSamples, statusOnly }) {
  const summary = {
    baseUrl: config.baseUrl,
    completedAt: new Date().toISOString(),
    gates: {
      finalP95Ms: config.finalP95ThresholdMs,
      finalP99Ms: config.finalP99ThresholdMs,
      firstEventMs: config.firstEventThresholdMs,
      statusP95Ms: config.statusP95ThresholdMs
    },
    status,
    statusOnly,
    text,
    success: (status ? status.success : true) && (statusOnly ? true : Boolean(text?.success))
  };

  return {
    summary,
    samples: {
      status: statusSamples.measured,
      statusWarmup: statusSamples.warmup,
      text: textSamples
    }
  };
}

async function writeArtifact(config, report) {
  await fs.mkdir(config.artifactDir, { recursive: true });
  const outputPath = path.join(config.artifactDir, "latest.json");
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return outputPath;
}

function printHuman(report, artifactPath) {
  const { summary } = report;
  console.log("AI Tutor live latency smoke");
  console.log(`Target: ${summary.baseUrl}`);
  if (summary.status) {
    console.log(`Status: provider=${summary.status.provider ?? "unknown"} model=${summary.status.model ?? "unknown"} p95=${summary.status.p95Ms ?? "n/a"}ms`);
  }
  if (summary.text) {
    console.log(
      `Text SSE: firstEventMax=${summary.text.firstEventMaxMs ?? "n/a"}ms finalP95=${summary.text.finalP95Ms ?? "n/a"}ms finalP99=${summary.text.finalP99Ms ?? "n/a"}ms`
    );
  }
  console.log(`Artifact: ${artifactPath}`);

  const failures = [
    ...(summary.status?.failures ?? []).map((failure) => `status: ${failure}`),
    ...(summary.text?.failures ?? []).map((failure) => `text: ${failure}`)
  ];
  if (failures.length) {
    console.error("Gate failed:");
    for (const failure of failures) console.error(`- ${failure}`);
  } else {
    console.log("Gate passed.");
  }
}

function runSelfTest() {
  const cookieHeader = cookieHeaderFromSetCookie("a=1; Path=/, b=2; Path=/");
  if (cookieHeader !== "a=1; b=2") throw new Error("cookie parser self-test failed");
  if (percentile([10, 20, 30], 95) !== 30) throw new Error("percentile self-test failed");
  const parsed = parseSseEvent("event: final\ndata: {\"body\":{\"reply\":\"ok\"}}");
  if (parsed?.event !== "final" || parsed.data?.body?.reply !== "ok") throw new Error("SSE parser self-test failed");
  return {
    success: true
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.statusOnly && args.textOnly) {
    throw new Error("--status-only and --text-only cannot be used together.");
  }
  if (args.selfTest) {
    const result = runSelfTest();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const config = smokeConfig(args);
  const statusWarmupSamples = args.textOnly || config.statusWarmupSamples < 1
    ? []
    : await runStatusSamples({
        ...config,
        statusSamples: config.statusWarmupSamples
      });
  const measuredStatusSamples = args.textOnly ? [] : await runStatusSamples(config);
  const statusSamples = {
    measured: measuredStatusSamples,
    warmup: statusWarmupSamples
  };
  const status = args.textOnly ? null : summarizeStatus(measuredStatusSamples, config);
  let textResult = null;
  let textSamples = [];

  if (!args.statusOnly) {
    textResult = await runTextSamples(config);
    textSamples = textResult.samples;
  }

  const text = args.statusOnly ? null : summarizeText(textSamples, config);
  const report = buildReport({
    config,
    status,
    statusOnly: args.statusOnly,
    statusSamples,
    text,
    textSamples
  });
  const artifactPath = await writeArtifact(config, report);

  if (args.json) {
    console.log(JSON.stringify({
      artifactPath,
      ...report.summary
    }, null, 2));
  } else {
    printHuman(report, artifactPath);
  }

  if (!report.summary.success) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
