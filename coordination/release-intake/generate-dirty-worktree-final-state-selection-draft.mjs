#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  template: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-template.json",
  ledger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerDecisionPacket: "coordination/release-intake/latest-A25-dirty-worktree-final-state-owner-decision-packet.json",
  selectionTarget: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-draft.json",
  latestMarkdown: "coordination/release-intake/latest-A25-dirty-worktree-final-state-selection-draft.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-selection-draft.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-dirty-worktree-final-state-selection-draft.md`
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function recommendationFor(decision) {
  if (decision.sourceKind === "owner-package") {
    return {
      selectedFinalState: "reviewed commit",
      rationale: "Owner package should be reviewed and committed from its scoped package before any root cleanup."
    };
  }
  if (decision.packageKind === "root-owner-package") {
    return {
      selectedFinalState: "reviewed owner package commit",
      rationale: "Root dirty state should close through reviewed owner packages before release-source cleanup."
    };
  }
  if (decision.packageKind === "clean-diverged-branch") {
    return {
      selectedFinalState: "owner-approved PR or review package",
      rationale: "Clean diverged branch has commits ahead of main and needs PR/review-package disposition before retirement."
    };
  }
  if (decision.packageKind === "dirty-linked-worktree" || decision.packageKind === "dirty-diverged-worktree") {
    return {
      selectedFinalState: "owner-reviewed commit or package extraction",
      rationale: "Dirty linked worktree should first be reviewed, committed, or extracted into an owner package before removal."
    };
  }
  return {
    selectedFinalState: decision.allowedFinalStates?.[0] ?? "",
    rationale: "Default to the first allowed final state pending owner review."
  };
}

function decisionDraft(decision) {
  const recommendation = recommendationFor(decision);
  if (!decision.allowedFinalStates.includes(recommendation.selectedFinalState)) {
    throw new Error(`${decision.ledgerId}: recommended final state is not allowed`);
  }
  return {
    ledgerId: decision.ledgerId,
    sourceKind: decision.sourceKind,
    approvalId: decision.approvalId,
    owner: decision.owner,
    branch: decision.branch,
    path: decision.path,
    packageKind: decision.packageKind,
    priority: decision.priority,
    entries: decision.entries,
    currentBlocker: decision.currentBlocker,
    allowedFinalStates: decision.allowedFinalStates,
    selectedFinalState: recommendation.selectedFinalState,
    approvedBy: "",
    approvedAt: "",
    ownerDecision: recommendation.rationale,
    evidenceReviewed: decision.evidenceReviewed,
    notes: "DRAFT ONLY: owner or owning agent must review, edit if needed, and fill approvedBy/approvedAt before copying to the real selection file.",
    draftStatus: "needs-owner-approval",
    notApproval: true,
    recommendationRationale: recommendation.rationale
  };
}

function summarize(rows) {
  return Object.values(rows).reduce((summary, row) => {
    summary.total += 1;
    summary.bySourceKind[row.sourceKind] = (summary.bySourceKind[row.sourceKind] ?? 0) + 1;
    summary.byPackageKind[row.packageKind] = (summary.byPackageKind[row.packageKind] ?? 0) + 1;
    summary.byRecommendedFinalState[row.selectedFinalState] = (summary.byRecommendedFinalState[row.selectedFinalState] ?? 0) + 1;
    if (row.priority !== null && row.priority !== undefined) {
      summary.byPriority[`P${row.priority}`] = (summary.byPriority[`P${row.priority}`] ?? 0) + 1;
    }
    return summary;
  }, { total: 0, bySourceKind: {}, byPackageKind: {}, byPriority: {}, byRecommendedFinalState: {} });
}

function ownerOrBranch(decision) {
  if (decision.sourceKind === "owner-package") return decision.owner;
  return decision.branch || decision.path || decision.owner;
}

function markdown(payload) {
  const recommendationSummary = Object.entries(payload.summary.byRecommendedFinalState)
    .map(([state, count]) => `- ${state}: ${count}`)
    .join("\n");

  const rows = Object.values(payload.decisions).map((decision) => {
    return `| \`${decision.ledgerId}\` | ${decision.sourceKind} | ${ownerOrBranch(decision)} | ${decision.currentBlocker} | ${decision.selectedFinalState} | ${decision.draftStatus} |`;
  }).join("\n");

  const examples = Object.values(payload.decisions).slice(0, 5).map((decision) => {
    return `## ${decision.ledgerId}

- Owner or branch: ${ownerOrBranch(decision)}
- Recommended final state: ${decision.selectedFinalState}
- Rationale: ${decision.recommendationRationale}
- Evidence to review:
${decision.evidenceReviewed.map((item) => `  - \`${item}\``).join("\n")}

\`\`\`json
${JSON.stringify(decision, null, 2)}
\`\`\`
`;
  }).join("\n");

  return `# A25 Dirty-Worktree Final-State Selection Draft

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Real selection target: \`${payload.selectionTarget}\`

Draft decisions: ${payload.summary.total}

This draft is not an approval record. It must not be renamed, copied, or treated as \`${payload.selectionTarget}\` until the owner or owning agents review each row, adjust selected final states if needed, fill \`approvedBy\` and \`approvedAt\`, and confirm the evidence reviewed. This draft does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal.

${recommendationSummary}

| Ledger ID | Source kind | Owner or branch | Current blocker | Draft final state | Draft status |
| --- | --- | --- | --- | --- | --- |
${rows}

## Review Examples

${examples}
`;
}

function main() {
  for (const requiredPath of [paths.dirtyMap, paths.template, paths.ledger, paths.ownerDecisionPacket]) {
    if (!exists(requiredPath)) throw new Error(`Missing required file: ${requiredPath}`);
  }

  const dirtyMap = readJson(paths.dirtyMap);
  const template = readJson(paths.template);
  const ledger = readJson(paths.ledger);
  const ownerDecisionPacket = readJson(paths.ownerDecisionPacket);

  for (const [label, artifact] of [
    ["template", template],
    ["ledger", ledger],
    ["owner decision packet", ownerDecisionPacket]
  ]) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
      throw new Error(`${label} is stale relative to latest dirty map.`);
    }
  }

  const decisions = Object.fromEntries(
    Object.values(template.decisions ?? {}).map((decision) => {
      const draft = decisionDraft(decision);
      return [draft.ledgerId, draft];
    })
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    templateGeneratedAt: template.generatedAt,
    ledgerGeneratedAt: ledger.generatedAt,
    ownerDecisionPacketGeneratedAt: ownerDecisionPacket.generatedAt,
    selectionTarget: paths.selectionTarget,
    note: "Draft only. Owner or owning agents must approve exact rows in the real final-state selection file.",
    summary: summarize(decisions),
    decisions
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
    decisions: payload.summary.total,
    expandedStatusEntries: payload.expandedStatusEntries,
    executableOrApprovedRows: 0
  }, null, 2));
}

main();
