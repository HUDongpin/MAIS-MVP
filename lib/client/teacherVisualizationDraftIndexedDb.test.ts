import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  applyTeacherVisualizationAuthoringAction,
  buildTeacherVisualizationLocalDraftRevision,
  createGoldenTrigVisualizationAuthoringState
} from "./teacherVisualizationAuthoringModel";
import * as indexedDbHelpers from "./teacherVisualizationDraftIndexedDb";
import {
  buildTeacherVisualizationAudioRevisionKey,
  buildTeacherVisualizationCheckpointKey,
  buildTeacherVisualizationDraftRevisionKey,
  buildTeacherVisualizationLocalCheckpoint,
  buildTeacherVisualizationCheckpointRestoreRevision,
  copyTeacherVisualizationCheckpointToDraft,
  createTeacherVisualizationCheckpointId,
  createLocalTeacherVisualizationDraftId,
  decideTeacherVisualizationDraftWriterLease,
  decideTeacherVisualizationDraftWriterLeaseTransfer,
  isTeacherVisualizationDraftWriterLeaseHeld,
  isLocalTeacherVisualizationDraftId,
  selectTeacherVisualizationCheckpointsToPrune,
  selectTeacherVisualizationLatestDraftRevision,
  teacherVisualizationMaximumCheckpointsPerDraft,
  teacherVisualizationDraftIndexedDbConfig
} from "./teacherVisualizationDraftIndexedDb";

test("IndexedDB keys partition every draft and audio revision by user, draft and revision", () => {
  assert.deepEqual(
    buildTeacherVisualizationDraftRevisionKey("teacher-1", "draft-1", 4),
    ["teacher-1", "draft-1", 4]
  );
  assert.deepEqual(
    buildTeacherVisualizationAudioRevisionKey("teacher-2", "draft-1", 4),
    ["teacher-2", "draft-1", 4]
  );
  assert.equal(teacherVisualizationDraftIndexedDbConfig.draftStore, "draft-revisions");
  assert.equal(teacherVisualizationDraftIndexedDbConfig.audioStore, "audio-revisions");
  assert.equal(teacherVisualizationDraftIndexedDbConfig.checkpointStore, "checkpoints");
  assert.equal(teacherVisualizationDraftIndexedDbConfig.writerStore, "writer-leases");
  assert.equal(teacherVisualizationDraftIndexedDbConfig.version, 3);
  assert.deepEqual(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndexKeyPath, ["userId", "draftId"]);
});

test("a second same-revision tab cannot acquire or use the active writer lease", () => {
  const first = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "draft-1",
    nowMilliseconds: 1_000,
    userId: "teacher-1",
    writerId: "writer-a"
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const competing = decideTeacherVisualizationDraftWriterLease(first.lease, {
    draftId: "draft-1",
    nowMilliseconds: 1_001,
    userId: "teacher-1",
    writerId: "writer-b"
  });
  assert.deepEqual(competing, { ok: false, reason: "active-writer-conflict" });
  assert.equal(isTeacherVisualizationDraftWriterLeaseHeld(first.lease, {
    draftId: "draft-1",
    nowMilliseconds: 1_001,
    userId: "teacher-1",
    writerId: "writer-a"
  }), true);
  assert.equal(isTeacherVisualizationDraftWriterLeaseHeld(first.lease, {
    draftId: "draft-1",
    nowMilliseconds: 1_001,
    userId: "teacher-1",
    writerId: "writer-b"
  }), false);

  const takeoverAfterExpiry = decideTeacherVisualizationDraftWriterLease(first.lease, {
    draftId: "draft-1",
    nowMilliseconds: first.lease.expiresAtMilliseconds,
    userId: "teacher-1",
    writerId: "writer-b"
  });
  assert.equal(takeoverAfterExpiry.ok, true);

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  assert.match(source, /putTeacherVisualizationDraftRevisionIfWriter/);
  assert.match(source, /writerStore[\s\S]{0,900}draftStore/);
  assert.match(source, /active-writer-conflict/);
  assert.match(source, /replaceTeacherVisualizationWorkingCopyIfWriter/);
  assert.match(source, /putTeacherVisualizationAudioRevisionIfWriter/);
  assert.match(source, /deleteTeacherVisualizationAudioRevisionsIfWriter/);
});

test("local-to-cloud migration cannot steal an active destination writer lease", () => {
  const sourceLease = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "local:draft-1",
    nowMilliseconds: 2_000,
    userId: "teacher-1",
    writerId: "writer-a"
  });
  const destinationLease = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "cloud-draft-1",
    nowMilliseconds: 2_000,
    userId: "teacher-1",
    writerId: "writer-b"
  });
  assert.equal(sourceLease.ok, true);
  assert.equal(destinationLease.ok, true);
  if (!sourceLease.ok || !destinationLease.ok) return;
  const sourceBefore = structuredClone(sourceLease.lease);
  const destinationBefore = structuredClone(destinationLease.lease);

  assert.deepEqual(decideTeacherVisualizationDraftWriterLeaseTransfer(
    sourceLease.lease,
    destinationLease.lease,
    {
      fromDraftId: "local:draft-1",
      nowMilliseconds: 2_001,
      toDraftId: "cloud-draft-1",
      userId: "teacher-1",
      writerId: "writer-a"
    }
  ), { ok: false, reason: "active-writer-conflict" });
  assert.deepEqual(sourceLease.lease, sourceBefore);
  assert.deepEqual(destinationLease.lease, destinationBefore);

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  const migration = source.slice(source.indexOf("export async function migrateLocalTeacherVisualizationDraft"));
  const destinationRead = migration.indexOf("destinationLease");
  const sourceDelete = migration.indexOf("writerStore.delete");
  assert.equal(destinationRead >= 0, true);
  assert.equal(sourceDelete > destinationRead, true);
});

test("checkpoint copy atomically refuses a destination taken over during save-as-new", () => {
  const sourceLease = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "draft-conflict",
    nowMilliseconds: 3_000,
    userId: "teacher-1",
    writerId: "writer-a"
  });
  const destinationLease = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "draft-copy",
    nowMilliseconds: 3_000,
    userId: "teacher-1",
    writerId: "writer-b"
  });
  assert.equal(sourceLease.ok, true);
  assert.equal(destinationLease.ok, true);
  if (!sourceLease.ok || !destinationLease.ok) return;
  assert.deepEqual(decideTeacherVisualizationDraftWriterLeaseTransfer(
    sourceLease.lease,
    destinationLease.lease,
    {
      fromDraftId: "draft-conflict",
      nowMilliseconds: 3_001,
      toDraftId: "draft-copy",
      userId: "teacher-1",
      writerId: "writer-a"
    }
  ), { ok: false, reason: "active-writer-conflict" });

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  const copyStart = source.indexOf("export async function copyTeacherVisualizationCheckpointsToDraft");
  const copyEnd = source.indexOf("export async function restoreTeacherVisualizationCheckpoint", copyStart);
  const copySource = source.slice(copyStart, copyEnd);
  assert.match(copySource, /writerId/);
  assert.match(copySource, /writerStore/);
  assert.match(copySource, /sourceLease/);
  assert.match(copySource, /destinationLease/);
  assert.match(copySource, /decideTeacherVisualizationDraftWriterLeaseTransfer/);
  assert.equal(
    copySource.indexOf("decideTeacherVisualizationDraftWriterLeaseTransfer")
      < copySource.indexOf("copyOwnerDraftCheckpoints"),
    true,
    "both writer leases must be accepted before checkpoint copy or pruning"
  );
});

test("recovery save revalidation rejects a newer same-revision local snapshot after a deferred read", async () => {
  const revalidate = (indexedDbHelpers as unknown as Record<string, unknown>)
    .loadTeacherVisualizationLocalDraftRevisionIfUnchanged;
  assert.equal(typeof revalidate, "function");
  const displayed = buildTeacherVisualizationLocalDraftRevision(
    createGoldenTrigVisualizationAuthoringState("teacher-1", () => "recovery"),
    "2026-08-23T03:00:00.000Z"
  );
  const newer = structuredClone(displayed);
  newer.savedAt = "2026-08-23T03:00:01.000Z";
  newer.title = "Newer tab B recovery";
  let resolveLatest!: (value: typeof newer) => void;
  const latest = new Promise<typeof newer>((resolve) => { resolveLatest = resolve; });
  const pending = (revalidate as (input: {
    displayed: typeof displayed;
    loadLatest: () => Promise<typeof newer | undefined>;
  }) => Promise<{ ok: boolean; snapshot?: typeof displayed }>)({
    displayed,
    loadLatest: async () => latest
  });
  resolveLatest(newer);
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.snapshot, undefined, "stale A must never be POSTed after B replaces it");
});

test("recovery delete revalidation rejects changed content even when revision and savedAt collide", async () => {
  const revalidate = (indexedDbHelpers as unknown as Record<string, unknown>)
    .loadTeacherVisualizationLocalDraftRevisionIfUnchanged;
  assert.equal(typeof revalidate, "function");
  const displayed = buildTeacherVisualizationLocalDraftRevision(
    createGoldenTrigVisualizationAuthoringState("teacher-1", () => "recovery-delete"),
    "2026-08-23T03:00:00.000Z"
  );
  const changed = structuredClone(displayed);
  changed.packageJson.brief.courseGoal = "Unseen newer local content";
  const result = await (revalidate as (input: {
    displayed: typeof displayed;
    loadLatest: () => Promise<typeof changed | undefined>;
  }) => Promise<{ ok: boolean; snapshot?: typeof displayed }>)({
    displayed,
    loadLatest: async () => changed
  });
  assert.equal(result.ok, false);
  assert.equal(result.snapshot, undefined, "delete must require a fresh confirmation for changed bytes");
});

test("archive dirtiness follows only the latest local revision, not superseded dirty rows", () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1", () => "draft-a");
  const dirtyRevisionOne = {
    ...buildTeacherVisualizationLocalDraftRevision(state, "2026-08-23T01:00:00.000Z"),
    baseRevision: 1,
    dirty: true,
    draftId: "draft-a",
    revision: 1
  };
  const cleanRevisionTwo = {
    ...dirtyRevisionOne,
    baseRevision: 2,
    dirty: false,
    metadataDirty: false,
    packageContentDirty: false,
    revision: 2,
    savedAt: "2026-08-23T02:00:00.000Z"
  };
  assert.equal(
    selectTeacherVisualizationLatestDraftRevision([dirtyRevisionOne, cleanRevisionTwo])?.dirty,
    false
  );
  assert.equal(
    selectTeacherVisualizationLatestDraftRevision([cleanRevisionTwo, dirtyRevisionOne])?.revision,
    2
  );
});

test("IndexedDB v3 upgrade fails visibly when blocked and closes stale tabs on versionchange", () => {
  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  assert.match(source, /addEventListener\("blocked"/);
  assert.match(source, /indexeddb-upgrade-blocked/);
  assert.match(source, /database\.addEventListener\("versionchange"/);
  assert.match(source, /database\.close\(\)/);
});

test("checkpoint IDs are local versions independent from the server revision key", () => {
  const first = createTeacherVisualizationCheckpointId(() => "checkpoint-a");
  const second = createTeacherVisualizationCheckpointId(() => "checkpoint-b");
  assert.equal(first, "checkpoint:checkpoint-a");
  assert.equal(second, "checkpoint:checkpoint-b");
  assert.notEqual(first, second);
  assert.deepEqual(
    buildTeacherVisualizationCheckpointKey("teacher-1", "draft-1", first),
    ["teacher-1", "draft-1", "checkpoint:checkpoint-a"]
  );
});

test("creating a checkpoint also leaves a discoverable working-copy anchor for archived cloud recovery", () => {
  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  assert.match(source, /createTeacherVisualizationCheckpoint[\s\S]{0,1200}checkpointStore[\s\S]{0,500}draftStore/);
  assert.match(source, /createTeacherVisualizationCheckpoint[\s\S]{0,1800}draftStore\.put\(structuredClone\(snapshot\)\)/);
});

test("checkpoint create restore and delete atomically fail closed after another writer takes over", () => {
  const first = decideTeacherVisualizationDraftWriterLease(undefined, {
    draftId: "draft-1",
    nowMilliseconds: 1_000,
    userId: "teacher-1",
    writerId: "writer-a"
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const takeover = decideTeacherVisualizationDraftWriterLease(first.lease, {
    draftId: "draft-1",
    nowMilliseconds: first.lease.expiresAtMilliseconds,
    userId: "teacher-1",
    writerId: "writer-b"
  });
  assert.equal(takeover.ok, true);
  if (!takeover.ok) return;
  assert.deepEqual(decideTeacherVisualizationDraftWriterLease(takeover.lease, {
    draftId: "draft-1",
    nowMilliseconds: first.lease.expiresAtMilliseconds + 1,
    userId: "teacher-1",
    writerId: "writer-a"
  }), { ok: false, reason: "active-writer-conflict" });

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  const functionSource = (name: string, nextName: string) => source.slice(
    source.indexOf(`export async function ${name}`),
    source.indexOf(`export async function ${nextName}`, source.indexOf(`export async function ${name}`) + 1)
  );
  const createSource = functionSource("createTeacherVisualizationCheckpoint", "listTeacherVisualizationCheckpoints");
  const deleteSource = functionSource("deleteTeacherVisualizationCheckpoint", "copyTeacherVisualizationCheckpointsToDraft");
  const restoreSource = functionSource("restoreTeacherVisualizationCheckpoint", "getTeacherVisualizationAudioRevision");

  for (const [label, mutationSource] of [
    ["create", createSource],
    ["delete", deleteSource],
    ["restore", restoreSource]
  ] as const) {
    assert.match(mutationSource, /writerStore/, `${label} includes the writer store in its transaction`);
    assert.match(mutationSource, /isTeacherVisualizationDraftWriterLeaseHeld/, `${label} proves the current writer`);
    assert.match(mutationSource, /active-writer-conflict/, `${label} fails closed after takeover`);
    const proof = mutationSource.indexOf("isTeacherVisualizationDraftWriterLeaseHeld");
    const firstDraftMutation = Math.min(
      ...["checkpointStore.put", "checkpointStore.delete", "draftStore.put", "audioStore.put", "audioStore.delete"]
        .map((needle) => mutationSource.indexOf(needle))
        .filter((index) => index >= 0)
    );
    assert.equal(proof >= 0 && proof < firstDraftMutation, true, `${label} checks lease before mutation`);
  }
});

test("checkpoint survives later same-revision autosave and restores its exact authored snapshot as dirty content", () => {
  const initial = createGoldenTrigVisualizationAuthoringState("teacher-1", () => "draft-a");
  const checkpointState = applyTeacherVisualizationAuthoringAction(initial, {
    field: "courseGoal",
    type: "set-brief-field",
    value: "Checkpoint course goal"
  });
  const checkpointRevision = buildTeacherVisualizationLocalDraftRevision(
    checkpointState,
    "2026-08-23T01:00:00.000Z"
  );
  const checkpoint = buildTeacherVisualizationLocalCheckpoint(
    checkpointRevision,
    undefined,
    "checkpoint:fixed",
    "2026-08-23T01:00:01.000Z"
  );

  const edited = applyTeacherVisualizationAuthoringAction(checkpointState, {
    field: "courseGoal",
    type: "set-brief-field",
    value: "Later autosaved course goal"
  });
  const autosaved = buildTeacherVisualizationLocalDraftRevision(
    edited,
    "2026-08-23T01:00:02.000Z"
  );
  const restored = buildTeacherVisualizationCheckpointRestoreRevision(
    checkpoint,
    "2026-08-23T01:00:03.000Z"
  );

  assert.equal(checkpoint.snapshot.revision, autosaved.revision);
  assert.equal(checkpoint.snapshot.packageJson.brief.courseGoal, "Checkpoint course goal");
  assert.equal(autosaved.packageJson.brief.courseGoal, "Later autosaved course goal");
  assert.equal(restored.packageJson.brief.courseGoal, "Checkpoint course goal");
  assert.equal(restored.baseRevision, checkpointRevision.baseRevision);
  assert.equal(restored.dirty, true);
  assert.equal(restored.packageContentDirty, true);
  assert.equal(restored.status, "editing");
  assert.notStrictEqual(restored.packageJson, checkpoint.snapshot.packageJson);
});

test("checkpoint audio is included only when its hash matches the snapshot metadata", () => {
  const withAudio = createGoldenTrigVisualizationAuthoringState("teacher-1", () => "draft-a");
  withAudio.packageJson.audio = {
    contentHash: `sha256-${"a".repeat(64)}`,
    durationSeconds: 2,
    fileName: "voice.webm",
    mimeType: "audio/webm",
    source: "local-file"
  };
  const snapshot = buildTeacherVisualizationLocalDraftRevision(withAudio);
  const mismatchedAudio = {
    blob: new Blob(["other"], { type: "audio/webm" }),
    contentHash: `sha256-${"b".repeat(64)}` as const,
    draftId: snapshot.draftId,
    fileName: "other.webm",
    mimeType: "audio/webm" as const,
    revision: snapshot.revision,
    userId: snapshot.userId
  };

  assert.equal(buildTeacherVisualizationLocalCheckpoint(snapshot, mismatchedAudio).audioRevision, undefined);
  assert.equal(buildTeacherVisualizationLocalCheckpoint({
    ...snapshot,
    packageJson: { ...snapshot.packageJson, audio: { source: "none" } }
  }, { ...mismatchedAudio, contentHash: snapshot.packageJson.audio.source === "none"
    ? mismatchedAudio.contentHash
    : snapshot.packageJson.audio.contentHash }).audioRevision, undefined);
  const matching = buildTeacherVisualizationLocalCheckpoint(snapshot, {
    ...mismatchedAudio,
    contentHash: snapshot.packageJson.audio.source === "none"
      ? mismatchedAudio.contentHash
      : snapshot.packageJson.audio.contentHash
  });
  assert.equal(matching.audioRevision?.contentHash, snapshot.packageJson.audio.source === "none"
    ? undefined
    : snapshot.packageJson.audio.contentHash);
});

test("checkpoint retention is bounded per draft and prunes the oldest local versions", () => {
  assert.equal(teacherVisualizationMaximumCheckpointsPerDraft, 20);
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1", () => "draft-a");
  const snapshot = buildTeacherVisualizationLocalDraftRevision(state);
  const checkpoints = Array.from({ length: 22 }, (_, index) => buildTeacherVisualizationLocalCheckpoint(
    snapshot,
    undefined,
    `checkpoint:${String(index).padStart(2, "0")}`,
    `2026-08-23T01:${String(index).padStart(2, "0")}:00.000Z`
  ));
  assert.deepEqual(
    selectTeacherVisualizationCheckpointsToPrune(checkpoints).map((item) => item.checkpointId),
    ["checkpoint:01", "checkpoint:00"]
  );
});

test("conflict save-as-new copies checkpoints to the new server base without mutating the recovery original", () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1", () => "draft-a");
  const original = buildTeacherVisualizationLocalCheckpoint(
    buildTeacherVisualizationLocalDraftRevision(state),
    undefined,
    "checkpoint:fixed",
    "2026-08-23T01:00:00.000Z"
  );
  const copied = copyTeacherVisualizationCheckpointToDraft(original, {
    toDraftId: "cloud-new",
    toRevision: 9
  });

  assert.equal(original.draftId, "local:draft-a");
  assert.equal(original.snapshot.baseRevision, 0);
  assert.equal(copied.draftId, "cloud-new");
  assert.equal(copied.snapshot.draftId, "cloud-new");
  assert.equal(copied.snapshot.baseRevision, 9);
  assert.equal(copied.snapshot.revision, 9);
  assert.equal(copied.checkpointId, original.checkpointId);
});

test("local draft IDs are explicit and migration code moves both stores without persisting object URLs", () => {
  const id = createLocalTeacherVisualizationDraftId(() => "fixed-uuid");
  assert.equal(id, "local:fixed-uuid");
  assert.equal(isLocalTeacherVisualizationDraftId(id), true);
  assert.equal(isLocalTeacherVisualizationDraftId("draft-1"), false);

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  assert.match(source, /createObjectStore\(teacherVisualizationDraftIndexedDbConfig\.draftStore/);
  assert.match(source, /createObjectStore\(teacherVisualizationDraftIndexedDbConfig\.audioStore/);
  assert.match(source, /createObjectStore\(teacherVisualizationDraftIndexedDbConfig\.checkpointStore/);
  assert.match(source, /migrateLocalTeacherVisualizationDraft/);
  assert.match(source, /copyTeacherVisualizationAudioRevisionWhenHashMatches/);
  assert.doesNotMatch(source, /objectUrl\s*:/i);
});

test("legacy local revisions infer content dirtiness conservatively without clearing trusted server gates", () => {
  type LegacyRevision = {
    baseRevision: number;
    dirty: boolean;
    draftId: string;
    packageJson: ReturnType<typeof createGoldenTrigVisualizationAuthoringState>["packageJson"];
    revision: number;
    savedAt: string;
    status: "editing" | "ready-for-review";
    title: string;
    userId: string;
  };
  const normalize = (indexedDbHelpers as unknown as Record<string, unknown>)
    .normalizeTeacherVisualizationLocalDraftRevision;
  const reconcile = (indexedDbHelpers as unknown as Record<string, unknown>)
    .reconcileLegacyTeacherVisualizationLocalDraftDirtiness;
  assert.equal(typeof normalize, "function");
  assert.equal(typeof reconcile, "function");

  const certified = createGoldenTrigVisualizationAuthoringState("teacher-1").packageJson;
  certified.brief.evidenceLevel = "release-ready";
  certified.reviewLedger = {
    A06: { evidenceIds: ["a06"], status: "passed" },
    A11: { evidenceIds: ["a11"], status: "passed" },
    A18: { evidenceIds: ["a18"], status: "passed" },
    A22: { evidenceIds: ["a22"], status: "passed" }
  };
  const legacy: LegacyRevision = {
    baseRevision: 4,
    dirty: true,
    draftId: "draft-1",
    packageJson: structuredClone(certified),
    revision: 4,
    savedAt: "2026-08-23T03:00:00.000Z",
    status: "editing",
    title: "Local title",
    userId: "teacher-1"
  };
  const trusted = (normalize as (record: LegacyRevision) => LegacyRevision & {
    legacyDirtyDimensionsUnknown: boolean;
    metadataDirty: boolean;
    packageContentDirty: boolean;
  })(legacy);
  assert.equal(trusted.packageContentDirty, true);
  assert.equal(trusted.legacyDirtyDimensionsUnknown, true);
  assert.equal(trusted.metadataDirty, true);
  assert.equal(trusted.packageJson.brief.evidenceLevel, "release-ready");
  assert.equal(trusted.packageJson.reviewLedger.A22.status, "passed");
  const reconciledMetadata = (reconcile as (
    record: typeof trusted,
    serverPackage: typeof certified
  ) => typeof trusted)(trusted, structuredClone(certified));
  assert.equal(reconciledMetadata.packageContentDirty, false);

  const legacyContentEdit = structuredClone(trusted);
  legacyContentEdit.packageJson.brief.courseGoal = "Unknown legacy content edit";
  const reconciledContent = (reconcile as (
    record: typeof trusted,
    serverPackage: typeof certified
  ) => typeof trusted)(legacyContentEdit, structuredClone(certified));
  assert.equal(reconciledContent.packageContentDirty, true);

  const invalidated = structuredClone(legacy);
  invalidated.packageJson.brief.evidenceLevel = "spec-only";
  invalidated.packageJson.reviewLedger = {
    A06: { evidenceIds: [], status: "pending" },
    A11: { evidenceIds: [], status: "pending" },
    A18: { evidenceIds: [], status: "pending" },
    A22: { evidenceIds: [], status: "pending" }
  };
  const conservative = (normalize as (record: LegacyRevision) => LegacyRevision & {
    metadataDirty: boolean;
    packageContentDirty: boolean;
  })(invalidated);
  assert.equal(conservative.packageContentDirty, true);
  assert.equal(conservative.metadataDirty, true);
});

test("IndexedDB exposes bounded deletion APIs for detach and archive privacy cleanup", () => {
  const helpers = indexedDbHelpers as unknown as Record<string, unknown>;
  assert.equal(typeof helpers.deleteTeacherVisualizationAudioRevisions, "function");
  assert.equal(typeof helpers.deleteTeacherVisualizationLocalDraftData, "function");
  assert.equal(typeof helpers.hasDirtyTeacherVisualizationDraftRevisions, "function");
  assert.equal(typeof helpers.deleteTeacherVisualizationLocalDraftDataIfClean, "function");
  assert.equal(typeof helpers.deleteTeacherVisualizationWorkingCopyData, "function");
  assert.equal(typeof helpers.copyTeacherVisualizationCheckpointsToDraft, "function");

  const source = fs.readFileSync("lib/client/teacherVisualizationDraftIndexedDb.ts", "utf8");
  assert.match(source, /deleteTeacherVisualizationAudioRevisions/);
  assert.match(source, /deleteTeacherVisualizationLocalDraftData/);
  assert.match(source, /deleteTeacherVisualizationLocalDraftDataIfClean/);
  assert.match(source, /hasDirtyTeacherVisualizationDraftRevisions/);
  assert.match(source, /records\.push\(cursor\.value/);
  assert.match(source, /selectTeacherVisualizationLatestDraftRevision\(records\)\?\.dirty/);
  assert.match(source, /if \(hasDirty\)[\s\S]{0,80}return false/);
  assert.match(source, /IDBKeyRange\.only\(\[userId, draftId\]\)/);
  assert.match(source, /cursor\.delete\(\)/);
});

test("local-only checkpoints are owner-scoped, discoverable and deduplicated to the latest revision", () => {
  const selectLatest = (indexedDbHelpers as unknown as Record<string, unknown>)
    .selectLatestLocalTeacherVisualizationDraftRevisions;
  assert.equal(typeof selectLatest, "function");
  const packageJson = createGoldenTrigVisualizationAuthoringState("teacher-1").packageJson;
  const revision = (userId: string, draftId: string, value: number, savedAt: string) => ({
    baseRevision: value,
    dirty: true,
    draftId,
    metadataDirty: true,
    packageContentDirty: true,
    packageJson,
    revision: value,
    savedAt,
    status: "editing" as const,
    title: `${draftId}-${value}`,
    userId
  });

  const selected = (selectLatest as (records: ReturnType<typeof revision>[], userId: string) => ReturnType<typeof revision>[]) ([
    revision("teacher-1", "local:a", 0, "2026-08-23T01:00:00.000Z"),
    revision("teacher-1", "local:a", 1, "2026-08-23T02:00:00.000Z"),
    revision("teacher-1", "cloud-a", 8, "2026-08-23T04:00:00.000Z"),
    { ...revision("teacher-1", "cloud-clean", 2, "2026-08-23T06:00:00.000Z"), dirty: false },
    revision("teacher-2", "local:other", 2, "2026-08-23T05:00:00.000Z"),
    revision("teacher-1", "local:b", 0, "2026-08-23T03:00:00.000Z")
  ], "teacher-1");

  assert.deepEqual(selected.map((item) => [item.draftId, item.revision]), [
    ["cloud-clean", 2],
    ["cloud-a", 8],
    ["local:b", 0],
    ["local:a", 1]
  ]);
  assert.equal(typeof (indexedDbHelpers as unknown as Record<string, unknown>)
    .listLatestLocalTeacherVisualizationDraftRevisions, "function");
});
