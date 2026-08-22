import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { visualizationLabCatalog } from "@/data/visualizationLabs";
import { isVisualizationSessionOutboxAcknowledgement } from "@/lib/visualizationSessionOutbox";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function readDurableStateBytes(dbDir: string) {
  const sqlite = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
  try {
    const row = sqlite.prepare("SELECT payload, revision FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
      revision: number;
    } | undefined;
    assert.ok(row);
    return row;
  } finally {
    sqlite.close();
  }
}

test("visualization-session route rejects forged identities and durably ACKs exact learner tuples", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const previousPostgresUrl = process.env.POSTGRES_URL;
  const dbDir = await mkdtemp(path.join(process.cwd(), ".tmp/ca-session-route-"));

  try {
    process.env.AUTH_SESSION_SECRET = "california-visualization-session-route-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ GET, POST }, registerRoute, userStore] = await Promise.all([
      import("./route"),
      import("@/app/api/auth/register/route"),
      import("@/lib/server/userStore")
    ]);
    async function register(role: "student" | "teacher", suffix: string) {
      const response = await registerRoute.POST(new Request("https://example.test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: `${role} California visualization route`,
          username: `${role}-${suffix}@example.test`,
          email: `${role}-${suffix}@example.test`,
          password: "start12345",
          grade: "S4",
          curriculumTrack: "US_CA_MATH",
          language: "en",
          theme: "dark"
        })
      }));
      assert.equal(response.status, 200);
      const body = await response.json() as { user: { id: string } };
      const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
      assert.ok(cookie);
      return { cookie, userId: body.user.id };
    }

    const student = await register("student", "student");
    const teacher = await register("teacher", "teacher");
    const teacherPost = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: {
        Cookie: teacher.cookie,
        "Content-Type": "application/json",
        "X-MAIS-Visualization-User-Id": encodeURIComponent(teacher.userId)
      },
      body: JSON.stringify({
        moduleId: "configured-visualization-lab",
        topicId: "us-ca-math-s4-chapter-04",
        source: "function-model"
      })
    }));
    assert.equal(teacherPost.status, 403);
    assert.deepEqual(await teacherPost.json(), {
      error: "Student access required.",
      reason: "student-only"
    });

    const studentHeaders = {
      Cookie: student.cookie,
      "Content-Type": "application/json",
      "X-MAIS-Visualization-User-Id": encodeURIComponent(student.userId)
    };
    const anonymous = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: "configured-visualization-lab",
        topicId: "us-ca-math-s4-chapter-04",
        source: "function-model"
      })
    }));
    assert.equal(anonymous.status, 401);

    for (const ownerHeader of [undefined, "%", encodeURIComponent(teacher.userId), " student "]) {
      const headers = new Headers({
        Cookie: student.cookie,
        "Content-Type": "application/json"
      });
      if (ownerHeader !== undefined) headers.set("X-MAIS-Visualization-User-Id", ownerHeader);
      const response = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          moduleId: "configured-visualization-lab",
          topicId: "us-ca-math-s4-chapter-04",
          source: "function-model"
        })
      }));
      assert.equal(response.status, 409, JSON.stringify(ownerHeader));
    }

    for (const invalidBody of [
      { moduleId: "", topicId: "topic", source: "geometry" },
      { moduleId: " module", topicId: "topic", source: "geometry" },
      { moduleId: "module", topicId: "topic ", source: "geometry" },
      { moduleId: "x".repeat(257), topicId: "topic", source: "geometry" },
      { moduleId: "module", topicId: "x".repeat(257), source: "geometry" },
      { moduleId: "module", topicId: "topic", source: "not-a-source" },
      { moduleId: "module", topicId: "topic", source: "geometry", extra: true }
    ]) {
      const response = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify(invalidBody)
      }));
      assert.equal(response.status, 400, JSON.stringify(invalidBody));
    }

    for (const forged of [
      { moduleId: "fabricated-a", topicId: "fabricated-topic-a", source: "visualization-lab" },
      { moduleId: "configured-visualization-lab", topicId: "fabricated-topic-b", source: "geometry" },
      { moduleId: "m".repeat(256), topicId: "t".repeat(256), source: "geometry" }
    ]) {
      const response = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify(forged)
      }));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Unknown visualization session identity.",
        reason: "unknown-visualization-session"
      });
    }
    const duplicateTarget = visualizationLabCatalog.find((lab) =>
      lab.labId === "us-ca-math-s4-chapter-04"
    );
    assert.ok(duplicateTarget);
    const durableBeforeDuplicateMember = readDurableStateBytes(dbDir);
    const rewardsBeforeDuplicateMember = await userStore.getStudentRewardsData(student.userId);
    const duplicateMember = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: `{"moduleId":"fabricated-first-value","moduleId":"configured-visualization-lab","topicId":${JSON.stringify(duplicateTarget.labId)},"source":${JSON.stringify(duplicateTarget.analyticsSource)}}`
    }));
    assert.equal(duplicateMember.status, 400);
    assert.deepEqual(readDurableStateBytes(dbDir), durableBeforeDuplicateMember);
    assert.deepEqual(
      await userStore.getStudentRewardsData(student.userId),
      rewardsBeforeDuplicateMember,
      "a duplicate JSON member must not create a session reward"
    );
    const durableBeforeLengthMismatch = readDurableStateBytes(dbDir);
    const rewardsBeforeLengthMismatch = await userStore.getStudentRewardsData(student.userId);
    const mismatchedLengthBody = JSON.stringify({
      moduleId: "configured-visualization-lab",
      topicId: duplicateTarget.labId,
      source: duplicateTarget.analyticsSource
    });
    const mismatchedLength = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: {
        ...studentHeaders,
        "Content-Length": "2"
      },
      body: mismatchedLengthBody
    }));
    assert.equal(mismatchedLength.status, 400);
    assert.deepEqual(readDurableStateBytes(dbDir), durableBeforeLengthMismatch);
    assert.deepEqual(
      await userStore.getStudentRewardsData(student.userId),
      rewardsBeforeLengthMismatch,
      "a declared/observed body-length mismatch must not create a session reward"
    );
    const rewardsBeforeAllowed = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsBeforeAllowed);
    assert.equal(
      rewardsBeforeAllowed.ledger.some((entry) => entry.reason === "visualization-complete"),
      false,
      "fabricated catalog identities must not earn completion rewards"
    );

    const crossCurriculumLab = visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "HK" && lab.grade === "S4"
    );
    assert.ok(crossCurriculumLab);
    const forbidden = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({
        moduleId: "configured-visualization-lab",
        topicId: crossCurriculumLab.labId,
        source: crossCurriculumLab.analyticsSource
      })
    }));
    assert.equal(forbidden.status, 403);
    assert.deepEqual(await forbidden.json(), {
      error: "Visualization is outside the authenticated learner curriculum.",
      reason: "curriculum-scope-mismatch"
    });

    const californiaLab = visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "US" &&
      lab.publisher === "US_CA_MATH" &&
      lab.grade === "S4" &&
      lab.labId === "us-ca-math-s4-chapter-04"
    ) ?? visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH" && lab.grade === "S4"
    );
    assert.ok(californiaLab);
    const payload = {
      moduleId: "configured-visualization-lab",
      topicId: californiaLab.labId,
      source: californiaLab.analyticsSource
    };
    const postPayload = (body: typeof payload) => POST(new Request(
      "https://example.test/api/visualization-sessions",
      {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify(body)
      }
    ));
    const durableBeforeConcurrentRoute = readDurableStateBytes(dbDir);
    const [canonical, concurrentCanonical] = await Promise.all([
      postPayload(payload),
      postPayload(payload)
    ]);
    assert.equal(canonical.status, 200);
    assert.equal(concurrentCanonical.status, 200);
    const canonicalBody = await canonical.json() as Record<string, unknown>;
    const concurrentCanonicalBody = await concurrentCanonical.json() as Record<string, unknown>;
    assert.deepEqual(concurrentCanonicalBody, canonicalBody);
    for (const responseBody of [canonicalBody, concurrentCanonicalBody]) {
      assert.equal(responseBody.acknowledgedUserId, student.userId);
      assert.equal(responseBody.durablyPersisted, true);
      const concurrentSession = responseBody.session as Record<string, unknown>;
      assert.equal(concurrentSession.moduleId, payload.moduleId);
      assert.equal(concurrentSession.topicId, payload.topicId);
      assert.equal(concurrentSession.source, payload.source);
      assert.equal(concurrentSession.explored, true);
      assert.match(String(concurrentSession.completedAt), /^\d{4}-\d{2}-\d{2}T/);
      assert.match(String(concurrentSession.updatedAt), /^\d{4}-\d{2}-\d{2}T/);
    }
    assert.equal(
      readDurableStateBytes(dbDir).revision,
      durableBeforeConcurrentRoute.revision + 1,
      "concurrent exact route deliveries must commit only one durable revision"
    );
    assert.deepEqual(Object.keys(canonicalBody).sort(), [
      "acknowledgedUserId",
      "durablyPersisted",
      "session"
    ]);
    assert.equal(canonicalBody.acknowledgedUserId, student.userId);
    assert.equal(canonicalBody.durablyPersisted, true);
    const session = canonicalBody.session as Record<string, unknown>;
    assert.equal(session.moduleId, payload.moduleId);
    assert.equal(session.topicId, payload.topicId);
    assert.equal(session.source, payload.source);
    assert.equal(isVisualizationSessionOutboxAcknowledgement(200, canonicalBody, {
      userId: student.userId,
      moduleId: payload.moduleId,
      topicId: payload.topicId,
      source: payload.source,
      queuedAt: 1
    }), true, "A08 outbox validator must accept the exact server ACK");
    const rewardsAfterCanonical = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsAfterCanonical);
    assert.equal(
      rewardsAfterCanonical.ledger.filter((entry) => entry.reason === "visualization-complete").length,
      1
    );
    const durableBytesBeforeRepeat = readDurableStateBytes(dbDir);

    const repeat = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify(payload)
    }));
    assert.equal(repeat.status, 200);
    assert.deepEqual(await repeat.json(), canonicalBody, "exact duplicate ACK must be byte-value idempotent");
    assert.deepEqual(
      await userStore.getStudentRewardsData(student.userId),
      rewardsAfterCanonical,
      "exact duplicate delivery must not mutate reward state"
    );
    assert.deepEqual(
      readDurableStateBytes(dbDir),
      durableBytesBeforeRepeat,
      "exact duplicate delivery must not rewrite the durable payload or revision"
    );

    const siblingLab = visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "US" &&
      lab.publisher === "US_CA_MATH" &&
      lab.grade === "S4" &&
      lab.labId !== californiaLab.labId
    );
    assert.ok(siblingLab);
    const siblingPayload = {
      moduleId: "configured-visualization-lab",
      topicId: siblingLab.labId,
      source: siblingLab.analyticsSource
    };
    const sibling = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify(siblingPayload)
    }));
    assert.equal(sibling.status, 200);
    const siblingBody = await sibling.json() as {
      acknowledgedUserId?: unknown;
      durablyPersisted?: unknown;
      session?: Record<string, unknown>;
    };
    assert.equal(siblingBody.acknowledgedUserId, student.userId);
    assert.equal(siblingBody.durablyPersisted, true);
    assert.equal(siblingBody.session?.topicId, siblingPayload.topicId);
    const rewardsAfterSibling = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsAfterSibling);
    assert.equal(
      rewardsAfterSibling.ledger.filter((entry) => entry.reason === "visualization-complete").length,
      2,
      "same-module sibling labs must earn independent exact-identity rewards"
    );

    const sessionsResponse = await GET(new Request("https://example.test/api/visualization-sessions", {
      headers: { Cookie: student.cookie }
    }));
    assert.equal(sessionsResponse.status, 200);
    const sessionsBody = await sessionsResponse.json() as {
      sessions?: Array<{ moduleId: string; topicId: string; source: string }>;
    };
    assert.deepEqual(
      sessionsBody.sessions?.map((entry) => ({
        moduleId: entry.moduleId,
        topicId: entry.topicId,
        source: entry.source
      })),
      [payload, siblingPayload]
    );

    const directConcurrentIdentity = {
      userId: student.userId,
      moduleId: `${californiaLab.analyticsSource}:${californiaLab.labId}:${californiaLab.topicId}`,
      topicId: californiaLab.topicId,
      source: californiaLab.analyticsSource
    };
    const durableBeforeDirectConcurrent = readDurableStateBytes(dbDir);
    const rewardsBeforeDirectConcurrent = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsBeforeDirectConcurrent);
    const [directLeft, directRight] = await Promise.all([
      userStore.markVisualizationSession(directConcurrentIdentity),
      userStore.markVisualizationSession(directConcurrentIdentity)
    ]);
    assert.deepEqual(directRight, directLeft);
    for (const directSession of [directLeft, directRight]) {
      assert.equal(directSession.user_id, directConcurrentIdentity.userId);
      assert.equal(directSession.module_id, directConcurrentIdentity.moduleId);
      assert.equal(directSession.topic_id, directConcurrentIdentity.topicId);
      assert.equal(directSession.source, directConcurrentIdentity.source);
      assert.equal(directSession.explored, true);
      assert.match(String(directSession.completed_at), /^\d{4}-\d{2}-\d{2}T/);
      assert.match(String(directSession.updated_at), /^\d{4}-\d{2}-\d{2}T/);
    }
    const durableAfterDirectConcurrent = readDurableStateBytes(dbDir);
    assert.equal(
      durableAfterDirectConcurrent.revision,
      durableBeforeDirectConcurrent.revision + 1,
      "concurrent exact direct calls must commit only one durable revision"
    );
    const rewardsAfterDirectConcurrent = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsAfterDirectConcurrent);
    assert.equal(
      rewardsAfterDirectConcurrent.ledger.filter((entry) => entry.reason === "visualization-complete").length,
      rewardsBeforeDirectConcurrent.ledger.filter((entry) => entry.reason === "visualization-complete").length + 1
    );

    const failedWriteLab = visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "US" &&
      lab.publisher === "US_CA_MATH" &&
      lab.grade === "S4" &&
      lab.labId !== californiaLab.labId &&
      lab.labId !== siblingLab.labId
    );
    assert.ok(failedWriteLab);
    const failedWritePayload = {
      moduleId: "configured-visualization-lab",
      topicId: failedWriteLab.labId,
      source: failedWriteLab.analyticsSource
    };
    const durableBeforeFailedWrite = readDurableStateBytes(dbDir);
    const rewardsBeforeFailedWrite = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsBeforeFailedWrite);
    const lock = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"));
    try {
      lock.exec("BEGIN IMMEDIATE");
      await assert.rejects(
        postPayload(failedWritePayload),
        /database is locked|SQLITE_BUSY/i
      );
      assert.equal(isVisualizationSessionOutboxAcknowledgement(500, {
        error: "Storage unavailable."
      }, {
        userId: student.userId,
        ...failedWritePayload,
        queuedAt: 2
      }), false, "a failed storage write must never be treated as a durable ACK");
    } finally {
      lock.exec("ROLLBACK");
      lock.close();
    }
    assert.deepEqual(
      readDurableStateBytes(dbDir),
      durableBeforeFailedWrite,
      "a failed SQLite write must not leave a durable session or revision"
    );
    assert.deepEqual(
      await userStore.getStudentRewardsData(student.userId),
      rewardsBeforeFailedWrite,
      "a failed SQLite write must not leak its cloned reward mutation into the read cache"
    );

    const replayAfterFailedWrite = await postPayload(failedWritePayload);
    assert.equal(replayAfterFailedWrite.status, 200);
    const replayAfterFailedWriteBody = await replayAfterFailedWrite.json() as Record<string, unknown>;
    assert.equal(isVisualizationSessionOutboxAcknowledgement(200, replayAfterFailedWriteBody, {
      userId: student.userId,
      ...failedWritePayload,
      queuedAt: 2
    }), true);
    assert.equal(
      readDurableStateBytes(dbDir).revision,
      durableBeforeFailedWrite.revision + 1,
      "the retained replay must persist before receiving an exact durable ACK"
    );
    const rewardsAfterFailedWriteReplay = await userStore.getStudentRewardsData(student.userId);
    assert.ok(rewardsAfterFailedWriteReplay);
    assert.equal(
      rewardsAfterFailedWriteReplay.ledger.filter((entry) => entry.reason === "visualization-complete").length,
      rewardsBeforeFailedWrite.ledger.filter((entry) => entry.reason === "visualization-complete").length + 1
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
