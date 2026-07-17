import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { fingerprint } from "./evidence-archive-lib.mjs";
import { applyEvidenceArchiveGcPlan } from "./apply-evidence-archive-gc.mjs";
import { buildEvidenceArchiveGcPlan } from "./plan-evidence-archive-gc.mjs";

const ROOT_ID = "12345678-1234-4234-9234-123456789abc";
const REPOSITORY_ID = "a".repeat(64);
const MANIFEST_NAMES = {
  linked: "2026-06-30-A25-linked-worktree-archive-manifest.json",
  clean: "2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  dirty: "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json"
};
const ARTIFACT_NAMES = {
  statusInventory: "status.porcelain-v1.z",
  trackedPatch: "tracked.patch",
  indexInventory: "index.ls-files-stage.z",
  indexPatch: "index.patch",
  worktreePatch: "worktree.patch",
  branchPatch: "branch.patch",
  untrackedPaths0: "untracked.paths0",
  untrackedInventory: "untracked.inventory.json",
  untrackedTar: "untracked.tar.gz"
};

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function mkdir(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function writeJson(filename, value) {
  mkdir(path.dirname(filename));
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
}

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "mais-evidence-gc-plan-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const evidenceRoot = path.join(base, "evidence");
  const publicationDirectory = path.join(base, "archive");
  for (const directory of [
    evidenceRoot,
    path.join(evidenceRoot, "blobs", "sha256"),
    path.join(evidenceRoot, "reports"),
    path.join(evidenceRoot, "sets"),
    publicationDirectory
  ]) mkdir(directory);
  writeJson(path.join(evidenceRoot, ".mais-evidence-root.json"), {
    repositoryId: REPOSITORY_ID,
    rootId: ROOT_ID,
    schemaVersion: 1
  });
  return { base, evidenceRoot, publicationDirectory };
}

function createSet(evidenceRoot, { branch, stateSeed, artifactBuffer = Buffer.from("shared artifact\n") }) {
  const head = sha256(Buffer.from(`${branch}:head`)).slice(0, 40);
  const baseHead = sha256(Buffer.from(`${branch}:base`)).slice(0, 40);
  const currentStateFingerprint = sha256(Buffer.from(stateSeed));
  const basis = {
    schemaVersion: 3,
    dirtyMapStatusSignature: `status:${stateSeed}`,
    expandedStatusEntries: 1,
    entries: [currentStateFingerprint]
  };
  const archiveSetFingerprint = fingerprint(basis);
  const entryId = fingerprint({ branch, head }).slice(0, 24);
  const artifactSha = sha256(artifactBuffer);
  const blobDirectory = path.join(evidenceRoot, "blobs", "sha256", artifactSha.slice(0, 2));
  const blobPath = path.join(blobDirectory, artifactSha);
  mkdir(blobDirectory);
  if (!fs.existsSync(blobPath)) {
    fs.writeFileSync(blobPath, artifactBuffer, { mode: 0o600 });
    fs.chmodSync(blobPath, 0o600);
  }
  const artifacts = {};
  const setDirectory = path.join(evidenceRoot, "sets", archiveSetFingerprint);
  for (const [key, name] of Object.entries(ARTIFACT_NAMES)) {
    if (key === "branchPatch" || key === "untrackedTar") {
      artifacts[key] = null;
      continue;
    }
    const relativePath = path.posix.join("sets", archiveSetFingerprint, entryId, name);
    const artifactPath = path.join(evidenceRoot, ...relativePath.split("/"));
    mkdir(path.dirname(artifactPath));
    fs.linkSync(blobPath, artifactPath);
    artifacts[key] = { bytes: artifactBuffer.length, path: relativePath, sha256: artifactSha };
  }
  const entry = {
    schemaVersion: 3,
    branch,
    archiveKind: "dirty-worktree",
    head,
    baseHead,
    divergence: { ahead: 0, behind: 0 },
    statusEntries: 1,
    untrackedEntries: 0,
    transactionMetadataExclusions: [],
    currentStateFingerprint,
    archiveSetFingerprint,
    secretScanner: {
      reviewedBinaryPaths: 0,
      reviewedProtectedOverlayPaths: 0,
      scannedPaths: 1,
      status: "passed"
    },
    artifacts
  };
  const index = {
    schemaVersion: 3,
    evidenceRootId: ROOT_ID,
    archiveSetFingerprint,
    basis,
    entries: [entry]
  };
  writeJson(path.join(setDirectory, "archive-set.json"), index);
  return { archiveSetFingerprint, blobPath, index };
}

function writeLegacyManifests(publicationDirectory) {
  writeJson(path.join(publicationDirectory, MANIFEST_NAMES.linked), {
    generatedAt: "2026-07-10T17:07:27.574Z",
    dirtyMapStatusSignature: "legacy",
    expandedStatusEntries: 0,
    archivedWorktrees: [],
    note: "legacy manifest"
  });
  for (const kind of ["clean", "dirty"]) {
    writeJson(path.join(publicationDirectory, MANIFEST_NAMES[kind]), {
      generatedAt: "2026-07-10T17:07:27.574Z",
      dirtyMapStatusSignature: "legacy",
      expandedStatusEntries: 0,
      archivedBranches: [],
      note: "legacy manifest"
    });
  }
  for (const basename of Object.values(MANIFEST_NAMES)) {
    const markdown = path.join(publicationDirectory, basename.replace(/\.json$/u, ".md"));
    fs.writeFileSync(markdown, "# Legacy manifest\n", { mode: 0o600 });
    fs.chmodSync(markdown, 0o600);
  }
}

function writeCurrentManifests(publicationDirectory, index) {
  const base = {
    schemaVersion: index.schemaVersion,
    generatedAt: "2026-07-15T00:00:00.000Z",
    evidenceRootId: index.evidenceRootId,
    archiveSetFingerprint: index.archiveSetFingerprint,
    dirtyMapStatusSignature: index.basis.dirtyMapStatusSignature,
    expandedStatusEntries: index.basis.expandedStatusEntries
  };
  writeJson(path.join(publicationDirectory, MANIFEST_NAMES.linked), {
    ...base,
    archivedWorktrees: index.entries
  });
  for (const kind of ["clean", "dirty"]) {
    writeJson(path.join(publicationDirectory, MANIFEST_NAMES[kind]), {
      ...base,
      archivedBranches: []
    });
  }
  for (const basename of Object.values(MANIFEST_NAMES)) {
    const markdown = path.join(publicationDirectory, basename.replace(/\.json$/u, ".md"));
    fs.writeFileSync(markdown, "# Schema v3 manifest\n", { mode: 0o600 });
    fs.chmodSync(markdown, 0o600);
  }
}

function stableTreeState(root) {
  const output = [];
  const walk = (directory) => {
    for (const name of fs.readdirSync(directory).sort()) {
      const filename = path.join(directory, name);
      const stat = fs.lstatSync(filename);
      output.push({
        path: path.relative(root, filename),
        mode: stat.mode,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        ctimeMs: stat.ctimeMs,
        ino: String(stat.ino),
        nlink: stat.nlink
      });
      if (stat.isDirectory()) walk(filename);
    }
  };
  walk(root);
  return output;
}

test("GC planner is read-only and identifies legacy-unreferenced sets and blobs", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  for (const name of fs.readdirSync(publicationDirectory)) {
    fs.chmodSync(path.join(publicationDirectory, name), 0o644);
  }
  const created = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  const before = stableTreeState(path.dirname(evidenceRoot));

  const first = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });
  const second = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });

  assert.deepEqual(stableTreeState(path.dirname(evidenceRoot)), before);
  assert.deepEqual(first, second);
  assert.deepEqual(first.retainedSets, []);
  assert.deepEqual(first.orphanSets, [created.archiveSetFingerprint]);
  assert.equal(first.summary.candidateBlobFiles, 1);
  assert.equal(first.summary.orphanSetDirectories, 1);
  assert.ok(first.summary.reclaimableAllocatedBytes > 0);
  assert.match(first.planFingerprint, /^[0-9a-f]{64}$/u);
});

test("published schema-v3 manifest retains its set and blob", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  const created = createSet(evidenceRoot, { branch: "codex/A25-retained", stateSeed: "retained" });
  writeCurrentManifests(publicationDirectory, created.index);

  const plan = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });

  assert.deepEqual(plan.retainedSets, [created.archiveSetFingerprint]);
  assert.deepEqual(plan.orphanSets, []);
  assert.equal(plan.summary.candidateBlobFiles, 0);
  assert.equal(plan.summary.retainedBlobFiles, 1);
  assert.equal(plan.summary.reclaimableAllocatedBytes, 0);
});

test("blob shared by retained and orphan sets remains retained", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  const retained = createSet(evidenceRoot, { branch: "codex/A25-retained", stateSeed: "retained" });
  const orphan = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  writeCurrentManifests(publicationDirectory, retained.index);

  const plan = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });

  assert.deepEqual(plan.retainedSets, [retained.archiveSetFingerprint]);
  assert.deepEqual(plan.orphanSets, [orphan.archiveSetFingerprint]);
  assert.equal(plan.summary.candidateBlobFiles, 0);
  assert.equal(plan.summary.retainedBlobFiles, 1);
  assert.ok(plan.summary.reclaimableAllocatedBytes > 0, "orphan archive-set index is reclaimable");
});

test("recovery artifacts fail closed instead of producing a deletion plan", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  const recovery = path.join(
    evidenceRoot,
    "reports",
    "gate.json.recovery-12345678-1234-4234-9234-123456789abc.json"
  );
  writeJson(recovery, { state: "prepared" });

  assert.throws(
    () => buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory }),
    /recovery|transaction/iu
  );
});

test("unmanaged external hardlinks fail closed", (t) => {
  const { base, evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  const created = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  fs.linkSync(created.blobPath, path.join(base, "unmanaged-hardlink"));

  assert.throws(
    () => buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory }),
    /hardlink|link count|unmanaged/iu
  );
});

test("canonical zero-byte blob temporary file is isolated as an explicit cleanup candidate", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  const created = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  const temporaryPath = `${created.blobPath}.tmp-12345-12345678-1234-4234-9234-123456789abc`;
  fs.writeFileSync(temporaryPath, Buffer.alloc(0), { mode: 0o600 });
  fs.chmodSync(temporaryPath, 0o600);

  const plan = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });

  assert.equal(plan.candidateTemporaryFiles.length, 1);
  assert.equal(plan.candidateTemporaryFiles[0].bytes, 0);
  assert.deepEqual(plan.deletePaths.temporaryFiles, [
    path.relative(evidenceRoot, temporaryPath).split(path.sep).join("/")
  ]);
});

test("nonempty blob temporary file fails closed", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  const created = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  const temporaryPath = `${created.blobPath}.tmp-12345-12345678-1234-4234-9234-123456789abc`;
  fs.writeFileSync(temporaryPath, "partial", { mode: 0o600 });

  assert.throws(
    () => buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory }),
    /temporary.*zero|zero.*temporary/iu
  );
});

test("GC apply rejects a stale fingerprint without deleting anything", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  writeLegacyManifests(publicationDirectory);
  createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  const before = stableTreeState(path.dirname(evidenceRoot));

  assert.throws(
    () => applyEvidenceArchiveGcPlan({
      evidenceRoot,
      publicationDirectory,
      expectedPlanFingerprint: "f".repeat(64)
    }),
    /fingerprint/iu
  );
  assert.deepEqual(stableTreeState(path.dirname(evidenceRoot)), before);
});

test("GC apply removes only the exact authorized orphan plan and reaches zero candidates", (t) => {
  const { evidenceRoot, publicationDirectory } = fixture(t);
  const retained = createSet(evidenceRoot, { branch: "codex/A25-retained", stateSeed: "retained" });
  const orphan = createSet(evidenceRoot, { branch: "codex/A25-orphan", stateSeed: "orphan" });
  writeCurrentManifests(publicationDirectory, retained.index);
  const plan = buildEvidenceArchiveGcPlan({ evidenceRoot, publicationDirectory });
  let lockChecks = 0;

  const applied = applyEvidenceArchiveGcPlan({
    evidenceRoot,
    publicationDirectory,
    expectedPlanFingerprint: plan.planFingerprint,
    assertLockHealthy: () => { lockChecks += 1; }
  });

  assert.ok(lockChecks >= 4);
  assert.equal(fs.existsSync(path.join(evidenceRoot, "sets", orphan.archiveSetFingerprint)), false);
  assert.equal(fs.existsSync(path.join(evidenceRoot, "sets", retained.archiveSetFingerprint)), true);
  assert.equal(fs.existsSync(retained.blobPath), true, "shared retained blob must remain");
  assert.equal(applied.deleted.setDirectories, 1);
  assert.equal(applied.deleted.blobFiles, 0);
  assert.equal(applied.after.summary.orphanSetDirectories, 0);
  assert.equal(applied.after.summary.candidateBlobFiles, 0);
  assert.equal(applied.after.summary.candidateTemporaryFiles, 0);
});
