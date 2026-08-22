#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER,
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  assertNoQaOnlyInstrumentationSync
} from "./assert-no-qa-only-instrumentation.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_STAGING_ROOT = path.join(REPO_ROOT, ".tmp", "vercel-staging");
const STARSHIP_ROOT = path.resolve("/Volumes/Starship");
const MAINLAND_PEP_QUESTION_ASSETS_SOURCE = "lib/mainlandPepQuestionAssets.ts";

const REQUIRED_ROOT_FILES = [
  ".vercelignore",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "public/robots.txt",
  // `npm run build` = next-clean-build.mjs; these guard/build helpers are read at build time.
  "scripts/assert-no-qa-only-instrumentation.mjs",
  "scripts/california-qa-only-instrumentation-contract.mjs",
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
// snapshots. Only these five files are referenced by live game runtime code
// (Mighty Tank Battle, Math Virus Blaster, Math Match Quest) and already serve
// production; each is validated and shipped explicitly. public/auth and
// public/forum-assets were removed by 7de8503d6d and are no longer referenced,
// so they are dropped from the required set.
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
  "default accounts.md",
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
]);
const QA_ONLY_MARKER_BASENAMES = new Set([
  CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER,
  CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER
]);

export async function prepareVercelStaging(options = {}) {
  assertNoQaOnlyInstrumentationSync({
    env: process.env,
    mode: "release",
    root: REPO_ROOT
  });
  const runId = sanitizePathSegment(options.runId ?? process.env.VERCEL_STAGING_RUN_ID ?? timestampRunId());
  const stagingRoot = path.resolve(options.stagingRoot ?? process.env.VERCEL_STAGING_ROOT ?? DEFAULT_STAGING_ROOT);
  await assertSafeStagingRoot(stagingRoot);
  const stagingDir = resolveSafeStagingDir(stagingRoot, runId);
  const dryRun = Boolean(options.dryRun);

  const sourceSnapshot = await collectDeployableFiles();
  assertMainlandPepQuestionIllustrationsAreNotDeployableFromSnapshot(sourceSnapshot);
  const plannedFiles = sourceSnapshot.files;
  await assertDeployableSourceSnapshotStable(sourceSnapshot);
  // Recheck after the asynchronous inventory so a source mutation cannot turn
  // an earlier clean inspection into a deployable QA-instrumented package.
  assertNoQaOnlyInstrumentationSync({
    env: process.env,
    mode: "release",
    root: REPO_ROOT
  });
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

  if (!dryRun) {
    await fs.mkdir(stagingRoot, { recursive: true });
    await assertSafeStagingRoot(stagingRoot);
    const existingTarget = await assertSafeStagingTarget(
      stagingRoot,
      stagingDir,
      { requireOwnedExisting: true }
    );
    if (existingTarget) await assertDirectoryRecordStable(existingTarget);
    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.mkdir(stagingDir, { recursive: true });
    await assertSafeStagingTarget(stagingRoot, stagingDir, { mustExist: true });
    for (const file of plannedFiles) {
      const destination = path.join(stagingDir, file.relativePath);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await assertExactDirectoryPath(stagingDir, path.dirname(destination), "Vercel staging destination directory");
      await assertCapturedFileStable(file, `deploy input ${file.relativePath}`);
      await fs.copyFile(file.absolutePath, destination, fsConstants.COPYFILE_EXCL);
      await assertCapturedFileStable(file, `deploy input ${file.relativePath}`);
      await assertCopiedDestination(file, destination, stagingDir);
    }
    // Validate both ends after the copies. The destination scan catches a
    // source race during copy; the source scan catches a marker published
    // concurrently after the pre-copy inspection. Neither result is accepted.
    assertNoQaOnlyInstrumentationSync({
      env: process.env,
      mode: "release",
      root: REPO_ROOT
    });
    assertNoQaOnlyInstrumentationSync({
      env: {},
      mode: "release",
      root: stagingDir
    });
    await assertDeployableSourceSnapshotStable(sourceSnapshot);
    await assertExactStagedInventory(stagingDir, plannedFiles);
  }

  const summary = {
    stagingDir,
    dryRun,
    fileCount: plannedFiles.length,
    totalBytes: plannedFiles.reduce((total, file) => total + file.size, 0),
    forbiddenPathCount: forbiddenFiles.length,
    excludedPolicy: {
      dataEase: true,
      publicQuestionIllustrations: true,
      localSecretsAndGeneratedOutputs: true
    }
  };

  if (!dryRun) {
    const manifestPath = path.join(stagingDir, "vercel-staging-manifest.json");
    await writeExclusiveDurableJson(
      manifestPath,
      {
        ...summary,
        createdAt: new Date().toISOString(),
        files: plannedFiles.map((file) => ({
          path: file.relativePath,
          bytes: file.size,
          sha256: file.sha256
        }))
      }
    );
    const manifestFile = {
      ...(await captureRegularFile(
        manifestPath,
        "Vercel staging manifest",
        stagingDir
      )),
      relativePath: "vercel-staging-manifest.json"
    };
    await assertDeployableSourceSnapshotStable(sourceSnapshot);
    await assertExactStagedInventory(stagingDir, [...plannedFiles, manifestFile]);
  }

  return summary;
}

async function collectDeployableFiles() {
  const files = [];
  const directories = [];
  const rootIdentity = await captureDirectoryIdentity(REPO_ROOT, "repository root");

  for (const rootFile of [...REQUIRED_ROOT_FILES, ...REQUIRED_GAME_ASSET_FILES]) {
    const absolutePath = path.join(REPO_ROOT, rootFile);
    await assertReadablePath(absolutePath, rootFile);
    files.push(await captureDeployableFile(absolutePath, toPosix(rootFile)));
  }

  for (const directory of REQUIRED_DIRECTORIES) {
    const absoluteDirectory = path.join(REPO_ROOT, directory);
    await assertReadablePath(absoluteDirectory, directory);
    await walkDirectory(absoluteDirectory, directories, async (absolutePath) => {
      const relativePath = toRepoRelativePath(absolutePath);
      if (isForbiddenDeployPath(relativePath)) return;
      files.push(await captureDeployableFile(absolutePath, relativePath));
    });
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const paths = files.map((file) => file.relativePath);
  if (new Set(paths).size !== paths.length) {
    throw new Error("Deployable source inventory contains duplicate relative paths.");
  }
  const snapshot = { directories, files, rootIdentity };
  await assertDeployableSourceSnapshotStable(snapshot);
  return snapshot;
}

async function walkDirectory(directory, directories, onFile) {
  const directoryRecord = await captureDirectoryIdentity(
    directory,
    `deploy source directory ${toRepoRelativePath(directory)}`
  );
  directories.push(directoryRecord);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRepoRelativePath(absolutePath);
    const identity = await fs.lstat(absolutePath, { bigint: true });
    if (identity.isSymbolicLink()) {
      throw new Error(`Deploy source must not contain a symlink: ${relativePath}`);
    }
    if (!identity.isDirectory() && !identity.isFile()) {
      throw new Error(`Deploy source contains a special filesystem entry: ${relativePath}`);
    }
    assertNoQaOnlyMarkerBasenameInDeployPath(relativePath);
    if (isForbiddenDeployPath(relativePath)) continue;

    if (identity.isDirectory()) {
      await walkDirectory(absolutePath, directories, onFile);
      continue;
    }

    await onFile(absolutePath);
  }
  await assertDirectoryRecordStable(directoryRecord);
}

function sameExactIdentity(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function assertRegularIdentity(identity, label) {
  if (identity.isSymbolicLink() || !identity.isFile() || identity.nlink !== 1n) {
    throw new Error(`${label} must be one regular non-symlink, non-hardlinked file.`);
  }
  if ((identity.mode & 0o444n) === 0n) throw new Error(`${label} is unreadable.`);
}

async function hashOpenFile(handle, expectedSize, label, options = {}) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const chunks = options.captureContent ? [] : null;
  let position = 0;
  while (position < expectedSize) {
    const length = Math.min(buffer.length, expectedSize - position);
    const { bytesRead } = await handle.read(buffer, 0, length, position);
    if (bytesRead === 0) break;
    const bytes = buffer.subarray(0, bytesRead);
    hash.update(bytes);
    if (chunks) chunks.push(Buffer.from(bytes));
    position += bytesRead;
  }
  if (position !== expectedSize) {
    throw new Error(`${label} changed size or ended while it was being hashed.`);
  }
  return {
    content: chunks ? Buffer.concat(chunks, expectedSize) : undefined,
    sha256: hash.digest("hex")
  };
}

async function captureRegularFile(absolutePath, label, containmentRoot, options = {}) {
  const resolved = path.resolve(absolutePath);
  if (!isInside(resolved, containmentRoot) || resolved === containmentRoot) {
    throw new Error(`${label} escapes its allowed root: ${resolved}`);
  }
  const before = await fs.lstat(resolved, { bigint: true });
  assertRegularIdentity(before, label);
  const canonical = await fs.realpath(resolved);
  if (canonical !== resolved) throw new Error(`${label} must not traverse a symlink: ${resolved}`);
  const handle = await fs.open(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat({ bigint: true });
    if (!sameExactIdentity(before, opened)) {
      throw new Error(`${label} changed before it could be opened safely.`);
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size)) throw new Error(`${label} is too large to inventory safely.`);
    const { content, sha256 } = await hashOpenFile(handle, size, label, options);
    const afterRead = await handle.stat({ bigint: true });
    const afterPath = await fs.lstat(resolved, { bigint: true });
    if (!sameExactIdentity(opened, afterRead) || !sameExactIdentity(afterRead, afterPath)) {
      throw new Error(`${label} changed while it was being inventoried.`);
    }
    return { absolutePath: resolved, content, identity: afterPath, sha256, size };
  } finally {
    await handle.close();
  }
}

async function captureDeployableFile(absolutePath, relativePath) {
  const captured = await captureRegularFile(
    absolutePath,
    `deploy source ${relativePath}`,
    REPO_ROOT,
    { captureContent: relativePath === MAINLAND_PEP_QUESTION_ASSETS_SOURCE }
  );
  return { ...captured, relativePath };
}

async function captureDirectoryIdentity(absolutePath, label, containmentRoot = REPO_ROOT) {
  const resolved = path.resolve(absolutePath);
  if (!isInside(resolved, containmentRoot)) {
    throw new Error(`${label} escapes its allowed root: ${resolved}`);
  }
  const identity = await fs.lstat(resolved, { bigint: true });
  if (identity.isSymbolicLink() || !identity.isDirectory()) {
    throw new Error(`${label} must be one regular non-symlink directory.`);
  }
  if ((identity.mode & 0o555n) === 0n) throw new Error(`${label} is unreadable.`);
  const canonical = await fs.realpath(resolved);
  if (canonical !== resolved) throw new Error(`${label} must not traverse a symlink: ${resolved}`);
  return { absolutePath: resolved, identity, label };
}

async function assertDirectoryRecordStable(record) {
  const current = await fs.lstat(record.absolutePath, { bigint: true });
  if (!sameExactIdentity(record.identity, current)) {
    throw new Error(`${record.label} changed while the deploy closure was being captured.`);
  }
  const canonical = await fs.realpath(record.absolutePath);
  if (canonical !== record.absolutePath) {
    throw new Error(`${record.label} began traversing a symlink.`);
  }
}

async function assertCapturedFileStable(file, label) {
  const current = await fs.lstat(file.absolutePath, { bigint: true });
  assertRegularIdentity(current, label);
  if (!sameExactIdentity(file.identity, current)) {
    throw new Error(`${label} changed after the deploy closure was captured.`);
  }
  const canonical = await fs.realpath(file.absolutePath);
  if (canonical !== file.absolutePath) throw new Error(`${label} began traversing a symlink.`);
}

async function assertDeployableSourceSnapshotStable(snapshot) {
  await assertDirectoryRecordStable(snapshot.rootIdentity);
  for (const directory of snapshot.directories) await assertDirectoryRecordStable(directory);
  for (const file of snapshot.files) {
    await assertCapturedFileStable(file, `deploy input ${file.relativePath}`);
  }
  // File checks can take long enough for an earlier directory to gain or lose
  // an entry. Re-fence the directory closure after all file identities too.
  for (const directory of snapshot.directories) await assertDirectoryRecordStable(directory);
  await assertDirectoryRecordStable(snapshot.rootIdentity);
}

async function assertCopiedDestination(file, destination, stagingRoot, relativePath = file.relativePath) {
  const captured = await captureRegularFile(
    destination,
    `staged deploy file ${relativePath}`,
    stagingRoot
  );
  if (captured.size !== file.size || captured.sha256 !== file.sha256) {
    throw new Error(`Staged deploy bytes differ from captured source: ${relativePath}`);
  }
  return { ...captured, relativePath };
}

export async function assertExactStagedInventory(stagingRoot, plannedFiles) {
  const actualFiles = [];
  const actualDirectories = [];
  const directoryRecords = [];
  const visit = async (directory) => {
    const directoryRecord = await captureDirectoryIdentity(
      directory,
      `staged deploy directory ${toPosix(path.relative(stagingRoot, directory)) || "."}`,
      stagingRoot
    );
    directoryRecords.push(directoryRecord);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const target = path.join(directory, entry.name);
      const relativePath = toPosix(path.relative(stagingRoot, target));
      const identity = await fs.lstat(target, { bigint: true });
      if (identity.isSymbolicLink()) throw new Error(`Staging inventory contains a symlink: ${relativePath}`);
      if (identity.isDirectory()) {
        actualDirectories.push(relativePath);
        await visit(target);
      } else if (identity.isFile()) {
        assertRegularIdentity(identity, `staged deploy file ${relativePath}`);
        actualFiles.push(relativePath);
      } else {
        throw new Error(`Staging inventory contains a special entry: ${relativePath}`);
      }
    }
    await assertDirectoryRecordStable(directoryRecord);
  };
  await visit(stagingRoot);
  const expectedFiles = plannedFiles.map((file) => file.relativePath).sort();
  const expectedDirectories = [...new Set(plannedFiles.flatMap((file) => {
    const segments = file.relativePath.split("/").slice(0, -1);
    return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
  }))].sort();
  if (JSON.stringify(actualFiles.sort()) !== JSON.stringify(expectedFiles)) {
    throw new Error("Staging file inventory differs from the captured deploy closure.");
  }
  if (JSON.stringify(actualDirectories.sort()) !== JSON.stringify(expectedDirectories)) {
    throw new Error("Staging directory inventory differs from the captured deploy closure.");
  }
  const capturedDestinations = [];
  for (const file of plannedFiles) {
    const relativePath = file.relativePath;
    capturedDestinations.push(await assertCopiedDestination(
      file,
      path.join(stagingRoot, relativePath),
      stagingRoot,
      relativePath
    ));
  }
  for (const directory of directoryRecords) await assertDirectoryRecordStable(directory);
  for (const file of capturedDestinations) {
    await assertCapturedFileStable(file, `staged deploy file ${file.relativePath}`);
  }
  for (const directory of directoryRecords) await assertDirectoryRecordStable(directory);
}

async function writeExclusiveDurableJson(target, value) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  const handle = await fs.open(target, "wx", 0o600);
  try {
    await handle.writeFile(bytes, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  const reread = await fs.readFile(target, "utf8");
  if (reread !== bytes) throw new Error(`Staging manifest changed after publication: ${target}`);
  const directory = await fs.open(path.dirname(target), fsConstants.O_RDONLY);
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

function isForbiddenDeployPath(relativePath) {
  const normalizedPath = toPosix(relativePath).replace(/^\/+/, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  const basename = segments.at(-1) ?? "";

  if (FORBIDDEN_BASENAMES.has(basename)) return true;
  if (basename.startsWith(".env")) return true;
  if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(basename)) return true;

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

export function assertNoQaOnlyMarkerBasenameInDeployPath(relativePath) {
  const basename = path.posix.basename(toPosix(relativePath));
  if (QA_ONLY_MARKER_BASENAMES.has(basename)) {
    throw new Error(`Deploy source contains a forbidden QA-only marker basename: ${relativePath}`);
  }
}

function isInside(absolutePath, root) {
  const relative = path.relative(root, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function assertSafeStagingRoot(stagingRoot) {
  assertSafeStagingRootLocation(
    stagingRoot,
    process.env.MAIS_ALLOW_EXTERNAL_VERCEL_STAGING === "1"
  );
  await assertExistingPathSegmentsHaveNoSymlink(stagingRoot, "Vercel staging root");
}

export function assertSafeStagingRootLocation(stagingRootInput, allowExternal = false) {
  const stagingRoot = path.resolve(stagingRootInput);
  const broadRoots = new Set([
    path.parse(stagingRoot).root,
    "/Volumes",
    "/Volumes/Starship",
    REPO_ROOT,
    path.join(REPO_ROOT, ".tmp")
  ].map((entry) => path.resolve(entry)));
  if (broadRoots.has(stagingRoot)) {
    throw new Error(`Refusing to use a broad filesystem/workspace path as Vercel staging root: ${stagingRoot}`);
  }
  if (isInside(stagingRoot, DEFAULT_STAGING_ROOT)) return stagingRoot;
  if (!allowExternal) {
    throw new Error(
      [
        "Refusing to prepare Vercel staging outside .tmp/vercel-staging.",
        `Requested staging root: ${stagingRoot}`,
        "Set MAIS_ALLOW_EXTERNAL_VERCEL_STAGING=1 only for an owner-approved exception."
      ].join("\n")
    );
  }
  const starshipRelative = path.relative(STARSHIP_ROOT, stagingRoot);
  if (!starshipRelative || starshipRelative.startsWith("..") || path.isAbsolute(starshipRelative)) {
    throw new Error(
      `Owner-approved external Vercel staging roots must remain under ${STARSHIP_ROOT}: ${stagingRoot}`
    );
  }
  if (!/staging/i.test(path.basename(stagingRoot))) {
    throw new Error(
      `Owner-approved external Vercel staging root must be a dedicated staging-named directory: ${stagingRoot}`
    );
  }
  if (isInside(stagingRoot, REPO_ROOT) || isInside(REPO_ROOT, stagingRoot)) {
    throw new Error(
      `Owner-approved external Vercel staging root must be disjoint from the repository: ${stagingRoot}`
    );
  }
  return stagingRoot;
}

export function resolveSafeStagingDir(stagingRootInput, runIdInput) {
  const stagingRoot = path.resolve(stagingRootInput);
  const runId = sanitizePathSegment(runIdInput);
  const stagingDir = path.resolve(stagingRoot, runId);
  const relative = path.relative(stagingRoot, stagingDir);
  if (
    relative !== runId ||
    path.dirname(relative) !== "." ||
    relative === "." ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Vercel staging directory must be one strict child of its staging root: ${stagingDir}`);
  }
  if (!isInside(stagingDir, DEFAULT_STAGING_ROOT) &&
      (isInside(stagingDir, REPO_ROOT) || isInside(REPO_ROOT, stagingDir))) {
    throw new Error(`Vercel staging directory must not overlap the repository: ${stagingDir}`);
  }
  return stagingDir;
}

async function assertExistingPathSegmentsHaveNoSymlink(target, label) {
  let cursor = path.resolve(target);
  while (true) {
    const identity = await fs.lstat(cursor, { bigint: true }).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (identity) {
      if (identity.isSymbolicLink() || !identity.isDirectory()) {
        throw new Error(`${label} must not traverse a symlink or non-directory: ${cursor}`);
      }
      const canonical = await fs.realpath(cursor);
      if (canonical !== cursor) throw new Error(`${label} must not traverse a symlink: ${cursor}`);
      return;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error(`${label} has no existing filesystem ancestor.`);
    cursor = parent;
  }
}

export async function assertSafeStagingTarget(stagingRoot, stagingDir, options = {}) {
  if (resolveSafeStagingDir(stagingRoot, path.basename(stagingDir)) !== stagingDir) {
    throw new Error(`Refusing unsafe Vercel staging target: ${stagingDir}`);
  }
  await assertExistingPathSegmentsHaveNoSymlink(stagingRoot, "Vercel staging root");
  const identity = await fs.lstat(stagingDir, { bigint: true }).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!identity) {
    if (options.mustExist) throw new Error(`Vercel staging target was not created: ${stagingDir}`);
    return null;
  }
  if (identity.isSymbolicLink() || !identity.isDirectory()) {
    throw new Error(`Vercel staging target must be one regular non-symlink directory: ${stagingDir}`);
  }
  const canonical = await fs.realpath(stagingDir);
  if (canonical !== stagingDir) throw new Error(`Vercel staging target traverses a symlink: ${stagingDir}`);
  const targetRecord = {
    absolutePath: stagingDir,
    identity,
    label: "Vercel staging target"
  };
  if (options.requireOwnedExisting) {
    const manifestPath = path.join(stagingDir, "vercel-staging-manifest.json");
    let manifestFile;
    try {
      manifestFile = await captureRegularFile(
        manifestPath,
        "Vercel staging ownership manifest",
        stagingDir,
        { captureContent: true }
      );
    } catch {
      throw new Error(
        `Refusing to recursively replace an unowned Vercel staging target: ${stagingDir}`
      );
    }
    let manifest;
    try {
      manifest = JSON.parse(manifestFile.content.toString("utf8"));
    } catch {
      throw new Error(
        `Refusing to recursively replace a staging target with an invalid ownership manifest: ${stagingDir}`
      );
    }
    if (manifest?.stagingDir !== stagingDir || manifest?.dryRun !== false ||
        manifest?.forbiddenPathCount !== 0) {
      throw new Error(
        `Refusing to recursively replace a staging target not owned by this exact path: ${stagingDir}`
      );
    }
    await assertCapturedFileStable(manifestFile, "Vercel staging ownership manifest");
  }
  await assertDirectoryRecordStable(targetRecord);
  return targetRecord;
}

async function assertExactDirectoryPath(root, target, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!isInside(resolvedTarget, resolvedRoot)) {
    throw new Error(`${label} escapes its staging root: ${resolvedTarget}`);
  }
  let cursor = resolvedRoot;
  const relative = path.relative(resolvedRoot, resolvedTarget);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const identity = await fs.lstat(cursor, { bigint: true });
    if (identity.isSymbolicLink() || !identity.isDirectory()) {
      throw new Error(`${label} must not traverse a symlink or non-directory: ${cursor}`);
    }
  }
  const canonical = await fs.realpath(resolvedTarget);
  if (canonical !== resolvedTarget) throw new Error(`${label} must not traverse a symlink: ${resolvedTarget}`);
}

export function assertMainlandPepQuestionIllustrationsAreNotDeployableFromSnapshot(snapshot) {
  const sourceFile = snapshot?.files?.find(
    (file) => file.relativePath === MAINLAND_PEP_QUESTION_ASSETS_SOURCE
  );
  if (!sourceFile || !Buffer.isBuffer(sourceFile.content)) {
    throw new Error(
      `Captured deploy closure is missing exact bytes for ${MAINLAND_PEP_QUESTION_ASSETS_SOURCE}.`
    );
  }
  if (
    sourceFile.content.byteLength !== sourceFile.size ||
    createHash("sha256").update(sourceFile.content).digest("hex") !== sourceFile.sha256
  ) {
    throw new Error(
      `Captured deploy bytes do not match the recorded identity for ${MAINLAND_PEP_QUESTION_ASSETS_SOURCE}.`
    );
  }

  const source = sourceFile.content.toString("utf8");
  const declarationName = "mainlandPepQuestionIllustrationApprovals";
  const declarationCount = [
    ...source.matchAll(
      new RegExp(`^[ \\t]*export\\s+const\\s+${declarationName}\\b`, "gm")
    )
  ].length;
  const approvalsAreEmpty = declarationCount === 1 && new RegExp(
    `^[ \\t]*export\\s+const\\s+${declarationName}` +
      `(?:\\s*:\\s*[^=\\r\\n]+)?\\s*=\\s*\\[\\s*\\]\\s*;`,
    "m"
  ).test(source);

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
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function sanitizePathSegment(value) {
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Run id must be one non-dot path segment.");
  }
  if (sanitized.length > 128) throw new Error("Run id exceeds 128 characters.");
  return sanitized;
}

function toRepoRelativePath(absolutePath) {
  return toPosix(path.relative(REPO_ROOT, absolutePath));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
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
      throw new Error(`Unknown argument: ${arg}`);
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
  console.log(`Staging directory: ${summary.stagingDir}`);
  console.log(`Files: ${summary.fileCount}`);
  console.log(`Size: ${formatBytes(summary.totalBytes)}`);
  console.log(`Forbidden paths: ${summary.forbiddenPathCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
