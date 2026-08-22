import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import test from "node:test";

import { isDurableLearningAnalyticsDeliveryResponse } from "@/lib/learningAnalytics";

test("Postgres learning-event ACKs require one atomic row plus snapshot transaction", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const postStart = source.indexOf("export async function POST");
  const deleteStart = source.indexOf("export async function DELETE", postStart);
  const postSource = source.slice(postStart, deleteStart);
  const deleteSource = source.slice(deleteStart);

  const atomicAppend = postSource.indexOf("await appendLearningEventsAtomically");
  const scheduleLrs = postSource.indexOf("scheduleLearningEventsLrsDelivery", atomicAppend);
  assert.notEqual(atomicAppend, -1);
  assert.ok(atomicAppend < scheduleLrs);
  assert.doesNotMatch(postSource, /await appendLearningEventsFast/);
  assert.doesNotMatch(postSource, /await repairLearningEventGenerationForUser/);

  const atomicClear = deleteSource.indexOf("await clearLearningEventsAtomically");
  const durableResponse = deleteSource.indexOf("durablyPersisted: true", atomicClear);
  assert.notEqual(atomicClear, -1);
  assert.ok(atomicClear < durableResponse);
  assert.doesNotMatch(deleteSource, /await clearLearningEventsFast/);
  assert.doesNotMatch(deleteSource, /await mirrorLearningEventFastClearReceipt/);
  assert.doesNotMatch(deleteSource, /Legacy learning-event clear mirror failed|console\.warn/);

  const atomicAppendStart = userStoreSource.indexOf("export async function appendLearningEventsAtomically");
  const atomicClearStart = userStoreSource.indexOf("export async function clearLearningEventsAtomically", atomicAppendStart);
  const atomicAppendSource = userStoreSource.slice(atomicAppendStart, atomicClearStart);
  const atomicClearSource = userStoreSource.slice(
    atomicClearStart,
    userStoreSource.indexOf("const authSessionPersistenceStore", atomicClearStart)
  );
  for (const [label, atomicSource] of [
    ["append", atomicAppendSource],
    ["clear", atomicClearSource]
  ] as const) {
    assert.match(atomicSource, /runAtomicLearningEventDualStoreTransaction/);
    assert.match(atomicSource, /begin: \(callback\) => getPostgresClient\(\)\.begin\(\(sql\) => callback\(sql\)\)/);
    assert.match(atomicSource, /readSnapshotForUpdate: \(sql\) => readPostgresDatabaseFrom\(sql, true, true\)/);
    assert.match(atomicSource, /createFastAdapter: postgresLearningEventTransactionAdapter/);
    assert.match(atomicSource, /writeSnapshot: \(sql, database\) => writePostgresDatabaseWith\(sql, database, true\)/);
    assert.doesNotMatch(
      atomicSource,
      /appendLearningEventsFast|clearLearningEventsFast/,
      `Atomic ${label} must not call a separately committed fast-store wrapper.`
    );
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("event delivery acknowledges ordered unique physical revisions and rejects an id conflict", async () => {
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
  const dbDir = await mkdtemp(path.join(tmpBase, "learning-events-delivery-"));

  try {
    process.env.AUTH_SESSION_SECRET = "ca-learning-delivery-route-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ POST }, registerRoute] = await Promise.all([
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
          name: "California Analytics Delivery Student",
          username: "ca-analytics-delivery-student@example.test",
          email: "ca-analytics-delivery-student@example.test",
          password: "start12345",
          grade: "S3",
          curriculumTrack: "US_CA_MATH",
          language: "en",
          theme: "dark"
        })
      }
    ));
    assert.equal(
      registration.status,
      200,
      JSON.stringify(await registration.clone().json())
    );
    const session = await registration.json() as { user: { id: string } };
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);
    const headers = {
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
    };
    const first = {
      id: "ca-learning-physical-first",
      type: "page-view",
      source: "visualization-lab",
      timestamp: "2026-08-12T10:00:00.000Z",
      grade: "S3",
      topicId: "us-ca-math-s3-chapter-01"
    };
    const second = {
      ...first,
      id: "ca-learning-physical-second",
      timestamp: "2026-08-12T10:00:01.000Z",
      topicId: "us-ca-math-s3-chapter-02"
    };
    const reorderedFirst = {
      topicId: first.topicId,
      grade: first.grade,
      timestamp: first.timestamp,
      source: first.source,
      type: first.type,
      id: first.id
    };
    const post = (events: unknown[]) => POST(new Request(
      "https://example.test/api/learning-events",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ generation: 0, events })
      }
    ));

    const insertedResponse = await post([first, reorderedFirst, second]);
    const inserted: unknown = await insertedResponse.json();
    assert.equal(insertedResponse.status, 200);
    assert.deepEqual(inserted, {
      accepted: 2,
      acknowledgedEventIds: [first.id, second.id],
      acknowledgedUserId: session.user.id,
      dispositions: [
        { id: first.id, disposition: "inserted" },
        { id: second.id, disposition: "inserted" }
      ],
      durablyPersisted: true,
      generation: 0
    });
    assert.equal(isDurableLearningAnalyticsDeliveryResponse(
      insertedResponse.status,
      inserted,
      session.user.id,
      0,
      new Set([first.id, second.id])
    ), true);
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
    const revisionAfterInsert = readRevision();

    const replayResponse = await post([second, first]);
    assert.equal(replayResponse.status, 200);
    assert.deepEqual(await replayResponse.json(), {
      accepted: 0,
      acknowledgedEventIds: [second.id, first.id],
      acknowledgedUserId: session.user.id,
      dispositions: [
        { id: second.id, disposition: "already-persisted" },
        { id: first.id, disposition: "already-persisted" }
      ],
      durablyPersisted: true,
      generation: 0
    });
    assert.equal(
      readRevision(),
      revisionAfterInsert,
      "an exact already-persisted POST replay must not advance the snapshot revision"
    );

    const conflictResponse = await post([{ ...first, topicId: "changed-payload" }]);
    assert.equal(conflictResponse.status, 409);
    assert.deepEqual(await conflictResponse.json(), {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      currentGeneration: 0,
      dispositions: [{ id: first.id, disposition: "id-conflict" }],
      durablyPersisted: false,
      reason: "id-conflict"
    });

    const batchConflictCases = [
      {
        name: "A-B",
        events: [
          { ...first, id: "same-request-a-b", topicId: "payload-a" },
          { ...first, id: "same-request-a-b", topicId: "payload-b" }
        ],
        probe: [{ ...first, id: "same-request-a-b", topicId: "payload-b" }],
        dispositions: [{ id: "same-request-a-b", disposition: "id-conflict" }]
      },
      {
        name: "B-A",
        events: [
          { ...first, id: "same-request-b-a", topicId: "payload-b" },
          { ...first, id: "same-request-b-a", topicId: "payload-a" }
        ],
        probe: [{ ...first, id: "same-request-b-a", topicId: "payload-a" }],
        dispositions: [{ id: "same-request-b-a", disposition: "id-conflict" }]
      },
      {
        name: "A-A-B",
        events: [
          { ...first, id: "same-request-a-a-b", topicId: "payload-a" },
          { ...first, id: "same-request-a-a-b", topicId: "payload-a" },
          { ...first, id: "same-request-a-a-b", topicId: "payload-b" }
        ],
        probe: [{ ...first, id: "same-request-a-a-b", topicId: "payload-b" }],
        dispositions: [{ id: "same-request-a-a-b", disposition: "id-conflict" }]
      },
      {
        name: "conflict-with-unrelated-ids",
        events: [
          { ...first, id: "same-request-unrelated-left", topicId: "left" },
          { ...first, id: "same-request-mixed-conflict", topicId: "payload-a" },
          { ...first, id: "same-request-unrelated-right", topicId: "right" },
          { ...first, id: "same-request-mixed-conflict", topicId: "payload-b" }
        ],
        probe: [
          { ...first, id: "same-request-unrelated-left", topicId: "left" },
          { ...first, id: "same-request-mixed-conflict", topicId: "payload-b" },
          { ...first, id: "same-request-unrelated-right", topicId: "right" }
        ],
        dispositions: [
          { id: "same-request-unrelated-left", disposition: "not-processed" },
          { id: "same-request-mixed-conflict", disposition: "id-conflict" },
          { id: "same-request-unrelated-right", disposition: "not-processed" }
        ]
      }
    ] as const;

    for (const conflictCase of batchConflictCases) {
      const sameRequestConflict = await post([...conflictCase.events]);
      assert.equal(sameRequestConflict.status, 409, conflictCase.name);
      assert.deepEqual(await sameRequestConflict.json(), {
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: session.user.id,
        dispositions: conflictCase.dispositions,
        durablyPersisted: false,
        reason: "id-conflict"
      }, conflictCase.name);

      const atomicProbe = await post([...conflictCase.probe]);
      const atomicProbeDelivery = await atomicProbe.json() as {
        accepted?: unknown;
        dispositions?: Array<{ disposition?: unknown; id?: unknown }>;
      };
      assert.equal(atomicProbe.status, 200, `${conflictCase.name}: atomic probe status`);
      assert.equal(
        atomicProbeDelivery.accepted,
        conflictCase.probe.length,
        `${conflictCase.name}: a rejected conflict must persist no physical revision`
      );
      assert.deepEqual(
        atomicProbeDelivery.dispositions,
        conflictCase.probe.map((event) => ({ id: event.id, disposition: "inserted" })),
        `${conflictCase.name}: every unrelated/probe row must remain insertable`
      );
    }
  } finally {
    for (const key of trackedEnv) restoreEnv(key, previousEnv[key]);
    await rm(dbDir, { recursive: true, force: true });
  }
});
