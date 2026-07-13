#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  EVIDENCE_SCHEMA_VERSION,
  MARKER_NAME,
  TRANSACTION_METADATA_PATHS,
  abortEvidenceReport,
  abortMutationEpochMonitor,
  assertEvidenceGateReport,
  assertEvidenceRootLayout,
  bootstrapMutationEpochMonitor,
  buildInventory,
  collectWorktreeSnapshot,
  commitEvidenceReport,
  fingerprint,
  gitBuffer,
  gitText,
  listWorktrees,
  liveSnapshotSignature,
  parseNul,
  parseStatusPorcelainZ,
  prepareEvidenceReport,
  readEvidenceRootMarker,
  readMutationEpoch,
  readMutationEpochState,
  renderArchiveManifestMarkdown,
  repositoryIdentity,
  resolveEvidenceRoot,
  settleMutationEpoch,
  settleMutationEpochState,
  sha256Buffer,
  stableJson,
  stopMutationEpochMonitor,
  verifyArchiveEntrySchema,
  verifyArchiveCompanionManifestSchema,
  verifyArchiveSetEvidence,
  verifyTarPayload
} from "./evidence-archive-lib.mjs";

const root = gitText(["rev-parse", "--show-toplevel"]);
const canonicalRoot = fs.realpathSync(root);
const commonDir = path.resolve(root, gitText(["rev-parse", "--git-common-dir"], root));
const outDir = path.join(root, "coordination", "release-intake");
const jsonOutput = process.argv.includes("--json");
const gateReportFilename = "latest-A25-linked-worktree-archive-evidence-current-gate.json";
const LEGACY_ARCHIVE_SCHEMA_VERSION = 2;
const READABLE_ARCHIVE_SCHEMA_VERSIONS = new Set([
  LEGACY_ARCHIVE_SCHEMA_VERSION,
  EVIDENCE_SCHEMA_VERSION
]);
const attestationSlots = [
  "gate-monitor-attestation-slot-a.json",
  "gate-monitor-attestation-slot-b.json"
];
const paths = {
  dirtyMap: path.join(outDir, "latest-A25-dirty-tree-map.json"),
  linked: path.join(outDir, "archive", "2026-06-30-A25-linked-worktree-archive-manifest.json"),
  linkedMarkdown: path.join(outDir, "archive", "2026-06-30-A25-linked-worktree-archive-manifest.md"),
  clean: path.join(outDir, "archive", "2026-06-30-A25-clean-diverged-branch-archive-manifest.json"),
  cleanMarkdown: path.join(outDir, "archive", "2026-06-30-A25-clean-diverged-branch-archive-manifest.md"),
  dirty: path.join(outDir, "archive", "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json"),
  dirtyMarkdown: path.join(outDir, "archive", "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md")
};

function transactionMetadataExclusionsFor(worktree) {
  return fs.realpathSync(worktree.path) === canonicalRoot ? TRANSACTION_METADATA_PATHS : [];
}

function transactionStatusArgs(worktree) {
  const exclusions = transactionMetadataExclusionsFor(worktree);
  return [
    "status",
    "--porcelain=v1",
    "-z",
    "-uall",
    "--",
    ".",
    ...exclusions.map((relativePath) => `:(exclude,literal)${relativePath}`)
  ];
}

function snapshotOptions(worktree, extra = {}) {
  return {
    ...extra,
    transactionMetadataExclusions: transactionMetadataExclusionsFor(worktree)
  };
}

function snapshotFingerprintForArchiveSchema(snapshot, schemaVersion) {
  if (schemaVersion === EVIDENCE_SCHEMA_VERSION) return snapshot.currentStateFingerprint;
  if (schemaVersion !== LEGACY_ARCHIVE_SCHEMA_VERSION) {
    throw new Error("unsupported archive evidence schema");
  }
  const {
    buffers: _buffers,
    cleanup: _cleanup,
    currentStateFingerprint: _currentStateFingerprint,
    inventory: _inventory,
    reviewedProtectedOverlayPaths: _reviewedProtectedOverlayPaths,
    secretScanner: _secretScanner,
    ...legacyBasis
  } = snapshot;
  return fingerprint(legacyBasis);
}

function readJson(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function inactiveAttestationSlot(evidenceRoot) {
  const reportPath = path.join(evidenceRoot, "reports", gateReportFilename);
  if (!fs.existsSync(reportPath)) return attestationSlots[0];
  try {
    const current = assertEvidenceGateReport(readJson(reportPath));
    const active = path.posix.basename(current.terminalProtocol.attestationFile);
    return active === attestationSlots[0] ? attestationSlots[1] : attestationSlots[0];
  } catch {
    return attestationSlots[0];
  }
}

function currentCandidates(allWorktrees) {
  return allWorktrees.filter((entry) => {
    if (entry.branch === "main" || !entry.path || entry.prunable || !fs.existsSync(entry.path)) return false;
    const dirty = gitBuffer(transactionStatusArgs(entry), entry.path).length > 0;
    const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "main...HEAD"], entry.path).split(/\s+/u).map(Number);
    return dirty || behind > 0 || ahead > 0;
  });
}

function compareCandidateIdentitySet(expectedCandidates, current, failures, phase) {
  const expectedByPath = new Map(expectedCandidates.map((entry) => [entry.path, entry]));
  const currentByPath = new Map(current.map((entry) => [entry.path, entry]));
  if (expectedByPath.size !== expectedCandidates.length || currentByPath.size !== current.length) {
    failures.push(`${phase}: candidate paths are not unique`);
  }
  for (const expected of expectedCandidates) {
    const observed = currentByPath.get(expected.path);
    if (!observed) {
      failures.push(`${phase}: candidate was removed or moved: ${expected.branch}`);
      continue;
    }
    if (observed.branch !== expected.branch || observed.head !== expected.head) {
      failures.push(`${phase}: candidate branch/HEAD identity drifted: ${expected.branch}`);
    }
  }
  for (const observed of current) {
    if (!expectedByPath.has(observed.path)) failures.push(`${phase}: unexpected candidate was added: ${observed.branch}`);
  }
}

function revalidateGlobalCandidateState(initialCandidates, linked, monitor, baselineEpoch, failures) {
  const entryByBranch = new Map((linked.archivedWorktrees ?? []).map((entry) => [entry.branch, entry]));
  let expectedEpoch = baselineEpoch;
  let previousRoundFingerprint = null;
  for (let round = 1; round <= 2; round += 1) {
    let relisted;
    try {
      const roundStartEpoch = readMutationEpoch(monitor);
      if (roundStartEpoch !== expectedEpoch) {
        failures.push(`mutation epoch changed before gate final round ${round}`);
        return null;
      }
      relisted = currentCandidates(listWorktrees(root));
      compareCandidateIdentitySet(initialCandidates, relisted, failures, `gate final round ${round}`);
      const roundEntries = [];
      for (const worktree of relisted) {
        const entry = entryByBranch.get(worktree.branch);
        if (!entry) {
          failures.push(`gate final round ${round}: ${worktree.branch} has no manifest entry`);
          continue;
        }
        let snapshot;
        try {
          snapshot = collectWorktreeSnapshot(worktree, snapshotOptions(worktree, { includeTar: true }));
          verifyArchiveEntrySchema(entry, {
            archiveSetFingerprint: linked.archiveSetFingerprint,
            expectedBuffers: snapshot.buffers
          }, failures);
          if (entry.head !== worktree.head) failures.push(`${worktree.branch}: final HEAD identity is stale`);
          if (entry.currentStateFingerprint !== snapshotFingerprintForArchiveSchema(snapshot, linked.schemaVersion)) {
            failures.push(`${worktree.branch}: global final current-state fingerprint drifted`);
          }
          roundEntries.push({
            path: worktree.path,
            branch: worktree.branch,
            head: worktree.head,
            liveSnapshotSignature: liveSnapshotSignature(snapshot)
          });
        } catch (error) {
          failures.push(`${worktree.branch}: gate final evidence scan failed (${error.message})`);
        } finally {
          snapshot?.cleanup();
        }
      }
      const roundEndEpoch = settleMutationEpoch(monitor);
      if (roundEndEpoch !== roundStartEpoch) {
        failures.push(`mutation epoch changed during gate final round ${round}`);
        return null;
      }
      const roundFingerprint = fingerprint(roundEntries.sort((left, right) => left.path.localeCompare(right.path)));
      if (previousRoundFingerprint !== null && previousRoundFingerprint !== roundFingerprint) {
        failures.push("gate final snapshot rounds did not reach a fixed point");
        return null;
      }
      previousRoundFingerprint = roundFingerprint;
      expectedEpoch = roundEndEpoch;
    } catch (error) {
      failures.push(`gate final round ${round} failed closed (${error.message})`);
      return null;
    }
  }
  try {
    compareCandidateIdentitySet(initialCandidates, currentCandidates(listWorktrees(root)), failures, "post-scan global consistency");
    const finalEpoch = settleMutationEpoch(monitor);
    if (finalEpoch !== expectedEpoch) {
      failures.push("mutation epoch changed after gate final snapshot rounds");
      return null;
    }
    return finalEpoch;
  } catch (error) {
    failures.push(`post-scan candidate relist failed (${error.message})`);
    return null;
  }
}

function verifyManifestBytesUnchanged(manifestBuffers, failures) {
  for (const [absolutePath, expected] of manifestBuffers) {
    try {
      if (!fs.readFileSync(absolutePath).equals(expected)) {
        failures.push(`repository manifest bytes changed during current gate: ${path.basename(absolutePath)}`);
      }
    } catch (error) {
      failures.push(`repository manifest became unavailable during current gate: ${path.basename(absolutePath)} (${error.message})`);
    }
  }
}

function legacyText(buffer, fallback) {
  const text = buffer.toString("utf8").trim() || fallback;
  return Buffer.from(`${text}\n`);
}

function sameDivergence(actual, expected) {
  return Number(actual?.behind) === Number(expected?.behind) && Number(actual?.ahead) === Number(expected?.ahead);
}

function readLegacyArtifact(relativePath, label, failures) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) {
    failures.push(`${label}: missing or unsafe legacy artifact path`);
    return null;
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || !normalized.startsWith("coordination/release-intake/archive/")) {
    failures.push(`${label}: legacy artifact path escapes archive directory`);
    return null;
  }
  const absolutePath = path.resolve(root, ...relativePath.split("/"));
  const archiveRoot = fs.realpathSync(path.join(outDir, "archive"));
  try {
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink() || !stat.isFile() || !fs.realpathSync(absolutePath).startsWith(`${archiveRoot}${path.sep}`)) {
      throw new Error("not a direct regular archive file");
    }
    return { absolutePath, buffer: fs.readFileSync(absolutePath) };
  } catch (error) {
    failures.push(`${label}: legacy artifact is missing or unsafe (${error.message})`);
    return null;
  }
}

function compareLegacyArtifact(relativePath, expected, label, failures) {
  const artifact = readLegacyArtifact(relativePath, label, failures);
  if (artifact && !artifact.buffer.equals(expected)) failures.push(`${label}: artifact bytes mismatch current worktree state`);
  return artifact;
}

function canonicalLegacyBranchMetadata(entry) {
  return {
    branch: entry.branch,
    path: entry.path,
    archiveKind: entry.archiveKind,
    head: entry.head,
    divergence: { behind: entry.divergence?.behind, ahead: entry.divergence?.ahead },
    statusEntries: entry.statusEntries,
    untrackedEntries: entry.untrackedEntries,
    aheadLog: entry.aheadLog,
    nameStatus: entry.nameStatus,
    diffstat: entry.diffstat,
    patch: entry.patch,
    patchBytes: entry.patchBytes,
    patchSha256: entry.patchSha256,
    status: entry.status,
    untracked: entry.untracked
  };
}

function legacyBranchArtifacts(worktree, entry, status, untracked, failures) {
  if (entry.path !== fs.realpathSync(worktree.path) || entry.head !== worktree.head) failures.push(`${worktree.branch}: branch companion identity mismatch`);
  const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "main...HEAD"], worktree.path).split(/\s+/u).map(Number);
  if (!sameDivergence(entry.divergence, { behind, ahead })) failures.push(`${worktree.branch}: branch companion divergence mismatch`);
  const currentStatusEntries = parseStatusPorcelainZ(gitBuffer(["status", "--porcelain=v1", "-z", "-uall"], worktree.path)).length;
  const currentUntrackedEntries = parseNul(gitBuffer(["ls-files", "--others", "--exclude-standard", "-z"], worktree.path)).length;
  if (entry.statusEntries !== currentStatusEntries || entry.untrackedEntries !== currentUntrackedEntries) failures.push(`${worktree.branch}: branch companion status counts mismatch`);
  const commands = {
    aheadLog: ["log", "--oneline", "--decorate", "main..HEAD"],
    nameStatus: ["diff", "--name-status", "main...HEAD"],
    diffstat: ["diff", "--stat", "main...HEAD"],
    patch: ["diff", "--binary", "main...HEAD"]
  };
  const fallbacks = { aheadLog: "No commits ahead of main.", nameStatus: "No branch delta.", diffstat: "No branch delta.", patch: "" };
  compareLegacyArtifact(entry.status, status, `${entry.branch}: branch status`, failures);
  compareLegacyArtifact(entry.untracked, untracked, `${entry.branch}: branch untracked paths`, failures);
  for (const [field, args] of Object.entries(commands)) {
    const expected = legacyText(gitBuffer(args, worktree.path), fallbacks[field]);
    const artifact = compareLegacyArtifact(entry[field], expected, `${entry.branch}: branch ${field}`, failures);
    if (field === "patch" && artifact) {
      if (!Number.isSafeInteger(entry.patchBytes) || entry.patchBytes !== artifact.buffer.length) failures.push(`${entry.branch}: branch patch bytes mismatch`);
      if (typeof entry.patchSha256 !== "string" || entry.patchSha256 !== sha256Buffer(artifact.buffer)) failures.push(`${entry.branch}: branch patch sha256 mismatch`);
    }
  }
  const metadata = readLegacyArtifact(entry.metadata, `${entry.branch}: branch metadata`, failures);
  if (metadata) {
    try {
      const parsed = JSON.parse(metadata.buffer.toString("utf8"));
      const expected = canonicalLegacyBranchMetadata(entry);
      const allowedEntryKeys = [...Object.keys(expected), "prefix", "metadata"].sort();
      if (stableJson(parsed) !== stableJson(expected) || stableJson(Object.keys(entry).sort()) !== stableJson(allowedEntryKeys)) {
        failures.push(`${entry.branch}: branch metadata canonical integrity mismatch`);
      }
      if (!fs.readFileSync(metadata.absolutePath).equals(metadata.buffer)) failures.push(`${entry.branch}: branch metadata changed during verification`);
    } catch {
      failures.push(`${entry.branch}: branch metadata is invalid`);
    }
  }
}

function validateV1({ dirtyMap, linked, clean, dirty, candidates, failures }) {
  for (const manifest of [linked, clean, dirty]) {
    if (manifest.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("legacy v1 dirty-map signature is stale");
    if (manifest.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("legacy v1 expanded status count is stale");
  }
  const entries = linked.archivedWorktrees;
  if (!Array.isArray(entries) || !Array.isArray(clean.archivedBranches) || !Array.isArray(dirty.archivedBranches)) {
    failures.push("legacy v1 manifest arrays are missing");
    return;
  }
  const byBranch = new Map(entries.map((entry) => [entry.branch, entry]));
  const cleanByBranch = new Map(clean.archivedBranches.map((entry) => [entry.branch, entry]));
  const dirtyByBranch = new Map(dirty.archivedBranches.map((entry) => [entry.branch, entry]));
  if (byBranch.size !== entries.length || cleanByBranch.size !== clean.archivedBranches.length || dirtyByBranch.size !== dirty.archivedBranches.length) {
    failures.push("legacy v1 manifests contain duplicate branches");
  }
  for (const worktree of candidates) {
    const entry = byBranch.get(worktree.branch);
    if (!entry) {
      failures.push(`${worktree.branch}: missing legacy v1 archive entry`);
      continue;
    }
    let snapshot;
    try {
      const canonicalPath = fs.realpathSync(worktree.path);
      if (entry.path !== canonicalPath) failures.push(`${worktree.branch}: legacy worktree path is stale`);
      if (entry.head !== worktree.head || entry.head !== gitText(["rev-parse", "HEAD"], worktree.path)) failures.push(`${worktree.branch}: legacy HEAD is stale`);
      const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "main...HEAD"], worktree.path).split(/\s+/u).map(Number);
      const divergence = { behind, ahead };
      if (!sameDivergence(entry.divergence, divergence)) failures.push(`${worktree.branch}: legacy divergence is stale`);
      const status0 = gitBuffer(["status", "--porcelain=v1", "-z", "-uall"], worktree.path);
      const statusEntries = parseStatusPorcelainZ(status0);
      if (statusEntries.some((item) => item.xy !== "??" && item.xy[0] !== " ")) failures.push(`${worktree.branch}: legacy v1 cannot prove staged/index changes; refresh to v2`);
      const statusRaw = gitBuffer(["status", "--porcelain=v1", "-uall"], worktree.path);
      const status = legacyText(statusRaw, "clean");
      if (!Number.isSafeInteger(entry.statusEntries) || entry.statusEntries !== statusEntries.length) failures.push(`${worktree.branch}: legacy status entries drift`);
      const untracked0 = gitBuffer(["ls-files", "--others", "--exclude-standard", "-z"], worktree.path);
      const untrackedPaths = parseNul(untracked0);
      const untrackedRaw = gitBuffer(["ls-files", "--others", "--exclude-standard"], worktree.path);
      const legacyUntrackedPaths = untrackedRaw.toString("utf8").replace(/\s+$/u, "").split("\n").filter(Boolean);
      if (stableJson(untrackedPaths) !== stableJson(legacyUntrackedPaths)) failures.push(`${worktree.branch}: legacy untracked path encoding is not losslessly provable`);
      const untracked = legacyText(untrackedRaw, "none");
      if (!Number.isSafeInteger(entry.untrackedEntries) || entry.untrackedEntries !== untrackedPaths.length) failures.push(`${worktree.branch}: legacy untracked entries drift`);
      snapshot = collectWorktreeSnapshot(worktree, snapshotOptions(worktree, { includeTar: false }));
      if (entry.archiveKind === "dirty-worktree") {
        if (typeof entry.prefix !== "string") failures.push(`${worktree.branch}: legacy prefix is missing`);
        else {
          const patch = legacyText(gitBuffer(["diff", "--binary"], worktree.path), "");
          const patchArtifact = compareLegacyArtifact(`${entry.prefix}.patch`, patch, `${worktree.branch}: patch`, failures);
          compareLegacyArtifact(`${entry.prefix}.status.txt`, status, `${worktree.branch}: status`, failures);
          compareLegacyArtifact(`${entry.prefix}.diffstat.txt`, legacyText(gitBuffer(["diff", "--stat"], worktree.path), "No tracked diff."), `${worktree.branch}: diffstat`, failures);
          compareLegacyArtifact(`${entry.prefix}.untracked.txt`, untracked, `${worktree.branch}: untracked paths`, failures);
          if (patchArtifact) {
            if (!Number.isSafeInteger(entry.patchBytes) || entry.patchBytes !== patchArtifact.buffer.length) failures.push(`${worktree.branch}: patch bytes mismatch`);
            if (typeof entry.patchSha256 !== "string" || entry.patchSha256 !== sha256Buffer(patchArtifact.buffer)) failures.push(`${worktree.branch}: patch sha256 mismatch`);
          }
          if (untrackedPaths.length > 0) {
            const tarArtifact = readLegacyArtifact(`${entry.prefix}.untracked.tar.gz`, `${worktree.branch}: untracked tar`, failures);
            if (tarArtifact) {
              if (!Number.isSafeInteger(entry.untrackedArchiveBytes) || entry.untrackedArchiveBytes !== tarArtifact.buffer.length) failures.push(`${worktree.branch}: untracked tar bytes mismatch`);
              if (typeof entry.untrackedArchiveSha256 !== "string" || entry.untrackedArchiveSha256 !== sha256Buffer(tarArtifact.buffer)) failures.push(`${worktree.branch}: untracked tar sha256 mismatch`);
              const inventory = buildInventory(worktree.path, untrackedPaths).inventory;
              verifyTarPayload(tarArtifact.buffer, inventory, worktree.branch, failures);
              if (!fs.readFileSync(tarArtifact.absolutePath).equals(tarArtifact.buffer)
                || stableJson(buildInventory(worktree.path, untrackedPaths).inventory) !== stableJson(inventory)) {
                failures.push(`${worktree.branch}: legacy tar or source inventory drifted during verification`);
              }
            }
          } else if (entry.untrackedArchiveBytes !== 0 && entry.untrackedArchiveBytes !== undefined) {
            failures.push(`${worktree.branch}: unexpected legacy untracked tar metadata`);
          }
        }
        const needsCompanion = behind > 0 || ahead > 0;
        const companion = dirtyByBranch.get(worktree.branch);
        if (needsCompanion && !companion) failures.push(`${worktree.branch}: missing dirty-diverged legacy companion`);
        else if (companion) legacyBranchArtifacts(worktree, companion, status, untracked, failures);
      } else if (entry.archiveKind === "clean-diverged-branch") {
        if (statusEntries.length !== 0) failures.push(`${worktree.branch}: clean-diverged legacy entry is dirty`);
        const companion = cleanByBranch.get(worktree.branch);
        if (!companion || stableJson(companion) !== stableJson(entry)) failures.push(`${worktree.branch}: clean-diverged legacy companion mismatch`);
        else legacyBranchArtifacts(worktree, entry, status, untracked, failures);
      } else failures.push(`${worktree.branch}: unknown legacy archive kind`);
    } catch (error) {
      failures.push(`${worktree.branch}: legacy v1 verification failed (${error.message})`);
    } finally {
      snapshot?.cleanup();
    }
  }
  const currentBranches = new Set(candidates.map((entry) => entry.branch));
  for (const branch of byBranch.keys()) if (!currentBranches.has(branch)) failures.push(`unexpected legacy v1 archive entry: ${branch}`);
  const expectedClean = entries.filter((entry) => entry.archiveKind === "clean-diverged-branch").map((entry) => entry.branch).sort();
  const expectedDirty = entries.filter((entry) => entry.archiveKind === "dirty-worktree" && (entry.divergence?.behind > 0 || entry.divergence?.ahead > 0)).map((entry) => entry.branch).sort();
  if (stableJson([...cleanByBranch.keys()].sort()) !== stableJson(expectedClean)) failures.push("legacy clean-diverged companion branch set is stale");
  if (stableJson([...dirtyByBranch.keys()].sort()) !== stableJson(expectedDirty)) failures.push("legacy dirty-diverged companion branch set is stale");
}

function validateV2({ dirtyMap, linked, clean, dirty, allWorktrees, candidates, monitor, baselineEpoch, failures }) {
  verifyArchiveCompanionManifestSchema(clean, { linked, kind: "clean" }, failures);
  verifyArchiveCompanionManifestSchema(dirty, { linked, kind: "dirty" }, failures);
  for (const [kind, manifest, markdownPath] of [
    ["linked", linked, paths.linkedMarkdown],
    ["clean", clean, paths.cleanMarkdown],
    ["dirty", dirty, paths.dirtyMarkdown]
  ]) {
    try {
      const expected = Buffer.from(renderArchiveManifestMarkdown(kind, manifest));
      const observed = fs.readFileSync(markdownPath);
      if (!observed.equals(expected)) failures.push(`${kind} Markdown bytes mismatch the canonical renderer`);
    } catch (error) {
      failures.push(`${kind} Markdown canonical verification failed (${error.message})`);
    }
  }
  let evidenceRoot;
  try {
    evidenceRoot = resolveEvidenceRoot({
      repoRoot: root,
      commonDir,
      explicitRoot: process.env.MAIS_EVIDENCE_ROOT,
      worktreeRoots: allWorktrees.map((entry) => entry.path)
    });
  } catch (error) {
    failures.push(error.message);
    return;
  }
  const markerPath = path.join(evidenceRoot, MARKER_NAME);
  let marker;
  try {
    marker = readEvidenceRootMarker(markerPath, {
      repositoryId: repositoryIdentity(commonDir),
      rootId: linked.evidenceRootId
    });
  } catch (error) {
    failures.push(`external evidence marker is invalid (${error.message})`);
    return;
  }
  if ((fs.statSync(evidenceRoot).mode & 0o777) !== 0o700) failures.push("external evidence root permissions must be 0700");
  if ((fs.statSync(markerPath).mode & 0o777) !== 0o600) failures.push("external evidence marker permissions must be 0600");
  try {
    assertEvidenceRootLayout(evidenceRoot);
  } catch (error) {
    failures.push(error.message);
  }
  if (linked.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("linked manifest dirty-map signature is stale");
  if (linked.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("linked manifest expanded status count is stale");
  const byBranch = new Map(linked.archivedWorktrees.map((entry) => [entry.branch, entry]));
  const currentFingerprints = [];
  for (const worktree of candidates) {
    const entry = byBranch.get(worktree.branch);
    if (!entry) {
      failures.push(`${worktree.branch}: missing v2 archive entry`);
      continue;
    }
    let snapshot;
    try {
      if (entry.path !== undefined) failures.push(`${worktree.branch}: v2 entry must not retain a local absolute path`);
      snapshot = collectWorktreeSnapshot(worktree, snapshotOptions(worktree, { includeTar: true }));
      const currentStateFingerprint = snapshotFingerprintForArchiveSchema(snapshot, linked.schemaVersion);
      currentFingerprints.push(currentStateFingerprint);
      verifyArchiveEntrySchema(entry, {
        archiveSetFingerprint: linked.archiveSetFingerprint,
        expectedBuffers: snapshot.buffers
      }, failures);
      if (entry.schemaVersion !== linked.schemaVersion) failures.push(`${worktree.branch}: entry schema is stale`);
      if (entry.head !== worktree.head) failures.push(`${worktree.branch}: head is stale`);
      if (entry.currentStateFingerprint !== currentStateFingerprint) failures.push(`${worktree.branch}: current-state fingerprint is stale`);
      if (entry.archiveSetFingerprint !== linked.archiveSetFingerprint) failures.push(`${worktree.branch}: archive-set fingerprint is stale`);
      if (entry.secretScanner?.status !== "passed") failures.push(`${worktree.branch}: secret scanner status is not passed`);
    } catch (error) {
      failures.push(`${worktree.branch}: current evidence scan failed (${error.message})`);
    } finally {
      snapshot?.cleanup();
    }
  }
  const currentBranches = new Set(candidates.map((entry) => entry.branch));
  for (const branch of byBranch.keys()) if (!currentBranches.has(branch)) failures.push(`unexpected v2 archive entry: ${branch}`);
  verifyArchiveSetEvidence(evidenceRoot, linked, failures);
  const expectedSetFingerprint = fingerprint({
    schemaVersion: linked.schemaVersion,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    entries: currentFingerprints.sort()
  });
  if (expectedSetFingerprint !== linked.archiveSetFingerprint) failures.push("archive set fingerprint is not current");
  const indexPath = path.join(evidenceRoot, "sets", linked.archiveSetFingerprint, "archive-set.json");
  if (!fs.existsSync(indexPath)) failures.push("external archive-set index is missing");
  else {
    if ((fs.statSync(indexPath).mode & 0o777) !== 0o600) failures.push("external archive-set index permissions must be 0600");
    try {
      const index = readJson(indexPath);
      if (index.evidenceRootId !== marker.rootId || index.archiveSetFingerprint !== linked.archiveSetFingerprint) failures.push("external archive-set index is stale");
      if (stableJson(index.entries) !== stableJson(linked.archivedWorktrees)) failures.push("external archive-set index entries do not match manifest");
    } catch {
      failures.push("external archive-set index is invalid");
    }
  }
  const finalEpoch = revalidateGlobalCandidateState(candidates, linked, monitor, baselineEpoch, failures);
  if (finalEpoch !== null) {
    verifyArchiveSetEvidence(evidenceRoot, linked, failures);
    const postArchiveEpoch = settleMutationEpoch(monitor);
    if (postArchiveEpoch !== finalEpoch) failures.push("mutation epoch changed during final archive verification");
    return postArchiveEpoch;
  }
  return null;
}

function main() {
  const failures = [];
  const { allWorktrees, baselineEpoch, monitor } = bootstrapMutationEpochMonitor({
    repoRoot: root,
    commonDir,
    transactionMetadata: [
      {
        root: canonicalRoot,
        exactRelativePaths: TRANSACTION_METADATA_PATHS
      },
      {
        root: commonDir,
        exactRelativePaths: ["mais-evidence-writer.lock"]
      }
    ]
  });
  try {
    for (const requiredPath of Object.values(paths)) {
      if (!fs.existsSync(requiredPath)) failures.push(`missing required file: ${path.relative(root, requiredPath)}`);
    }
    if (failures.length > 0) {
      stopMutationEpochMonitor(monitor, { expectedEpoch: baselineEpoch });
      finish({ failures, openLinkedDecisions: 0 });
      return;
    }
    const manifestBuffers = new Map([
      paths.linked,
      paths.linkedMarkdown,
      paths.clean,
      paths.cleanMarkdown,
      paths.dirty,
      paths.dirtyMarkdown
    ].map((absolutePath) => [absolutePath, fs.readFileSync(absolutePath)]));
    const dirtyMap = readJson(paths.dirtyMap);
    const linked = JSON.parse(manifestBuffers.get(paths.linked).toString("utf8"));
    const clean = JSON.parse(manifestBuffers.get(paths.clean).toString("utf8"));
    const dirty = JSON.parse(manifestBuffers.get(paths.dirty).toString("utf8"));
    const candidates = currentCandidates(allWorktrees);
    let finalEpoch = baselineEpoch;
    if (READABLE_ARCHIVE_SCHEMA_VERSIONS.has(linked.schemaVersion)) {
      finalEpoch = validateV2({ dirtyMap, linked, clean, dirty, allWorktrees, candidates, monitor, baselineEpoch, failures });
      verifyManifestBytesUnchanged(manifestBuffers, failures);
      if (finalEpoch !== null && finalEpoch !== undefined) {
        const manifestEpoch = settleMutationEpoch(monitor);
        if (manifestEpoch !== finalEpoch) failures.push("mutation epoch changed before the current gate completed");
        finalEpoch = manifestEpoch;
      }
    } else {
      if (linked.schemaVersion === undefined || linked.schemaVersion === 1) {
        validateV1({ dirtyMap, linked, clean, dirty, candidates, failures });
      } else {
        failures.push(`unsupported archive evidence schema: ${linked.schemaVersion}`);
      }
      verifyManifestBytesUnchanged(manifestBuffers, failures);
      const legacyEpoch = settleMutationEpoch(monitor);
      if (legacyEpoch !== baselineEpoch) failures.push("mutation epoch changed during legacy current-gate verification");
      finalEpoch = legacyEpoch;
    }
    const terminalState = settleMutationEpochState(monitor);
    if (finalEpoch === null || finalEpoch === undefined || terminalState.sourceEpoch !== finalEpoch) {
      failures.push("mutation epoch is not terminally stable for the current gate");
      finalEpoch = terminalState.sourceEpoch;
    }
    verifyManifestBytesUnchanged(manifestBuffers, failures);
    const payload = {
      checkedAt: new Date().toISOString(),
      schemaVersion: linked.schemaVersion ?? 1,
      archiveSetFingerprint: linked.archiveSetFingerprint ?? null,
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      openLinkedDecisions: candidates.length,
      failures,
      branches: candidates.map((entry) => ({ branch: entry.branch, head: entry.head }))
    };
    if (READABLE_ARCHIVE_SCHEMA_VERSIONS.has(linked.schemaVersion)) {
      const evidenceRoot = resolveEvidenceRoot({
        repoRoot: root,
        commonDir,
        explicitRoot: process.env.MAIS_EVIDENCE_ROOT,
        worktreeRoots: allWorktrees.map((entry) => entry.path)
      });
      readEvidenceRootMarker(path.join(evidenceRoot, MARKER_NAME), {
        repositoryId: repositoryIdentity(commonDir),
        rootId: linked.evidenceRootId
      });
      const attestationFilename = inactiveAttestationSlot(evidenceRoot);
      const provisionalReportPayload = {
        ...payload,
        terminalProtocol: {
          attestationFile: `reports/${attestationFilename}`,
          expectedMetadataEpoch: terminalState.metadataEpoch,
          expectedSourceEpoch: finalEpoch,
          monitorSessionId: monitor.sessionId,
          schemaVersion: 1
        }
      };
      assertEvidenceGateReport(provisionalReportPayload);
      let preparedReport;
      let preparedAttestation;
      try {
        preparedReport = prepareEvidenceReport({
          evidenceRoot,
          evidenceRootId: linked.evidenceRootId,
          filename: gateReportFilename,
          payload: provisionalReportPayload
        });
        preparedAttestation = prepareEvidenceReport({
          evidenceRoot,
          evidenceRootId: linked.evidenceRootId,
          filename: attestationFilename,
          payload: {
            schemaVersion: 1,
            sessionId: monitor.sessionId,
            sourceEpoch: finalEpoch,
            metadataEpoch: terminalState.metadataEpoch,
            status: "pending"
          }
        });
        const attestation = stopMutationEpochMonitor(monitor, {
          expectedEpoch: finalEpoch,
          expectedMetadataEpoch: terminalState.metadataEpoch
        });
        const reportPayload = {
          ...payload,
          terminalProtocol: {
            attestationFile: `reports/${attestationFilename}`,
            expectedMetadataEpoch: attestation.metadataEpoch,
            expectedSourceEpoch: attestation.sourceEpoch,
            monitorSessionId: attestation.sessionId,
            schemaVersion: 1
          }
        };
        assertEvidenceGateReport(reportPayload);
        commitEvidenceReport(preparedAttestation, { payload: attestation });
        commitEvidenceReport(preparedReport, { payload: reportPayload });
      } finally {
        abortEvidenceReport(preparedAttestation);
        abortEvidenceReport(preparedReport);
      }
    } else {
      stopMutationEpochMonitor(monitor, {
        expectedEpoch: finalEpoch,
        expectedMetadataEpoch: terminalState.metadataEpoch
      });
    }
    finish(payload);
  } finally {
    abortMutationEpochMonitor(monitor);
  }
}

function finish(payload) {
  if (jsonOutput) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log("A25 linked-worktree archive evidence gate");
    console.log(`Open linked decisions: ${payload.openLinkedDecisions ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 linked-worktree archive evidence gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  finish({ failures: [`gate crashed safely: ${error.message}`], openLinkedDecisions: 0 });
}
