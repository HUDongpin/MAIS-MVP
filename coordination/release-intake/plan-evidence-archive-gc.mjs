#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER_NAME,
  TRANSACTION_METADATA_PATHS,
  assertEvidenceRootLayout,
  assertEvidenceRootMarker,
  fingerprint,
  gitText,
  repositoryIdentity,
  resolveEvidenceRoot,
  stableJson,
  verifyArchiveCompanionManifestSchema,
  verifyArchiveSetSchema
} from "./evidence-archive-lib.mjs";

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const JSON_MAX_BYTES = 32 * 1024 * 1024;
const MANIFEST_BASENAMES = Object.freeze({
  linked: "2026-06-30-A25-linked-worktree-archive-manifest.json",
  clean: "2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  dirty: "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json"
});
const REPORT_LOCK_PATTERN = /^\.evidence-report-owner-[0-9a-f]{64}\.lock$/u;
const BLOB_TEMP_PATTERN = /^([0-9a-f]{64})\.tmp-([1-9][0-9]*)-([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu;

function modeBits(stat) {
  return stat.mode & 0o777;
}

function inodeKey(stat) {
  return `${stat.dev}:${stat.ino}`;
}

function statProjection(stat) {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: modeBits(stat),
    nlink: stat.nlink,
    size: stat.size,
    blocks: stat.blocks,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs
  };
}

function sameFileState(left, right) {
  return stableJson(statProjection(left)) === stableJson(statProjection(right));
}

function assertPrivateDirectory(directory, label) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new Error(`${label} is missing`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must be a direct directory`);
  if (modeBits(stat) !== 0o700) throw new Error(`${label} mode must be 0700`);
  return stat;
}

function readStrictFile(filename, label, { maxBytes = JSON_MAX_BYTES, allowedModes = [0o600] } = {}) {
  const pathStat = fs.lstatSync(filename);
  if (pathStat.isSymbolicLink() || !pathStat.isFile()) throw new Error(`${label} must be a direct regular file`);
  if (!allowedModes.includes(modeBits(pathStat))) {
    throw new Error(`${label} mode must be one of ${allowedModes.map((mode) => mode.toString(8).padStart(4, "0")).join(", ")}`);
  }
  if (pathStat.size > maxBytes) throw new Error(`${label} exceeds the read limit`);
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) throw new Error(`${label} requires O_NOFOLLOW support`);
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(descriptor);
    if (!sameFileState(pathStat, before)) throw new Error(`${label} changed before inspection`);
    const buffer = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const finalPathStat = fs.lstatSync(filename);
    if (!sameFileState(before, after) || !sameFileState(after, finalPathStat) || buffer.length !== after.size) {
      throw new Error(`${label} changed during inspection`);
    }
    return { buffer, stat: after };
  } finally {
    fs.closeSync(descriptor);
  }
}

function readStrictJson(filename, label, options) {
  const opened = readStrictFile(filename, label, options);
  let value;
  try {
    value = JSON.parse(opened.buffer.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} JSON is invalid (${error.message})`);
  }
  return { ...opened, value };
}

function binding(filename, opened, sourceRoot, prefix) {
  const relative = path.relative(sourceRoot, filename).split(path.sep).join("/");
  return {
    path: `${prefix}/${relative}`,
    sha256: fingerprint(opened.buffer),
    ...statProjection(opened.stat)
  };
}

function collectArchiveSetReferences(value, source, references, seen = new Set()) {
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) throw new Error(`${source}: cyclic JSON value is invalid`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectArchiveSetReferences(item, source, references, seen);
  } else {
    for (const [key, item] of Object.entries(value)) {
      if (key === "archiveSetFingerprint") {
        if (item === null) continue;
        if (typeof item !== "string" || !SHA256_PATTERN.test(item)) {
          throw new Error(`${source}: archiveSetFingerprint is invalid`);
        }
        references.push({ source, archiveSetFingerprint: item });
      }
      collectArchiveSetReferences(item, source, references, seen);
    }
  }
  seen.delete(value);
}

function publicationSnapshot(publicationDirectory) {
  assertPrivateDirectory(publicationDirectory, "manifest publication directory");
  const directoryEntries = fs.readdirSync(publicationDirectory).sort();
  const activeTransactions = directoryEntries.filter((name) => name.startsWith(".evidence-publish-"));
  if (activeTransactions.length > 0) {
    throw new Error(`manifest publication transaction is present: ${activeTransactions.join(", ")}`);
  }
  const sourceBindings = [];
  const manifests = {};
  for (const relativePath of TRANSACTION_METADATA_PATHS) {
    const basename = path.basename(relativePath);
    const filename = path.join(publicationDirectory, basename);
    const opened = basename.endsWith(".json")
      ? readStrictJson(filename, `published manifest ${basename}`, { allowedModes: [0o600, 0o644] })
      : readStrictFile(filename, `published manifest ${basename}`, { allowedModes: [0o600, 0o644] });
    sourceBindings.push(binding(filename, opened, publicationDirectory, "publication"));
    if (basename.endsWith(".json")) {
      const kind = Object.entries(MANIFEST_BASENAMES).find(([, candidate]) => candidate === basename)?.[0];
      if (!kind) throw new Error(`unknown canonical JSON manifest: ${basename}`);
      manifests[kind] = opened.value;
    }
  }
  const newFields = ["schemaVersion", "evidenceRootId", "archiveSetFingerprint"];
  const manifestModes = Object.values(manifests).map((manifest) => newFields.some((key) => key in manifest));
  if (manifestModes.some(Boolean) && !manifestModes.every(Boolean)) {
    throw new Error("published manifests mix legacy and archive-set schemas");
  }
  return {
    directoryEntries,
    manifests,
    schemaKind: manifestModes.every(Boolean) ? "archive-set" : "legacy",
    sourceBindings
  };
}

function reportsSnapshot(evidenceRoot) {
  const reportsDirectory = path.join(evidenceRoot, "reports");
  assertPrivateDirectory(reportsDirectory, "evidence reports directory");
  const references = [];
  const sourceBindings = [];
  const entries = fs.readdirSync(reportsDirectory).sort();
  for (const name of entries) {
    const filename = path.join(reportsDirectory, name);
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`evidence report entry is unsafe: ${name}`);
    if (name.includes(".recovery-") || name.includes(".tmp-") || name.includes(".backup-")) {
      throw new Error(`evidence report recovery or transaction artifact is present: ${name}`);
    }
    if (REPORT_LOCK_PATTERN.test(name)) {
      if (modeBits(stat) !== 0o600 || stat.nlink !== 1) throw new Error(`evidence report lock is unsafe: ${name}`);
      continue;
    }
    if (!name.endsWith(".json")) throw new Error(`unexpected evidence report entry: ${name}`);
    const opened = readStrictJson(filename, `evidence report ${name}`);
    sourceBindings.push(binding(filename, opened, evidenceRoot, "evidence"));
    collectArchiveSetReferences(opened.value, `reports/${name}`, references);
  }
  return { entries, references, sourceBindings };
}

function walkSetFiles(directory, relativeRoot = "") {
  assertPrivateDirectory(directory, `archive set directory ${relativeRoot || path.basename(directory)}`);
  const files = [];
  for (const name of fs.readdirSync(directory).sort()) {
    const filename = path.join(directory, name);
    const relativePath = relativeRoot ? `${relativeRoot}/${name}` : name;
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink()) throw new Error(`archive set contains a symlink: ${relativePath}`);
    if (stat.isDirectory()) files.push(...walkSetFiles(filename, relativePath));
    else if (stat.isFile()) {
      if (modeBits(stat) !== 0o600) throw new Error(`archive set file mode must be 0600: ${relativePath}`);
      files.push({ filename, relativePath, stat });
    } else {
      throw new Error(`archive set contains a non-regular entry: ${relativePath}`);
    }
  }
  return files;
}

function syntheticManifest(index) {
  return {
    schemaVersion: index.schemaVersion,
    generatedAt: "1970-01-01T00:00:00.000Z",
    evidenceRootId: index.evidenceRootId,
    archiveSetFingerprint: index.archiveSetFingerprint,
    dirtyMapStatusSignature: index.basis?.dirtyMapStatusSignature,
    expandedStatusEntries: index.basis?.expandedStatusEntries,
    archivedWorktrees: index.entries
  };
}

function setsSnapshot(evidenceRoot, marker) {
  const setsDirectory = path.join(evidenceRoot, "sets");
  assertPrivateDirectory(setsDirectory, "evidence sets directory");
  const sourceBindings = [];
  const sets = new Map();
  const artifactLinks = [];
  const entries = fs.readdirSync(setsDirectory).sort();
  for (const name of entries) {
    if (!SHA256_PATTERN.test(name)) {
      const kind = name.includes(".tmp-") ? "temporary" : "unexpected";
      throw new Error(`${kind} archive set entry is present: ${name}`);
    }
    const setDirectory = path.join(setsDirectory, name);
    const files = walkSetFiles(setDirectory);
    const byRelativePath = new Map(files.map((file) => [file.relativePath, file]));
    const indexFile = byRelativePath.get("archive-set.json");
    if (!indexFile) throw new Error(`${name}: archive-set.json is missing`);
    const opened = readStrictJson(indexFile.filename, `${name}: archive-set index`);
    const index = opened.value;
    const failures = [];
    verifyArchiveSetSchema(syntheticManifest(index), index, failures);
    if (index.archiveSetFingerprint !== name) failures.push("archive-set index fingerprint does not match its directory");
    if (index.evidenceRootId !== marker.rootId) failures.push("archive-set index evidence root ID does not match the marker");
    if (failures.length > 0) throw new Error(`${name}: ${failures.join("; ")}`);
    const expected = new Set(["archive-set.json"]);
    for (const entry of index.entries) {
      for (const artifact of Object.values(entry.artifacts).filter(Boolean)) {
        const prefix = `sets/${name}/`;
        if (!artifact.path.startsWith(prefix)) throw new Error(`${name}: artifact path escapes its set`);
        const relativePath = artifact.path.slice(prefix.length);
        expected.add(relativePath);
        const file = byRelativePath.get(relativePath);
        if (!file) throw new Error(`${name}: archive set artifact is missing: ${relativePath}`);
        if (file.stat.size !== artifact.bytes) throw new Error(`${name}: archive set artifact size mismatch: ${relativePath}`);
        artifactLinks.push({
          archiveSetFingerprint: name,
          path: artifact.path,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
          stat: file.stat
        });
      }
    }
    const actual = [...byRelativePath.keys()].sort();
    const expectedList = [...expected].sort();
    if (stableJson(actual) !== stableJson(expectedList)) throw new Error(`${name}: archive set file inventory is not exact`);
    if (indexFile.stat.nlink !== 1) throw new Error(`${name}: archive-set index has unmanaged hardlinks`);
    sourceBindings.push(binding(indexFile.filename, opened, evidenceRoot, "evidence"));
    sets.set(name, {
      archiveSetFingerprint: name,
      index,
      indexBytes: indexFile.stat.size,
      indexAllocatedBytes: indexFile.stat.blocks * 512,
      indexStat: statProjection(indexFile.stat),
      artifactLinks: artifactLinks.filter((link) => link.archiveSetFingerprint === name).length
    });
  }
  return { artifactLinks, entries, sets, sourceBindings };
}

function blobsSnapshot(evidenceRoot) {
  const blobsDirectory = path.join(evidenceRoot, "blobs");
  assertPrivateDirectory(blobsDirectory, "evidence blobs directory");
  const blobNamespaces = fs.readdirSync(blobsDirectory).sort();
  if (stableJson(blobNamespaces) !== stableJson(["sha256"])) throw new Error("evidence blob namespace inventory is invalid");
  const shaDirectory = path.join(blobsDirectory, "sha256");
  assertPrivateDirectory(shaDirectory, "sha256 blob directory");
  const prefixEntries = fs.readdirSync(shaDirectory).sort();
  const blobs = new Map();
  const observation = [];
  const temporaryFiles = [];
  for (const prefix of prefixEntries) {
    if (!/^[0-9a-f]{2}$/u.test(prefix)) throw new Error(`unexpected blob prefix directory: ${prefix}`);
    const prefixDirectory = path.join(shaDirectory, prefix);
    assertPrivateDirectory(prefixDirectory, `blob prefix directory ${prefix}`);
    for (const name of fs.readdirSync(prefixDirectory).sort()) {
      const temporaryMatch = name.match(BLOB_TEMP_PATTERN);
      if (temporaryMatch && temporaryMatch[1].startsWith(prefix)) {
        const filename = path.join(prefixDirectory, name);
        const stat = fs.lstatSync(filename);
        if (stat.isSymbolicLink() || !stat.isFile() || modeBits(stat) !== 0o600 || stat.nlink !== 1) {
          throw new Error(`temporary content-addressed blob is unsafe: ${prefix}/${name}`);
        }
        if (stat.size !== 0 || stat.blocks !== 0) {
          throw new Error(`temporary content-addressed blob must remain a zero-byte file: ${prefix}/${name}`);
        }
        const relativePath = `blobs/sha256/${prefix}/${name}`;
        const row = {
          path: relativePath,
          bytes: stat.size,
          allocatedBytes: stat.blocks * 512,
          nlink: stat.nlink,
          expectedSha256: temporaryMatch[1]
        };
        temporaryFiles.push(row);
        observation.push({ path: relativePath, temporary: true, ...statProjection(stat) });
        continue;
      }
      if (!SHA256_PATTERN.test(name) || !name.startsWith(prefix)) {
        const kind = name.includes(".tmp-") ? "temporary" : "unexpected";
        throw new Error(`${kind} content-addressed blob entry is present: ${prefix}/${name}`);
      }
      const filename = path.join(prefixDirectory, name);
      const stat = fs.lstatSync(filename);
      if (stat.isSymbolicLink() || !stat.isFile() || modeBits(stat) !== 0o600) {
        throw new Error(`content-addressed blob is unsafe: ${prefix}/${name}`);
      }
      if (blobs.has(name)) throw new Error(`duplicate content-addressed blob: ${name}`);
      const relativePath = `blobs/sha256/${prefix}/${name}`;
      const row = {
        sha256: name,
        path: relativePath,
        bytes: stat.size,
        allocatedBytes: stat.blocks * 512,
        stat
      };
      blobs.set(name, row);
      observation.push({ path: relativePath, ...statProjection(stat) });
    }
  }
  temporaryFiles.sort((left, right) => left.path.localeCompare(right.path));
  return { blobs, observation, prefixEntries, temporaryFiles };
}

function validatePublishedManifests(publication, sets, marker, references) {
  if (publication.schemaKind === "legacy") return;
  const linked = publication.manifests.linked;
  const index = sets.get(linked.archiveSetFingerprint)?.index;
  const failures = [];
  if (!index) failures.push("published linked manifest references a missing archive set");
  else verifyArchiveSetSchema(linked, index, failures);
  verifyArchiveCompanionManifestSchema(publication.manifests.clean, { linked, kind: "clean" }, failures);
  verifyArchiveCompanionManifestSchema(publication.manifests.dirty, { linked, kind: "dirty" }, failures);
  if (linked.evidenceRootId !== marker.rootId) failures.push("published manifest evidence root ID does not match the marker");
  if (failures.length > 0) throw new Error(`published archive-set manifests are invalid: ${failures.join("; ")}`);
  for (const [kind, manifest] of Object.entries(publication.manifests)) {
    references.push({
      source: `publication/${MANIFEST_BASENAMES[kind]}`,
      archiveSetFingerprint: manifest.archiveSetFingerprint
    });
  }
}

function scanOnce({ evidenceRoot, publicationDirectory, repositoryId, retainSetFingerprints }) {
  const rootStat = assertPrivateDirectory(evidenceRoot, "evidence root");
  assertEvidenceRootLayout(evidenceRoot);
  const markerPath = path.join(evidenceRoot, MARKER_NAME);
  const openedMarker = readStrictJson(markerPath, "evidence root marker");
  const marker = assertEvidenceRootMarker(openedMarker.value, repositoryId === undefined ? {} : { repositoryId });
  const managedDirectories = ["blobs", "reports", "sets"].map((name) => {
    const directory = path.join(evidenceRoot, name);
    const stat = assertPrivateDirectory(directory, `evidence ${name} directory`);
    return { path: name, ...statProjection(stat) };
  });
  const publication = publicationSnapshot(publicationDirectory);
  const reports = reportsSnapshot(evidenceRoot);
  const setState = setsSnapshot(evidenceRoot, marker);
  const blobState = blobsSnapshot(evidenceRoot);
  const references = [...reports.references];
  validatePublishedManifests(publication, setState.sets, marker, references);
  for (const value of retainSetFingerprints) {
    if (typeof value !== "string" || !SHA256_PATTERN.test(value)) throw new Error(`explicit retained set fingerprint is invalid: ${value}`);
    references.push({ source: "explicit-retain", archiveSetFingerprint: value });
  }
  const retainedSetNames = [...new Set(references.map((reference) => reference.archiveSetFingerprint))].sort();
  for (const name of retainedSetNames) {
    if (!setState.sets.has(name)) throw new Error(`referenced archive set is missing: ${name}`);
  }
  const orphanSetNames = [...setState.sets.keys()].filter((name) => !retainedSetNames.includes(name)).sort();
  const artifactLinksBySha = new Map();
  for (const link of setState.artifactLinks) {
    const blob = blobState.blobs.get(link.sha256);
    if (!blob) throw new Error(`${link.path}: content-addressed blob is missing`);
    if (blob.bytes !== link.bytes || inodeKey(blob.stat) !== inodeKey(link.stat)) {
      throw new Error(`${link.path}: artifact is not the exact content-addressed blob hardlink`);
    }
    const links = artifactLinksBySha.get(link.sha256) ?? [];
    links.push(link);
    artifactLinksBySha.set(link.sha256, links);
  }
  for (const blob of blobState.blobs.values()) {
    const managedLinks = artifactLinksBySha.get(blob.sha256) ?? [];
    if (blob.stat.nlink !== managedLinks.length + 1) {
      throw new Error(`${blob.path}: blob link count reveals an unmanaged hardlink`);
    }
  }
  const candidateBlobs = [];
  const retainedBlobs = [];
  for (const blob of blobState.blobs.values()) {
    const links = artifactLinksBySha.get(blob.sha256) ?? [];
    const retained = links.some((link) => retainedSetNames.includes(link.archiveSetFingerprint));
    const target = retained ? retainedBlobs : candidateBlobs;
    target.push({
      sha256: blob.sha256,
      path: blob.path,
      bytes: blob.bytes,
      allocatedBytes: blob.allocatedBytes,
      nlink: blob.stat.nlink,
      setLinks: links.length
    });
  }
  candidateBlobs.sort((left, right) => left.path.localeCompare(right.path));
  retainedBlobs.sort((left, right) => left.path.localeCompare(right.path));
  const orphanIndexes = orphanSetNames.map((name) => setState.sets.get(name));
  const candidateTemporaryFiles = blobState.temporaryFiles;
  const reclaimableLogicalBytes = candidateBlobs.reduce((total, blob) => total + blob.bytes, 0)
    + candidateTemporaryFiles.reduce((total, file) => total + file.bytes, 0)
    + orphanIndexes.reduce((total, set) => total + set.indexBytes, 0);
  const reclaimableAllocatedBytes = candidateBlobs.reduce((total, blob) => total + blob.allocatedBytes, 0)
    + candidateTemporaryFiles.reduce((total, file) => total + file.allocatedBytes, 0)
    + orphanIndexes.reduce((total, set) => total + set.indexAllocatedBytes, 0);
  const sourceBindings = [
    binding(markerPath, openedMarker, evidenceRoot, "evidence"),
    ...publication.sourceBindings,
    ...reports.sourceBindings,
    ...setState.sourceBindings
  ].sort((left, right) => left.path.localeCompare(right.path));
  const normalizedReferences = references
    .map((reference) => ({ ...reference }))
    .sort((left, right) => `${left.archiveSetFingerprint}\0${left.source}`.localeCompare(`${right.archiveSetFingerprint}\0${right.source}`));
  const observation = {
    root: { path: ".", ...statProjection(rootStat) },
    managedDirectories,
    publicationEntries: publication.directoryEntries,
    reportEntries: reports.entries,
    setEntries: setState.entries,
    blobPrefixEntries: blobState.prefixEntries,
    blobFiles: blobState.observation,
    sourceBindings
  };
  const sourceFingerprint = fingerprint(observation);
  const planBase = {
    schemaVersion: 1,
    operation: "evidence-archive-gc-plan",
    mode: "read-only",
    safeToAuthorize: true,
    repositoryId: marker.repositoryId,
    evidenceRootId: marker.rootId,
    evidenceRoot: path.resolve(evidenceRoot),
    publicationDirectory: path.resolve(publicationDirectory),
    sourceBindings,
    references: normalizedReferences,
    retainedSets: retainedSetNames,
    orphanSets: orphanSetNames,
    candidateBlobs,
    candidateTemporaryFiles,
    retainedBlobs,
    deletePaths: {
      setDirectories: orphanSetNames.map((name) => `sets/${name}`),
      blobFiles: candidateBlobs.map((blob) => blob.path),
      temporaryFiles: candidateTemporaryFiles.map((file) => file.path)
    },
    applyPreconditions: [
      "acquire the exclusive evidence-writer lock",
      "rebuild the plan and require the exact same planFingerprint"
    ],
    summary: {
      retainedSetDirectories: retainedSetNames.length,
      orphanSetDirectories: orphanSetNames.length,
      retainedBlobFiles: retainedBlobs.length,
      candidateBlobFiles: candidateBlobs.length,
      candidateTemporaryFiles: candidateTemporaryFiles.length,
      reclaimableUniqueInodes: orphanSetNames.length + candidateBlobs.length + candidateTemporaryFiles.length,
      reclaimableLogicalBytes,
      reclaimableAllocatedBytes
    },
    sourceFingerprint
  };
  return { observation, plan: { ...planBase, planFingerprint: fingerprint(planBase) } };
}

export function buildEvidenceArchiveGcPlan({
  evidenceRoot,
  publicationDirectory,
  repositoryId,
  retainSetFingerprints = []
}) {
  if (typeof evidenceRoot !== "string" || !path.isAbsolute(evidenceRoot)) throw new Error("evidenceRoot must be absolute");
  if (typeof publicationDirectory !== "string" || !path.isAbsolute(publicationDirectory)) {
    throw new Error("publicationDirectory must be absolute");
  }
  if (!Array.isArray(retainSetFingerprints)) throw new Error("retainSetFingerprints must be an array");
  const first = scanOnce({ evidenceRoot, publicationDirectory, repositoryId, retainSetFingerprints });
  const second = scanOnce({ evidenceRoot, publicationDirectory, repositoryId, retainSetFingerprints });
  if (stableJson(first.observation) !== stableJson(second.observation)
    || first.plan.planFingerprint !== second.plan.planFingerprint) {
    throw new Error("evidence archive changed during the read-only GC planning scan");
  }
  return second.plan;
}

function parseCli(argv) {
  const options = { retainSetFingerprints: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") continue;
    if (["--apply", "--delete", "--prune"].includes(argument)) {
      throw new Error(`${argument} is forbidden: this command is read-only`);
    }
    if (["--repo-root", "--evidence-root", "--publication-directory", "--retain-set"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === "--repo-root") options.repoRoot = path.resolve(value);
      else if (argument === "--evidence-root") options.evidenceRoot = path.resolve(value);
      else if (argument === "--publication-directory") options.publicationDirectory = path.resolve(value);
      else options.retainSetFingerprints.push(value);
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function main() {
  const options = parseCli(process.argv.slice(2));
  const repoRoot = options.repoRoot ?? gitText(["rev-parse", "--show-toplevel"]);
  const commonDir = path.resolve(repoRoot, gitText(["rev-parse", "--git-common-dir"], repoRoot));
  const evidenceRoot = options.evidenceRoot ?? resolveEvidenceRoot({ repoRoot, commonDir });
  const publicationDirectory = options.publicationDirectory
    ?? path.join(repoRoot, "coordination", "release-intake", "archive");
  const plan = buildEvidenceArchiveGcPlan({
    evidenceRoot,
    publicationDirectory,
    repositoryId: repositoryIdentity(commonDir),
    retainSetFingerprints: options.retainSetFingerprints
  });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
