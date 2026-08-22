import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  symlink,
  truncate,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION,
  createCaliforniaSignatureEvidenceStreamWriter,
  readCaliforniaSignatureEvidenceStream,
  type CaliforniaSignatureEvidenceStreamManifest
} from "./california-signature-evidence-stream";

const testRoot = process.env.CA_SIGNATURE_STREAM_TEST_ROOT?.trim();
assert.ok(testRoot && path.isAbsolute(testRoot) && testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_STREAM_TEST_ROOT must be one absolute /Volumes/Starship path");

function key(label: string) {
  return createHash("sha256").update(label).digest("hex");
}

function record(label: string, payload = label) {
  return { key: key(label), label, payload };
}

async function directory(t: test.TestContext) {
  await mkdir(testRoot!, { recursive: true });
  const root = await mkdtemp(path.join(testRoot!, "stream-"));
  t.after(async () => {
    // Test-owned Starship-only roots are intentionally left for the parent
    // acceptance wrapper to archive/remove; this test never broad-deletes.
  });
  return root;
}

async function collect(
  root: string,
  manifest: CaliforniaSignatureEvidenceStreamManifest
) {
  const records = [];
  for await (const value of readCaliforniaSignatureEvidenceStream({
    manifest,
    runDirectory: root
  })) records.push(value);
  return records;
}

test("framed evidence round-trips exact canonical records with bounded chunks and manifest roots", async (t) => {
  const root = await directory(t);
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: "ca-signature-run-0123456789abcdef__desktop__package-1",
    caps: {
      maxArtifactBytes: 16_384,
      maxChunkBytes: 360,
      maxChunksPerArtifact: 8,
      maxRecordBytes: 256,
      maxRecordsPerChunk: 2
    },
    reserveRunBytes: async () => {},
    runDirectory: root
  });
  const expected = [record("alpha"), record("bravo"), record("charlie")]
    .sort((left, right) => left.key < right.key ? -1 : 1);
  await writer.appendBatch([expected[1]!, expected[0]!]);
  await writer.appendBatch([expected[2]!]);
  const manifest = await writer.finalize();

  assert.equal(manifest.schemaVersion, CALIFORNIA_SIGNATURE_EVIDENCE_STREAM_SCHEMA_VERSION);
  assert.equal(manifest.recordCount, 3);
  assert.ok(manifest.chunks.length >= 2);
  assert.equal(manifest.firstKey, expected[0]!.key);
  assert.equal(manifest.lastKey, expected.at(-1)!.key);
  assert.match(manifest.orderedRecordSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.chunkMerkleRootSha256, /^[a-f0-9]{64}$/);
  for (const chunk of manifest.chunks) {
    assert.ok(chunk.framedBytes <= 360);
    assert.ok(chunk.recordCount <= 2);
    assert.match(chunk.sha256, /^[a-f0-9]{64}$/);
    assert.match(chunk.recordMerkleRootSha256, /^[a-f0-9]{64}$/);
    const identity = await lstat(path.join(root, chunk.fileName));
    assert.ok(identity.isFile() && !identity.isSymbolicLink());
    assert.equal(identity.nlink, 1);
    assert.equal(identity.mode & 0o777, 0o600);
  }
  assert.deepEqual(await collect(root, manifest), expected);
});

test("writer fails closed on duplicate, retrograde, record, chunk, artifact, and run reservations", async (t) => {
  const root = await directory(t);
  const artifactId = "ca-signature-run-0123456789abcdef__desktop__bounds";
  const reservations: number[] = [];
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId,
    caps: {
      maxArtifactBytes: 700,
      maxChunkBytes: 360,
      maxChunksPerArtifact: 2,
      maxRecordBytes: 180,
      maxRecordsPerChunk: 2
    },
    reserveRunBytes: async (bytes) => { reservations.push(bytes); },
    runDirectory: root
  });
  const ordered = [record("one"), record("two"), record("three")]
    .sort((left, right) => left.key < right.key ? -1 : 1);
  await writer.appendBatch([ordered[1]!, ordered[0]!]);
  await assert.rejects(() => writer.appendBatch([ordered[0]!]), /duplicate|retrograde|monotonic/i);
  await assert.rejects(() => writer.appendBatch([record("oversize", "x".repeat(500))]), /record.*cap/i);
  await writer.abort();
  assert.ok(reservations.length > 0 && reservations.every((value) => value > 0));

  const rejecting = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: `${artifactId}-reserve`,
    reserveRunBytes: async () => { throw new Error("run-cap-canary"); },
    runDirectory: root
  });
  await assert.rejects(() => rejecting.appendBatch([record("reservation")]), /run-cap-canary/);
  await rejecting.abort();
});

test("reader rejects truncation, trailing bytes, digest drift, hardlinks, symlinks, and unsafe manifest paths", async (t) => {
  const root = await directory(t);
  const create = async (suffix: string) => {
    const writer = await createCaliforniaSignatureEvidenceStreamWriter({
      artifactId: `ca-signature-run-0123456789abcdef__desktop__${suffix}`,
      reserveRunBytes: async () => {},
      runDirectory: root
    });
    await writer.appendBatch([record(`${suffix}-record`)]);
    return writer.finalize();
  };

  const truncated = await create("truncated");
  const truncatedPath = path.join(root, truncated.chunks[0]!.fileName);
  const truncatedIdentity = await lstat(truncatedPath);
  await truncate(truncatedPath, truncatedIdentity.size - 1);
  await assert.rejects(() => collect(root, truncated), /size|truncat|newline/i);

  const trailing = await create("trailing");
  const trailingPath = path.join(root, trailing.chunks[0]!.fileName);
  const trailingHandle = await open(trailingPath, "a");
  await trailingHandle.writeFile("poison");
  await trailingHandle.close();
  await assert.rejects(() => collect(root, trailing), /size|trailing|digest/i);

  const drifted = await create("drifted");
  const driftedPath = path.join(root, drifted.chunks[0]!.fileName);
  const bytes = await readFile(driftedPath);
  const bodyOffset = bytes.indexOf(Buffer.from("{\""));
  assert.ok(bodyOffset > 0);
  bytes[bodyOffset + 2] = bytes[bodyOffset + 2] === 97 ? 98 : 97;
  await writeFile(driftedPath, bytes);
  await assert.rejects(() => collect(root, drifted), /sha|digest|canonical|JSON/i);

  const hardlinked = await create("hardlinked");
  const hardlinkPath = path.join(root, hardlinked.chunks[0]!.fileName);
  await link(hardlinkPath, `${hardlinkPath}.alias`);
  await assert.rejects(() => collect(root, hardlinked), /hard.?link|nlink/i);

  const symlinked = await create("symlinked");
  const symlinkPath = path.join(root, symlinked.chunks[0]!.fileName);
  await rename(symlinkPath, `${symlinkPath}.real`);
  await symlink(`${symlinkPath}.real`, symlinkPath);
  await assert.rejects(() => collect(root, symlinked), /symlink|ELOOP|regular/i);

  const unsafe = structuredClone(symlinked);
  unsafe.chunks[0]!.fileName = "../escape.frame";
  await assert.rejects(() => collect(root, unsafe), /unsafe|canonical|inside/i);
});

test("exclusive final chunk publication never overwrites an existing target and cleans private pending", async (t) => {
  const root = await directory(t);
  const artifactId = "ca-signature-run-0123456789abcdef__desktop__exclusive";
  const expectedFinal = `${artifactId}.evidence-000001.frame`;
  await writeFile(path.join(root, expectedFinal), "owner-bytes", { flag: "wx", mode: 0o600 });
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId,
    reserveRunBytes: async () => {},
    runDirectory: root
  });
  await writer.appendBatch([record("exclusive")]);
  await assert.rejects(() => writer.finalize(), /EEXIST|exclusive|already exists/i);
  assert.equal(await readFile(path.join(root, expectedFinal), "utf8"), "owner-bytes");
  const entries = await (await import("node:fs/promises")).readdir(root);
  assert.deepEqual(entries.filter((entry) => entry.includes("producer-pending")), []);
});

test("reader rejects non-0600 files and writer rejects unsafe artifact identifiers", async (t) => {
  const root = await directory(t);
  await assert.rejects(() => createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: "../escape",
    reserveRunBytes: async () => {},
    runDirectory: root
  }), /safe.*identifier|unsafe/i);

  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: "ca-signature-run-0123456789abcdef__desktop__mode",
    reserveRunBytes: async () => {},
    runDirectory: root
  });
  await writer.appendBatch([record("mode")]);
  const manifest = await writer.finalize();
  await chmod(path.join(root, manifest.chunks[0]!.fileName), 0o644);
  await assert.rejects(() => collect(root, manifest), /0600|mode/i);
});

test("semantic order is recomputed from the complete record instead of trusting record SHA or a claimed field", async (t) => {
  const root = await directory(t);
  const orderKey = (value: Record<string, unknown> & { key: string }) => {
    assert.equal(typeof value.label, "string");
    return value.label as string;
  };
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: "ca-signature-run-0123456789abcdef__desktop__semantic",
    orderKey,
    reserveRunBytes: async () => {},
    runDirectory: root
  });
  const values = [
    { ...record("alpha"), claimedOrderKey: "zzzz" },
    { ...record("bravo"), claimedOrderKey: "aaaa" },
    { ...record("charlie"), claimedOrderKey: "mmmm" }
  ];
  await writer.appendBatch([values[1]!, values[0]!]);
  await writer.appendBatch([values[2]!]);
  const manifest = await writer.finalize();
  assert.equal(manifest.firstOrderKey, "alpha");
  assert.equal(manifest.lastOrderKey, "charlie");
  assert.match(manifest.orderedEvidenceKeySha256, /^[a-f0-9]{64}$/);

  const observed = [];
  for await (const value of readCaliforniaSignatureEvidenceStream({
    manifest,
    orderKey,
    runDirectory: root
  })) observed.push(value);
  assert.deepEqual(observed.map((value) => value.label), ["alpha", "bravo", "charlie"]);
  await assert.rejects(async () => {
    for await (const _value of readCaliforniaSignatureEvidenceStream({
      manifest,
      orderKey: (value) => String(value.claimedOrderKey),
      runDirectory: root
    })) {
      // Consume to the terminal verifier; a mismatched semantic function must fail.
    }
  }, /order|retrograde|drift/i);
});
