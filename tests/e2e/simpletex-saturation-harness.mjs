#!/usr/bin/env node

import { spawn, execFileSync } from "node:child_process";
import { createHash, randomInt } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const cwd = process.cwd();
const dateStamp = hongKongDateStamp();
const args = parseArgs(process.argv.slice(2));

const options = {
  allowConcurrent: Boolean(args["allow-concurrent"]),
  budget: readNumberArg(args.budget, 900),
  cleanNext: Boolean(args["clean-next"]),
  dryRun: Boolean(args["dry-run"]),
  intervalMs: readNumberArg(args["interval-ms"], 1450),
  label: String(args.label ?? `${dateStamp}-simpletex-saturation-qa`),
  maxCalls: readNumberArg(args["max-calls"], Infinity),
  port: readNumberArg(args.port, 3200),
  rawPath: String(args.raw ?? `/tmp/mais-simpletex-saturation-${dateStamp}.json`),
  reportPath: String(args.report ?? path.join(cwd, "coordination", "reports", `${dateStamp}-simpletex-saturation-qa.md`)),
  routeMode: String(args["route-mode"] ?? "server"),
  saveImages: args["save-images"] !== "false",
  throttleCalls: readNumberArg(args["throttle-calls"], 30),
  timeoutMs: readNumberArg(args["timeout-ms"], 45000)
};

const imageRoot = path.join("/tmp", `mais-simpletex-saturation-images-${dateStamp}`);
const latexTextWrapperPattern = /\\(?:mathrm|mathbf|mathit|mathsf|mathtt)\{([^{}]*)\}/g;
let serverProcess = null;
let serverLog = "";
let callCount = 0;
let compiledRouteContext = null;

try {
  const envPreflight = readEnvPreflight();
  const concurrentProcesses = collectConcurrentWorkspaceProcesses();
  const portInfo = await choosePort(options.port);
  const matrix = buildMatrix();
  const preflight = {
    env: envPreflight,
    concurrentProcesses,
    port: portInfo,
    cleanNext: options.cleanNext,
    routeMode: options.routeMode,
    serverMode: options.routeMode === "compiled" ? "compiled route handler" : "next dev",
    matrixPlan: {
      canonicalRouteCalls: matrix.routeCases.length,
      highRiskRouteCalls: matrix.highRiskCases.length,
      directDiagnosticCalls: matrix.directCases.length,
      throttleRecoveryCalls: options.throttleCalls,
      plannedCalls: matrix.routeCases.length + matrix.highRiskCases.length + matrix.directCases.length + options.throttleCalls
    }
  };

  if (options.dryRun) {
    const readyToRun = envLooksReady(envPreflight)
      && (options.routeMode === "compiled" || portInfo.available)
      && (options.routeMode === "compiled" || options.allowConcurrent || concurrentProcesses.length === 0);
    console.log(JSON.stringify({ dryRun: true, readyToRun, preflight }, null, 2));
    process.exit(0);
  }

  if (!envLooksReady(envPreflight)) {
    await finishRun({
      conclusion: "Blocked: environment preflight failed",
      preflight,
      results: [],
      stoppedEarly: true,
      stopReason: "environment preflight failed"
    });
    process.exit(1);
  }

  if (options.routeMode !== "compiled" && concurrentProcesses.length > 0 && !options.allowConcurrent) {
    await finishRun({
      conclusion: "Blocked: concurrent local Next/Playwright process",
      preflight,
      results: [],
      stoppedEarly: true,
      stopReason: "concurrent local Next/Playwright process"
    });
    process.exit(2);
  }

  if (options.routeMode !== "compiled" && !portInfo.available) {
    await finishRun({
      conclusion: "Blocked: local saturation port unavailable",
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

  if (options.saveImages) {
    await fs.promises.mkdir(imageRoot, { recursive: true });
  }

  let cookieHeader = "";
  if (options.routeMode === "compiled") {
    compiledRouteContext = await prepareCompiledRouteContext();
  } else {
    serverProcess = spawnDevServer(portInfo.port);
    await waitForReady(portInfo.port, 120000);
    cookieHeader = await login(portInfo.port);
  }

  const results = [];
  let stoppedEarly = false;
  let stopReason = "";

  for (const testCase of [...matrix.routeCases, ...matrix.highRiskCases]) {
    if (!canSpendCall()) break;
    const result = options.routeMode === "compiled"
      ? await runCompiledRouteOcrCall({ testCase })
      : await runRouteOcrCall({
          cookieHeader,
          port: portInfo.port,
          testCase
        });
    results.push(result);
    printProgress(result);
    if (shouldStopCore(result)) {
      stoppedEarly = true;
      stopReason = result.failureClass || "core stop condition";
      break;
    }
    await sleep(options.intervalMs);
  }

  if (!stoppedEarly) {
    for (const testCase of matrix.directCases) {
      if (!canSpendCall()) break;
      const result = await runDirectSimpletexCall(testCase);
      results.push(result);
      printProgress(result);
      if (shouldStopDirect(result)) {
        stoppedEarly = true;
        stopReason = result.failureClass || "direct SimpleTex stop condition";
        break;
      }
      await sleep(options.intervalMs);
    }
  }

  if (!stoppedEarly && options.throttleCalls > 0) {
    const throttleResults = options.routeMode === "compiled"
      ? await runCompiledThrottleProbe({ count: Math.min(options.throttleCalls, remainingBudget()) })
      : await runThrottleRecoveryProbe({
          cookieHeader,
          port: portInfo.port,
          count: Math.min(options.throttleCalls, remainingBudget())
        });
    results.push(...throttleResults);
  }

  const counts = buildCounts(results);
  const conclusion = classifyConclusion(counts, stoppedEarly, stopReason);
  await finishRun({
    conclusion,
    counts,
    preflight,
    results,
    stoppedEarly,
    stopReason
  });
  console.log(JSON.stringify({ reportPath: options.reportPath, rawPath: options.rawPath, counts, conclusion }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failureClass = classifyLocalRuntimeFailure(serverLog) ? "local runtime failure" : "unexpected saturation failure";
  await finishRun({
    conclusion: `Blocked: ${failureClass}`,
    preflight: {
      env: readEnvPreflight(),
      concurrentProcesses: collectConcurrentWorkspaceProcesses(),
      port: { port: options.port, available: false },
      cleanNext: options.cleanNext,
      routeMode: options.routeMode,
      serverMode: options.routeMode === "compiled" ? "compiled route handler" : "next dev",
      matrixPlan: {}
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
  if (value === undefined || value === true) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hongKongDateStamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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

function mergedEnv() {
  return {
    ...readDotEnvLocal(),
    ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined))
  };
}

function envStatus(parsed, key) {
  if (!Object.hasOwn(parsed, key)) return "missing";
  return parsed[key]?.trim() ? "present" : "empty";
}

function readEnvPreflight() {
  const parsed = mergedEnv();
  const apiUrl = parsed.SIMPLETEX_API_URL?.trim();
  const authMode = parsed.SIMPLETEX_APP_ID?.trim() && parsed.SIMPLETEX_APP_SECRET?.trim()
    ? "app"
    : parsed.SIMPLETEX_UAT?.trim()
      ? "uat"
      : "none";

  return {
    effectiveAuthMode: authMode,
    SIMPLETEX_UAT: envStatus(parsed, "SIMPLETEX_UAT"),
    SIMPLETEX_APP_ID: envStatus(parsed, "SIMPLETEX_APP_ID"),
    SIMPLETEX_APP_SECRET: envStatus(parsed, "SIMPLETEX_APP_SECRET"),
    SIMPLETEX_API_URL: apiUrl === "https://server.simpletex.cn/api/simpletex_ocr" ? "present:expected" : apiUrl ? "present:other" : envStatus(parsed, "SIMPLETEX_API_URL"),
    HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED: parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED === "false" ? "present:false" : parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED ? "present:other" : envStatus(parsed, "HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED"),
    MATHPIX_APP_ID: envStatus(parsed, "MATHPIX_APP_ID"),
    MATHPIX_APP_KEY: envStatus(parsed, "MATHPIX_APP_KEY")
  };
}

function envLooksReady(envPreflight) {
  return ["uat", "app"].includes(envPreflight.effectiveAuthMode)
    && envPreflight.SIMPLETEX_API_URL === "present:expected";
}

function simpletexConfig() {
  const env = mergedEnv();
  const apiUrl = env.SIMPLETEX_API_URL?.trim() || "https://server.simpletex.cn/api/simpletex_ocr";
  if (env.SIMPLETEX_APP_ID?.trim() && env.SIMPLETEX_APP_SECRET?.trim()) {
    return {
      authMode: "app",
      apiUrl,
      appId: env.SIMPLETEX_APP_ID.trim(),
      appSecret: env.SIMPLETEX_APP_SECRET.trim()
    };
  }
  if (env.SIMPLETEX_UAT?.trim()) {
    return {
      authMode: "uat",
      apiUrl,
      uat: env.SIMPLETEX_UAT.trim()
    };
  }
  return null;
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
  return command.replace(/[A-Za-z0-9_=-]{32,}/g, "[REDACTED]");
}

async function choosePort(preferredPort) {
  const candidates = [preferredPort, preferredPort + 1, preferredPort + 2];
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
  const child = spawn("npm", commandArgs, {
    cwd,
    env: {
      ...process.env,
      HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED: "false",
      MATHPIX_APP_ID: "",
      MATHPIX_APP_KEY: "",
      HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_MINUTE: "120",
      HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_HOUR: "1000",
      HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS: String(Math.min(60000, options.timeoutMs))
    },
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

async function prepareCompiledRouteContext() {
  applyProviderEnvForRoute();
  const outDir = path.join(cwd, ".tmp", "simpletex-saturation-route");
  const tempTsconfig = path.join(cwd, ".tmp", "simpletex-saturation-route-tsconfig.json");
  await fs.promises.rm(outDir, { recursive: true, force: true });
  await fs.promises.mkdir(path.dirname(tempTsconfig), { recursive: true });
  await fs.promises.writeFile(tempTsconfig, JSON.stringify({
    extends: "../tsconfig.json",
    compilerOptions: {
      outDir,
      noEmit: false,
      incremental: false,
      module: "commonjs",
      moduleResolution: "node"
    },
    include: [
      "../app/api/handwriting-recognition/route.ts",
      "../lib/**/*.ts",
      "../data/**/*.ts",
      "../types/**/*.ts"
    ],
    exclude: [
      "../tests/**",
      "../coordination/**",
      "../node_modules/**",
      "../.next/**"
    ]
  }, null, 2));
  execFileSync("npx", ["tsc", "-p", tempTsconfig], { cwd, stdio: "pipe" });

  const aliasRoot = path.join(outDir, "node_modules", "@");
  await fs.promises.mkdir(aliasRoot, { recursive: true });
  await ensureSymlink(path.join("..", "..", "lib"), path.join(aliasRoot, "lib"));
  await ensureSymlink(path.join("..", "..", "data"), path.join(aliasRoot, "data"));
  await ensureSymlink(path.join("..", "..", "types"), path.join(aliasRoot, "types"));

  const sessionModule = await import(pathToFileURL(path.join(outDir, "lib", "session.js")).href);
  const sessionCookieModule = await import(pathToFileURL(path.join(outDir, "lib", "server", "sessionCookie.js")).href);
  const routeModule = await import(pathToFileURL(path.join(outDir, "app", "api", "handwriting-recognition", "route.js")).href);
  const token = await sessionCookieModule.createSessionTokenForUserId("student-peter");
  return {
    POST: routeModule.POST,
    cookieHeader: `${sessionModule.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    outDir
  };
}

function applyProviderEnvForRoute() {
  const env = mergedEnv();
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined && typeof value === "string") {
      process.env[key] = value;
    }
  }
  process.env.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED = "false";
  process.env.MATHPIX_APP_ID = "";
  process.env.MATHPIX_APP_KEY = "";
  process.env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_MINUTE = "120";
  process.env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_HOUR = "1000";
  process.env.HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS = String(Math.min(60000, options.timeoutMs));
}

async function ensureSymlink(target, linkPath) {
  await fs.promises.rm(linkPath, { recursive: true, force: true });
  await fs.promises.symlink(target, linkPath, "dir");
}

function canSpendCall() {
  return callCount < options.budget && callCount < options.maxCalls;
}

function remainingBudget() {
  return Math.max(0, Math.min(options.budget, options.maxCalls) - callCount);
}

function spendCall() {
  callCount += 1;
}

async function runRouteOcrCall({ cookieHeader, port, testCase }) {
  spendCall();
  const startedAt = Date.now();
  const image = await renderTestImage(testCase);
  try {
    const { response, json } = await fetchJson(`http://127.0.0.1:${port}/api/handwriting-recognition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader
      },
      body: JSON.stringify({
        strokes: [],
        imageDataUrl: image.dataUrl,
        language: testCase.language ?? "en"
      })
    }, options.timeoutMs);

    const result = buildRouteResult({
      elapsedMs: Date.now() - startedAt,
      image,
      json,
      response,
      testCase
    });
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  } catch (error) {
    const result = buildErrorResult({
      elapsedMs: Date.now() - startedAt,
      error,
      image,
      provider: "route",
      testCase
    });
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  }
}

async function runCompiledRouteOcrCall({ testCase }) {
  spendCall();
  const startedAt = Date.now();
  const image = await renderTestImage(testCase);
  try {
    if (!compiledRouteContext?.POST) throw new Error("compiled route context unavailable");
    const request = new Request("http://127.0.0.1/api/handwriting-recognition", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: compiledRouteContext.cookieHeader
      },
      body: JSON.stringify({
        strokes: [],
        imageDataUrl: image.dataUrl,
        language: testCase.language ?? "en"
      })
    });
    const response = await compiledRouteContext.POST(request);
    const json = await safeReadJson(response);
    const result = buildRouteResult({
      elapsedMs: Date.now() - startedAt,
      image,
      json,
      response,
      testCase
    });
    result.channel = "compiled-mais-route";
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  } catch (error) {
    const result = buildErrorResult({
      elapsedMs: Date.now() - startedAt,
      error,
      image,
      provider: "compiled-route",
      testCase
    });
    result.channel = "compiled-mais-route";
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  }
}

async function runDirectSimpletexCall(testCase) {
  spendCall();
  const startedAt = Date.now();
  const image = await renderTestImage(testCase);
  try {
    const config = simpletexConfig();
    if (!config) throw new Error("SimpleTex credentials unavailable");

    const reqData = { rec_mode: testCase.recMode };
    const formData = new FormData();
    formData.append("rec_mode", testCase.recMode);
    formData.append("file", new Blob([bufferToBlobPart(image.buffer)], { type: "image/png" }), `${testCase.id}.png`);
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: simpletexAuthHeaders(config, reqData),
      body: formData,
      signal: AbortSignal.timeout(options.timeoutMs)
    });
    const json = await safeReadJson(response);
    const result = buildDirectResult({
      elapsedMs: Date.now() - startedAt,
      image,
      json,
      response,
      testCase
    });
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  } catch (error) {
    const result = buildErrorResult({
      elapsedMs: Date.now() - startedAt,
      error,
      image,
      provider: "simpletex-direct",
      testCase
    });
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  }
}

async function runThrottleRecoveryProbe({ cookieHeader, port, count }) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    if (!canSpendCall()) break;
    const testCase = {
      ...caseSpec(`throttle-${String(index + 1).padStart(2, "0")}`, "throttle-recovery", "12 + 7 = 19"),
      phase: "throttle-recovery",
      variant: "clean-print",
      expected: "12+7=19"
    };
    const result = await runRouteOcrCall({ cookieHeader, port, testCase });
    results.push(result);
    printProgress(result);
    if (result.failureClass === "auth" || result.failureClass === "provider none" || result.failureClass === "local runtime failure") break;
    await sleep(100);
  }
  return results;
}

async function runCompiledThrottleProbe({ count }) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    if (!canSpendCall()) break;
    const testCase = {
      ...caseSpec(`throttle-${String(index + 1).padStart(2, "0")}`, "throttle-recovery", "12 + 7 = 19"),
      phase: "throttle-recovery",
      variant: "clean-print",
      expected: "12+7=19"
    };
    const result = await runCompiledRouteOcrCall({ testCase });
    results.push(result);
    printProgress(result);
    if (result.failureClass === "auth" || result.failureClass === "provider none" || result.failureClass === "local runtime failure") break;
    await sleep(100);
  }
  return results;
}

async function fetchJson(url, fetchOptions, timeoutMs) {
  const response = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(timeoutMs) });
  const json = await safeReadJson(response);
  return { response, json };
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    try {
      return { nonJsonBody: (await response.text()).slice(0, 500) };
    } catch {
      return null;
    }
  }
}

function buildRouteResult({ elapsedMs, image, json, response, testCase }) {
  const alternatives = summarizeAlternatives(json?.alternatives);
  const normalizedCandidates = [
    typeof json?.text === "string" ? json.text : "",
    typeof json?.latex === "string" ? json.latex : "",
    ...alternatives.flatMap((alternative) => [alternative.text, alternative.latex ?? ""])
  ];
  const match = matchExpected(testCase, normalizedCandidates);
  const provider = typeof json?.provider === "string" ? json.provider : undefined;
  const accepted = Boolean(json?.accepted);
  const failureClass = classifyRouteResult({
    accepted,
    httpStatus: response.status,
    match,
    provider,
    reason: typeof json?.reason === "string" ? json.reason : ""
  });

  return {
    callIndex: callCount,
    phase: testCase.phase,
    channel: "mais-route",
    id: testCase.id,
    category: testCase.category,
    input: testCase.input,
    expected: testCase.expected,
    variant: testCase.variant,
    recMode: "formula",
    httpStatus: response.status,
    provider,
    accepted,
    text: typeof json?.text === "string" ? json.text : "",
    latex: typeof json?.latex === "string" ? json.latex : "",
    confidence: typeof json?.confidence === "number" ? json.confidence : null,
    alternatives,
    elapsedMs,
    match,
    actionableSimpletex: provider === "simpletex" && (accepted || alternatives.some((alternative) => alternative.provider === "simpletex" && alternative.text.trim())),
    failureClass,
    evidenceImage: "",
    render: image.render
  };
}

function buildDirectResult({ elapsedMs, image, json, response, testCase }) {
  const candidate = normalizeSimpletexCandidate(json);
  const normalizedCandidates = [candidate.text, candidate.latex].filter(Boolean);
  const match = matchExpected(testCase, normalizedCandidates);
  const failureClass = classifyDirectResult({
    httpStatus: response.status,
    hasCandidate: Boolean(candidate.text),
    match
  });

  return {
    callIndex: callCount,
    phase: testCase.phase,
    channel: "simpletex-direct",
    id: testCase.id,
    category: testCase.category,
    input: testCase.input,
    expected: testCase.expected,
    variant: testCase.variant,
    recMode: testCase.recMode,
    httpStatus: response.status,
    provider: "simpletex-direct",
    accepted: Boolean(candidate.text),
    text: candidate.text,
    latex: candidate.latex,
    confidence: candidate.confidence,
    alternatives: candidate.text ? [{ provider: "simpletex", text: candidate.text, latex: candidate.latex, confidence: candidate.confidence }] : [],
    elapsedMs,
    match,
    actionableSimpletex: Boolean(candidate.text),
    failureClass,
    evidenceImage: "",
    render: image.render
  };
}

function buildErrorResult({ elapsedMs, error, image, provider, testCase }) {
  const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return {
    callIndex: callCount,
    phase: testCase.phase,
    channel: provider === "route" ? "mais-route" : "simpletex-direct",
    id: testCase.id,
    category: testCase.category,
    input: testCase.input,
    expected: testCase.expected,
    variant: testCase.variant,
    recMode: testCase.recMode ?? "formula",
    httpStatus: 0,
    provider,
    accepted: false,
    text: "",
    latex: "",
    confidence: null,
    alternatives: [],
    elapsedMs,
    match: { exact: false, actionable: false, normalizedExpected: normalizeForMatch(testCase.expected), normalizedActual: "", kind: "none" },
    actionableSimpletex: false,
    failureClass: timeout ? "timeout" : "unexpected response",
    error: timeout ? "timeout" : error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160),
    evidenceImage: "",
    render: image.render
  };
}

function classifyRouteResult({ accepted, httpStatus, match, provider }) {
  if (httpStatus === 401) return "auth";
  if (httpStatus === 429) return "rate limit";
  if (httpStatus >= 500) return classifyLocalRuntimeFailure(serverLog) ? "local runtime failure" : "unexpected response";
  if (httpStatus !== 200) return "unexpected response";
  if (provider === "none") return "provider none";
  if (provider !== "simpletex") return "unexpected provider";
  if (accepted && !match.actionable) return "wrong accepted";
  if (!accepted && match.actionable) return "low-confidence-actionable";
  if (!match.actionable && hasNormalizationArtifact(match.normalizedActual)) return "normalization artifact";
  if (!match.actionable && looksLikeTextLoss(match)) return "text loss";
  if (!match.actionable) return "layout/crop issue";
  return "";
}

function classifyDirectResult({ httpStatus, hasCandidate, match }) {
  if (httpStatus === 401) return "auth";
  if (httpStatus === 429) return "rate limit";
  if (httpStatus >= 500) return "unexpected response";
  if (httpStatus !== 200) return "unexpected response";
  if (!hasCandidate) return "provider none";
  if (!match.actionable && hasNormalizationArtifact(match.normalizedActual)) return "normalization artifact";
  if (!match.actionable && looksLikeTextLoss(match)) return "text loss";
  if (!match.actionable) return "layout/crop issue";
  return "";
}

function shouldStopCore(result) {
  return result.failureClass === "auth"
    || result.failureClass === "rate limit"
    || result.failureClass === "provider none"
    || result.failureClass === "unexpected provider"
    || result.failureClass === "local runtime failure"
    || result.failureClass === "timeout";
}

function shouldStopDirect(result) {
  return result.failureClass === "auth"
    || result.failureClass === "rate limit"
    || result.failureClass === "timeout";
}

function summarizeAlternatives(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((alternative) => ({
    provider: typeof alternative?.provider === "string" ? alternative.provider : undefined,
    text: typeof alternative?.text === "string" ? alternative.text : "",
    latex: typeof alternative?.latex === "string" ? alternative.latex : undefined,
    confidence: typeof alternative?.confidence === "number" ? alternative.confidence : null
  }));
}

function normalizeSimpletexCandidate(value) {
  if (!value || typeof value !== "object" || value.status !== true || !value.res || typeof value.res !== "object") {
    return { text: "", latex: "", confidence: null };
  }
  const raw = [
    value.res.latex,
    value.res.info,
    value.res.content,
    value.res.markdown,
    value.res.text
  ].find((candidate) => typeof candidate === "string" && candidate.trim().length > 0)?.trim() ?? "";
  const confidence = extractConfidence(value.res);
  return {
    text: normalizeHandwritingText(raw),
    latex: raw,
    confidence
  };
}

function extractConfidence(value) {
  if (!value || typeof value !== "object") return null;
  const candidates = [
    value.conf,
    value.score,
    value.confidence,
    value.confidence_rate,
    value.recognition_confidence,
    value.detection_confidence
  ];
  const numeric = candidates.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  if (numeric === undefined) return null;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function matchExpected(testCase, candidates) {
  const normalizedExpected = normalizeForMatch(testCase.expected);
  const normalizedCandidates = candidates
    .map((candidate) => normalizeForMatch(candidate))
    .filter(Boolean);
  const exact = normalizedCandidates.some((candidate) => candidate === normalizedExpected);
  const actionable = exact || normalizedCandidates.some((candidate) => {
    if (!candidate || !normalizedExpected) return false;
    if (candidate.includes(normalizedExpected) || normalizedExpected.includes(candidate)) {
      return Math.min(candidate.length, normalizedExpected.length) >= Math.min(4, normalizedExpected.length);
    }
    return false;
  });
  const normalizedActual = normalizedCandidates[0] ?? "";
  return {
    exact,
    actionable,
    normalizedExpected,
    normalizedActual,
    kind: exact ? "exact" : actionable ? "actionable" : "mismatch"
  };
}

function normalizeForMatch(value) {
  return normalizeHandwritingText(String(value ?? ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[，。；：、！？,.?;:!]/g, "")
    .replace(/[（）]/g, (char) => char === "（" ? "(" : ")")
    .replace(/−|–|—/g, "-")
    .replace(/π/g, "pi")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "")
    .trim();
}

function stripLatexTextWrappers(value) {
  let normalized = value;
  for (let index = 0; index < 6; index += 1) {
    const next = normalized.replace(latexTextWrapperPattern, "$1");
    if (next === normalized) return normalized;
    normalized = next;
  }
  return normalized;
}

function normalizeHandwritingText(value) {
  const normalized = value
    .replace(/^\\\(/, "")
    .replace(/\\\)$/, "")
    .replace(/^\\\[/, "")
    .replace(/\\\]$/, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\(sin|cos|tan|log|ln)(?=[A-Za-z0-9({\s]|$)/g, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\^\{(?:\\(?:Lambda|wedge)|Л)\}(\d+)/g, "^$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\^\\(?:Lambda|wedge)(?=\d)/g, "^")
    .replace(/\^Л(?=\d)/g, "^")
    .replace(/\{([=+\-*/])\}/g, "$1")
    .replace(/\s+/g, "")
    .trim();
  return stripLatexTextWrappers(normalized)
    .replace(/\^\{(?:\\(?:Lambda|wedge)|Л)\}(\d+)/g, "^$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\^\\(?:Lambda|wedge)(?=\d)/g, "^")
    .replace(/\^Л(?=\d)/g, "^")
    .replace(/\s+/g, "")
    .trim();
}

function hasNormalizationArtifact(value) {
  return /\\(?:Lambda|wedge|mathrm|mathbf)|Л|\[docimg]|\[empty]/i.test(value);
}

function looksLikeTextLoss(match) {
  return /[\u4e00-\u9fff]/.test(match.normalizedExpected) && !/[\u4e00-\u9fff]/.test(match.normalizedActual);
}

async function renderTestImage(testCase) {
  const render = renderOptions(testCase);
  const svg = buildSvg(testCase.input, render);
  let image = sharp(Buffer.from(svg)).png();

  if (render.rotate) {
    image = image.rotate(render.rotate, { background: "#ffffff" });
  }
  if (render.blur) {
    image = image.blur(render.blur);
  }
  if (render.modulate) {
    image = image.modulate(render.modulate);
  }
  if (render.affine) {
    image = image.affine([[1, render.affine], [0, 1]], { background: "#ffffff" });
  }
  if (render.trim) {
    image = image.trim({ background: "#ffffff", threshold: 12 }).extend({
      top: render.padding,
      right: render.padding,
      bottom: render.padding,
      left: render.padding,
      background: "#ffffff"
    });
  }

  const buffer = await image.png().toBuffer();
  return {
    buffer,
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    render
  };
}

function renderOptions(testCase) {
  const seed = hashSeed(`${testCase.id}:${testCase.variant}:${testCase.repeat ?? 0}:${testCase.recMode ?? ""}`);
  if (testCase.variant === "handwriting-like") {
    return {
      width: 980,
      height: 300,
      fontFamily: "Comic Sans MS, Marker Felt, Bradley Hand, Arial, sans-serif",
      fontSize: 70 + (seed % 9),
      fontWeight: 500,
      fill: "#111827",
      x: 68 + (seed % 18),
      y: 165 + (seed % 14),
      rotate: ((seed % 7) - 3) * 0.35,
      blur: 0,
      trim: false,
      padding: 32,
      letterSpacing: 1 + (seed % 3)
    };
  }
  if (testCase.variant === "low-quality") {
    return {
      width: 980,
      height: 300,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 70,
      fontWeight: 500,
      fill: "#334155",
      x: 72,
      y: 165,
      rotate: ((seed % 9) - 4) * 0.45,
      blur: 0.55,
      modulate: { brightness: 1.08, saturation: 0.85 },
      affine: ((seed % 5) - 2) * 0.012,
      trim: false,
      padding: 32,
      letterSpacing: 0
    };
  }
  if (testCase.variant === "crop-stress") {
    return {
      width: 820,
      height: 210,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 64,
      fontWeight: 500,
      fill: "#111827",
      x: 28,
      y: 124,
      rotate: 0,
      blur: 0,
      trim: true,
      padding: 14,
      letterSpacing: 0
    };
  }
  if (testCase.variant === "high-risk-jitter") {
    return {
      width: 880,
      height: 250,
      fontFamily: "Comic Sans MS, Arial, sans-serif",
      fontSize: 66 + (seed % 12),
      fontWeight: 500,
      fill: seed % 2 ? "#0f172a" : "#334155",
      x: 56 + (seed % 20),
      y: 148 + (seed % 20),
      rotate: ((seed % 13) - 6) * 0.5,
      blur: seed % 3 === 0 ? 0.45 : 0,
      modulate: seed % 4 === 0 ? { brightness: 1.12, saturation: 0.9 } : undefined,
      trim: false,
      padding: 32,
      letterSpacing: seed % 4
    };
  }
  return {
    width: 980,
    height: 300,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 72,
    fontWeight: 500,
    fill: "#111827",
    x: 72,
    y: 165,
    rotate: 0,
    blur: 0,
    trim: false,
    padding: 32,
    letterSpacing: 0
  };
}

function buildSvg(text, render) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${render.width}" height="${render.height}" viewBox="0 0 ${render.width} ${render.height}">`,
    `<rect width="${render.width}" height="${render.height}" fill="#ffffff"/>`,
    `<text x="${render.x}" y="${render.y}" font-family="${render.fontFamily}" font-size="${render.fontSize}" font-weight="${render.fontWeight}" letter-spacing="${render.letterSpacing}" fill="${render.fill}">${escapeXml(text)}</text>`,
    "</svg>"
  ].join("");
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

function hashSeed(value) {
  return createHash("sha256").update(value).digest().readUInt32BE(0);
}

async function maybeSaveEvidenceImage(result, buffer) {
  const shouldSave = options.saveImages && (
    Boolean(result.failureClass)
    || result.phase === "high-risk-confusable"
  );
  if (!shouldSave) return;
  await fs.promises.mkdir(imageRoot, { recursive: true });
  const fileName = `${String(result.callIndex).padStart(4, "0")}-${safeFilePart(result.id)}-${safeFilePart(result.variant)}-${safeFilePart(result.recMode)}.png`;
  const filePath = path.join(imageRoot, fileName);
  await fs.promises.writeFile(filePath, buffer);
  result.evidenceImage = filePath;
}

function safeFilePart(value) {
  return String(value ?? "none").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "none";
}

function simpletexAuthHeaders(config, reqData) {
  if (config.authMode === "uat") {
    return { token: config.uat };
  }

  const randomStr = randomSimpletexString();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signedFields = {
    ...reqData,
    "app-id": config.appId,
    "random-str": randomStr,
    timestamp
  };
  const signSource = [
    ...Object.entries(signedFields)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, value]) => `${key}=${String(value)}`),
    `secret=${config.appSecret}`
  ].join("&");

  return {
    "app-id": config.appId,
    "random-str": randomStr,
    timestamp,
    sign: createHash("md5").update(signSource, "utf8").digest("hex")
  };
}

function randomSimpletexString(length = 16) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function bufferToBlobPart(bytes) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

function buildMatrix() {
  const canonicalBase = buildCanonicalCases();
  const variants = ["clean-print", "handwriting-like", "low-quality", "crop-stress"];
  const routeCases = canonicalBase.flatMap((testCase) => variants.map((variant) => ({
    ...testCase,
    phase: "canonical-route",
    variant
  })));

  const highRiskCases = buildHighRiskCases().flatMap((testCase) => Array.from({ length: 5 }, (_, index) => ({
    ...testCase,
    phase: "high-risk-confusable",
    variant: "high-risk-jitter",
    repeat: index + 1
  })));

  const directCases = buildMixedDiagnosticCases().flatMap((testCase) => ["formula", "auto", "document"].map((recMode) => ({
    ...testCase,
    phase: "direct-mixed-diagnostic",
    variant: recMode === "formula" ? "clean-print" : "handwriting-like",
    recMode
  })));

  return { routeCases, highRiskCases, directCases };
}

function caseSpec(id, category, input, expected = input, language = "en") {
  return { id, category, input, expected, language };
}

function buildCanonicalCases() {
  const arithmetic = [
    "7+8=15", "12+7=19", "45-18=27", "9*6=54", "56/7=8", "3+4*5=23",
    "(8+4)/3=4", "100-37=63", "25+36=61", "81/9=9", "14*3=42", "72-49=23",
    "6*(7+2)=54", "5^2=25", "10.5+2.75=13.25", "0.8*5=4", "$12+$8=$20",
    "3kg+500g", "2m 30cm", "15min+45min=60min", "3/4 of 20=15", "1.2+0.35=1.55",
    "9:3=3:1", "4^3=64", "2^5=32", "11*11=121", "144/12=12", "98+102=200",
    "1,250+750=2,000", "7.5-2.8=4.7"
  ].map((input, index) => caseSpec(`arith-${index + 1}`, "p1-p6-arithmetic", input));

  const fractions = [
    "3/5", "1/2+1/3=5/6", "7/8-1/4=5/8", "2/3*9=6", "12/25=48%",
    "0.375=37.5%", "1 1/2", "5/6 ÷ 2/3=5/4", "\\frac{12}{25}", "3:5=9:15",
    "25%=1/4", "0.2=1/5", "7/10=70%", "4/9+2/9=6/9", "18/24=3/4",
    "2.5%=0.025", "60% of 80=48", "5/8=0.625", "11/20=55%", "3 2/5"
  ].map((input, index) => caseSpec(`frac-${index + 1}`, "fractions-percent", input));

  const algebra = [
    "2x+3=9", "x^2+4x", "(x+3)(x+2)", "a^2-b^2", "y=2x+1",
    "3x-5=16", "x/2+4=10", "5x=25", "x^2-9=0", "(a+b)^2",
    "m=4", "n-7=12", "2(x+5)=18", "y-3x=2", "4p+q=11",
    "x^2+2x+1", "b^2-4ac", "f(x)=x^2", "g(x)=2x-1", "3a^2b",
    "x:y=2:3", "k=12/x", "x>=5", "x<0", "|x|=3"
  ].map((input, index) => caseSpec(`alg-${index + 1}`, "algebra", input));

  const secondary = [
    "sin30=1/2", "cos60=1/2", "tan45=1", "sqrt(16)=4", "sqrt(x^2)=x",
    "A=pi*r^2", "C=2*pi*r", "y=mx+c", "gradient=rise/run", "(x1,y1)",
    "d=sqrt((x2-x1)^2+(y2-y1)^2)", "P(A)=3/10", "mean=(x1+x2+x3)/3", "log10(100)=2", "ln(e)=1",
    "v=u+at", "s=ut+1/2at^2", "det=[[a,b],[c,d]]", "vector AB=(3,4)", "lim x->0 sinx/x=1",
    "dy/dx=2x", "int 2x dx=x^2+C", "x^3-1=(x-1)(x^2+x+1)", "theta=45°", "∠ABC=90°"
  ].map((input, index) => caseSpec(`sec-${index + 1}`, "s-level-dse", input));

  const mixed = [
    ["mix-1", "mixed-text", "答案是 3/5", "答案是3/5", "zh"],
    ["mix-2", "mixed-text", "Solve x: 2x+3=9", "solvex:2x+3=9"],
    ["mix-3", "mixed-text", "因為 x>0", "因為x>0", "zh"],
    ["mix-4", "mixed-text", "面積 A=πr^2", "面積a=pir^2", "zh"],
    ["mix-5", "mixed-text", "Answer: y=2x+1", "answer:y=2x+1"],
    ["mix-6", "mixed-text", "速度 v=12 m/s", "速度v=12m/s", "zh"],
    ["mix-7", "mixed-text", "半徑 r=5cm", "半徑r=5cm", "zh"],
    ["mix-8", "mixed-text", "Check 12+7=19", "check12+7=19"],
    ["mix-9", "mixed-text", "角度 θ=30°", "角度θ=30°", "zh"],
    ["mix-10", "mixed-text", "The ratio is 3:5", "theratiois3:5"],
    ["mix-11", "mixed-text", "周界 P=2l+2w", "周界p=2l+2w", "zh"],
    ["mix-12", "mixed-text", "No. 4: x=6", "no4:x=6"],
    ["mix-13", "mixed-text", "因式分解 x^2-9", "因式分解x^2-9", "zh"],
    ["mix-14", "mixed-text", "坐標 (3,4)", "坐標(3,4)", "zh"],
    ["mix-15", "mixed-text", "probability P(A)=0.3", "probabilityp(a)=0.3"],
    ["mix-16", "mixed-text", "答案: sqrt(16)=4", "答案:sqrt(16)=4", "zh"],
    ["mix-17", "mixed-text", "HKD 25 + 30 = 55", "hkd25+30=55"],
    ["mix-18", "mixed-text", "斜率 m=2", "斜率m=2", "zh"],
    ["mix-19", "mixed-text", "方程式 5x=25", "方程式5x=25", "zh"],
    ["mix-20", "mixed-text", "Final answer = 48%", "finalanswer=48%"]
  ].map(([id, category, input, expected, language]) => caseSpec(id, category, input, expected, language));

  return [...arithmetic, ...fractions, ...algebra, ...secondary, ...mixed];
}

function buildHighRiskCases() {
  return [
    "5", "S", "5/S", "0", "O", "0/O", "1", "l", "I", "1/l/I",
    "2", "Z", "2/Z", "x", "×", "x×2", "m=4", "n=4", "-3", "=3",
    "2-1=1", "2=1+1", "a^2", "a²", "x^2", "x²", "sin", "sln", "rn", "m"
  ].map((input, index) => caseSpec(`risk-${index + 1}`, "confusables", input));
}

function buildMixedDiagnosticCases() {
  return [
    ["diag-1", "mixed-diagnostic", "答案是 3/5", "答案是3/5", "zh"],
    ["diag-2", "mixed-diagnostic", "Solve x: 2x+3=9", "solvex:2x+3=9"],
    ["diag-3", "mixed-diagnostic", "因為 x>0", "因為x>0", "zh"],
    ["diag-4", "mixed-diagnostic", "面積 A=πr^2", "面積a=pir^2", "zh"],
    ["diag-5", "mixed-diagnostic", "Answer: y=2x+1", "answer:y=2x+1"],
    ["diag-6", "mixed-diagnostic", "速度 v=12 m/s", "速度v=12m/s", "zh"],
    ["diag-7", "mixed-diagnostic", "半徑 r=5cm", "半徑r=5cm", "zh"],
    ["diag-8", "mixed-diagnostic", "Check 12+7=19", "check12+7=19"],
    ["diag-9", "mixed-diagnostic", "角度 θ=30°", "角度θ=30°", "zh"],
    ["diag-10", "mixed-diagnostic", "The ratio is 3:5", "theratiois3:5"],
    ["diag-11", "mixed-diagnostic", "周界 P=2l+2w", "周界p=2l+2w", "zh"],
    ["diag-12", "mixed-diagnostic", "No. 4: x=6", "no4:x=6"],
    ["diag-13", "mixed-diagnostic", "因式分解 x^2-9", "因式分解x^2-9", "zh"],
    ["diag-14", "mixed-diagnostic", "坐標 (3,4)", "坐標(3,4)", "zh"],
    ["diag-15", "mixed-diagnostic", "probability P(A)=0.3", "probabilityp(a)=0.3"],
    ["diag-16", "mixed-diagnostic", "答案: sqrt(16)=4", "答案:sqrt(16)=4", "zh"],
    ["diag-17", "mixed-diagnostic", "HKD 25 + 30 = 55", "hkd25+30=55"],
    ["diag-18", "mixed-diagnostic", "斜率 m=2", "斜率m=2", "zh"],
    ["diag-19", "mixed-diagnostic", "方程式 5x=25", "方程式5x=25", "zh"],
    ["diag-20", "mixed-diagnostic", "Final answer = 48%", "finalanswer=48%"],
    ["diag-21", "mixed-diagnostic", "中文: x^2+4x", "中文:x^2+4x", "zh"],
    ["diag-22", "mixed-diagnostic", "English text only", "englishtextonly"],
    ["diag-23", "mixed-diagnostic", "純文字測試", "純文字測試", "zh"],
    ["diag-24", "mixed-diagnostic", "分數是 12/25", "分數是12/25", "zh"],
    ["diag-25", "mixed-diagnostic", "P1 answer 15", "p1answer15"],
    ["diag-26", "mixed-diagnostic", "DSE: dy/dx=2x", "dse:dy/dx=2x"],
    ["diag-27", "mixed-diagnostic", "Graph y=x^2", "graphy=x^2"],
    ["diag-28", "mixed-diagnostic", "三角 sin30=1/2", "三角sin30=1/2", "zh"],
    ["diag-29", "mixed-diagnostic", "unit: 3kg+500g", "unit:3kg+500g"],
    ["diag-30", "mixed-diagnostic", "理由: 0.375=37.5%", "理由:0.375=37.5%", "zh"]
  ].map(([id, category, input, expected, language]) => caseSpec(id, category, input, expected, language));
}

function buildCounts(results) {
  const route = results.filter((result) => result.channel.includes("mais-route") && result.phase !== "throttle-recovery");
  const direct = results.filter((result) => result.channel === "simpletex-direct");
  const throttle = results.filter((result) => result.phase === "throttle-recovery");
  const cleanFormula = route.filter((result) => result.variant === "clean-print" && result.category !== "mixed-text");
  const mixedClean = route.filter((result) => result.category === "mixed-text" && result.variant === "clean-print");
  const mixedNoisy = route.filter((result) => result.category === "mixed-text" && result.variant !== "clean-print");
  const highRisk = route.filter((result) => result.phase === "high-risk-confusable");
  const elapsed = results.map((result) => result.elapsedMs).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const failureCounts = countBy(results, (result) => result.failureClass || "none");
  return {
    total: results.length,
    route: route.length,
    direct: direct.length,
    throttle: throttle.length,
    http200: results.filter((result) => result.httpStatus === 200).length,
    simpletexRouteProvider: route.filter((result) => result.provider === "simpletex").length,
    accepted: route.filter((result) => result.accepted).length,
    exact: route.filter((result) => result.match.exact).length,
    actionable: route.filter((result) => result.match.actionable).length,
    wrongAccepted: route.filter((result) => result.failureClass === "wrong accepted").length,
    p95LatencyMs: percentile(elapsed, 0.95),
    cleanFormulaExactOrActionableRate: ratio(cleanFormula.filter((result) => result.match.actionable).length, cleanFormula.length),
    cleanFormulaAcceptedRate: ratio(cleanFormula.filter((result) => result.accepted).length, cleanFormula.length),
    mixedCleanActionableRate: ratio(mixedClean.filter((result) => result.match.actionable).length, mixedClean.length),
    mixedNoisyActionableRate: ratio(mixedNoisy.filter((result) => result.match.actionable).length, mixedNoisy.length),
    highRiskActionableRate: ratio(highRisk.filter((result) => result.match.actionable).length, highRisk.length),
    wrongAcceptedRate: ratio(route.filter((result) => result.failureClass === "wrong accepted").length, route.length),
    failureCounts
  };
}

function countBy(values, keyFn) {
  return values.reduce((accumulator, value) => {
    const key = keyFn(value);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function ratio(count, total) {
  if (!total) return null;
  return count / total;
}

function percentile(values, p) {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1));
  return values[index];
}

function classifyConclusion(counts, stoppedEarly, stopReason) {
  if (stoppedEarly) return `Stopped: ${stopReason}`;
  const hardPass = counts.route > 0
    && counts.http200 === counts.total
    && counts.simpletexRouteProvider === counts.route
    && (counts.failureCounts.auth ?? 0) === 0
    && (counts.failureCounts["provider none"] ?? 0) === 0
    && (counts.failureCounts["unexpected response"] ?? 0) === 0;
  const qualityPass = (counts.cleanFormulaExactOrActionableRate ?? 0) >= 0.9
    && (counts.cleanFormulaAcceptedRate ?? 0) >= 0.8
    && (counts.mixedCleanActionableRate ?? 0) >= 0.85
    && (counts.mixedNoisyActionableRate ?? 0) >= 0.75
    && (counts.highRiskActionableRate ?? 0) >= 0.7
    && (counts.wrongAcceptedRate ?? 1) <= 0.01
    && (counts.p95LatencyMs ?? Infinity) < 10000;
  if (hardPass && qualityPass) return "Strict Pass";
  if (hardPass) return "Functional / Quality Amber";
  return "Fail";
}

async function finishRun({ conclusion, counts, localRuntimeDiagnostics, preflight, rawPath = options.rawPath, results, stoppedEarly, stopReason }) {
  const raw = {
    label: options.label,
    date: dateStamp,
    callBudget: options.budget,
    maxCalls: Number.isFinite(options.maxCalls) ? options.maxCalls : "unlimited",
    intervalMs: options.intervalMs,
    preflight,
    stoppedEarly,
    stopReason,
    counts,
    conclusion,
    results
  };
  await fs.promises.writeFile(rawPath, JSON.stringify(raw, null, 2));
  await writeReport({
    conclusion,
    counts,
    localRuntimeDiagnostics,
    preflight,
    rawPath,
    results,
    stoppedEarly,
    stopReason
  });
}

async function writeReport({ conclusion, counts, localRuntimeDiagnostics, preflight, rawPath, results, stoppedEarly, stopReason }) {
  await fs.promises.mkdir(path.dirname(options.reportPath), { recursive: true });
  const worst = results
    .filter((result) => result.failureClass)
    .slice(0, 30);
  const report = [
    `# SimpleTex Saturation QA - ${options.label}`,
    "",
    `- Date: ${dateStamp}`,
    "- Session: S11",
    "- Scope: MAIS-MVP `/api/handwriting-recognition` SimpleTex saturation QA plus direct rec_mode diagnostics",
    `- Result: **${conclusion}**`,
    "",
    "## Chinese Executive Summary",
    "",
    chineseSummary(conclusion, counts, stoppedEarly, stopReason),
    "",
    "## English Executive Summary",
    "",
    englishSummary(conclusion, counts, stoppedEarly, stopReason),
    "",
    "## Redacted Environment Check",
    "",
    "| Variable | Status |",
    "| --- | --- |",
    ...Object.entries(preflight.env).map(([key, value]) => `| \`${key}\` | ${value} |`),
    "",
    "## Matrix",
    "",
    "| Area | Planned |",
    "| --- | ---: |",
    `| Canonical route calls | ${preflight.matrixPlan?.canonicalRouteCalls ?? 0} |`,
    `| High-risk route calls | ${preflight.matrixPlan?.highRiskRouteCalls ?? 0} |`,
    `| Direct mixed diagnostics | ${preflight.matrixPlan?.directDiagnosticCalls ?? 0} |`,
    `| Throttle/recovery probes | ${preflight.matrixPlan?.throttleRecoveryCalls ?? 0} |`,
    `| Planned total | ${preflight.matrixPlan?.plannedCalls ?? 0} |`,
    "",
    "## Summary Metrics",
    "",
    counts ? [
      "| Metric | Result |",
      "| --- | ---: |",
      `| Total calls executed | ${counts.total} |`,
      `| MAIS route calls | ${counts.route} |`,
      `| Direct SimpleTex diagnostic calls | ${counts.direct} |`,
      `| HTTP 200 | ${counts.http200} |`,
      `| Route provider simpletex | ${counts.simpletexRouteProvider} |`,
      `| Route accepted | ${counts.accepted} |`,
      `| Route exact match | ${counts.exact} |`,
      `| Route exact/actionable match | ${counts.actionable} |`,
      `| Wrong accepted | ${counts.wrongAccepted} |`,
      `| Clean formula exact/actionable | ${formatPercent(counts.cleanFormulaExactOrActionableRate)} |`,
      `| Clean formula accepted | ${formatPercent(counts.cleanFormulaAcceptedRate)} |`,
      `| Mixed clean exact/actionable | ${formatPercent(counts.mixedCleanActionableRate)} |`,
      `| Mixed noisy exact/actionable | ${formatPercent(counts.mixedNoisyActionableRate)} |`,
      `| High-risk exact/actionable | ${formatPercent(counts.highRiskActionableRate)} |`,
      `| Wrong accepted rate | ${formatPercent(counts.wrongAcceptedRate)} |`,
      `| P95 latency | ${counts.p95LatencyMs === null ? "n/a" : `${counts.p95LatencyMs} ms`} |`
    ].join("\n") : "No calls executed.",
    "",
    "## Failure Classes",
    "",
    counts ? [
      "| Class | Count |",
      "| --- | ---: |",
      ...Object.entries(counts.failureCounts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `| ${key} | ${value} |`)
    ].join("\n") : "No failure data.",
    "",
    "## Worst / Saved Evidence Cases",
    "",
    worst.length ? [
      "| # | Phase | Input | Variant | Mode | Classification | Text | First suggestion | Evidence image |",
      "| ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
      ...worst.map((result) => `| ${result.callIndex} | ${result.phase} | \`${escapeMarkdownCell(result.input)}\` | ${result.variant} | ${result.recMode} | ${result.failureClass} | \`${escapeMarkdownCell(result.text)}\` | \`${escapeMarkdownCell(result.alternatives[0]?.text ?? "")}\` | \`${result.evidenceImage || ""}\` |`)
    ].join("\n") : "No failed cases recorded.",
    "",
    "## Stop / Runtime Notes",
    "",
    `- Stopped early: ${stoppedEarly ? "yes" : "no"}`,
    `- Stop reason: ${stopReason || "n/a"}`,
    `- Concurrent local Next/Playwright processes at start: ${preflight.concurrentProcesses.length}`,
    `- Raw non-secret result JSON: \`${rawPath}\``,
    options.saveImages ? `- Evidence image folder: \`${imageRoot}\`` : "- Evidence image saving disabled.",
    localRuntimeDiagnostics ? `- Local runtime diagnostics: ${localRuntimeDiagnostics}` : "",
    "",
    "## Recommendations",
    "",
    recommendations(conclusion, counts, stoppedEarly, stopReason),
    "",
    "## Secret Hygiene",
    "",
    "- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.",
    "- Evidence PNGs contain only generated QA expressions, not provider credentials or student data."
  ].flat().join("\n");
  await fs.promises.writeFile(options.reportPath, report);
}

function chineseSummary(conclusion, counts, stoppedEarly, stopReason) {
  if (!counts) return "本次没有执行真实 OCR 调用，因为前置检查或本地运行条件未通过。";
  if (stoppedEarly) return `本次饱和测试已按安全规则提前停止，原因是 ${stopReason || "未知停止条件"}。已执行 ${counts.total} 次调用，避免继续消耗 SimpleTex 配额并保留现场证据。`;
  return `本次完成 ${counts.total} 次调用，其中 MAIS route ${counts.route} 次、SimpleTex direct 诊断 ${counts.direct} 次。结论为 ${conclusion}；重点观察 clean formula、混合文字、高风险混淆字符、错误自动填充率与 P95 延迟。`;
}

function englishSummary(conclusion, counts, stoppedEarly, stopReason) {
  if (!counts) return "No live OCR calls were executed because preflight or local runtime readiness failed.";
  if (stoppedEarly) return `The saturation run stopped early by safety rule: ${stopReason || "unknown stop condition"}. It executed ${counts.total} calls and preserved evidence without spending more SimpleTex quota.`;
  return `Executed ${counts.total} calls: ${counts.route} through the MAIS route and ${counts.direct} direct SimpleTex diagnostics. Overall result: ${conclusion}. The key gates were clean formula quality, mixed text quality, high-risk confusables, wrong accepted rate, and P95 latency.`;
}

function recommendations(conclusion, counts, stoppedEarly, stopReason) {
  if (stoppedEarly) {
    return [
      `- Stop condition \`${stopReason || "unknown"}\` should be resolved before rerunning the full matrix.`,
      "- If the stop was auth/rate-limit/provider-none, coordinate S19/S12 before changing QA thresholds.",
      "- Rerun with the same raw/report paths only after the local window is quiet."
    ].join("\n");
  }
  if (!counts) return "- Fix preflight/runtime readiness, then rerun the saturation harness.";
  const lines = [];
  if ((counts.cleanFormulaExactOrActionableRate ?? 0) < 0.9) lines.push("- Improve formula image preprocessing or normalization before relying on clean formula auto-fill.");
  if ((counts.mixedCleanActionableRate ?? 0) < 0.85 || (counts.mixedNoisyActionableRate ?? 0) < 0.75) lines.push("- Treat mixed Chinese/English text as a separate OCR mode candidate; compare direct `rec_mode` diagnostics before product changes.");
  if ((counts.highRiskActionableRate ?? 0) < 0.7) lines.push("- Keep high-risk confusables in review/suggestion mode unless confidence is clearly above threshold.");
  if ((counts.wrongAcceptedRate ?? 0) > 0.01) lines.push("- Prioritize wrong-accepted cases as release blockers because they can silently grade incorrect answers.");
  if ((counts.p95LatencyMs ?? 0) >= 10000) lines.push("- Investigate provider latency or timeout tuning before production saturation.");
  if (!lines.length) lines.push("- Current evidence supports moving to a small production smoke, not production saturation.");
  return lines.join("\n");
}

function formatPercent(value) {
  if (value === null || value === undefined) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 120);
}

function printProgress(result) {
  if (result.callIndex === 1 || result.callIndex % 10 === 0 || result.failureClass) {
    console.log(JSON.stringify({
      call: result.callIndex,
      phase: result.phase,
      id: result.id,
      variant: result.variant,
      recMode: result.recMode,
      httpStatus: result.httpStatus,
      provider: result.provider,
      accepted: result.accepted,
      match: result.match.kind,
      failureClass: result.failureClass,
      elapsedMs: result.elapsedMs
    }));
  }
}

function classifyLocalRuntimeFailure(logText) {
  return /TurbopackInternalError|\.next\/.*manifest|app-paths-manifest|react-loadable-manifest|ENOENT|ETIMEDOUT/.test(logText);
}

function summarizeLocalRuntimeDiagnostics(logText) {
  if (!logText) return "";
  if (classifyLocalRuntimeFailure(logText)) return "local Next/Turbopack .next manifest/cache failure";
  return "no local runtime diagnostic pattern found";
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
