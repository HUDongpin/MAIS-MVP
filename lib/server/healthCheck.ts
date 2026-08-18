/**
 * Uptime health check + alerting.
 *
 * `/api/health` (registered as a Vercel cron next to the existing `/api/warm` keep-alive)
 * calls into this module every five minutes. Unlike `/api/warm` — which exists to keep a
 * lambda and its Neon connection hot and deliberately swallows every failure — this probe
 * is allowed to fail loudly: it reports a non-200 so an external uptime monitor sees it,
 * and it pushes an alert to e-mail or a webhook so somebody finds out before a student does.
 *
 * The alert payload is PII-free by construction: it carries only status, environment,
 * release, region, a classified failure kind and timings. Nothing user-derived is in scope
 * here, so there is no payload to scrub.
 *
 * Dedupe is per-instance and therefore best-effort — Vercel may run the cron on a fresh
 * lambda each time, in which case each failing run alerts once. That is the correct failure
 * mode for an alerting path (over-deliver rather than stay silent) and is documented in
 * docs/observability.md.
 */

export type HealthStatus = "ok" | "degraded";

export type HealthAlertChannel = "resend" | "webhook" | "none";

export type HealthCheckEnv = Record<string, string | undefined>;

export type HealthCheckFetch = typeof fetch;

export type StorageReadinessSnapshot = {
  provider?: string;
  status?: string;
  durableReady?: boolean;
};

export type StorageReadinessProbe = () => Promise<StorageReadinessSnapshot | null | undefined>;

export type HealthSnapshot = {
  status: HealthStatus;
  storageReady: boolean;
  checkedInMs: number;
  /** Classified reason the probe failed; "" when healthy. */
  failureKind: string;
  /** Storage backend the deployment is running on. */
  provider: string;
  /** The store's own readiness label, e.g. "durable-ready", "demo-only", "postgres-unavailable". */
  posture: string;
  environment: string;
  release: string;
  region: string;
};

export type HealthAlertState = {
  lastStatus: HealthStatus | "unknown";
  lastAlertAt: number;
};

export type HealthAlertDecision = {
  dispatch: boolean;
  kind: "down" | "recovered" | "none";
  nextState: HealthAlertState;
};

export type HealthAlertResult = {
  status: "sent" | "failed" | "not-configured" | "skipped";
  channel: HealthAlertChannel;
  httpStatus?: number;
};

type HealthAlertConfig =
  | { channel: "resend"; apiKey: string; from: string; to: string[]; timeoutMs: number }
  | { channel: "webhook"; webhookUrl: string; timeoutMs: number }
  | { channel: "none"; timeoutMs: number };

const defaultProbeTimeoutMs = 5000;
const minProbeTimeoutMs = 500;
const maxProbeTimeoutMs = 20000;
const defaultAlertTimeoutMs = 8000;
const defaultAlertRepeatMs = 30 * 60 * 1000;
const minAlertRepeatMs = 60 * 1000;
const maxAlertRepeatMs = 24 * 60 * 60 * 1000;

export const initialHealthAlertState: HealthAlertState = { lastStatus: "unknown", lastAlertAt: 0 };

function cleanEnvValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function healthProbeTimeoutMs(env: HealthCheckEnv = process.env) {
  return boundedNumber(env.HEALTH_CHECK_TIMEOUT_MS, defaultProbeTimeoutMs, minProbeTimeoutMs, maxProbeTimeoutMs);
}

export function healthAlertRepeatMs(env: HealthCheckEnv = process.env) {
  return boundedNumber(env.HEALTH_ALERT_REPEAT_MS, defaultAlertRepeatMs, minAlertRepeatMs, maxAlertRepeatMs);
}

/** Same taxonomy the auth boundary uses, so a health failure and a login failure name the same cause. */
export function classifyHealthFailure(error: unknown): string {
  if (!error) return "unknown";
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof (error as { code?: unknown } | null)?.code === "string" ? (error as { code: string }).code : "";
  if (message === "health-probe-timeout") return "probe-timeout";
  if (message.includes("data transfer quota")) return "postgres-quota";
  if (code === "CONNECT_TIMEOUT" || message.includes("CONNECT_TIMEOUT")) return "postgres-connect-timeout";
  if (code.startsWith("ECONN") || message.includes("ECONN")) return "postgres-connection";
  if (message.includes("POSTGRES_URL is required")) return "postgres-url-missing";
  return "unclassified";
}

export function readHealthAlertConfig(env: HealthCheckEnv = process.env): HealthAlertConfig {
  const timeoutMs = boundedNumber(env.HEALTH_ALERT_TIMEOUT_MS, defaultAlertTimeoutMs, 1000, 30000);
  const apiKey = cleanEnvValue(env.RESEND_API_KEY);
  const from = cleanEnvValue(env.HEALTH_ALERT_FROM);
  const to = cleanEnvValue(env.HEALTH_ALERT_EMAIL_TO)
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (apiKey && from && to.length) {
    return { channel: "resend", apiKey, from, to, timeoutMs };
  }

  const webhookUrl = cleanEnvValue(env.HEALTH_ALERT_WEBHOOK_URL);
  if (webhookUrl) return { channel: "webhook", webhookUrl, timeoutMs };

  return { channel: "none", timeoutMs };
}

export function isHealthAlertConfigured(env: HealthCheckEnv = process.env) {
  return readHealthAlertConfig(env).channel !== "none";
}

/**
 * Runs the durable-storage readiness probe under a hard timeout. A hung Postgres connection
 * is the exact failure this endpoint exists to catch, so "no answer" counts as degraded.
 */
export async function probeStorageHealth({
  probe,
  env = process.env,
  now = () => Date.now()
}: {
  probe: StorageReadinessProbe;
  env?: HealthCheckEnv;
  now?: () => number;
}): Promise<HealthSnapshot> {
  const startedAt = now();
  const timeoutMs = healthProbeTimeoutMs(env);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deployment = {
    environment: cleanEnvValue(env.VERCEL_ENV) || cleanEnvValue(env.NODE_ENV) || "development",
    release: cleanEnvValue(env.VERCEL_GIT_COMMIT_SHA).slice(0, 12) || "local",
    region: cleanEnvValue(env.VERCEL_REGION) || "unknown"
  };

  try {
    const snapshot = await Promise.race([
      probe(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("health-probe-timeout")), timeoutMs);
      })
    ]);
    const provider = cleanEnvValue(snapshot?.provider) || "unknown";
    const posture = cleanEnvValue(snapshot?.status) || "unknown";
    const storageReady = Boolean(snapshot?.durableReady);

    // Only Postgres deployments can be "down" in the sense worth paging for: there the probe
    // actually verifies the app_state table, so !durableReady means the database is
    // unreachable or unconfigured. On SQLite the same flag merely reports posture
    // (`demo-only` when HK_MATH_DB_PATH is unset), which is a deployment choice, not an
    // outage — alerting on it would train the owner to ignore this endpoint.
    const degraded = provider === "postgres" && !storageReady;
    return {
      status: degraded ? "degraded" : "ok",
      storageReady,
      checkedInMs: now() - startedAt,
      failureKind: degraded ? posture : "",
      provider,
      posture,
      ...deployment
    };
  } catch (error) {
    return {
      status: "degraded",
      storageReady: false,
      checkedInMs: now() - startedAt,
      failureKind: classifyHealthFailure(error),
      provider: "unknown",
      posture: "probe-failed",
      ...deployment
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Pure alert-dedupe decision: alert on the way down, re-alert only after `repeatMs`, and
 * send exactly one recovery notice on the way back up.
 */
export function evaluateHealthAlert(
  state: HealthAlertState,
  { status, now, repeatMs }: { status: HealthStatus; now: number; repeatMs: number }
): HealthAlertDecision {
  if (status === "degraded") {
    const alreadyAlerting = state.lastStatus === "degraded";
    const repeatDue = now - state.lastAlertAt >= repeatMs;
    if (!alreadyAlerting || repeatDue) {
      return { dispatch: true, kind: "down", nextState: { lastStatus: "degraded", lastAlertAt: now } };
    }
    return { dispatch: false, kind: "none", nextState: { lastStatus: "degraded", lastAlertAt: state.lastAlertAt } };
  }

  if (state.lastStatus === "degraded") {
    return { dispatch: true, kind: "recovered", nextState: { lastStatus: "ok", lastAlertAt: now } };
  }

  return { dispatch: false, kind: "none", nextState: { lastStatus: "ok", lastAlertAt: state.lastAlertAt } };
}

function alertSubject(kind: "down" | "recovered", snapshot: HealthSnapshot) {
  return kind === "down"
    ? `MAIS health check FAILED (${snapshot.environment}) — ${snapshot.failureKind || "unknown"}`
    : `MAIS health check recovered (${snapshot.environment})`;
}

function alertText(kind: "down" | "recovered", snapshot: HealthSnapshot) {
  return [
    kind === "down" ? "The MAIS production health check is failing." : "The MAIS production health check recovered.",
    `Environment: ${snapshot.environment}`,
    `Release: ${snapshot.release}`,
    `Region: ${snapshot.region}`,
    `Storage provider: ${snapshot.provider}`,
    `Durable storage ready: ${snapshot.storageReady ? "yes" : "no"}`,
    `Storage posture: ${snapshot.posture}`,
    `Failure kind: ${snapshot.failureKind || "none"}`,
    `Probe duration: ${snapshot.checkedInMs}ms`
  ].join("\n");
}

async function withTimeout<T>(timeoutMs: number, action: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendHealthAlert({
  kind,
  snapshot,
  env = process.env,
  fetchImpl = fetch
}: {
  kind: "down" | "recovered";
  snapshot: HealthSnapshot;
  env?: HealthCheckEnv;
  fetchImpl?: HealthCheckFetch;
}): Promise<HealthAlertResult> {
  const config = readHealthAlertConfig(env);
  if (config.channel === "none") return { status: "not-configured", channel: "none" };

  const subject = alertSubject(kind, snapshot);
  const text = alertText(kind, snapshot);

  try {
    if (config.channel === "resend") {
      const response = await withTimeout(config.timeoutMs, (signal) =>
        fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          signal,
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: config.from, to: config.to, subject, text })
        })
      );
      return response.ok
        ? { status: "sent", channel: "resend" }
        : { status: "failed", channel: "resend", httpStatus: response.status };
    }

    const response = await withTimeout(config.timeoutMs, (signal) =>
      fetchImpl(config.webhookUrl, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: kind === "down" ? "health.down" : "health.recovered",
          subject,
          text,
          status: snapshot.status,
          storageReady: snapshot.storageReady,
          provider: snapshot.provider,
          posture: snapshot.posture,
          failureKind: snapshot.failureKind,
          checkedInMs: snapshot.checkedInMs,
          environment: snapshot.environment,
          release: snapshot.release,
          region: snapshot.region
        })
      })
    );
    return response.ok
      ? { status: "sent", channel: "webhook" }
      : { status: "failed", channel: "webhook", httpStatus: response.status };
  } catch {
    return { status: "failed", channel: config.channel };
  }
}

/**
 * Per-instance alert state. Exported through helpers rather than directly so the route
 * cannot accidentally reset it, and so tests can drive the transitions deterministically.
 */
let alertState: HealthAlertState = { ...initialHealthAlertState };

export function readHealthAlertState(): HealthAlertState {
  return { ...alertState };
}

export function resetHealthAlertState() {
  alertState = { ...initialHealthAlertState };
}

/**
 * Applies the dedupe decision to the per-instance state and dispatches when due. Returns
 * "skipped" when the decision was to stay quiet, so callers can log the difference between
 * "no alert needed" and "alerting is not configured".
 */
export async function dispatchHealthAlertIfDue({
  snapshot,
  env = process.env,
  fetchImpl = fetch,
  now = Date.now()
}: {
  snapshot: HealthSnapshot;
  env?: HealthCheckEnv;
  fetchImpl?: HealthCheckFetch;
  now?: number;
}): Promise<HealthAlertResult> {
  const previousState = alertState;
  const decision = evaluateHealthAlert(alertState, {
    status: snapshot.status,
    now,
    repeatMs: healthAlertRepeatMs(env)
  });
  alertState = decision.nextState;
  if (!decision.dispatch || decision.kind === "none") {
    return { status: "skipped", channel: readHealthAlertConfig(env).channel };
  }

  const result = await sendHealthAlert({ kind: decision.kind, snapshot, env, fetchImpl });
  if (result.status === "failed") {
    // The dedupe window may only start once an alert has actually been delivered. Committing
    // it on a failed send would buy HEALTH_ALERT_REPEAT_MS of silence for an outage nobody was
    // told about — the exact failure this endpoint exists to prevent. Rolling the whole state
    // back also preserves a failed "recovered" notice, which is retried on the next probe.
    alertState = previousState;
  }
  return result;
}
