#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  effectiveDispositionQueue: "coordination/release-intake/latest-A25-effective-disposition-queue.md",
  ownerDispositionQueue: "coordination/release-intake/latest-A25-owner-disposition-queue.md",
  packetJson: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.json",
  packetMarkdown: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.md",
  linkedManifest: "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.json",
  linkedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
  cleanDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.json",
  cleanDivergedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
  dirtyDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.json",
  dirtyDivergedManifestMarkdown: "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function runNode(args) {
  return execFileSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadManifest(relativePath, key, filter = () => true) {
  if (!exists(relativePath)) return new Map();
  return new Map((readJson(relativePath)[key] ?? []).filter(filter).map((entry) => [entry.branch, entry]));
}

function artifactPrefix(entry) {
  return entry?.artifactPrefix || entry?.prefix || null;
}

function evidenceFor(worktree, manifests) {
  if (worktree.branch === "main") {
    return [
      "coordination/release-intake/latest-A25-dirty-tree-map.md",
      paths.effectiveDispositionQueue,
      paths.ownerDispositionQueue
    ];
  }

  const evidence = [];
  const linked = manifests.linked.get(worktree.branch);
  if (linked) {
    const prefix = artifactPrefix(linked);
    evidence.push(paths.linkedManifestMarkdown);
    if (prefix) {
      evidence.push(`${prefix}.status.txt`, `${prefix}.diffstat.txt`, `${prefix}.patch`, `${prefix}.untracked.txt`);
    }
  }

  const cleanDiverged = manifests.cleanDiverged.get(worktree.branch);
  if (cleanDiverged) {
    const prefix = artifactPrefix(cleanDiverged);
    evidence.push(paths.cleanDivergedManifestMarkdown);
    if (prefix) {
      evidence.push(
        `${prefix}.status.txt`,
        `${prefix}.ahead-log.txt`,
        `${prefix}.name-status.txt`,
        `${prefix}.diffstat.txt`,
        `${prefix}.patch`,
        `${prefix}.untracked.txt`
      );
    }
  }

  const dirtyDiverged = manifests.dirtyDiverged.get(worktree.branch);
  if (dirtyDiverged) {
    const prefix = artifactPrefix(dirtyDiverged);
    evidence.push(paths.dirtyDivergedManifestMarkdown);
    if (prefix) evidence.push(`${prefix}.ahead-log.txt`, `${prefix}.diffstat.txt`, `${prefix}.patch`);
  }

  return evidence;
}

function ownerHints(worktree) {
  if (worktree.branch === "main") return ["A25", "A10", "A22", "effective file owners"];

  const lower = worktree.branch.toLowerCase();
  const owners = [];
  for (const id of [
    "a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10", "a11", "a12",
    "a13", "a14", "a15", "a16", "a17", "a18", "a19", "a20", "a21", "a22", "a23", "a24", "a25"
  ]) {
    if (lower.includes(id)) owners.push(id.toUpperCase());
  }
  if (lower.includes("visualization")) owners.push("A06", "A22");
  if (lower.includes("california-practice")) owners.push("A21", "A18", "A04", "A22");
  if (lower.includes("s22")) owners.push("A22", "A10");
  return [...new Set(owners.length > 0 ? owners : ["owning agent", "A25"])];
}

function requiredOwnerDecision(worktree) {
  if (worktree.branch === "main") {
    return [
      "Owner-reviewed commits by effective owner package from clean worktrees",
      "Owner-approved exact-path discard after evidence review",
      "Evidence archive final state with release-source blocker",
      "Blocker report naming package owner and reason"
    ];
  }
  if (worktree.state === "clean-diverged-open-decision") {
    return [
      "Owner-approved PR/review package from branch",
      "Owner-approved archive-state record or explicit Git tag instruction",
      "Owner-approved branch/worktree retirement after archive review",
      "Blocker report naming owner and reason"
    ];
  }
  return [
    "Owner-reviewed commit or package extraction from the worktree",
    "Owner-approved exact-path discard after archive review",
    "Evidence archive final state with retained-worktree blocker",
    "Owner-approved worktree removal only after dirty state is committed, discarded, or explicitly closed",
    "Blocker report naming owner and reason"
  ];
}

function evidenceCoverage(worktree, manifests) {
  return {
    rootOwnerPackageEvidence: worktree.branch === "main",
    dirtyLinkedArchive: manifests.linked.has(worktree.branch),
    cleanDivergedArchive: manifests.cleanDiverged.has(worktree.branch),
    dirtyDivergedArchive: manifests.dirtyDiverged.has(worktree.branch)
  };
}

function openDecisionWorktrees(lifecycle) {
  return lifecycle.worktrees.filter((worktree) => {
    return worktree.state === "dirty-open-decision" || worktree.state === "clean-diverged-open-decision";
  });
}

function statusLabel(decision) {
  if (decision.state === "dirty-open-decision") return `dirty ${decision.statusEntries}`;
  return `behind ${decision.divergence.behind}, ahead ${decision.divergence.ahead}`;
}

function coverageLabel(decision) {
  return [
    decision.evidenceCoverage.rootOwnerPackageEvidence ? "root packages" : null,
    decision.evidenceCoverage.dirtyLinkedArchive ? "dirty archive" : null,
    decision.evidenceCoverage.cleanDivergedArchive ? "clean-diverged archive" : null,
    decision.evidenceCoverage.dirtyDivergedArchive ? "dirty-diverged archive" : null
  ].filter(Boolean).join(", ") || "missing archive";
}

function markdown(packet) {
  const rows = packet.decisions.map((decision) => {
    return `| \`${decision.branch}\` | ${statusLabel(decision)} | ${decision.ownerHints.join(", ")} | ${coverageLabel(decision)} | ${decision.requiredOwnerDecision[0]} |`;
  }).join("\n");

  const sections = packet.decisions.map((decision) => {
    const evidence = decision.evidence.length > 0
      ? decision.evidence.map((item) => `  - \`${item}\``).join("\n")
      : "  - Missing archive evidence";
    return `## ${decision.branch}

- Path: \`${decision.path}\`
- State: \`${decision.state}\`
- Owners to decide: ${decision.ownerHints.join(", ")}
- Evidence:
${evidence}
- Allowed next decisions:
${decision.requiredOwnerDecision.map((item) => `  - ${item}`).join("\n")}
`;
  }).join("\n");

  return `# A25 Physical Lifecycle Closure Decision Packet

Generated: ${packet.generatedAt}

Dirty map signature: \`${packet.dirtyMapStatusSignature}\`

Expanded dirty entries: ${packet.expandedStatusEntries}

Worktrees: ${packet.worktreeCount}

Dirty open decisions: ${packet.dirtyOpenDecisionCount}

Clean-diverged open decisions: ${packet.cleanDivergedOpenDecisionCount}

This packet is decision support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, or removing worktrees.

| Branch | Current blocker | Owner decision needed from | Evidence coverage | First allowed next action |
| --- | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const lifecycle = JSON.parse(runNode(["coordination/release-intake/assert-worktree-lifecycle.mjs", "--json"]));
  const manifests = {
    linked: loadManifest(paths.linkedManifest, "archivedWorktrees", (entry) => {
      return !entry.archiveKind || entry.archiveKind === "dirty-worktree";
    }),
    cleanDiverged: loadManifest(paths.cleanDivergedManifest, "archivedBranches"),
    dirtyDiverged: loadManifest(paths.dirtyDivergedManifest, "archivedBranches")
  };

  const decisions = openDecisionWorktrees(lifecycle).map((worktree) => ({
    branch: worktree.branch,
    path: worktree.path,
    state: worktree.state,
    head: worktree.head,
    statusEntries: worktree.statusEntries,
    divergence: worktree.divergence,
    ownerHints: ownerHints(worktree),
    evidence: evidenceFor(worktree, manifests),
    evidenceCoverage: evidenceCoverage(worktree, manifests),
    requiredOwnerDecision: requiredOwnerDecision(worktree)
  }));

  const packet = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    lifecycleCheckedAt: lifecycle.checkedAt,
    worktreeCount: lifecycle.worktreeCount,
    dirtyOpenDecisionCount: lifecycle.dirtyCount,
    cleanDivergedOpenDecisionCount: lifecycle.divergedCleanCount,
    note: "Decision packet only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, or removing worktrees.",
    decisions
  };

  fs.writeFileSync(path.join(root, paths.packetJson), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(root, paths.packetMarkdown), markdown(packet));

  console.log(JSON.stringify({
    latestJson: paths.packetJson,
    latestMarkdown: paths.packetMarkdown,
    decisions: packet.decisions.length,
    expandedStatusEntries: packet.expandedStatusEntries
  }, null, 2));
}

main();
