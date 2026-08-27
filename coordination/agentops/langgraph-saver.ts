import type { RunnableConfig } from "@langchain/core/runnables";
import {
  MemorySaver,
  type Checkpoint,
  type CheckpointMetadata,
} from "@langchain/langgraph";
import type { PendingWrite } from "@langchain/langgraph-checkpoint";

import { sha256Digest } from "./canonical";
import type { AgentOpsRunStore } from "./checkpoint";
import { assertNoSensitivePersistence } from "./security";

const SNAPSHOT_SCHEMA_VERSION = "mais-agentops-langgraph-memory.v1" as const;

type EncodedStorage = Record<
  string,
  Record<string, Record<string, readonly [string, string, string | null]>>
>;
type EncodedWrites = Record<
  string,
  Record<string, readonly [string, string, string]>
>;

interface LangGraphMemorySnapshotV1 {
  readonly schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  readonly storage: EncodedStorage;
  readonly writes: EncodedWrites;
  readonly snapshotDigest: string;
}

function encodeBytes(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

function decodeBytes(value: unknown, pathName: string): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    throw new TypeError(`${pathName} is not canonical base64`);
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) {
    throw new TypeError(`${pathName} has a non-canonical base64 encoding`);
  }
  return new Uint8Array(decoded);
}

function encodeStorage(storage: MemorySaver["storage"]): EncodedStorage {
  return Object.fromEntries(
    Object.entries(storage).map(([threadId, namespaces]) => [
      threadId,
      Object.fromEntries(
        Object.entries(namespaces).map(([namespace, checkpoints]) => [
          namespace,
          Object.fromEntries(
            Object.entries(checkpoints).map(
              ([checkpointId, [checkpointBytes, metadataBytes, parentId]]) => [
                checkpointId,
                [
                  encodeBytes(checkpointBytes),
                  encodeBytes(metadataBytes),
                  parentId ?? null,
                ],
              ],
            ),
          ),
        ]),
      ),
    ]),
  );
}

function encodeWrites(writes: MemorySaver["writes"]): EncodedWrites {
  return Object.fromEntries(
    Object.entries(writes).map(([outerKey, records]) => [
      outerKey,
      Object.fromEntries(
        Object.entries(records).map(([innerKey, [taskId, channel, bytes]]) => [
          innerKey,
          [taskId, channel, encodeBytes(bytes)],
        ]),
      ),
    ]),
  );
}

function requireRecord(value: unknown, pathName: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${pathName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function decodeStorage(value: unknown): MemorySaver["storage"] {
  const storage: MemorySaver["storage"] = {};
  for (const [threadId, namespaceValue] of Object.entries(
    requireRecord(value, "snapshot.storage"),
  )) {
    storage[threadId] = {};
    for (const [namespace, checkpointValue] of Object.entries(
      requireRecord(namespaceValue, `snapshot.storage.${threadId}`),
    )) {
      storage[threadId][namespace] = {};
      for (const [checkpointId, tupleValue] of Object.entries(
        requireRecord(
          checkpointValue,
          `snapshot.storage.${threadId}.${namespace}`,
        ),
      )) {
        if (!Array.isArray(tupleValue) || tupleValue.length !== 3) {
          throw new TypeError("snapshot storage tuple is invalid");
        }
        const [checkpointBytes, metadataBytes, parentId] = tupleValue;
        if (parentId !== null && typeof parentId !== "string") {
          throw new TypeError("snapshot parent checkpoint id is invalid");
        }
        storage[threadId][namespace][checkpointId] = [
          decodeBytes(checkpointBytes, "checkpoint bytes"),
          decodeBytes(metadataBytes, "metadata bytes"),
          parentId ?? undefined,
        ];
      }
    }
  }
  return storage;
}

function decodeWrites(value: unknown): MemorySaver["writes"] {
  const writes: MemorySaver["writes"] = {};
  for (const [outerKey, recordValue] of Object.entries(
    requireRecord(value, "snapshot.writes"),
  )) {
    writes[outerKey] = {};
    for (const [innerKey, tupleValue] of Object.entries(
      requireRecord(recordValue, `snapshot.writes.${outerKey}`),
    )) {
      if (
        !Array.isArray(tupleValue) ||
        tupleValue.length !== 3 ||
        typeof tupleValue[0] !== "string" ||
        typeof tupleValue[1] !== "string"
      ) {
        throw new TypeError("snapshot write tuple is invalid");
      }
      writes[outerKey][innerKey] = [
        tupleValue[0],
        tupleValue[1],
        decodeBytes(tupleValue[2], "pending write bytes"),
      ];
    }
  }
  return writes;
}

function parseSnapshot(value: unknown): LangGraphMemorySnapshotV1 {
  const record = requireRecord(value, "LangGraph memory snapshot");
  const keys = Object.keys(record).sort();
  const expected = ["schemaVersion", "snapshotDigest", "storage", "writes"].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    throw new TypeError("LangGraph memory snapshot schema fields are invalid");
  }
  if (record.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new TypeError("LangGraph memory snapshot version is unsupported");
  }
  if (typeof record.snapshotDigest !== "string") {
    throw new TypeError("LangGraph memory snapshot digest is invalid");
  }
  const body = {
    schemaVersion: record.schemaVersion,
    storage: record.storage,
    writes: record.writes,
  };
  if (sha256Digest(body) !== record.snapshotDigest) {
    throw new Error("LangGraph memory snapshot digest integrity failure");
  }
  assertNoSensitivePersistence(record);
  return record as unknown as LangGraphMemorySnapshotV1;
}

export class AgentOpsFileSaver extends MemorySaver {
  private persistenceTail: Promise<void> = Promise.resolve();

  private constructor(private readonly runStore: AgentOpsRunStore) {
    super();
  }

  static async open(runStore: AgentOpsRunStore): Promise<AgentOpsFileSaver> {
    const saver = new AgentOpsFileSaver(runStore);
    const persisted = await runStore.readLangGraphMemory<unknown>();
    if (persisted !== null) {
      const snapshot = parseSnapshot(persisted);
      saver.storage = decodeStorage(snapshot.storage);
      saver.writes = decodeWrites(snapshot.writes);
    }
    return saver;
  }

  private persist(): Promise<void> {
    const pending = this.persistenceTail.then(async () => {
      const body = {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        storage: encodeStorage(this.storage),
        writes: encodeWrites(this.writes),
      };
      const snapshot: LangGraphMemorySnapshotV1 = {
        ...body,
        snapshotDigest: sha256Digest(body),
      };
      await this.runStore.writeLangGraphMemory(snapshot);
    });
    this.persistenceTail = pending.catch(() => undefined);
    return pending;
  }

  override async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<RunnableConfig> {
    const result = await super.put(config, checkpoint, metadata);
    await this.persist();
    return result;
  }

  override async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    await super.putWrites(config, writes, taskId);
    await this.persist();
  }

  override async deleteThread(_threadId: string): Promise<void> {
    throw new Error("deleting AgentOps v1 checkpoint history is forbidden");
  }
}
