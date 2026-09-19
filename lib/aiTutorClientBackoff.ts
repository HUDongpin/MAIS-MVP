export const AI_TUTOR_CLIENT_MAX_RETRY_AFTER_MS = 8_000;
export const AI_TUTOR_CLIENT_MIN_RETRY_AFTER_MS = 400;
export const AI_TUTOR_STATUS_RETRY_ATTEMPTS = 2;
export const AI_TUTOR_CHAT_HTTP_429_RETRY_ATTEMPTS = 1;
export const AI_TUTOR_CLASSROOM_POLICY_TTL_MS = 20_000;
export const AI_TUTOR_CLASSROOM_POLICY_POLL_MS = 30_000;

export function isAiTutorHttpRateLimited(status: number) {
  return status === 429;
}

export function parseRetryAfterMs(
  header: string | null | undefined,
  fallbackMs = 1_000,
  maxMs = AI_TUTOR_CLIENT_MAX_RETRY_AFTER_MS
) {
  const trimmed = header?.trim();
  if (!trimmed) {
    return clampRetryMs(fallbackMs, maxMs);
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return clampRetryMs(Number(trimmed) * 1_000, maxMs);
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    return clampRetryMs(dateMs - Date.now(), maxMs);
  }

  return clampRetryMs(fallbackMs, maxMs);
}

export function nextAiTutorBackoffMs({
  attempt,
  retryAfterHeader,
  fallbackMs = 1_000
}: {
  attempt: number;
  retryAfterHeader?: string | null;
  fallbackMs?: number;
}) {
  const exponentialFallback = fallbackMs * (2 ** Math.max(0, attempt));
  return parseRetryAfterMs(retryAfterHeader, exponentialFallback);
}

export function shouldReuseClassroomPolicy({
  fetchedAtMs,
  nowMs,
  backoffUntilMs,
  ttlMs = AI_TUTOR_CLASSROOM_POLICY_TTL_MS
}: {
  fetchedAtMs: number | null;
  nowMs: number;
  backoffUntilMs?: number | null;
  ttlMs?: number;
}) {
  if (backoffUntilMs && nowMs < backoffUntilMs) return true;
  if (fetchedAtMs === null) return false;
  return nowMs - fetchedAtMs < ttlMs;
}

function clampRetryMs(value: number, maxMs: number) {
  if (!Number.isFinite(value)) return AI_TUTOR_CLIENT_MIN_RETRY_AFTER_MS;
  return Math.min(maxMs, Math.max(AI_TUTOR_CLIENT_MIN_RETRY_AFTER_MS, Math.round(value)));
}

export function waitForAiTutorRetry(ms: number, signal?: AbortSignal) {
  const delayMs = clampRetryMs(ms, AI_TUTOR_CLIENT_MAX_RETRY_AFTER_MS);
  if (!signal) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
