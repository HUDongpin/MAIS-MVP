import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { TeacherNoticeOperationalSnapshot } from
  "@/lib/server/userStore/teacherNoticeOperationalReadModel";
import { createTeacherNoticeOperationalHealthHandler } from "./handler";

const validSecret = "fixture-health-secret-with-at-least-32-bytes";
const distinctCronSecret = "fixture-worker-secret-with-at-least-32-bytes";
const request = (authorization?: string) => new Request(
  "https://mais.example/api/health/teacher-notices",
  { headers: authorization ? { authorization } : undefined }
);

test("teacher-notice health route exposes only a dynamic Node GET endpoint", async () => {
  const route = await import("./route");
  assert.deepEqual(Object.keys(route).sort(), ["GET", "dynamic", "runtime"]);
  assert.equal(route.runtime, "nodejs");
  assert.equal(route.dynamic, "force-dynamic");
});

test("teacher-notice health route authenticates only with its dedicated health-check secret", async () => {
  const routeRoot = path.join(process.cwd(), "app", "api", "health", "teacher-notices");
  const source = await readFile(path.join(routeRoot, "route.ts"), "utf8");
  const handlerSource = await readFile(path.join(routeRoot, "handler.ts"), "utf8");

  assert.match(source, /process\.env\.TEACHER_NOTICE_HEALTH_SECRET/u);
  assert.match(source, /readCronSecret:\s*\(\)\s*=>\s*process\.env\.CRON_SECRET/u);
  assert.match(handlerSource, /healthSecret\s*===\s*cronSecret/u);
  assert.doesNotMatch(
    handlerSource,
    /authorizeCronBearer\([\s\S]{0,120}cronSecret/u,
    "CRON_SECRET must never authenticate the health endpoint"
  );
});

test("teacher-notice health fails closed before reading operations for invalid config or credentials", async () => {
  let reads = 0;
  const readSnapshot = async () => {
    reads += 1;
    throw new Error("must not run");
  };

  const unavailable = createTeacherNoticeOperationalHealthHandler({
    readCronSecret: () => distinctCronSecret,
    readHealthSecret: () => "short",
    readSnapshot
  });
  const unavailableResponse = await unavailable(request(`Bearer ${validSecret}`));
  assert.equal(unavailableResponse.status, 503);
  assert.equal(unavailableResponse.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.deepEqual(await unavailableResponse.json(), { status: "unavailable" });

  const unauthorized = createTeacherNoticeOperationalHealthHandler({
    readCronSecret: () => distinctCronSecret,
    readHealthSecret: () => validSecret,
    readSnapshot
  });
  const unauthorizedResponse = await unauthorized(request("Bearer wrong-fixture-secret-with-at-least-32-bytes"));
  assert.equal(unauthorizedResponse.status, 401);
  assert.deepEqual(await unauthorizedResponse.json(), { status: "unauthorized" });
  assert.equal(reads, 0);

  const reusedSecret = createTeacherNoticeOperationalHealthHandler({
    readCronSecret: () => validSecret,
    readHealthSecret: () => validSecret,
    readSnapshot
  });
  const reusedResponse = await reusedSecret(request(`Bearer ${validSecret}`));
  assert.equal(reusedResponse.status, 503);
  assert.deepEqual(await reusedResponse.json(), { status: "unavailable" });
  assert.equal(reads, 0);
  assert.doesNotMatch(
    JSON.stringify(await unavailable(request()).then((response) => response.json())),
    new RegExp(validSecret, "u")
  );
});

test("teacher-notice health returns 200 only for a fresh matching durable scheduler heartbeat", async () => {
  const healthySnapshot: TeacherNoticeOperationalSnapshot & {
    outbox: TeacherNoticeOperationalSnapshot["outbox"] & { email: string };
    rawError: string;
  } = {
    observedAt: "2026-08-24T12:00:00.000Z",
    scheduler: {
      candidateMatch: true,
      heartbeatAgeSeconds: 60,
      heartbeatStatus: "succeeded",
      lastFailureAgeSeconds: null
    },
    outbox: {
      actionableCount: 0,
      counts: {
        blocked: 0,
        deadLetter: 0,
        leased: 0,
        pending: 0,
        providerAccepted: 2,
        retryable: 0
      },
      oldestActionableAgeSeconds: null,
      recentTerminalCounts: { blocked: 0, deadLetter: 0 },
      staleLeaseCount: 0,
      email: "must-not-escape@example.test"
    },
    providerEvents: {
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
    },
    rawError: "postgres://secret@host/database",
    webhookReconciliation: {
      oldestUnmatchedAgeSeconds: null,
      unmatchedCount: 0
    }
  };
  const healthyHandler = createTeacherNoticeOperationalHealthHandler({
    readCronSecret: () => distinctCronSecret,
    readHealthSecret: () => validSecret,
    readSnapshot: async () => healthySnapshot as never
  });

  const healthyResponse = await healthyHandler(request(`Bearer ${validSecret}`));
  const healthyBody = await healthyResponse.json();
  assert.equal(healthyResponse.status, 200);
  assert.equal(healthyBody.health.status, "healthy");
  assert.deepEqual(healthyBody.health.reasons, []);
  assert.deepEqual(healthyBody.health.scheduler, healthySnapshot.scheduler);
  assert.doesNotMatch(
    JSON.stringify(healthyBody),
    /must-not-escape|postgres:\/\/|"(?:email|rawError|recipientId|studentId|providerMessageId|body|secret)"/iu
  );

  const staleSnapshot = structuredClone(healthySnapshot);
  staleSnapshot.outbox.counts.pending = 1;
  staleSnapshot.outbox.actionableCount = 1;
  staleSnapshot.outbox.oldestActionableAgeSeconds = 901;
  const staleHandler = createTeacherNoticeOperationalHealthHandler({
    readCronSecret: () => distinctCronSecret,
    readHealthSecret: () => validSecret,
    readSnapshot: async () => staleSnapshot as never
  });
  const staleResponse = await staleHandler(request(`Bearer ${validSecret}`));
  const staleBody = await staleResponse.json();
  assert.equal(staleResponse.status, 503);
  assert.equal(staleBody.health.status, "unhealthy");
  assert.deepEqual(staleBody.health.reasons, [
    "outbox-actionable-stale"
  ]);
});

test("teacher-notice health converts persistence or aggregate validation failures to an opaque 503", async () => {
  for (const readSnapshot of [
    async () => {
      throw new Error("postgres://user:secret@host/database raw provider failure");
    },
    async () => ({
      observedAt: "not-a-timestamp",
      outbox: {},
      providerEvents: {},
      rawError: "must-not-escape",
      webhookReconciliation: {}
    } as never)
  ]) {
    const handler = createTeacherNoticeOperationalHealthHandler({
      readCronSecret: () => distinctCronSecret,
      readHealthSecret: () => validSecret,
      readSnapshot
    });
    const response = await handler(request(`Bearer ${validSecret}`));
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.deepEqual(body, { status: "unavailable" });
    assert.doesNotMatch(JSON.stringify(body), /postgres|secret|provider|raw|database/iu);
  }
});
