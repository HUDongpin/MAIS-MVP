#!/usr/bin/env node

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";

const defaultExpressions = [
  "x^2 + 4x",
  "(x+3)(x+2)",
  "a^2 - b^2",
  "2x + 3 = 9",
  "y = 2x + 1",
  "3/5",
  "sqrt(16)=4",
  "sin 30 = 1/2",
  "12 + 7 = 19",
  "m = 4"
];

const cwd = process.cwd();
const dateStamp = new Date().toISOString().slice(0, 10);
const args = parseArgs(process.argv.slice(2));

const options = {
  allowConcurrent: Boolean(args["allow-concurrent"]),
  cleanNext: args["clean-next"] !== "false",
  dryRun: Boolean(args["dry-run"]),
  intervalMs: readNumberArg(args["interval-ms"], 1500),
  label: String(args.label ?? `${dateStamp}-simpletex-uat-local-flow-smoke`),
  maxCalls: readNumberArg(args["max-calls"], defaultExpressions.length),
  port: readNumberArg(args.port, 3100),
  rawPath: String(args.raw ?? `/tmp/mais-simpletex-uat-local-flow-smoke-${dateStamp}.json`),
  reportPath: String(args.report ?? path.join(cwd, "coordination", "reports", `${dateStamp}-simpletex-uat-local-flow-smoke.md`)),
  timeoutMs: readNumberArg(args["timeout-ms"], 45000),
  turbo: Boolean(args.turbo)
};

let serverProcess = null;
let serverLog = "";

try {
  const envPreflight = readEnvPreflight();
  const concurrentProcesses = collectConcurrentWorkspaceProcesses();
  const portInfo = await choosePort(options.port);
  const preflight = {
    env: envPreflight,
    concurrentProcesses,
    port: portInfo,
    cleanNext: options.cleanNext,
    serverMode: options.turbo ? "next dev --turbo" : "next dev"
  };

  if (options.dryRun) {
    const readyToRun = envLooksReady(envPreflight) && portInfo.available && (options.allowConcurrent || concurrentProcesses.length === 0);
    console.log(JSON.stringify({ dryRun: true, readyToRun, preflight }, null, 2));
    process.exit(0);
  }

  if (!envLooksReady(envPreflight)) {
    await writeReport({
      conclusion: "Blocked: environment preflight failed",
      preflight,
      results: [],
      stoppedEarly: true,
      stopReason: "environment preflight failed"
    });
    process.exit(1);
  }

  if (concurrentProcesses.length > 0 && !options.allowConcurrent) {
    await writeReport({
      conclusion: "Blocked: concurrent local Next/Playwright process",
      preflight,
      results: [],
      stoppedEarly: true,
      stopReason: "concurrent local Next/Playwright process"
    });
    process.exit(2);
  }

  if (!portInfo.available) {
    await writeReport({
      conclusion: "Blocked: local smoke port unavailable",
      preflight,
      results: [],
      stoppedEarly: true,
      stopReason: "port unavailable"
    });
    process.exit(2);
  }

  if (options.cleanNext) {
    await fs.promises.rm(path.join(cwd, ".next"), { recursive: true, force: true });
  }

  serverProcess = spawnDevServer(portInfo.port);
  await waitForReady(portInfo.port, 120000);

  const cookieHeader = await login(portInfo.port);
  const results = [];
  let stoppedEarly = false;
  let stopReason = "";

  for (const [index, expression] of defaultExpressions.slice(0, options.maxCalls).entries()) {
    const result = await runOcrCall({
      cookieHeader,
      expression,
      index: index + 1,
      port: portInfo.port
    });
    results.push(result);
    console.log(JSON.stringify(summarizeResult(result)));

    if (shouldStop(result)) {
      stoppedEarly = true;
      stopReason = result.failureClass || "stop condition";
      break;
    }

    if (index < Math.min(options.maxCalls, defaultExpressions.length) - 1) {
      await sleep(options.intervalMs);
    }
  }

  const counts = buildCounts(results);
  const conclusion = classifyConclusion(counts);
  await fs.promises.writeFile(options.rawPath, JSON.stringify({
    label: options.label,
    baseUrl: `http://127.0.0.1:${portInfo.port}`,
    envPreflight,
    stoppedEarly,
    stopReason,
    counts,
    conclusion,
    results
  }, null, 2));
  await writeReport({
    conclusion,
    counts,
    preflight,
    rawPath: options.rawPath,
    results,
    stoppedEarly,
    stopReason
  });
  console.log(JSON.stringify({ reportPath: options.reportPath, rawPath: options.rawPath, counts, conclusion }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failureClass = classifyLocalRuntimeFailure(serverLog) ? "local runtime failure" : "unexpected smoke failure";
  await writeReport({
    conclusion: `Blocked: ${failureClass}`,
    preflight: {
      env: readEnvPreflight(),
      concurrentProcesses: collectConcurrentWorkspaceProcesses(),
      port: { port: options.port, available: false },
      cleanNext: options.cleanNext,
      serverMode: options.turbo ? "next dev --turbo" : "next dev"
    },
    results: [],
    stoppedEarly: true,
    stopReason: message,
    localRuntimeDiagnostics: summarizeLocalRuntimeDiagnostics(serverLog)
  }).catch(() => undefined);
  console.error(JSON.stringify({ error: failureClass, message }));
  process.exit(1);
} finally {
  if (serverProcess) {
    await stopProcessTree(serverProcess);
  }
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function readNumberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnvPreflight() {
  const parsed = readDotEnvLocal();
  const apiUrl = parsed.SIMPLETEX_API_URL?.trim();
  return {
    SIMPLETEX_UAT: envStatus(parsed, "SIMPLETEX_UAT"),
    SIMPLETEX_APP_ID: envStatus(parsed, "SIMPLETEX_APP_ID"),
    SIMPLETEX_APP_SECRET: envStatus(parsed, "SIMPLETEX_APP_SECRET"),
    SIMPLETEX_API_URL: apiUrl === "https://server.simpletex.cn/api/simpletex_ocr" ? "present:expected" : apiUrl ? "present:other" : envStatus(parsed, "SIMPLETEX_API_URL"),
    HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED: parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED === "false" ? "present:false" : parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED ? "present:other" : envStatus(parsed, "HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED"),
    MATHPIX_APP_ID: envStatus(parsed, "MATHPIX_APP_ID"),
    MATHPIX_APP_KEY: envStatus(parsed, "MATHPIX_APP_KEY")
  };
}

function readDotEnvLocal() {
  const filePath = path.join(cwd, ".env.local");
  const parsed = {};
  if (!fs.existsSync(filePath)) return parsed;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[match[1]] = value;
  }
  return parsed;
}

function envStatus(parsed, key) {
  if (!Object.hasOwn(parsed, key)) return "missing";
  return parsed[key]?.trim() ? "present" : "empty";
}

function envLooksReady(envPreflight) {
  return envPreflight.SIMPLETEX_UAT === "present"
    && envPreflight.SIMPLETEX_APP_ID === "empty"
    && envPreflight.SIMPLETEX_APP_SECRET === "empty"
    && envPreflight.SIMPLETEX_API_URL === "present:expected"
    && envPreflight.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED === "present:false"
    && ["missing", "empty"].includes(envPreflight.MATHPIX_APP_ID)
    && ["missing", "empty"].includes(envPreflight.MATHPIX_APP_KEY);
}

function collectConcurrentWorkspaceProcesses() {
  let output = "";
  try {
    output = execFileSync("ps", ["-axo", "pid=,ppid=,stat=,command="], { encoding: "utf8" });
  } catch {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) return null;
      return { pid: Number(match[1]), ppid: Number(match[2]), stat: match[3], command: match[4] };
    })
    .filter(Boolean)
    .filter((item) => item.pid !== process.pid && item.ppid !== process.pid)
    .filter((item) => item.command.includes(cwd))
    .filter((item) => /\b(next build|next dev|next-server|playwright)\b/.test(item.command))
    .map((item) => ({
      pid: item.pid,
      stat: item.stat,
      command: redactCommand(item.command)
    }));
}

function redactCommand(command) {
  return command.replace(/[A-Za-z0-9_=-]{48,}/g, "[REDACTED]");
}

async function choosePort(preferredPort) {
  const candidates = [preferredPort, preferredPort === 3100 ? 3101 : preferredPort + 1];
  for (const port of candidates) {
    if (await isPortAvailable(port)) return { port, available: true };
  }
  return { port: preferredPort, available: false };
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (available) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(available);
    };
    socket.once("connect", () => {
      finish(false);
    });
    socket.once("error", () => finish(true));
    socket.setTimeout(1000, () => {
      finish(false);
    });
  });
}

function spawnDevServer(port) {
  const commandArgs = ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  if (options.turbo) commandArgs.push("--turbo");
  const child = spawn("npm", commandArgs, {
    cwd,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  return child;
}

async function stopProcessTree(child) {
  const descendants = collectDescendantPids(child.pid);
  for (const pid of descendants.reverse()) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already stopped.
    }
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // Already stopped.
  }
  await sleep(500);
  for (const pid of descendants.reverse()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already stopped.
    }
  }
}

function collectDescendantPids(rootPid) {
  let output = "";
  try {
    output = execFileSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" });
  } catch {
    return [];
  }
  const childrenByParent = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\d+)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const children = childrenByParent.get(ppid) ?? [];
    children.push(pid);
    childrenByParent.set(ppid, children);
  }
  const descendants = [];
  const stack = [...(childrenByParent.get(rootPid) ?? [])];
  while (stack.length) {
    const pid = stack.pop();
    descendants.push(pid);
    stack.push(...(childrenByParent.get(pid) ?? []));
  }
  return descendants;
}

async function waitForReady(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess?.exitCode !== null) {
      throw new Error("local server exited before readiness");
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/login`);
      if (response.status === 200) return;
    } catch {
      // Keep polling until timeout.
    }
    await sleep(1000);
  }
  throw new Error("local server readiness timed out");
}

async function login(port) {
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "HK Student Peter", password: "12345" })
  });
  if (!response.ok) {
    throw new Error(`login failed: ${response.status}`);
  }
  return response.headers.get("set-cookie")?.split(",").map((part) => part.split(";")[0]).join("; ") ?? "";
}

async function runOcrCall({ cookieHeader, expression, index, port }) {
  const startedAt = Date.now();
  try {
    const imageDataUrl = await makeImageDataUrl(expression);
    const { response, json } = await fetchJson(`http://127.0.0.1:${port}/api/handwriting-recognition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader
      },
      body: JSON.stringify({ strokes: [], imageDataUrl, language: "en" })
    }, options.timeoutMs);

    const result = {
      index,
      expression,
      httpStatus: response.status,
      provider: typeof json?.provider === "string" ? json.provider : undefined,
      accepted: Boolean(json?.accepted),
      text: typeof json?.text === "string" ? json.text : "",
      latex: typeof json?.latex === "string" ? json.latex : "",
      confidence: typeof json?.confidence === "number" ? json.confidence : null,
      reason: typeof json?.reason === "string" ? json.reason : "",
      request_id: typeof json?.request_id === "string" ? json.request_id : undefined,
      alternatives: summarizeAlternatives(json?.alternatives),
      elapsedMs: Date.now() - startedAt
    };
    result.failureClass = classifyResult(result);
    result.actionableSimpletex = result.provider === "simpletex"
      && (result.accepted || result.alternatives.some((alternative) => alternative.provider === "simpletex" && alternative.text.trim().length > 0));
    result.cleanSuggestion = !result.alternatives.some((alternative) => /\\(?:Lambda|wedge|mathrm|mathbf)|Л/.test(alternative.text));
    return result;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      index,
      expression,
      httpStatus: 0,
      provider: undefined,
      accepted: false,
      text: "",
      latex: "",
      confidence: null,
      reason: "",
      alternatives: [],
      elapsedMs: Date.now() - startedAt,
      error: timedOut ? "timeout" : "request failed",
      failureClass: timedOut ? "timeout" : "unexpected response",
      actionableSimpletex: false,
      cleanSuggestion: true
    };
  }
}

async function fetchJson(url, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { response, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function makeImageDataUrl(expression) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260"><rect width="900" height="260" fill="#ffffff"/><text x="80" y="155" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="500" fill="#111827">${escapeXml(expression)}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  })[char]);
}

function summarizeAlternatives(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((alternative) => ({
    provider: typeof alternative?.provider === "string" ? alternative.provider : undefined,
    text: typeof alternative?.text === "string" ? alternative.text : "",
    latex: typeof alternative?.latex === "string" ? alternative.latex : undefined,
    confidence: typeof alternative?.confidence === "number" ? alternative.confidence : null
  }));
}

function classifyResult(result) {
  if (result.error === "timeout") return "timeout";
  if (result.httpStatus === 401) return "auth";
  if (result.httpStatus === 429) return "rate limit";
  if (result.httpStatus >= 500) {
    return classifyLocalRuntimeFailure(serverLog) ? "local runtime failure" : "unexpected response";
  }
  if (result.provider === "none") return "provider none";
  if (result.provider !== "simpletex") return "unexpected provider";
  if (!result.accepted) return "low confidence";
  return "";
}

function classifyLocalRuntimeFailure(logText) {
  return /TurbopackInternalError|\.next\/.*manifest|app-paths-manifest|react-loadable-manifest|ENOENT|ETIMEDOUT/.test(logText);
}

function summarizeLocalRuntimeDiagnostics(logText) {
  if (!logText) return "";
  if (classifyLocalRuntimeFailure(logText)) return "local Next/Turbopack .next manifest/cache failure";
  return "no local runtime diagnostic pattern found";
}

function shouldStop(result) {
  return result.httpStatus === 401
    || result.httpStatus === 429
    || result.httpStatus >= 500
    || result.provider === "none"
    || Boolean(result.error);
}

function summarizeResult(result) {
  return {
    index: result.index,
    expression: result.expression,
    httpStatus: result.httpStatus,
    provider: result.provider,
    accepted: result.accepted,
    confidence: result.confidence,
    failureClass: result.failureClass,
    actionableSimpletex: result.actionableSimpletex,
    firstSuggestion: result.alternatives[0]?.text ?? "",
    elapsedMs: result.elapsedMs
  };
}

function buildCounts(results) {
  return {
    total: results.length,
    http200: results.filter((result) => result.httpStatus === 200).length,
    simpletexProvider: results.filter((result) => result.provider === "simpletex").length,
    accepted: results.filter((result) => result.accepted).length,
    actionableSimpletex: results.filter((result) => result.actionableSimpletex).length,
    cleanSuggestions: results.filter((result) => result.cleanSuggestion).length,
    providerNone: results.filter((result) => result.provider === "none").length,
    auth: results.filter((result) => result.failureClass === "auth").length,
    rateLimit: results.filter((result) => result.failureClass === "rate limit").length,
    timeout: results.filter((result) => result.failureClass === "timeout").length,
    localRuntime: results.filter((result) => result.failureClass === "local runtime failure").length,
    unexpected: results.filter((result) => ["unexpected response", "unexpected provider"].includes(result.failureClass)).length,
    lowConfidence: results.filter((result) => result.failureClass === "low confidence").length
  };
}

function classifyConclusion(counts) {
  if (counts.total === 10 && counts.http200 === 10 && counts.simpletexProvider === 10 && counts.providerNone === 0 && counts.auth === 0 && counts.rateLimit === 0 && counts.timeout === 0 && counts.localRuntime === 0) {
    return counts.accepted >= 8 ? "Strict Pass" : counts.actionableSimpletex === 10 ? "Functional / Quality Amber" : "Fail";
  }
  if (counts.localRuntime > 0) return "Blocked: local runtime failure";
  return "Fail";
}

async function writeReport({ conclusion, counts, localRuntimeDiagnostics, preflight, rawPath, results, stoppedEarly, stopReason }) {
  await fs.promises.mkdir(path.dirname(options.reportPath), { recursive: true });
  const report = [
    `# SimpleTex UAT Local Smoke - ${options.label}`,
    "",
    `- Date: ${dateStamp}`,
    `- Runtime: local MAIS-MVP server at \`127.0.0.1:${preflight.port?.port ?? options.port}\``,
    `- Server mode: \`${preflight.serverMode}\``,
    `- Result: **${conclusion}**`,
    "",
    "## Redacted Environment Check",
    "",
    "| Variable | Status |",
    "| --- | --- |",
    ...Object.entries(preflight.env).map(([key, value]) => `| \`${key}\` | ${value} |`),
    "",
    "## Preflight",
    "",
    `- Port available: ${preflight.port?.available ? "yes" : "no"}`,
    `- Clean generated .next before run: ${preflight.cleanNext ? "yes" : "no"}`,
    `- Concurrent MAIS-MVP Next/Playwright processes: ${preflight.concurrentProcesses.length}`,
    ...(preflight.concurrentProcesses.length
      ? preflight.concurrentProcesses.map((item) => `  - PID ${item.pid}: \`${item.command}\``)
      : []),
    "",
    "## Results",
    "",
    "| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | First suggestion | Classification |",
    "| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- |",
    ...results.map((result) => {
      const confidence = result.confidence === null ? "" : result.confidence.toFixed(3);
      const suggestion = result.alternatives[0]?.text ?? "";
      return `| ${result.index} | \`${result.expression}\` | ${result.httpStatus} | \`${result.provider ?? ""}\` | ${result.accepted} | ${confidence} | \`${result.text || ""}\` | \`${suggestion}\` | ${result.failureClass || ""} |`;
    }),
    "",
    "## Summary Metrics",
    "",
    counts ? [
      "| Metric | Result |",
      "| --- | ---: |",
      `| Total attempts | ${counts.total} |`,
      `| HTTP 200 | ${counts.http200} |`,
      `| SimpleTex provider | ${counts.simpletexProvider} |`,
      `| Accepted | ${counts.accepted} |`,
      `| Accepted or actionable SimpleTex suggestion | ${counts.actionableSimpletex} |`,
      `| Clean suggestions | ${counts.cleanSuggestions} |`,
      `| Auth failures | ${counts.auth} |`,
      `| Rate-limit failures | ${counts.rateLimit} |`,
      `| Provider none | ${counts.providerNone} |`,
      `| Timeout failures | ${counts.timeout} |`,
      `| Local runtime failures | ${counts.localRuntime} |`
    ].join("\n") : "",
    "",
    stoppedEarly ? `Stopped early: ${stopReason || "yes"}` : "Stopped early: no",
    localRuntimeDiagnostics ? `\nLocal runtime diagnostics: ${localRuntimeDiagnostics}` : "",
    rawPath ? `\nRaw non-secret result JSON: \`${rawPath}\`` : "",
    "",
    "## Notes",
    "",
    "- This smoke script does not log UAT, cookies, tokens, authorization headers, or raw provider credentials.",
    "- The script aborts by default when concurrent MAIS-MVP Next/Playwright processes are detected, because they can contend for `.next` and invalidate live-provider evidence.",
    "- The script uses non-Turbopack `next dev` by default; pass `--turbo` only when intentionally testing Turbopack."
  ].flat().join("\n");
  await fs.promises.writeFile(options.reportPath, report);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
