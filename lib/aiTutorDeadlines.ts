export const AI_TUTOR_DEFAULT_TOTAL_DEADLINE_MS = 12_000;
export const AI_TUTOR_MAX_TOTAL_DEADLINE_MS = 15_000;
export const AI_TUTOR_DEFAULT_EDGE_RESPONSE_RESERVE_MS = 500;
export const AI_TUTOR_MAX_EDGE_RESPONSE_RESERVE_MS = 5_000;

function boundedDeadlineNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function resolveAITutorTotalDeadlineMs(value: string | undefined) {
  return boundedDeadlineNumber(
    value,
    AI_TUTOR_DEFAULT_TOTAL_DEADLINE_MS,
    2_000,
    AI_TUTOR_MAX_TOTAL_DEADLINE_MS
  );
}

export function resolveAITutorEdgeDeadlineMs(totalDeadlineMs: number, value: string | undefined) {
  const requestedReserve = boundedDeadlineNumber(
    value,
    AI_TUTOR_DEFAULT_EDGE_RESPONSE_RESERVE_MS,
    0,
    AI_TUTOR_MAX_EDGE_RESPONSE_RESERVE_MS
  );
  // A large reserve used to starve the live provider call (for example 7500ms
  // total minus 3500ms reserve left only 4s). Cap the reserve so a single-user
  // Nova question still has most of the deadline for admission + Qwen.
  const maxReserve = Math.max(250, Math.min(1_000, Math.floor(totalDeadlineMs * 0.2)));
  const reserveMs = Math.min(requestedReserve, maxReserve);
  return Math.max(1_000, totalDeadlineMs - reserveMs);
}
