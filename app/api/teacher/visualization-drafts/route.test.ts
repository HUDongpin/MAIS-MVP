import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalMathSceneBeatId,
  MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES,
  upgradeMathSceneSpecV1ToPackageV3,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildTrigUnitWaveMathSceneSpec } from "@/components/visualizations/three/manim/mathSceneRegistry";

const envKeys = [
  "AUTH_SESSION_SECRET",
  "HK_MATH_DB_DIR",
  "HK_MATH_DB_PATH",
  "HK_MATH_ENABLE_DEMO_USER",
  "HK_MATH_STORAGE_PROVIDER",
  "MAIS_BOOTSTRAP_ADMIN_EMAIL",
  "MAIS_BOOTSTRAP_ADMIN_PASSWORD",
  "MAIS_BOOTSTRAP_ADMIN_USERNAME",
  "NODE_ENV",
  "POSTGRES_URL"
] as const;

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of envKeys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else Object.assign(process.env, { [key]: value });
  }
}

function scenePackage(): MathScenePackageV3 {
  const scene = buildTrigUnitWaveMathSceneSpec({
    accent: "#38bdf8",
    state: {
      comparison: 7,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 1,
      primaryValue: 6.8,
      secondaryValue: 7.25,
      stateSummary: "bounded API trig draft",
      templateId: "trig-unit-wave",
      value: 6
    }
  });
  return upgradeMathSceneSpecV1ToPackageV3(scene);
}

type StreamStats = {
  pulls: number;
  chunksDelivered: number;
  bytesDelivered: number;
  cancels: number;
  exhausted: boolean;
};

type InstrumentedRequest = Request & { streamStats: StreamStats };

function instrumentedStreamRequest({
  url,
  method,
  chunks,
  headers,
  failAtPull
}: {
  url: string;
  method: string;
  chunks: Uint8Array[];
  headers?: HeadersInit;
  failAtPull?: number;
}): InstrumentedRequest {
  const stats: StreamStats = { pulls: 0, chunksDelivered: 0, bytesDelivered: 0, cancels: 0, exhausted: false };
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      stats.pulls += 1;
      if (failAtPull === stats.pulls) {
        controller.error(new Error("synthetic request stream failure"));
        return;
      }
      const chunk = chunks[index++];
      if (chunk) {
        stats.chunksDelivered += 1;
        stats.bytesDelivered += chunk.byteLength;
        controller.enqueue(chunk);
        return;
      }
      stats.exhausted = true;
      controller.close();
    },
    cancel() {
      stats.cancels += 1;
    }
  }, { highWaterMark: 0 });
  const request = new Request(url, {
    method,
    headers,
    body,
    // Node's fetch implementation requires duplex for streaming request bodies.
    duplex: "half"
  } as RequestInit);
  Object.defineProperty(request, "streamStats", { configurable: true, value: stats });
  return request as InstrumentedRequest;
}

test("teacher visualization draft routes enforce auth, ownership, revisions and safe JSON", async () => {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-viz-drafts-route-"));
  try {
    Object.assign(process.env, { NODE_ENV: "test" });
    process.env.AUTH_SESSION_SECRET = "visualization-draft-route-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "true";
    process.env.MAIS_BOOTSTRAP_ADMIN_EMAIL = "viz-admin@example.test";
    process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD = "admin-test-password";
    process.env.MAIS_BOOTSTRAP_ADMIN_USERNAME = "viz-admin";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    delete process.env.POSTGRES_URL;

    const [{ GET: listDrafts, POST: createDraft }, itemRoute, session, shared] = await Promise.all([
      import("./route"),
      import("./[draftId]/route"),
      import("@/lib/session"),
      import("./_shared")
    ]);
    const { GET: getDraft, PATCH: patchDraft, DELETE: deleteDraft } = itemRoute;

    async function cookieFor(userId: string) {
      const token = await session.createSessionToken(userId);
      return `${session.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
    }

    async function jsonRequest(
      url: string,
      method: string,
      body: unknown,
      userId?: string,
      contentType = "application/json; charset=utf-8",
      contentLength?: string
    ) {
      const bytes = new TextEncoder().encode(typeof body === "string" ? body : JSON.stringify(body));
      return instrumentedStreamRequest({
        url,
        method,
        headers: {
          "Content-Type": contentType,
          ...(contentLength === undefined ? {} : { "Content-Length": contentLength }),
          ...(userId ? { cookie: await cookieFor(userId) } : {})
        },
        chunks: [bytes]
      });
    }

    const forgedPackage = scenePackage();
    forgedPackage.brief.evidenceLevel = "release-ready";
    for (const gateId of ["A06", "A11", "A18", "A22"] as const) {
      forgedPackage.reviewLedger[gateId] = {
        evidenceIds: [`forged-${gateId.toLowerCase()}`],
        status: "passed"
      };
    }
    const payload = { title: "Unit circle to sine", packageJson: forgedPackage };
    const adminId = `admin-${createHash("sha1").update("viz-admin@example.test").digest("hex").slice(0, 16)}`;

    const anonymous = await jsonRequest("http://localhost/api/teacher/visualization-drafts", "POST", payload);
    const anonymousResponse = await createDraft(anonymous);
    assert.equal(anonymousResponse.status, 401);
    assert.equal(anonymous.streamStats.pulls, 0, "anonymous bodies must not be consumed");

    for (const userId of ["student-peter", "parent-peter-family"]) {
      const denied = await jsonRequest("http://localhost/api/teacher/visualization-drafts", "POST", payload, userId);
      const deniedResponse = await createDraft(denied);
      assert.equal(deniedResponse.status, 403);
      assert.equal(denied.streamStats.pulls, 0, `${userId} body must not be consumed before role rejection`);
    }

    const unsupported = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      payload,
      "teacher-ms-chan",
      "text/plain"
    );
    assert.equal((await createDraft(unsupported)).status, 415);
    assert.equal(unsupported.streamStats.pulls, 0);

    const declaredTooLarge = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      payload,
      "teacher-ms-chan",
      "application/json",
      String(shared.teacherVisualizationDraftMaxRequestBytes + 1)
    );
    assert.equal((await createDraft(declaredTooLarge)).status, 413);
    assert.equal(declaredTooLarge.streamStats.pulls, 0, "trusted oversized Content-Length must reject without a pull");

    const malformed = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      "{bad-json",
      "teacher-ms-chan"
    );
    assert.equal((await createDraft(malformed)).status, 400);
    assert.equal(malformed.streamStats.chunksDelivered, 1);
    assert.equal(malformed.streamStats.cancels, 0);

    const oversized = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      `{"padding":"${"x".repeat(shared.teacherVisualizationDraftMaxRequestBytes + 1)}"}`,
      "teacher-ms-chan",
      "application/json",
      "1"
    );
    assert.equal((await createDraft(oversized)).status, 413);
    assert.equal(oversized.streamStats.chunksDelivered, 1);
    assert.equal(oversized.streamStats.cancels, 1, "a lying small Content-Length must still cancel on actual overflow");
    assert.equal(oversized.streamStats.exhausted, false);

    const noLengthOversized = instrumentedStreamRequest({
      url: "http://localhost/api/teacher/visualization-drafts",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: await cookieFor("teacher-ms-chan")
      },
      chunks: [
        new Uint8Array(shared.teacherVisualizationDraftMaxRequestBytes + 1),
        new TextEncoder().encode("must-not-be-drained")
      ]
    });
    assert.equal((await createDraft(noLengthOversized)).status, 413);
    assert.equal(noLengthOversized.streamStats.cancels, 1);
    assert.equal(noLengthOversized.streamStats.exhausted, false);
    assert.ok(noLengthOversized.streamStats.chunksDelivered < 2, "overflow must stop before draining later chunks");

    const serverFieldInjection = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      { ...payload, ownerId: "teacher-other", revision: 99 },
      "teacher-ms-chan"
    );
    assert.equal((await createDraft(serverFieldInjection)).status, 400);
    assert.equal(serverFieldInjection.streamStats.chunksDelivered, 1);

    const unsafePackage = scenePackage() as MathScenePackageV3;
    unsafePackage.audio = {
      contentHash: `sha256-${"a".repeat(64)}`,
      durationSeconds: 4,
      fileName: "/tmp/narration.wav",
      mimeType: "audio/wav",
      source: "local-file"
    };
    const unsafe = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      { title: "Unsafe", packageJson: unsafePackage },
      "teacher-ms-chan"
    );
    assert.equal((await createDraft(unsafe)).status, 400);

    const createRequest = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      payload,
      "teacher-ms-chan"
    );
    const createResponse = await createDraft(createRequest);
    const createBody = await createResponse.json() as {
      draft: Record<string, unknown> & { packageJson: MathScenePackageV3 };
    };
    assert.equal(createResponse.status, 201);
    assert.equal(createRequest.streamStats.chunksDelivered, 1);
    assert.equal(createBody.draft.ownerId, "teacher-ms-chan");
    assert.equal(createBody.draft.revision, 1);
    assert.equal(createBody.draft.packageJson.brief.evidenceLevel, "spec-only");
    assert.deepEqual(createBody.draft.packageJson.reviewLedger, {
      A06: { evidenceIds: [], status: "pending" },
      A11: { evidenceIds: [], status: "pending" },
      A18: { evidenceIds: [], status: "pending" },
      A22: { evidenceIds: [], status: "pending" }
    });
    assert.deepEqual(Object.keys(createBody.draft).sort(), [
      "archivedAt", "createdAt", "id", "ownerId", "packageJson", "revision",
      "schemaVersion", "status", "title", "updatedAt"
    ]);
    const draftId = String(createBody.draft.id);
    const serializedCreate = JSON.stringify(createBody);
    assert.equal(serializedCreate.includes("blob:"), false);
    assert.equal(serializedCreate.includes("data:audio"), false);
    assert.equal(serializedCreate.includes("/tmp/"), false);

    const otherOwnerGet = await getDraft(
      new Request(`http://localhost/api/teacher/visualization-drafts/${draftId}`, {
        headers: { cookie: await cookieFor("teacher-mainland-phoebe") }
      }),
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(otherOwnerGet.status, 404);

    const otherOwnerPatch = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "PATCH",
      { baseRevision: 1, title: "Cross-owner mutation" },
      "teacher-mainland-phoebe"
    );
    assert.equal((await patchDraft(otherOwnerPatch, { params: Promise.resolve({ draftId }) })).status, 404);
    assert.equal(otherOwnerPatch.streamStats.chunksDelivered, 1);

    const otherOwnerDeleteRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      { baseRevision: 1 },
      "teacher-mainland-phoebe"
    );
    const otherOwnerDelete = await deleteDraft(
      otherOwnerDeleteRequest,
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(otherOwnerDelete.status, 404);

    const otherList = await listDrafts(new Request("http://localhost/api/teacher/visualization-drafts", {
      headers: { cookie: await cookieFor("teacher-mainland-phoebe") }
    }));
    assert.deepEqual((await otherList.json() as { drafts: unknown[] }).drafts, []);

    const ownList = await listDrafts(new Request("http://localhost/api/teacher/visualization-drafts", {
      headers: { cookie: await cookieFor("teacher-ms-chan") }
    }));
    assert.equal((await ownList.json() as { drafts: unknown[] }).drafts.length, 1);

    const conflictRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "PATCH",
      { baseRevision: 99, title: "Conflict must not apply" },
      "teacher-ms-chan"
    );
    const conflictResponse = await patchDraft(conflictRequest, { params: Promise.resolve({ draftId }) });
    const conflictBody = await conflictResponse.json() as {
      currentRevision: number;
      serverVersion: Record<string, unknown>;
    };
    assert.equal(conflictResponse.status, 409);
    assert.equal(conflictRequest.streamStats.chunksDelivered, 1);
    assert.equal(conflictBody.currentRevision, 1);
    assert.equal(conflictBody.serverVersion.title, "Unit circle to sine");
    assert.equal(JSON.stringify(conflictBody).includes("Conflict must not apply"), false);

    const patchRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "PATCH",
      { baseRevision: 1, title: "Reviewed sine", status: "ready-for-review" },
      "teacher-ms-chan"
    );
    const patchResponse = await patchDraft(patchRequest, { params: Promise.resolve({ draftId }) });
    const patchBody = await patchResponse.json() as { draft: Record<string, unknown> };
    assert.equal(patchResponse.status, 200);
    assert.equal(patchBody.draft.revision, 2);
    assert.equal(patchBody.draft.status, "ready-for-review");

    const adminGetTeacherDraft = await getDraft(
      new Request(`http://localhost/api/teacher/visualization-drafts/${draftId}`, {
        headers: { cookie: await cookieFor(adminId) }
      }),
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(adminGetTeacherDraft.status, 404);
    const adminPatchTeacherDraft = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "PATCH",
      { baseRevision: 2, title: "Admin must not take ownership" },
      adminId
    );
    assert.equal((await patchDraft(adminPatchTeacherDraft, { params: Promise.resolve({ draftId }) })).status, 404);
    const adminDeleteTeacherDraftRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      { baseRevision: 2 },
      adminId
    );
    const adminDeleteTeacherDraft = await deleteDraft(
      adminDeleteTeacherDraftRequest,
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(adminDeleteTeacherDraft.status, 404);

    const staleArchiveRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      { baseRevision: 1 },
      "teacher-ms-chan"
    );
    const staleArchiveResponse = await deleteDraft(
      staleArchiveRequest,
      { params: Promise.resolve({ draftId }) }
    );
    const staleArchiveBody = await staleArchiveResponse.json() as {
      currentRevision: number;
      serverVersion: Record<string, unknown>;
    };
    assert.equal(staleArchiveResponse.status, 409);
    assert.equal(staleArchiveBody.currentRevision, 2);
    assert.equal(staleArchiveBody.serverVersion.status, "ready-for-review");

    const missingArchiveRevisionRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      {},
      "teacher-ms-chan"
    );
    const missingArchiveRevision = await deleteDraft(
      missingArchiveRevisionRequest,
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(missingArchiveRevision.status, 400);

    const archiveRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      { baseRevision: 2 },
      "teacher-ms-chan"
    );
    const archiveResponse = await deleteDraft(
      archiveRequest,
      { params: Promise.resolve({ draftId }) }
    );
    const archiveBody = await archiveResponse.json() as { draft: Record<string, unknown> };
    assert.equal(archiveResponse.status, 200);
    assert.equal(archiveBody.draft.status, "archived");
    assert.equal(archiveBody.draft.revision, 3);

    const archiveAgainRequest = await jsonRequest(
      `http://localhost/api/teacher/visualization-drafts/${draftId}`,
      "DELETE",
      { baseRevision: 3 },
      "teacher-ms-chan"
    );
    const archiveAgain = await deleteDraft(
      archiveAgainRequest,
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(archiveAgain.status, 200);
    assert.equal((await archiveAgain.json() as { draft: Record<string, unknown> }).draft.revision, 3);

    const archivedGet = await getDraft(
      new Request(`http://localhost/api/teacher/visualization-drafts/${draftId}`, {
        headers: { cookie: await cookieFor("teacher-ms-chan") }
      }),
      { params: Promise.resolve({ draftId }) }
    );
    assert.equal(archivedGet.status, 404);

    const adminRequest = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      { title: "Admin-owned draft", packageJson: scenePackage() },
      adminId
    );
    const adminResponse = await createDraft(adminRequest);
    assert.equal(adminResponse.status, 201);
    assert.equal((await adminResponse.json() as { draft: { ownerId: string } }).draft.ownerId, adminId);

    const maxBytes = shared.teacherVisualizationDraftMaxRequestBytes;
    const nearLimitPackage = scenePackage();
    const captionCount = 100;
    const firstBeatDuration = nearLimitPackage.scene.timeline[0]?.duration ?? 0;
    assert.ok(firstBeatDuration > 0);
    nearLimitPackage.captions = Array.from({ length: captionCount }, (_, cueIndex) => ({
      beatId: canonicalMathSceneBeatId(0),
      beatIndex: 0,
      conceptId: "unit-circle",
      startSeconds: (firstBeatDuration * cueIndex) / captionCount,
      endSeconds: (firstBeatDuration * (cueIndex + 1)) / captionCount,
      text: { en: "x", zh: "x", zhHans: "x" }
    }));
    const targetPackageBytes = MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES;
    for (const cue of nearLimitPackage.captions) {
      for (const locale of ["en", "zh", "zhHans"] as const) {
        const currentBytes = new TextEncoder().encode(JSON.stringify(nearLimitPackage)).byteLength;
        const growth = Math.min(4_095, targetPackageBytes - currentBytes);
        if (growth > 0) cue.text[locale] = "x".repeat(growth + 1);
      }
    }
    const serializedNearLimitPackageBytes = new TextEncoder()
      .encode(JSON.stringify(nearLimitPackage)).byteLength;
    assert.equal(serializedNearLimitPackageBytes, targetPackageBytes);
    const nearLimitPayload = { title: "Near-limit valid draft", packageJson: nearLimitPackage };
    const serializedNearLimitRequestBytes = new TextEncoder()
      .encode(JSON.stringify(nearLimitPayload)).byteLength;
    assert.ok(
      serializedNearLimitRequestBytes > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES,
      "the JSON envelope must exceed the package-only limit"
    );
    assert.ok(serializedNearLimitRequestBytes <= maxBytes, "the compact JSON envelope must remain bounded");
    const nearLimitRequest = await jsonRequest(
      "http://localhost/api/teacher/visualization-drafts",
      "POST",
      nearLimitPayload,
      "teacher-ms-chan"
    );
    const nearLimitResponse = await createDraft(nearLimitRequest);
    const nearLimitResponseBody = await nearLimitResponse.clone().json();
    assert.equal(
      nearLimitResponse.status,
      201,
      `a valid 1 MiB package must survive its bounded API envelope: ${JSON.stringify(nearLimitResponseBody)}`
    );

    const prefix = new TextEncoder().encode('{"value":"');
    const suffix = new TextEncoder().encode('"}');
    function boundaryJsonRequest(totalBytes: number, includeMultibyte = false) {
      const multibyte = includeMultibyte ? new TextEncoder().encode("漢") : new Uint8Array();
      const fillerLength = totalBytes - prefix.byteLength - suffix.byteLength - multibyte.byteLength;
      assert.ok(fillerLength >= 0);
      return instrumentedStreamRequest({
        url: "http://localhost/internal-boundary-probe",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        chunks: [prefix, new Uint8Array(fillerLength).fill(0x61), multibyte, suffix]
      });
    }

    for (const totalBytes of [maxBytes - 1, maxBytes]) {
      const boundary = boundaryJsonRequest(totalBytes, totalBytes === maxBytes);
      const result = await shared.readStrictTeacherVisualizationDraftJson(boundary);
      assert.equal(result.response, undefined, `raw JSON at ${totalBytes} UTF-8 bytes should be accepted`);
      assert.equal(boundary.streamStats.bytesDelivered, totalBytes);
      assert.equal(boundary.streamStats.cancels, 0);
    }
    const overBoundary = instrumentedStreamRequest({
      url: "http://localhost/internal-boundary-probe",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      chunks: [new Uint8Array(maxBytes + 1), new TextEncoder().encode("must-not-be-drained")]
    });
    const overResult = await shared.readStrictTeacherVisualizationDraftJson(overBoundary);
    assert.equal(overResult.response?.status, 413);
    assert.equal(overBoundary.streamStats.cancels, 1);

    const invalidUtf8 = instrumentedStreamRequest({
      url: "http://localhost/invalid-utf8",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      chunks: [new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])]
    });
    assert.equal((await shared.readStrictTeacherVisualizationDraftJson(invalidUtf8)).response?.status, 400);

    const brokenStream = instrumentedStreamRequest({
      url: "http://localhost/broken-stream",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      chunks: [prefix],
      failAtPull: 2
    });
    assert.equal((await shared.readStrictTeacherVisualizationDraftJson(brokenStream)).response?.status, 400);

    const packageTooLarge = scenePackage() as MathScenePackageV3;
    packageTooLarge.brief.courseGoal = "x".repeat(maxBytes);
    assert.equal(shared.parseTeacherVisualizationDraftPackage(packageTooLarge).response?.status, 413);
  } finally {
    restoreEnv(previous);
    await rm(dbDir, { force: true, recursive: true });
  }
});
