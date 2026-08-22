import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  link,
  lstat,
  open,
  readdir,
  statfs,
  unlink,
  type FileHandle
} from "node:fs/promises";
import path from "node:path";

export const CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION = 1;
export const CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_MAGIC =
  "MAIS-CALIFORNIA-SIGNATURE-EVIDENCE/1\n";
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORD_BYTES = 4 * 1024 * 1024;
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES = 32 * 1024 * 1024;
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORDS_PER_CHUNK = 4_096;
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNKS_PER_ARTIFACT = 256;
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_ARTIFACT_BYTES = 8 * 1024 * 1024 * 1024;
export const CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES = 128 * 1024 * 1024 * 1024;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ARTIFACT_ID_PATTERN = /^[a-z0-9:_-]{24,180}$/i;
const SAFE_CHUNK_FILE_PATTERN = /^[a-z0-9:_-]{24,180}\.evidence-\d{6}\.frame$/i;
const MAX_FRAME_HEADER_BYTES = 96;
const MAX_ORDER_KEY_BYTES = 16 * 1024;

export type CaliforniaSignatureEvidenceStreamCaps = {
  maxArtifactBytes: number;
  maxChunkBytes: number;
  maxChunksPerArtifact: number;
  maxRecordBytes: number;
  maxRecordsPerChunk: number;
};

export type CaliforniaSignatureEvidenceChunkManifest = {
  canonicalRecordBytes: number;
  fileName: string;
  firstKey: string;
  firstOrderKey: string;
  framedBytes: number;
  index: number;
  lastKey: string;
  lastOrderKey: string;
  orderedEvidenceKeySha256: string;
  orderedOrderKeySha256: string;
  recordCount: number;
  recordMerkleRootSha256: string;
  sha256: string;
};

export type CaliforniaSignatureEvidenceStreamManifest = {
  canonicalRecordBytes: number;
  chunkMerkleRootSha256: string;
  chunks: CaliforniaSignatureEvidenceChunkManifest[];
  firstKey: string;
  firstOrderKey: string;
  format: "canonical-length-delimited-json";
  framedBytes: number;
  lastKey: string;
  lastOrderKey: string;
  orderedEvidenceKeySha256: string;
  orderedOrderKeySha256: string;
  orderedRecordSha256: string;
  recordCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION;
};

export type CaliforniaSignaturePartialEvidenceStreamDiagnostic = {
  chunks: CaliforniaSignatureEvidenceChunkManifest[];
  completedCanonicalRecordBytes: number;
  completedFramedBytes: number;
  completedRecordCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION;
};

export type CaliforniaSignatureEvidenceStreamRecord = Record<string, unknown> & { key: string };

export type CaliforniaSignatureEvidenceOrderKey = (
  record: CaliforniaSignatureEvidenceStreamRecord
) => string;

type WritableChunk = {
  canonicalRecordBytes: number;
  fileName: string;
  firstKey: string | null;
  firstOrderKey: string | null;
  framedBytes: number;
  handle: FileHandle;
  initialIdentity: Awaited<ReturnType<FileHandle["stat"]>>;
  lastKey: string | null;
  lastOrderKey: string | null;
  orderedEvidenceKeySha256: ReturnType<typeof createHash>;
  orderedOrderKeySha256: ReturnType<typeof createHash>;
  pendingPath: string;
  recordCount: number;
  recordDigests: string[];
  sha256: ReturnType<typeof createHash>;
};

function codepointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalCaliforniaSignatureEvidenceJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalCaliforniaSignatureEvidenceJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort(codepointCompare).map((key) =>
      `${JSON.stringify(key)}:${canonicalCaliforniaSignatureEvidenceJson(record[key])}`
    ).join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("California signature evidence contains a non-JSON value");
  }
  return serialized;
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertOrderKey(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && value.length > 0,
    `${label}: evidence order key is empty or non-string`);
  assert.ok(Buffer.byteLength(value, "utf8") <= MAX_ORDER_KEY_BYTES,
    `${label}: evidence order key exceeds ${MAX_ORDER_KEY_BYTES} bytes`);
}

function updateOrderedKeyHash(hash: ReturnType<typeof createHash>, orderKey: string) {
  const bytes = Buffer.from(orderKey, "utf8");
  hash.update(String(bytes.length)).update(":").update(bytes).update("\n");
}

export function californiaSignatureEvidenceMerkleRootSha256(leaves: readonly string[]) {
  assert.ok(leaves.length > 0, "California signature evidence Merkle tree has no leaves");
  for (const leaf of leaves) assert.match(leaf, SHA256_PATTERN);
  let level: Array<Buffer<ArrayBufferLike>> = leaves.map((leaf) => Buffer.from(leaf, "hex"));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]!;
      const right = level[index + 1] ?? left;
      next.push(createHash("sha256").update(left).update(right).digest());
    }
    level = next;
  }
  return level[0]!.toString("hex");
}

function productionCaps(): CaliforniaSignatureEvidenceStreamCaps {
  return {
    maxArtifactBytes: CALIFORNIA_SIGNATURE_MAX_EVIDENCE_ARTIFACT_BYTES,
    maxChunkBytes: CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
    maxChunksPerArtifact: CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNKS_PER_ARTIFACT,
    maxRecordBytes: CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORD_BYTES,
    maxRecordsPerChunk: CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORDS_PER_CHUNK
  };
}

function assertCaps(caps: CaliforniaSignatureEvidenceStreamCaps) {
  const production = productionCaps();
  for (const key of Object.keys(production) as Array<keyof CaliforniaSignatureEvidenceStreamCaps>) {
    assert.ok(Number.isSafeInteger(caps[key]) && caps[key] > 0 && caps[key] <= production[key],
      `California signature evidence ${key} must be 1..${production[key]}; received ${caps[key]}`);
  }
  assert.ok(caps.maxRecordBytes < caps.maxChunkBytes,
    "California signature evidence record cap must be smaller than the chunk cap");
}

function assertArtifactId(artifactId: string) {
  assert.match(artifactId, SAFE_ARTIFACT_ID_PATTERN,
    "California signature evidence artifactId is not one safe identifier");
  return artifactId;
}

async function assertRunDirectory(runDirectoryInput: string) {
  const runDirectory = path.resolve(runDirectoryInput);
  const identity = await lstat(runDirectory);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    "California signature evidence run directory must be one regular non-symlink directory");
  return runDirectory;
}

function safeChunkPath(runDirectory: string, fileName: string) {
  assert.match(fileName, SAFE_CHUNK_FILE_PATTERN,
    "California signature evidence chunk filename is unsafe");
  const target = path.resolve(runDirectory, fileName);
  assert.equal(path.dirname(target), runDirectory,
    "California signature evidence chunk is not canonical inside the run directory");
  return target;
}

async function syncDirectory(directory: string) {
  const handle = await open(directory, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const identity = await handle.stat();
    assert.ok(identity.isDirectory(), "California signature evidence parent is not a directory");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeAll(handle: FileHandle, bytes: Buffer) {
  let offset = 0;
  while (offset < bytes.length) {
    const result = await handle.write(bytes, offset, bytes.length - offset, null);
    assert.ok(result.bytesWritten > 0, "California signature evidence write made no progress");
    offset += result.bytesWritten;
  }
}

async function ensureFreeSpace(runDirectory: string, bytes: number) {
  const available = await statfs(runDirectory);
  const freeBytes = Number(available.bavail) * Number(available.bsize);
  assert.ok(Number.isSafeInteger(freeBytes) && freeBytes >= bytes,
    `California signature evidence needs ${bytes} bytes but Starship reports ${freeBytes} free bytes`);
}

async function unlinkIfOwned(target: string) {
  try {
    await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

class CaliforniaSignatureEvidenceStreamWriter {
  private readonly artifactId: string;
  private readonly caps: CaliforniaSignatureEvidenceStreamCaps;
  private readonly chunks: CaliforniaSignatureEvidenceChunkManifest[] = [];
  private readonly orderKeyOf: CaliforniaSignatureEvidenceOrderKey;
  private readonly orderedEvidenceKeyHash = createHash("sha256");
  private readonly orderedOrderKeyHash = createHash("sha256");
  private readonly orderedRecordHash = createHash("sha256");
  private readonly reserveRunBytes: (bytes: number) => Promise<void>;
  private readonly runDirectory: string;
  private activeChunk: WritableChunk | null = null;
  private aborted = false;
  private canonicalRecordBytes = 0;
  private finalized = false;
  private firstKey: string | null = null;
  private firstOrderKey: string | null = null;
  private framedBytes = 0;
  private lastKey: string | null = null;
  private lastOrderKey: string | null = null;
  private recordCount = 0;

  constructor(options: {
    artifactId: string;
    caps: CaliforniaSignatureEvidenceStreamCaps;
    orderKey: CaliforniaSignatureEvidenceOrderKey;
    reserveRunBytes(bytes: number): Promise<void>;
    runDirectory: string;
  }) {
    this.artifactId = options.artifactId;
    this.caps = options.caps;
    this.orderKeyOf = options.orderKey;
    this.reserveRunBytes = options.reserveRunBytes;
    this.runDirectory = options.runDirectory;
  }

  private assertOpen() {
    assert.ok(!this.aborted, `${this.artifactId}: evidence writer is aborted`);
    assert.ok(!this.finalized, `${this.artifactId}: evidence writer is finalized`);
  }

  private async reserve(bytes: number) {
    assert.ok(this.framedBytes + bytes <= this.caps.maxArtifactBytes,
      `${this.artifactId}: evidence artifact byte cap ${this.caps.maxArtifactBytes} exceeded`);
    await ensureFreeSpace(this.runDirectory, bytes);
    await this.reserveRunBytes(bytes);
  }

  private async openChunk() {
    assert.equal(this.activeChunk, null);
    const index = this.chunks.length + 1;
    assert.ok(index <= this.caps.maxChunksPerArtifact,
      `${this.artifactId}: evidence chunk cap ${this.caps.maxChunksPerArtifact} exceeded`);
    const fileName = `${this.artifactId}.evidence-${String(index).padStart(6, "0")}.frame`;
    const finalPath = safeChunkPath(this.runDirectory, fileName);
    const pendingPath = `${finalPath}.${process.pid}.${randomUUID()}.producer-pending.tmp`;
    assert.equal(path.dirname(path.resolve(pendingPath)), this.runDirectory,
      `${this.artifactId}: private pending chunk escaped the run directory`);
    const magic = Buffer.from(CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_MAGIC, "utf8");
    await this.reserve(magic.length);
    const handle = await open(
      pendingPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
      0o600
    );
    try {
      const initialIdentity = await handle.stat();
      assert.ok(initialIdentity.isFile() && initialIdentity.nlink === 1,
        `${this.artifactId}: private pending chunk is not one regular file`);
      assert.equal(initialIdentity.mode & 0o777, 0o600,
        `${this.artifactId}: private pending chunk mode is not 0600`);
      await writeAll(handle, magic);
      const chunk: WritableChunk = {
        canonicalRecordBytes: 0,
        fileName,
        firstKey: null,
        firstOrderKey: null,
        framedBytes: magic.length,
        handle,
        initialIdentity,
        lastKey: null,
        lastOrderKey: null,
        orderedEvidenceKeySha256: createHash("sha256"),
        orderedOrderKeySha256: createHash("sha256"),
        pendingPath,
        recordCount: 0,
        recordDigests: [],
        sha256: createHash("sha256").update(magic)
      };
      this.activeChunk = chunk;
      this.framedBytes += magic.length;
    } catch (error) {
      await handle.close().catch(() => {});
      await unlinkIfOwned(pendingPath).catch(() => {});
      throw error;
    }
  }

  private async finalizeChunk() {
    const chunk = this.activeChunk;
    if (!chunk) return;
    assert.ok(chunk.recordCount > 0 && chunk.firstKey && chunk.lastKey &&
      chunk.firstOrderKey && chunk.lastOrderKey,
      `${this.artifactId}: refusing an empty evidence chunk`);
    const finalPath = safeChunkPath(this.runDirectory, chunk.fileName);
    let linked = false;
    try {
      await chunk.handle.sync();
      const afterWrite = await chunk.handle.stat();
      for (const key of ["dev", "ino", "nlink", "mode"] as const) {
        assert.equal(afterWrite[key], chunk.initialIdentity[key],
          `${this.artifactId}: pending chunk identity changed during write (${key})`);
      }
      assert.equal(afterWrite.size, chunk.framedBytes,
        `${this.artifactId}: pending chunk byte length drifted`);
      await chunk.handle.close();
      await link(chunk.pendingPath, finalPath);
      linked = true;
      await unlink(chunk.pendingPath);
      await syncDirectory(this.runDirectory);
      const published = await lstat(finalPath);
      assert.ok(published.isFile() && !published.isSymbolicLink() && published.nlink === 1,
        `${this.artifactId}: final chunk is not one regular non-hardlinked file`);
      assert.equal(published.mode & 0o777, 0o600,
        `${this.artifactId}: final chunk mode is not 0600`);
      assert.equal(published.size, chunk.framedBytes,
        `${this.artifactId}: final chunk size drifted`);
      this.chunks.push({
        canonicalRecordBytes: chunk.canonicalRecordBytes,
        fileName: chunk.fileName,
        firstKey: chunk.firstKey,
        firstOrderKey: chunk.firstOrderKey,
        framedBytes: chunk.framedBytes,
        index: this.chunks.length + 1,
        lastKey: chunk.lastKey,
        lastOrderKey: chunk.lastOrderKey,
        orderedEvidenceKeySha256: chunk.orderedEvidenceKeySha256.digest("hex"),
        orderedOrderKeySha256: chunk.orderedOrderKeySha256.digest("hex"),
        recordCount: chunk.recordCount,
        recordMerkleRootSha256: californiaSignatureEvidenceMerkleRootSha256(chunk.recordDigests),
        sha256: chunk.sha256.digest("hex")
      });
      this.activeChunk = null;
    } catch (error) {
      await chunk.handle.close().catch(() => {});
      if (linked) await unlinkIfOwned(finalPath).catch(() => {});
      await unlinkIfOwned(chunk.pendingPath).catch(() => {});
      this.activeChunk = null;
      throw error;
    }
  }

  async appendBatch(input: readonly CaliforniaSignatureEvidenceStreamRecord[]) {
    this.assertOpen();
    assert.ok(input.length > 0, `${this.artifactId}: evidence batch is empty`);
    const records = input.map((record) => {
      assert.match(record.key, SHA256_PATTERN,
        `${this.artifactId}: evidence record key is not one canonical SHA-256`);
      const orderKey = this.orderKeyOf(record);
      assertOrderKey(orderKey, `${this.artifactId}/${record.key}`);
      return { orderKey, record };
    }).sort((left, right) => codepointCompare(left.orderKey, right.orderKey));
    for (let index = 1; index < records.length; index += 1) {
      assert.ok(records[index - 1]!.orderKey < records[index]!.orderKey,
        `${this.artifactId}: evidence batch contains a duplicate or non-monotonic order key`);
    }
    assert.ok(this.lastOrderKey === null || this.lastOrderKey < records[0]!.orderKey,
      `${this.artifactId}: evidence batch is duplicate or retrograde relative to the monotonic stream`);

    for (const entry of records) {
      const { orderKey, record } = entry;
      const canonical = Buffer.from(canonicalCaliforniaSignatureEvidenceJson(record), "utf8");
      assert.ok(canonical.length <= this.caps.maxRecordBytes,
        `${this.artifactId}/${record.key}: evidence record exceeds ${this.caps.maxRecordBytes} record byte cap`);
      const recordDigest = sha256(canonical);
      const header = Buffer.from(`${canonical.length}\t${recordDigest}\n`, "ascii");
      assert.ok(header.length <= MAX_FRAME_HEADER_BYTES);
      const terminalNewline = Buffer.from("\n", "ascii");
      const frameBytes = header.length + canonical.length + terminalNewline.length;
      assert.ok(frameBytes + Buffer.byteLength(CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_MAGIC) <=
        this.caps.maxChunkBytes,
      `${this.artifactId}/${record.key}: evidence frame cannot fit the chunk cap`);

      if (!this.activeChunk) await this.openChunk();
      if (this.activeChunk!.recordCount >= this.caps.maxRecordsPerChunk ||
          this.activeChunk!.framedBytes + frameBytes > this.caps.maxChunkBytes) {
        await this.finalizeChunk();
        await this.openChunk();
      }
      await this.reserve(frameBytes);
      const chunk = this.activeChunk!;
      await writeAll(chunk.handle, header);
      await writeAll(chunk.handle, canonical);
      await writeAll(chunk.handle, terminalNewline);
      chunk.sha256.update(header).update(canonical).update(terminalNewline);
      chunk.canonicalRecordBytes += canonical.length;
      chunk.framedBytes += frameBytes;
      chunk.firstKey ??= record.key;
      chunk.firstOrderKey ??= orderKey;
      chunk.lastKey = record.key;
      chunk.lastOrderKey = orderKey;
      chunk.recordCount += 1;
      chunk.recordDigests.push(recordDigest);
      chunk.orderedEvidenceKeySha256.update(record.key).update("\n");
      updateOrderedKeyHash(chunk.orderedOrderKeySha256, orderKey);
      this.canonicalRecordBytes += canonical.length;
      this.framedBytes += frameBytes;
      this.firstKey ??= record.key;
      this.firstOrderKey ??= orderKey;
      this.lastKey = record.key;
      this.lastOrderKey = orderKey;
      this.recordCount += 1;
      this.orderedEvidenceKeyHash.update(record.key).update("\n");
      updateOrderedKeyHash(this.orderedOrderKeyHash, orderKey);
      this.orderedRecordHash.update(recordDigest).update("\n");
    }
  }

  async finalize(): Promise<CaliforniaSignatureEvidenceStreamManifest> {
    this.assertOpen();
    assert.ok(this.recordCount > 0 && this.firstKey && this.lastKey &&
      this.firstOrderKey && this.lastOrderKey,
      `${this.artifactId}: cannot finalize an empty evidence stream`);
    await this.finalizeChunk();
    this.finalized = true;
    return {
      canonicalRecordBytes: this.canonicalRecordBytes,
      chunkMerkleRootSha256: californiaSignatureEvidenceMerkleRootSha256(
        this.chunks.map((chunk) => chunk.sha256)
      ),
      chunks: this.chunks.map((chunk) => ({ ...chunk })),
      firstKey: this.firstKey,
      firstOrderKey: this.firstOrderKey,
      format: "canonical-length-delimited-json",
      framedBytes: this.framedBytes,
      lastKey: this.lastKey,
      lastOrderKey: this.lastOrderKey,
      orderedEvidenceKeySha256: this.orderedEvidenceKeyHash.digest("hex"),
      orderedOrderKeySha256: this.orderedOrderKeyHash.digest("hex"),
      orderedRecordSha256: this.orderedRecordHash.digest("hex"),
      recordCount: this.recordCount,
      schemaVersion: CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION
    };
  }

  diagnostic(): CaliforniaSignaturePartialEvidenceStreamDiagnostic {
    return {
      chunks: this.chunks.map((chunk) => ({ ...chunk })),
      completedCanonicalRecordBytes: this.chunks.reduce(
        (sum, chunk) => sum + chunk.canonicalRecordBytes,
        0
      ),
      completedFramedBytes: this.chunks.reduce((sum, chunk) => sum + chunk.framedBytes, 0),
      completedRecordCount: this.chunks.reduce((sum, chunk) => sum + chunk.recordCount, 0),
      schemaVersion: CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION
    };
  }

  async abort() {
    if (this.finalized || this.aborted) return;
    this.aborted = true;
    const chunk = this.activeChunk;
    this.activeChunk = null;
    if (chunk) {
      await chunk.handle.close().catch(() => {});
      await unlinkIfOwned(chunk.pendingPath).catch(() => {});
    }
  }
}

export async function createCaliforniaSignatureEvidenceStreamWriter(options: {
  artifactId: string;
  caps?: CaliforniaSignatureEvidenceStreamCaps;
  orderKey?: CaliforniaSignatureEvidenceOrderKey;
  reserveRunBytes(bytes: number): Promise<void>;
  runDirectory: string;
}) {
  const artifactId = assertArtifactId(options.artifactId);
  const caps = options.caps ?? productionCaps();
  assertCaps(caps);
  const runDirectory = await assertRunDirectory(options.runDirectory);
  assert.equal((await readdir(runDirectory)).some((entry) => entry.includes("/")), false);
  return new CaliforniaSignatureEvidenceStreamWriter({
    artifactId,
    caps,
    orderKey: options.orderKey ?? ((record) => record.key),
    reserveRunBytes: options.reserveRunBytes,
    runDirectory
  });
}

async function readExact(handle: FileHandle, position: number, length: number) {
  const bytes = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const result = await handle.read(bytes, offset, length - offset, position + offset);
    if (result.bytesRead === 0) {
      throw new Error(`California signature evidence truncated at byte ${position + offset}`);
    }
    offset += result.bytesRead;
  }
  return bytes;
}

async function readLine(handle: FileHandle, position: number, maxBytes = MAX_FRAME_HEADER_BYTES) {
  const probe = Buffer.allocUnsafe(maxBytes + 1);
  const result = await handle.read(probe, 0, probe.length, position);
  const newline = probe.subarray(0, result.bytesRead).indexOf(0x0a);
  if (newline < 0) throw new Error(`California signature evidence line at ${position} exceeds its cap or is truncated`);
  return {
    bytes: probe.subarray(0, newline + 1),
    line: probe.subarray(0, newline).toString("ascii"),
    nextPosition: position + newline + 1
  };
}

function assertManifest(manifest: CaliforniaSignatureEvidenceStreamManifest) {
  assert.equal(manifest.schemaVersion, CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION);
  assert.equal(manifest.format, "canonical-length-delimited-json");
  assert.ok(Number.isSafeInteger(manifest.recordCount) && manifest.recordCount > 0);
  assert.ok(Number.isSafeInteger(manifest.canonicalRecordBytes) && manifest.canonicalRecordBytes > 0);
  assert.ok(Number.isSafeInteger(manifest.framedBytes) && manifest.framedBytes > 0 &&
    manifest.framedBytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_ARTIFACT_BYTES);
  assert.match(manifest.firstKey, SHA256_PATTERN);
  assert.match(manifest.lastKey, SHA256_PATTERN);
  assertOrderKey(manifest.firstOrderKey, "California signature evidence manifest first");
  assertOrderKey(manifest.lastOrderKey, "California signature evidence manifest last");
  assert.ok(manifest.firstOrderKey <= manifest.lastOrderKey,
    "California signature evidence manifest order-key range is retrograde");
  assert.match(manifest.orderedEvidenceKeySha256, SHA256_PATTERN);
  assert.match(manifest.orderedOrderKeySha256, SHA256_PATTERN);
  assert.match(manifest.orderedRecordSha256, SHA256_PATTERN);
  assert.match(manifest.chunkMerkleRootSha256, SHA256_PATTERN);
  assert.ok(Array.isArray(manifest.chunks) && manifest.chunks.length > 0 &&
    manifest.chunks.length <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNKS_PER_ARTIFACT);
}

type EvidenceChunkScanSummary = {
  canonicalRecordBytes: number;
  fileSha256: string | null;
  firstKey: string | null;
  firstOrderKey: string | null;
  framedBytes: number;
  lastKey: string | null;
  lastOrderKey: string | null;
  orderedEvidenceKeySha256: string | null;
  orderedOrderKeySha256: string | null;
  orderedRecordSha256: string | null;
  recordCount: number;
  recordMerkleRootSha256: string | null;
};

function iterateEvidenceChunkFrames(options: {
  aggregateEvidenceKeyHash?: ReturnType<typeof createHash>;
  aggregateOrderKeyHash?: ReturnType<typeof createHash>;
  aggregateRecordHash?: ReturnType<typeof createHash>;
  fileName: string;
  handle: FileHandle;
  orderKey: CaliforniaSignatureEvidenceOrderKey;
  previousOrderKey: string | null;
  size: number;
}) {
  const summary: EvidenceChunkScanSummary = {
    canonicalRecordBytes: 0,
    fileSha256: null,
    firstKey: null,
    firstOrderKey: null,
    framedBytes: 0,
    lastKey: null,
    lastOrderKey: null,
    orderedEvidenceKeySha256: null,
    orderedOrderKeySha256: null,
    orderedRecordSha256: null,
    recordCount: 0,
    recordMerkleRootSha256: null
  };
  const records = (async function* (): AsyncGenerator<CaliforniaSignatureEvidenceStreamRecord> {
    const fileHash = createHash("sha256");
    const orderedEvidenceKeyHash = createHash("sha256");
    const orderedOrderKeyHash = createHash("sha256");
    const orderedRecordHash = createHash("sha256");
    const recordDigests: string[] = [];
    let position = 0;
    const magicLength = Buffer.byteLength(CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_MAGIC);
    assert.ok(magicLength <= options.size && magicLength <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
      `${options.fileName}: evidence magic exceeds the bounded chunk`);
    const magic = await readExact(options.handle, position, magicLength);
    fileHash.update(magic);
    assert.equal(magic.toString("utf8"), CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_MAGIC,
      `${options.fileName}: evidence magic header drifted`);
    position += magic.length;
    let previousOrderKey = options.previousOrderKey;
    while (position < options.size) {
      assert.ok(position <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
        `${options.fileName}: online evidence chunk byte cap exceeded before frame header`);
      const header = await readLine(options.handle, position);
      fileHash.update(header.bytes);
      position = header.nextPosition;
      assert.ok(position <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
        `${options.fileName}: online evidence chunk byte cap exceeded after frame header`);
      const match = /^(\d{1,8})\t([a-f0-9]{64})$/.exec(header.line);
      assert.ok(match, `${options.fileName}: malformed evidence frame header`);
      const length = Number(match[1]);
      assert.ok(Number.isSafeInteger(length) && length > 0 &&
        length <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORD_BYTES,
      `${options.fileName}: evidence record length exceeds its cap`);
      const frameEnd = position + length + 1;
      assert.ok(Number.isSafeInteger(frameEnd) && frameEnd <= options.size,
        `${options.fileName}: evidence frame is truncated`);
      assert.ok(frameEnd <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
        `${options.fileName}: online evidence chunk byte cap exceeded before record allocation`);
      const canonical = await readExact(options.handle, position, length);
      fileHash.update(canonical);
      position += length;
      const newline = await readExact(options.handle, position, 1);
      fileHash.update(newline);
      position += 1;
      assert.equal(newline[0], 0x0a,
        `${options.fileName}: evidence frame has no terminal newline`);
      const recordDigest = sha256(canonical);
      assert.equal(recordDigest, match[2],
        `${options.fileName}: evidence record SHA-256 drifted`);
      let parsed: unknown;
      try {
        parsed = JSON.parse(canonical.toString("utf8"));
      } catch (error) {
        throw new Error(`${options.fileName}: invalid evidence JSON: ${
          error instanceof Error ? error.message : String(error)}`);
      }
      assert.ok(parsed && typeof parsed === "object" && !Array.isArray(parsed),
        `${options.fileName}: evidence record is not one object`);
      assert.equal(canonicalCaliforniaSignatureEvidenceJson(parsed), canonical.toString("utf8"),
        `${options.fileName}: evidence record is not canonical JSON`);
      const record = parsed as CaliforniaSignatureEvidenceStreamRecord;
      assert.match(record.key, SHA256_PATTERN,
        `${options.fileName}: evidence key is not canonical`);
      const orderKey = options.orderKey(record);
      assertOrderKey(orderKey, `${options.fileName}/${record.key}`);
      assert.ok(previousOrderKey === null || previousOrderKey < orderKey,
        `${options.fileName}: evidence stream has a duplicate or non-monotonic semantic order key`);
      previousOrderKey = orderKey;
      summary.firstKey ??= record.key;
      summary.lastKey = record.key;
      summary.firstOrderKey ??= orderKey;
      summary.lastOrderKey = orderKey;
      summary.canonicalRecordBytes += canonical.length;
      summary.recordCount += 1;
      assert.ok(summary.recordCount <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORDS_PER_CHUNK,
        `${options.fileName}: evidence chunk record cap exceeded`);
      recordDigests.push(recordDigest);
      orderedEvidenceKeyHash.update(record.key).update("\n");
      options.aggregateEvidenceKeyHash?.update(record.key).update("\n");
      orderedRecordHash.update(recordDigest).update("\n");
      options.aggregateRecordHash?.update(recordDigest).update("\n");
      updateOrderedKeyHash(orderedOrderKeyHash, orderKey);
      if (options.aggregateOrderKeyHash) updateOrderedKeyHash(options.aggregateOrderKeyHash, orderKey);
      yield record;
    }
    assert.equal(position, options.size,
      `${options.fileName}: evidence chunk has trailing bytes`);
    assert.ok(summary.recordCount > 0,
      `${options.fileName}: evidence chunk is empty`);
    summary.framedBytes = position;
    summary.fileSha256 = fileHash.digest("hex");
    summary.orderedEvidenceKeySha256 = orderedEvidenceKeyHash.digest("hex");
    summary.orderedOrderKeySha256 = orderedOrderKeyHash.digest("hex");
    summary.orderedRecordSha256 = orderedRecordHash.digest("hex");
    summary.recordMerkleRootSha256 = californiaSignatureEvidenceMerkleRootSha256(recordDigests);
  })();
  return { records, summary };
}

function assertChunkScanExact(
  expected: CaliforniaSignatureEvidenceChunkManifest,
  actual: EvidenceChunkScanSummary
) {
  assert.equal(actual.recordCount, expected.recordCount,
    `${expected.fileName}: evidence record count drifted`);
  assert.equal(actual.canonicalRecordBytes, expected.canonicalRecordBytes,
    `${expected.fileName}: canonical evidence byte count drifted`);
  assert.equal(actual.framedBytes, expected.framedBytes,
    `${expected.fileName}: framed evidence byte count drifted`);
  assert.equal(actual.firstKey, expected.firstKey,
    `${expected.fileName}: first evidence key drifted`);
  assert.equal(actual.lastKey, expected.lastKey,
    `${expected.fileName}: last evidence key drifted`);
  assert.equal(actual.firstOrderKey, expected.firstOrderKey,
    `${expected.fileName}: first evidence order key drifted`);
  assert.equal(actual.lastOrderKey, expected.lastOrderKey,
    `${expected.fileName}: last evidence order key drifted`);
  assert.equal(actual.fileSha256, expected.sha256,
    `${expected.fileName}: chunk SHA-256 drifted`);
  assert.equal(actual.orderedEvidenceKeySha256, expected.orderedEvidenceKeySha256,
    `${expected.fileName}: ordered evidence key digest drifted`);
  assert.equal(actual.orderedOrderKeySha256, expected.orderedOrderKeySha256,
    `${expected.fileName}: ordered evidence key digest drifted`);
  assert.equal(actual.recordMerkleRootSha256, expected.recordMerkleRootSha256,
    `${expected.fileName}: record Merkle root drifted`);
}

async function assertHeldChunkIdentity(options: {
  fileName: string;
  handle: FileHandle;
  initial: Awaited<ReturnType<FileHandle["stat"]>>;
  path: string;
  stage: string;
}) {
  const after = await options.handle.stat();
  for (const key of ["dev", "ino", "nlink", "mode", "size", "mtimeMs", "ctimeMs"] as const) {
    assert.equal(after[key], options.initial[key],
      `${options.fileName}: held chunk identity changed ${options.stage} (${key})`);
  }
  const pathnameIdentity = await lstat(options.path);
  assert.ok(pathnameIdentity.isFile() && !pathnameIdentity.isSymbolicLink() && pathnameIdentity.nlink === 1,
    `${options.fileName}: evidence pathname is not one regular non-hardlinked file ${options.stage}`);
  assert.equal(pathnameIdentity.dev, options.initial.dev,
    `${options.fileName}: evidence pathname device changed ${options.stage}`);
  assert.equal(pathnameIdentity.ino, options.initial.ino,
    `${options.fileName}: evidence pathname inode changed ${options.stage}`);
}

export async function* readCaliforniaSignatureEvidenceStream(options: {
  manifest: CaliforniaSignatureEvidenceStreamManifest;
  orderKey?: CaliforniaSignatureEvidenceOrderKey;
  runDirectory: string;
}): AsyncGenerator<CaliforniaSignatureEvidenceStreamRecord> {
  assertManifest(options.manifest);
  const runDirectory = await assertRunDirectory(options.runDirectory);
  const orderKey = options.orderKey ?? ((record: CaliforniaSignatureEvidenceStreamRecord) => record.key);
  let totalCanonicalBytes = 0;
  let totalFramedBytes = 0;
  let totalRecords = 0;
  let firstKey: string | null = null;
  let firstOrderKey: string | null = null;
  let lastKey: string | null = null;
  let lastOrderKey: string | null = null;
  let secondPassLastOrderKey: string | null = null;
  const orderedEvidenceKeyHash = createHash("sha256");
  const orderedOrderKeyHash = createHash("sha256");
  const orderedRecordHash = createHash("sha256");
  const chunkDigests: string[] = [];

  for (let chunkOffset = 0; chunkOffset < options.manifest.chunks.length; chunkOffset += 1) {
    const expected = options.manifest.chunks[chunkOffset]!;
    assert.equal(expected.index, chunkOffset + 1,
      "California signature evidence chunk index is not contiguous");
    assert.match(expected.sha256, SHA256_PATTERN);
    assert.match(expected.recordMerkleRootSha256, SHA256_PATTERN);
    assert.match(expected.orderedEvidenceKeySha256, SHA256_PATTERN);
    assert.match(expected.orderedOrderKeySha256, SHA256_PATTERN);
    assert.match(expected.firstKey, SHA256_PATTERN);
    assert.match(expected.lastKey, SHA256_PATTERN);
    assertOrderKey(expected.firstOrderKey, `${expected.fileName}: manifest first`);
    assertOrderKey(expected.lastOrderKey, `${expected.fileName}: manifest last`);
    assert.ok(expected.firstOrderKey <= expected.lastOrderKey,
      `${expected.fileName}: manifest order-key range is retrograde`);
    assert.ok(expected.recordCount > 0 && expected.recordCount <=
      CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORDS_PER_CHUNK);
    assert.ok(expected.framedBytes > 0 && expected.framedBytes <=
      CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES);
    assert.ok(expected.canonicalRecordBytes > 0 &&
      expected.canonicalRecordBytes <= expected.recordCount * CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RECORD_BYTES,
    `${expected.fileName}: manifest canonical record byte count exceeds its cap`);
    const chunkPath = safeChunkPath(runDirectory, expected.fileName);
    const handle = await open(chunkPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const identity = await handle.stat();
      assert.ok(identity.isFile() && identity.nlink === 1,
        `${expected.fileName}: evidence chunk must be one regular non-hardlinked file`);
      assert.equal(identity.mode & 0o777, 0o600,
        `${expected.fileName}: evidence chunk mode must remain 0600`);
      assert.equal(identity.size, expected.framedBytes,
        `${expected.fileName}: evidence chunk size drifted`);
      assert.ok(identity.size <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_CHUNK_BYTES,
        `${expected.fileName}: held evidence chunk exceeds its byte cap`);
      const firstPass = iterateEvidenceChunkFrames({
        aggregateEvidenceKeyHash: orderedEvidenceKeyHash,
        aggregateOrderKeyHash: orderedOrderKeyHash,
        aggregateRecordHash: orderedRecordHash,
        fileName: expected.fileName,
        handle,
        orderKey,
        previousOrderKey: lastOrderKey,
        size: identity.size
      });
      for await (const _record of firstPass.records) {
        // First pass authenticates every frame without retaining record objects.
      }
      assertChunkScanExact(expected, firstPass.summary);
      await assertHeldChunkIdentity({
        fileName: expected.fileName,
        handle,
        initial: identity,
        path: chunkPath,
        stage: "after verification pass"
      });
      firstKey ??= firstPass.summary.firstKey;
      firstOrderKey ??= firstPass.summary.firstOrderKey;
      lastKey = firstPass.summary.lastKey;
      lastOrderKey = firstPass.summary.lastOrderKey;
      totalCanonicalBytes += firstPass.summary.canonicalRecordBytes;
      totalRecords += firstPass.summary.recordCount;

      const secondPass = iterateEvidenceChunkFrames({
        fileName: expected.fileName,
        handle,
        orderKey,
        previousOrderKey: secondPassLastOrderKey,
        size: identity.size
      });
      for await (const record of secondPass.records) yield record;
      assertChunkScanExact(expected, secondPass.summary);
      secondPassLastOrderKey = secondPass.summary.lastOrderKey;
      await assertHeldChunkIdentity({
        fileName: expected.fileName,
        handle,
        initial: identity,
        path: chunkPath,
        stage: "after yielding pass"
      });
      chunkDigests.push(expected.sha256);
      totalFramedBytes += identity.size;
    } finally {
      await handle.close();
    }
  }

  assert.equal(totalRecords, options.manifest.recordCount,
    "California signature evidence stream record count drifted");
  assert.equal(totalCanonicalBytes, options.manifest.canonicalRecordBytes,
    "California signature evidence stream canonical byte count drifted");
  assert.equal(totalFramedBytes, options.manifest.framedBytes,
    "California signature evidence stream framed byte count drifted");
  assert.equal(firstKey, options.manifest.firstKey,
    "California signature evidence stream first key drifted");
  assert.equal(lastKey, options.manifest.lastKey,
    "California signature evidence stream last key drifted");
  assert.equal(firstOrderKey, options.manifest.firstOrderKey,
    "California signature evidence stream first order key drifted");
  assert.equal(lastOrderKey, options.manifest.lastOrderKey,
    "California signature evidence stream last order key drifted");
  assert.equal(secondPassLastOrderKey, options.manifest.lastOrderKey,
    "California signature evidence second pass last order key drifted");
  assert.equal(orderedEvidenceKeyHash.digest("hex"), options.manifest.orderedEvidenceKeySha256,
    "California signature evidence ordered record-key aggregate drifted");
  assert.equal(orderedOrderKeyHash.digest("hex"), options.manifest.orderedOrderKeySha256,
    "California signature evidence ordered semantic key aggregate drifted");
  assert.equal(orderedRecordHash.digest("hex"), options.manifest.orderedRecordSha256,
    "California signature evidence ordered aggregate drifted");
  assert.equal(
    californiaSignatureEvidenceMerkleRootSha256(chunkDigests),
    options.manifest.chunkMerkleRootSha256,
    "California signature evidence chunk Merkle root drifted");
}
