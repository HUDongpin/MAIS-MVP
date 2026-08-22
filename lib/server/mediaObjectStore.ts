import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  imageDataUrlMediaDescriptor,
  mediaStoragePolicyFromEnv,
  type AiCapability,
  type AiMediaDescriptor
} from "./aiGovernance";

type EnvLike = Record<string, string | undefined>;

export type StoredMediaObjectReference = Extract<AiMediaDescriptor, { kind: "object-reference" }>;

export type StoredMediaObjectMetadata = {
  version: 1;
  algorithm: "aes-256-gcm";
  authTag: string;
  byteLength: number;
  capability: AiCapability;
  createdAt: string;
  encrypted: true;
  iv: string;
  mimeType: string;
  objectKey: string;
  ownerHash: string;
  retentionExpiresAt: string;
  scanStatus: "passed";
  sha256: string;
};

export type MediaScanResult =
  | {
      status: "passed";
    }
  | {
      status: "failed";
      code: "media-empty" | "media-type-unsupported" | "media-signature-mismatch";
      message: string;
    };

export type StoreMediaObjectResult =
  | {
      status: "stored";
      accessUrl: string;
      media: StoredMediaObjectReference;
      metadata: StoredMediaObjectMetadata;
    }
  | {
      status: "rejected";
      code:
        | "media-invalid-data-url"
        | "media-too-large"
        | "media-scan-failed"
        | "media-encryption-key-missing"
        | "media-write-failed";
      message: string;
    };

export type ReadStoredMediaObjectResult =
  | {
      status: "ok";
      bytes: Buffer;
      metadata: StoredMediaObjectMetadata;
    }
  | {
      status: "not-found" | "forbidden" | "expired" | "rejected";
      code:
        | "media-object-not-found"
        | "media-object-forbidden"
        | "media-object-expired"
        | "media-object-invalid"
        | "media-encryption-key-missing"
        | "media-decryption-failed";
      message: string;
    };

type MediaObjectRequester = {
  id: string;
  role: string;
};

export type RelatedTeacherMediaAuthorizationRequest = {
  capability: AiCapability;
  ownerHash: string;
  teacherId: string;
};

export type RelatedTeacherMediaAuthorizer = (
  request: RelatedTeacherMediaAuthorizationRequest
) => boolean | Promise<boolean>;

const dayMs = 24 * 60 * 60 * 1000;
const mediaObjectKeyPattern = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)+$/;
const metadataExtension = ".json";
const objectExtension = ".bin";
const allowedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const teacherReviewableCapabilities = new Set<AiCapability>([
  "assignment-image",
  "classroom-work-sample",
  "practice-work-photo"
]);

function normalizeMimeType(value: string) {
  return value === "image/jpg" ? "image/jpeg" : value;
}

function booleanFromEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function mediaObjectStoreDir(env: EnvLike = process.env) {
  const configured = env.AI_MEDIA_OBJECT_STORE_DIR?.trim();
  return path.resolve(process.cwd(), configured || ".local/media-objects");
}

function ownerHash(ownerId: string) {
  return createHash("sha256").update(ownerId).digest("hex");
}

export function mediaObjectOwnerHash(ownerId: string) {
  return ownerHash(ownerId);
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeCapabilitySegment(capability: AiCapability) {
  return capability.replace(/[^a-z0-9-]/gi, "-");
}

function mediaObjectPath(root: string, objectKey: string, extension: string) {
  if (!isSafeMediaObjectKey(objectKey)) return null;
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(root, ...objectKey.split("/")) + extension;
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return resolvedPath;
}

function resolveMediaEncryptionKey(env: EnvLike = process.env) {
  const configured = env.AI_MEDIA_ENCRYPTION_KEY?.trim();
  if (configured) {
    if (/^[a-f0-9]{64}$/i.test(configured)) {
      return Buffer.from(configured, "hex");
    }

    if (/^[A-Za-z0-9+/]+={0,2}$/.test(configured)) {
      const decoded = Buffer.from(configured, "base64");
      if (decoded.byteLength === 32) return decoded;
    }

    const utf8 = Buffer.from(configured, "utf8");
    if (utf8.byteLength === 32) return utf8;
    return createHash("sha256").update(utf8).digest();
  }

  if (booleanFromEnv(env.AI_MEDIA_ALLOW_DEVELOPMENT_MEDIA_KEY)) {
    return createHash("sha256").update(`mais-local-media:${process.cwd()}`).digest();
  }

  return null;
}

function decodeImageDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  const mimeType = normalizeMimeType(match[1]);
  return {
    bytes: Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
    mimeType
  };
}

function hasPngSignature(bytes: Buffer) {
  return bytes.byteLength >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}

function hasJpegSignature(bytes: Buffer) {
  return bytes.byteLength >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
}

function hasWebpSignature(bytes: Buffer) {
  return bytes.byteLength >= 12
    && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP";
}

function looksLikeActiveText(bytes: Buffer) {
  const preview = bytes.subarray(0, Math.min(bytes.byteLength, 512)).toString("utf8").toLowerCase();
  return preview.includes("<script") || preview.includes("<svg") || preview.includes("<?xml") || preview.includes("<!doctype");
}

export function scanMediaBytes({ bytes, mimeType }: { bytes: Buffer; mimeType: string }): MediaScanResult {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (!bytes.byteLength) {
    return {
      status: "failed",
      code: "media-empty",
      message: "Media upload is empty."
    };
  }

  if (!allowedImageMimeTypes.has(normalizedMimeType)) {
    return {
      status: "failed",
      code: "media-type-unsupported",
      message: "Only PNG, JPEG, and WebP image uploads are supported."
    };
  }

  const signatureMatches =
    (normalizedMimeType === "image/png" && hasPngSignature(bytes))
    || (normalizedMimeType === "image/jpeg" && hasJpegSignature(bytes))
    || (normalizedMimeType === "image/webp" && hasWebpSignature(bytes));

  if (!signatureMatches || looksLikeActiveText(bytes)) {
    return {
      status: "failed",
      code: "media-signature-mismatch",
      message: "Media content did not match the claimed safe image type."
    };
  }

  return { status: "passed" };
}

export function isSafeMediaObjectKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 512 || !mediaObjectKeyPattern.test(trimmed)) return false;
  return trimmed.split("/").every((segment) =>
    Boolean(segment) && segment !== "." && segment !== ".." && !segment.includes("\\")
  );
}

export function mediaObjectAccessUrl(objectKey: string) {
  if (!isSafeMediaObjectKey(objectKey)) return "";
  return `/api/media-objects/${objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function mediaObjectReferenceFromUnknown(value: unknown): StoredMediaObjectReference | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Partial<StoredMediaObjectReference>;
  const objectKey = typeof record.objectKey === "string" ? record.objectKey.trim() : "";
  const mimeType = typeof record.mimeType === "string" ? normalizeMimeType(record.mimeType.trim()) : "";
  const byteLength = typeof record.byteLength === "number" && Number.isFinite(record.byteLength)
    ? Math.max(0, Math.round(record.byteLength))
    : Number.NaN;
  const retentionExpiresAt = typeof record.retentionExpiresAt === "string" ? record.retentionExpiresAt : "";

  if (record.kind !== "object-reference") return null;
  if (!isSafeMediaObjectKey(objectKey)) return null;
  if (!allowedImageMimeTypes.has(mimeType)) return null;
  if (!Number.isFinite(byteLength) || byteLength <= 0) return null;
  if (record.encrypted !== true) return null;
  if (record.scanStatus !== "passed" && record.scanStatus !== "pending" && record.scanStatus !== "failed") return null;
  if (!Number.isFinite(Date.parse(retentionExpiresAt))) return null;

  return {
    kind: "object-reference",
    objectKey,
    mimeType,
    byteLength,
    encrypted: record.encrypted,
    scanStatus: record.scanStatus,
    retentionExpiresAt
  };
}

function metadataToReference(metadata: StoredMediaObjectMetadata): StoredMediaObjectReference {
  return {
    kind: "object-reference",
    objectKey: metadata.objectKey,
    mimeType: metadata.mimeType,
    byteLength: metadata.byteLength,
    encrypted: metadata.encrypted,
    scanStatus: metadata.scanStatus,
    retentionExpiresAt: metadata.retentionExpiresAt
  };
}

function metadataFromUnknown(value: unknown): StoredMediaObjectMetadata | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Partial<StoredMediaObjectMetadata>;
  if (record.version !== 1) return null;
  if (record.algorithm !== "aes-256-gcm") return null;
  if (record.encrypted !== true || record.scanStatus !== "passed") return null;
  if (typeof record.objectKey !== "string" || !isSafeMediaObjectKey(record.objectKey)) return null;
  if (typeof record.ownerHash !== "string" || !/^[a-f0-9]{64}$/i.test(record.ownerHash)) return null;
  if (typeof record.capability !== "string") return null;
  if (typeof record.mimeType !== "string" || !allowedImageMimeTypes.has(normalizeMimeType(record.mimeType))) return null;
  if (typeof record.byteLength !== "number" || !Number.isFinite(record.byteLength) || record.byteLength <= 0) return null;
  if (typeof record.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt))) return null;
  if (typeof record.retentionExpiresAt !== "string" || !Number.isFinite(Date.parse(record.retentionExpiresAt))) return null;
  if (typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(record.sha256)) return null;
  if (typeof record.iv !== "string" || typeof record.authTag !== "string") return null;

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    authTag: record.authTag,
    byteLength: record.byteLength,
    capability: record.capability as AiCapability,
    createdAt: record.createdAt,
    encrypted: true,
    iv: record.iv,
    mimeType: normalizeMimeType(record.mimeType),
    objectKey: record.objectKey,
    ownerHash: record.ownerHash,
    retentionExpiresAt: record.retentionExpiresAt,
    scanStatus: "passed",
    sha256: record.sha256
  };
}

async function canReadMediaObject(
  metadata: StoredMediaObjectMetadata,
  requester: MediaObjectRequester,
  authorizeRelatedTeacher?: RelatedTeacherMediaAuthorizer
) {
  if (metadata.ownerHash === ownerHash(requester.id)) return true;
  if (requester.role === "admin") return true;
  if (
    requester.role !== "teacher"
    || !teacherReviewableCapabilities.has(metadata.capability)
    || !authorizeRelatedTeacher
  ) {
    return false;
  }

  try {
    return await authorizeRelatedTeacher({
      capability: metadata.capability,
      ownerHash: metadata.ownerHash,
      teacherId: requester.id
    });
  } catch {
    return false;
  }
}

/**
 * Whether governed media uploads can succeed at all in this environment.
 *
 * `requireEncryption` defaults to true, so with no `AI_MEDIA_ENCRYPTION_KEY`
 * every upload fails with `media-encryption-key-missing` (503). Clients probe
 * this so they can hide an attachment control instead of offering one that is
 * guaranteed to error. Note this is NOT `objectStorageRequired`, which defaults
 * to false and only forbids the legacy data-URL path.
 */
export function mediaObjectUploadsAvailable(env: EnvLike = process.env) {
  return resolveMediaEncryptionKey(env) !== null;
}

export async function storeMediaObjectFromDataUrl({
  capability,
  dataUrl,
  env = process.env,
  now = new Date(),
  ownerId
}: {
  capability: AiCapability;
  dataUrl: string;
  env?: EnvLike;
  now?: Date;
  ownerId: string;
}): Promise<StoreMediaObjectResult> {
  const descriptor = imageDataUrlMediaDescriptor(dataUrl);
  const decoded = decodeImageDataUrl(dataUrl);
  if (!descriptor || !decoded) {
    return {
      status: "rejected",
      code: "media-invalid-data-url",
      message: "Media upload must be a PNG, JPEG, or WebP data URL."
    };
  }

  const policy = mediaStoragePolicyFromEnv(env);
  if (descriptor.byteLength > policy.maxDataUrlBytes) {
    return {
      status: "rejected",
      code: "media-too-large",
      message: "Media upload exceeds the configured enterprise size limit."
    };
  }

  const scan = scanMediaBytes(decoded);
  if (scan.status === "failed") {
    return {
      status: "rejected",
      code: "media-scan-failed",
      message: scan.message
    };
  }

  const encryptionKey = resolveMediaEncryptionKey(env);
  if (!encryptionKey) {
    return {
      status: "rejected",
      code: "media-encryption-key-missing",
      message: "AI_MEDIA_ENCRYPTION_KEY must be configured before storing governed media objects."
    };
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encryptedBytes = Buffer.concat([cipher.update(decoded.bytes), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const objectKey = [
    safeCapabilitySegment(capability),
    String(now.getUTCFullYear()),
    month,
    ownerHash(ownerId).slice(0, 16),
    randomUUID()
  ].join("/");
  const retentionExpiresAt = new Date(now.getTime() + policy.retentionDays * dayMs).toISOString();
  const metadata: StoredMediaObjectMetadata = {
    version: 1,
    algorithm: "aes-256-gcm",
    authTag: authTag.toString("base64"),
    byteLength: decoded.bytes.byteLength,
    capability,
    createdAt: now.toISOString(),
    encrypted: true,
    iv: iv.toString("base64"),
    mimeType: decoded.mimeType,
    objectKey,
    ownerHash: ownerHash(ownerId),
    retentionExpiresAt,
    scanStatus: "passed",
    sha256: sha256(decoded.bytes)
  };
  const root = mediaObjectStoreDir(env);
  const objectPath = mediaObjectPath(root, objectKey, objectExtension);
  const metadataPath = mediaObjectPath(root, objectKey, metadataExtension);
  if (!objectPath || !metadataPath) {
    return {
      status: "rejected",
      code: "media-write-failed",
      message: "Media object key could not be mapped to a safe storage path."
    };
  }

  try {
    await mkdir(path.dirname(objectPath), { recursive: true });
    await writeFile(objectPath, encryptedBytes);
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  } catch {
    return {
      status: "rejected",
      code: "media-write-failed",
      message: "Media object could not be written to storage."
    };
  }

  return {
    status: "stored",
    accessUrl: mediaObjectAccessUrl(objectKey),
    media: metadataToReference(metadata),
    metadata
  };
}

export async function readStoredMediaObject({
  authorizeRelatedTeacher,
  env = process.env,
  objectKey,
  requester,
  now = new Date()
}: {
  authorizeRelatedTeacher?: RelatedTeacherMediaAuthorizer;
  env?: EnvLike;
  objectKey: string;
  requester: MediaObjectRequester;
  now?: Date;
}): Promise<ReadStoredMediaObjectResult> {
  const root = mediaObjectStoreDir(env);
  const objectPath = mediaObjectPath(root, objectKey, objectExtension);
  const metadataPath = mediaObjectPath(root, objectKey, metadataExtension);
  if (!objectPath || !metadataPath) {
    return {
      status: "not-found",
      code: "media-object-not-found",
      message: "Media object was not found."
    };
  }

  let metadata: StoredMediaObjectMetadata | null;
  try {
    metadata = metadataFromUnknown(JSON.parse(await readFile(metadataPath, "utf8")));
  } catch {
    metadata = null;
  }

  if (!metadata) {
    return {
      status: "not-found",
      code: "media-object-not-found",
      message: "Media object metadata was not found."
    };
  }

  if (Date.parse(metadata.retentionExpiresAt) <= now.getTime()) {
    return {
      status: "expired",
      code: "media-object-expired",
      message: "Media object retention period has expired."
    };
  }

  if (!await canReadMediaObject(metadata, requester, authorizeRelatedTeacher)) {
    return {
      status: "forbidden",
      code: "media-object-forbidden",
      message: "You do not have access to this media object."
    };
  }

  const encryptionKey = resolveMediaEncryptionKey(env);
  if (!encryptionKey) {
    return {
      status: "rejected",
      code: "media-encryption-key-missing",
      message: "AI_MEDIA_ENCRYPTION_KEY must be configured before reading governed media objects."
    };
  }

  try {
    const encryptedBytes = await readFile(objectPath);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(metadata.iv, "base64"));
    decipher.setAuthTag(Buffer.from(metadata.authTag, "base64"));
    const bytes = Buffer.concat([decipher.update(encryptedBytes), decipher.final()]);
    if (bytes.byteLength !== metadata.byteLength || sha256(bytes) !== metadata.sha256) {
      return {
        status: "rejected",
        code: "media-object-invalid",
        message: "Media object integrity check failed."
      };
    }

    return {
      status: "ok",
      bytes,
      metadata
    };
  } catch {
    return {
      status: "rejected",
      code: "media-decryption-failed",
      message: "Media object could not be decrypted."
    };
  }
}
