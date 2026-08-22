import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("learning-events rejects noncanonical ownership and payloads before mutation", async () => {
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
  const dbDir = await mkdtemp(path.join(tmpBase, "learning-events-boundary-"));

  try {
    process.env.AUTH_SESSION_SECRET = "ca-learning-boundary-route-test-secret";
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
          name: "California Analytics Boundary Student",
          username: "ca-analytics-boundary-student@example.test",
          email: "ca-analytics-boundary-student@example.test",
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
    const event = {
      id: "ca-learning-boundary-event",
      type: "page-view",
      source: "visualization-lab",
      timestamp: "2026-08-12T10:00:00.000Z",
      grade: "S3",
      topicId: "us-ca-math-s3-chapter-04"
    };
    const request = (
      owner: string | null,
      body: BodyInit,
      additionalHeaders: HeadersInit = {}
    ) => POST(new Request(
      "https://example.test/api/learning-events",
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          ...(owner === null ? {} : { "X-MAIS-Analytics-User-Id": owner }),
          ...additionalHeaders
        },
        body
      }
    ));

    assert.equal((await request(null, "{not-json")).status, 409);
    assert.equal((await request("%", "{not-json")).status, 409);
    assert.equal((await request(
      encodeURIComponent(`${session.user.id}-other`),
      JSON.stringify({ generation: 0, events: [event] })
    )).status, 409);
    const noncanonicalOwner = `%${session.user.id.charCodeAt(0).toString(16)}${session.user.id.slice(1)}`;
    assert.equal((await request(
      noncanonicalOwner,
      JSON.stringify({ generation: 0, events: [event] })
    )).status, 409);

    const exactOwner = encodeURIComponent(session.user.id);
    assert.equal((await request(exactOwner, "{not-json")).status, 400);
    assert.equal((await request(
      exactOwner,
      JSON.stringify({ generation: -1, events: [event] })
    )).status, 400);
    assert.equal((await request(
      exactOwner,
      JSON.stringify({ generation: 0, events: [{ ...event, id: "" }] })
    )).status, 400);
    assert.equal((await request(
      exactOwner,
      JSON.stringify({
        generation: 0,
        events: [{ ...event, timestamp: "2026-08-12T10:00:00Z" }]
      })
    )).status, 400);

    const observedOversize = await request(
      exactOwner,
      JSON.stringify({
        generation: 0,
        events: [event],
        padding: "x".repeat(1_100_000)
      })
    );
    assert.equal(observedOversize.status, 413);

    const duplicateTopLevelKey = await request(
      exactOwner,
      `{"generation":0,"genera\\u0074ion":0,"events":[${JSON.stringify(event)}]}`
    );
    assert.equal(duplicateTopLevelKey.status, 400);

    assert.equal((await request(exactOwner, "{}", {
      "Content-Length": "3"
    })).status, 400);
    assert.equal((await request(exactOwner, new Uint8Array([0x7b, 0xff, 0x7d]))).status, 400);

    const tooManyEvents = Array.from({ length: 201 }, (_, index) => ({
      ...event,
      id: `too-many-${index}`
    }));
    assert.equal((await request(
      exactOwner,
      JSON.stringify({ generation: 0, events: tooManyEvents })
    )).status, 413);

    const oversizedTopicId = await request(
      exactOwner,
      JSON.stringify({
        generation: 0,
        events: [{ ...event, topicId: "x".repeat(257) }]
      })
    );
    assert.equal(oversizedTopicId.status, 400);
    assert.equal((await request(
      exactOwner,
      JSON.stringify({ generation: 0, events: [{ ...event, id: ` ${event.id}` }] })
    )).status, 400);

    const insertedResponse = await request(
      exactOwner,
      JSON.stringify({ generation: 0, events: [event] })
    );
    assert.equal(insertedResponse.status, 200);
    assert.deepEqual(
      (await insertedResponse.json() as { dispositions: unknown }).dispositions,
      [{ id: event.id, disposition: "inserted" }],
      "rejected ownership and schema requests must not mutate the event revision"
    );
  } finally {
    for (const key of trackedEnv) restoreEnv(key, previousEnv[key]);
    await rm(dbDir, { recursive: true, force: true });
  }
});
