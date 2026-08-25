import type { LrsDeliveryResult, LrsOutboxItem } from "@/lib/server/lrsClient";
import type { LearningAnalyticsEvent } from "@/types";

export type LearningEventLrsDeliveryUpdate = {
  eventId: string;
  status: "disabled" | "queued" | "sent";
  attempts: number;
  statementId?: string;
  queuedAt?: string;
  nextRetryAt?: string;
  reason?: LrsOutboxItem["reason"];
  httpStatus?: number;
};

export type StoredLearningEventLrsDelivery = {
  status: "disabled" | "pending" | "queued" | "sent";
  attempts: number;
  statement_id?: string;
  queued_at: string;
  next_retry_at?: string;
  reason?: LrsOutboxItem["reason"];
  http_status?: number;
  updated_at: string;
};

export function learningEventLrsDeliveryTransitionAllowed(
  currentStatus: StoredLearningEventLrsDelivery["status"],
  nextStatus: LearningEventLrsDeliveryUpdate["status"]
) {
  if (currentStatus === "sent") return nextStatus === "sent";
  if (currentStatus === "queued") return nextStatus === "queued" || nextStatus === "sent";
  return true;
}

export function pendingLearningEventLrsDelivery(now: string): StoredLearningEventLrsDelivery {
  return {
    status: "pending",
    attempts: 0,
    queued_at: now,
    updated_at: now
  };
}

export function learningEventLrsDeliveryUpdates(
  events: LearningAnalyticsEvent[],
  result: LrsDeliveryResult
): LearningEventLrsDeliveryUpdate[] {
  if (result.status === "disabled") {
    return events.map((event) => ({
      eventId: event.id,
      status: "disabled",
      attempts: 0
    }));
  }

  const queuedByEventId = new Map(result.outbox.map((item) => [item.eventId, item]));
  return events.map((event) => {
    const queued = queuedByEventId.get(event.id);
    if (!queued) {
      return {
        eventId: event.id,
        status: "sent",
        attempts: 1
      };
    }
    return {
      eventId: event.id,
      status: "queued",
      statementId: queued.statementId,
      attempts: queued.attempts,
      queuedAt: queued.queuedAt,
      nextRetryAt: queued.nextRetryAt,
      reason: queued.reason,
      ...(typeof queued.httpStatus === "number" ? { httpStatus: queued.httpStatus } : {})
    };
  });
}

export function storedLearningEventLrsDelivery(
  update: LearningEventLrsDeliveryUpdate,
  now: string
): StoredLearningEventLrsDelivery {
  return {
    status: update.status,
    attempts: update.attempts,
    ...(update.statementId ? { statement_id: update.statementId } : {}),
    queued_at: update.queuedAt ?? now,
    ...(update.nextRetryAt ? { next_retry_at: update.nextRetryAt } : {}),
    ...(update.reason ? { reason: update.reason } : {}),
    ...(typeof update.httpStatus === "number" ? { http_status: update.httpStatus } : {}),
    updated_at: now
  };
}

export function mergeStoredLearningEventLrsDelivery(
  current: StoredLearningEventLrsDelivery | undefined,
  update: LearningEventLrsDeliveryUpdate,
  now: string
): StoredLearningEventLrsDelivery | null {
  if (!current) return storedLearningEventLrsDelivery(update, now);
  if (!learningEventLrsDeliveryTransitionAllowed(current.status, update.status)) return null;

  const isNetworkAttempt = update.status === "queued" || update.status === "sent";
  const followsNetworkAttempt = current.status === "queued" || current.status === "sent";
  const attempts = isNetworkAttempt && followsNetworkAttempt
    ? current.attempts + update.attempts
    : Math.max(current.attempts, update.attempts);
  const statementId = update.statementId ?? current.statement_id;
  const queuedAt = update.queuedAt ?? current.queued_at ?? now;

  return {
    status: update.status,
    attempts,
    ...(statementId ? { statement_id: statementId } : {}),
    queued_at: queuedAt,
    ...(update.status === "queued" && update.nextRetryAt
      ? { next_retry_at: update.nextRetryAt }
      : {}),
    ...(update.status === "queued" && update.reason ? { reason: update.reason } : {}),
    ...(update.status === "queued" && typeof update.httpStatus === "number"
      ? { http_status: update.httpStatus }
      : {}),
    updated_at: now
  };
}
