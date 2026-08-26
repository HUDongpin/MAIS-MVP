import { spawn } from "node:child_process";

const vercelDeploymentHostnamePattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/u;
const fixedProductionOrigins = new Set([
  "https://www.mais.ac",
  "https://www.mais.hk"
]);
const candidateShaPattern = /^[0-9a-f]{40}$/u;
const deploymentIdPattern = /^dpl_[A-Za-z0-9]+$/u;
const defaultRequestTimeoutMs = 15_000;

class DeploymentSmokeContractError extends Error {}

function deploymentSmokeContractError(route, detail) {
  return new DeploymentSmokeContractError(`Read-only deployment smoke failed for ${route.id}: ${detail}`);
}

export const deploymentReadOnlyRoutes = Object.freeze([
  Object.freeze({ id: "landing", method: "HEAD", path: "/", contract: "public-page" }),
  Object.freeze({ id: "about", method: "HEAD", path: "/about", contract: "public-page" }),
  Object.freeze({ id: "login", method: "HEAD", path: "/login", contract: "public-page" }),
  Object.freeze({ id: "parent-entry", method: "GET", path: "/parent", contract: "parent-redirect" }),
  Object.freeze({ id: "parent-foundation", method: "GET", path: "/api/parent/foundation", contract: "parent-api" }),
  Object.freeze({ id: "session", method: "GET", path: "/api/me", contract: "unauth-api" }),
  Object.freeze({ id: "warm", method: "GET", path: "/api/warm", contract: "warm-api" })
]);

function canonicalHttpsOrigin(value) {
  return classifyApprovedHttpsOrigin(value).origin;
}

function classifyApprovedHttpsOrigin(value) {
  const raw = String(value ?? "");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      "Deployment smoke base URL must be one canonical HTTPS origin and one approved HTTPS deployment origin."
    );
  }
  const origin = parsed.origin.toLowerCase();
  if (
    raw !== origin ||
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "Deployment smoke base URL must be one canonical HTTPS origin and one approved HTTPS deployment origin."
    );
  }
  if (fixedProductionOrigins.has(origin)) {
    return { hostname: parsed.hostname, kind: "fixed-production", origin };
  }
  if (vercelDeploymentHostnamePattern.test(parsed.hostname)) {
    return { hostname: parsed.hostname, kind: "vercel-deployment", origin };
  }
  throw new Error(
    "Deployment smoke base URL must be one canonical HTTPS origin and one approved HTTPS deployment origin."
  );
}

function assertPublicPage(response, route) {
  if (response.status !== 200) {
    throw deploymentSmokeContractError(route, `expected HTTP 200, received ${response.status}.`);
  }
  if (response.headers.get("set-cookie")) {
    throw deploymentSmokeContractError(route, "unexpected Set-Cookie.");
  }
  if (!response.headers.get("cache-control")) {
    throw deploymentSmokeContractError(route, "missing Cache-Control.");
  }
}

function cacheDirectives(headers, name = "cache-control") {
  return new Set(
    String(headers.get(name) ?? "")
      .toLowerCase()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function assertNoCookie(response, route) {
  if (response.headers.get("set-cookie")) {
    throw deploymentSmokeContractError(route, "unexpected Set-Cookie.");
  }
}

function assertNoStore(response, route, { requirePrivate = false, requireCdn = false } = {}) {
  assertNoCookie(response, route);
  const cacheControl = cacheDirectives(response.headers);
  if (!cacheControl.has("no-store")) {
    throw deploymentSmokeContractError(route, "missing no-store.");
  }
  if (requirePrivate && !cacheControl.has("private")) {
    throw deploymentSmokeContractError(route, "missing private Cache-Control.");
  }
  const vercelCacheStatus = String(response.headers.get("x-vercel-cache") ?? "").trim().toUpperCase();
  if (
    vercelCacheStatus === "HIT" ||
    vercelCacheStatus === "STALE" ||
    (requireCdn && !vercelCacheStatus)
  ) {
    throw deploymentSmokeContractError(route, "unsafe Vercel cache status.");
  }
  for (const headerName of ["cdn-cache-control", "vercel-cdn-cache-control"]) {
    if (!response.headers.has(headerName)) continue;
    const directives = cacheDirectives(response.headers, headerName);
    if (!directives.has("no-store") || (requirePrivate && !directives.has("private"))) {
      throw deploymentSmokeContractError(route, "unsafe visible CDN cache directive.");
    }
  }
}

function assertParentRedirect(response, route, origin) {
  if (![302, 303, 307, 308].includes(response.status)) {
    throw deploymentSmokeContractError(route, "expected an unauthenticated redirect.");
  }
  let location;
  try {
    location = new URL(response.headers.get("location") ?? "", origin);
  } catch {
    throw deploymentSmokeContractError(route, "invalid redirect target.");
  }
  if (
    location.origin !== origin ||
    location.pathname !== "/login" ||
    location.searchParams.get("next") !== "/parent"
  ) {
    throw deploymentSmokeContractError(route, "unexpected redirect target.");
  }
  assertNoStore(response, route);
}

function assertProtectedContract(response, route, origin) {
  if (route.contract === "public-page") {
    assertPublicPage(response, route);
  } else if (route.contract === "parent-redirect") {
    assertParentRedirect(response, route, origin);
  } else if (route.contract === "parent-api") {
    if (response.status !== 401 && response.status !== 403) {
      throw deploymentSmokeContractError(route, "expected unauthenticated rejection.");
    }
    assertNoStore(response, route, { requirePrivate: true, requireCdn: true });
  } else if (route.contract === "unauth-api") {
    if (response.status !== 401 && response.status !== 403) {
      throw deploymentSmokeContractError(route, "expected unauthenticated rejection.");
    }
    assertNoStore(response, route, { requirePrivate: true });
  } else if (route.contract === "warm-api") {
    if (response.status !== 401) {
      throw deploymentSmokeContractError(route, "expected configured unauthorized HTTP 401.");
    }
    assertNoStore(response, route, { requirePrivate: true });
  } else {
    throw deploymentSmokeContractError(route, "unknown response contract.");
  }
}

export async function runDeploymentReadOnlySmoke(baseUrl, options = {}) {
  const approvedOrigin = classifyApprovedHttpsOrigin(baseUrl);
  const origin = approvedOrigin.origin;
  if (
    approvedOrigin.kind === "vercel-deployment" &&
    options.approvedVercelDeploymentHost !== approvedOrigin.hostname
  ) {
    throw new Error("Deployment smoke requires the exact provider-approved Vercel deployment host.");
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const routes = options.routes ?? deploymentReadOnlyRoutes;
  const env = options.env ?? process.env;
  const requestTimeoutMs = options.requestTimeoutMs ?? defaultRequestTimeoutMs;
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 60_000) {
    throw new Error("Deployment smoke request timeout must be between 1 and 60000 milliseconds.");
  }
  const bypassSecret = env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
    || env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const headers = bypassSecret && approvedOrigin.kind === "vercel-deployment"
    ? { "x-vercel-protection-bypass": bypassSecret }
    : {};
  const checks = [];

  for (const route of routes) {
    if (
      !route ||
      typeof route !== "object" ||
      !/^[a-z0-9][a-z0-9-]*$/u.test(route.id ?? "") ||
      (route.method !== "GET" && route.method !== "HEAD") ||
      typeof route.path !== "string" ||
      !route.path.startsWith("/") ||
      route.path.startsWith("//") ||
      route.path.includes("?") ||
      route.path.includes("#")
    ) {
      throw new Error("Deployment smoke routes must be a safe GET or HEAD route.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response;
    try {
      response = await fetchImpl(`${origin}${route.path}`, {
        headers,
        method: route.method,
        redirect: "manual",
        signal: controller.signal
      });
    } catch {
      throw new Error(
        `Read-only deployment smoke failed for ${route.id}: request failed or timed out; details redacted.`
      );
    } finally {
      clearTimeout(timeout);
    }
    let responseStatus;
    try {
      if (
        !response ||
        typeof response.status !== "number" ||
        !response.headers ||
        typeof response.headers.get !== "function" ||
        typeof response.headers.has !== "function"
      ) {
        throw deploymentSmokeContractError(route, "invalid response; details redacted.");
      }
      assertProtectedContract(response, route, origin);
      responseStatus = response.status;
    } catch (error) {
      if (error instanceof DeploymentSmokeContractError) throw error;
      throw deploymentSmokeContractError(route, "invalid response; details redacted.");
    }
    checks.push({ id: route.id, method: route.method, path: route.path, status: responseStatus });
  }

  return {
    baseUrl: origin,
    readOnly: true,
    requestCount: checks.length,
    checks
  };
}

export async function readCleanCandidateSha(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? runQuietCommand;
  let headResult;
  try {
    headResult = await runCommand("git", ["rev-parse", "--verify", "HEAD"], { cwd, quiet: true });
  } catch {
    throw new Error("Could not read candidate Git HEAD; command details redacted.");
  }
  if (!headResult || headResult.exitCode !== 0) {
    throw new Error("Could not read candidate Git HEAD; command details redacted.");
  }
  const candidateSha = String(headResult.stdout ?? "").trim().toLowerCase();
  if (!candidateShaPattern.test(candidateSha)) {
    throw new Error("Candidate Git HEAD was not a valid 40-character Git SHA.");
  }

  let statusResult;
  try {
    statusResult = await runCommand(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      { cwd, quiet: true }
    );
  } catch {
    throw new Error("Could not verify clean Git source; command details redacted.");
  }
  if (!statusResult || statusResult.exitCode !== 0) {
    throw new Error("Could not verify clean Git source; command details redacted.");
  }
  if (String(statusResult.stdout ?? "").trim()) {
    throw new Error("Deployment requires a clean Git source; dirty paths are redacted.");
  }
  return candidateSha;
}

export async function assertCleanCandidateSha(expectedCandidateSha, options = {}) {
  const expected = String(expectedCandidateSha ?? "").trim().toLowerCase();
  if (!candidateShaPattern.test(expected)) {
    throw new Error("Expected candidate was not a valid 40-character Git SHA.");
  }
  const current = await readCleanCandidateSha(options);
  if (current !== expected) {
    throw new Error("Deployment candidate source changed after local verification; SHA details redacted.");
  }
  return current;
}

export function parseVercelInspectEvidence(output, expected) {
  const fail = () => {
    throw new Error("Vercel inspect evidence failed validation; details redacted.");
  };
  let payload;
  try {
    const normalized = String(output ?? "").trim();
    const jsonStart = normalized.indexOf("{");
    if (jsonStart < 0) fail();
    payload = JSON.parse(normalized.slice(jsonStart));
  } catch {
    fail();
  }

  const candidateSha = String(expected?.candidateSha ?? "").trim().toLowerCase();
  const target = expected?.target;
  let expectedOrigin;
  let providerOrigin;
  try {
    expectedOrigin = canonicalHttpsOrigin(expected?.deploymentUrl);
    const providerUrl = String(payload?.url ?? "").startsWith("https://")
      ? String(payload.url)
      : `https://${String(payload?.url ?? "")}`;
    providerOrigin = canonicalHttpsOrigin(providerUrl);
  } catch {
    fail();
  }

  if (
    !candidateShaPattern.test(candidateSha) ||
    !deploymentIdPattern.test(String(payload?.id ?? "")) ||
    providerOrigin !== expectedOrigin ||
    payload?.readyState !== "READY" ||
    payload?.target !== target ||
    String(payload?.meta?.maisCandidateSha ?? "").toLowerCase() !== candidateSha
  ) {
    fail();
  }

  return {
    candidateSha,
    deploymentId: payload.id,
    deploymentUrl: expectedOrigin,
    metadataVerified: true,
    providerGitShaVerified: false,
    readyState: "READY",
    target
  };
}

function runQuietCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: command === "git"
        ? {
            ...process.env,
            GIT_NO_LAZY_FETCH: "1",
            GIT_TERMINAL_PROMPT: "0"
          }
        : process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}
