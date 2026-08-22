import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  isDurableLearningAnalyticsDeliveryResponse,
  isLearningAnalyticsClearAcknowledgement,
  readLearningAnalyticsGenerationMismatchReceipt
} from "@/lib/learningAnalytics";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

const execFileAsync = promisify(execFile);

test("a durable clear generation rejects stale lineage independently of the client event clock", async () => {
  const trackedEnv = [
    "AUTH_SESSION_SECRET",
    "HK_MATH_DB_DIR",
    "HK_MATH_DB_PATH",
    "HK_MATH_ENABLE_DEMO_USER",
    "HK_MATH_STORAGE_PROVIDER",
    "POSTGRES_URL"
  ] as const;
  const previousEnv = Object.fromEntries(trackedEnv.map((key) => [key, process.env[key]]));
  const tmpBase = path.join(process.cwd(), ".tmp");
  await mkdir(tmpBase, { recursive: true });
  const dbDir = await mkdtemp(path.join(tmpBase, "learning-events-clear-fence-"));

  try {
    process.env.AUTH_SESSION_SECRET = "ca-learning-clear-fence-route-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ POST, DELETE }, registerRoute] = await Promise.all([
      import("./route"),
      import("@/app/api/auth/register/route")
    ]);
    const registration = await registerRoute.POST(new Request(
      "https://example.test/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          name: "California Analytics Clear Student",
          username: "ca-analytics-clear-student@example.test",
          email: "ca-analytics-clear-student@example.test",
          password: "start12345",
          grade: "S3",
          curriculumTrack: "US_CA_MATH",
          language: "en",
          theme: "dark"
        })
      }
    ));
    assert.equal(registration.status, 200);
    const session = await registration.json() as { user: { id: string } };
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);
    const headers = {
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
    };
    const event = {
      id: "ca-learning-stale-clock-event",
      type: "page-view",
      source: "visualization-lab",
      // Deliberately far in the future: the server fence must use generation,
      // never this client-controlled timestamp, to decide whether it is stale.
      timestamp: "2099-08-12T10:00:00.000Z",
      grade: "S3",
      topicId: "us-ca-math-s3-chapter-03"
    };
    const post = (generation: number, events: unknown[]) => POST(new Request(
      "https://example.test/api/learning-events",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ generation, events })
      }
    ));

    const beforeClear = await post(0, [event]);
    assert.equal(beforeClear.status, 200);

    const clearRequest = (baseGeneration: number, requestId: string) => DELETE(new Request(
      "https://example.test/api/learning-events",
      {
        method: "DELETE",
        headers: {
          ...headers,
          "X-MAIS-Analytics-Generation": String(baseGeneration),
          "X-MAIS-Analytics-Clear-Request-Id": requestId
        }
      }
    ));
    const firstClearRequestId = "clear-route-request-1";
    const clearResponse = await clearRequest(0, firstClearRequestId);
    const clearDelivery: unknown = await clearResponse.json();
    assert.equal(clearResponse.status, 200);
    assert.equal(
      isLearningAnalyticsClearAcknowledgement(
        clearResponse.status,
        clearDelivery,
        session.user.id,
        0,
        firstClearRequestId
      ),
      true
    );
    const clearReceipt = clearDelivery as { clearedAt: string; generation: number; requestId: string };
    assert.equal(clearReceipt.generation, 1);
    assert.equal(clearReceipt.requestId, firstClearRequestId);
    const sqlitePath = path.join(dbDir, "hk-math-db.sqlite");
    const readRevision = () => {
      const database = new DatabaseSync(sqlitePath, { readOnly: true });
      try {
        const row = database.prepare("SELECT revision FROM app_state WHERE id = ?")
          .get("primary") as { revision: number };
        return Number(row.revision);
      } finally {
        database.close();
      }
    };
    const revisionAfterClear = readRevision();

    const lostAcknowledgementRetry = await clearRequest(0, firstClearRequestId);
    assert.equal(lostAcknowledgementRetry.status, 200);
    assert.deepEqual(await lostAcknowledgementRetry.json(), clearDelivery);
    assert.equal(
      readRevision(),
      revisionAfterClear,
      "an exact DELETE requestId replay must not advance the snapshot revision"
    );

    const staleResponse = await post(0, [event]);
    const staleDelivery: unknown = await staleResponse.json();
    assert.equal(staleResponse.status, 409);
    assert.deepEqual(staleDelivery, {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      clearedAt: clearReceipt.clearedAt,
      currentClearRequestId: firstClearRequestId,
      currentGeneration: 1,
      dispositions: [{ id: event.id, disposition: "stale-generation" }],
      durablyPersisted: false,
      reason: "generation-mismatch"
    });
    assert.deepEqual(
      readLearningAnalyticsGenerationMismatchReceipt(
        staleResponse.status,
        staleDelivery,
        session.user.id,
        0,
        new Set([event.id])
      ),
      {
        clearedAt: clearReceipt.clearedAt,
        currentClearRequestId: firstClearRequestId,
        currentGeneration: 1,
        direction: "forward"
      }
    );

    const currentResponse = await post(1, [event]);
    const currentDelivery: unknown = await currentResponse.json();
    assert.equal(currentResponse.status, 200);
    assert.equal(isDurableLearningAnalyticsDeliveryResponse(
      currentResponse.status,
      currentDelivery,
      session.user.id,
      1,
      new Set([event.id])
    ), true);
    assert.deepEqual(
      (currentDelivery as { dispositions: unknown }).dispositions,
      [{ id: event.id, disposition: "inserted" }]
    );

    const secondClearRequestId = "clear-route-request-2";
    const staleNewClear = await clearRequest(0, secondClearRequestId);
    assert.equal(staleNewClear.status, 409);
    assert.deepEqual(await staleNewClear.json(), {
      acknowledgedUserId: session.user.id,
      clearedAt: clearReceipt.clearedAt,
      currentClearRequestId: firstClearRequestId,
      currentGeneration: 1,
      durablyPersisted: false,
      reason: "generation-mismatch"
    });

    const eventSurvivedStaleClear = await post(1, [event]);
    assert.equal(eventSurvivedStaleClear.status, 200);
    assert.deepEqual(
      ((await eventSurvivedStaleClear.json()) as { dispositions: unknown }).dispositions,
      [{ id: event.id, disposition: "already-persisted" }]
    );

    const rebasedClear = await clearRequest(1, secondClearRequestId);
    assert.equal(rebasedClear.status, 200);
    assert.equal(
      isLearningAnalyticsClearAcknowledgement(
        rebasedClear.status,
        await rebasedClear.clone().json(),
        session.user.id,
        1,
        secondClearRequestId
      ),
      true
    );

    const eventAfterRebasedClear = await post(2, [event]);
    assert.equal(eventAfterRebasedClear.status, 200);
    assert.deepEqual(
      ((await eventAfterRebasedClear.json()) as { dispositions: unknown }).dispositions,
      [{ id: event.id, disposition: "inserted" }]
    );

    const routeUrl = pathToFileURL(path.join(
      process.cwd(),
      "app/api/learning-events/route.ts"
    )).href;
    const childSource = `
      const { POST } = await import(${JSON.stringify(routeUrl)});
      const response = await POST(new Request("https://example.test/api/learning-events", {
        method: "POST",
        headers: {
          Cookie: process.env.CA_TEST_SESSION_COOKIE,
          "Content-Type": "application/json",
          "X-MAIS-Analytics-User-Id": process.env.CA_TEST_OWNER_HEADER
        },
        body: process.env.CA_TEST_DELIVERY_BODY
      }));
      const delivery = await response.json();
      process.stdout.write(JSON.stringify({ status: response.status, delivery }));
    `;
    const restarted = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", childSource],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CA_TEST_SESSION_COOKIE: cookie,
          CA_TEST_OWNER_HEADER: encodeURIComponent(session.user.id),
          CA_TEST_DELIVERY_BODY: JSON.stringify({ generation: 2, events: [event] })
        }
      }
    );
    const restartedDelivery = JSON.parse(restarted.stdout) as {
      status: number;
      delivery: unknown;
    };
    assert.equal(restartedDelivery.status, 200);
    assert.deepEqual(restartedDelivery.delivery, {
      accepted: 0,
      acknowledgedEventIds: [event.id],
      acknowledgedUserId: session.user.id,
      dispositions: [{ id: event.id, disposition: "already-persisted" }],
      durablyPersisted: true,
      generation: 2
    });
  } finally {
    for (const key of trackedEnv) restoreEnv(key, previousEnv[key]);
    await rm(dbDir, { recursive: true, force: true });
  }
});
