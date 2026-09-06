import type { TeacherNoticeOperationalSnapshot } from
  "./userStore/teacherNoticeOperationalReadModel";

export const teacherNoticeOperationalHealthPolicy = Object.freeze({
  maxActionableAgeSeconds: 15 * 60,
  maxHeartbeatAgeSeconds: 15 * 60,
  recentFailureWindowSeconds: 15 * 60,
  maxUnmatchedAgeSeconds: 15 * 60
});

export type TeacherNoticeOperationalHealthReason =
  | "outbox-actionable-stale"
  | "outbox-stale-lease"
  | "outbox-terminal-recent"
  | "provider-adverse-events"
  | "webhook-reconciliation-stale"
  | "scheduler-heartbeat-missing"
  | "scheduler-heartbeat-incomplete"
  | "scheduler-heartbeat-failed"
  | "scheduler-heartbeat-stale"
  | "scheduler-release-mismatch";

export type TeacherNoticeOperationalHealth = TeacherNoticeOperationalSnapshot & {
  reasons: TeacherNoticeOperationalHealthReason[];
  status: "healthy" | "unhealthy";
};

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function validateOperationalSnapshot(snapshot: TeacherNoticeOperationalSnapshot): void {
  if (!isCanonicalTimestamp(snapshot.observedAt)) {
    throw new Error("Teacher notice operational snapshot is invalid.");
  }
  const counts = [
    ...Object.values(snapshot.outbox.counts),
    snapshot.outbox.actionableCount,
    ...Object.values(snapshot.outbox.recentTerminalCounts),
    snapshot.outbox.staleLeaseCount,
    ...Object.values(snapshot.providerEvents.counts),
    snapshot.providerEvents.windowSeconds,
    snapshot.webhookReconciliation.unmatchedCount
  ];
  const ages = [
    snapshot.outbox.oldestActionableAgeSeconds,
    snapshot.scheduler.heartbeatAgeSeconds,
    snapshot.scheduler.lastFailureAgeSeconds,
    snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds
  ];
  const schedulerStatus = snapshot.scheduler.heartbeatStatus;
  const schedulerStatusIsValid = ["missing", "started", "succeeded", "failed"]
    .includes(schedulerStatus);
  const schedulerHasAge = snapshot.scheduler.heartbeatAgeSeconds !== null;
  if (
    counts.some((value) => !isNonNegativeSafeInteger(value)) ||
    !isNonNegativeSafeInteger(snapshot.providerEvents.windowSeconds) ||
    snapshot.providerEvents.windowSeconds === 0 ||
    ages.some((value) => value !== null && !isNonNegativeSafeInteger(value)) ||
    snapshot.outbox.recentTerminalCounts.blocked > snapshot.outbox.counts.blocked ||
    snapshot.outbox.recentTerminalCounts.deadLetter > snapshot.outbox.counts.deadLetter ||
    snapshot.outbox.staleLeaseCount > snapshot.outbox.counts.leased ||
    snapshot.outbox.actionableCount >
      snapshot.outbox.counts.pending + snapshot.outbox.counts.retryable ||
    typeof snapshot.scheduler.candidateMatch !== "boolean" ||
    !schedulerStatusIsValid ||
    (schedulerStatus === "missing") !== !schedulerHasAge ||
    (schedulerStatus === "missing" && (
      snapshot.scheduler.candidateMatch ||
      snapshot.scheduler.lastFailureAgeSeconds !== null
    )) ||
    (schedulerStatus === "failed" && snapshot.scheduler.lastFailureAgeSeconds === null) ||
    (
      snapshot.scheduler.heartbeatAgeSeconds !== null &&
      snapshot.scheduler.lastFailureAgeSeconds !== null &&
      snapshot.scheduler.lastFailureAgeSeconds < snapshot.scheduler.heartbeatAgeSeconds
    )
  ) {
    throw new Error("Teacher notice operational snapshot is invalid.");
  }

  const hasActionableAge = snapshot.outbox.oldestActionableAgeSeconds !== null;
  const hasUnmatchedAge = snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds !== null;
  const providerEventCount = Object.values(snapshot.providerEvents.counts)
    .reduce((sum, count) => sum + count, 0);
  const hasLatestProviderEvent = snapshot.providerEvents.latestReceivedAt !== null;
  if (
    (snapshot.outbox.actionableCount > 0) !== hasActionableAge ||
    (snapshot.webhookReconciliation.unmatchedCount > 0) !== hasUnmatchedAge ||
    (providerEventCount > 0) !== hasLatestProviderEvent ||
    (
      snapshot.providerEvents.latestReceivedAt !== null &&
      !isCanonicalTimestamp(snapshot.providerEvents.latestReceivedAt)
    )
  ) {
    throw new Error("Teacher notice operational snapshot is invalid.");
  }
}

export function evaluateTeacherNoticeOperationalHealth(
  snapshot: TeacherNoticeOperationalSnapshot
): TeacherNoticeOperationalHealth {
  validateOperationalSnapshot(snapshot);
  const reasons: TeacherNoticeOperationalHealthReason[] = [];
  if (
    snapshot.outbox.oldestActionableAgeSeconds !== null &&
    snapshot.outbox.oldestActionableAgeSeconds >
      teacherNoticeOperationalHealthPolicy.maxActionableAgeSeconds
  ) {
    reasons.push("outbox-actionable-stale");
  }
  if (snapshot.outbox.staleLeaseCount > 0) {
    reasons.push("outbox-stale-lease");
  }
  if (
    snapshot.outbox.recentTerminalCounts.blocked > 0 ||
    snapshot.outbox.recentTerminalCounts.deadLetter > 0
  ) {
    reasons.push("outbox-terminal-recent");
  }
  const providerCounts = snapshot.providerEvents.counts;
  if (
    providerCounts.bounced > 0 ||
    providerCounts.complained > 0 ||
    providerCounts.deliveryDelayed > 0 ||
    providerCounts.failed > 0 ||
    providerCounts.suppressed > 0
  ) {
    reasons.push("provider-adverse-events");
  }
  if (
    snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds !== null &&
    snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds >
      teacherNoticeOperationalHealthPolicy.maxUnmatchedAgeSeconds
  ) {
    reasons.push("webhook-reconciliation-stale");
  }
  if (snapshot.scheduler.heartbeatStatus === "missing") {
    reasons.push("scheduler-heartbeat-missing");
  } else if (snapshot.scheduler.heartbeatStatus === "started") {
    reasons.push("scheduler-heartbeat-incomplete");
  } else if (
    snapshot.scheduler.heartbeatStatus === "failed" ||
    (
      snapshot.scheduler.lastFailureAgeSeconds !== null &&
      snapshot.scheduler.lastFailureAgeSeconds <=
        teacherNoticeOperationalHealthPolicy.recentFailureWindowSeconds
    )
  ) {
    reasons.push("scheduler-heartbeat-failed");
  }
  if (
    snapshot.scheduler.heartbeatAgeSeconds !== null &&
    snapshot.scheduler.heartbeatAgeSeconds >
      teacherNoticeOperationalHealthPolicy.maxHeartbeatAgeSeconds
  ) {
    reasons.push("scheduler-heartbeat-stale");
  }
  if (
    snapshot.scheduler.heartbeatStatus !== "missing" &&
    !snapshot.scheduler.candidateMatch
  ) {
    reasons.push("scheduler-release-mismatch");
  }

  return {
    observedAt: snapshot.observedAt,
    outbox: {
      actionableCount: snapshot.outbox.actionableCount,
      counts: {
        blocked: snapshot.outbox.counts.blocked,
        deadLetter: snapshot.outbox.counts.deadLetter,
        leased: snapshot.outbox.counts.leased,
        pending: snapshot.outbox.counts.pending,
        providerAccepted: snapshot.outbox.counts.providerAccepted,
        retryable: snapshot.outbox.counts.retryable
      },
      oldestActionableAgeSeconds: snapshot.outbox.oldestActionableAgeSeconds,
      recentTerminalCounts: {
        blocked: snapshot.outbox.recentTerminalCounts.blocked,
        deadLetter: snapshot.outbox.recentTerminalCounts.deadLetter
      },
      staleLeaseCount: snapshot.outbox.staleLeaseCount
    },
    providerEvents: {
      counts: {
        bounced: snapshot.providerEvents.counts.bounced,
        complained: snapshot.providerEvents.counts.complained,
        delivered: snapshot.providerEvents.counts.delivered,
        deliveryDelayed: snapshot.providerEvents.counts.deliveryDelayed,
        failed: snapshot.providerEvents.counts.failed,
        sent: snapshot.providerEvents.counts.sent,
        suppressed: snapshot.providerEvents.counts.suppressed
      },
      latestReceivedAt: snapshot.providerEvents.latestReceivedAt,
      windowSeconds: snapshot.providerEvents.windowSeconds
    },
    reasons,
    scheduler: {
      candidateMatch: snapshot.scheduler.candidateMatch,
      heartbeatAgeSeconds: snapshot.scheduler.heartbeatAgeSeconds,
      heartbeatStatus: snapshot.scheduler.heartbeatStatus,
      lastFailureAgeSeconds: snapshot.scheduler.lastFailureAgeSeconds
    },
    status: reasons.length === 0 ? "healthy" : "unhealthy",
    webhookReconciliation: {
      oldestUnmatchedAgeSeconds: snapshot.webhookReconciliation.oldestUnmatchedAgeSeconds,
      unmatchedCount: snapshot.webhookReconciliation.unmatchedCount
    }
  };
}
