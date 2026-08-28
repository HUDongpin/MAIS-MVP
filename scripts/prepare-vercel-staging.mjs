#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_STAGING_ROOT = path.join(REPO_ROOT, ".tmp", "vercel-staging");
const MANIFEST_FILENAME = "vercel-staging-manifest.json";
const MANIFEST_SCHEMA_VERSION = 2;
const SOURCE_MANIFEST_ALGORITHM = "sha256-canonical-json-lines-v2";
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;
const preparedStagingIntegrity = new WeakMap();

export function buildVercelStagingGitEnvironment(env = {}) {
  const child = {};
  for (const key of [
    "COMSPEC",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "TZ",
    "WINDIR"
  ]) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return {
    ...child,
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_VALUE_0: "false",
    GIT_CONFIG_VALUE_1: "/dev/null",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0"
  };
}

const REQUIRED_ROOT_FILES = [
  ".vercelignore",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "public/robots.txt",
  // `npm run build` = next-clean-build.mjs, which imports these two at build time.
  "scripts/check-stray-generated-types.mjs",
  "scripts/cleanup-generated-artifacts.mjs",
  "scripts/next-clean-build.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.next.json",
  // Vercel reads regions, crons, and headers from the UPLOADED tree — omitting
  // this file silently deploys with no keep-warm cron and no security headers.
  "vercel.json"
];

const REQUIRED_DIRECTORIES = [
  "app",
  "components",
  "data",
  "lib",
  "types",
  "public/audio",
  "public/lesson-illustrations",
  "public/ease_question_assets",
  "public/practice"
];

// public/games is not bulk-included: most of that tree is unreferenced design
// snapshots. Only these five files are referenced by live game runtime code.
const REQUIRED_GAME_ASSET_FILES = [
  "public/games/math-match-quest/board-reference.png",
  "public/games/math-match-quest/map-reference.png",
  "public/games/math-virus-blaster/math-master-virus-blaster-design.png",
  "public/games/mighty-tank-battle/desktop-reference.png",
  "public/games/mighty-tank-battle/mobile-reference.png"
];

const FORBIDDEN_ROOTS = new Set([
  ".git",
  ".local",
  ".tmp",
  ".vercel",
  "coordination",
  "node_modules",
  "private",
  "Users"
]);

const FORBIDDEN_BASENAMES = new Set([
  ".DS_Store",
  "All API Keys.docx",
  "default accounts.md"
]);

export async function prepareVercelStaging(options = {}) {
  const requestedRepoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);
  const repoRoot = await resolveRepositoryRoot(requestedRepoRoot);
  const defaultStagingRoot = path.join(repoRoot, ".tmp", "vercel-staging");
  const runId = sanitizePathSegment(options.runId ?? process.env.VERCEL_STAGING_RUN_ID ?? timestampRunId());
  const requestedStagingRoot = path.resolve(
    options.stagingRoot ??
    process.env.VERCEL_STAGING_ROOT ??
    (repoRoot === REPO_ROOT ? DEFAULT_STAGING_ROOT : path.join(requestedRepoRoot, ".tmp", "vercel-staging"))
  );
  const stagingRoot = isInside(requestedStagingRoot, requestedRepoRoot)
    ? path.join(repoRoot, path.relative(requestedRepoRoot, requestedStagingRoot))
    : requestedStagingRoot;
  assertSafeStagingRoot(stagingRoot, repoRoot, defaultStagingRoot);
  await assertStagingRootPathSafety(stagingRoot, repoRoot, defaultStagingRoot, { allowMissing: true });
  let stagingDir = path.join(stagingRoot, `${runId}-dry-run-not-created`);
  if (stagingDir === stagingRoot || !isInside(stagingDir, stagingRoot)) {
    throw new Error("Run id did not resolve to one safe Vercel staging directory.");
  }
  const dryRun = Boolean(options.dryRun);

  const startSnapshot = await readStableGitSnapshot(repoRoot);
  await assertMainlandPepQuestionIllustrationsAreNotDeployable(repoRoot);

  const plannedFiles = await collectDeployableFiles(repoRoot);
  const forbiddenFiles = plannedFiles.filter((file) => isForbiddenDeployPath(file.relativePath));
  if (forbiddenFiles.length > 0) {
    throw new Error(
      [
        "Refusing to prepare Vercel staging because forbidden paths were selected:",
        ...forbiddenFiles.slice(0, 20).map((file) => `- ${file.relativePath}`),
        forbiddenFiles.length > 20 ? `- ...and ${forbiddenFiles.length - 20} more` : ""
      ].filter(Boolean).join("\n")
    );
  }

  const sourceFiles = [];
  for (const plannedFile of plannedFiles) {
    const treeEntry = startSnapshot.treeEntries.get(plannedFile.relativePath);
    if (!treeEntry || !treeEntry.regularBlob) {
      throw new Error("A selected deploy input is not a tracked regular Git blob; path details redacted.");
    }
    const bytes = await readRegularFile(
      plannedFile.absolutePath,
      "selected deploy input",
      treeEntry.mode
    );
    const provenance = calculateFileProvenance(bytes, startSnapshot.objectFormat);
    if (provenance.gitBlobOid !== treeEntry.gitBlobOid) {
      throw new Error("A selected deploy input does not match the current Git HEAD blob; path details redacted.");
    }
    sourceFiles.push({
      absolutePath: plannedFile.absolutePath,
      record: {
        path: plannedFile.relativePath,
        mode: treeEntry.mode,
        size: provenance.size,
        rawSha1: provenance.rawSha1,
        sha256: provenance.sha256,
        gitBlobOid: provenance.gitBlobOid
      }
    });
  }

  sourceFiles.sort((left, right) => compareCanonicalPaths(left.record.path, right.record.path));
  const manifestFiles = sourceFiles.map(({ record }) => record);
  const sourceManifestRoot = calculateSourceManifestRoot(manifestFiles);
  const totalBytes = manifestFiles.reduce((total, file) => total + file.size, 0);
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    candidateSha: startSnapshot.candidateSha,
    sourceTreeObject: startSnapshot.sourceTreeObject,
    objectFormat: startSnapshot.objectFormat,
    sourceManifestAlgorithm: SOURCE_MANIFEST_ALGORITHM,
    sourceManifestRoot,
    trackedEntryCount: startSnapshot.treeEntries.size,
    fileCount: manifestFiles.length,
    totalBytes,
    files: manifestFiles
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  assertManifestContainsNoAbsolutePaths(manifestBytes, [repoRoot, stagingRoot, stagingDir]);
  const manifestRawSha1 = digest("sha1", manifestBytes);
  const manifestSha256 = digest("sha256", manifestBytes);

  let stagingRootReal = null;
  if (!dryRun) {
    stagingRootReal = await createAndVerifyStagingRoot(stagingRoot, repoRoot, defaultStagingRoot);
    stagingDir = await fs.mkdtemp(path.join(stagingRootReal, `${runId}-`));
    await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
    if (typeof options.afterPrivateStagingCreated === "function") {
      await options.afterPrivateStagingCreated({ stagingDir });
    }
    await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
    for (const sourceFile of sourceFiles) {
      await verifySourceFile(sourceFile, startSnapshot.objectFormat);
      if (typeof options.beforeCopyFile === "function") {
        await options.beforeCopyFile({ relativePath: sourceFile.record.path });
      }
      const destination = path.join(stagingDir, sourceFile.record.path);
      await createAndVerifyPrivateDirectory(
        path.dirname(destination),
        stagingDir,
        stagingRootReal
      );
      const verifiedBytes = await verifySourceFile(sourceFile, startSnapshot.objectFormat);
      await writePrivateStagingFile(
        destination,
        verifiedBytes,
        sourceFile.record.mode === "100755" ? 0o755 : 0o644,
        stagingDir,
        stagingRootReal
      );
      await verifySourceFile(sourceFile, startSnapshot.objectFormat);
      await verifyCopiedFile(destination, sourceFile.record, startSnapshot.objectFormat);
    }
    const writtenManifestPath = path.join(stagingDir, MANIFEST_FILENAME);
    await writePrivateStagingFile(
      writtenManifestPath,
      manifestBytes,
      0o644,
      stagingDir,
      stagingRootReal
    );
    const writtenManifest = await fs.readFile(writtenManifestPath);
    if (!writtenManifest.equals(manifestBytes)) {
      throw new Error("Written Vercel staging manifest failed byte verification; details redacted.");
    }
    await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
  }

  for (const sourceFile of sourceFiles) {
    await verifySourceFile(sourceFile, startSnapshot.objectFormat);
  }
  if (typeof options.beforeFinalSnapshot === "function") {
    await options.beforeFinalSnapshot();
  }
  const endSnapshot = await readStableGitSnapshot(repoRoot);
  if (
    endSnapshot.candidateSha !== startSnapshot.candidateSha ||
    endSnapshot.sourceTreeObject !== startSnapshot.sourceTreeObject ||
    endSnapshot.objectFormat !== startSnapshot.objectFormat
  ) {
    throw new Error("Git HEAD or tree changed during staging; candidate details redacted.");
  }

  const summary = {
    candidateSha: startSnapshot.candidateSha,
    dryRun,
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    },
    fileCount: manifestFiles.length,
    forbiddenPathCount: forbiddenFiles.length,
    gitSourceVerified: true,
    manifestPath: MANIFEST_FILENAME,
    manifestRawSha1,
    manifestSha256,
    objectFormat: startSnapshot.objectFormat,
    sourceManifestRoot,
    sourceTreeObject: startSnapshot.sourceTreeObject,
    stagingDir,
    totalBytes,
    trackedEntryCount: startSnapshot.treeEntries.size
  };
  if (!dryRun) {
    const stagingRootIdentity = await readDirectoryIdentity(stagingRootReal, "Vercel staging root");
    const stagingDirectoryIdentity = await readDirectoryIdentity(stagingDir, "private Vercel staging directory");
    const stagingFileIdentities = await readPreparedStagingFileIdentities(stagingDir);
    preparedStagingIntegrity.set(summary, {
      evidence: Object.freeze({
        candidateSha: summary.candidateSha,
        fileCount: summary.fileCount,
        manifestPath: summary.manifestPath,
        manifestRawSha1: summary.manifestRawSha1,
        manifestSha256: summary.manifestSha256,
        objectFormat: summary.objectFormat,
        sourceManifestRoot: summary.sourceManifestRoot,
        sourceTreeObject: summary.sourceTreeObject,
        stagingDir: summary.stagingDir,
        totalBytes: summary.totalBytes,
        trackedEntryCount: summary.trackedEntryCount
      }),
      repoRoot,
      sealFiles: Object.freeze([
        ...manifestFiles.map((file) => Object.freeze({ path: file.path, mode: file.mode })),
        Object.freeze({ path: MANIFEST_FILENAME, mode: "100644" })
      ]),
      sealed: false,
      stagingDirectoryIdentity,
      stagingFileIdentities,
      stagingRootIdentity
    });
  }
  return summary;
}

export async function verifyPreparedVercelStaging(staging) {
  try {
    return await verifyPreparedVercelStagingInternal(staging);
  } catch {
    throw new Error("Prepared Vercel staging verification failed; details redacted.");
  }
}

export async function sealPreparedVercelStaging(staging) {
  const binding = preparedStagingIntegrity.get(staging);
  try {
    if (!binding || binding.sealed) throw new Error("invalid staging seal binding");
    await verifyPreparedVercelStagingInternal(staging);
    await setPreparedStagingPermissions(binding, true);
    binding.sealed = true;
    await verifyPreparedVercelStagingInternal(staging);
    return {
      candidateSha: binding.evidence.candidateSha,
      fileCount: binding.evidence.fileCount,
      sealed: true,
      threatBoundary: "owner-read-only-permissions-with-provider-byte-readback"
    };
  } catch {
    if (binding) {
      try {
        await setPreparedStagingPermissions(binding, false);
        binding.sealed = false;
      } catch {
        // Leave a partially sealed private directory fail-closed for inspection.
      }
    }
    throw new Error("Prepared Vercel staging seal failed; details redacted.");
  }
}

export async function releasePreparedVercelStagingSeal(staging) {
  const binding = preparedStagingIntegrity.get(staging);
  try {
    if (!binding || !binding.sealed) throw new Error("invalid staging seal binding");
    await verifyPreparedVercelStagingInternal(staging);
    await setPreparedStagingPermissions(binding, false);
    binding.sealed = false;
    await verifyPreparedVercelStagingInternal(staging);
    return { candidateSha: binding.evidence.candidateSha, sealed: false };
  } catch {
    throw new Error("Prepared Vercel staging seal release failed; details redacted.");
  }
}

async function setPreparedStagingPermissions(binding, sealed) {
  const stagingDir = binding.stagingDirectoryIdentity.real;
  const directories = new Set([stagingDir]);
  for (const file of binding.sealFiles) {
    const segments = file.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(path.join(stagingDir, ...segments.slice(0, index)));
    }
  }
  const directoryPaths = [...directories].sort((left, right) => {
    const depthDifference = right.split(path.sep).length - left.split(path.sep).length;
    return sealed ? depthDifference : -depthDifference;
  });
  if (!sealed) {
    for (const directory of directoryPaths) await fs.chmod(directory, 0o700);
  }
  for (const file of binding.sealFiles) {
    const absolutePath = path.join(stagingDir, ...file.path.split("/"));
    if (!isInside(absolutePath, stagingDir)) throw new Error("seal path escaped staging");
    await fs.chmod(absolutePath, sealed
      ? file.mode === "100755" ? 0o500 : 0o400
      : file.mode === "100755" ? 0o755 : 0o644);
  }
  if (sealed) {
    for (const directory of directoryPaths) await fs.chmod(directory, 0o500);
  }
}

async function verifyPreparedVercelStagingInternal(staging) {
  const binding = preparedStagingIntegrity.get(staging);
  if (!binding || !staging || staging.dryRun !== false) {
    throw new Error("invalid staging binding");
  }
  for (const [key, expected] of Object.entries(binding.evidence)) {
    if (staging[key] !== expected) throw new Error("staging evidence changed");
  }

  const currentRootIdentity = await readDirectoryIdentity(
    binding.stagingRootIdentity.real,
    "Vercel staging root"
  );
  const currentDirectoryIdentity = await readDirectoryIdentity(
    binding.stagingDirectoryIdentity.real,
    "private Vercel staging directory"
  );
  if (
    !sameDirectoryIdentity(currentRootIdentity, binding.stagingRootIdentity) ||
    !sameDirectoryIdentity(currentDirectoryIdentity, binding.stagingDirectoryIdentity) ||
    path.dirname(currentDirectoryIdentity.real) !== currentRootIdentity.real
  ) {
    throw new Error("staging directory identity changed");
  }
  await assertPrivateStagingDirectory(currentDirectoryIdentity.real, currentRootIdentity.real);

  const manifestPath = path.join(currentDirectoryIdentity.real, MANIFEST_FILENAME);
  const manifestBytes = await readRegularFile(manifestPath, "Vercel staging manifest", "100644");
  if (
    digest("sha1", manifestBytes) !== binding.evidence.manifestRawSha1 ||
    digest("sha256", manifestBytes) !== binding.evidence.manifestSha256
  ) {
    throw new Error("manifest bytes changed");
  }
  assertManifestContainsNoAbsolutePaths(manifestBytes, [
    binding.repoRoot,
    currentRootIdentity.real,
    currentDirectoryIdentity.real
  ]);

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("manifest JSON invalid");
  }
  validateManifestDocument(manifest, binding.evidence);

  const actualFiles = await collectPreparedStagingFiles(currentDirectoryIdentity.real);
  const expectedFiles = [
    ...manifest.files.map((file) => file.path),
    MANIFEST_FILENAME
  ].sort(compareCanonicalPaths);
  if (
    actualFiles.length !== expectedFiles.length ||
    actualFiles.some((relativePath, index) => relativePath !== expectedFiles[index])
  ) {
    throw new Error("staging file set changed");
  }
  if (binding.stagingFileIdentities.size !== actualFiles.length) {
    throw new Error("staging file identity set changed");
  }
  for (const relativePath of actualFiles) {
    const expectedIdentity = binding.stagingFileIdentities.get(relativePath);
    const currentIdentity = await readRegularFileIdentity(
      path.join(currentDirectoryIdentity.real, ...relativePath.split("/")),
      "prepared staging input"
    );
    if (!expectedIdentity || !sameFileIdentity(currentIdentity, expectedIdentity)) {
      throw new Error("staging file identity changed");
    }
  }

  for (const file of manifest.files) {
    const absolutePath = path.join(currentDirectoryIdentity.real, ...file.path.split("/"));
    if (!isInside(absolutePath, currentDirectoryIdentity.real)) {
      throw new Error("manifest path escaped staging");
    }
    const bytes = await readRegularFile(absolutePath, "prepared staging input", file.mode);
    const actual = calculateFileProvenance(bytes, "sha1");
    if (!sameProvenance(actual, file)) {
      throw new Error("prepared file provenance changed");
    }
  }

  const gitSnapshot = await readStableGitSnapshot(binding.repoRoot);
  if (
    gitSnapshot.candidateSha !== binding.evidence.candidateSha ||
    gitSnapshot.sourceTreeObject !== binding.evidence.sourceTreeObject ||
    gitSnapshot.objectFormat !== "sha1" ||
    gitSnapshot.treeEntries.size !== binding.evidence.trackedEntryCount
  ) {
    throw new Error("Git source binding changed");
  }
  for (const file of manifest.files) {
    const treeEntry = gitSnapshot.treeEntries.get(file.path);
    if (
      !treeEntry?.regularBlob ||
      treeEntry.mode !== file.mode ||
      treeEntry.gitBlobOid !== file.gitBlobOid
    ) {
      throw new Error("manifest no longer matches Git tree");
    }
  }

  await assertPrivateStagingDirectory(currentDirectoryIdentity.real, currentRootIdentity.real);
  return {
    candidateSha: binding.evidence.candidateSha,
    fileCount: binding.evidence.fileCount,
    manifestRawSha1: binding.evidence.manifestRawSha1,
    manifestSha256: binding.evidence.manifestSha256,
    sourceManifestRoot: binding.evidence.sourceManifestRoot,
    sourceTreeObject: binding.evidence.sourceTreeObject,
    totalBytes: binding.evidence.totalBytes,
    uploadBytesVerified: true
  };
}

function validateManifestDocument(manifest, expected) {
  const expectedManifestKeys = [
    "schemaVersion",
    "candidateSha",
    "sourceTreeObject",
    "objectFormat",
    "sourceManifestAlgorithm",
    "sourceManifestRoot",
    "trackedEntryCount",
    "fileCount",
    "totalBytes",
    "files"
  ];
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    Object.keys(manifest).join("\0") !== expectedManifestKeys.join("\0") ||
    manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
    manifest.candidateSha !== expected.candidateSha ||
    manifest.sourceTreeObject !== expected.sourceTreeObject ||
    manifest.objectFormat !== "sha1" ||
    manifest.sourceManifestAlgorithm !== SOURCE_MANIFEST_ALGORITHM ||
    manifest.sourceManifestRoot !== expected.sourceManifestRoot ||
    manifest.trackedEntryCount !== expected.trackedEntryCount ||
    manifest.fileCount !== expected.fileCount ||
    manifest.totalBytes !== expected.totalBytes ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== expected.fileCount
  ) {
    throw new Error("manifest contract changed");
  }

  const expectedFileKeys = ["path", "mode", "size", "rawSha1", "sha256", "gitBlobOid"];
  const seenPaths = new Set();
  let previousPath = null;
  let totalBytes = 0;
  for (const file of manifest.files) {
    if (
      !file ||
      typeof file !== "object" ||
      Array.isArray(file) ||
      Object.keys(file).join("\0") !== expectedFileKeys.join("\0") ||
      typeof file.path !== "string" ||
      !isCanonicalManifestPath(file.path) ||
      file.path === MANIFEST_FILENAME ||
      seenPaths.has(file.path) ||
      (previousPath !== null && compareCanonicalPaths(previousPath, file.path) >= 0) ||
      (file.mode !== "100644" && file.mode !== "100755") ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      !/^[0-9a-f]{40}$/u.test(file.rawSha1) ||
      !/^[0-9a-f]{64}$/u.test(file.sha256) ||
      !/^[0-9a-f]{40}$/u.test(file.gitBlobOid)
    ) {
      throw new Error("manifest file record invalid");
    }
    seenPaths.add(file.path);
    previousPath = file.path;
    totalBytes += file.size;
    if (!Number.isSafeInteger(totalBytes)) throw new Error("manifest byte total invalid");
  }
  if (
    totalBytes !== expected.totalBytes ||
    calculateSourceManifestRoot(manifest.files) !== expected.sourceManifestRoot
  ) {
    throw new Error("manifest canonical root changed");
  }
}

function isCanonicalManifestPath(relativePath) {
  return relativePath.length > 0 &&
    relativePath === path.posix.normalize(relativePath) &&
    !relativePath.startsWith("/") &&
    !relativePath.startsWith("../") &&
    !relativePath.split("/").includes("..") &&
    !relativePath.split("/").includes(".") &&
    !relativePath.includes("\\");
}

async function collectPreparedStagingFiles(stagingDir) {
  const files = [];
  await walkPreparedStagingDirectory(stagingDir, stagingDir, files);
  return files.sort(compareCanonicalPaths);
}

async function readPreparedStagingFileIdentities(stagingDir) {
  const identities = new Map();
  for (const relativePath of await collectPreparedStagingFiles(stagingDir)) {
    identities.set(
      relativePath,
      await readRegularFileIdentity(
        path.join(stagingDir, ...relativePath.split("/")),
        "prepared staging input"
      )
    );
  }
  return identities;
}

async function walkPreparedStagingDirectory(stagingDir, directory, files) {
  await assertDirectoryChainWithoutSymlinks(stagingDir, directory, { allowMissing: false });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareCanonicalPaths(left.name, right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (!isInside(absolutePath, stagingDir)) throw new Error("staging entry escaped root");
    const stat = await fs.lstat(absolutePath);
    if (stat.isSymbolicLink()) throw new Error("staging entry is symlink");
    if (stat.isDirectory()) {
      await walkPreparedStagingDirectory(stagingDir, absolutePath, files);
    } else if (stat.isFile()) {
      const real = await fs.realpath(absolutePath);
      if (real !== absolutePath || !isInside(real, stagingDir)) {
        throw new Error("staging file escaped root");
      }
      files.push(toPosix(path.relative(stagingDir, absolutePath)));
    } else {
      throw new Error("staging contains non-regular entry");
    }
  }
}

function sameDirectoryIdentity(actual, expected) {
  return actual.dev === expected.dev && actual.ino === expected.ino && actual.real === expected.real;
}

async function readRegularFileIdentity(absolutePath, label) {
  let stat;
  let real;
  try {
    stat = await fs.lstat(absolutePath);
    real = await fs.realpath(absolutePath);
  } catch {
    throw new Error(`${label} identity is unavailable; path details redacted.`);
  }
  if (stat.isSymbolicLink() || !stat.isFile() || real !== absolutePath) {
    throw new Error(`${label} identity failed lstat/realpath verification; path details redacted.`);
  }
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
    real
  });
}

function sameFileIdentity(actual, expected) {
  return actual.dev === expected.dev && actual.ino === expected.ino && actual.real === expected.real;
}

export function calculateFileProvenance(input, objectFormat) {
  if (objectFormat !== "sha1") {
    throw new Error("Vercel staging provenance supports only SHA-1 Git repositories.");
  }
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return {
    size: bytes.length,
    rawSha1: digest("sha1", bytes),
    sha256: digest("sha256", bytes),
    gitBlobOid: createHash(objectFormat).update(gitHeader).update(bytes).digest("hex")
  };
}

export function parseGitLsTree(output, objectFormat) {
  if (objectFormat !== "sha1") {
    throw new Error("Vercel staging provenance supports only SHA-1 Git repositories.");
  }
  const oidLength = 40;
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
  const entries = new Map();
  for (const rawRecord of buffer.toString("utf8").split("\0")) {
    if (!rawRecord) continue;
    const tabIndex = rawRecord.indexOf("\t");
    if (tabIndex <= 0) {
      throw new Error("Git ls-tree returned an invalid record; details redacted.");
    }
    const header = rawRecord.slice(0, tabIndex);
    const relativePath = toPosix(rawRecord.slice(tabIndex + 1));
    const match = /^(\d{6}) (blob|tree|commit) ([0-9a-f]+)$/u.exec(header);
    if (
      !match ||
      match[3].length !== oidLength ||
      !relativePath ||
      relativePath.startsWith("/") ||
      relativePath.split("/").includes("..") ||
      entries.has(relativePath)
    ) {
      throw new Error("Git ls-tree returned an invalid entry; details redacted.");
    }
    const [, mode, objectType, gitBlobOid] = match;
    entries.set(relativePath, {
      gitBlobOid,
      mode,
      objectType,
      regularBlob: objectType === "blob" && (mode === "100644" || mode === "100755")
    });
  }
  if (entries.size === 0) {
    throw new Error("Git ls-tree returned no tracked entries.");
  }
  return entries;
}

async function readStableGitSnapshot(repoRoot) {
  const objectFormat = (await runGitText(repoRoot, ["rev-parse", "--show-object-format"])).trim();
  if (objectFormat !== "sha1") {
    throw new Error("Vercel staging supports only SHA-1 Git repositories.");
  }
  const oidPattern = /^[0-9a-f]{40}$/u;
  const candidateSha = (await runGitText(repoRoot, ["rev-parse", "--verify", "HEAD"])).trim().toLowerCase();
  if (!oidPattern.test(candidateSha)) {
    throw new Error("Git candidate HEAD is invalid; details redacted.");
  }
  const sourceTreeObject = (
    await runGitText(repoRoot, ["rev-parse", `${candidateSha}^{tree}`])
  ).trim().toLowerCase();
  if (!oidPattern.test(sourceTreeObject)) {
    throw new Error("Git candidate tree is invalid; details redacted.");
  }
  await assertCleanGitSource(repoRoot);
  const lsTreeOutput = await runGit(repoRoot, ["ls-tree", "-r", "-z", "--full-tree", candidateSha]);
  const treeEntries = parseGitLsTree(lsTreeOutput, objectFormat);
  const finalHead = (await runGitText(repoRoot, ["rev-parse", "--verify", "HEAD"])).trim().toLowerCase();
  const finalTree = (await runGitText(repoRoot, ["rev-parse", `${finalHead}^{tree}`])).trim().toLowerCase();
  await assertCleanGitSource(repoRoot);
  if (finalHead !== candidateSha || finalTree !== sourceTreeObject) {
    throw new Error("Git HEAD or tree changed while reading staging provenance; details redacted.");
  }
  return { candidateSha, objectFormat, sourceTreeObject, treeEntries };
}

async function assertCleanGitSource(repoRoot) {
  const status = await runGit(repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (status.length > 0) {
    throw new Error("Vercel staging requires one clean tracked Git HEAD; dirty paths are redacted.");
  }
}

async function runGitText(repoRoot, args) {
  return (await runGit(repoRoot, args)).toString("utf8");
}

function runGit(repoRoot, args) {
  return new Promise((resolve, reject) => {
    const child = execFile("git", args, {
      cwd: repoRoot,
      encoding: "buffer",
      env: buildVercelStagingGitEnvironment(process.env),
      maxBuffer: MAX_GIT_OUTPUT_BYTES
    }, (error, stdout) => {
      if (error) {
        reject(new Error("Git provenance command failed; command details redacted."));
        return;
      }
      resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout ?? ""));
    });
    child.on("error", () => {
      reject(new Error("Git provenance command failed; command details redacted."));
    });
  });
}

async function collectDeployableFiles(repoRoot) {
  const files = new Map();

  for (const rootFile of [...REQUIRED_ROOT_FILES, ...REQUIRED_GAME_ASSET_FILES]) {
    const absolutePath = path.join(repoRoot, rootFile);
    await assertReadablePath(absolutePath, rootFile);
    const stat = await fs.lstat(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Required deploy file is not a regular file: ${rootFile}`);
    }
    addPlannedFile(files, {
      absolutePath,
      relativePath: toPosix(rootFile)
    });
  }

  for (const directory of REQUIRED_DIRECTORIES) {
    const absoluteDirectory = path.join(repoRoot, directory);
    await assertReadablePath(absoluteDirectory, directory);
    const directoryStat = await fs.lstat(absoluteDirectory);
    if (!directoryStat.isDirectory()) {
      throw new Error(`Required deploy directory is not a regular directory: ${directory}`);
    }
    await walkDirectory(repoRoot, absoluteDirectory, async (absolutePath) => {
      const relativePath = toRepoRelativePath(repoRoot, absolutePath);
      if (isForbiddenDeployPath(relativePath)) return;
      addPlannedFile(files, { absolutePath, relativePath });
    });
  }

  return [...files.values()].sort((left, right) => compareCanonicalPaths(left.relativePath, right.relativePath));
}

function addPlannedFile(files, file) {
  if (files.has(file.relativePath)) {
    throw new Error("Deploy file policy selected one path more than once; details redacted.");
  }
  files.set(file.relativePath, file);
}

async function walkDirectory(repoRoot, directory, onFile) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => compareCanonicalPaths(left.name, right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRepoRelativePath(repoRoot, absolutePath);
    if (isForbiddenDeployPath(relativePath)) continue;

    if (entry.isDirectory()) {
      await walkDirectory(repoRoot, absolutePath, onFile);
      continue;
    }
    if (entry.isFile()) {
      const stat = await fs.lstat(absolutePath);
      if (!stat.isFile()) {
        throw new Error("A deploy input changed file type during collection; details redacted.");
      }
      await onFile(absolutePath);
      continue;
    }
    throw new Error("A deploy directory contains a non-regular input; path details redacted.");
  }
}

async function verifySourceFile(sourceFile, objectFormat) {
  const bytes = await readRegularFile(
    sourceFile.absolutePath,
    "source deploy input",
    sourceFile.record.mode
  );
  const current = calculateFileProvenance(bytes, objectFormat);
  if (!sameProvenance(current, sourceFile.record)) {
    throw new Error("A source file changed during staging; path details redacted.");
  }
  return bytes;
}

async function verifyCopiedFile(destination, expected, objectFormat) {
  const bytes = await readRegularFile(destination, "copied deploy input", expected.mode);
  const current = calculateFileProvenance(bytes, objectFormat);
  if (!sameProvenance(current, expected)) {
    throw new Error("A copied staging file failed provenance verification; path details redacted.");
  }
}

async function readRegularFile(absolutePath, label, expectedGitMode) {
  const stat = await fs.lstat(absolutePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label} is not a regular file; path details redacted.`);
  }
  if (expectedGitMode && gitModeFromStat(stat) !== expectedGitMode) {
    throw new Error(`${label} mode changed; path details redacted.`);
  }
  return fs.readFile(absolutePath);
}

function gitModeFromStat(stat) {
  return (stat.mode & 0o111) === 0 ? "100644" : "100755";
}

function sameProvenance(actual, expected) {
  return actual.size === expected.size &&
    actual.rawSha1 === expected.rawSha1 &&
    actual.sha256 === expected.sha256 &&
    actual.gitBlobOid === expected.gitBlobOid;
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

function assertManifestContainsNoAbsolutePaths(manifestBytes, absolutePaths) {
  const text = manifestBytes.toString("utf8");
  if (absolutePaths.some((absolutePath) => absolutePath && text.includes(absolutePath))) {
    throw new Error("Vercel staging manifest contained an absolute path; details redacted.");
  }
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex");
}

function isForbiddenDeployPath(relativePath) {
  const normalizedPath = toPosix(relativePath).replace(/^\/+/, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  const basename = segments.at(-1) ?? "";

  if (FORBIDDEN_BASENAMES.has(basename)) return true;
  if (basename.startsWith(".env")) return true;
  if (/\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(basename)) return true;

  if (segments.some((segment) => FORBIDDEN_ROOTS.has(segment))) return true;
  if (segments.some((segment) => segment === "__tests__" || segment === "test" || segment === "tests")) return true;
  if (segments.some((segment) => segment.startsWith(".next"))) return true;
  if (segments.some((segment) => segment.startsWith(".s11"))) return true;

  return (
    normalizedPath === "data/ease" ||
    normalizedPath.startsWith("data/ease/") ||
    normalizedPath === "public/question-illustrations" ||
    normalizedPath.startsWith("public/question-illustrations/")
  );
}

function isInside(absolutePath, root) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSafeStagingRoot(stagingRoot, repoRoot, defaultStagingRoot) {
  if (stagingRoot === repoRoot) {
    throw new Error("Refusing to use the repository root as Vercel staging root.");
  }

  if (
    process.env.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING !== "1" &&
    !isInside(stagingRoot, defaultStagingRoot)
  ) {
    throw new Error(
      [
        "Refusing to prepare Vercel staging outside .tmp/vercel-staging.",
        "Set MAIS_ALLOW_EXTERNAL_VERCEL_STAGING=1 only for an owner-approved exception."
      ].join("\n")
    );
  }
}

async function resolveRepositoryRoot(repoRoot) {
  const requestedRoot = path.resolve(repoRoot);
  let resolvedRoot;
  let stat;
  try {
    resolvedRoot = await fs.realpath(requestedRoot);
    stat = await fs.lstat(resolvedRoot);
  } catch {
    throw new Error("Repository root is unavailable; path details redacted.");
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Repository root must be one real directory; path details redacted.");
  }
  return resolvedRoot;
}

async function assertStagingRootPathSafety(
  stagingRoot,
  repoRoot,
  defaultStagingRoot,
  { allowMissing = false } = {}
) {
  if (isInside(stagingRoot, defaultStagingRoot)) {
    return assertDirectoryChainWithoutSymlinks(repoRoot, stagingRoot, { allowMissing });
  }
  if (process.env.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING !== "1") {
    throw new Error("Vercel staging root is outside the approved containment boundary.");
  }
  try {
    const stat = await fs.lstat(stagingRoot);
    const real = await fs.realpath(stagingRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink() || real !== stagingRoot) {
      throw new Error("unsafe");
    }
    return real;
  } catch {
    if (allowMissing) {
      throw new Error("External Vercel staging root must be one pre-existing real directory.");
    }
    throw new Error("External Vercel staging root failed realpath containment verification.");
  }
}

async function assertDirectoryChainWithoutSymlinks(anchorRoot, targetDirectory, { allowMissing = false } = {}) {
  if (!isInside(targetDirectory, anchorRoot)) {
    throw new Error("Vercel staging path escaped its approved containment boundary.");
  }
  const anchorStat = await fs.lstat(anchorRoot);
  const anchorReal = await fs.realpath(anchorRoot);
  if (anchorStat.isSymbolicLink() || !anchorStat.isDirectory() || anchorReal !== anchorRoot) {
    throw new Error("Vercel staging containment anchor failed lstat/realpath verification.");
  }
  const relative = path.relative(anchorRoot, targetDirectory);
  let current = anchorRoot;
  let expectedReal = anchorReal;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    expectedReal = path.join(expectedReal, segment);
    let stat;
    try {
      stat = await fs.lstat(current);
    } catch (error) {
      if (allowMissing && error?.code === "ENOENT") return null;
      throw new Error("Vercel staging directory chain is unavailable; path details redacted.");
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("Vercel staging directory chain contains a symlink or non-directory.");
    }
    const currentReal = await fs.realpath(current);
    if (currentReal !== expectedReal || !isInside(currentReal, anchorReal)) {
      throw new Error("Vercel staging directory failed realpath containment verification.");
    }
  }
  return expectedReal;
}

async function createAndVerifyStagingRoot(stagingRoot, repoRoot, defaultStagingRoot) {
  const existing = await assertStagingRootPathSafety(
    stagingRoot,
    repoRoot,
    defaultStagingRoot,
    { allowMissing: true }
  );
  if (!existing) {
    await fs.mkdir(stagingRoot, { recursive: true, mode: 0o700 });
  }
  const verified = await assertStagingRootPathSafety(
    stagingRoot,
    repoRoot,
    defaultStagingRoot,
    { allowMissing: false }
  );
  if (!verified) {
    throw new Error("Vercel staging root could not be verified after creation.");
  }
  return verified;
}

async function assertPrivateStagingDirectory(stagingDir, stagingRootReal) {
  if (!isInside(stagingDir, stagingRootReal) || path.dirname(stagingDir) !== stagingRootReal) {
    throw new Error("Private Vercel staging directory escaped its approved root.");
  }
  const stat = await fs.lstat(stagingDir);
  const real = await fs.realpath(stagingDir);
  if (!stat.isDirectory() || stat.isSymbolicLink() || real !== stagingDir) {
    throw new Error("Private Vercel staging directory failed lstat/realpath verification.");
  }
  return real;
}

async function createAndVerifyPrivateDirectory(directory, stagingDir, stagingRootReal) {
  await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
  if (!isInside(directory, stagingDir)) {
    throw new Error("Vercel staging destination escaped its private directory.");
  }
  await assertDirectoryChainWithoutSymlinks(stagingDir, directory, { allowMissing: true });
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await assertDirectoryChainWithoutSymlinks(stagingDir, directory, { allowMissing: false });
  await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
}

async function writePrivateStagingFile(
  destination,
  bytes,
  mode,
  stagingDir,
  stagingRootReal
) {
  await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
  if (!isInside(destination, stagingDir) || destination === stagingDir) {
    throw new Error("Vercel staging file escaped its private directory.");
  }
  await assertDirectoryChainWithoutSymlinks(
    stagingDir,
    path.dirname(destination),
    { allowMissing: false }
  );
  try {
    await fs.lstat(destination);
    throw new Error("Vercel staging destination already exists; refusing replacement.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.writeFile(destination, bytes, { flag: "wx", mode });
  await assertPrivateStagingDirectory(stagingDir, stagingRootReal);
  const stat = await fs.lstat(destination);
  const real = await fs.realpath(destination);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    real !== destination ||
    !isInside(real, stagingDir)
  ) {
    throw new Error("Written Vercel staging file failed lstat/realpath containment verification.");
  }
}

async function readDirectoryIdentity(directory, label) {
  let stat;
  let real;
  try {
    stat = await fs.lstat(directory);
    real = await fs.realpath(directory);
  } catch {
    throw new Error(`${label} is unavailable; path details redacted.`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory() || real !== directory) {
    throw new Error(`${label} failed lstat/realpath verification; path details redacted.`);
  }
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
    real
  });
}

async function assertMainlandPepQuestionIllustrationsAreNotDeployable(repoRoot) {
  const sourcePath = path.join(repoRoot, "lib", "mainlandPepQuestionAssets.ts");
  const source = await fs.readFile(sourcePath, "utf8");
  const approvalsAreEmpty =
    /export\s+const\s+mainlandPepQuestionIllustrationApprovals[\s\S]*?=\s*\[\s*\];/u.test(source);

  if (!approvalsAreEmpty) {
    throw new Error(
      [
        "Refusing to exclude public/question-illustrations because Mainland PEP question illustration approvals are no longer empty.",
        "Define an explicit deploy asset policy before preparing Vercel staging."
      ].join("\n")
    );
  }
}

async function assertReadablePath(absolutePath, label) {
  try {
    await fs.access(absolutePath, fsConstants.R_OK);
  } catch {
    throw new Error(`Required deploy input is missing or unreadable: ${label}`);
  }
}

function timestampRunId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/u, "Z");
}

function sanitizePathSegment(value) {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Run id must identify one safe non-parent path segment.");
  }
  return sanitized;
}

function toRepoRelativePath(repoRoot, absolutePath) {
  return toPosix(path.relative(repoRoot, absolutePath));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function compareCanonicalPaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    runId: undefined,
    stagingRoot: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--run-id") {
      args.runId = argv[++index];
    } else if (arg === "--staging-root") {
      args.stagingRoot = argv[++index];
    } else {
      throw new Error("Unknown command-line argument; value redacted.");
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await prepareVercelStaging(args);

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const action = summary.dryRun ? "Dry-run Vercel staging audit passed" : "Prepared Vercel staging package";
  console.log(action);
  console.log(`Candidate SHA: ${summary.candidateSha}`);
  console.log(`Source tree: ${summary.sourceTreeObject}`);
  console.log(`Source manifest root: ${summary.sourceManifestRoot}`);
  console.log(`Manifest SHA-256: ${summary.manifestSha256}`);
  console.log(`Staging directory: ${summary.stagingDir}`);
  console.log(`Files: ${summary.fileCount}`);
  console.log(`Size: ${formatBytes(summary.totalBytes)}`);
  console.log(`Forbidden paths: ${summary.forbiddenPathCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Vercel staging failed; details redacted.");
    process.exitCode = 1;
  });
}
