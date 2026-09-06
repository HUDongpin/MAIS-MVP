/** Shared wire policy: classifications, never free text or identity paths. */
const errorNames = new Set(["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "URIError", "EvalError", "AggregateError", "AbortError", "TimeoutError", "SecurityError", "NetworkError", "ChunkLoadError", "QuotaExceededError", "UnhandledRejection", "RenderError", "ClientError"]);
export const clientErrorSources = ["window.onerror", "unhandledrejection", "global-error-boundary", "client"] as const;
const sources = new Set<string>(clientErrorSources);
const exactRoutes = new Set([
  "/", "/login", "/register", "/dashboard", "/practice", "/lesson", "/learning-path", "/progress", "/mistake-book", "/teacher", "/parent", "/messages", "/assessment", "/resource", "/visualization-lab", "/games", "/secondary-roadmap", "/student",
  "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/logout-all", "/api/auth/session", "/api/auth/session-state", "/api/auth/reset-password", "/api/auth/forgot-password", "/api/ai-tutor", "/api/ai-tutor/resolve", "/api/health", "/api/observability/client-error", "/api/observability/test-error"
]);
const routeFamilies = ["/teacher", "/parent", "/student", "/lesson", "/practice", "/games", "/resource", "/api/auth"];
const categories = new Set(["unhandled-error", "chunk-load-failed", "network-failed", "type-error", "syntax-error", "hydration-failed", "react-error", "resize-observer-loop", "request-aborted", "request-timeout", "resource-exhausted", "permission-denied", "postgres-quota", "postgres-connect-timeout", "postgres-statement-timeout", "postgres-connection", "postgres-error"]);
const knownCodes = new Set(["23505", "23503", "23502", "42P01", "42703", "57014", "40001", "40P01", "53300", "08000", "08003", "08006", "CONNECT_TIMEOUT", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"]);

export function readErrorString(error: unknown, key: "name" | "message" | "code") {
  try {
    if (key === "message" && typeof error === "string") return error.slice(0, 500);
    if (!error || typeof error !== "object") return "";
    const value = (error as Record<string, unknown>)[key];
    return typeof value === "string" ? value.slice(0, 500) : "";
  } catch { return ""; }
}
export function safeErrorName(name: unknown) {
  return typeof name === "string" && errorNames.has(name) ? name : "Error";
}
export function normalizeObservedRoute(value: unknown) {
  if (value === "userStore.writePostgresDatabase") return value;
  if (typeof value !== "string" || value.length > 2048) return "unknown";
  const pathname = value.split(/[?#]/, 1)[0];
  if (exactRoutes.has(pathname)) return pathname;
  for (const family of routeFamilies) if (pathname.startsWith(`${family}/`)) return `${family}/[path]`;
  return "unknown";
}
/** Input is inspected only to select a fixed category; no substring is returned. */
export function classifyObservedError(error: unknown) {
  const message = readErrorString(error, "message");
  const code = readErrorString(error, "code");
  const name = readErrorString(error, "name");
  if (categories.has(message)) return message;
  if (/data transfer quota/i.test(message)) return "postgres-quota";
  if (code === "CONNECT_TIMEOUT") return "postgres-connect-timeout";
  if (code === "57014") return "postgres-statement-timeout";
  if (/^(ECONN|080)/.test(code) && knownCodes.has(code)) return "postgres-connection";
  if (knownCodes.has(code)) return "postgres-error";
  if (/^loading (chunk|css chunk)\b/i.test(message) || name === "ChunkLoadError") return "chunk-load-failed";
  if (/^(failed to fetch|load failed|network ?error|failed to (import|load|register)|websocket|eventsource)\b/i.test(message)) return "network-failed";
  if (/^(cannot read propert|undefined is not an object|null is not an object)/i.test(message) || name === "TypeError") return "type-error";
  if (/^(unexpected token|unexpected end of|json\.parse|invalid or unexpected token)/i.test(message) || name === "SyntaxError") return "syntax-error";
  if (/^(hydration failed|text content does not match|there was an error while hydrating)/i.test(message)) return "hydration-failed";
  if (/^minified react error #\d+/i.test(message)) return "react-error";
  if (/^resizeobserver loop/i.test(message)) return "resize-observer-loop";
  if (/^(the operation was aborted|aborterror|request aborted|signal is aborted)/i.test(message) || name === "AbortError") return "request-aborted";
  if (/^(timeout|timed out|the request timed out)/i.test(message) || name === "TimeoutError") return "request-timeout";
  if (/^(out of memory|maximum call stack size exceeded|quota ?exceeded)/i.test(message)) return "resource-exhausted";
  if (/^(permission denied|access is denied|notallowederror|securityerror)/i.test(message)) return "permission-denied";
  return "unhandled-error";
}
export type ClientErrorReport = { name: string; route: string; source: string; message: string; stack: string };
export function normalizeClientErrorPayload(payload: unknown): ClientErrorReport | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  try {
    const record = payload as Record<string, unknown>;
    return { name: safeErrorName(record.name), route: normalizeObservedRoute(record.route), source: typeof record.source === "string" && sources.has(record.source) ? record.source : "client", message: classifyObservedError(record), stack: "" };
  } catch { return null; }
}
const safeTagValues = new Set([
  ...clientErrorSources, ...categories, "unknown", "unclassified", "node", "nodejs", "edge", "browser", "postgres", "sqlite", "stream", "buffered", "auth-route", "api-route", "ai-tutor", "datastore", "health", "client",
  "stream-unhandled", "unhandled", "edge-resolver-unreachable", "deliberate-probe", "observability-probe", "alert-dispatch-failed", "postgres-url-missing", "session-secret-missing", "app_state-upsert", "app_state-update"
]);
export function safeMonitorLabel(value: unknown) {
  return typeof value === "string" && safeTagValues.has(value) ? value : "unknown";
}
export function safeErrorCode(value: unknown) {
  return typeof value === "string" && knownCodes.has(value) ? value : "";
}
