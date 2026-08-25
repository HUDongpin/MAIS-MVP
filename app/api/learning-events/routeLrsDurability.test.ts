import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

type StoredDelivery = {
  attempts?: number;
  http_status?: number;
  next_retry_at?: string;
  reason?: string;
  statement_id?: string;
  status?: string;
};

function storedDelivery(dbDir: string, eventId: string) {
  const sqlite = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    };
    const payload = JSON.parse(row.payload) as {
      learning_events?: Array<{ id: string; lrs_delivery?: StoredDelivery }>;
    };
    return payload.learning_events?.find((event) => event.id === eventId)?.lrs_delivery;
  } finally {
    sqlite.close();
  }
}

test("learning-event no-ACK preserves a failed LRS outbox until exact replay delivers it", { timeout: 60_000 }, async () => {
  const trackedEnv = [
    "AUTH_SESSION_SECRET",
    "HK_MATH_DB_DIR",
    "HK_MATH_DB_PATH",
    "HK_MATH_ENABLE_DEMO_USER",
    "HK_MATH_STORAGE_PROVIDER",
    "POSTGRES_URL",
    "LRS_ENABLED",
    "LRS_ENDPOINT",
    "LRS_USERNAME",
    "LRS_PASSWORD",
    "LRS_DELIVERY_MAX_ATTEMPTS",
    "LRS_RETRY_BASE_DELAY_MS"
  ] as const;
  const previousEnv = Object.fromEntries(trackedEnv.map((key) => [key, process.env[key]]));
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-learning-lrs-route-"));
  let responseStatus = 503;
  let requestCount = 0;
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.statusCode = responseStatus;
    response.end(responseStatus >= 400 ? "temporary" : "");
  });

  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    process.env.AUTH_SESSION_SECRET = "learning-lrs-route-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    process.env.LRS_ENABLED = "true";
    process.env.LRS_ENDPOINT = `http://127.0.0.1:${address.port}/xapi`;
    process.env.LRS_USERNAME = "test-user";
    process.env.LRS_PASSWORD = "test-pass";
    process.env.LRS_DELIVERY_MAX_ATTEMPTS = "1";
    process.env.LRS_RETRY_BASE_DELAY_MS = "0";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ POST }, registerRoute] = await Promise.all([
      import("./route"),
      import("@/app/api/auth/register/route")
    ]);
    const registration = await registerRoute.POST(new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "LRS durability student",
        username: "lrs-durability-student@example.test",
        email: "lrs-durability-student@example.test",
        password: "start12345",
        grade: "S3",
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      })
    }));
    assert.equal(registration.status, 200);
    const session = await registration.json() as { user: { id: string } };
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);
    const event = {
      id: "lrs-durable-route-event",
      type: "page-view",
      source: "visualization-lab",
      timestamp: "2026-08-09T11:00:00.000Z",
      grade: "S3",
      topicId: "lrs-durable-route"
    };
    const headers = {
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
    };

    const queuedResponse = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers,
      body: JSON.stringify({ generation: 0, events: [event] })
    }));
    assert.equal(queuedResponse.status, 503);
    assert.deepEqual(await queuedResponse.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      durablyPersisted: false,
      locallyPersisted: true,
      reason: "lrs-delivery-queued"
    });
    const queued = storedDelivery(dbDir, event.id);
    assert.equal(queued?.status, "queued");
    assert.equal(queued?.attempts, 1);
    assert.equal(queued?.reason, "http-error");
    assert.equal(queued?.http_status, 503);
    assert.equal(typeof queued?.statement_id, "string");
    assert.equal(new Date(queued?.next_retry_at ?? "invalid").toISOString(), queued?.next_retry_at);

    process.env.LRS_ENABLED = "false";
    const disabledReplay = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers,
      body: JSON.stringify({ generation: 0, events: [event] })
    }));
    assert.equal(disabledReplay.status, 503, "disabling LRS must not ACK and erase an already queued job");
    assert.deepEqual((await disabledReplay.json() as { acknowledgedEventIds?: unknown }).acknowledgedEventIds, []);
    assert.equal(storedDelivery(dbDir, event.id)?.status, "queued");
    assert.equal(storedDelivery(dbDir, event.id)?.attempts, 1);

    process.env.LRS_ENABLED = "true";

    responseStatus = 204;
    const replayResponse = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers,
      body: JSON.stringify({ generation: 0, events: [event] })
    }));
    assert.equal(replayResponse.status, 200);
    assert.deepEqual((await replayResponse.json() as { acknowledgedEventIds?: unknown }).acknowledgedEventIds, [event.id]);
    assert.equal(storedDelivery(dbDir, event.id)?.status, "sent");
    assert.equal(storedDelivery(dbDir, event.id)?.attempts, 2, "the successful retry must add to the durable attempt count");
    assert.equal(requestCount, 2, "the exact replay must re-attempt the one durable queued statement");

    delete process.env.LRS_PASSWORD;
    const unavailableEvent = { ...event, id: "lrs-missing-config-event" };
    const unavailable = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers,
      body: JSON.stringify({ generation: 0, events: [unavailableEvent] })
    }));
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      durablyPersisted: false,
      locallyPersisted: true,
      reason: "lrs-delivery-unavailable"
    });
    assert.equal(storedDelivery(dbDir, unavailableEvent.id)?.status, "pending");

    process.env.LRS_PASSWORD = "test-pass";
    const recovered = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers,
      body: JSON.stringify({ generation: 0, events: [unavailableEvent] })
    }));
    assert.equal(recovered.status, 200);
    assert.equal(storedDelivery(dbDir, unavailableEvent.id)?.status, "sent");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const key of trackedEnv) restoreEnv(key, previousEnv[key]);
    await rm(dbDir, { recursive: true, force: true });
  }
});
