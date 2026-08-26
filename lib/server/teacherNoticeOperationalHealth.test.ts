import assert from "node:assert/strict";
import test from "node:test";

import { evaluateTeacherNoticeOperationalHealth } from
  "./teacherNoticeOperationalHealth";
import type { TeacherNoticeOperationalSnapshot } from
  "./userStore/teacherNoticeOperationalReadModel";

const unhealthySnapshot: TeacherNoticeOperationalSnapshot = {
  observedAt: "2026-08-24T12:00:00.000Z",
  scheduler: {
    candidateMatch: true,
    heartbeatAgeSeconds: 60,
    heartbeatStatus: "succeeded",
    lastFailureAgeSeconds: null
  },
  outbox: {
    actionableCount: 4,
    counts: {
      blocked: 2,
      deadLetter: 1,
      leased: 1,
      pending: 3,
      providerAccepted: 5,
      retryable: 1
    },
    oldestActionableAgeSeconds: 901,
    recentTerminalCounts: { blocked: 1, deadLetter: 1 },
    staleLeaseCount: 1
  },
  providerEvents: {
    counts: {
      bounced: 1,
      complained: 0,
      delivered: 4,
      deliveryDelayed: 1,
      failed: 0,
      sent: 5,
      suppressed: 0
    },
    latestReceivedAt: "2026-08-24T11:59:00.000Z",
    windowSeconds: 3_600
  },
  webhookReconciliation: {
    oldestUnmatchedAgeSeconds: 901,
    unmatchedCount: 2
  }
};

test("operational health reports stable aggregate-only unhealthy reasons", () => {
  const health = evaluateTeacherNoticeOperationalHealth(unhealthySnapshot);

  assert.equal(health.status, "unhealthy");
  assert.deepEqual(health.reasons, [
    "outbox-actionable-stale",
    "outbox-stale-lease",
    "outbox-terminal-recent",
    "provider-adverse-events",
    "webhook-reconciliation-stale"
  ]);
  assert.deepEqual(health.scheduler, unhealthySnapshot.scheduler);
  assert.deepEqual(health.outbox, unhealthySnapshot.outbox);
  assert.deepEqual(health.providerEvents, unhealthySnapshot.providerEvents);
  assert.deepEqual(health.webhookReconciliation, unhealthySnapshot.webhookReconciliation);
  assert.doesNotMatch(
    JSON.stringify(health),
    /email|recipient|student|provider_message|outbox_id|body|raw|error|secret/iu
  );
});

test("operational health rebuilds every nested DTO and never claims scheduler health without a durable heartbeat", () => {
  const injected = structuredClone(unhealthySnapshot) as TeacherNoticeOperationalSnapshot & {
    outbox: TeacherNoticeOperationalSnapshot["outbox"] & {
      counts: TeacherNoticeOperationalSnapshot["outbox"]["counts"] & { guardianId: number };
      recentTerminalCounts: TeacherNoticeOperationalSnapshot["outbox"]["recentTerminalCounts"] & {
        recipientId: number;
      };
    };
    providerEvents: TeacherNoticeOperationalSnapshot["providerEvents"] & {
      counts: TeacherNoticeOperationalSnapshot["providerEvents"]["counts"] & {
        providerMessageId: number;
      };
    };
    webhookReconciliation: TeacherNoticeOperationalSnapshot["webhookReconciliation"] & {
      studentId: number;
    };
    scheduler: TeacherNoticeOperationalSnapshot["scheduler"] & { releaseSha: string };
  };
  injected.outbox.counts.guardianId = 41;
  injected.outbox.recentTerminalCounts.recipientId = 42;
  injected.providerEvents.counts.providerMessageId = 43;
  injected.webhookReconciliation.studentId = 44;
  injected.scheduler.releaseSha = "a".repeat(40);

  const health = evaluateTeacherNoticeOperationalHealth(injected);
  assert.equal(health.status, "unhealthy");
  assert.deepEqual(Object.keys(health.outbox.counts).sort(), [
    "blocked",
    "deadLetter",
    "leased",
    "pending",
    "providerAccepted",
    "retryable"
  ]);
  assert.deepEqual(Object.keys(health.outbox.recentTerminalCounts).sort(), ["blocked", "deadLetter"]);
  assert.deepEqual(Object.keys(health.providerEvents.counts).sort(), [
    "bounced",
    "complained",
    "delivered",
    "deliveryDelayed",
    "failed",
    "sent",
    "suppressed"
  ]);
  assert.deepEqual(Object.keys(health.webhookReconciliation).sort(), [
    "oldestUnmatchedAgeSeconds",
    "unmatchedCount"
  ]);
  assert.deepEqual(Object.keys(health.scheduler).sort(), [
    "candidateMatch",
    "heartbeatAgeSeconds",
    "heartbeatStatus",
    "lastFailureAgeSeconds"
  ]);
  assert.doesNotMatch(
    JSON.stringify(health),
    /guardianId|recipientId|providerMessageId|releaseSha|studentId/u
  );
});

test("operational health fails closed on invalid aggregate data", () => {
  const invalid = structuredClone(unhealthySnapshot);
  invalid.outbox.counts.pending = -1;

  assert.throws(
    () => evaluateTeacherNoticeOperationalHealth(invalid),
    /invalid/u
  );

  const contradictory = structuredClone(unhealthySnapshot);
  contradictory.outbox.counts.pending = 0;
  contradictory.outbox.counts.retryable = 0;
  contradictory.outbox.actionableCount = 1;
  assert.throws(
    () => evaluateTeacherNoticeOperationalHealth(contradictory),
    /invalid/u
  );
});

test("operational health allows future-scheduled queued rows only when actionable age stays null", () => {
  const scheduled = structuredClone(unhealthySnapshot);
  scheduled.outbox = {
    actionableCount: 0,
    counts: {
      blocked: 0,
      deadLetter: 0,
      leased: 0,
      pending: 1,
      providerAccepted: 0,
      retryable: 1
    },
    oldestActionableAgeSeconds: null,
    recentTerminalCounts: { blocked: 0, deadLetter: 0 },
    staleLeaseCount: 0
  };
  scheduled.providerEvents = {
    counts: {
      bounced: 0,
      complained: 0,
      delivered: 0,
      deliveryDelayed: 0,
      failed: 0,
      sent: 0,
      suppressed: 0
    },
    latestReceivedAt: null,
    windowSeconds: 3_600
  };
  scheduled.webhookReconciliation = {
    oldestUnmatchedAgeSeconds: null,
    unmatchedCount: 0
  };

  const health = evaluateTeacherNoticeOperationalHealth(scheduled);
  assert.equal(health.status, "healthy");
  assert.equal(health.outbox.actionableCount, 0);
  assert.equal(health.outbox.counts.pending + health.outbox.counts.retryable, 2);
  assert.equal(health.outbox.oldestActionableAgeSeconds, null);
  assert.deepEqual(health.reasons, []);
});

test("operational health fails closed for missing, incomplete, failed, stale, or wrong-release heartbeat", () => {
  const clean = structuredClone(unhealthySnapshot);
  clean.outbox = {
    actionableCount: 0,
    counts: {
      blocked: 0,
      deadLetter: 0,
      leased: 0,
      pending: 0,
      providerAccepted: 0,
      retryable: 0
    },
    oldestActionableAgeSeconds: null,
    recentTerminalCounts: { blocked: 0, deadLetter: 0 },
    staleLeaseCount: 0
  };
  clean.providerEvents = {
    counts: {
      bounced: 0,
      complained: 0,
      delivered: 0,
      deliveryDelayed: 0,
      failed: 0,
      sent: 0,
      suppressed: 0
    },
    latestReceivedAt: null,
    windowSeconds: 3_600
  };
  clean.webhookReconciliation = {
    oldestUnmatchedAgeSeconds: null,
    unmatchedCount: 0
  };

  for (const [scheduler, reasons] of [
    [
      {
        candidateMatch: false,
        heartbeatAgeSeconds: null,
        heartbeatStatus: "missing",
        lastFailureAgeSeconds: null
      },
      ["scheduler-heartbeat-missing"]
    ],
    [
      {
        candidateMatch: true,
        heartbeatAgeSeconds: 10,
        heartbeatStatus: "started",
        lastFailureAgeSeconds: null
      },
      ["scheduler-heartbeat-incomplete"]
    ],
    [
      {
        candidateMatch: true,
        heartbeatAgeSeconds: 10,
        heartbeatStatus: "failed",
        lastFailureAgeSeconds: 10
      },
      ["scheduler-heartbeat-failed"]
    ],
    [
      {
        candidateMatch: true,
        heartbeatAgeSeconds: 901,
        heartbeatStatus: "succeeded",
        lastFailureAgeSeconds: null
      },
      ["scheduler-heartbeat-stale"]
    ],
    [
      {
        candidateMatch: false,
        heartbeatAgeSeconds: 10,
        heartbeatStatus: "succeeded",
        lastFailureAgeSeconds: null
      },
      ["scheduler-release-mismatch"]
    ]
  ] as const) {
    const snapshot = structuredClone(clean);
    snapshot.scheduler = scheduler;
    const health = evaluateTeacherNoticeOperationalHealth(snapshot);
    assert.equal(health.status, "unhealthy");
    assert.deepEqual(health.reasons, reasons);
  }
});

test("a recent durable scheduler failure survives a newer success and recovers after the bounded window", () => {
  const successfulAfterFailure = structuredClone(unhealthySnapshot);
  successfulAfterFailure.outbox = {
    actionableCount: 0,
    counts: {
      blocked: 0,
      deadLetter: 0,
      leased: 0,
      pending: 0,
      providerAccepted: 0,
      retryable: 0
    },
    oldestActionableAgeSeconds: null,
    recentTerminalCounts: { blocked: 0, deadLetter: 0 },
    staleLeaseCount: 0
  };
  successfulAfterFailure.providerEvents = {
    counts: {
      bounced: 0,
      complained: 0,
      delivered: 0,
      deliveryDelayed: 0,
      failed: 0,
      sent: 0,
      suppressed: 0
    },
    latestReceivedAt: null,
    windowSeconds: 3_600
  };
  successfulAfterFailure.webhookReconciliation = {
    oldestUnmatchedAgeSeconds: null,
    unmatchedCount: 0
  };
  successfulAfterFailure.scheduler = {
    candidateMatch: true,
    heartbeatAgeSeconds: 30,
    heartbeatStatus: "succeeded",
    lastFailureAgeSeconds: 15 * 60
  } as never;

  const stillUnhealthy = evaluateTeacherNoticeOperationalHealth(successfulAfterFailure);
  assert.equal(stillUnhealthy.status, "unhealthy");
  assert.deepEqual(stillUnhealthy.reasons, ["scheduler-heartbeat-failed"]);
  assert.deepEqual(stillUnhealthy.scheduler, {
    candidateMatch: true,
    heartbeatAgeSeconds: 30,
    heartbeatStatus: "succeeded",
    lastFailureAgeSeconds: 15 * 60
  });

  const recovered = structuredClone(successfulAfterFailure);
  recovered.scheduler.lastFailureAgeSeconds = 15 * 60 + 1;
  const recoveredHealth = evaluateTeacherNoticeOperationalHealth(recovered);
  assert.equal(recoveredHealth.status, "healthy");
  assert.deepEqual(recoveredHealth.reasons, []);
});
