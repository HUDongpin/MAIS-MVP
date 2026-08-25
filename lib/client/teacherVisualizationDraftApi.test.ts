import assert from "node:assert/strict";
import test from "node:test";

import type { TeacherVisualizationDraftRecord } from "@/types";
import { createGoldenTrigVisualizationAuthoringState } from "./teacherVisualizationAuthoringModel";
import {
  archiveTeacherVisualizationDraft,
  createTeacherVisualizationDraft,
  listTeacherVisualizationDrafts,
  patchTeacherVisualizationDraft
} from "./teacherVisualizationDraftApi";

function record(revision = 1): TeacherVisualizationDraftRecord {
  const starter = createGoldenTrigVisualizationAuthoringState("teacher-1");
  return {
    id: "draft-1",
    ownerId: "teacher-1",
    title: starter.title,
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision,
    packageJson: starter.packageJson,
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    archivedAt: null
  };
}

test("draft API client sends owner-scoped same-origin JSON and parses list/create", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    if (init?.method === "POST") return Response.json({ draft: record() }, { status: 201 });
    return Response.json({ drafts: [record()] });
  };
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");

  const listed = await listTeacherVisualizationDrafts({ fetchImpl });
  const created = await createTeacherVisualizationDraft({
    fetchImpl,
    title: state.title,
    packageJson: state.packageJson,
    status: "editing"
  });

  assert.equal(listed.ok, true);
  assert.equal(created.ok, true);
  assert.equal(String(calls[0]?.input), "/api/teacher/visualization-drafts");
  assert.equal(calls[0]?.init?.credentials, "same-origin");
  assert.equal(calls[1]?.init?.method, "POST");
  assert.equal(new Headers(calls[1]?.init?.headers).get("content-type"), "application/json");
});

test("PATCH includes baseRevision and returns a typed conflict without retrying", async () => {
  const serverVersion = record(8);
  let callCount = 0;
  let sentBody = "";
  const fetchImpl: typeof fetch = async (_input, init) => {
    callCount += 1;
    sentBody = String(init?.body ?? "");
    return Response.json(
      { error: "revision-conflict", currentRevision: 8, serverVersion },
      { status: 409 }
    );
  };
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");

  const result = await patchTeacherVisualizationDraft({
    draftId: "draft-1",
    baseRevision: 7,
    fetchImpl,
    title: state.title,
    packageJson: state.packageJson,
    status: "editing"
  });

  assert.equal(callCount, 1);
  assert.equal(JSON.parse(sentBody).baseRevision, 7);
  assert.equal(result.ok, false);
  assert.equal(result.kind, "conflict");
  if (result.kind === "conflict") assert.equal(result.conflict.currentRevision, 8);
});

test("metadata-only PATCH omits packageJson so server-owned gate evidence is not reset", async () => {
  let sentBody: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (_input, init) => {
    sentBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    const response = record(8);
    response.title = "Metadata title";
    return Response.json({ draft: response });
  };

  const result = await patchTeacherVisualizationDraft({
    draftId: "draft-1",
    baseRevision: 7,
    fetchImpl,
    title: "Metadata title",
    status: "editing"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(sentBody, {
    baseRevision: 7,
    status: "editing",
    title: "Metadata title"
  });
  assert.equal("packageJson" in sentBody, false);
});

test("archive sends baseRevision and returns the server revision conflict without retrying", async () => {
  const serverVersion = record(9);
  let sentBody: Record<string, unknown> = {};
  let callCount = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    callCount += 1;
    sentBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return Response.json(
      { error: "revision-conflict", currentRevision: 9, serverVersion },
      { status: 409 }
    );
  };

  const result = await archiveTeacherVisualizationDraft({
    baseRevision: 8,
    draftId: "draft-1",
    fetchImpl
  });

  assert.equal(callCount, 1);
  assert.deepEqual(sentBody, { baseRevision: 8 });
  assert.equal(result.ok, false);
  assert.equal(result.kind, "conflict");
  if (result.kind === "conflict") assert.equal(result.conflict.currentRevision, 9);
});

test("API client rejects a superficially versioned but structurally invalid package", async () => {
  const invalid = record();
  invalid.packageJson = { schemaVersion: "mais-manim-scene-package/v3" } as typeof invalid.packageJson;
  const fetchImpl: typeof fetch = async () => Response.json({ drafts: [invalid] });

  const result = await listTeacherVisualizationDrafts({ fetchImpl });

  assert.equal(result.ok, false);
  assert.equal(result.kind, "invalid-response");
});
