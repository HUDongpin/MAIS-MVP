#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  packet: "coordination/release-intake/latest-A25-physical-lifecycle-closure-decision-packet.json",
  latestJson: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json",
  latestMarkdown: "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.md",
  datedJson: `coordination/release-intake/${date}-A25-physical-lifecycle-approval-requests.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-physical-lifecycle-approval-requests.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function approvalKind(decision) {
  if (decision.branch === "main") return "root-owner-package";
  if (decision.state === "clean-diverged-open-decision") return "clean-diverged-branch";
  if (decision.evidenceCoverage?.dirtyDivergedArchive) return "dirty-diverged-worktree";
  return "dirty-linked-worktree";
}

function currentBlocker(decision) {
  if (decision.state === "dirty-open-decision") return `dirty ${decision.statusEntries}`;
  return `behind ${decision.divergence?.behind ?? 0}, ahead ${decision.divergence?.ahead ?? 0}`;
}

function approvalOptions(decision) {
  if (decision.branch === "main") {
    return [
      {
        selectedFinalState: "reviewed owner package commit",
        effect: "An owning agent commits a reviewed root package from an isolated clean worktree, then A25 refreshes inventory."
      },
      {
        selectedFinalState: "owner-approved exact-path discard",
        effect: "A separately authorized Git operation discards only the exact approved paths after evidence review."
      },
      {
        selectedFinalState: "evidence archive with release-source blocker",
        effect: "A25 preserves evidence and keeps root excluded from release sources until the package is closed."
      },
      {
        selectedFinalState: "blocker",
        effect: "A25 records the unresolved owner, package, and reason blocking closure."
      }
    ];
  }

  if (decision.state === "clean-diverged-open-decision") {
    return [
      {
        selectedFinalState: "owner-approved PR or review package",
        effect: "The owning agent promotes the branch through review without using the dirty root as release source."
      },
      {
        selectedFinalState: "archive-state record",
        effect: "A25 records the branch as preserved evidence; a real Git tag still needs separate explicit approval."
      },
      {
        selectedFinalState: "owner-approved branch or worktree retirement",
        effect: "A separately authorized Git operation may retire the branch or remove the worktree after archive review."
      },
      {
        selectedFinalState: "blocker",
        effect: "A25 records the unresolved owner, branch, and reason blocking closure."
      }
    ];
  }

  return [
    {
      selectedFinalState: "owner-reviewed commit or package extraction",
      effect: "The owning agent commits the dirty worktree slice or extracts it into a reviewed clean package."
    },
    {
      selectedFinalState: "owner-approved exact-path discard",
      effect: "A separately authorized Git operation discards only approved dirty paths after archive review."
    },
    {
      selectedFinalState: "evidence archive with retained-worktree blocker",
      effect: "A25 keeps the worktree retained and blocked after preserving patch and untracked evidence."
    },
    {
      selectedFinalState: "owner-approved worktree removal after dirty state closure",
      effect: "A separately authorized Git operation may remove the worktree only after dirty state is committed, discarded, or explicitly closed."
    },
    {
      selectedFinalState: "blocker",
      effect: "A25 records the unresolved owner, worktree, and reason blocking closure."
    }
  ];
}

function requestTemplate(request) {
  return {
    approvalId: request.approvalId,
    branch: request.branch,
    path: request.path,
    selectedFinalState: "<one allowed final state from this request>",
    approvedBy: "<owner or owning agent>",
    approvedAt: "<ISO-8601 timestamp>",
    evidenceReviewed: request.evidence,
    notes: "<scope, checks, and any exact paths if approving discard/removal>"
  };
}

function summarize(requests) {
  return requests.reduce((summary, request) => {
    summary.total += 1;
    summary.byKind[request.kind] = (summary.byKind[request.kind] ?? 0) + 1;
    if (request.branch === "main") summary.root += 1;
    if (request.state === "dirty-open-decision" && request.branch !== "main") summary.dirtyLinked += 1;
    if (request.state === "clean-diverged-open-decision") summary.cleanDiverged += 1;
    return summary;
  }, { total: 0, root: 0, dirtyLinked: 0, cleanDiverged: 0, byKind: {} });
}

function markdown(payload) {
  const rows = payload.requests.map((request) => {
    return `| \`${request.approvalId}\` | \`${request.branch}\` | ${request.kind} | ${request.currentBlocker} | ${request.ownerHints.join(", ")} | ${request.allowedFinalStates.map((item) => item.selectedFinalState).join("; ")} |`;
  }).join("\n");

  const sections = payload.requests.map((request) => {
    const evidence = request.evidence.map((item) => `  - \`${item}\``).join("\n");
    const options = request.allowedFinalStates.map((item) => `  - ${item.selectedFinalState}: ${item.effect}`).join("\n");
    return `## ${request.approvalId}

- Branch: \`${request.branch}\`
- Path: \`${request.path}\`
- State: \`${request.state}\`
- Current blocker: ${request.currentBlocker}
- Owner decision needed from: ${request.ownerHints.join(", ")}
- Evidence:
${evidence || "  - No evidence link recorded."}
- Allowed final states:
${options}
- Approval template:

\`\`\`json
${JSON.stringify(request.approvalTemplate, null, 2)}
\`\`\`
`;
  }).join("\n");

  return `# A25 Physical Lifecycle Approval Requests

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Worktrees: ${payload.worktreeCount}

Requests: ${payload.summary.total}

- Root package requests: ${payload.summary.root}
- Dirty linked worktree requests: ${payload.summary.dirtyLinked}
- Clean-diverged branch requests: ${payload.summary.cleanDiverged}

This artifact is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. Every destructive action still requires a separate explicit owner instruction naming the exact branch, worktree, or pathspec package.

| Approval ID | Branch | Kind | Current blocker | Owner decision needed from | Allowed final states |
| --- | --- | --- | --- | --- | --- |
${rows}

${sections}`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const packet = readJson(paths.packet);
  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Physical lifecycle packet is stale relative to latest dirty map. Regenerate it first.");
  }

  const requests = (packet.decisions ?? []).map((decision) => {
    const approvalId = slug(decision.branch === "main" ? "root-main" : decision.branch);
    const request = {
      approvalId,
      branch: decision.branch,
      path: decision.path,
      state: decision.state,
      kind: approvalKind(decision),
      currentBlocker: currentBlocker(decision),
      ownerHints: decision.ownerHints ?? [],
      evidence: decision.evidence ?? [],
      evidenceCoverage: decision.evidenceCoverage ?? {},
      allowedFinalStates: approvalOptions(decision)
    };
    return {
      ...request,
      approvalTemplate: requestTemplate(request)
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    physicalPacketGeneratedAt: packet.generatedAt,
    worktreeCount: packet.worktreeCount,
    dirtyOpenDecisionCount: packet.dirtyOpenDecisionCount,
    cleanDivergedOpenDecisionCount: packet.cleanDivergedOpenDecisionCount,
    summary: summarize(requests),
    note: "Approval support only. Destructive Git actions require separate explicit owner authorization.",
    requests
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    requests: payload.summary.total,
    root: payload.summary.root,
    dirtyLinked: payload.summary.dirtyLinked,
    cleanDiverged: payload.summary.cleanDiverged
  }, null, 2));
}

main();
