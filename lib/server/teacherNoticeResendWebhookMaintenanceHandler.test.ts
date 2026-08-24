import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { createTeacherNoticeResendWebhookMaintenanceHandler } from
  "./teacherNoticeResendWebhookMaintenanceHandler";

const secret = "fixture-cron-secret-with-at-least-32-bytes";
const result = {
  reconciledProviders: 2,
  eventsMatched: 3,
  statesUpserted: 2,
  eventsDeleted: 4,
  statesDeleted: 1,
  hasMoreReconciliation: false,
  hasMoreRetention: true
};

function request(authorization?: string) {
  return new Request("https://mais.example/api/cron/teacher-notice-resend-webhook-maintenance", {
    headers: authorization ? { authorization } : undefined
  });
}

test("maintenance cron requires a configured exact bearer secret before mutation", async () => {
  let calls = 0;
  const missingConfiguration = createTeacherNoticeResendWebhookMaintenanceHandler({
    env: {},
    maintain: async () => {
      calls += 1;
      return result;
    }
  });
  assert.equal((await missingConfiguration(request())).status, 503);

  for (const invalidSecret of [
    "short-secret",
    ` ${secret}`,
    `${secret} `,
    `fixture-cron-secret-with-tab\tand-32-bytes`,
    `fixture-cron-secret-with-null\u0000and-32-bytes`,
    "x".repeat(513)
  ]) {
    const invalidConfiguration = createTeacherNoticeResendWebhookMaintenanceHandler({
      env: { CRON_SECRET: invalidSecret },
      maintain: async () => {
        calls += 1;
        return result;
      }
    });
    const response = await invalidConfiguration(request(`Bearer ${secret}`));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Service temporarily unavailable." });
  }

  const handler = createTeacherNoticeResendWebhookMaintenanceHandler({
    env: { CRON_SECRET: secret },
    maintain: async () => {
      calls += 1;
      return result;
    }
  });
  for (const authorization of [
    undefined,
    "Bearer wrong",
    `bearer ${secret}`,
    `${secret}`,
    `Bearer  ${secret}`
  ]) {
    const response = await handler(request(authorization));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(calls, 0);

  const source = readFileSync(
    path.join(process.cwd(), "lib/server/teacherNoticeResendWebhookMaintenanceHandler.ts"),
    "utf8"
  );
  assert.match(source, /authorizeCronBearer/u);
});

test("authorized maintenance is bounded and returns only privacy-safe aggregate counts", async () => {
  const calls: unknown[] = [];
  const monotonicNow = () => 1_000;
  const handler = createTeacherNoticeResendWebhookMaintenanceHandler({
    env: { CRON_SECRET: secret },
    monotonicNow,
    maintain: async (options) => {
      calls.push(options);
      return {
        ...result,
        provider_message_id: "provider-private",
        email: "family@example.invalid",
        recipient: "guardian-private",
        diagnostics: { outboxId: "outbox-private", eventId: "event-private" }
      } as typeof result;
    }
  });
  const response = await handler(request(`Bearer ${secret}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { ok: true, maintenance: result });
  assert.deepEqual(calls, [{
    reconciliationLimit: 100,
    retentionLimit: 100,
    deadlineAt: 21_000,
    monotonicNow
  }]);
  assert.doesNotMatch(JSON.stringify(await handler(request(`Bearer ${secret}`)).then((item) => item.json())),
    /provider_message|event_id|outbox|email|recipient/iu);
});

test("maintenance rejects malformed aggregate values instead of serializing them", async () => {
  const malformed = [
    { ...result, eventsMatched: -1 },
    { ...result, eventsMatched: Number.NaN },
    { ...result, eventsMatched: 1.5 },
    { ...result, eventsMatched: "1" },
    { ...result, hasMoreReconciliation: 1 },
    { ...result, hasMoreRetention: "false" }
  ];
  for (const maintenance of malformed) {
    const handler = createTeacherNoticeResendWebhookMaintenanceHandler({
      env: { CRON_SECRET: secret },
      maintain: async () => maintenance as typeof result
    });
    const response = await handler(request(`Bearer ${secret}`));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { error: "Service temporarily unavailable." });
  }
});

test("authorized maintenance failures are generic and remain no-store", async () => {
  const handler = createTeacherNoticeResendWebhookMaintenanceHandler({
    env: { CRON_SECRET: secret },
    maintain: async () => {
      throw new Error("private database and identifier detail");
    }
  });
  const response = await handler(request(`Bearer ${secret}`));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { error: "Service temporarily unavailable." });
});
