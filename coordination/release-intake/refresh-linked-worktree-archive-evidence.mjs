#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const archiveDir = path.join(root, "coordination", "release-intake", "archive");
const linkedManifestPath = path.join(archiveDir, "2026-06-30-A25-linked-worktree-archive-manifest.json");
const linkedManifestMarkdownPath = path.join(archiveDir, "2026-06-30-A25-linked-worktree-archive-manifest.md");
const cleanDivergedManifestPath = path.join(archiveDir, "2026-06-30-A25-clean-diverged-branch-archive-manifest.json");
const cleanDivergedManifestMarkdownPath = path.join(archiveDir, "2026-06-30-A25-clean-diverged-branch-archive-manifest.md");
const dirtyDivergedManifestPath = path.join(archiveDir, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.json");
const dirtyDivergedManifestMarkdownPath = path.join(archiveDir, "2026-06-30-A25-dirty-diverged-branch-archive-manifest.md");

const secretPathPattern = /(^|\/)(\.env($|\.)|\.env\.local$|id_rsa$|id_dsa$|id_ed25519$|.*\.(pem|p12|pfx|key)$)/i;

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function splitLines(value) {
  return String(value ?? "").split("\n").filter(Boolean);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function relative(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function slug(value) {
  return String(value)
    .trim()
    .replace(/^refs\/heads\//, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function fileSize(absolutePath) {
  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
}

function sha256(absolutePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
}

function writeText(absolutePath, content) {
  fs.writeFileSync(absolutePath, `${String(content ?? "").replace(/\s+$/u, "")}\n`);
}

function writeJson(absolutePath, value) {
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseWorktrees() {
  return git(["worktree", "list", "--porcelain"])
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const entry = { path: "", branch: "", head: "", detached: false, prunable: false };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length);
        else if (line.startsWith("HEAD ")) entry.head = line.slice("HEAD ".length);
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch refs/heads/".length);
        else if (line === "detached") entry.detached = true;
        else if (line.startsWith("prunable")) entry.prunable = true;
      }
      if (!entry.branch && entry.detached) entry.branch = "(detached)";
      return classifyWorktree(entry);
    });
}

function classifyWorktree(entry) {
  const exists = fs.existsSync(entry.path);
  const statusLines = exists ? splitLines(git(["status", "--porcelain=v1", "-uall"], entry.path)) : [];
  const untracked = exists ? splitLines(git(["ls-files", "--others", "--exclude-standard"], entry.path)).sort() : [];
  const divergence = exists
    ? (() => {
        const [behind, ahead] = git(["rev-list", "--left-right", "--count", "main...HEAD"], entry.path).split(/\s+/).map(Number);
        return { behind, ahead };
      })()
    : { behind: 0, ahead: 0 };
  const state = statusLines.length > 0
    ? "dirty-worktree"
    : divergence.behind > 0 || divergence.ahead > 0
      ? "clean-diverged-branch"
      : "clean-current";

  return {
    path: entry.path,
    branch: entry.branch,
    head: entry.head,
    exists,
    prunable: entry.prunable,
    state,
    statusLines,
    statusEntries: statusLines.length,
    untracked,
    untrackedEntries: untracked.length,
    divergence
  };
}

function assertNoSecretPaths(worktree) {
  const paths = [
    ...worktree.statusLines.map((line) => line.slice(3)),
    ...worktree.untracked
  ];
  const blocked = paths.filter((item) => secretPathPattern.test(item));
  if (blocked.length > 0) {
    throw new Error(`${worktree.branch}: refusing to archive secret-looking paths: ${blocked.join(", ")}`);
  }
}

function prefixFor(worktree, suffix = "") {
  return path.join(archiveDir, `${slug(worktree.branch)}${suffix}`);
}

function archiveDirtyWorktree(worktree) {
  assertNoSecretPaths(worktree);
  const prefix = prefixFor(worktree);
  const statusPath = `${prefix}.status.txt`;
  const diffstatPath = `${prefix}.diffstat.txt`;
  const patchPath = `${prefix}.patch`;
  const untrackedPath = `${prefix}.untracked.txt`;
  const untrackedTarPath = `${prefix}.untracked.tar.gz`;

  const patch = git(["diff", "--binary"], worktree.path);
  const diffstat = git(["diff", "--stat"], worktree.path) || "No tracked diff.";

  writeText(statusPath, worktree.statusLines.join("\n") || "clean");
  writeText(diffstatPath, diffstat);
  writeText(patchPath, patch);
  writeText(untrackedPath, worktree.untracked.join("\n") || "none");

  let untrackedArchiveBytes = 0;
  let untrackedArchiveSha256 = null;
  if (worktree.untracked.length > 0) {
    const listPath = `${prefix}.untracked.tar-list`;
    writeText(listPath, worktree.untracked.join("\n"));
    execFileSync("tar", ["-czf", untrackedTarPath, "-C", worktree.path, "-T", listPath], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    fs.rmSync(listPath, { force: true });
    untrackedArchiveBytes = fileSize(untrackedTarPath);
    untrackedArchiveSha256 = sha256(untrackedTarPath);
  } else {
    fs.rmSync(untrackedTarPath, { force: true });
  }

  return {
    branch: worktree.branch,
    path: worktree.path,
    lifecycleState: "dirty-active-review-required",
    head: worktree.head,
    divergence: worktree.divergence,
    statusEntries: worktree.statusEntries,
    patchBytes: fileSize(patchPath),
    patchSha256: sha256(patchPath),
    untrackedEntries: worktree.untrackedEntries,
    untrackedArchiveBytes,
    untrackedArchiveSha256,
    prefix: relative(prefix),
    archiveKind: "dirty-worktree"
  };
}

function archiveBranchDelta(worktree, suffix, archiveKind) {
  const prefix = prefixFor(worktree, suffix);
  const statusPath = `${prefix}.status.txt`;
  const aheadLogPath = `${prefix}.ahead-log.txt`;
  const nameStatusPath = `${prefix}.name-status.txt`;
  const diffstatPath = `${prefix}.diffstat.txt`;
  const patchPath = `${prefix}.patch`;
  const untrackedPath = `${prefix}.untracked.txt`;
  const metadataPath = `${prefix}.metadata.json`;

  const aheadLog = git(["log", "--oneline", "--decorate", "main..HEAD"], worktree.path);
  const nameStatus = git(["diff", "--name-status", "main...HEAD"], worktree.path);
  const diffstat = git(["diff", "--stat", "main...HEAD"], worktree.path) || "No branch diff.";
  const patch = git(["diff", "--binary", "main...HEAD"], worktree.path);

  writeText(statusPath, worktree.statusLines.join("\n") || "clean");
  writeText(aheadLogPath, aheadLog || "No ahead commits.");
  writeText(nameStatusPath, nameStatus || "No branch path changes.");
  writeText(diffstatPath, diffstat);
  writeText(patchPath, patch);
  writeText(untrackedPath, worktree.untracked.join("\n") || "none");

  const metadata = {
    branch: worktree.branch,
    path: worktree.path,
    archiveKind,
    head: worktree.head,
    divergence: worktree.divergence,
    statusEntries: worktree.statusEntries,
    untrackedEntries: worktree.untrackedEntries,
    aheadLog: relative(aheadLogPath),
    nameStatus: relative(nameStatusPath),
    diffstat: relative(diffstatPath),
    patch: relative(patchPath),
    patchBytes: fileSize(patchPath),
    patchSha256: sha256(patchPath),
    status: relative(statusPath),
    untracked: relative(untrackedPath)
  };
  writeJson(metadataPath, metadata);
  return {
    ...metadata,
    prefix: relative(prefix),
    metadata: relative(metadataPath)
  };
}

function linkedMarkdown(manifest) {
  const rows = manifest.archivedWorktrees.map((entry) => {
    return `| \`${entry.branch}\` | ${entry.archiveKind} | ${entry.statusEntries} | ${entry.untrackedEntries ?? 0} | ${entry.patchBytes ?? 0} | ${entry.untrackedArchiveBytes ?? 0} | ${entry.divergence?.ahead ?? ""} | \`${entry.prefix}\` |`;
  }).join("\n");
  return `# 2026-06-30 A25 Linked Worktree Archive Manifest

Generated: ${manifest.generatedAt}

Dirty map signature: \`${manifest.dirtyMapStatusSignature}\`

A25 linked-worktree archive manifest. Dirty worktree entries include tracked patches, untracked lists, and untracked-content tarballs. Clean-diverged entries include ahead logs and branch diffs.

| Branch | Kind | Status entries | Untracked entries | Patch bytes | Untracked archive bytes | Ahead commits | Artifact prefix |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${rows}
`;
}

function branchManifestMarkdown(title, manifest) {
  const rows = manifest.archivedBranches.map((entry) => {
    return `| \`${entry.branch}\` | ${entry.statusEntries} | ${entry.divergence?.ahead ?? 0} | ${entry.patchBytes ?? 0} | \`${entry.prefix}\` |`;
  }).join("\n");
  return `# ${title}

Generated: ${manifest.generatedAt}

Dirty map signature: \`${manifest.dirtyMapStatusSignature}\`

| Branch | Status entries | Ahead commits | Patch bytes | Artifact prefix |
| --- | ---: | ---: | ---: | --- |
${rows || "| none | 0 | 0 | 0 | none |"}
`;
}

function main() {
  fs.mkdirSync(archiveDir, { recursive: true });
  const dirtyMap = readJson("coordination/release-intake/latest-A25-dirty-tree-map.json");
  const generatedAt = new Date().toISOString();
  const worktrees = parseWorktrees().filter((worktree) => {
    return worktree.branch !== "main"
      && worktree.exists
      && !worktree.prunable
      && (worktree.state === "dirty-worktree" || worktree.state === "clean-diverged-branch");
  });

  const dirtyArchives = [];
  const cleanDivergedArchives = [];
  const dirtyDivergedArchives = [];

  for (const worktree of worktrees) {
    if (worktree.state === "dirty-worktree") {
      dirtyArchives.push(archiveDirtyWorktree(worktree));
      if (worktree.divergence.behind > 0 || worktree.divergence.ahead > 0) {
        dirtyDivergedArchives.push(archiveBranchDelta(worktree, ".dirty-diverged", "dirty-diverged-branch"));
      }
    } else if (worktree.state === "clean-diverged-branch") {
      cleanDivergedArchives.push(archiveBranchDelta(worktree, ".clean-diverged", "clean-diverged-branch"));
    }
  }

  const linkedManifest = {
    generatedAt,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    note: "A25 linked-worktree archive manifest. Dirty worktree entries include tracked patches, untracked lists, and untracked-content tarballs. Clean-diverged entries include ahead logs and branch diffs.",
    archivedWorktrees: [...dirtyArchives, ...cleanDivergedArchives].sort((left, right) => left.branch.localeCompare(right.branch))
  };
  const cleanDivergedManifest = {
    generatedAt,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    archivedBranches: cleanDivergedArchives.sort((left, right) => left.branch.localeCompare(right.branch))
  };
  const dirtyDivergedManifest = {
    generatedAt,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    archivedBranches: dirtyDivergedArchives.sort((left, right) => left.branch.localeCompare(right.branch))
  };

  writeJson(linkedManifestPath, linkedManifest);
  writeText(linkedManifestMarkdownPath, linkedMarkdown(linkedManifest));
  writeJson(cleanDivergedManifestPath, cleanDivergedManifest);
  writeText(cleanDivergedManifestMarkdownPath, branchManifestMarkdown("2026-06-30 A25 Clean-Diverged Branch Archive Manifest", cleanDivergedManifest));
  writeJson(dirtyDivergedManifestPath, dirtyDivergedManifest);
  writeText(dirtyDivergedManifestMarkdownPath, branchManifestMarkdown("2026-06-30 A25 Dirty-Diverged Branch Archive Manifest", dirtyDivergedManifest));

  console.log(JSON.stringify({
    linkedManifest: relative(linkedManifestPath),
    dirtyLinkedWorktrees: dirtyArchives.length,
    cleanDivergedBranches: cleanDivergedArchives.length,
    dirtyDivergedBranches: dirtyDivergedArchives.length,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries
  }, null, 2));
}

main();
