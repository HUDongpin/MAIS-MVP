#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVIDENCE_SCHEMA_VERSION,
  TRANSACTION_METADATA_PATHS,
  abortMutationEpochMonitor,
  assertArchiveSetEvidence,
  assertEvidenceWriterLockOwned,
  bootstrapMutationEpochMonitor,
  collectWorktreeSnapshot,
  ensureEvidenceRoot,
  gitBuffer,
  gitText,
  fingerprint,
  liveSnapshotSignature,
  listWorktrees,
  materializeArchiveSet,
  publishManifestTransaction,
  registerMutationMetadataRoot,
  recoverManifestTransactions,
  renderArchiveManifestMarkdown,
  repositoryIdentity,
  readMutationEpoch,
  resolveEvidenceRoot,
  runEvidenceWriterUnderLock,
  settleMutationEpoch,
  settleMutationEpochState,
  stopMutationEpochMonitor
} from "./evidence-archive-lib.mjs";

const root = gitText(["rev-parse", "--show-toplevel"]);
const commonDirRaw = gitText(["rev-parse", "--git-common-dir"], root);
const commonDir = path.resolve(root, commonDirRaw);
const canonicalRoot = fs.realpathSync(root);
const archiveDir = path.join(root, "coordination", "release-intake", "archive");
const paths = {
  linked: path.join(archiveDir, "2026-06-30-A25-linked-worktree-archive-manifest.json"),
  linkedMarkdown: path.join(archiveDir, "2026-06-30-A25-linked-worktree-archive-manifest.md"),
  clean: path.join(archiveDir, "2026-06-30-A25-clean-diverged-branch-archive-manifest.json"),
  cleanMarkdown: path.join(archiveDir, "2026-06-30-A25-clean-diverged-branch-archive-manifest.md"),
  dirty: path.join(archiveDir, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json"),
  dirtyMarkdown: path.join(archiveDir, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md")
};

function transactionMetadataExclusionsFor(worktree) {
  return fs.realpathSync(worktree.path) === canonicalRoot ? TRANSACTION_METADATA_PATHS : [];
}

function transactionStatusArgs(worktree, ephemeralTransactionMetadataRoots = []) {
  const exclusions = transactionMetadataExclusionsFor(worktree);
  const ephemeral = fs.realpathSync(worktree.path) === canonicalRoot ? ephemeralTransactionMetadataRoots : [];
  return [
    "status",
    "--porcelain=v1",
    "-z",
    "-uall",
    "--",
    ".",
    ...exclusions.map((relativePath) => `:(exclude,literal)${relativePath}`),
    ...ephemeral.map((relativePath) => `:(exclude,literal)${relativePath}`)
  ];
}

function evidenceCandidates(worktrees, ephemeralTransactionMetadataRoots = []) {
  return worktrees.filter((entry) => {
    if (entry.branch === "main" || !entry.path || entry.prunable || !fs.existsSync(entry.path)) return false;
    const dirty = gitBuffer(transactionStatusArgs(entry, ephemeralTransactionMetadataRoots), entry.path).length > 0;
    const [behind, ahead] = gitText(["rev-list", "--left-right", "--count", "main...HEAD"], entry.path).split(/\s+/u).map(Number);
    return dirty || behind > 0 || ahead > 0;
  });
}

function snapshotOptions(worktree, extra = {}) {
  const ephemeralTransactionMetadataRoots = fs.realpathSync(worktree.path) === canonicalRoot
    ? extra.ephemeralTransactionMetadataRoots ?? []
    : [];
  return {
    ...extra,
    transactionMetadataExclusions: transactionMetadataExclusionsFor(worktree),
    ephemeralTransactionMetadataRoots
  };
}

function assertCandidateIdentitySet(originalCandidates, currentCandidates) {
  const expectedByPath = new Map(originalCandidates.map((entry) => [entry.path, entry]));
  if (currentCandidates.length !== originalCandidates.length) throw new Error("global worktree candidate set drift detected before manifest publication");
  for (const current of currentCandidates) {
    const expected = expectedByPath.get(current.path);
    if (!expected || expected.branch !== current.branch || expected.head !== current.head) {
      throw new Error("global worktree identity drift detected before manifest publication");
    }
  }
}

function assertGlobalFinalConsistency(
  originalCandidates,
  snapshots,
  monitor,
  bootstrapEpoch,
  ephemeralTransactionMetadataRoots,
  assertLockHealthy
) {
  const snapshotByPath = new Map(snapshots.map((entry) => [entry.worktreePath, entry]));
  let expectedEpoch = settleMutationEpoch(monitor);
  if (expectedEpoch !== bootstrapEpoch) {
    throw new Error("global source drift changed the mutation epoch after monitor bootstrap and before final verification");
  }
  let previousRoundFingerprint = null;
  for (let round = 1; round <= 2; round += 1) {
    assertLockHealthy();
    const roundStartEpoch = readMutationEpoch(monitor);
    if (roundStartEpoch !== expectedEpoch) throw new Error(`mutation epoch changed before final round ${round}`);
    const currentCandidates = evidenceCandidates(listWorktrees(root), ephemeralTransactionMetadataRoots);
    assertLockHealthy();
    assertCandidateIdentitySet(originalCandidates, currentCandidates);
    const roundEntries = [];
    for (const current of currentCandidates) {
      assertLockHealthy();
      const expectedSnapshot = snapshotByPath.get(current.path);
      if (!expectedSnapshot) throw new Error(`${current.branch}: missing original final snapshot`);
      let verification;
      try {
        verification = collectWorktreeSnapshot(current, snapshotOptions(current, {
          includeTar: true,
          ephemeralTransactionMetadataRoots
        }));
        assertLockHealthy();
        const observedSignature = liveSnapshotSignature(verification);
        const expectedSignature = liveSnapshotSignature(expectedSnapshot);
        if (observedSignature !== expectedSignature) {
          throw new Error(`${current.branch}: global worktree content drift detected before manifest publication`);
        }
        roundEntries.push({ path: current.path, branch: current.branch, head: current.head, liveSnapshotSignature: observedSignature });
      } finally {
        verification?.cleanup();
      }
    }
    const roundEndEpoch = settleMutationEpoch(monitor);
    if (roundEndEpoch !== roundStartEpoch) throw new Error(`mutation epoch changed during final round ${round}`);
    const roundFingerprint = fingerprint(roundEntries.sort((left, right) => left.path.localeCompare(right.path)));
    if (previousRoundFingerprint !== null && roundFingerprint !== previousRoundFingerprint) {
      throw new Error("final snapshot rounds did not reach a fixed point");
    }
    previousRoundFingerprint = roundFingerprint;
    expectedEpoch = roundEndEpoch;
  }
  assertLockHealthy();
  assertCandidateIdentitySet(originalCandidates, evidenceCandidates(listWorktrees(root), ephemeralTransactionMetadataRoots));
  const finalEpoch = settleMutationEpoch(monitor);
  if (finalEpoch !== expectedEpoch) throw new Error("mutation epoch changed after the final snapshot round");
  assertLockHealthy();
  return finalEpoch;
}

const withNewline = (content) => `${String(content).replace(/\s+$/u, "")}\n`;

function manifestFiles(linked, clean, dirty) {
  return [
    { path: paths.linked, content: withNewline(JSON.stringify(linked, null, 2)) },
    { path: paths.linkedMarkdown, content: renderArchiveManifestMarkdown("linked", linked) },
    { path: paths.clean, content: withNewline(JSON.stringify(clean, null, 2)) },
    { path: paths.cleanMarkdown, content: renderArchiveManifestMarkdown("clean", clean) },
    { path: paths.dirty, content: withNewline(JSON.stringify(dirty, null, 2)) },
    { path: paths.dirtyMarkdown, content: renderArchiveManifestMarkdown("dirty", dirty) }
  ];
}

function reusableGeneratedAt({ archiveSetFingerprint, marker, dirtyMap, entries }) {
  try {
    for (const absolutePath of Object.values(paths)) {
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink() || !stat.isFile()) return null;
    }
    const oldLinked = JSON.parse(fs.readFileSync(paths.linked, "utf8"));
    if (typeof oldLinked.generatedAt !== "string" || !Number.isFinite(Date.parse(oldLinked.generatedAt))) return null;
    const base = {
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      generatedAt: oldLinked.generatedAt,
      evidenceRootId: marker.rootId,
      archiveSetFingerprint,
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries
    };
    const linked = { ...base, archivedWorktrees: entries };
    const clean = { ...base, archivedBranches: entries.filter((entry) => entry.archiveKind === "clean-diverged-branch") };
    const dirty = { ...base, archivedBranches: entries.filter((entry) => entry.archiveKind === "dirty-worktree" && (entry.divergence.behind > 0 || entry.divergence.ahead > 0)) };
    for (const file of manifestFiles(linked, clean, dirty)) {
      const expected = Buffer.from(file.content);
      if (!fs.readFileSync(file.path).equals(expected)) return null;
    }
    return oldLinked.generatedAt;
  } catch {
    return null;
  }
}

function assertPublishedManifestFiles(files) {
  for (const file of files) {
    const stat = fs.lstatSync(file.path);
    const expected = Buffer.from(file.content);
    if (stat.isSymbolicLink() || !stat.isFile() || (stat.mode & 0o777) !== 0o600
      || !fs.readFileSync(file.path).equals(expected)) {
      throw new Error(`published transaction metadata failed exact validation: ${path.basename(file.path)}`);
    }
  }
}

function mainLocked(assertLockHealthy) {
  assertLockHealthy();
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
  const snapshots = [];
  try {
    if (readMutationEpoch(monitor) !== baselineEpoch) throw new Error("mutation epoch changed immediately after monitor bootstrap");
    const dirtyMapPath = path.join(root, "coordination", "release-intake", "latest-A25-dirty-tree-map.json");
    const dirtyMap = JSON.parse(fs.readFileSync(dirtyMapPath, "utf8"));
    assertLockHealthy();
    const evidenceRoot = resolveEvidenceRoot({
      repoRoot: root,
      commonDir,
      explicitRoot: process.env.MAIS_EVIDENCE_ROOT,
      worktreeRoots: allWorktrees.map((entry) => entry.path)
    });
    const marker = ensureEvidenceRoot({ evidenceRoot, repositoryId: repositoryIdentity(commonDir) });
    assertLockHealthy();
    const candidates = evidenceCandidates(allWorktrees);
    assertLockHealthy();
    for (const worktree of candidates) {
      assertLockHealthy();
      snapshots.push({
        ...collectWorktreeSnapshot(worktree, snapshotOptions(worktree)),
        branch: worktree.branch,
        head: worktree.head,
        worktreePath: worktree.path
      });
      assertLockHealthy();
    }
    assertLockHealthy();
    const { archiveSetFingerprint, entries } = materializeArchiveSet({ evidenceRoot, marker, dirtyMap, snapshots });
    assertLockHealthy();
    const generatedAt = reusableGeneratedAt({ archiveSetFingerprint, marker, dirtyMap, entries }) ?? new Date().toISOString();
    const base = {
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      generatedAt,
      evidenceRootId: marker.rootId,
      archiveSetFingerprint,
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries
    };
    const linked = { ...base, archivedWorktrees: entries };
    const clean = { ...base, archivedBranches: entries.filter((entry) => entry.archiveKind === "clean-diverged-branch") };
    const dirty = { ...base, archivedBranches: entries.filter((entry) => entry.archiveKind === "dirty-worktree" && (entry.divergence.behind > 0 || entry.divergence.ahead > 0)) };
    const files = manifestFiles(linked, clean, dirty);
    let terminalEpoch;
    let transactionRelativeRoot;
    publishManifestTransaction({
      archiveDir,
      files,
      assertLockHealthy,
      beforePrepare: ({ transactionDirectory }) => {
        assertLockHealthy();
        transactionRelativeRoot = path.relative(canonicalRoot, transactionDirectory).split(path.sep).join("/");
        registerMutationMetadataRoot(monitor, {
          root: canonicalRoot,
          relativePath: transactionRelativeRoot
        });
        assertLockHealthy();
      },
      beforePublish: ({ transactionDirectory }) => {
        assertLockHealthy();
        const observedRelativeRoot = path.relative(canonicalRoot, transactionDirectory).split(path.sep).join("/");
        if (observedRelativeRoot !== transactionRelativeRoot) {
          throw new Error("manifest transaction root changed after exact monitor registration");
        }
        terminalEpoch = assertGlobalFinalConsistency(
          candidates,
          snapshots,
          monitor,
          baselineEpoch,
          [transactionRelativeRoot],
          assertLockHealthy
        );
        assertLockHealthy();
        assertArchiveSetEvidence(evidenceRoot, linked);
        assertLockHealthy();
        const publicationEpoch = settleMutationEpoch(monitor);
        if (publicationEpoch !== terminalEpoch) throw new Error("mutation epoch changed before manifest publication");
      },
      beforeCommit: () => {
        assertPublishedManifestFiles(files);
        const terminalState = settleMutationEpochState(monitor);
        if (terminalState.sourceEpoch !== terminalEpoch) {
          throw new Error("source epoch changed after manifest publication and before terminal metadata binding");
        }
        assertPublishedManifestFiles(files);
        stopMutationEpochMonitor(monitor, {
          expectedEpoch: terminalState.sourceEpoch,
          expectedMetadataEpoch: terminalState.metadataEpoch
        });
        assertPublishedManifestFiles(files);
      }
    });
    assertLockHealthy();
    console.log(JSON.stringify({
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      archiveSetFingerprint,
      evidenceRootId: marker.rootId,
      dirtyLinkedWorktrees: entries.filter((entry) => entry.archiveKind === "dirty-worktree").length,
      cleanDivergedBranches: clean.archivedBranches.length,
      dirtyDivergedBranches: dirty.archivedBranches.length
    }, null, 2));
  } finally {
    abortMutationEpochMonitor(monitor);
    for (const snapshot of snapshots) snapshot.cleanup();
  }
}

function main() {
  const assertLockHealthy = () => assertEvidenceWriterLockOwned({ commonDir });
  try {
    assertLockHealthy();
  } catch {
    runEvidenceWriterUnderLock({
      commonDir,
      scriptPath: fileURLToPath(import.meta.url),
      args: process.argv.slice(2)
    });
    return;
  }
  assertLockHealthy();
  fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
  const archiveStat = fs.lstatSync(archiveDir);
  if (archiveStat.isSymbolicLink() || !archiveStat.isDirectory()) {
    throw new Error("manifest archive directory must be a direct directory");
  }
  fs.chmodSync(archiveDir, 0o700);
  assertLockHealthy();
  recoverManifestTransactions({ archiveDir, assertLockHealthy });
  assertLockHealthy();
  mainLocked(assertLockHealthy);
}

try {
  main();
} catch (error) {
  console.error(`A25 external evidence refresh failed: ${error.message}`);
  process.exit(1);
}
