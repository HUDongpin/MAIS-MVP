import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  isDurableLearningAnalyticsDeliveryResponse,
  learningAnalyticsDeliveryPauseTransition,
  readLearningAnalyticsGenerationMismatchReceipt
} from "@/lib/learningAnalytics";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("an exact-user empty generation handshake durably unlocks retained session delivery", async () => {
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
  const dbDir = await mkdtemp(path.join(tmpBase, "learning-events-generation-"));

  try {
    process.env.AUTH_SESSION_SECRET = "ca-learning-generation-route-test-secret";
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
          name: "California Analytics Generation Student",
          username: "ca-analytics-generation-student@example.test",
          email: "ca-analytics-generation-student@example.test",
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

    const response = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 0, events: [] })
    }));
    const delivery: unknown = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(delivery, {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      dispositions: [],
      durablyPersisted: true,
      generation: 0
    });
    assert.equal(
      isDurableLearningAnalyticsDeliveryResponse(
        response.status,
        delivery,
        session.user.id,
        0,
        new Set<string>()
      ),
      true
    );
    assert.deepEqual(learningAnalyticsDeliveryPauseTransition(true, false), {
      paused: false,
      wakeVisualizationSessions: true
    });

    const aheadResponse = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(session.user.id)
      },
      body: JSON.stringify({ generation: 1, events: [] })
    }));
    const aheadDelivery: unknown = await aheadResponse.json();
    assert.equal(aheadResponse.status, 409);
    assert.deepEqual(aheadDelivery, {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: session.user.id,
      clearedAt: null,
      currentClearRequestId: null,
      currentGeneration: 0,
      dispositions: [],
      durablyPersisted: false,
      reason: "generation-mismatch"
    });
    assert.deepEqual(readLearningAnalyticsGenerationMismatchReceipt(
      aheadResponse.status,
      aheadDelivery,
      session.user.id,
      1,
      new Set<string>()
    ), {
      clearedAt: null,
      currentClearRequestId: null,
      currentGeneration: 0,
      direction: "authoritative-lower"
    });
  } finally {
    for (const key of trackedEnv) restoreEnv(key, previousEnv[key]);
    await rm(dbDir, { recursive: true, force: true });
  }
});
