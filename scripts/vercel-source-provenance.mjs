import { createHash } from "node:crypto";

export const VERCEL_STAGING_MANIFEST_FILENAME = "vercel-staging-manifest.json";

const SHA1_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_MANIFEST_ALGORITHM = "sha256-canonical-json-lines-v2";
const MAX_SOURCE_FILES = 100_000;
const MAX_SOURCE_TREE_DEPTH = 64;
const MAX_SOURCE_PATH_BYTES = 4_096;
const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_FILE_BYTES = 128 * 1024 * 1024;
const MAX_SOURCE_TOTAL_BYTES = 1024 * 1024 * 1024;
// The upload-time staging seal removes write/group/other bits. Depending on
// provider normalization, Vercel reports either that sealed mode or the
// canonical Git mode; both representations must preserve the executable bit.
const GIT_MODE_TO_PROVIDER_MODES = new Map([
  ["100644", new Set([0o100400, 0o100644])],
  ["100755", new Set([0o100500, 0o100755])]
]);
const REGULAR_FILE_MODES = new Set(
  [...GIT_MODE_TO_PROVIDER_MODES.values()].flatMap((modes) => [...modes])
);

export function flattenVercelDeploymentSourceFiles(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("Vercel source provenance failed: deployment file tree was not an array.");
  }
  const sourceRoots = payload.filter(
    (entry) => entry?.type === "directory" && entry?.name === "src"
  );
  if (sourceRoots.length !== 1) {
    throw new Error("Vercel source provenance failed: one exact src tree is required.");
  }

  const files = new Map();
  let visited = 0;
  const walk = (node, parentSegments, depth) => {
    visited += 1;
    if (visited > MAX_SOURCE_FILES * 2 || depth > MAX_SOURCE_TREE_DEPTH) {
      throw new Error("Vercel source provenance failed: deployment file tree exceeded its bound.");
    }
    const name = requireCanonicalPathSegment(node?.name);
    const segments = [...parentSegments, name];
    const relativePath = segments.join("/");
    if (Buffer.byteLength(relativePath, "utf8") > MAX_SOURCE_PATH_BYTES) {
      throw new Error("Vercel source provenance failed: a source path exceeded its bound.");
    }
    if (node?.type === "directory") {
      if (!Array.isArray(node.children)) {
        throw new Error("Vercel source provenance failed: a directory had no bounded child list.");
      }
      const childNames = new Set();
      for (const child of node.children) {
        const childName = requireCanonicalPathSegment(child?.name);
        if (childNames.has(childName)) {
          throw new Error("Vercel source provenance failed: duplicate provider source paths were present.");
        }
        childNames.add(childName);
        walk(child, segments, depth + 1);
      }
      return;
    }
    if (
      node?.type !== "file" ||
      !SHA1_PATTERN.test(String(node.uid ?? "")) ||
      !REGULAR_FILE_MODES.has(node.mode)
    ) {
      throw new Error("Vercel source provenance failed: a source leaf was not a regular SHA-1 file.");
    }
    const manifestPath = segments.slice(1).join("/");
    if (!manifestPath || files.has(manifestPath)) {
      throw new Error("Vercel source provenance failed: duplicate provider source paths were present.");
    }
    files.set(manifestPath, {
      mode: node.mode,
      uid: node.uid
    });
    if (files.size > MAX_SOURCE_FILES) {
      throw new Error("Vercel source provenance failed: deployment source file count exceeded its bound.");
    }
  };

  for (const child of sourceRoots[0].children ?? []) {
    walk(child, ["src"], 1);
  }
  if (files.size === 0) {
    throw new Error("Vercel source provenance failed: deployment src tree contained no files.");
  }
  return files;
}

export function findVercelStagingManifestUid(filesPayload) {
  const files = flattenVercelDeploymentSourceFiles(filesPayload);
  const entry = files.get(VERCEL_STAGING_MANIFEST_FILENAME);
  if (!entry) {
    throw new Error("Vercel source provenance failed: deployed staging manifest was absent.");
  }
  return entry.uid;
}

export function validateVercelCliSourcePackageEvidence({
  releaseBinding,
  filesPayload,
  manifestContentPayload,
  expectedStaging,
  verifiedSourceContents
}) {
  const inspected = inspectVercelCliSourcePackage({
    releaseBinding,
    filesPayload,
    manifestContentPayload,
    expectedStaging
  });
  const contentEvidence = requireVerifiedSourceContents(verifiedSourceContents);
  const requests = sourceContentRequests(inspected.files, inspected.providerFiles);
  if (contentEvidence.size !== requests.length) {
    throw new Error("Vercel source provenance failed: collision-resistant provider content proof was incomplete.");
  }
  for (const request of requests) {
    const evidence = contentEvidence.get(request.uid);
    if (
      !evidence ||
      evidence.uid !== request.uid ||
      evidence.size !== request.size ||
      evidence.rawSha1 !== request.rawSha1 ||
      evidence.sha256 !== request.sha256 ||
      evidence.gitBlobOid !== request.gitBlobOid
    ) {
      throw new Error("Vercel source provenance failed: collision-resistant provider content proof did not match.");
    }
  }

  return {
    verified: true,
    candidateSha: inspected.manifest.candidateSha,
    sourceTreeObject: inspected.manifest.sourceTreeObject,
    sourceManifestRoot: inspected.manifest.sourceManifestRoot,
    manifestRawSha1: inspected.manifestRawSha1,
    manifestSha256: inspected.manifestSha256,
    fileCount: inspected.manifest.fileCount,
    totalBytes: inspected.manifest.totalBytes,
    contentSha256Verified: true,
    fileModesVerified: true
  };
}

export function buildVercelSourceContentRequests({
  releaseBinding,
  filesPayload,
  manifestContentPayload,
  expectedStaging
}) {
  const inspected = inspectVercelCliSourcePackage({
    releaseBinding,
    filesPayload,
    manifestContentPayload,
    expectedStaging
  });
  return sourceContentRequests(inspected.files, inspected.providerFiles);
}

export function validateVercelSourceFileContent(request, payload) {
  if (
    !request ||
    typeof request !== "object" ||
    !SHA1_PATTERN.test(String(request.uid ?? "")) ||
    !Number.isSafeInteger(request.size) ||
    request.size < 0 ||
    request.size > MAX_SOURCE_FILE_BYTES ||
    !SHA1_PATTERN.test(String(request.rawSha1 ?? "")) ||
    !SHA256_PATTERN.test(String(request.sha256 ?? "")) ||
    !SHA1_PATTERN.test(String(request.gitBlobOid ?? ""))
  ) {
    throw new Error("Vercel source provenance failed: provider content request was invalid.");
  }
  const bytes = decodeCanonicalBase64(payload?.data, request.size, "provider file content");
  const evidence = {
    uid: request.uid,
    size: bytes.length,
    rawSha1: digest("sha1", bytes),
    sha256: digest("sha256", bytes),
    gitBlobOid: createHash("sha1")
      .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
      .update(bytes)
      .digest("hex")
  };
  if (
    evidence.uid !== evidence.rawSha1 ||
    evidence.size !== request.size ||
    evidence.rawSha1 !== request.rawSha1 ||
    evidence.sha256 !== request.sha256 ||
    evidence.gitBlobOid !== request.gitBlobOid
  ) {
    throw new Error("Vercel source provenance failed: provider file content did not match the Git-bound digest.");
  }
  return evidence;
}

function inspectVercelCliSourcePackage({
  releaseBinding,
  filesPayload,
  manifestContentPayload,
  expectedStaging
}) {
  const providerFiles = flattenVercelDeploymentSourceFiles(filesPayload);
  const manifestEntry = providerFiles.get(VERCEL_STAGING_MANIFEST_FILENAME);
  if (!manifestEntry) {
    throw new Error("Vercel source provenance failed: deployed staging manifest was absent.");
  }
  if (!providerModeMatchesGitMode(manifestEntry.mode, "100644")) {
    throw new Error("Vercel source provenance failed: deployed staging manifest mode was invalid.");
  }
  const manifestBytes = decodeManifestContent(manifestContentPayload);
  const manifestRawSha1 = digest("sha1", manifestBytes);
  const manifestSha256 = digest("sha256", manifestBytes);
  if (
    manifestEntry.uid !== manifestRawSha1 ||
    manifestRawSha1 !== expectedStaging?.manifestRawSha1 ||
    manifestSha256 !== expectedStaging?.manifestSha256
  ) {
    throw new Error("Vercel source provenance failed: deployed manifest bytes did not match the current Git-bound package.");
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("Vercel source provenance failed: deployed staging manifest was invalid JSON.");
  }
  const files = validateManifest(manifest, releaseBinding, expectedStaging);
  const expectedProviderPaths = new Set([
    ...files.map((entry) => entry.path),
    VERCEL_STAGING_MANIFEST_FILENAME
  ]);
  if (providerFiles.size !== expectedProviderPaths.size) {
    throw new Error("Vercel source provenance failed: provider source file set did not match the Git-bound package.");
  }
  for (const file of files) {
    const providerEntry = providerFiles.get(file.path);
    if (
      !providerEntry ||
      providerEntry.uid !== file.rawSha1 ||
      !providerModeMatchesGitMode(providerEntry.mode, file.mode)
    ) {
      throw new Error("Vercel source provenance failed: provider source bytes or file mode did not match the Git-bound package.");
    }
  }
  for (const providerPath of providerFiles.keys()) {
    if (!expectedProviderPaths.has(providerPath)) {
      throw new Error("Vercel source provenance failed: provider source file set contained an unexpected path.");
    }
  }
  return { files, manifest, manifestRawSha1, manifestSha256, providerFiles };
}

function providerModeMatchesGitMode(providerMode, gitMode) {
  return GIT_MODE_TO_PROVIDER_MODES.get(gitMode)?.has(providerMode) === true;
}

function sourceContentRequests(files, providerFiles) {
  const byUid = new Map();
  for (const file of files) {
    const providerEntry = providerFiles.get(file.path);
    const request = {
      uid: providerEntry.uid,
      size: file.size,
      rawSha1: file.rawSha1,
      sha256: file.sha256,
      gitBlobOid: file.gitBlobOid
    };
    const existing = byUid.get(request.uid);
    if (existing && JSON.stringify(existing) !== JSON.stringify(request)) {
      throw new Error("Vercel source provenance failed: one provider UID had conflicting Git-bound metadata.");
    }
    byUid.set(request.uid, request);
  }
  return [...byUid.values()];
}

function requireVerifiedSourceContents(value) {
  if (!(value instanceof Map)) {
    throw new Error("Vercel source provenance failed: collision-resistant provider content proof was absent.");
  }
  for (const [uid, evidence] of value) {
    if (typeof uid !== "string" || !evidence || typeof evidence !== "object") {
      throw new Error("Vercel source provenance failed: collision-resistant provider content proof was invalid.");
    }
  }
  return value;
}

function validateManifest(manifest, releaseBinding, expectedStaging) {
  const exactKeys = [
    "candidateSha",
    "fileCount",
    "files",
    "objectFormat",
    "schemaVersion",
    "sourceManifestAlgorithm",
    "sourceManifestRoot",
    "sourceTreeObject",
    "totalBytes",
    "trackedEntryCount"
  ];
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    Object.keys(manifest).sort().join("\n") !== exactKeys.sort().join("\n") ||
    manifest.schemaVersion !== 2 ||
    manifest.objectFormat !== "sha1" ||
    manifest.sourceManifestAlgorithm !== SOURCE_MANIFEST_ALGORITHM ||
    manifest.candidateSha !== releaseBinding?.candidateSha ||
    manifest.candidateSha !== expectedStaging?.candidateSha ||
    manifest.sourceTreeObject !== expectedStaging?.sourceTreeObject ||
    manifest.sourceManifestRoot !== expectedStaging?.sourceManifestRoot ||
    manifest.fileCount !== expectedStaging?.fileCount ||
    manifest.totalBytes !== expectedStaging?.totalBytes ||
    manifest.trackedEntryCount !== expectedStaging?.trackedEntryCount ||
    !SHA1_PATTERN.test(manifest.candidateSha) ||
    !SHA1_PATTERN.test(manifest.sourceTreeObject) ||
    !SHA256_PATTERN.test(manifest.sourceManifestRoot) ||
    !Number.isSafeInteger(manifest.fileCount) ||
    manifest.fileCount < 1 ||
    manifest.fileCount > MAX_SOURCE_FILES ||
    !Number.isSafeInteger(manifest.totalBytes) ||
    manifest.totalBytes < 0 ||
    manifest.totalBytes > MAX_SOURCE_TOTAL_BYTES ||
    !Number.isSafeInteger(manifest.trackedEntryCount) ||
    manifest.trackedEntryCount < manifest.fileCount ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== manifest.fileCount
  ) {
    throw new Error("Vercel source provenance failed: deployed manifest was not the expected Git-bound schema.");
  }

  let totalBytes = 0;
  let previousPath = null;
  const paths = new Set();
  for (const file of manifest.files) {
    const keys = file && typeof file === "object" && !Array.isArray(file)
      ? Object.keys(file).sort().join("\n")
      : "";
    const expectedKeys = ["gitBlobOid", "mode", "path", "rawSha1", "sha256", "size"].sort().join("\n");
    const canonicalPath = requireCanonicalManifestPath(file?.path);
    if (
      keys !== expectedKeys ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > MAX_SOURCE_FILE_BYTES ||
      !GIT_MODE_TO_PROVIDER_MODES.has(file.mode) ||
      !SHA1_PATTERN.test(String(file.rawSha1 ?? "")) ||
      !SHA256_PATTERN.test(String(file.sha256 ?? "")) ||
      !SHA1_PATTERN.test(String(file.gitBlobOid ?? "")) ||
      canonicalPath === VERCEL_STAGING_MANIFEST_FILENAME ||
      paths.has(canonicalPath) ||
      (previousPath !== null && Buffer.compare(
        Buffer.from(previousPath, "utf8"),
        Buffer.from(canonicalPath, "utf8")
      ) >= 0)
    ) {
      throw new Error("Vercel source provenance failed: deployed manifest file records were not canonical.");
    }
    paths.add(canonicalPath);
    previousPath = canonicalPath;
    totalBytes += file.size;
    if (!Number.isSafeInteger(totalBytes)) {
      throw new Error("Vercel source provenance failed: deployed manifest byte total exceeded its bound.");
    }
  }
  if (
    totalBytes !== manifest.totalBytes ||
    calculateSourceManifestRoot(manifest.files) !== manifest.sourceManifestRoot
  ) {
    throw new Error("Vercel source provenance failed: deployed manifest aggregate did not match.");
  }
  return manifest.files;
}

function decodeManifestContent(payload) {
  const encoded = payload?.data;
  if (
    typeof encoded !== "string" ||
    encoded.length === 0 ||
    encoded.length > Math.ceil(MAX_MANIFEST_BYTES / 3) * 4 + 4 ||
    encoded.length % 4 !== 0 ||
    !hasCanonicalBase64Syntax(encoded)
  ) {
    throw new Error("Vercel source provenance failed: manifest content encoding was invalid.");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > MAX_MANIFEST_BYTES || bytes.toString("base64") !== encoded) {
    throw new Error("Vercel source provenance failed: manifest content encoding was invalid.");
  }
  return bytes;
}

function decodeCanonicalBase64(encoded, expectedBytes, label) {
  const expectedEncodedLength = Math.ceil(expectedBytes / 3) * 4;
  if (
    typeof encoded !== "string" ||
    encoded.length !== expectedEncodedLength ||
    !hasCanonicalBase64Syntax(encoded)
  ) {
    throw new Error(`Vercel source provenance failed: ${label} encoding was invalid.`);
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length !== expectedBytes || bytes.toString("base64") !== encoded) {
    throw new Error(`Vercel source provenance failed: ${label} encoding was invalid.`);
  }
  return bytes;
}

function hasCanonicalBase64Syntax(encoded) {
  if (encoded.length % 4 !== 0) return false;
  let paddingLength = 0;
  if (encoded.endsWith("=")) paddingLength += 1;
  if (encoded.endsWith("==")) paddingLength += 1;
  const contentLength = encoded.length - paddingLength;
  const expectedRemainder = paddingLength === 0 ? 0 : 4 - paddingLength;
  if (contentLength % 4 !== expectedRemainder) return false;

  for (let index = 0; index < contentLength; index += 1) {
    const code = encoded.charCodeAt(index);
    const isBase64Character =
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2b ||
      code === 0x2f;
    if (!isBase64Character) return false;
  }
  for (let index = contentLength; index < encoded.length; index += 1) {
    if (encoded.charCodeAt(index) !== 0x3d) return false;
  }
  return true;
}

function requireCanonicalManifestPath(value) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\")) {
    throw new Error("Vercel source provenance failed: deployed manifest contained an invalid path.");
  }
  const segments = value.split("/");
  for (const segment of segments) requireCanonicalPathSegment(segment);
  if (Buffer.byteLength(value, "utf8") > MAX_SOURCE_PATH_BYTES) {
    throw new Error("Vercel source provenance failed: deployed manifest contained an invalid path.");
  }
  return value;
}

function requireCanonicalPathSegment(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    value.normalize("NFC") !== value
  ) {
    throw new Error("Vercel source provenance failed: a provider source path was invalid.");
  }
  return value;
}

function calculateSourceManifestRoot(files) {
  const canonicalLines = files.map((file) => JSON.stringify([
    file.path,
    file.mode,
    file.size,
    file.rawSha1,
    file.sha256,
    file.gitBlobOid
  ])).join("\n");
  return digest("sha256", Buffer.from(`${canonicalLines}\n`, "utf8"));
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex");
}
