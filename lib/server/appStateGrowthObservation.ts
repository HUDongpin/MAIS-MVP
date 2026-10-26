import type { ErrorMonitorContext } from "@/lib/server/errorMonitor";

/**
 * Growth observation for the single `app_state` row.
 *
 * All persistent application state lives in one `app_state` row, in one `jsonb`
 * payload holding 81 entity collections. Every mutation takes an exclusive row
 * lock on it, reads the whole payload, mutates in JS, and writes the whole
 * payload back. Write cost therefore scales with *total accumulated history*,
 * not with the size of the change, and several of those collections are
 * append-only with no retention: `learning_events`, `attempts`,
 * `ai_tutor_messages`, `gamification_events`, `visualization_events`,
 * `ai_governance_events`, `teacher_live_responses`,
 * `assignment_submission_attempts`, `content_safety_flags` and the `forum_*`
 * family all grow forever.
 *
 * The 2026-10-19 review could not say how close the deployment is to trouble,
 * because nothing measures the payload. That matters: `postgres-quota`
 * ("data transfer quota") is already a named failure kind in the auth hot path
 * (`authRouteGuards.ts`) and in `healthCheck.ts`, which is what exhausting a
 * Neon transfer allowance looks like from inside the app. This module supplies
 * the missing number so the strangler work in the engineering backlog can be
 * prioritized against evidence rather than guessed at.
 *
 * `payloadBytes`, `durationMs`, `revision` and `operation` were already on
 * `errorMonitor`'s `allowedExtraKeys` allowlist before this module existed —
 * the observability layer was built to accept exactly this observation.
 *
 * ## Cost
 *
 * Collection counts are effectively free (one `.length` per collection) and are
 * the actionable signal, because they identify *which* collection is running
 * away. Payload bytes are the cost signal but require serializing the payload a
 * second time, so they are opt-in and sampled; with
 * `MAIS_APP_STATE_SIZE_SAMPLE` unset this module never serializes anything and
 * adds no measurable work to a write.
 */

/** Collections that grow without bound and have no retention policy today. */
export const unboundedAppStateCollections = [
  "learning_events",
  "attempts",
  "ai_tutor_messages",
  "ai_tutor_usage",
  "ai_governance_events",
  "gamification_events",
  "visualization_events",
  "visualization_sessions",
  "teacher_live_responses",
  "teacher_live_prompts",
  "assignment_submission_attempts",
  "assignment_grading_runs",
  "content_safety_flags",
  "forum_audit_events",
  "forum_notifications",
  "nova_lens_runs",
  "nova_lens_policy_events",
  "teacher_notice_delivery_attempts",
  "reward_point_ledger"
] as const;

export type AppStateGrowthSeverity = "ok" | "warn" | "critical";

export type AppStateGrowthThresholds = {
  warnBytes: number;
  criticalBytes: number;
  warnDurationMs: number;
};

export type AppStateCollectionCount = {
  collection: string;
  rows: number;
};

export type AppStateGrowthObservation = {
  severity: AppStateGrowthSeverity;
  durationMs: number;
  /** null when size sampling is disabled or this write was not sampled. */
  payloadBytes: number | null;
  revision: number | null;
  totalRows: number;
  /** Largest unbounded collections first; the ones to extract or prune. */
  topCollections: AppStateCollectionCount[];
  thresholds: AppStateGrowthThresholds;
  reasons: string[];
};

export type AppStateGrowthEnv = Record<string, string | undefined>;

/**
 * Defaults are deliberately generous so this lands silent on a healthy
 * deployment and speaks up before the transfer bill does.
 *
 * `warnBytes` 8 MiB: a payload this size is already well past the point where
 * read-modify-write of the whole row is a sensible write path, but it is still
 * survivable.
 *
 * `criticalBytes` 32 MiB: the write path currently binds the payload three
 * times per mutation and returns it once (see the review's amplification note),
 * so a 32 MiB payload moves roughly 128 MiB per write. A few thousand writes at
 * that size exhaust a small managed-Postgres transfer allowance, which is the
 * `postgres-quota` failure the auth route already classifies.
 */
export const defaultAppStateGrowthThresholds: AppStateGrowthThresholds = {
  warnBytes: 8 * 1024 * 1024,
  criticalBytes: 32 * 1024 * 1024,
  warnDurationMs: 2_000
};

function boundedInteger(value: string | undefined, fallback: number, min: number) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return rounded < min ? fallback : rounded;
}

export function readAppStateGrowthThresholds(
  env: AppStateGrowthEnv = process.env
): AppStateGrowthThresholds {
  return {
    warnBytes: boundedInteger(
      env.MAIS_APP_STATE_WARN_BYTES,
      defaultAppStateGrowthThresholds.warnBytes,
      1
    ),
    criticalBytes: boundedInteger(
      env.MAIS_APP_STATE_CRITICAL_BYTES,
      defaultAppStateGrowthThresholds.criticalBytes,
      1
    ),
    warnDurationMs: boundedInteger(
      env.MAIS_APP_STATE_WARN_DURATION_MS,
      defaultAppStateGrowthThresholds.warnDurationMs,
      1
    )
  };
}

/**
 * How long to wait before sending a second capture for the SAME severity.
 *
 * `captureServerError` draws on a process-global budget
 * (`maxEventsPerMinute`, 60 by default in errorMonitor.ts). A degraded
 * datastore produces a non-`ok` observation on *every* write, so an ungated
 * capture would spend that whole budget on identical growth warnings and
 * suppress unrelated production errors at exactly the moment the deployment is
 * unhealthy — the observation would be the thing hiding the outage. One event
 * per minute per severity is enough to see the condition and leaves the rest of
 * the budget for everything else.
 */
export const defaultAppStateCaptureCooldownMs = 60_000;

export function readAppStateCaptureCooldownMs(env: AppStateGrowthEnv = process.env) {
  return boundedInteger(
    env.MAIS_APP_STATE_CAPTURE_COOLDOWN_MS,
    defaultAppStateCaptureCooldownMs,
    0
  );
}

/** Mutable edge-trigger state: the last severity captured, and when. */
export type AppStateCaptureGate = {
  severity: AppStateGrowthSeverity | null;
  capturedAt: number;
};

export function createAppStateCaptureGate(): AppStateCaptureGate {
  return { severity: null, capturedAt: 0 };
}

/** The process-wide gate. Tests pass their own so they never share this one. */
const processCaptureGate = createAppStateCaptureGate();

/**
 * Edge-triggered with a cooldown: a change in severity always reports, a
 * persisting severity reports at most once per `cooldownMs`, and returning to
 * `ok` rearms the edge so the next escalation is reported immediately.
 *
 * Mutates the gate it is given, so it is called once per write and only for the
 * capture decision; `logWarning` stays unthrottled because stdout has no shared
 * budget and the per-write record is what makes the condition diagnosable.
 */
export function shouldCaptureAppStateGrowth(
  severity: AppStateGrowthSeverity,
  {
    gate = processCaptureGate,
    now = Date.now(),
    cooldownMs = defaultAppStateCaptureCooldownMs
  }: { gate?: AppStateCaptureGate; now?: number; cooldownMs?: number } = {}
) {
  if (severity === "ok") {
    gate.severity = null;
    gate.capturedAt = 0;
    return false;
  }
  if (gate.severity !== severity) {
    gate.severity = severity;
    gate.capturedAt = now;
    return true;
  }
  if (now - gate.capturedAt >= cooldownMs) {
    gate.capturedAt = now;
    return true;
  }
  return false;
}

/**
 * 1-in-N sampling for the expensive byte measurement. Unset or invalid means
 * "never measure", so the default deployment pays nothing. `1` measures every
 * write, which is appropriate for a short diagnostic window.
 */
export function shouldSampleAppStatePayloadSize(
  env: AppStateGrowthEnv = process.env,
  random: () => number = Math.random
) {
  const sample = boundedInteger(env.MAIS_APP_STATE_SIZE_SAMPLE, 0, 1);
  if (sample < 1) return false;
  if (sample === 1) return true;
  return random() < 1 / sample;
}

export function countAppStateCollections(payload: unknown): AppStateCollectionCount[] {
  if (typeof payload !== "object" || payload === null) return [];
  const counts: AppStateCollectionCount[] = [];
  for (const [collection, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value)) counts.push({ collection, rows: value.length });
  }
  return counts;
}

/**
 * Ranks collections by row count, with the known-unbounded ones preferred on a
 * tie so the report points at the collections that have no retention policy
 * rather than at a large-but-static seed table like `questions`.
 */
export function rankAppStateCollections(
  counts: readonly AppStateCollectionCount[],
  limit = 5
): AppStateCollectionCount[] {
  const unbounded = new Set<string>(unboundedAppStateCollections);
  return [...counts]
    .sort((left, right) => {
      if (right.rows !== left.rows) return right.rows - left.rows;
      const leftUnbounded = unbounded.has(left.collection) ? 0 : 1;
      const rightUnbounded = unbounded.has(right.collection) ? 0 : 1;
      if (leftUnbounded !== rightUnbounded) return leftUnbounded - rightUnbounded;
      return left.collection.localeCompare(right.collection);
    })
    .slice(0, Math.max(0, limit));
}

export function evaluateAppStateWrite({
  payload,
  durationMs,
  revision = null,
  payloadBytes = null,
  env = process.env
}: {
  payload: unknown;
  durationMs: number;
  revision?: number | null;
  payloadBytes?: number | null;
  env?: AppStateGrowthEnv;
}): AppStateGrowthObservation {
  const thresholds = readAppStateGrowthThresholds(env);
  const counts = countAppStateCollections(payload);
  const totalRows = counts.reduce((sum, entry) => sum + entry.rows, 0);
  const reasons: string[] = [];

  let severity: AppStateGrowthSeverity = "ok";
  if (typeof payloadBytes === "number" && Number.isFinite(payloadBytes)) {
    if (payloadBytes >= thresholds.criticalBytes) {
      severity = "critical";
      reasons.push(`payload ${payloadBytes} bytes >= critical ${thresholds.criticalBytes}`);
    } else if (payloadBytes >= thresholds.warnBytes) {
      severity = "warn";
      reasons.push(`payload ${payloadBytes} bytes >= warn ${thresholds.warnBytes}`);
    }
  }

  if (durationMs >= thresholds.warnDurationMs) {
    // A slow whole-row write is the symptom operators actually feel, so it
    // raises severity even when size sampling is off.
    if (severity === "ok") severity = "warn";
    reasons.push(`write took ${durationMs}ms >= warn ${thresholds.warnDurationMs}ms`);
  }

  return {
    severity,
    durationMs,
    payloadBytes: typeof payloadBytes === "number" && Number.isFinite(payloadBytes) ? payloadBytes : null,
    revision,
    totalRows,
    topCollections: rankAppStateCollections(counts),
    thresholds,
    reasons
  };
}

/**
 * Measures the payload only when sampling is enabled. Serializing a large blob
 * a second time is the whole cost of this module, so it stays behind the sample
 * gate; an unset `MAIS_APP_STATE_SIZE_SAMPLE` returns null without touching the
 * payload.
 */
export function measureAppStatePayloadBytes(
  payload: unknown,
  env: AppStateGrowthEnv = process.env,
  random: () => number = Math.random
): number | null {
  if (!shouldSampleAppStatePayloadSize(env, random)) return null;
  try {
    // Byte length, not string length: the payload is full of CJK lesson copy,
    // and `.length` would under-report it by roughly a third.
    return Buffer.byteLength(JSON.stringify(payload) ?? "", "utf8");
  } catch {
    // A payload that cannot be serialized here would have failed the write
    // itself; never let measurement be the thing that throws.
    return null;
  }
}

export function describeAppStateWrite(observation: AppStateGrowthObservation) {
  return {
    event: "app_state.write",
    severity: observation.severity,
    durationMs: observation.durationMs,
    payloadBytes: observation.payloadBytes,
    revision: observation.revision,
    totalRows: observation.totalRows,
    topCollections: observation.topCollections
      .map((entry) => `${entry.collection}=${entry.rows}`)
      .join(","),
    reasons: observation.reasons.join("; ")
  };
}

/**
 * Emits the observation. Never throws: a write must not fail because its
 * measurement did. `warn`/`critical` escalate to the error monitor so a payload
 * crossing the threshold reaches the same place other datastore problems do,
 * and `ok` stays on a debug-level log so a healthy deployment is silent.
 *
 * Dependencies are injected (the codebase's prevailing pattern) so this is
 * testable without a monitor, a console, or a database.
 */
export function reportAppStateWrite(
  observation: AppStateGrowthObservation,
  {
    capture,
    logWarning = (payload: unknown) => console.warn("app_state write", payload),
    logDebug = () => {},
    gate = processCaptureGate,
    now = Date.now(),
    cooldownMs = readAppStateCaptureCooldownMs()
  }: {
    capture?: (error: unknown, context: ErrorMonitorContext) => void;
    logWarning?: (payload: unknown) => void;
    logDebug?: (payload: unknown) => void;
    gate?: AppStateCaptureGate;
    now?: number;
    cooldownMs?: number;
  } = {}
) {
  const described = describeAppStateWrite(observation);
  try {
    if (observation.severity === "ok") {
      // Recovery is silent, but it still has to rearm the edge: without this
      // the gate would stay parked on the old severity and the NEXT escalation
      // would be throttled as though the condition had never cleared.
      shouldCaptureAppStateGrowth(observation.severity, { gate, now, cooldownMs });
      logDebug(described);
      return;
    }

    logWarning(described);
    if (!capture) return;
    // Throttled, so a persistently degraded datastore cannot spend the shared
    // error-monitor budget on identical growth warnings.
    if (!shouldCaptureAppStateGrowth(observation.severity, { gate, now, cooldownMs })) return;
    capture(
      new Error(
        `app_state payload growth is ${observation.severity}: ${observation.reasons.join("; ")}`
      ),
      {
        scope: "datastore",
        route: "userStore.writePostgresDatabase",
        kind: `app-state-growth-${observation.severity}`,
        level: observation.severity === "critical" ? "error" : "warning",
        tags: { storage: "postgres" },
        extra: {
          operation: "app_state-update",
          durationMs: observation.durationMs,
          ...(observation.payloadBytes === null ? {} : { payloadBytes: observation.payloadBytes }),
          ...(observation.revision === null ? {} : { revision: observation.revision })
        }
      }
    );
  } catch {
    /* Observation must never replace or fail the write it is describing. */
  }
}
