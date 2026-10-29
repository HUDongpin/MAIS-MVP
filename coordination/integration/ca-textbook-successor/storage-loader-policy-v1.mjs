// Successor-only storage classification. Never imports or executes the app module.
import {
  readFileSync,
  lstatSync,
  realpathSync,
  openSync,
  fstatSync,
  closeSync,
  constants as fsConstants,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  parse,
  hash,
  digest,
  need,
  same,
  unique,
  relative,
} from "./common.mjs";
import { validateSchema } from "./schema.mjs";
import { ROOT, ANCHOR } from "./constants.mjs";
const profileBytes = readFileSync(
    new URL("./storage-loader-profile.v1.json", import.meta.url),
  ),
  profile = parse(profileBytes);
validateSchema("storage-loader-profile", profile);
unique(profile.operations.map((row) => row.position));
const profileRawSha256 = hash(profileBytes),
  sort = (rows) =>
    [...rows].sort((a, b) =>
      a.sourcePath < b.sourcePath
        ? -1
        : a.sourcePath > b.sourcePath
          ? 1
          : a.position - b.position || a.kind.localeCompare(b.kind),
    );
const rawFor = (operation) => ({
  sourcePath: profile.source.path,
  sourceRawSha256: profile.source.sha256,
  kind: operation.kind,
  callee: operation.callee,
  position: operation.position,
  normalizedExpressionDigest: operation.normalizedExpressionDigest,
});
export const storageProfileSource = () => structuredClone(profile.source);
function partition(rawOperations) {
  for (const row of rawOperations) validateSchema("raw-loader-operation", row);
  unique(
    rawOperations.map((row) =>
      [row.sourcePath, row.position, row.kind, row.callee].join("\0"),
    ),
  );
  const raw = sort(rawOperations),
    owned = raw.filter((row) => row.sourcePath === profile.source.path);
  same(owned, sort(profile.operations.map(rawFor)), "CA_STORAGE_CALL_SET");
  const reviewed = owned.map((call) => {
    const operation = profile.operations.find(
      (row) => row.position === call.position,
    );
    return {
      call,
      classification: operation.classification,
      functionName: operation.functionName,
      functionSourceSha256: operation.functionSourceSha256,
      reason: operation.reason,
    };
  });
  const unclassified = raw.filter(
    (row) => row.sourcePath !== profile.source.path,
  );
  const result = {
    schemaVersion: "ca-reviewed-storage-loader-observation.v1",
    profileRawSha256,
    sourceBinding: structuredClone(profile.source),
    parserVersion: profile.parserVersion,
    rawDetectedCount: raw.length,
    reviewedStorageCount: reviewed.length,
    unclassifiedCount: unclassified.length,
    rawOperations: raw,
    reviewedStorageOperations: reviewed,
    unclassifiedOperations: unclassified,
    applicationPurpose: "non-module-storage-write-sync-enumeration",
  };
  result.partitionDigest = digest(result);
  validateSchema("storage-loader-observation", result);
  return result;
}
export function validateStorageLoaderProof(proof) {
  validateSchema("storage-loader-observation", proof);
  same(proof, partition(proof.rawOperations), "CA_STORAGE_PARTITION");
  return proof;
}
export function classifyReviewedStorageOperations(
  root,
  rawOperations,
  parserVersion,
) {
  need(parserVersion === profile.parserVersion, "CA_STORAGE_PARSER");
  need(root === realpathSync(root), "CA_STORAGE_SOURCE_BINDING");
  relative(profile.source.path);
  let cursor = root;
  for (const segment of profile.source.path.split("/")) {
    cursor = path.join(cursor, segment);
    need(!lstatSync(cursor).isSymbolicLink(), "CA_STORAGE_SOURCE_BINDING");
  }
  need(realpathSync(cursor) === cursor, "CA_STORAGE_SOURCE_BINDING");
  const fd = openSync(
    cursor,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const before = fstatSync(fd, { bigint: true });
    need(
      before.isFile() && before.nlink === 1n && before.size <= 33554432n,
      "CA_STORAGE_SOURCE_BINDING",
    );
    const bytes = readFileSync(fd),
      after = fstatSync(fd, { bigint: true }),
      leaf = lstatSync(cursor, { bigint: true });
    need(
      before.dev === after.dev &&
        before.ino === after.ino &&
        before.size === after.size &&
        before.mtimeNs === after.mtimeNs &&
        leaf.dev === before.dev &&
        leaf.ino === before.ino &&
        !leaf.isSymbolicLink(),
      "CA_STORAGE_SOURCE_BINDING",
    );
    const mode = Number(before.mode) & 0o111 ? "100755" : "100644",
      objectId = createHash("sha1")
        .update("blob " + bytes.length + "\0")
        .update(bytes)
        .digest("hex");
    need(
      mode === profile.source.mode &&
        objectId === profile.source.objectId &&
        hash(bytes) === profile.source.sha256,
      "CA_STORAGE_SOURCE_BINDING",
    );
  } finally {
    closeSync(fd);
  }
  return partition(rawOperations);
}
export function authenticateAdapterArtifacts(repo, m) {
  const provenance = repo.json(m.checkerReleaseCommit, {
    path: ROOT + "/adapter-provenance.v1.json",
  });
  validateSchema("adapter-provenance", provenance);
  need(
    provenance.baseCommit === ANCHOR &&
      provenance.original.path ===
        "coordination/integration/promotion-gate-lib.mjs" &&
      provenance.original.sha256 === profile.canonicalLibrarySha256 &&
      provenance.derived.path === ROOT + "/canonical-observer-ca-v1.mjs" &&
      provenance.diff.path === ROOT + "/canonical-observer-ca-v1.patch" &&
      provenance.storageProfile.path ===
        ROOT + "/storage-loader-profile.v1.json" &&
      provenance.storageProfile.sha256 === profileRawSha256,
    "CA_ADAPTER_PROVENANCE",
  );
  repo.read(ANCHOR, provenance.original, false);
  for (const binding of [
    provenance.original,
    provenance.derived,
    provenance.diff,
    provenance.storageProfile,
  ])
    repo.read(m.checkerReleaseCommit, binding);
  for (const commit of [
    ANCHOR,
    m.sourceCommit,
    m.checkerReleaseCommit,
    repo.head,
  ])
    repo.read(commit, profile.source, commit !== ANCHOR);
  return { provenanceDigest: digest(provenance), profileRawSha256 };
}
