import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { readFile } from "node:fs/promises";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

type DurableLearningEventState = {
  learning_events?: Array<{ id: string; user_id: string }>;
  learning_event_clears?: Array<{ cleared_at?: string; generation?: number; user_id: string }>;
};

function readDurableLearningEventState(dbDir: string): DurableLearningEventState {
  const sqlite = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    } | undefined;
    assert.ok(row);
    return JSON.parse(row.payload) as DurableLearningEventState;
  } finally {
    sqlite.close();
  }
}

test("learning-events authenticates first and requires an exact owner before parsing JSON", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousPostgresUrl = process.env.POSTGRES_URL;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-learning-generation-route-"));

  try {
    process.env.AUTH_SESSION_SECRET = "learning-generation-route-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ POST, DELETE }, registerRoute] = await Promise.all([
      import("./route"),
      import("@/app/api/auth/register/route")
    ]);
    const anonymous = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json"
    }));
    assert.equal(anonymous.status, 202);

    const registration = await registerRoute.POST(new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Telemetry Generation Student",
        username: "telemetry-generation-student@example.test",
        email: "telemetry-generation-student@example.test",
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

    const missingOwner = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: "{not-json"
    }));
    assert.equal(missingOwner.status, 409);
    assert.deepEqual(await missingOwner.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "missing-owner"
    });

    const mismatch = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(`${session.user.id}-stale`)
      },
      body: "{not-json"
    }));
    assert.equal(mismatch.status, 409);

    const malformed = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: "{not-json"
    }));
    assert.equal(malformed.status, 400);

    const event = {
      id: "route-generation-event",
      type: "page-view",
      source: "visualization-lab",
      timestamp: "2026-08-09T11:00:00.000Z",
      grade: "S3",
      topicId: "route-generation-first",
      durationSeconds: 17
    };
    const missingGeneration = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ events: [event] })
    }));
    assert.equal(missingGeneration.status, 400);
    assert.deepEqual(await missingGeneration.json(), {
      error: "A non-negative safe integer generation is required.",
      reason: "invalid-generation"
    });

    const emptyEventId = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [{ ...event, id: "" }] })
    }));
    assert.equal(emptyEventId.status, 400);
    assert.deepEqual(await emptyEventId.json(), {
      error: "Learning analytics event ids must be non-empty.",
      reason: "invalid-event-id"
    });

    const fractionalDuration = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 0,
        events: [{ ...event, id: "fractional-duration", durationSeconds: 17.4 }]
      })
    }));
    assert.equal(fractionalDuration.status, 400);
    assert.deepEqual(await fractionalDuration.json(), {
      error: "Learning analytics durations must use whole seconds.",
      reason: "invalid-event-duration"
    });

    const nonCanonicalTimestamp = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 0,
        events: [{ ...event, id: "noncanonical-time", timestamp: "2026-08-09T11:00:00Z" }]
      })
    }));
    assert.equal(nonCanonicalTimestamp.status, 400);
    assert.deepEqual(await nonCanonicalTimestamp.json(), {
      error: "Learning analytics timestamps must use canonical ISO format.",
      reason: "invalid-event-timestamp"
    });

    const generationHandshake = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [] })
    }));
    assert.equal(generationHandshake.status, 200);
    assert.deepEqual(await generationHandshake.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      dispositions: [],
      durablyPersisted: true,
      generation: 0
    });

    const oversizedEvents = Array.from({ length: 201 }, (_, index) => ({
      ...event,
      id: `oversized-${index}`
    }));
    const oversizedBatch = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: oversizedEvents })
    }));
    assert.equal(oversizedBatch.status, 413);
    const oversizedBody = await oversizedBatch.json() as {
      acknowledgedEventIds?: unknown;
      dispositions?: Array<{ id?: unknown; disposition?: unknown }>;
      durablyPersisted?: unknown;
      maxBatchSize?: unknown;
      reason?: unknown;
    };
    assert.deepEqual(oversizedBody.acknowledgedEventIds, []);
    assert.equal(oversizedBody.dispositions?.length, 201);
    assert.equal(oversizedBody.dispositions?.every((entry, index) =>
      entry.id === `oversized-${index}` && entry.disposition === "not-processed"
    ), true);
    assert.equal(oversizedBody.durablyPersisted, false);
    assert.equal(oversizedBody.maxBatchSize, 200);
    assert.equal(oversizedBody.reason, "batch-too-large");

    const firstOversizedEventRetry = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [oversizedEvents[0]] })
    }));
    assert.equal(firstOversizedEventRetry.status, 200);
    assert.equal((await firstOversizedEventRetry.json() as { accepted?: unknown }).accepted, 1);

    const valid = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 0,
        events: [event, { ...event, topicId: "must-not-replace-first" }]
      })
    }));
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), {
      accepted: 1,
      acknowledgedEventIds: [event.id],
      acknowledgedUserId: session.user.id,
      dispositions: [{ id: event.id, disposition: "inserted" }],
      durablyPersisted: true,
      generation: 0
    });

    const exactReplay = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [event] })
    }));
    assert.equal(exactReplay.status, 200);
    assert.deepEqual(await exactReplay.json(), {
      accepted: 0,
      acknowledgedEventIds: [event.id],
      acknowledgedUserId: session.user.id,
      dispositions: [{ id: event.id, disposition: "already-persisted" }],
      durablyPersisted: true,
      generation: 0
    });
    const durableReplayState = readDurableLearningEventState(dbDir);
    assert.equal(
      durableReplayState.learning_events?.filter((stored) => stored.id === event.id).length,
      1,
      "an exact replay must ACK the one durable SQLite row instead of duplicating it"
    );
    assert.equal(
      durableReplayState.learning_events?.filter((stored) => stored.id === "oversized-0").length,
      1,
      "the rejected oversized batch must not have partially stored its first ID"
    );

    const payloadConflict = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 0,
        events: [{ ...event, topicId: "changed-payload" }]
      })
    }));
    assert.equal(payloadConflict.status, 409);
    assert.deepEqual(await payloadConflict.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      currentGeneration: 0,
      dispositions: [{ id: event.id, disposition: "id-conflict" }],
      durablyPersisted: false,
      reason: "id-conflict"
    });

    const secondRegistration = await registerRoute.POST(new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Telemetry Collision Student",
        username: "telemetry-collision-student@example.test",
        email: "telemetry-collision-student@example.test",
        password: "start12345",
        grade: "S3",
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      })
    }));
    assert.equal(secondRegistration.status, 200);
    const secondSession = await secondRegistration.json() as { user: { id: string } };
    const secondCookie = secondRegistration.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(secondCookie);
    const crossOwnerCollision = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: secondCookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(secondSession.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [event] })
    }));
    assert.equal(crossOwnerCollision.status, 409);
    const crossOwnerBody = await crossOwnerCollision.json() as {
      acknowledgedEventIds?: unknown;
      dispositions?: unknown;
      reason?: unknown;
    };
    assert.deepEqual(crossOwnerBody.acknowledgedEventIds, []);
    assert.deepEqual(crossOwnerBody.dispositions, [{ id: event.id, disposition: "id-conflict" }]);
    assert.equal(crossOwnerBody.reason, "id-conflict");

    const aheadOfServerHandshake = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: secondCookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(secondSession.user.id)
      },
      body: JSON.stringify({ generation: 1, events: [] })
    }));
    assert.equal(aheadOfServerHandshake.status, 409);
    assert.deepEqual(await aheadOfServerHandshake.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: secondSession.user.id,
      clearedAt: null,
      currentGeneration: 0,
      dispositions: [],
      durablyPersisted: false,
      reason: "generation-mismatch"
    });

    const missingDeleteOwner = await DELETE(new Request("https://example.test/api/learning-events", {
      method: "DELETE",
      headers: { Cookie: cookie }
    }));
    assert.equal(missingDeleteOwner.status, 409);
    assert.deepEqual(await missingDeleteOwner.json(), {
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "missing-owner"
    });

    const cleared = await DELETE(new Request("https://example.test/api/learning-events", {
      method: "DELETE",
      headers: {
        Cookie: cookie,
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      }
    }));
    assert.equal(cleared.status, 200);
    const clearedBody = await cleared.json() as {
      acknowledgedUserId?: unknown;
      clearedAt?: unknown;
      durablyPersisted?: unknown;
      generation?: unknown;
      ok?: unknown;
    };
    assert.equal(typeof clearedBody.clearedAt, "string");
    assert.equal(new Date(clearedBody.clearedAt as string).toISOString(), clearedBody.clearedAt);
    assert.deepEqual(clearedBody, {
      acknowledgedUserId: session.user.id,
      clearedAt: clearedBody.clearedAt,
      durablyPersisted: true,
      generation: 1,
      ok: true
    });
    assert.equal(
      readDurableLearningEventState(dbDir).learning_event_clears?.find((clear) =>
        clear.user_id === session.user.id
      )?.cleared_at,
      clearedBody.clearedAt,
      "the API receipt must be the exact canonical timestamp stored by the authoritative clear"
    );

    const aheadOfNonzeroServer = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 3, events: [] })
    }));
    assert.equal(aheadOfNonzeroServer.status, 409);
    assert.deepEqual(await aheadOfNonzeroServer.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      clearedAt: null,
      currentGeneration: 1,
      dispositions: [],
      durablyPersisted: false,
      reason: "generation-mismatch"
    });

    const staleAfterClear = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 0,
        events: [{ ...event, id: "stale-after-clear" }]
      })
    }));
    assert.equal(staleAfterClear.status, 409);
    assert.deepEqual(await staleAfterClear.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      clearedAt: clearedBody.clearedAt,
      currentGeneration: 1,
      dispositions: [{ id: "stale-after-clear", disposition: "stale-generation" }],
      durablyPersisted: false,
      reason: "generation-mismatch"
    });

    const currentAfterClear = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 1,
        events: [{
          ...event,
          id: "current-after-clear",
          timestamp: "2000-01-01T00:00:00.000Z"
        }]
      })
    }));
    assert.equal(currentAfterClear.status, 200);
    const currentAfterClearBody = await currentAfterClear.json() as {
      acknowledgedEventIds?: unknown;
      generation?: unknown;
    };
    assert.deepEqual(currentAfterClearBody.acknowledgedEventIds, ["current-after-clear"]);
    assert.equal(currentAfterClearBody.generation, 1);

    const concurrentPostRequest = POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 1,
        events: [{ ...event, id: "concurrent-with-clear" }]
      })
    }));
    const concurrentClearRequest = DELETE(new Request("https://example.test/api/learning-events", {
      method: "DELETE",
      headers: {
        Cookie: cookie,
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      }
    }));
    const [concurrentPost, concurrentClear] = await Promise.all([
      concurrentPostRequest,
      concurrentClearRequest
    ]);
    assert.equal(concurrentClear.status, 200);
    assert.equal((await concurrentClear.json() as { generation?: unknown }).generation, 2);
    assert.equal([200, 409, 503].includes(concurrentPost.status), true);
    const concurrentPostBody = await concurrentPost.json() as {
      acknowledgedEventIds?: unknown;
      currentGeneration?: unknown;
      generation?: unknown;
      reason?: unknown;
    };
    if (concurrentPost.status === 200) {
      assert.deepEqual(concurrentPostBody.acknowledgedEventIds, ["concurrent-with-clear"]);
      assert.equal(concurrentPostBody.generation, 1);
    } else if (concurrentPost.status === 503) {
      assert.deepEqual(concurrentPostBody.acknowledgedEventIds, []);
      assert.equal(concurrentPostBody.reason, "lrs-delivery-persistence-unavailable");
    } else {
      assert.deepEqual(concurrentPostBody.acknowledgedEventIds, []);
      assert.equal(concurrentPostBody.currentGeneration, 2);
      assert.equal(
        new Date((concurrentPostBody as { clearedAt?: string }).clearedAt!).toISOString(),
        (concurrentPostBody as { clearedAt?: string }).clearedAt
      );
    }

    const durableConcurrentState = readDurableLearningEventState(dbDir);
    assert.equal(
      durableConcurrentState.learning_events?.some((stored) =>
        stored.user_id === session.user.id && stored.id === "concurrent-with-clear"
      ),
      false,
      "serialized SQLite clear must leave no concurrent stale-generation row"
    );
    const durableConcurrentClear = durableConcurrentState.learning_event_clears?.find((clear) =>
      clear.user_id === session.user.id
    );
    assert.equal(durableConcurrentClear?.generation, 2);
    assert.equal(
      new Date(durableConcurrentClear?.cleared_at ?? "invalid").toISOString(),
      durableConcurrentClear?.cleared_at
    );

    const generationTwo = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({
        generation: 2,
        events: [{ ...event, id: "durable-after-concurrent-clear" }]
      })
    }));
    assert.equal(generationTwo.status, 200);
    const finalDurableState = readDurableLearningEventState(dbDir);
    assert.equal(
      finalDurableState.learning_events?.filter((stored) =>
        stored.user_id === session.user.id && stored.id === "durable-after-concurrent-clear"
      ).length,
      1
    );
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    restoreEnv("POSTGRES_URL", previousPostgresUrl);
    await rm(dbDir, { recursive: true, force: true });
  }
});

test("learning-events awaits and persists LRS delivery for inserted rows and exact replays", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const postStart = source.indexOf("export async function POST");
  const deleteStart = source.indexOf("export async function DELETE", postStart);
  const postSource = source.slice(postStart, deleteStart);

  assert.doesNotMatch(postSource, /void emitLearningEventsToLrs/);
  assert.doesNotMatch(postSource, /insertedEvents\.length > 0/);
  assert.match(postSource, /await emitLearningEventsToLrs\([\s\S]*events: eventBatch/);
  assert.match(postSource, /await recordLearningEventLrsDelivery/);
  assert.match(postSource, /await recordLearningEventLrsDeliveryFast/);
  assert.match(postSource, /lrs-delivery-persistence-unavailable/);
});
