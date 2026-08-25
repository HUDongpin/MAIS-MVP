import type { MathScenePackageV3 } from "@/components/visualizations/three/manim/mathScenePackageV3";
import type { TeacherVisualizationDraftStatus } from "@/types";

export const teacherVisualizationDraftIndexedDbConfig = {
  audioStore: "audio-revisions",
  checkpointStore: "checkpoints",
  databaseName: "mais-teacher-visualization-authoring-v3",
  draftStore: "draft-revisions",
  ownerDraftIndex: "by-owner-draft",
  ownerDraftIndexKeyPath: ["userId", "draftId"] as [string, string],
  version: 3,
  writerStore: "writer-leases"
} as const;

export type TeacherVisualizationLocalDraftRevision = {
  baseRevision: number;
  dirty: boolean;
  draftId: string;
  legacyDirtyDimensionsUnknown?: boolean;
  metadataDirty: boolean;
  packageContentDirty: boolean;
  packageJson: MathScenePackageV3;
  revision: number;
  savedAt: string;
  status: Exclude<TeacherVisualizationDraftStatus, "archived">;
  title: string;
  userId: string;
};

type LegacyTeacherVisualizationLocalDraftRevision = Omit<
  TeacherVisualizationLocalDraftRevision,
  "metadataDirty" | "packageContentDirty"
> & {
  metadataDirty?: boolean;
  packageContentDirty?: boolean;
};

export type TeacherVisualizationLocalAudioRevision = {
  blob: Blob;
  contentHash: string;
  draftId: string;
  fileName: string;
  mimeType: string;
  revision: number;
  userId: string;
};

export type TeacherVisualizationLocalCheckpoint = {
  audioRevision?: TeacherVisualizationLocalAudioRevision;
  checkpointId: string;
  createdAt: string;
  draftId: string;
  snapshot: TeacherVisualizationLocalDraftRevision;
  userId: string;
};

export type TeacherVisualizationDraftWriterLease = {
  draftId: string;
  expiresAtMilliseconds: number;
  userId: string;
  writerId: string;
};

type TeacherVisualizationDraftWriterLeaseInput = {
  draftId: string;
  nowMilliseconds: number;
  userId: string;
  writerId: string;
};

export const teacherVisualizationDraftWriterLeaseDurationMilliseconds = 15_000;

export function isTeacherVisualizationDraftWriterLeaseHeld(
  lease: TeacherVisualizationDraftWriterLease | undefined,
  input: TeacherVisualizationDraftWriterLeaseInput
) {
  return Boolean(
    lease
    && lease.userId === input.userId
    && lease.draftId === input.draftId
    && lease.writerId === input.writerId
    && lease.expiresAtMilliseconds > input.nowMilliseconds
  );
}

export function decideTeacherVisualizationDraftWriterLease(
  existingLease: TeacherVisualizationDraftWriterLease | undefined,
  input: TeacherVisualizationDraftWriterLeaseInput
):
  | { lease: TeacherVisualizationDraftWriterLease; ok: true }
  | { ok: false; reason: "active-writer-conflict" } {
  if (
    existingLease
    && existingLease.userId === input.userId
    && existingLease.draftId === input.draftId
    && existingLease.writerId !== input.writerId
    && existingLease.expiresAtMilliseconds > input.nowMilliseconds
  ) return { ok: false, reason: "active-writer-conflict" };
  return {
    lease: {
      draftId: input.draftId,
      expiresAtMilliseconds:
        input.nowMilliseconds + teacherVisualizationDraftWriterLeaseDurationMilliseconds,
      userId: input.userId,
      writerId: input.writerId
    },
    ok: true
  };
}

export function decideTeacherVisualizationDraftWriterLeaseTransfer(
  sourceLease: TeacherVisualizationDraftWriterLease | undefined,
  destinationLease: TeacherVisualizationDraftWriterLease | undefined,
  input: {
    fromDraftId: string;
    nowMilliseconds: number;
    toDraftId: string;
    userId: string;
    writerId: string;
  }
):
  | { destinationLease: TeacherVisualizationDraftWriterLease; ok: true }
  | { ok: false; reason: "active-writer-conflict" } {
  if (!isTeacherVisualizationDraftWriterLeaseHeld(sourceLease, {
    draftId: input.fromDraftId,
    nowMilliseconds: input.nowMilliseconds,
    userId: input.userId,
    writerId: input.writerId
  })) return { ok: false, reason: "active-writer-conflict" };
  const destinationDecision = decideTeacherVisualizationDraftWriterLease(destinationLease, {
    draftId: input.toDraftId,
    nowMilliseconds: input.nowMilliseconds,
    userId: input.userId,
    writerId: input.writerId
  });
  if (!destinationDecision.ok) return destinationDecision;
  return { destinationLease: destinationDecision.lease, ok: true };
}

export const teacherVisualizationMaximumCheckpointsPerDraft = 20;

export function selectTeacherVisualizationCheckpointsToPrune(
  records: readonly TeacherVisualizationLocalCheckpoint[],
  maximum = teacherVisualizationMaximumCheckpointsPerDraft
) {
  return [...records]
    .sort((left, right) => (
      right.createdAt.localeCompare(left.createdAt)
      || right.checkpointId.localeCompare(left.checkpointId)
    ))
    .slice(Math.max(0, maximum));
}

export function buildTeacherVisualizationDraftRevisionKey(userId: string, draftId: string, revision: number) {
  return [userId, draftId, revision] as [string, string, number];
}

export function buildTeacherVisualizationAudioRevisionKey(userId: string, draftId: string, revision: number) {
  return [userId, draftId, revision] as [string, string, number];
}

export function buildTeacherVisualizationCheckpointKey(userId: string, draftId: string, checkpointId: string) {
  return [userId, draftId, checkpointId] as [string, string, string];
}

export function buildTeacherVisualizationDraftWriterLeaseKey(userId: string, draftId: string) {
  return [userId, draftId] as [string, string];
}

export function createTeacherVisualizationCheckpointId(
  createUuid: () => string = () => globalThis.crypto.randomUUID()
) {
  return `checkpoint:${createUuid()}`;
}

export function buildTeacherVisualizationLocalCheckpoint(
  snapshot: TeacherVisualizationLocalDraftRevision,
  audioRevision?: TeacherVisualizationLocalAudioRevision,
  checkpointId = createTeacherVisualizationCheckpointId(),
  createdAt = new Date().toISOString()
): TeacherVisualizationLocalCheckpoint {
  const matchingAudioRevision = snapshot.packageJson.audio.source !== "none"
    && audioRevision?.contentHash === snapshot.packageJson.audio.contentHash
    ? audioRevision
    : undefined;
  return {
    ...(matchingAudioRevision ? { audioRevision: structuredClone(matchingAudioRevision) } : {}),
    checkpointId,
    createdAt,
    draftId: snapshot.draftId,
    snapshot: structuredClone(snapshot),
    userId: snapshot.userId
  };
}

export function buildTeacherVisualizationCheckpointRestoreRevision(
  checkpoint: TeacherVisualizationLocalCheckpoint,
  savedAt = new Date().toISOString()
): TeacherVisualizationLocalDraftRevision {
  return {
    ...structuredClone(checkpoint.snapshot),
    dirty: true,
    legacyDirtyDimensionsUnknown: false,
    metadataDirty: true,
    packageContentDirty: true,
    savedAt,
    status: "editing"
  };
}

export function copyTeacherVisualizationCheckpointToDraft(
  checkpoint: TeacherVisualizationLocalCheckpoint,
  input: { toDraftId: string; toRevision: number }
): TeacherVisualizationLocalCheckpoint {
  return {
    ...structuredClone(checkpoint),
    ...(checkpoint.audioRevision ? {
      audioRevision: {
        ...structuredClone(checkpoint.audioRevision),
        draftId: input.toDraftId,
        revision: input.toRevision
      }
    } : {}),
    draftId: input.toDraftId,
    snapshot: {
      ...structuredClone(checkpoint.snapshot),
      baseRevision: input.toRevision,
      draftId: input.toDraftId,
      revision: input.toRevision
    }
  };
}

export function createLocalTeacherVisualizationDraftId(createUuid: () => string = () => globalThis.crypto.randomUUID()) {
  return `local:${createUuid()}`;
}

export function isLocalTeacherVisualizationDraftId(draftId: string) {
  return draftId.startsWith("local:") && draftId.length > "local:".length;
}

export function normalizeTeacherVisualizationLocalDraftRevision(
  record: LegacyTeacherVisualizationLocalDraftRevision
): TeacherVisualizationLocalDraftRevision {
  const legacyDirtyDimensionsUnknown = record.dirty
    && typeof record.packageContentDirty !== "boolean";
  const packageContentDirty = typeof record.packageContentDirty === "boolean"
    ? record.packageContentDirty
    : record.dirty;
  const metadataDirty = typeof record.metadataDirty === "boolean"
    ? record.metadataDirty
    : record.dirty;
  return {
    ...structuredClone(record),
    legacyDirtyDimensionsUnknown,
    metadataDirty,
    packageContentDirty
  };
}

export function reconcileLegacyTeacherVisualizationLocalDraftDirtiness(
  record: TeacherVisualizationLocalDraftRevision,
  serverPackage: MathScenePackageV3
) {
  if (!record.legacyDirtyDimensionsUnknown) return record;
  return {
    ...structuredClone(record),
    legacyDirtyDimensionsUnknown: false,
    packageContentDirty: JSON.stringify(record.packageJson) !== JSON.stringify(serverPackage)
  };
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("indexeddb-request-failed")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("indexeddb-transaction-aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("indexeddb-transaction-failed")), { once: true });
  });
}

export function openTeacherVisualizationDraftDatabase(factory: IDBFactory = globalThis.indexedDB) {
  if (!factory) return Promise.reject(new Error("indexeddb-unavailable"));
  const request = factory.open(
    teacherVisualizationDraftIndexedDbConfig.databaseName,
    teacherVisualizationDraftIndexedDbConfig.version
  );
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(teacherVisualizationDraftIndexedDbConfig.draftStore)) {
      const store = database.createObjectStore(teacherVisualizationDraftIndexedDbConfig.draftStore, {
        keyPath: ["userId", "draftId", "revision"]
      });
      store.createIndex(
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex,
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndexKeyPath,
        { unique: false }
      );
    }
    if (!database.objectStoreNames.contains(teacherVisualizationDraftIndexedDbConfig.audioStore)) {
      const store = database.createObjectStore(teacherVisualizationDraftIndexedDbConfig.audioStore, {
        keyPath: ["userId", "draftId", "revision"]
      });
      store.createIndex(
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex,
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndexKeyPath,
        { unique: false }
      );
    }
    if (!database.objectStoreNames.contains(teacherVisualizationDraftIndexedDbConfig.checkpointStore)) {
      const store = database.createObjectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore, {
        keyPath: ["userId", "draftId", "checkpointId"]
      });
      store.createIndex(
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex,
        teacherVisualizationDraftIndexedDbConfig.ownerDraftIndexKeyPath,
        { unique: false }
      );
    }
    if (!database.objectStoreNames.contains(teacherVisualizationDraftIndexedDbConfig.writerStore)) {
      database.createObjectStore(teacherVisualizationDraftIndexedDbConfig.writerStore, {
        keyPath: ["userId", "draftId"]
      });
    }
  });
  return new Promise<IDBDatabase>((resolve, reject) => {
    let upgradeBlocked = false;
    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => database.close());
      if (upgradeBlocked) {
        database.close();
        return;
      }
      resolve(database);
    }, { once: true });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-open-failed"));
    }, { once: true });
    request.addEventListener("blocked", () => {
      upgradeBlocked = true;
      reject(new Error("indexeddb-upgrade-blocked"));
    }, { once: true });
  });
}

export async function putTeacherVisualizationDraftRevision(
  record: TeacherVisualizationLocalDraftRevision,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.draftStore, "readwrite");
  transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore).put(structuredClone(record));
  await transactionDone(transaction);
}

export async function claimTeacherVisualizationDraftWriterLease(
  input: Omit<TeacherVisualizationDraftWriterLeaseInput, "nowMilliseconds"> & {
    nowMilliseconds?: number;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.writerStore, "readwrite");
  const store = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const existingLease = await requestResult(
    store.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  const decision = decideTeacherVisualizationDraftWriterLease(existingLease, {
    ...input,
    nowMilliseconds: input.nowMilliseconds ?? Date.now()
  });
  if (decision.ok) store.put(decision.lease);
  await transactionDone(transaction);
  return decision;
}

export async function putTeacherVisualizationDraftRevisionIfWriter(
  record: TeacherVisualizationLocalDraftRevision,
  writerId: string,
  options: { nowMilliseconds?: number } = {},
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.writerStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore
    ],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  const nowMilliseconds = options.nowMilliseconds ?? Date.now();
  const leaseInput = {
    draftId: record.draftId,
    nowMilliseconds,
    userId: record.userId,
    writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(record.userId, record.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  writerStore.put(renewedLease.lease);
  draftStore.put(structuredClone(record));
  await transactionDone(transaction);
  return { ok: true as const };
}

export async function replaceTeacherVisualizationWorkingCopyIfWriter(
  input: {
    audioRevision?: TeacherVisualizationLocalAudioRevision;
    nowMilliseconds?: number;
    record: TeacherVisualizationLocalDraftRevision;
    writerId: string;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  const audioStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore);
  const nowMilliseconds = input.nowMilliseconds ?? Date.now();
  const leaseInput = {
    draftId: input.record.draftId,
    nowMilliseconds,
    userId: input.record.userId,
    writerId: input.writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.record.userId, input.record.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  await Promise.all([
    deleteOwnerDraftRecords(audioStore, input.record.userId, input.record.draftId),
    deleteOwnerDraftRecords(draftStore, input.record.userId, input.record.draftId)
  ]);
  writerStore.put(renewedLease.lease);
  draftStore.put(structuredClone(input.record));
  if (
    input.audioRevision
    && input.record.packageJson.audio.source !== "none"
    && input.audioRevision.contentHash === input.record.packageJson.audio.contentHash
  ) {
    audioStore.put({
      ...structuredClone(input.audioRevision),
      draftId: input.record.draftId,
      revision: input.record.revision,
      userId: input.record.userId
    });
  }
  await transactionDone(transaction);
  return { ok: true as const };
}

export async function releaseTeacherVisualizationDraftWriterLease(
  input: Pick<TeacherVisualizationDraftWriterLease, "draftId" | "userId" | "writerId">,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.writerStore, "readwrite");
  const store = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const key = buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.draftId);
  const existingLease = await requestResult(store.get(key)) as TeacherVisualizationDraftWriterLease | undefined;
  if (existingLease?.writerId === input.writerId) store.delete(key);
  await transactionDone(transaction);
}

export async function putTeacherVisualizationAudioRevision(
  record: TeacherVisualizationLocalAudioRevision,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.audioStore, "readwrite");
  transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore).put(record);
  await transactionDone(transaction);
}

export async function putTeacherVisualizationAudioRevisionIfWriter(
  record: TeacherVisualizationLocalAudioRevision,
  writerId: string,
  options: { nowMilliseconds?: number } = {},
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [teacherVisualizationDraftIndexedDbConfig.audioStore, teacherVisualizationDraftIndexedDbConfig.writerStore],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const audioStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore);
  const nowMilliseconds = options.nowMilliseconds ?? Date.now();
  const leaseInput = {
    draftId: record.draftId,
    nowMilliseconds,
    userId: record.userId,
    writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(record.userId, record.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  writerStore.put(renewedLease.lease);
  audioStore.put(record);
  await transactionDone(transaction);
  return { ok: true as const };
}

export async function createTeacherVisualizationCheckpoint(
  snapshot: TeacherVisualizationLocalDraftRevision,
  options: { checkpointId?: string; createdAt?: string; nowMilliseconds?: number; writerId: string },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const nowMilliseconds = options.nowMilliseconds ?? Date.now();
  const leaseInput = {
    draftId: snapshot.draftId,
    nowMilliseconds,
    userId: snapshot.userId,
    writerId: options.writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(snapshot.userId, snapshot.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  const audioRevision = await requestResult(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore)
      .get(buildTeacherVisualizationAudioRevisionKey(snapshot.userId, snapshot.draftId, snapshot.revision))
  ) as TeacherVisualizationLocalAudioRevision | undefined;
  const checkpoint = buildTeacherVisualizationLocalCheckpoint(
    snapshot,
    audioRevision,
    options.checkpointId ?? createTeacherVisualizationCheckpointId(),
    options.createdAt ?? new Date().toISOString()
  );
  const checkpointStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore);
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  writerStore.put(renewedLease.lease);
  checkpointStore.put(structuredClone(checkpoint));
  draftStore.put(structuredClone(snapshot));
  const storedCheckpoints = await collectCheckpointRecords(
    checkpointStore,
    snapshot.userId,
    snapshot.draftId
  );
  for (const expired of selectTeacherVisualizationCheckpointsToPrune(storedCheckpoints)) {
    checkpointStore.delete(buildTeacherVisualizationCheckpointKey(
      expired.userId,
      expired.draftId,
      expired.checkpointId
    ));
  }
  await transactionDone(transaction);
  return { checkpoint, ok: true as const };
}

function collectCheckpointRecords(store: IDBObjectStore, userId: string, draftId: string) {
  return new Promise<TeacherVisualizationLocalCheckpoint[]>((resolve, reject) => {
    const records: TeacherVisualizationLocalCheckpoint[] = [];
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([userId, draftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(records.sort((left, right) => (
          right.createdAt.localeCompare(left.createdAt)
          || right.checkpointId.localeCompare(left.checkpointId)
        )));
        return;
      }
      records.push(structuredClone(cursor.value as TeacherVisualizationLocalCheckpoint));
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-checkpoint-list-failed"));
    }, { once: true });
  });
}

export async function listTeacherVisualizationCheckpoints(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.checkpointStore, "readonly");
  const done = transactionDone(transaction);
  const records = await collectCheckpointRecords(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
    userId,
    draftId
  );
  await done;
  return records;
}

export async function deleteTeacherVisualizationCheckpoint(
  checkpoint: Pick<TeacherVisualizationLocalCheckpoint, "checkpointId" | "draftId" | "userId">,
  writerId: string,
  options: { nowMilliseconds?: number } = {},
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [teacherVisualizationDraftIndexedDbConfig.checkpointStore, teacherVisualizationDraftIndexedDbConfig.writerStore],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const leaseInput = {
    draftId: checkpoint.draftId,
    nowMilliseconds: options.nowMilliseconds ?? Date.now(),
    userId: checkpoint.userId,
    writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(checkpoint.userId, checkpoint.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  const checkpointStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore);
  writerStore.put(renewedLease.lease);
  checkpointStore.delete(buildTeacherVisualizationCheckpointKey(
    checkpoint.userId,
    checkpoint.draftId,
    checkpoint.checkpointId
  ));
  await transactionDone(transaction);
  return { ok: true as const };
}

function migrateOwnerDraftCheckpoints(
  store: IDBObjectStore,
  input: {
    fromDraftId: string;
    toDraftId: string;
    toRevision: number;
    userId: string;
  }
) {
  return new Promise<void>((resolve, reject) => {
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([input.userId, input.fromDraftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const checkpoint = cursor.value as TeacherVisualizationLocalCheckpoint;
      store.put(copyTeacherVisualizationCheckpointToDraft(checkpoint, input));
      cursor.delete();
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-checkpoint-migration-failed"));
    }, { once: true });
  });
}

function copyOwnerDraftCheckpoints(
  store: IDBObjectStore,
  input: {
    fromDraftId: string;
    toDraftId: string;
    toRevision: number;
    userId: string;
  }
) {
  return new Promise<void>((resolve, reject) => {
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([input.userId, input.fromDraftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      store.put(copyTeacherVisualizationCheckpointToDraft(
        cursor.value as TeacherVisualizationLocalCheckpoint,
        input
      ));
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-checkpoint-copy-failed"));
    }, { once: true });
  });
}

export async function copyTeacherVisualizationCheckpointsToDraft(
  input: {
    fromDraftId: string;
    nowMilliseconds?: number;
    toDraftId: string;
    toRevision: number;
    userId: string;
    writerId: string;
  },
  providedDatabase?: IDBDatabase
) {
  if (input.fromDraftId === input.toDraftId) return { ok: true as const };
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [teacherVisualizationDraftIndexedDbConfig.checkpointStore, teacherVisualizationDraftIndexedDbConfig.writerStore],
    "readwrite"
  );
  const store = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore);
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const nowMilliseconds = input.nowMilliseconds ?? Date.now();
  const [sourceLease, destinationLease] = await Promise.all([
    requestResult(writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.fromDraftId))),
    requestResult(writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.toDraftId)))
  ]) as [TeacherVisualizationDraftWriterLease | undefined, TeacherVisualizationDraftWriterLease | undefined];
  const transferDecision = decideTeacherVisualizationDraftWriterLeaseTransfer(
    sourceLease,
    destinationLease,
    {
      fromDraftId: input.fromDraftId,
      nowMilliseconds,
      toDraftId: input.toDraftId,
      userId: input.userId,
      writerId: input.writerId
    }
  );
  if (!transferDecision.ok) {
    await transactionDone(transaction);
    return transferDecision;
  }
  const renewedSource = decideTeacherVisualizationDraftWriterLease(sourceLease, {
    draftId: input.fromDraftId,
    nowMilliseconds,
    userId: input.userId,
    writerId: input.writerId
  });
  if (!renewedSource.ok) {
    await transactionDone(transaction);
    return renewedSource;
  }
  writerStore.put(renewedSource.lease);
  writerStore.put(transferDecision.destinationLease);
  await copyOwnerDraftCheckpoints(store, input);
  const destination = await collectCheckpointRecords(store, input.userId, input.toDraftId);
  for (const expired of selectTeacherVisualizationCheckpointsToPrune(destination)) {
    store.delete(buildTeacherVisualizationCheckpointKey(expired.userId, expired.draftId, expired.checkpointId));
  }
  await transactionDone(transaction);
  return { ok: true as const };
}

export async function restoreTeacherVisualizationCheckpoint(
  checkpoint: TeacherVisualizationLocalCheckpoint,
  writerId: string,
  options: { nowMilliseconds?: number } = {},
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const restored = buildTeacherVisualizationCheckpointRestoreRevision(checkpoint);
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const leaseInput = {
    draftId: restored.draftId,
    nowMilliseconds: options.nowMilliseconds ?? Date.now(),
    userId: restored.userId,
    writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(restored.userId, restored.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  const audioStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore);
  const audioKey = buildTeacherVisualizationAudioRevisionKey(
    restored.userId,
    restored.draftId,
    restored.revision
  );
  if (
    checkpoint.audioRevision
    && restored.packageJson.audio.source !== "none"
    && checkpoint.audioRevision.contentHash === restored.packageJson.audio.contentHash
  ) {
    audioStore.put({
      ...structuredClone(checkpoint.audioRevision),
      draftId: restored.draftId,
      revision: restored.revision,
      userId: restored.userId
    });
  } else {
    audioStore.delete(audioKey);
  }
  writerStore.put(renewedLease.lease);
  draftStore.put(structuredClone(restored));
  await transactionDone(transaction);
  return { ok: true as const, revision: restored };
}

export async function getTeacherVisualizationAudioRevision(
  userId: string,
  draftId: string,
  revision: number,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.audioStore, "readonly");
  const record = await requestResult(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore)
      .get(buildTeacherVisualizationAudioRevisionKey(userId, draftId, revision))
  ) as TeacherVisualizationLocalAudioRevision | undefined;
  await transactionDone(transaction);
  return record;
}

export async function getLatestTeacherVisualizationDraftRevision(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.draftStore, "readonly");
  const index = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore)
    .index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex);
  const request = index.openCursor(IDBKeyRange.only([userId, draftId]), "prev");
  const cursor = await requestResult(request);
  const value = cursor?.value as LegacyTeacherVisualizationLocalDraftRevision | undefined;
  await transactionDone(transaction);
  return value ? normalizeTeacherVisualizationLocalDraftRevision(value) : undefined;
}

export function selectLatestLocalTeacherVisualizationDraftRevisions(
  records: readonly LegacyTeacherVisualizationLocalDraftRevision[],
  userId: string
) {
  const latestByDraft = new Map<string, TeacherVisualizationLocalDraftRevision>();
  for (const rawRecord of records) {
    const record = normalizeTeacherVisualizationLocalDraftRevision(rawRecord);
    if (record.userId !== userId) continue;
    const existing = latestByDraft.get(record.draftId);
    if (
      !existing
      || record.revision > existing.revision
      || (record.revision === existing.revision && record.savedAt > existing.savedAt)
    ) latestByDraft.set(record.draftId, record);
  }
  return [...latestByDraft.values()].sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export function selectTeacherVisualizationLatestDraftRevision(
  records: readonly LegacyTeacherVisualizationLocalDraftRevision[]
) {
  let latest: TeacherVisualizationLocalDraftRevision | undefined;
  for (const rawRecord of records) {
    const record = normalizeTeacherVisualizationLocalDraftRevision(rawRecord);
    if (
      !latest
      || record.revision > latest.revision
      || (record.revision === latest.revision && record.savedAt > latest.savedAt)
    ) latest = record;
  }
  return latest;
}

export function buildTeacherVisualizationLocalDraftSnapshotIdentity(
  record: TeacherVisualizationLocalDraftRevision
) {
  return JSON.stringify({
    baseRevision: record.baseRevision,
    dirty: record.dirty,
    draftId: record.draftId,
    metadataDirty: record.metadataDirty,
    packageContentDirty: record.packageContentDirty,
    packageJson: record.packageJson,
    revision: record.revision,
    savedAt: record.savedAt,
    status: record.status,
    title: record.title,
    userId: record.userId
  });
}

export function teacherVisualizationLocalDraftSnapshotMatches(
  displayed: TeacherVisualizationLocalDraftRevision,
  current: TeacherVisualizationLocalDraftRevision | undefined
) {
  return Boolean(
    current
    && buildTeacherVisualizationLocalDraftSnapshotIdentity(displayed)
      === buildTeacherVisualizationLocalDraftSnapshotIdentity(current)
  );
}

export async function loadTeacherVisualizationLocalDraftRevisionIfUnchanged(input: {
  displayed: TeacherVisualizationLocalDraftRevision;
  loadLatest: () => Promise<TeacherVisualizationLocalDraftRevision | undefined>;
}) {
  const latest = await input.loadLatest();
  if (!latest || !teacherVisualizationLocalDraftSnapshotMatches(input.displayed, latest)) {
    return { latest, ok: false as const };
  }
  return { ok: true as const, snapshot: latest };
}

function collectDraftRecords(store: IDBObjectStore) {
  return new Promise<LegacyTeacherVisualizationLocalDraftRevision[]>((resolve, reject) => {
    const records: LegacyTeacherVisualizationLocalDraftRevision[] = [];
    const request = store.openCursor();
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(records);
        return;
      }
      records.push(cursor.value as LegacyTeacherVisualizationLocalDraftRevision);
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-local-draft-list-failed"));
    }, { once: true });
  });
}

export async function listLatestLocalTeacherVisualizationDraftRevisions(
  userId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.draftStore, "readonly");
  const done = transactionDone(transaction);
  const records = await collectDraftRecords(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore)
  );
  await done;
  return selectLatestLocalTeacherVisualizationDraftRevisions(records, userId);
}

export async function migrateLocalTeacherVisualizationDraft(
  input: {
    fromDraftId: string;
    fromRevision: number;
    nowMilliseconds?: number;
    toDraftId: string;
    toRevision: number;
    userId: string;
    writerId: string;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.draftStore,
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  const audioStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore);
  const fromKey = buildTeacherVisualizationDraftRevisionKey(input.userId, input.fromDraftId, input.fromRevision);
  const nowMilliseconds = input.nowMilliseconds ?? Date.now();
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const [sourceLease, destinationLease] = await Promise.all([
    requestResult(
      writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.fromDraftId))
    ),
    requestResult(
      writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.toDraftId))
    )
  ]) as [TeacherVisualizationDraftWriterLease | undefined, TeacherVisualizationDraftWriterLease | undefined];
  const transferDecision = decideTeacherVisualizationDraftWriterLeaseTransfer(
    sourceLease,
    destinationLease,
    {
      fromDraftId: input.fromDraftId,
      nowMilliseconds,
      toDraftId: input.toDraftId,
      userId: input.userId,
      writerId: input.writerId
    }
  );
  if (!transferDecision.ok) {
    await transactionDone(transaction);
    return false;
  }
  writerStore.delete(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.fromDraftId));
  writerStore.put(transferDecision.destinationLease);
  const draft = await requestResult(draftStore.get(fromKey)) as TeacherVisualizationLocalDraftRevision | undefined;
  const audio = await requestResult(audioStore.get(fromKey)) as TeacherVisualizationLocalAudioRevision | undefined;
  if (draft) {
    draftStore.put({
      ...draft,
      baseRevision: input.toRevision,
      dirty: false,
      draftId: input.toDraftId,
      metadataDirty: false,
      packageContentDirty: false,
      revision: input.toRevision
    });
  }
  if (audio) {
    audioStore.put({ ...audio, draftId: input.toDraftId, revision: input.toRevision });
  }
  await Promise.all([
    deleteOwnerDraftRecords(draftStore, input.userId, input.fromDraftId),
    deleteOwnerDraftRecords(audioStore, input.userId, input.fromDraftId)
  ]);
  await migrateOwnerDraftCheckpoints(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
    input
  );
  await transactionDone(transaction);
  return true;
}

export async function copyTeacherVisualizationAudioRevisionWhenHashMatches(
  input: {
    contentHash: string;
    draftId: string;
    fromRevision: number;
    toRevision: number;
    userId: string;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.audioStore, "readwrite");
  const store = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore);
  const source = await requestResult(
    store.get(buildTeacherVisualizationAudioRevisionKey(input.userId, input.draftId, input.fromRevision))
  ) as TeacherVisualizationLocalAudioRevision | undefined;
  const copied = Boolean(source && source.contentHash === input.contentHash);
  if (source && copied) store.put({ ...source, revision: input.toRevision });
  await transactionDone(transaction);
  return copied;
}

function deleteOwnerDraftRecords(
  store: IDBObjectStore,
  userId: string,
  draftId: string
) {
  return new Promise<void>((resolve, reject) => {
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([userId, draftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-delete-cursor-failed"));
    }, { once: true });
  });
}

function deleteOwnerDraftCheckpointAudio(
  store: IDBObjectStore,
  userId: string,
  draftId: string
) {
  return new Promise<void>((resolve, reject) => {
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([userId, draftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const checkpoint = structuredClone(cursor.value as TeacherVisualizationLocalCheckpoint);
      if (checkpoint.audioRevision) {
        delete checkpoint.audioRevision;
        cursor.update(checkpoint);
      }
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-checkpoint-audio-delete-failed"));
    }, { once: true });
  });
}

function ownerDraftHasDirtyRecords(
  store: IDBObjectStore,
  userId: string,
  draftId: string
) {
  return new Promise<boolean>((resolve, reject) => {
    const records: LegacyTeacherVisualizationLocalDraftRevision[] = [];
    const request = store.index(teacherVisualizationDraftIndexedDbConfig.ownerDraftIndex)
      .openCursor(IDBKeyRange.only([userId, draftId]));
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(Boolean(selectTeacherVisualizationLatestDraftRevision(records)?.dirty));
        return;
      }
      records.push(cursor.value as LegacyTeacherVisualizationLocalDraftRevision);
      cursor.continue();
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("indexeddb-dirty-scan-failed"));
    }, { once: true });
  });
}

export async function hasDirtyTeacherVisualizationDraftRevisions(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(teacherVisualizationDraftIndexedDbConfig.draftStore, "readonly");
  const done = transactionDone(transaction);
  const hasDirty = await ownerDraftHasDirtyRecords(
    transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore),
    userId,
    draftId
  );
  await done;
  return hasDirty;
}

export async function deleteTeacherVisualizationLocalDraftDataIfClean(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore
    ],
    "readwrite"
  );
  const done = transactionDone(transaction);
  const draftStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore);
  const hasDirty = await ownerDraftHasDirtyRecords(draftStore, userId, draftId);
  if (hasDirty) {
    await done;
    return false;
  }
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      userId,
      draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
      userId,
      draftId
    ),
    deleteOwnerDraftRecords(draftStore, userId, draftId)
  ]);
  await done;
  return true;
}

export async function deleteTeacherVisualizationAudioRevisions(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [teacherVisualizationDraftIndexedDbConfig.audioStore, teacherVisualizationDraftIndexedDbConfig.checkpointStore],
    "readwrite"
  );
  const done = transactionDone(transaction);
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      userId,
      draftId
    ),
    deleteOwnerDraftCheckpointAudio(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
      userId,
      draftId
    )
  ]);
  await done;
}

export async function deleteTeacherVisualizationAudioRevisionsIfWriter(
  input: {
    draftId: string;
    nowMilliseconds?: number;
    userId: string;
    writerId: string;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const nowMilliseconds = input.nowMilliseconds ?? Date.now();
  const leaseInput = {
    draftId: input.draftId,
    nowMilliseconds,
    userId: input.userId,
    writerId: input.writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      input.userId,
      input.draftId
    ),
    deleteOwnerDraftCheckpointAudio(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
      input.userId,
      input.draftId
    )
  ]);
  writerStore.put(renewedLease.lease);
  await transactionDone(transaction);
  return { ok: true as const };
}

export async function deleteTeacherVisualizationWorkingCopyData(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [teacherVisualizationDraftIndexedDbConfig.audioStore, teacherVisualizationDraftIndexedDbConfig.draftStore],
    "readwrite"
  );
  const done = transactionDone(transaction);
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      userId,
      draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore),
      userId,
      draftId
    )
  ]);
  await done;
}

export async function deleteTeacherVisualizationLocalDraftData(
  userId: string,
  draftId: string,
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore
    ],
    "readwrite"
  );
  const done = transactionDone(transaction);
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      userId,
      draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
      userId,
      draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore),
      userId,
      draftId
    )
  ]);
  await done;
}

export async function deleteTeacherVisualizationLocalDraftDataIfWriter(
  input: {
    draftId: string;
    nowMilliseconds?: number;
    userId: string;
    writerId: string;
  },
  providedDatabase?: IDBDatabase
) {
  const database = providedDatabase ?? await openTeacherVisualizationDraftDatabase();
  const transaction = database.transaction(
    [
      teacherVisualizationDraftIndexedDbConfig.audioStore,
      teacherVisualizationDraftIndexedDbConfig.checkpointStore,
      teacherVisualizationDraftIndexedDbConfig.draftStore,
      teacherVisualizationDraftIndexedDbConfig.writerStore
    ],
    "readwrite"
  );
  const writerStore = transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.writerStore);
  const leaseInput = {
    draftId: input.draftId,
    nowMilliseconds: input.nowMilliseconds ?? Date.now(),
    userId: input.userId,
    writerId: input.writerId
  };
  const existingLease = await requestResult(
    writerStore.get(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.draftId))
  ) as TeacherVisualizationDraftWriterLease | undefined;
  if (!isTeacherVisualizationDraftWriterLeaseHeld(existingLease, leaseInput)) {
    await transactionDone(transaction);
    return { ok: false as const, reason: "active-writer-conflict" as const };
  }
  const renewedLease = decideTeacherVisualizationDraftWriterLease(existingLease, leaseInput);
  if (!renewedLease.ok) {
    await transactionDone(transaction);
    return renewedLease;
  }
  await Promise.all([
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.audioStore),
      input.userId,
      input.draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.checkpointStore),
      input.userId,
      input.draftId
    ),
    deleteOwnerDraftRecords(
      transaction.objectStore(teacherVisualizationDraftIndexedDbConfig.draftStore),
      input.userId,
      input.draftId
    )
  ]);
  writerStore.delete(buildTeacherVisualizationDraftWriterLeaseKey(input.userId, input.draftId));
  await transactionDone(transaction);
  return { ok: true as const };
}
