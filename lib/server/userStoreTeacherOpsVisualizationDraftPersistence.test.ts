import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsVisualizationDraftPersistenceStore,
  normalizeTeacherVisualizationDraftRecords,
  type TeacherOpsVisualizationDraftPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsVisualizationDraftPersistence";
import {
  upgradeMathSceneSpecV1ToPackageV3,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildTrigUnitWaveMathSceneSpec } from "@/components/visualizations/three/manim/mathSceneRegistry";

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
      stateSummary: "bounded trig draft",
      templateId: "trig-unit-wave",
      value: 6
    }
  });
  return upgradeMathSceneSpecV1ToPackageV3(scene, {
    audio: {
      contentHash: `sha256-${"a".repeat(64)}`,
      durationSeconds: 8,
      fileName: "narration.wav",
      mimeType: "audio/wav",
      source: "local-file"
    }
  });
}

function forgedReleaseReadyPackage(): MathScenePackageV3 {
  const packageJson = scenePackage();
  packageJson.brief.evidenceLevel = "release-ready";
  for (const gateId of ["A06", "A11", "A18", "A22"] as const) {
    packageJson.reviewLedger[gateId] = {
      evidenceIds: [`forged-${gateId.toLowerCase()}`],
      status: "passed"
    };
  }
  return packageJson;
}

function database(): TeacherOpsVisualizationDraftPersistenceDatabase {
  return { teacher_visualization_drafts: [] };
}

function store(databaseValue = database(), nowValues?: Date[]) {
  let id = 0;
  let nowTick = 0;
  let nowIndex = 0;
  return {
    database: databaseValue,
    store: createTeacherOpsVisualizationDraftPersistenceStore({
      createId: () => `uuid-${++id}`,
      now: () => nowValues?.[Math.min(nowIndex++, nowValues.length - 1)]
        ?? new Date(Date.UTC(2026, 7, 23, 10, 0, nowTick++)),
      readDatabase: async () => databaseValue,
      mutateDatabase: async (mutator) => mutator(databaseValue)
    })
  };
}

function exactRecordKeys(value: Record<string, unknown>) {
  assert.deepEqual(Object.keys(value).sort(), [
    "archivedAt",
    "createdAt",
    "id",
    "ownerId",
    "packageJson",
    "revision",
    "schemaVersion",
    "status",
    "title",
    "updatedAt"
  ]);
}

test("visualization draft persistence does not import the legacy root store", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsVisualizationDraftPersistence.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
  assert.doesNotMatch(source, /\b(?:eval|Function)\s*\(/);
  assert.doesNotMatch(source, /\b(?:import|require)\s*\(/);
});

test("create owns all server fields, validates and detaches the package", async () => {
  const fixture = store();
  const input = forgedReleaseReadyPackage();
  const result = await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "  Unit circle to sine  ",
    packageJson: input
  });

  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  exactRecordKeys(result.draft as unknown as Record<string, unknown>);
  assert.equal(result.draft.id, "visualization-draft-uuid-1");
  assert.equal(result.draft.ownerId, "teacher-1");
  assert.equal(result.draft.title, "Unit circle to sine");
  assert.equal(result.draft.schemaVersion, "mais-manim-scene-package/v3");
  assert.equal(result.draft.status, "editing");
  assert.equal(result.draft.revision, 1);
  assert.equal(result.draft.archivedAt, null);
  assert.notStrictEqual(result.draft.packageJson, input);
  assert.equal(result.draft.packageJson.brief.evidenceLevel, "spec-only");
  assert.deepEqual(result.draft.packageJson.reviewLedger, {
    A06: { evidenceIds: [], status: "pending" },
    A11: { evidenceIds: [], status: "pending" },
    A18: { evidenceIds: [], status: "pending" },
    A22: { evidenceIds: [], status: "pending" }
  });
  input.brief.courseGoal = "mutated after save";
  assert.notEqual(result.draft.packageJson.brief.courseGoal, input.brief.courseGoal);
  assert.equal(fixture.database.teacher_visualization_drafts.length, 1);
  assert.equal(JSON.stringify(result.draft).includes("blob:"), false);
  assert.equal(JSON.stringify(result.draft).includes("data:audio"), false);
});

test("create rejects invalid titles and packages without mutating", async () => {
  const fixture = store();
  const invalidPackage = { ...scenePackage(), schemaVersion: "wrong" };
  assert.equal((await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "   ",
    packageJson: scenePackage()
  })).status, "invalid");
  assert.equal((await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "x".repeat(161),
    packageJson: scenePackage()
  })).status, "invalid");
  assert.equal((await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "Unsafe",
    packageJson: invalidPackage as MathScenePackageV3
  })).status, "invalid-package");
  assert.equal(fixture.database.teacher_visualization_drafts.length, 0);
});

test("list and get are owner scoped, exclude archived records and return detached copies", async () => {
  const fixture = store();
  const first = await fixture.store.createTeacherVisualizationDraft({ ownerId: "teacher-1", title: "First", packageJson: scenePackage() });
  const second = await fixture.store.createTeacherVisualizationDraft({ ownerId: "teacher-1", title: "Second", packageJson: scenePackage() });
  const other = await fixture.store.createTeacherVisualizationDraft({ ownerId: "teacher-2", title: "Other", packageJson: scenePackage() });
  assert.equal(first.status, "created");
  assert.equal(second.status, "created");
  assert.equal(other.status, "created");
  if (first.status !== "created" || second.status !== "created" || other.status !== "created") return;

  assert.equal((await fixture.store.getTeacherVisualizationDraft({ ownerId: "teacher-2", draftId: first.draft.id })).status, "not-found");
  const list = await fixture.store.listTeacherVisualizationDrafts("teacher-1");
  assert.deepEqual(list.map((draft) => draft.id), [second.draft.id, first.draft.id]);
  list[0]!.title = "client mutation";
  const reread = await fixture.store.getTeacherVisualizationDraft({ ownerId: "teacher-1", draftId: second.draft.id });
  assert.equal(reread.status, "found");
  if (reread.status === "found") assert.equal(reread.draft.title, "Second");
});

test("revision updates are atomic and content changes default back to editing", async () => {
  const fixture = store();
  const created = await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "Draft",
    packageJson: scenePackage(),
    status: "ready-for-review"
  });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const changedPackage = forgedReleaseReadyPackage();
  changedPackage.brief.courseGoal = "A revised bounded goal";
  const saved = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 1,
    packageJson: changedPackage
  });
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.equal(saved.draft.revision, 2);
  assert.equal(saved.draft.status, "editing");
  assert.equal(saved.draft.packageJson.brief.courseGoal, "A revised bounded goal");
  assert.equal(saved.draft.packageJson.brief.evidenceLevel, "spec-only");
  assert.deepEqual(saved.draft.packageJson.reviewLedger, {
    A06: { evidenceIds: [], status: "pending" },
    A11: { evidenceIds: [], status: "pending" },
    A18: { evidenceIds: [], status: "pending" },
    A22: { evidenceIds: [], status: "pending" }
  });

  const beforeConflict = JSON.stringify(fixture.database.teacher_visualization_drafts[0]);
  const conflict = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 1,
    title: "Must not partially apply",
    status: "ready-for-review"
  });
  assert.equal(conflict.status, "conflict");
  if (conflict.status === "conflict") {
    assert.equal(conflict.currentRevision, 2);
    assert.equal(conflict.serverVersion.title, "Draft");
    exactRecordKeys(conflict.serverVersion as unknown as Record<string, unknown>);
  }
  assert.equal(JSON.stringify(fixture.database.teacher_visualization_drafts[0]), beforeConflict);

  const explicitReady = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 2,
    packageJson: scenePackage(),
    status: "ready-for-review"
  });
  assert.equal(explicitReady.status, "saved");
  if (explicitReady.status === "saved") assert.equal(explicitReady.draft.status, "ready-for-review");
});

test("metadata-only updates preserve server-owned review evidence", async () => {
  const fixture = store();
  const created = await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "Reviewed draft",
    packageJson: scenePackage()
  });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const stored = fixture.database.teacher_visualization_drafts[0]!;
  stored.packageJson = forgedReleaseReadyPackage();
  const renamed = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 1,
    title: "Reviewed draft renamed"
  });

  assert.equal(renamed.status, "saved");
  if (renamed.status !== "saved") return;
  assert.equal(renamed.draft.packageJson.brief.evidenceLevel, "release-ready");
  assert.equal(renamed.draft.packageJson.reviewLedger.A18.status, "passed");
  assert.deepEqual(renamed.draft.packageJson.reviewLedger.A18.evidenceIds, ["forged-a18"]);
});

test("an unchanged full-package save preserves server evidence but never trusts incoming evidence", async () => {
  const fixture = store();
  const created = await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "Reviewed draft",
    packageJson: scenePackage()
  });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const stored = fixture.database.teacher_visualization_drafts[0]!;
  stored.packageJson = forgedReleaseReadyPackage();
  stored.packageJson.reviewLedger.A18.evidenceIds = ["server-a18-review"];
  const clientEcho = forgedReleaseReadyPackage();
  clientEcho.reviewLedger.A18.evidenceIds = ["client-forgery"];

  const saved = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 1,
    packageJson: clientEcho,
    title: "Reviewed draft renamed"
  });

  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.equal(saved.draft.packageJson.brief.evidenceLevel, "release-ready");
  assert.deepEqual(saved.draft.packageJson.reviewLedger.A18.evidenceIds, ["server-a18-review"]);
});

test("cross-owner update is hidden and archive is soft, owner scoped and revision guarded", async () => {
  const fixture = store();
  const created = await fixture.store.createTeacherVisualizationDraft({ ownerId: "teacher-1", title: "Draft", packageJson: scenePackage() });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  assert.equal((await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-2", draftId: created.draft.id, baseRevision: 1, title: "steal"
  })).status, "not-found");
  assert.equal((await fixture.store.archiveTeacherVisualizationDraft({
    ownerId: "teacher-2", draftId: created.draft.id, baseRevision: 1
  })).status, "not-found");

  const staleArchive = await fixture.store.archiveTeacherVisualizationDraft({
    ownerId: "teacher-1", draftId: created.draft.id, baseRevision: 99
  });
  assert.equal(staleArchive.status, "conflict");
  if (staleArchive.status !== "conflict") return;
  assert.equal(staleArchive.currentRevision, 1);
  assert.equal(staleArchive.serverVersion.status, "editing");
  assert.equal(fixture.database.teacher_visualization_drafts[0]?.status, "editing");

  const archived = await fixture.store.archiveTeacherVisualizationDraft({
    ownerId: "teacher-1", draftId: created.draft.id, baseRevision: 1
  });
  assert.equal(archived.status, "archived");
  if (archived.status !== "archived") return;
  assert.equal(archived.draft.status, "archived");
  assert.equal(archived.draft.revision, 2);
  assert.ok(archived.draft.archivedAt);
  assert.equal((await fixture.store.getTeacherVisualizationDraft({ ownerId: "teacher-1", draftId: created.draft.id })).status, "not-found");
  assert.deepEqual(await fixture.store.listTeacherVisualizationDrafts("teacher-1"), []);

  const again = await fixture.store.archiveTeacherVisualizationDraft({
    ownerId: "teacher-1", draftId: created.draft.id, baseRevision: 2
  });
  assert.equal(again.status, "archived");
  if (again.status === "archived") assert.equal(again.draft.revision, 2);
  assert.equal(fixture.database.teacher_visualization_drafts.length, 1);
});

test("update and archive timestamps remain canonical and monotonic across rollback and same-ms clocks", async () => {
  const initial = new Date("2026-08-23T10:00:00.000Z");
  const fixture = store(database(), [
    initial,
    new Date("2026-08-23T09:00:00.000Z"),
    new Date("2026-08-23T10:00:00.000Z"),
    new Date("2026-08-22T10:00:00.000Z")
  ]);
  const created = await fixture.store.createTeacherVisualizationDraft({
    ownerId: "teacher-1",
    title: "Monotonic draft",
    packageJson: scenePackage()
  });
  assert.equal(created.status, "created");
  if (created.status !== "created") return;
  assert.equal(created.draft.createdAt, "2026-08-23T10:00:00.000Z");
  assert.equal(created.draft.updatedAt, created.draft.createdAt);

  const firstUpdate = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 1,
    title: "Rollback safe"
  });
  assert.equal(firstUpdate.status, "saved");
  if (firstUpdate.status !== "saved") return;
  assert.equal(firstUpdate.draft.updatedAt, "2026-08-23T10:00:00.001Z");

  const sameMsUpdate = await fixture.store.updateTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 2,
    title: "Same millisecond safe"
  });
  assert.equal(sameMsUpdate.status, "saved");
  if (sameMsUpdate.status !== "saved") return;
  assert.equal(sameMsUpdate.draft.updatedAt, "2026-08-23T10:00:00.002Z");

  const archived = await fixture.store.archiveTeacherVisualizationDraft({
    ownerId: "teacher-1",
    draftId: created.draft.id,
    baseRevision: 3
  });
  assert.equal(archived.status, "archived");
  if (archived.status !== "archived") return;
  assert.equal(archived.draft.updatedAt, "2026-08-23T10:00:00.003Z");
  assert.equal(archived.draft.archivedAt, archived.draft.updatedAt);
});

test("normalization drops unsafe or malformed legacy rows and returns exact records", () => {
  const good = {
    id: "draft-1",
    ownerId: "teacher-1",
    title: " Safe ",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision: 3,
    packageJson: scenePackage(),
    createdAt: "2026-08-23T10:00:00.000Z",
    updatedAt: "2026-08-23T10:00:01.000Z",
    archivedAt: null,
    clientObjectUrl: "blob:must-not-survive"
  };
  const unsafe = structuredClone(good);
  unsafe.id = "draft-unsafe";
  unsafe.packageJson.audio = {
    source: "local-file",
    fileName: "/tmp/raw.wav",
    mimeType: "audio/wav",
    durationSeconds: 2,
    contentHash: `sha256-${"b".repeat(64)}`
  };
  const records = normalizeTeacherVisualizationDraftRecords([good, unsafe, null, "bad"]);
  assert.equal(records.length, 1);
  assert.equal(records[0]?.title, "Safe");
  exactRecordKeys(records[0] as unknown as Record<string, unknown>);
});

test("normalization requires canonical ISO chronology and archived timestamp consistency", () => {
  const base = {
    id: "draft-valid",
    ownerId: "teacher-1",
    title: "Valid",
    schemaVersion: "mais-manim-scene-package/v3",
    status: "editing",
    revision: 1,
    packageJson: scenePackage(),
    createdAt: "2026-08-23T10:00:00.000Z",
    updatedAt: "2026-08-23T10:00:01.000Z",
    archivedAt: null
  };
  const invalidRows = [
    { ...base, id: "date-one", createdAt: "1" },
    { ...base, id: "date-zero", createdAt: "0" },
    { ...base, id: "date-rfc", createdAt: "Sun, 23 Aug 2026 10:00:00 GMT" },
    { ...base, id: "date-calendar", createdAt: "2026-02-30T10:00:00.000Z" },
    { ...base, id: "date-reversed", updatedAt: "2026-08-23T09:59:59.999Z" },
    { ...base, id: "active-archived-at", archivedAt: "2026-08-23T10:00:01.000Z" },
    {
      ...base,
      id: "archived-mismatch",
      status: "archived",
      archivedAt: "2026-08-23T10:00:02.000Z"
    },
    {
      ...base,
      id: "archived-reversed",
      status: "archived",
      updatedAt: "2026-08-23T09:59:59.999Z",
      archivedAt: "2026-08-23T09:59:59.999Z"
    }
  ];
  const validArchived = {
    ...base,
    id: "archived-valid",
    status: "archived",
    archivedAt: base.updatedAt
  };
  const normalized = normalizeTeacherVisualizationDraftRecords([base, validArchived, ...invalidRows]);
  assert.deepEqual(normalized.map((record) => record.id), ["draft-valid", "archived-valid"]);
});
