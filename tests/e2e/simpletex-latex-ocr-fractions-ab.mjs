#!/usr/bin/env node

import { createHash, randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const cwd = process.cwd();
const dateStamp = hongKongDateStamp();
const args = parseArgs(process.argv.slice(2));

const options = {
  budget: readNumberArg(args.budget, 250),
  dryRun: Boolean(args["dry-run"]),
  intervalMs: readNumberArg(args["interval-ms"], 1400),
  label: String(args.label ?? `${dateStamp}-simpletex-latex-ocr-fractions-ab`),
  maxCalls: readNumberArg(args["max-calls"], 250),
  rawPath: String(args.raw ?? `/tmp/mais-simpletex-latex-ocr-fractions-${dateStamp}.json`),
  reportPath: String(args.report ?? path.join(cwd, "coordination", "reports", `${dateStamp}-simpletex-latex-ocr-fractions-ab.md`)),
  saveImages: args["save-images"] !== "false",
  timeoutMs: readNumberArg(args["timeout-ms"], 45000)
};

const endpoints = [
  {
    key: "simpletex_ocr_formula",
    label: "simpletex_ocr rec_mode=formula",
    apiUrl: "https://server.simpletex.cn/api/simpletex_ocr",
    reqData: { rec_mode: "formula" }
  },
  {
    key: "latex_ocr",
    label: "latex_ocr",
    apiUrl: "https://server.simpletex.cn/api/latex_ocr",
    reqData: {}
  }
];

const imageRoot = path.join("/tmp", `mais-simpletex-latex-ocr-fractions-images-${dateStamp}`);
const latexTextWrapperPattern = /\\(?:mathrm|mathbf|mathit|mathsf|mathtt)\{([^{}]*)\}/g;
let callCount = 0;

try {
  const envPreflight = readEnvPreflight();
  const matrix = buildMatrix();
  const preflight = {
    env: envPreflight,
    matrixPlan: {
      existingFractionsCases: matrix.baseCases.filter((testCase) => testCase.source === "existing-saturation").length,
      supplementalVisualCases: matrix.baseCases.filter((testCase) => testCase.source === "visual-supplement").length,
      endpoints: endpoints.map((endpoint) => endpoint.label),
      plannedDirectCalls: matrix.directCases.length,
      maxCalls: options.maxCalls,
      budget: options.budget,
      intervalMs: options.intervalMs
    }
  };

  if (options.dryRun) {
    console.log(JSON.stringify({ dryRun: true, readyToRun: envLooksReady(envPreflight), preflight }, null, 2));
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

  if (options.saveImages) {
    await fs.promises.mkdir(imageRoot, { recursive: true });
  }

  const results = [];
  let stoppedEarly = false;
  let stopReason = "";
  let consecutiveTimeouts = 0;

  for (const testCase of matrix.directCases) {
    if (!canSpendCall()) break;
    const result = await runDirectSimpletexCall(testCase);
    results.push(result);
    printProgress(result);

    if (result.failureClass === "timeout") {
      consecutiveTimeouts += 1;
    } else {
      consecutiveTimeouts = 0;
    }

    if (shouldStop(result) || consecutiveTimeouts >= 2) {
      stoppedEarly = true;
      stopReason = consecutiveTimeouts >= 2 ? "consecutive timeouts" : result.failureClass || "stop condition";
      break;
    }

    await sleep(options.intervalMs);
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
  await finishRun({
    conclusion: "Blocked: unexpected QA runtime failure",
    preflight: {
      env: readEnvPreflight(),
      matrixPlan: {}
    },
    results: [],
    stoppedEarly: true,
    stopReason: message
  }).catch(() => undefined);
  console.error(JSON.stringify({ error: "unexpected QA runtime failure", message }));
  process.exit(1);
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
    HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED: parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED === "false" ? "present:false" : parsed.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED ? "present:other" : envStatus(parsed, "HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED"),
    MATHPIX_APP_ID: envStatus(parsed, "MATHPIX_APP_ID"),
    MATHPIX_APP_KEY: envStatus(parsed, "MATHPIX_APP_KEY")
  };
}

function envLooksReady(envPreflight) {
  return ["uat", "app"].includes(envPreflight.effectiveAuthMode);
}

function simpletexConfig() {
  const env = mergedEnv();
  if (env.SIMPLETEX_APP_ID?.trim() && env.SIMPLETEX_APP_SECRET?.trim()) {
    return {
      authMode: "app",
      appId: env.SIMPLETEX_APP_ID.trim(),
      appSecret: env.SIMPLETEX_APP_SECRET.trim()
    };
  }
  if (env.SIMPLETEX_UAT?.trim()) {
    return {
      authMode: "uat",
      uat: env.SIMPLETEX_UAT.trim()
    };
  }
  return null;
}

function canSpendCall() {
  return callCount < options.budget && callCount < options.maxCalls;
}

function spendCall() {
  callCount += 1;
}

async function runDirectSimpletexCall(testCase) {
  spendCall();
  const startedAt = Date.now();
  const image = await renderTestImage(testCase);
  try {
    const config = simpletexConfig();
    if (!config) throw new Error("SimpleTex credentials unavailable");

    const formData = new FormData();
    for (const [key, value] of Object.entries(testCase.endpoint.reqData)) {
      formData.append(key, String(value));
    }
    formData.append("file", new Blob([bufferToBlobPart(image.buffer)], { type: "image/png" }), `${testCase.id}.png`);

    const response = await fetch(testCase.endpoint.apiUrl, {
      method: "POST",
      headers: simpletexAuthHeaders(config, testCase.endpoint.reqData),
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
      testCase
    });
    await maybeSaveEvidenceImage(result, image.buffer);
    return result;
  }
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

function buildDirectResult({ elapsedMs, image, json, response, testCase }) {
  const candidate = normalizeSimpletexCandidate(json);
  const rawMatch = matchExpected(testCase.expected, [candidate.raw], normalizeRawForMatch);
  const currentMatch = matchExpected(testCase.expected, [candidate.raw, candidate.text], normalizeForCurrentMatch);
  const proposedMatch = matchExpected(testCase.expected, [candidate.raw, candidate.text], normalizeForProposedMatch);
  const acceptedLike = candidate.confidence !== null && candidate.confidence >= 0.7 && Boolean(candidate.raw.trim());
  const failureClass = classifyResult({
    acceptedLike,
    candidate,
    currentMatch,
    httpStatus: response.status,
    json,
    proposedMatch,
    testCase
  });

  return {
    callIndex: callCount,
    phase: testCase.phase,
    channel: "simpletex-direct",
    endpoint: testCase.endpoint.key,
    endpointLabel: testCase.endpoint.label,
    id: testCase.id,
    source: testCase.source,
    category: testCase.category,
    input: testCase.input,
    expected: testCase.expected,
    variant: testCase.variant,
    httpStatus: response.status,
    status: Boolean(json?.status),
    acceptedLike,
    raw: candidate.raw,
    text: candidate.text,
    confidence: candidate.confidence,
    elapsedMs,
    rawMatch,
    currentMatch,
    proposedMatch,
    wrongAcceptedRiskCurrent: acceptedLike && !currentMatch.actionable,
    wrongAcceptedRiskProposed: acceptedLike && !proposedMatch.actionable,
    percentEscape: /\\%/.test(candidate.raw),
    starArtifact: /(\^\{?\\star\}?|\^\*)/.test(candidate.raw),
    spacingArtifact: /(~|\\mathrm\{~\}|\\~)/.test(candidate.raw),
    textLoss: looksLikeTextLoss(testCase.expected, candidate.raw),
    failureClass,
    responseCode: extractResponseCode(json),
    responseMsg: extractResponseMessage(json),
    evidenceImage: "",
    render: image.render
  };
}

function buildErrorResult({ elapsedMs, error, image, testCase }) {
  const timeout = error instanceof Error
    && (error.name === "TimeoutError"
      || error.name === "AbortError"
      || error.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
      || /timeout/i.test(error.message));
  return {
    callIndex: callCount,
    phase: testCase.phase,
    channel: "simpletex-direct",
    endpoint: testCase.endpoint.key,
    endpointLabel: testCase.endpoint.label,
    id: testCase.id,
    source: testCase.source,
    category: testCase.category,
    input: testCase.input,
    expected: testCase.expected,
    variant: testCase.variant,
    httpStatus: 0,
    status: false,
    acceptedLike: false,
    raw: "",
    text: "",
    confidence: null,
    elapsedMs,
    rawMatch: emptyMatch(testCase.expected),
    currentMatch: emptyMatch(testCase.expected),
    proposedMatch: emptyMatch(testCase.expected),
    wrongAcceptedRiskCurrent: false,
    wrongAcceptedRiskProposed: false,
    percentEscape: false,
    starArtifact: false,
    spacingArtifact: false,
    textLoss: false,
    failureClass: timeout ? "timeout" : "unexpected response",
    error: timeout ? "timeout" : error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160),
    evidenceImage: "",
    render: image.render
  };
}

function emptyMatch(expected) {
  return {
    exact: false,
    actionable: false,
    normalizedExpected: normalizeForCurrentMatch(expected),
    normalizedActual: "",
    kind: "none"
  };
}

function normalizeSimpletexCandidate(value) {
  if (!value || typeof value !== "object" || value.status !== true || !value.res || typeof value.res !== "object") {
    return { raw: "", text: "", confidence: null };
  }
  const raw = [
    value.res.latex,
    value.res.info,
    value.res.content,
    value.res.markdown,
    value.res.text
  ].find((candidate) => typeof candidate === "string" && candidate.trim().length > 0)?.trim() ?? "";
  return {
    raw,
    text: normalizeHandwritingText(raw),
    confidence: extractConfidence(value.res)
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

function extractResponseCode(json) {
  if (!json || typeof json !== "object") return "";
  return [json.code, json.err_code, json.error_code, json.status_code]
    .find((candidate) => typeof candidate === "string" || typeof candidate === "number")?.toString().slice(0, 80) ?? "";
}

function extractResponseMessage(json) {
  if (!json || typeof json !== "object") return "";
  return [json.msg, json.message, json.error, json.detail]
    .find((candidate) => typeof candidate === "string")?.slice(0, 160) ?? "";
}

function classifyResult({ acceptedLike, candidate, currentMatch, httpStatus, json, proposedMatch, testCase }) {
  const responseCode = extractResponseCode(json);
  const responseMsg = extractResponseMessage(json);
  const errorText = `${responseCode} ${responseMsg}`.toLowerCase();
  if (httpStatus === 401) return "auth";
  if (httpStatus === 402 || /resource|balance|api pack|quota|billing|no enough/.test(errorText)) return "billing/resource";
  if (httpStatus === 429) return "rate limit";
  if (httpStatus >= 500) return "unexpected response";
  if (httpStatus !== 200) return "unexpected response";
  if (!json?.status || !candidate.raw.trim()) return "provider none";
  if (testCase.testArtifact && !proposedMatch.actionable) return "test-input-artifact";
  if (/\\%/.test(candidate.raw) && proposedMatch.actionable && !currentMatch.actionable) return "percent escape";
  if (/(\^\{?\\star\}?|\^\*)/.test(candidate.raw) && proposedMatch.actionable && !currentMatch.actionable) return "star multiplication artifact";
  if (/(~|\\mathrm\{~\}|\\~)/.test(candidate.raw) && proposedMatch.actionable && !currentMatch.actionable) return "spacing artifact";
  if (acceptedLike && !proposedMatch.actionable) return "wrong accepted risk";
  if (!acceptedLike && proposedMatch.actionable) return "low confidence actionable";
  if (looksLikeTextLoss(testCase.expected, candidate.raw)) return "text loss";
  if (!proposedMatch.actionable) return "real OCR miss";
  return "";
}

function shouldStop(result) {
  return result.failureClass === "auth"
    || result.failureClass === "billing/resource"
    || result.failureClass === "rate limit"
    || result.failureClass === "provider none";
}

function matchExpected(expected, candidates, normalize) {
  const normalizedExpected = normalize(expected);
  const normalizedCandidates = candidates
    .map((candidate) => normalize(candidate))
    .filter(Boolean);
  const exact = normalizedCandidates.some((candidate) => candidate === normalizedExpected);
  const actionable = exact || normalizedCandidates.some((candidate) => {
    if (!candidate || !normalizedExpected) return false;
    if (candidate.includes(normalizedExpected) || normalizedExpected.includes(candidate)) {
      return Math.min(candidate.length, normalizedExpected.length) >= Math.min(4, normalizedExpected.length);
    }
    return false;
  });
  return {
    exact,
    actionable,
    normalizedExpected,
    normalizedActual: normalizedCandidates[0] ?? "",
    kind: exact ? "exact" : actionable ? "actionable" : "mismatch"
  };
}

function normalizeRawForMatch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function normalizeForCurrentMatch(value) {
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

function normalizeForProposedMatch(value) {
  return normalizeForCurrentMatch(value)
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\mathrm\{~\}|\\~/g, "")
    .replace(/~/g, "")
    .replace(/\^\{?\\star\}?/g, "*")
    .replace(/\^\*/g, "*")
    .replace(/\^\\uparrow(?=\d)/g, "^")
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

function looksLikeTextLoss(expected, actual) {
  const expectedValue = String(expected ?? "");
  if (/[\u4e00-\u9fff]/.test(expectedValue) && !/[\u4e00-\u9fff]/.test(actual)) return true;
  if (/[A-Za-z]{2,}/.test(expectedValue) && !/[A-Za-z]{2,}/.test(actual)) return true;
  return false;
}

async function renderTestImage(testCase) {
  const render = renderOptions(testCase);
  const svg = testCase.parts ? buildVisualFractionSvg(testCase, render) : buildTextSvg(testCase.input, render);
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
  return { buffer, render };
}

function renderOptions(testCase) {
  const seed = hashSeed(`${testCase.id}:${testCase.variant}:${testCase.endpoint.key}`);
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
      width: 900,
      height: 250,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 72,
      fontWeight: 500,
      fill: "#111827",
      x: 42,
      y: 145,
      rotate: ((seed % 5) - 2) * 0.4,
      blur: 0,
      trim: true,
      padding: 18,
      letterSpacing: 0
    };
  }
  if (testCase.variant === "visual-fraction") {
    return {
      width: 980,
      height: 320,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 64,
      fontWeight: 500,
      fill: "#111827",
      x: 72,
      y: 174,
      rotate: 0,
      blur: 0,
      trim: false,
      padding: 32,
      letterSpacing: 0
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

function buildTextSvg(input, render) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${render.width}" height="${render.height}" viewBox="0 0 ${render.width} ${render.height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text x="${render.x}" y="${render.y}" font-family="${escapeXml(render.fontFamily)}" font-size="${render.fontSize}" font-weight="${render.fontWeight}" letter-spacing="${render.letterSpacing}" fill="${render.fill}">${escapeXml(input)}</text>`,
    "</svg>"
  ].join("");
}

function buildVisualFractionSvg(testCase, render) {
  let x = render.x;
  const y = render.y;
  const items = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${render.width}" height="${render.height}" viewBox="0 0 ${render.width} ${render.height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`
  ];

  for (const part of testCase.parts) {
    if (part.type === "frac") {
      const width = Math.max(72, Math.max(part.n.length, part.d.length) * 34 + 22);
      const center = x + width / 2;
      items.push(`<text x="${center}" y="${y - 38}" text-anchor="middle" font-family="${escapeXml(render.fontFamily)}" font-size="54" font-weight="${render.fontWeight}" fill="${render.fill}">${escapeXml(part.n)}</text>`);
      items.push(`<line x1="${x + 4}" y1="${y - 12}" x2="${x + width - 4}" y2="${y - 12}" stroke="${render.fill}" stroke-width="4" stroke-linecap="round"/>`);
      items.push(`<text x="${center}" y="${y + 48}" text-anchor="middle" font-family="${escapeXml(render.fontFamily)}" font-size="54" font-weight="${render.fontWeight}" fill="${render.fill}">${escapeXml(part.d)}</text>`);
      x += width + 20;
      continue;
    }
    const value = part.value;
    items.push(`<text x="${x}" y="${y + 8}" font-family="${escapeXml(render.fontFamily)}" font-size="${render.fontSize}" font-weight="${render.fontWeight}" fill="${render.fill}">${escapeXml(value)}</text>`);
    x += Math.max(36, value.length * 39);
  }

  items.push("</svg>");
  return items.join("");
}

function hashSeed(value) {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function maybeSaveEvidenceImage(result, buffer) {
  if (!options.saveImages) return;
  const shouldSave = Boolean(result.failureClass)
    || result.wrongAcceptedRiskCurrent
    || result.percentEscape
    || result.starArtifact
    || result.spacingArtifact
    || result.source === "visual-supplement";
  if (!shouldSave) return;
  await fs.promises.mkdir(imageRoot, { recursive: true });
  const fileName = `${String(result.callIndex).padStart(4, "0")}-${safeFilePart(result.id)}-${safeFilePart(result.variant)}-${safeFilePart(result.endpoint)}.png`;
  const filePath = path.join(imageRoot, fileName);
  await fs.promises.writeFile(filePath, buffer);
  result.evidenceImage = filePath;
}

function safeFilePart(value) {
  return String(value ?? "none").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "none";
}

function buildMatrix() {
  const variants = ["clean-print", "handwriting-like", "low-quality", "crop-stress"];
  const existingInputs = [
    "3/5", "1/2+1/3=5/6", "7/8-1/4=5/8", "2/3*9=6", "12/25=48%",
    "0.375=37.5%", "1 1/2", "5/6 ÷ 2/3=5/4", "\\frac{12}{25}", "3:5=9:15",
    "25%=1/4", "0.2=1/5", "7/10=70%", "4/9+2/9=6/9", "18/24=3/4",
    "2.5%=0.025", "60% of 80=48", "5/8=0.625", "11/20=55%", "3 2/5"
  ];
  const existing = existingInputs.flatMap((input, index) => variants.map((variant) => ({
    id: `frac-${index + 1}`,
    source: "existing-saturation",
    category: "fractions-percent",
    phase: "latex-ocr-ab-existing",
    input,
    expected: input,
    variant,
    testArtifact: input.startsWith("\\frac")
  })));

  const visualSupplement = [
    visualCase("vfrac-1", "12/25", [{ type: "frac", n: "12", d: "25" }]),
    visualCase("vfrac-2", "3/5", [{ type: "frac", n: "3", d: "5" }]),
    visualCase("vfrac-3", "1/2+1/3=5/6", [{ type: "frac", n: "1", d: "2" }, textPart("+"), { type: "frac", n: "1", d: "3" }, textPart("="), { type: "frac", n: "5", d: "6" }]),
    visualCase("vfrac-4", "7/8-1/4=5/8", [{ type: "frac", n: "7", d: "8" }, textPart("-"), { type: "frac", n: "1", d: "4" }, textPart("="), { type: "frac", n: "5", d: "8" }]),
    visualCase("vfrac-5", "2/3*9=6", [{ type: "frac", n: "2", d: "3" }, textPart("*9=6")]),
    visualCase("vfrac-6", "5/6/2/3=5/4", [{ type: "frac", n: "5", d: "6" }, textPart("÷"), { type: "frac", n: "2", d: "3" }, textPart("="), { type: "frac", n: "5", d: "4" }]),
    visualCase("vfrac-7", "1 1/2", [textPart("1"), { type: "frac", n: "1", d: "2" }]),
    visualCase("vfrac-8", "3 2/5", [textPart("3"), { type: "frac", n: "2", d: "5" }]),
    visualCase("vfrac-9", "25%=1/4", [textPart("25%="), { type: "frac", n: "1", d: "4" }]),
    visualCase("vfrac-10", "0.375=37.5%", [textPart("0.375=37.5%")]),
    visualCase("vfrac-11", "60% of 80=48", [textPart("60% of 80=48")]),
    visualCase("vfrac-12", "11/20=55%", [{ type: "frac", n: "11", d: "20" }, textPart("=55%")])
  ];

  const baseCases = [...existing, ...visualSupplement];
  const directCases = baseCases.flatMap((testCase) => endpoints.map((endpoint) => ({
    ...testCase,
    endpoint
  })));
  return { baseCases, directCases };
}

function visualCase(id, expected, parts) {
  return {
    id,
    source: "visual-supplement",
    category: "fractions-percent",
    phase: "latex-ocr-ab-visual",
    input: expected,
    expected,
    variant: "visual-fraction",
    parts,
    testArtifact: false
  };
}

function textPart(value) {
  return { type: "text", value };
}

function buildCounts(results) {
  const endpointStats = Object.fromEntries(endpoints.map((endpoint) => {
    const endpointRows = results.filter((result) => result.endpoint === endpoint.key);
    const existingRows = endpointRows.filter((result) => result.source === "existing-saturation");
    const visualRows = endpointRows.filter((result) => result.source === "visual-supplement");
    return [endpoint.key, buildStatsForRows(endpointRows, { existingRows, visualRows })];
  }));

  return {
    total: results.length,
    http200: results.filter((result) => result.httpStatus === 200).length,
    statusTrue: results.filter((result) => result.status).length,
    stoppedFailures: countBy(results, (result) => result.failureClass || "none"),
    p95LatencyMs: percentile(results.map((result) => result.elapsedMs), 0.95),
    endpointStats
  };
}

function buildStatsForRows(rows, { existingRows, visualRows }) {
  return {
    calls: rows.length,
    http200: rows.filter((result) => result.httpStatus === 200).length,
    statusTrue: rows.filter((result) => result.status).length,
    rawActionable: rows.filter((result) => result.rawMatch.actionable).length,
    currentActionable: rows.filter((result) => result.currentMatch.actionable).length,
    proposedActionable: rows.filter((result) => result.proposedMatch.actionable).length,
    acceptedLike: rows.filter((result) => result.acceptedLike).length,
    wrongAcceptedRiskCurrent: rows.filter((result) => result.wrongAcceptedRiskCurrent).length,
    wrongAcceptedRiskProposed: rows.filter((result) => result.wrongAcceptedRiskProposed).length,
    percentEscape: rows.filter((result) => result.percentEscape).length,
    starArtifact: rows.filter((result) => result.starArtifact).length,
    spacingArtifact: rows.filter((result) => result.spacingArtifact).length,
    textLoss: rows.filter((result) => result.textLoss).length,
    existingCurrentActionable: existingRows.filter((result) => result.currentMatch.actionable).length,
    existingProposedActionable: existingRows.filter((result) => result.proposedMatch.actionable).length,
    visualCurrentActionable: visualRows.filter((result) => result.currentMatch.actionable).length,
    visualProposedActionable: visualRows.filter((result) => result.proposedMatch.actionable).length,
    failureCounts: countBy(rows, (result) => result.failureClass || "none"),
    p95LatencyMs: percentile(rows.map((result) => result.elapsedMs), 0.95)
  };
}

function countBy(values, keyFn) {
  return values.reduce((counts, value) => {
    const key = keyFn(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function percentile(values, percentileValue) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1))];
}

function classifyConclusion(counts, stoppedEarly, stopReason) {
  if (stoppedEarly) return `Blocked: ${stopReason || "stopped early"}`;
  if (counts.http200 !== counts.total || counts.statusTrue !== counts.total) {
    return counts.total >= 100 ? "Completed with provider stability warning" : "Blocked: provider smoke failed";
  }
  if (counts.total <= 20) {
    return "Provider smoke passed";
  }
  const baseline = counts.endpointStats.simpletex_ocr_formula;
  const candidate = counts.endpointStats.latex_ocr;
  const baselineRate = ratio(baseline.currentActionable, baseline.calls);
  const candidateRate = ratio(candidate.currentActionable, candidate.calls);
  const latencyTooHigh = candidate.p95LatencyMs !== null && candidate.p95LatencyMs > 10000;
  if (candidateRate - baselineRate >= 0.1 && candidate.wrongAcceptedRiskCurrent <= baseline.wrongAcceptedRiskCurrent && !latencyTooHigh) {
    return "API switch candidate";
  }
  if (candidateRate - baselineRate >= 0.1 && latencyTooHigh) {
    return "Quality better but latency blocker";
  }
  if (candidate.proposedActionable >= 0.85 * candidate.calls || baseline.proposedActionable >= 0.85 * baseline.calls) {
    return "Normalization/policy candidate";
  }
  return "Keep baseline pending deeper OCR investigation";
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

async function finishRun({ conclusion, counts, preflight, results, stoppedEarly, stopReason }) {
  const payload = {
    label: options.label,
    date: dateStamp,
    preflight,
    stoppedEarly,
    stopReason,
    conclusion,
    counts: counts ?? buildCounts(results),
    results
  };
  await fs.promises.writeFile(options.rawPath, `${JSON.stringify(payload, null, 2)}\n`);
  await writeReport(payload);
}

async function writeReport({ conclusion, counts, preflight, results, stoppedEarly, stopReason }) {
  await fs.promises.mkdir(path.dirname(options.reportPath), { recursive: true });
  const lines = [
    `# SimpleTex latex_ocr Fractions/Percent A/B - ${dateStamp}`,
    "",
    `- Date: ${dateStamp}`,
    "- Session: S11",
    "- Scope: Direct SimpleTex `latex_ocr` vs `simpletex_ocr rec_mode=formula` A/B for pure math fractions/percent",
    `- Result: **${conclusion}**`,
    "",
    "## Chinese Executive Summary",
    "",
    chineseSummary(counts, conclusion, stoppedEarly, stopReason),
    "",
    "## English Executive Summary",
    "",
    englishSummary(counts, conclusion, stoppedEarly, stopReason),
    "",
    "## Redacted Preflight",
    "",
    "| Item | Status |",
    "| --- | --- |",
    ...Object.entries(preflight.env ?? {}).map(([key, value]) => `| \`${key}\` | ${value} |`),
    "",
    "## Matrix",
    "",
    "| Area | Count |",
    "| --- | ---: |",
    `| Existing fraction/percent images | ${preflight.matrixPlan?.existingFractionsCases ?? 0} |`,
    `| Supplemental visual fraction images | ${preflight.matrixPlan?.supplementalVisualCases ?? 0} |`,
    `| Endpoints | ${(preflight.matrixPlan?.endpoints ?? endpoints.map((endpoint) => endpoint.label)).join(", ")} |`,
    `| Planned direct calls | ${preflight.matrixPlan?.plannedDirectCalls ?? 0} |`,
    `| Executed direct calls | ${counts.total} |`,
    "",
    "## Endpoint Accuracy",
    "",
    "| Endpoint | Calls | HTTP 200 | Raw actionable | Current MAIS actionable | Proposed-normalized actionable | Wrong risk current | Wrong risk proposed | `%` escape | Star artifact | Spacing artifact | P95 latency |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...endpoints.map((endpoint) => endpointStatsRow(endpoint, counts.endpointStats[endpoint.key])),
    "",
    "## Existing vs Visual Supplement",
    "",
    "| Endpoint | Existing current | Existing proposed | Visual current | Visual proposed |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...endpoints.map((endpoint) => existingVisualRow(endpoint, counts.endpointStats[endpoint.key])),
    "",
    "## Failure Classes",
    "",
    "| Endpoint | Failure counts |",
    "| --- | --- |",
    ...endpoints.map((endpoint) => `| ${endpoint.label} | ${formatFailureCounts(counts.endpointStats[endpoint.key].failureCounts)} |`),
    "",
    "## Worst Cases",
    "",
    "| # | Endpoint | Input | Variant | Class | Confidence | Raw | Current normalized | Proposed normalized | Evidence |",
    "| ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- |",
    ...worstCases(results).map((result) => `| ${result.callIndex} | ${result.endpointLabel} | \`${escapeMarkdownCell(result.input)}\` | ${result.variant} | ${result.failureClass || "none"} | ${formatNullable(result.confidence)} | \`${escapeMarkdownCell(result.raw)}\` | \`${escapeMarkdownCell(result.currentMatch.normalizedActual)}\` | \`${escapeMarkdownCell(result.proposedMatch.normalizedActual)}\` | \`${result.evidenceImage || ""}\` |`),
    "",
    "## Decision",
    "",
    ...decisionLines(counts),
    "",
    "## Stop / Runtime Notes",
    "",
    `- Stopped early: ${stoppedEarly ? "yes" : "no"}`,
    `- Stop reason: ${stopReason || "n/a"}`,
    `- Raw non-secret result JSON: \`${options.rawPath}\``,
    `- Evidence image folder: \`${imageRoot}\``,
    "",
    "## Secret Hygiene",
    "",
    "- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.",
    "- Evidence PNGs contain only generated QA expressions, not provider credentials or student data."
  ];

  await fs.promises.writeFile(options.reportPath, `${lines.join("\n")}\n`);
}

function chineseSummary(counts, conclusion, stoppedEarly, stopReason) {
  if (stoppedEarly) {
    return `本次 latex_ocr A/B 提前停止：${stopReason || conclusion}。已执行 ${counts.total} 次直连 SimpleTex 调用，未继续消耗额度。`;
  }
  const baseline = counts.endpointStats.simpletex_ocr_formula;
  const candidate = counts.endpointStats.latex_ocr;
  return `本次完成 ${counts.total} 次直连 SimpleTex 调用。当前 MAIS 归一化口径下，baseline/candidate actionable 分别为 ${formatRatio(baseline.currentActionable, baseline.calls)}、${formatRatio(candidate.currentActionable, candidate.calls)}；按 proposed normalization 模拟后分别为 ${formatRatio(baseline.proposedActionable, baseline.calls)}、${formatRatio(candidate.proposedActionable, candidate.calls)}。结论：${conclusion}。`;
}

function englishSummary(counts, conclusion, stoppedEarly, stopReason) {
  if (stoppedEarly) {
    return `The latex_ocr A/B run stopped early: ${stopReason || conclusion}. It executed ${counts.total} direct SimpleTex calls and did not continue spending quota.`;
  }
  const baseline = counts.endpointStats.simpletex_ocr_formula;
  const candidate = counts.endpointStats.latex_ocr;
  return `Executed ${counts.total} direct SimpleTex calls. Under current MAIS normalization, baseline/candidate actionable rates were ${formatRatio(baseline.currentActionable, baseline.calls)} and ${formatRatio(candidate.currentActionable, candidate.calls)}. With proposed normalization replay, they were ${formatRatio(baseline.proposedActionable, baseline.calls)} and ${formatRatio(candidate.proposedActionable, candidate.calls)}. Conclusion: ${conclusion}.`;
}

function endpointStatsRow(endpoint, stats) {
  return [
    `| ${endpoint.label}`,
    stats.calls,
    stats.http200,
    formatRatio(stats.rawActionable, stats.calls),
    formatRatio(stats.currentActionable, stats.calls),
    formatRatio(stats.proposedActionable, stats.calls),
    stats.wrongAcceptedRiskCurrent,
    stats.wrongAcceptedRiskProposed,
    stats.percentEscape,
    stats.starArtifact,
    stats.spacingArtifact,
    stats.p95LatencyMs ?? "n/a"
  ].join(" | ") + " |";
}

function existingVisualRow(endpoint, stats) {
  return `| ${endpoint.label} | ${formatRatio(stats.existingCurrentActionable, 80)} | ${formatRatio(stats.existingProposedActionable, 80)} | ${formatRatio(stats.visualCurrentActionable, 12)} | ${formatRatio(stats.visualProposedActionable, 12)} |`;
}

function formatRatio(numerator, denominator) {
  if (!denominator) return "n/a";
  return `${numerator}/${denominator} (${((numerator / denominator) * 100).toFixed(1)}%)`;
}

function formatFailureCounts(value) {
  return Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join("; ");
}

function formatNullable(value) {
  return typeof value === "number" ? value.toFixed(3) : "n/a";
}

function worstCases(results) {
  return results
    .filter((result) => result.failureClass || result.wrongAcceptedRiskCurrent || result.percentEscape || result.starArtifact || result.spacingArtifact)
    .sort((left, right) => {
      const leftScore = failureSeverity(left);
      const rightScore = failureSeverity(right);
      if (leftScore !== rightScore) return rightScore - leftScore;
      return left.callIndex - right.callIndex;
    })
    .slice(0, 12);
}

function failureSeverity(result) {
  if (["auth", "billing/resource", "rate limit", "provider none", "timeout"].includes(result.failureClass)) return 100;
  if (result.wrongAcceptedRiskCurrent) return 80;
  if (result.starArtifact) return 70;
  if (result.percentEscape) return 60;
  if (result.spacingArtifact) return 50;
  if (result.failureClass) return 40;
  return 0;
}

function decisionLines(counts) {
  const baseline = counts.endpointStats.simpletex_ocr_formula;
  const candidate = counts.endpointStats.latex_ocr;
  const baselineRate = ratio(baseline.currentActionable, baseline.calls);
  const candidateRate = ratio(candidate.currentActionable, candidate.calls);
  const latencyTooHigh = candidate.p95LatencyMs !== null && candidate.p95LatencyMs > 10000;

  if (candidateRate - baselineRate >= 0.1 && candidate.wrongAcceptedRiskCurrent <= baseline.wrongAcceptedRiskCurrent && !latencyTooHigh) {
    return [
      "- Recommend S12 design a route-level `latex_ocr` switch or endpoint strategy for pure formula OCR.",
      "- Still keep normalization/policy work in scope for any remaining percent/star/spacing artifacts."
    ];
  }
  if (candidateRate - baselineRate >= 0.1 && latencyTooHigh) {
    return [
      "- `latex_ocr` appears quality-positive but latency-blocked for direct replacement.",
      "- Consider it as a fallback/candidate only after timeout and UX policy are defined."
    ];
  }
  return [
    "- Do not switch the production route to `latex_ocr` solely from this run.",
    "- Prioritize normalization/policy if `%` escape, star multiplication, or spacing artifacts dominate remaining failures.",
    "- Keep `simpletex_ocr rec_mode=formula` unless `latex_ocr` shows a clear, stable uplift in a clean rerun."
  ];
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replace(/`/g, "\\`").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 180);
}

function printProgress(result) {
  if (result.callIndex === 1 || result.callIndex % 10 === 0 || result.failureClass) {
    console.log(JSON.stringify({
      call: result.callIndex,
      endpoint: result.endpoint,
      id: result.id,
      status: result.httpStatus,
      currentActionable: result.currentMatch.actionable,
      proposedActionable: result.proposedMatch.actionable,
      failureClass: result.failureClass,
      elapsedMs: result.elapsedMs
    }));
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
