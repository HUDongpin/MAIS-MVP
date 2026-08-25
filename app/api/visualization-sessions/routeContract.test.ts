import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { visualizationLabCatalog } from "@/data/visualizationLabs";
import {
  isEligibleVisualizationSession,
  isVisualizationSessionEligibleForLearner
} from "@/lib/server/visualizationSessionEligibility";
import { isCanonicalVisualizationSessionIdentity } from "@/lib/visualizationSessionContract";
import { MAX_VISUALIZATION_SESSION_REQUEST_BYTES } from "@/lib/visualizationSessionRequestBody";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function readDurableVisualizationState(dbDir: string) {
  const sqlite = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    } | undefined;
    assert.ok(row);
    return JSON.parse(row.payload) as {
      reward_point_ledger?: Array<{ reason?: string; student_id?: string }>;
      visualization_sessions?: Array<{ module_id?: string; topic_id?: string; user_id?: string }>;
    };
  } finally {
    sqlite.close();
  }
}

test("visualization session identity accepts the length boundary but eligibility is catalog-exact", () => {
  assert.equal(isCanonicalVisualizationSessionIdentity("x".repeat(256)), true);
  assert.equal(isCanonicalVisualizationSessionIdentity("x".repeat(257)), false);

  for (const catalogLab of visualizationLabCatalog) {
    const catalogModuleId = `${catalogLab.analyticsSource}:${catalogLab.labId}:${catalogLab.topicId}`;
    assert.equal(isCanonicalVisualizationSessionIdentity(catalogModuleId), true, catalogLab.labId);
    assert.equal(isEligibleVisualizationSession({
      moduleId: catalogModuleId,
      topicId: catalogLab.topicId,
      source: catalogLab.analyticsSource
    }), true, catalogLab.labId);
    assert.equal(isEligibleVisualizationSession({
      moduleId: "configured-visualization-lab",
      topicId: catalogLab.labId,
      source: catalogLab.analyticsSource
    }), true, `LessonView identity missing for ${catalogLab.labId}`);
  }

  const lab = visualizationLabCatalog[0];
  assert.ok(lab);
  const tuple = {
    moduleId: `${lab.analyticsSource}:${lab.labId}:${lab.topicId}`,
    topicId: lab.topicId,
    source: lab.analyticsSource
  };
  assert.equal(isEligibleVisualizationSession(tuple), true);
  assert.equal(isEligibleVisualizationSession({ ...tuple, topicId: `${tuple.topicId}-forged` }), false);
  assert.equal(isEligibleVisualizationSession({ ...tuple, moduleId: `${tuple.moduleId}-forged` }), false);
  assert.equal(isEligibleVisualizationSession({ ...tuple, source: "learning-path" }), false);
});

test("visualization session eligibility uses authenticated grade, track, region, and publisher", () => {
  const hkLab = visualizationLabCatalog.find((lab) => lab.curriculumTrack === "HK" && lab.grade === "S3");
  const mainlandLab = visualizationLabCatalog.find((lab) =>
    lab.curriculumTrack === "MAINLAND_PEP_PRIMARY" && lab.grade === "P1"
  );
  assert.ok(hkLab);
  assert.ok(mainlandLab);
  const hkLearner = {
    grade: "S3" as const,
    curriculumTrack: "HK" as const,
    curriculumProfile: {
      region: "HK" as const,
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" as const
    }
  };
  assert.equal(isVisualizationSessionEligibleForLearner({
    moduleId: "configured-visualization-lab",
    topicId: hkLab.labId,
    source: hkLab.analyticsSource
  }, hkLearner), true);
  assert.equal(isVisualizationSessionEligibleForLearner({
    moduleId: `${mainlandLab.analyticsSource}:${mainlandLab.labId}:${mainlandLab.topicId}`,
    topicId: mainlandLab.topicId,
    source: mainlandLab.analyticsSource
  }, hkLearner), false);
});

test("visualization sessions are student-only and reject non-canonical or oversized identities before writing", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const previousPostgresUrl = process.env.POSTGRES_URL;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-visualization-session-route-"));

  try {
    process.env.AUTH_SESSION_SECRET = "visualization-session-route-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const [{ GET, POST }, registerRoute] = await Promise.all([
      import("./route"),
      import("@/app/api/auth/register/route")
    ]);
    async function register(role: "student" | "teacher", suffix: string) {
      const response = await registerRoute.POST(new Request("https://example.test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: `${role} visualization route`,
          username: `${role}-${suffix}@example.test`,
          email: `${role}-${suffix}@example.test`,
          password: "start12345",
          grade: "S3",
          curriculumTrack: "HK",
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
    const teacherHeaders = {
      Cookie: teacher.cookie,
      "Content-Type": "application/json",
      "X-MAIS-Visualization-User-Id": encodeURIComponent(teacher.userId)
    };
    const teacherPost = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: teacherHeaders,
      body: JSON.stringify({
        moduleId: "must-not-write",
        topicId: "must-not-write",
        source: "visualization-lab"
      })
    }));
    assert.equal(teacherPost.status, 403);
    assert.deepEqual(await teacherPost.json(), {
      error: "Student access required.",
      reason: "student-only"
    });
    const teacherGet = await GET(new Request("https://example.test/api/visualization-sessions", {
      headers: { Cookie: teacher.cookie }
    }));
    assert.equal(teacherGet.status, 403);

    const studentHeaders = {
      Cookie: student.cookie,
      "Content-Type": "application/json",
      "X-MAIS-Visualization-User-Id": encodeURIComponent(student.userId)
    };
    const allowedLab = visualizationLabCatalog.find((lab) => lab.curriculumTrack === "HK" && lab.grade === "S3")
      ?? visualizationLabCatalog[0];
    assert.ok(allowedLab);
    const allowedModuleId = `${allowedLab.analyticsSource}:${allowedLab.labId}:${allowedLab.topicId}`;
    const anonymous = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: "anonymous-must-not-write",
        topicId: "anonymous-must-not-write",
        source: "visualization-lab"
      })
    }));
    assert.equal(anonymous.status, 401);

    for (const ownerHeader of [undefined, "%", encodeURIComponent(teacher.userId)]) {
      const headers = new Headers({
        Cookie: student.cookie,
        "Content-Type": "application/json"
      });
      if (ownerHeader !== undefined) {
        headers.set("X-MAIS-Visualization-User-Id", ownerHeader);
      }
      const response = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          moduleId: "owner-mismatch-must-not-write",
          topicId: "owner-mismatch-must-not-write",
          source: "visualization-lab"
        })
      }));
      assert.equal(response.status, 409, `must reject owner header ${JSON.stringify(ownerHeader)}`);
    }

    const validMembers = {
      moduleId: JSON.stringify(allowedModuleId),
      topicId: JSON.stringify(allowedLab.topicId),
      source: JSON.stringify(allowedLab.analyticsSource)
    };
    const keyOrders = [
      ["moduleId", "topicId", "source"],
      ["moduleId", "source", "topicId"],
      ["topicId", "moduleId", "source"],
      ["topicId", "source", "moduleId"],
      ["source", "moduleId", "topicId"],
      ["source", "topicId", "moduleId"]
    ] as const;
    const duplicateBodies = keyOrders.flatMap((keyOrder) => {
      const canonicalMembers = keyOrder.map((key) => `"${key}":${validMembers[key]}`);
      return keyOrder.flatMap((duplicateKey) => [
        `{ "${duplicateKey}" : "forged" , ${canonicalMembers.join(" , ")} }`,
        `{ ${canonicalMembers.join(" , ")} , "${duplicateKey}" : "forged" }`
      ]);
    });
    assert.equal(duplicateBodies.length, 36);
    for (const body of duplicateBodies) {
      const rejected = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body
      }));
      assert.equal(rejected.status, 400);
      assert.deepEqual(await rejected.json(), { error: "Invalid JSON body." });
    }

    const truncatedAfterFinalComma = `{"moduleId":${validMembers.moduleId},"topicId":${validMembers.topicId},"source":${validMembers.source},`;
    const truncated = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: truncatedAfterFinalComma
    }));
    assert.equal(truncated.status, 400, "EOF after a final member comma must fail closed");
    assert.deepEqual(await truncated.json(), { error: "Invalid JSON body." });
    const afterTruncatedBody = readDurableVisualizationState(dbDir);
    assert.equal(
      afterTruncatedBody.visualization_sessions?.some((session) => session.user_id === student.userId),
      false,
      "a truncated authenticated request must not persist a visualization session"
    );
    assert.equal(
      afterTruncatedBody.reward_point_ledger?.some((entry) =>
        entry.student_id === student.userId && entry.reason === "visualization-complete"
      ),
      false,
      "a truncated authenticated request must not earn a visualization reward"
    );

    const compactAllowedBody = JSON.stringify({
      moduleId: allowedModuleId,
      topicId: allowedLab.topicId,
      source: allowedLab.analyticsSource
    });
    const oversizedBody = compactAllowedBody + " ".repeat(
      MAX_VISUALIZATION_SESSION_REQUEST_BYTES + 1 - new TextEncoder().encode(compactAllowedBody).byteLength
    );
    const malformedBodies: BodyInit[] = [
      oversizedBody,
      `${compactAllowedBody} trailing`,
      JSON.stringify({ moduleId: allowedModuleId, topicId: allowedLab.topicId }),
      JSON.stringify({ moduleId: allowedModuleId, topicId: allowedLab.topicId, source: { nested: "geometry" } }),
      new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(compactAllowedBody)]),
      new Uint8Array([0x7b, 0x22, 0x6d, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])
    ];
    for (const body of malformedBodies) {
      const rejected = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body
      }));
      assert.equal(rejected.status, 400);
      assert.deepEqual(await rejected.json(), { error: "Invalid JSON body." });
    }
    const afterMalformedBodies = readDurableVisualizationState(dbDir);
    assert.equal(
      afterMalformedBodies.visualization_sessions?.some((session) => session.user_id === student.userId),
      false,
      "raw-body rejects must not persist a visualization session"
    );
    assert.equal(
      afterMalformedBodies.reward_point_ledger?.some((entry) =>
        entry.student_id === student.userId && entry.reason === "visualization-complete"
      ),
      false,
      "raw-body rejects must not earn a visualization reward"
    );

    for (const [moduleId, topicId] of [
      ["", "topic"],
      ["   ", "topic"],
      [" module", "topic"],
      ["module", ""],
      ["module", "\n\t"],
      ["module", "topic "],
      ["x".repeat(257), "topic"],
      ["module", "x".repeat(257)]
    ]) {
      const response = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ moduleId, topicId, source: "visualization-lab" })
      }));
      assert.equal(response.status, 400, `must reject module=${JSON.stringify(moduleId)} topic=${JSON.stringify(topicId)}`);
    }

    for (const forged of [
      { moduleId: "fabricated-a", topicId: "fabricated-topic-a", source: "visualization-lab" },
      { moduleId: "fabricated-b", topicId: "fabricated-topic-b", source: "geometry" },
      { moduleId: "m".repeat(256), topicId: "t".repeat(256), source: "visualization-lab" }
    ]) {
      const rejected = await POST(new Request("https://example.test/api/visualization-sessions", {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify(forged)
      }));
      assert.equal(rejected.status, 400);
      assert.deepEqual(await rejected.json(), {
        error: "Unknown visualization session identity.",
        reason: "unknown-visualization-session"
      });
    }
    const beforeAllowed = readDurableVisualizationState(dbDir);
    assert.equal(
      beforeAllowed.visualization_sessions?.some((session) => session.user_id === student.userId),
      false,
      "fabricated catalog tuples must not persist sessions"
    );
    assert.equal(
      beforeAllowed.reward_point_ledger?.some((entry) =>
        entry.student_id === student.userId && entry.reason === "visualization-complete"
      ),
      false,
      "fabricated catalog tuples must not earn completion rewards"
    );

    const forbiddenMainlandLab = visualizationLabCatalog.find((lab) =>
      lab.curriculumTrack === "MAINLAND_PEP_PRIMARY" && lab.grade === "P1"
    );
    assert.ok(forbiddenMainlandLab);
    const forbiddenModuleId = `${forbiddenMainlandLab.analyticsSource}:${forbiddenMainlandLab.labId}:${forbiddenMainlandLab.topicId}`;
    const crossCurriculum = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({
        moduleId: forbiddenModuleId,
        topicId: forbiddenMainlandLab.topicId,
        source: forbiddenMainlandLab.analyticsSource
      })
    }));
    assert.equal(crossCurriculum.status, 403);
    assert.deepEqual(await crossCurriculum.json(), {
      error: "Visualization is outside the authenticated learner curriculum.",
      reason: "curriculum-scope-mismatch"
    });
    const afterCrossCurriculum = readDurableVisualizationState(dbDir);
    assert.equal(
      afterCrossCurriculum.visualization_sessions?.some((session) =>
        session.user_id === student.userId && session.module_id === forbiddenModuleId
      ),
      false
    );
    assert.equal(
      afterCrossCurriculum.reward_point_ledger?.some((entry) =>
        entry.student_id === student.userId && entry.reason === "visualization-complete"
      ),
      false,
      "a cross-curriculum tuple must not earn a visualization reward"
    );

    const staleRequest = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({
        moduleId: allowedModuleId,
        topicId: allowedLab.topicId,
        source: allowedLab.analyticsSource,
        explored: true
      })
    }));
    assert.equal(staleRequest.status, 400, "the persistence request must have exactly three keys");

    const exactBoundaryBody = compactAllowedBody + " ".repeat(
      MAX_VISUALIZATION_SESSION_REQUEST_BYTES - new TextEncoder().encode(compactAllowedBody).byteLength
    );
    assert.equal(new TextEncoder().encode(exactBoundaryBody).byteLength, MAX_VISUALIZATION_SESSION_REQUEST_BYTES);
    const canonical = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: exactBoundaryBody
    }));
    assert.equal(canonical.status, 200);
    const canonicalBody = await canonical.json() as {
      acknowledgedUserId?: unknown;
      durablyPersisted?: unknown;
      session?: Record<string, unknown>;
    };
    assert.deepEqual(Object.keys(canonicalBody).sort(), [
      "acknowledgedUserId",
      "durablyPersisted",
      "session"
    ]);
    assert.equal(canonicalBody.acknowledgedUserId, student.userId);
    assert.equal(canonicalBody.durablyPersisted, true);
    assert.deepEqual(Object.keys(canonicalBody.session ?? {}).sort(), [
      "completedAt",
      "explored",
      "moduleId",
      "source",
      "topicId",
      "updatedAt"
    ]);
    assert.equal(canonicalBody.session?.moduleId, allowedModuleId);
    assert.equal(canonicalBody.session?.topicId, allowedLab.topicId);
    assert.equal(canonicalBody.session?.source, allowedLab.analyticsSource);
    assert.equal(canonicalBody.session?.explored, true);

    const lessonModuleId = "configured-visualization-lab";
    const lesson = await POST(new Request("https://example.test/api/visualization-sessions", {
      method: "POST",
      headers: studentHeaders,
      body: JSON.stringify({
        moduleId: lessonModuleId,
        topicId: allowedLab.labId,
        source: allowedLab.analyticsSource
      })
    }));
    assert.equal(lesson.status, 200, "the exact LessonView tuple must persist");
    const sessions = await GET(new Request("https://example.test/api/visualization-sessions", {
      headers: { Cookie: student.cookie }
    }));
    assert.equal(sessions.status, 200);
    const sessionsBody = await sessions.json() as {
      sessions?: Array<{ moduleId: string; topicId: string }>;
    };
    assert.deepEqual(
      sessionsBody.sessions?.map((session) => ({ moduleId: session.moduleId, topicId: session.topicId })),
      [
        { moduleId: allowedModuleId, topicId: allowedLab.topicId },
        { moduleId: lessonModuleId, topicId: allowedLab.labId }
      ]
    );
    assert.equal(
      sessionsBody.sessions?.some((session) => session.moduleId.includes("must-not-write")),
      false,
      "unauthenticated, non-student, and identity-mismatched requests must not create visualization sessions"
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
