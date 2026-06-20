import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  mediaObjectAccessUrl,
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  scanMediaBytes,
  storeMediaObjectFromDataUrl
} from "./mediaObjectStore";

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d
]);
const pngDataUrl = `data:image/png;base64,${pngBytes.toString("base64")}`;
const mediaEncryptionKey = Buffer.alloc(32, 7).toString("base64");

async function withTempStore<T>(fn: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(path.join(tmpdir(), "mais-media-object-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("media scanner rejects active text payloads even when they are labelled as images", () => {
  const scan = scanMediaBytes({
    bytes: Buffer.from("<svg><script>alert(1)</script></svg>"),
    mimeType: "image/png"
  });

  assert.equal(scan.status, "failed");
  assert.equal(scan.code, "media-signature-mismatch");
});

test("media object store writes scanned encrypted bytes with retention metadata", async () => {
  await withTempStore(async (dir) => {
    const stored = await storeMediaObjectFromDataUrl({
      capability: "profile-avatar",
      dataUrl: pngDataUrl,
      env: {
        AI_MEDIA_ENCRYPTION_KEY: mediaEncryptionKey,
        AI_MEDIA_OBJECT_STORAGE_REQUIRED: "true",
        AI_MEDIA_OBJECT_STORE_DIR: dir,
        AI_MEDIA_RETENTION_DAYS: "30"
      },
      now: new Date("2026-06-12T00:00:00.000Z"),
      ownerId: "student-1"
    });

    assert.equal(stored.status, "stored");
    if (stored.status !== "stored") return;

    assert.equal(stored.media.encrypted, true);
    assert.equal(stored.media.scanStatus, "passed");
    assert.equal(stored.media.retentionExpiresAt, "2026-07-12T00:00:00.000Z");
    assert.match(stored.media.objectKey, /^profile-avatar\/2026\/06\//);
    assert.equal(mediaObjectAccessUrl(stored.media.objectKey).startsWith("/api/media-objects/profile-avatar/2026/06/"), true);

    const loaded = await readStoredMediaObject({
      env: {
        AI_MEDIA_ENCRYPTION_KEY: mediaEncryptionKey,
        AI_MEDIA_OBJECT_STORE_DIR: dir
      },
      objectKey: stored.media.objectKey,
      requester: { id: "student-1", role: "student" }
    });

    assert.equal(loaded.status, "ok");
    if (loaded.status !== "ok") return;
    assert.deepEqual(loaded.bytes, pngBytes);
    assert.equal(loaded.metadata.ownerHash.includes("student-1"), false);
  });
});

test("media object references reject path traversal keys at the API boundary", () => {
  const reference = mediaObjectReferenceFromUnknown({
    kind: "object-reference",
    objectKey: "../student/avatar.png",
    mimeType: "image/png",
    byteLength: 128,
    encrypted: true,
    scanStatus: "passed",
    retentionExpiresAt: "2026-10-10T00:00:00.000Z"
  });

  assert.equal(reference, null);
});
