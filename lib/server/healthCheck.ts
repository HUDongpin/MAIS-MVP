/** Strict readiness mapping and per-instance, best-effort health alerting. */
export type HealthStatus = "ok" | "degraded";
export type HealthAlertChannel = "resend" | "webhook" | "none";
export type HealthCheckEnv = Record<string, string | undefined>;
export type HealthCheckFetch = typeof fetch;
export type StorageReadinessProbe = (options: { includeDiagnosticsCounts: false }) => Promise<unknown>;
export type HealthSnapshot = {
  status: HealthStatus;
  storageReady: boolean;
  checkedInMs: number;
  failureKind: string;
  provider: string;
  posture: string;
  environment: string;
  release: string;
  region: string;
};
export type HealthAlertState = { lastStatus: HealthStatus | "unknown"; lastAlertAt: number };
export type HealthAlertDecision = { dispatch: boolean; kind: "down" | "recovered" | "none"; nextState: HealthAlertState };
export type HealthAlertResult = { status: "sent" | "failed" | "not-configured" | "skipped"; channel: HealthAlertChannel; httpStatus?: number };
type HealthAlertConfig =
  | { channel: "resend"; apiKey: string; from: string; to: string[]; timeoutMs: number }
  | { channel: "webhook"; webhookUrl: string; timeoutMs: number }
  | { channel: "none"; timeoutMs: number };

export const initialHealthAlertState: HealthAlertState = { lastStatus: "unknown", lastAlertAt: 0 };
const cacheTtlMs = 10_000;
const environments = new Set(["production", "preview", "development", "test"]);
const regions = new Set(["sin1", "pdx1", "iad1", "fra1", "hnd1", "syd1"]);
const postures = new Set(["durable-ready", "demo-only", "missing-postgres-url", "postgres-unavailable", "probe-failed", "invalid-readiness", "unknown"]);
const failures = new Set(["", "unknown", "unclassified", "probe-timeout", "postgres-quota", "postgres-connect-timeout", "postgres-connection", "postgres-url-missing", "postgres-unavailable", "missing-postgres-url", "demo-only", "invalid-readiness"]);
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
export function healthProbeTimeoutMs(env: HealthCheckEnv = process.env) { return boundedNumber(env.HEALTH_CHECK_TIMEOUT_MS, 5000, 500, 20_000); }
export function healthAlertRepeatMs(env: HealthCheckEnv = process.env) { return boundedNumber(env.HEALTH_ALERT_REPEAT_MS, 30 * 60_000, 60_000, 24 * 60 * 60_000); }
function duration(value: number) { return Number.isFinite(value) ? Math.min(60_000, Math.max(0, Math.round(value))) : 0; }
function deployment(env: HealthCheckEnv) {
  const environment = env.VERCEL_ENV || env.NODE_ENV || "unknown";
  const release = env.VERCEL_GIT_COMMIT_SHA || "";
  return { environment: environments.has(environment) ? environment : "unknown",
    release: /^[a-f0-9]{7,40}$/i.test(release) ? release.slice(0, 12).toLowerCase() : "unknown",
    region: regions.has(env.VERCEL_REGION ?? "") ? env.VERCEL_REGION! : "unknown" };
}
export function classifyHealthFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const code = record(error) && typeof error.code === "string" ? error.code : "";
  if (message === "health-probe-timeout") return "probe-timeout";
  if (message.includes("data transfer quota")) return "postgres-quota";
  if (code === "CONNECT_TIMEOUT" || message.includes("CONNECT_TIMEOUT")) return "postgres-connect-timeout";
  if (code.startsWith("ECONN") || message.includes("ECONN")) return "postgres-connection";
  if (message.includes("POSTGRES_URL is required")) return "postgres-url-missing";
  return error ? "unclassified" : "unknown";
}
function failedSnapshot(failureKind: string, elapsed: number, env: HealthCheckEnv): HealthSnapshot {
  return { status: "degraded", storageReady: false, checkedInMs: duration(elapsed), failureKind,
    provider: "unknown", posture: failureKind === "invalid-readiness" ? "invalid-readiness" : "probe-failed", ...deployment(env) };
}
function mapReadiness(value: unknown, elapsed: number, env: HealthCheckEnv): HealthSnapshot {
  if (!record(value) || typeof value.provider !== "string" || !["postgres", "sqlite"].includes(value.provider)
    || typeof value.durableReady !== "boolean" || typeof value.configuredPath !== "boolean"
    || typeof value.usingTmpFallback !== "boolean" || typeof value.runtime !== "string" || !["local", "vercel"].includes(value.runtime)) {
    return failedSnapshot("invalid-readiness", elapsed, env);
  }
  const postgres = value.provider === "postgres";
  const knownStatus = postgres ? ["durable-ready", "missing-postgres-url", "postgres-unavailable"] : ["durable-ready", "demo-only"];
  if (typeof value.status !== "string" || !knownStatus.includes(value.status)
    || (postgres && (typeof value.configuredUrl !== "boolean" || !record(value.hotAuthTables) || typeof value.hotAuthTables.tablesReady !== "boolean"))) {
    return failedSnapshot("invalid-readiness", elapsed, env);
  }
  const durable = value.status === "durable-ready" && value.durableReady === true && value.configuredPath === true
    && value.usingTmpFallback === false && (!postgres || (value.configuredUrl === true && (value.hotAuthTables as Record<string, unknown>).tablesReady === true));
  if ((value.durableReady || value.status === "durable-ready") && !durable) return failedSnapshot("invalid-readiness", elapsed, env);
  const localDemo = !postgres && value.status === "demo-only" && !value.durableReady && !value.configuredPath
    && !value.usingTmpFallback && value.runtime === "local" && env.HEALTH_CHECK_ALLOW_LOCAL_DEMO === "true"
    && (env.NODE_ENV === "development" || env.NODE_ENV === "test") && !env.VERCEL && !env.VERCEL_ENV;
  return { status: durable || localDemo ? "ok" : "degraded", storageReady: durable,
    checkedInMs: duration(elapsed), failureKind: durable || localDemo ? "" : value.status,
    provider: postgres ? "postgres" : "sqlite", posture: value.status, ...deployment(env) };
}

/** One underlying probe stays owned until settlement, even after its public deadline. */
export function createStorageHealthReader({ probe, env = process.env, now = Date.now }: {
  probe: StorageReadinessProbe; env?: HealthCheckEnv; now?: () => number;
}) {
  let cache: { at: number; snapshot: HealthSnapshot } | null = null;
  let active: { result: Promise<HealthSnapshot> } | null = null;
  return {
    read(trusted = false): Promise<HealthSnapshot> {
      if (active) return active.result;
      const age = cache ? now() - cache.at : -1;
      if (!trusted && cache && age >= 0 && age < cacheTtlMs) return Promise.resolve(cache.snapshot);
      const startedAt = now();
      let complete!: (snapshot: HealthSnapshot) => void;
      const operation = { result: new Promise<HealthSnapshot>((resolve) => { complete = resolve; }) };
      active = operation;
      let published = false;
      const publish = (snapshot: HealthSnapshot) => {
        if (published) return;
        published = true; cache = { at: now(), snapshot }; complete(snapshot);
      };
      const timer = setTimeout(() => publish(failedSnapshot("probe-timeout", now() - startedAt, env)), healthProbeTimeoutMs(env));
      const settle = (makeSnapshot: () => HealthSnapshot) => {
        clearTimeout(timer);
        if (active === operation) active = null;
        try { publish(makeSnapshot()); }
        catch { publish(failedSnapshot("invalid-readiness", now() - startedAt, env)); }
      };
      void Promise.resolve().then(() => probe({ includeDiagnosticsCounts: false })).then(
        (value) => settle(() => mapReadiness(value, now() - startedAt, env)),
        (error: unknown) => settle(() => failedSnapshot(classifyHealthFailure(error), now() - startedAt, env))
      );
      return operation.result;
    }
  };
}
export function probeStorageHealth(options: { probe: StorageReadinessProbe; env?: HealthCheckEnv; now?: () => number }) {
  return createStorageHealthReader(options).read(true);
}

function email(value: string) {
  const [local, domain, extra] = value.split("@");
  if (!local || !domain || extra !== undefined || value.length > 254 || local.length > 64) return false;
  return /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)
    && domain.includes(".") && domain.split(".").every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}
function sender(value: string) {
  if (email(value)) return true;
  const match = /^MAIS (?:Ops|Health) <([^<>]+)>$/.exec(value);
  return Boolean(match && email(match[1]));
}
export function readHealthAlertConfig(env: HealthCheckEnv = process.env): HealthAlertConfig {
  const timeoutMs = boundedNumber(env.HEALTH_ALERT_TIMEOUT_MS, 8000, 1000, 30_000);
  const from = env.HEALTH_ALERT_FROM?.trim() ?? "";
  const rawTo = env.HEALTH_ALERT_EMAIL_TO?.trim() ?? "";
  // RESEND_API_KEY is shared configuration; only health-specific fields opt this channel in.
  if (from || rawTo) {
    const apiKey = env.RESEND_API_KEY ?? "";
    const to = rawTo.split(",").map((value) => value.trim());
    if (!apiKey || apiKey.length > 512 || /\s|[\x00-\x1f\x7f]/.test(apiKey) || !sender(from)
      || !to.length || to.length > 10 || !to.every(email) || new Set(to.map((value) => value.toLowerCase())).size !== to.length) return { channel: "none", timeoutMs };
    return { channel: "resend", apiKey, from, to, timeoutMs };
  }
  const raw = env.HEALTH_ALERT_WEBHOOK_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (raw.length > 2048 || !/^https:\/\//i.test(raw) || url.protocol !== "https:" || url.username || url.password || /[#\\\x00-\x20\x7f]/.test(raw)) return { channel: "none", timeoutMs };
      return { channel: "webhook", webhookUrl: url.href, timeoutMs };
    } catch { /* No delivery for malformed configuration. */ }
  }
  return { channel: "none", timeoutMs };
}
export function isHealthAlertConfigured(env: HealthCheckEnv = process.env) { return readHealthAlertConfig(env).channel !== "none"; }
export function evaluateHealthAlert(state: HealthAlertState, { status, now, repeatMs }: { status: HealthStatus; now: number; repeatMs: number }): HealthAlertDecision {
  if (status === "degraded") {
    if (state.lastStatus !== "degraded" || now - state.lastAlertAt >= repeatMs) return { dispatch: true, kind: "down", nextState: { lastStatus: "degraded", lastAlertAt: now } };
    return { dispatch: false, kind: "none", nextState: { ...state } };
  }
  if (state.lastStatus === "degraded") return { dispatch: true, kind: "recovered", nextState: { lastStatus: "ok", lastAlertAt: now } };
  return { dispatch: false, kind: "none", nextState: { lastStatus: "ok", lastAlertAt: state.lastAlertAt } };
}
function safeSnapshot(snapshot: HealthSnapshot): HealthSnapshot {
  return { status: snapshot.status === "ok" ? "ok" : "degraded", storageReady: snapshot.storageReady === true,
    checkedInMs: duration(snapshot.checkedInMs), provider: ["postgres", "sqlite"].includes(snapshot.provider) ? snapshot.provider : "unknown",
    posture: postures.has(snapshot.posture) ? snapshot.posture : "unknown",
    failureKind: failures.has(snapshot.failureKind) ? snapshot.failureKind : "unclassified",
    environment: environments.has(snapshot.environment) ? snapshot.environment : "unknown",
    release: /^[a-f0-9]{7,40}$/i.test(snapshot.release) ? snapshot.release.slice(0, 12).toLowerCase() : "unknown",
    region: regions.has(snapshot.region) ? snapshot.region : "unknown" };
}
function payload(kind: "down" | "recovered", input: HealthSnapshot) {
  const snapshot = safeSnapshot(input);
  const subject = kind === "down" ? `MAIS health check FAILED (${snapshot.environment}) — ${snapshot.failureKind || "unknown"}` : `MAIS health check recovered (${snapshot.environment})`;
  const text = [kind === "down" ? "The MAIS health check is failing." : "The MAIS health check recovered.",
    `Environment: ${snapshot.environment}`, `Release: ${snapshot.release}`, `Region: ${snapshot.region}`,
    `Storage provider: ${snapshot.provider}`, `Durable storage ready: ${snapshot.storageReady ? "yes" : "no"}`,
    `Storage posture: ${snapshot.posture}`, `Failure kind: ${snapshot.failureKind || "none"}`, `Probe duration: ${snapshot.checkedInMs}ms`].join("\n");
  return { event: kind === "down" ? "health.down" : "health.recovered", subject, text, ...snapshot };
}
type SendOptions = { kind: "down" | "recovered"; snapshot: HealthSnapshot; env?: HealthCheckEnv; fetchImpl?: HealthCheckFetch };
async function cancelResponse(response: Response) {
  try { await response.body?.cancel(); } catch { /* Consume cancellation failures without leaking diagnostics. */ }
}
/** Public completion is bounded; the dispatcher retains the raw transport latch after timeout. */
function beginSend({ kind, snapshot, env = process.env, fetchImpl = fetch }: SendOptions) {
  const config = readHealthAlertConfig(env);
  let pending = config.channel !== "none";
  let drain!: () => void;
  const drained = new Promise<void>((resolve) => { drain = resolve; });
  if (config.channel === "none") { drain(); return { result: Promise.resolve<HealthAlertResult>({ status: "not-configured", channel: "none" }), drained, isPending: () => false }; }
  const controller = new AbortController();
  let resolve!: (value: HealthAlertResult) => void;
  let completed = false;
  const result = new Promise<HealthAlertResult>((r) => { resolve = r; });
  const finish = (value: HealthAlertResult) => { if (!completed) { completed = true; resolve(value); } };
  const timer = setTimeout(() => { controller.abort(); finish({ status: "failed", channel: config.channel }); }, config.timeoutMs);
  const event = payload(kind, snapshot);
  const url = config.channel === "resend" ? "https://api.resend.com/emails" : config.webhookUrl;
  const body = config.channel === "resend" ? { from: config.from, to: config.to, subject: event.subject, text: event.text } : event;
  const settle = (value: HealthAlertResult) => {
    pending = false;
    clearTimeout(timer);
    finish(value);
    drain();
  };
  void Promise.resolve().then(() => fetchImpl(url, { method: "POST", signal: controller.signal, redirect: "error", credentials: "omit",
    headers: { "Content-Type": "application/json", ...(config.channel === "resend" ? { Authorization: `Bearer ${config.apiKey}` } : {}) }, body: JSON.stringify(body) })).then(
    async (response) => { await cancelResponse(response); settle(response.ok && !response.redirected ? { status: "sent", channel: config.channel } : { status: "failed", channel: config.channel, httpStatus: response.status }); },
    () => { settle({ status: "failed", channel: config.channel }); }
  ).catch(() => { settle({ status: "failed", channel: config.channel }); });
  return { result, drained, isPending: () => pending };
}
export function sendHealthAlert(options: SendOptions) { return beginSend(options).result; }

type DispatchOptions = { snapshot: HealthSnapshot; env?: HealthCheckEnv; fetchImpl?: HealthCheckFetch; now?: number };
/** At most one raw send and one latest queued observation per instance. */
export function createHealthAlertDispatcher(defaults: { env?: HealthCheckEnv; fetchImpl?: HealthCheckFetch } = {}) {
  let state = { ...initialHealthAlertState };
  let active: { status: HealthStatus; result: Promise<HealthAlertResult>; transport: ReturnType<typeof beginSend> } | null = null;
  let queued: { options: DispatchOptions; result: Promise<HealthAlertResult>; complete: (result: HealthAlertResult) => void } | null = null;
  const dispatch = (options: DispatchOptions): Promise<HealthAlertResult> => {
    const env = options.env ?? defaults.env ?? process.env;
    const fetchImpl = options.fetchImpl ?? defaults.fetchImpl ?? fetch;
    if (active) {
      if (active.status === options.snapshot.status && !queued) return active.result;
      if (queued) queued.options = options;
      else {
        let complete!: (result: HealthAlertResult) => void;
        const result = new Promise<HealthAlertResult>((resolve) => { complete = resolve; });
        queued = { options, result, complete };
      }
      const waiting = queued;
      const current = active;
      return current.result.then((result) => current.transport.isPending() ? result : waiting.result);
    }
    const decision = evaluateHealthAlert(state, { status: options.snapshot.status, now: options.now ?? Date.now(), repeatMs: healthAlertRepeatMs(env) });
    if (!decision.dispatch || decision.kind === "none") { state = decision.nextState; return Promise.resolve({ status: "skipped", channel: readHealthAlertConfig(env).channel }); }
    const transport = beginSend({ kind: decision.kind, snapshot: options.snapshot, env, fetchImpl });
    const operation = { status: options.snapshot.status, transport, result: transport.result.then((result) => {
      if (result.status === "sent") state = decision.nextState;
      return result;
    }) };
    active = operation;
    void transport.drained.then(() => {
      if (active !== operation) return;
      active = null;
      const next = queued; queued = null;
      if (next) void dispatch(next.options).then(next.complete);
    });
    return operation.result;
  };
  return { dispatch, readState: () => ({ ...state }), reset: () => {
    if (active?.transport.isPending()) throw new Error("Cannot reset an active health alert.");
    state = { ...initialHealthAlertState }; active = null; queued = null;
  } };
}
const defaultDispatcher = createHealthAlertDispatcher();
export function dispatchHealthAlertIfDue(options: DispatchOptions) { return defaultDispatcher.dispatch(options); }
export function readHealthAlertState() { return defaultDispatcher.readState(); }
export function resetHealthAlertState() { defaultDispatcher.reset(); }
