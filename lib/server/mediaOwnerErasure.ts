import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, opendir, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

type Role = "student" | "parent" | "teacher" | "admin";
type MediaProof = { objectKey: string; ownerHash: string; capability: string; retentionExpiresAt: string };
export type MediaErasureAdmission = {
  version: 1; ownerHash: string; operationId: string; accountFingerprint: string; role: Role;
  state: "admitted" | "committed"; admittedAt: string; committedAt?: string;
};
export type MediaPurgeResult = {
  status: "purged" | "pending"; filesRemoved: number; inspected: number;
  reason?: "uploads-active" | "scan-budget" | "unverifiable-metadata" | "filesystem-error" | "account-not-committed";
};
type Lease = { root: string; leasePath: string; metadata: MediaProof };
const hashPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const capabilities = ["profile-avatar", "assignment-image", "classroom-work-sample", "practice-work-photo", "ai-tutor-ocr"];
const markerDirectory = ".owner-erasure";
const leaseDirectory = ".upload-leases";

export class MediaOwnerErasedError extends Error {}
export class MediaErasureBusyError extends Error {}

function assertHash(value: string) { if (!hashPattern.test(value)) throw new Error("Invalid full media owner hash."); }
function safeRoot(root: string) {
  const resolved = path.resolve(root);
  if (resolved === path.parse(resolved).root) throw new Error("A filesystem root cannot be a media store.");
  return resolved;
}
function markerPath(root: string, ownerHash: string) {
  assertHash(ownerHash);
  return path.join(safeRoot(root), markerDirectory, `${ownerHash}.json`);
}
async function exists(file: string) {
  try { await lstat(file); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function ordinaryControlParents(root: string, segments: string[]) {
  if (!await exists(safeRoot(root))) return false;
  await ordinaryDirectory(safeRoot(root));
  let current = safeRoot(root);
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!await exists(current)) return false;
    await ordinaryDirectory(current);
  }
  return true;
}
async function syncDirectory(directory: string) {
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}
async function removeFile(file: string) {
  try { await unlink(file); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}
async function durableJson(file: string, value: unknown) {
  const handle = await open(file, "wx");
  try { await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); } finally { await handle.close(); }
}
async function ordinaryDirectory(file: string) {
  const stat = await lstat(file);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Media directories must not be symlinks.");
}
async function ordinaryParents(root: string, objectKey: string) {
  await ordinaryDirectory(safeRoot(root));
  let current = safeRoot(root);
  for (const segment of objectKey.split("/").slice(0, -1)) {
    current = path.join(current, segment);
    if (!await exists(current)) return false;
    await ordinaryDirectory(current);
  }
  return true;
}
async function safeDirectories(root: string, segments: string[]) {
  await mkdir(safeRoot(root),{recursive:true});
  await ordinaryDirectory(safeRoot(root));
  let current = safeRoot(root);
  for (const segment of segments) {
    current = path.join(current,segment);
    let created = false;
    try { await mkdir(current); created = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    await ordinaryDirectory(current);
    if (created) await syncDirectory(path.dirname(current));
  }
}
export async function ensureCanonicalMediaParents(root: string, proof: MediaProof) {
  if (!canonicalMediaProof(proof,proof.objectKey)) throw new Error("Invalid canonical media path.");
  await safeDirectories(root,proof.objectKey.split("/").slice(0,-1));
}

export function mediaOwnerHash(ownerId: string) { return createHash("sha256").update(ownerId).digest("hex"); }
export function canonicalMediaAccountFingerprint(account: { id: string; role: string; created_at: string }) {
  return createHash("sha256").update(JSON.stringify([account.id, account.role, account.created_at])).digest("hex");
}
export function mediaStoreRoot(env: Record<string, string | undefined> = process.env) {
  return safeRoot(path.resolve(process.cwd(), env.AI_MEDIA_OBJECT_STORE_DIR?.trim() || ".local/media-objects"));
}
export async function mediaOwnerErasureIsMarked(root: string, ownerHash: string) {
  // Any existing marker fails closed, including malformed/incomplete marker data.
  if (!await ordinaryControlParents(root,[markerDirectory])) return false;
  return exists(markerPath(root, ownerHash));
}
export async function readMediaOwnerErasure(root: string, ownerHash: string): Promise<MediaErasureAdmission | null> {
  const file = markerPath(root, ownerHash);
  if (!await ordinaryControlParents(root,[markerDirectory])) return null;
  if (!await exists(file)) return null;
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Invalid media erasure marker.");
  const record = JSON.parse(await readFile(file, "utf8")) as MediaErasureAdmission;
  if (record.version !== 1 || record.ownerHash !== ownerHash || !uuidPattern.test(record.operationId)
    || !hashPattern.test(record.accountFingerprint) || !["student", "parent", "teacher", "admin"].includes(record.role)
    || !["admitted", "committed"].includes(record.state) || !Number.isFinite(Date.parse(record.admittedAt))) {
    throw new Error("Invalid media erasure marker.");
  }
  return record;
}

// Marker admission, commit and rollback MUST run while holding the canonical
// account/snapshot mutation lock. A different operation cannot borrow admission.
export async function admitMediaOwnerErasure(root: string, account: { id: string; role: Role; created_at: string }, operationId: string = randomUUID()) {
  if (!uuidPattern.test(operationId)) throw new Error("Invalid media erasure operation.");
  const ownerHash = mediaOwnerHash(account.id);
  const directory = path.dirname(markerPath(root, ownerHash));
  await safeDirectories(root,[markerDirectory]);
  if (await mediaOwnerErasureIsMarked(root, ownerHash)) throw new MediaErasureBusyError("Existing owner erasure requires canonical recovery.");
  const admission: MediaErasureAdmission = { version:1, ownerHash, operationId, accountFingerprint:canonicalMediaAccountFingerprint(account), role:account.role, state:"admitted", admittedAt:new Date().toISOString() };
  const temporary = path.join(directory, `${ownerHash}.${operationId}.tmp`);
  await durableJson(temporary, admission);
  try { await link(temporary, markerPath(root, ownerHash)); await syncDirectory(directory); } finally { await removeFile(temporary); }
  return admission;
}
export async function commitMediaOwnerErasure(root: string, admission: MediaErasureAdmission) {
  const current = await readMediaOwnerErasure(root, admission.ownerHash);
  if (!current || current.operationId !== admission.operationId) throw new MediaErasureBusyError("Media erasure operation changed.");
  if (current.state === "committed") return current;
  const committed: MediaErasureAdmission = { ...current, state:"committed", committedAt:new Date().toISOString() };
  const temporary = `${markerPath(root, admission.ownerHash)}.${randomUUID()}.tmp`;
  await durableJson(temporary, committed);
  await rename(temporary, markerPath(root, admission.ownerHash));
  await syncDirectory(path.dirname(markerPath(root, admission.ownerHash)));
  return committed;
}
export async function rollbackMediaOwnerErasure(root: string, admission: MediaErasureAdmission, liveCanonicalAccount: { id: string; role: string; created_at: string } | null) {
  if (!liveCanonicalAccount || mediaOwnerHash(liveCanonicalAccount.id) !== admission.ownerHash
    || canonicalMediaAccountFingerprint(liveCanonicalAccount) !== admission.accountFingerprint) return false;
  const current = await readMediaOwnerErasure(root, admission.ownerHash);
  if (!current || current.operationId !== admission.operationId || current.state !== "admitted") return false;
  await removeFile(markerPath(root, admission.ownerHash));
  await syncDirectory(path.dirname(markerPath(root, admission.ownerHash)));
  return true;
}

export function canonicalMediaProof(value: unknown, objectKey: string): MediaProof | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const segments = objectKey.split("/");
  if (segments.length !== 5 || !capabilities.includes(segments[0]) || !/^\d{4,6}$/.test(segments[1])
    || !/^(0[1-9]|1[0-2])$/.test(segments[2]) || !uuidPattern.test(segments[4])
    || record.objectKey !== objectKey || record.capability !== segments[0]
    || typeof record.ownerHash !== "string" || !hashPattern.test(record.ownerHash) || segments[3] !== record.ownerHash.slice(0,16)
    || typeof record.retentionExpiresAt !== "string" || !Number.isFinite(Date.parse(record.retentionExpiresAt))) return null;
  return { objectKey, ownerHash:record.ownerHash, capability:record.capability as string, retentionExpiresAt:record.retentionExpiresAt };
}
async function removeProvenMediaPair(root: string, proof: MediaProof, stoppedLeaseProvesOwnership: boolean) {
  if (!canonicalMediaProof(proof, proof.objectKey)) throw new Error("Media pair ownership cannot be proven.");
  if (!await ordinaryParents(root, proof.objectKey)) return;
  const object = path.join(safeRoot(root), ...proof.objectKey.split("/"));
  if (await exists(`${object}.json`)) {
    const stat = await lstat(`${object}.json`);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Media metadata is not a regular file.");
    const metadata = await readFile(`${object}.json`,"utf8");
    let value: unknown;
    try { value = JSON.parse(metadata); } catch (error) {
      // Only the exact verified-stopped lease, after committed owner erasure,
      // may prove an interrupted regular metadata file belongs to this upload.
      // Ordinary purge and failed-write cleanup remain fail-closed.
      if (!stoppedLeaseProvesOwnership || !(error instanceof SyntaxError)) throw error;
    }
    if (value !== undefined) {
      const stored = canonicalMediaProof(value,proof.objectKey);
      if (!stored || stored.ownerHash !== proof.ownerHash) throw new Error("Stored media ownership differs from cleanup proof.");
    }
  }
  await removeFile(`${object}.bin`);
  await removeFile(`${object}.json`);
  await syncDirectory(path.dirname(object));
}
export async function removeCanonicalMediaPair(root: string, proof: MediaProof) {
  await removeProvenMediaPair(root,proof,false);
}
export async function beginMediaUploadLease(root: string, metadata: MediaProof): Promise<Lease> {
  if (!canonicalMediaProof(metadata, metadata.objectKey)) throw new Error("Invalid canonical media upload.");
  if (await mediaOwnerErasureIsMarked(root, metadata.ownerHash)) throw new MediaOwnerErasedError("Media owner is being erased.");
  const directory = path.join(safeRoot(root), leaseDirectory, metadata.ownerHash);
  await safeDirectories(root,[leaseDirectory,metadata.ownerHash]);
  const leasePath = path.join(directory, `${randomUUID()}.json`);
  const temporary = `${leasePath}.tmp`;
  await durableJson(temporary, metadata);
  await rename(temporary, leasePath);
  await syncDirectory(directory);
  const lease = { root, leasePath, metadata };
  if (await mediaOwnerErasureIsMarked(root, metadata.ownerHash)) {
    await removeFile(leasePath);
    throw new MediaOwnerErasedError("Media owner is being erased.");
  }
  return lease;
}
export async function assertMediaUploadLeaseAdmitted(lease: Lease) {
  if (await mediaOwnerErasureIsMarked(lease.root, lease.metadata.ownerHash)) throw new MediaOwnerErasedError("Media owner is being erased.");
}
export async function finishMediaUploadLease(lease: Lease, writeFailed = false) {
  const erased = await mediaOwnerErasureIsMarked(lease.root, lease.metadata.ownerHash);
  if (erased || writeFailed) await removeCanonicalMediaPair(lease.root, lease.metadata);
  // On cleanup failure the lease remains: erasure must report pending.
  await removeFile(lease.leasePath);
  await syncDirectory(path.dirname(lease.leasePath));
  return !erased && !writeFailed;
}
async function activeLeaseCount(root: string, ownerHash: string) {
  const directory = path.join(safeRoot(root), leaseDirectory, ownerHash);
  if (!await ordinaryControlParents(root,[leaseDirectory,ownerHash])) return 0;
  const iterator = await opendir(directory);
  for await (const entry of iterator) if (entry.name.endsWith(".json")) return 1;
  return 0;
}

async function* mediaMetadataFiles(root: string, ownerHash: string | undefined, budget: { visited: number; limit: number }) {
  await ordinaryDirectory(safeRoot(root));
  async function* entries(directory: string) {
    if (!await exists(directory)) return;
    await ordinaryDirectory(directory);
    const iterator = await opendir(directory);
    for await (const entry of iterator) {
      if (budget.visited >= budget.limit) yield null;
      budget.visited += 1;
      yield entry;
    }
  }
  for (const capability of capabilities) {
    for await (const year of entries(path.join(root, capability))) {
      if (!year) { yield null; continue; }
      if (!/^\d{4,6}$/.test(year.name)) continue;
      if (!year.isDirectory()) throw new Error("Invalid canonical year directory.");
      for await (const month of entries(path.join(root, capability, year.name))) {
        if (!month) { yield null; continue; }
        if (!/^(0[1-9]|1[0-2])$/.test(month.name)) continue;
        if (!month.isDirectory()) throw new Error("Invalid canonical month directory.");
        const prefixes = ownerHash ? [{ name: ownerHash.slice(0,16), isDirectory: () => true }] : entries(path.join(root,capability,year.name,month.name));
        for await (const prefix of prefixes) {
          if (!prefix) { yield null; continue; }
          if (!/^[a-f0-9]{16}$/.test(prefix.name) || (ownerHash && prefix.name !== ownerHash.slice(0,16))) continue;
          if (!prefix.isDirectory()) throw new Error("Invalid canonical owner directory.");
          for await (const file of entries(path.join(root, capability, year.name, month.name, prefix.name))) {
            if (!file) { yield null; continue; }
            if (!file.name.endsWith(".json") && !file.name.endsWith(".bin")) continue;
            const extension = file.name.endsWith(".json") ? ".json" : ".bin";
            const key = [capability,year.name,month.name,prefix.name,file.name.slice(0,-extension.length)].join("/");
            if (!await exists(path.join(root,...key.split("/"))+extension)) continue;
            if (extension === ".bin" && await exists(path.join(root,...key.split("/"))+".json")) continue;
            yield {key,file:path.join(root,...key.split("/"))+".json"};
          }
        }
      }
    }
  }
}

type MediaPurgeOptions = { ownerHash?: string; expiredAt?: Date; limit?: number };

/**
 * One task-local traversal, yielded in bounded pages. Consume with for-await;
 * breaking/returning closes the live directory iterators. Counts are per page.
 * Continuation is in this iterator, not a durable cursor across process restarts.
 */
export async function* purgeMediaObjectPages(root: string, options: MediaPurgeOptions = {}): AsyncGenerator<MediaPurgeResult, void> {
  root = safeRoot(root);
  const ownerHash = options.ownerHash;
  const limit = Math.max(1, Math.min(1000, Math.floor(Number.isFinite(options.limit) ? options.limit! : 200)));
  const expiredAt = options.expiredAt?.getTime();
  if (options.expiredAt && !Number.isFinite(expiredAt)) throw new Error("A valid expiry cutoff is required.");
  if (!ownerHash && expiredAt === undefined) throw new Error("A subject or expiry scope is required.");
  if (ownerHash) {
    assertHash(ownerHash);
    const marker = await readMediaOwnerErasure(root, ownerHash);
    if (!marker || marker.state !== "committed") { yield {status:"pending",filesRemoved:0,inspected:0,reason:"account-not-committed"}; return; }
    if (await activeLeaseCount(root,ownerHash)) { yield {status:"pending",filesRemoved:0,inspected:0,reason:"uploads-active"}; return; }
  }
  const budget = { visited: 0, limit: limit * 8 + 64 };
  let filesRemoved = 0, inspected = 0, unverifiable = false, uploadsActive = false;
  try {
    for await (const entry of mediaMetadataFiles(root, ownerHash, budget)) {
      if (!entry || inspected >= limit) {
        yield {status:"pending",filesRemoved,inspected,reason:"scan-budget"};
        filesRemoved = 0;
        inspected = 0;
        budget.visited = 0;
        if (!entry) continue;
      }
      inspected += 1;
      let proof: MediaProof | null = null;
      try {
        const stat = await lstat(entry.file);
        if (stat.isFile() && !stat.isSymbolicLink()) proof = canonicalMediaProof(JSON.parse(await readFile(entry.file,"utf8")),entry.key);
      } catch { /* preserve unproven files */ }
      if (!proof) { unverifiable = true; continue; }
      if (ownerHash && proof.ownerHash !== ownerHash) continue;
      if (expiredAt !== undefined && Date.parse(proof.retentionExpiresAt) > expiredAt) continue;
      if (await activeLeaseCount(root,proof.ownerHash)) { uploadsActive = true; continue; }
      await removeCanonicalMediaPair(root,proof);
      filesRemoved += 1;
    }
    if (ownerHash && await activeLeaseCount(root,ownerHash)) uploadsActive = true;
    yield uploadsActive ? {status:"pending",filesRemoved,inspected,reason:"uploads-active"}
      : unverifiable ? {status:"pending",filesRemoved,inspected,reason:"unverifiable-metadata"}
      : {status:"purged",filesRemoved,inspected};
  } catch { yield {status:"pending",filesRemoved,inspected,reason:"filesystem-error"}; }
}

/** One-page compatibility wrapper. Expiry maintenance must consume the iterator above for progress. */
export async function purgeMediaObjects(root: string, options: MediaPurgeOptions = {}): Promise<MediaPurgeResult> {
  const pages = purgeMediaObjectPages(root,options);
  try {
    const page = await pages.next();
    if (page.done) throw new Error("Media purge produced no result.");
    return page.value;
  } finally { await pages.return(); }
}

// Explicit operator recovery only. No TTL can prove an in-flight writer stopped.
export async function recoverStoppedMediaUpload(root: string, ownerHash: string, leaseId: string, operatorVerifiedStopped: boolean) {
  if (!operatorVerifiedStopped || !uuidPattern.test(leaseId)) throw new Error("Verified stopped uploader and exact lease id are required.");
  assertHash(ownerHash);
  const marker = await readMediaOwnerErasure(root,ownerHash);
  if (!marker || marker.state !== "committed") throw new Error("Committed owner erasure is required.");
  if (!await ordinaryControlParents(root,[leaseDirectory,ownerHash])) throw new Error("Upload lease is absent.");
  const leasePath = path.join(safeRoot(root),leaseDirectory,ownerHash,`${leaseId}.json`);
  const stat = await lstat(leasePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Invalid upload lease.");
  const value = JSON.parse(await readFile(leasePath,"utf8"));
  const proof = canonicalMediaProof(value,value.objectKey);
  if (!proof || proof.ownerHash !== ownerHash) throw new Error("Upload lease owner is not proven.");
  await removeProvenMediaPair(root,proof,true);
  await removeFile(leasePath);
  await syncDirectory(path.dirname(leasePath));
}

export async function purgeExpiredMediaPair(root: string, proof: MediaProof) {
  // Never unlink a pair while an admitted writer may still be using it.
  if (await activeLeaseCount(root,proof.ownerHash)) return false;
  await removeCanonicalMediaPair(root,proof);
  return true;
}
