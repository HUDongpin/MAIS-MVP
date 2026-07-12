#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const overlay = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-effective-owner-overlay.json"), "utf8"));
const date = hktDateStamp();

const PRIORITY_RULES = [
  [/Unmapped\/manual owner needed/, 0, "Manual owner classification remains required."],
  [/A22 production reliability/, 1, "Release-source and deploy hygiene package."],
  [/A25 git hygiene/, 1, "Release-intake evidence package."],
  [/A06 visualization/, 2, "Largest runtime/test package and linked dirty visualization worktree."],
  [/A12 backend\/API/, 2, "High-risk API/storage package."],
  [/A11 QA/, 2, "Regression and release-quality package."],
  [/A10 tooling/, 3, "Shared docs/config/tooling package."],
  [/A18 curriculum QA \/ A21 content pipeline/, 3, "Content QA/candidate package crossing promotion gates."],
  [/A21 content pipeline/, 3, "Generated/RAG backlog package."],
  [/A04 practice/, 3, "Practice/question-bank package, including P0 reassignment."],
  [/A05 lesson/, 3, "Lesson/source-link package, including P0 reassignment."],
  [/A03 curriculum roadmap/, 3, "Roadmap/topic package, including P0 reassignment."]
];

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function priorityFor(owner) {
  const match = PRIORITY_RULES.find(([pattern]) => pattern.test(owner));
  if (match) return { priority: match[1], reason: match[2] };
  return { priority: 4, reason: "Standard owner package." };
}

function dominantBucket(buckets) {
  const [name, count] = Object.entries(buckets)[0] ?? ["none", 0];
  return { name, count };
}

function workOrder(ownerItem, entries) {
  const statusBuckets = countBy(entries, "status");
  const confidenceBuckets = countBy(entries.filter((entry) => entry.proposalConfidence), "proposalConfidence");
  const dominantSlice = dominantBucket(ownerItem.sliceBuckets);
  const topPaths = entries.slice(0, 80).map((entry) => `- \`${entry.status.trim() || "M"}\` \`${entry.path}\`${entry.fromUnmappedRuntime ? " (from P0 proposal)" : ""}`).join("\n");
  return `# ${date} A25 Effective Work Order - ${ownerItem.owner}

- Owner: ${ownerItem.owner}
- Priority: P${ownerItem.priority}
- Reason: ${ownerItem.priorityReason}
- Entries: ${ownerItem.entries}
- From P0 proposals: ${ownerItem.fromUnmappedRuntimeProposals}
- Dominant slice: ${dominantSlice.name}: ${dominantSlice.count}
- Pathspec: \`${ownerItem.latestPathspec}\`

## Required Final State

Reviewed commit, owner-approved discard, evidence archive, or blocker.

## Suggested Commands

\`\`\`bash
node coordination/release-intake/review-owner-pathspec.mjs ${ownerItem.latestPathspec} --status
node coordination/release-intake/review-owner-pathspec.mjs ${ownerItem.latestPathspec} --diffstat
\`\`\`

## Status Buckets

${Object.entries(statusBuckets).map(([name, count]) => `- \`${name.trim() || "M"}\`: ${count}`).join("\n")}

## P0 Proposal Confidence

${Object.keys(confidenceBuckets).length > 0 ? Object.entries(confidenceBuckets).map(([name, count]) => `- ${name}: ${count}`).join("\n") : "- No P0 proposal entries in this package."}

## Path Sample

${topPaths}
`;
}

function supersededWorkOrder(filePath, currentWorkOrders) {
  const currentList = currentWorkOrders.map((item) => `- \`${item}\``).join("\n");
  return `# ${date} A25 Superseded Effective Work Order

Generated: ${new Date().toISOString()}

This latest work-order file is no longer part of the current effective disposition queue.

- Superseded file: \`${filePath}\`
- Current queue: \`coordination/release-intake/latest-A25-effective-disposition-queue.json\`
- Current work orders:
${currentList || "- none"}

## Required Gates

- \`node coordination/release-intake/assert-effective-disposition-queue-current.mjs\`
- \`npm run release:dirty-map -- --assert-current --max-age-minutes 60\`
`;
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] ?? "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function main() {
  const entriesByOwner = new Map();
  for (const entry of overlay.effectiveEntries) {
    if (!entriesByOwner.has(entry.effectiveOwner)) entriesByOwner.set(entry.effectiveOwner, []);
    entriesByOwner.get(entry.effectiveOwner).push({
      ...entry,
      fromUnmappedRuntime: entry.effectiveOwnerSource === "A25 unmapped runtime proposal"
    });
  }

  const currentWorkOrders = new Set();
  const queue = overlay.ownerQueue
    .map((item) => {
      const priority = priorityFor(item.owner);
      const entries = entriesByOwner.get(item.owner) ?? [];
      const workOrderFile = `coordination/release-intake/latest-A25-effective-work-order-${slug(item.owner)}.md`;
      const datedWorkOrderFile = `coordination/release-intake/${date}-A25-effective-work-order-${slug(item.owner)}.md`;
      currentWorkOrders.add(workOrderFile);
      const queueItem = {
        ...item,
        priority: priority.priority,
        priorityReason: priority.reason,
        workOrder: workOrderFile,
        datedWorkOrder: datedWorkOrderFile,
        requiredFinalState: "reviewed commit, owner-approved discard, evidence archive, or blocker"
      };
      const markdown = workOrder(queueItem, entries);
      fs.writeFileSync(path.join(root, workOrderFile), markdown);
      fs.writeFileSync(path.join(root, datedWorkOrderFile), markdown);
      return queueItem;
    })
    .sort((left, right) => left.priority - right.priority || right.entries - left.entries || left.owner.localeCompare(right.owner));

  const latestWorkOrderDir = path.join(root, "coordination", "release-intake");
  const existingLatestWorkOrders = fs.readdirSync(latestWorkOrderDir)
    .filter((fileName) => /^latest-A25-effective-work-order-.*\.md$/.test(fileName))
    .map((fileName) => `coordination/release-intake/${fileName}`)
    .filter((filePath) => !currentWorkOrders.has(filePath));
  const sortedCurrentWorkOrders = [...currentWorkOrders].sort((left, right) => left.localeCompare(right));
  for (const filePath of existingLatestWorkOrders) {
    fs.writeFileSync(path.join(root, filePath), supersededWorkOrder(filePath, sortedCurrentWorkOrders));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    overlay: {
      latestJson: "coordination/release-intake/latest-A25-effective-owner-overlay.json",
      dirtyMapStatusSignature: overlay.dirtyMap.statusSignature,
      expandedStatusEntries: overlay.dirtyMap.expandedStatusEntries,
      remainingUnmappedRuntimeEntries: overlay.remainingUnmappedRuntimeEntries,
      remainingUnmappedManualEntries: overlay.remainingUnmappedManualEntries
    },
    queue,
    supersededLatestWorkOrders: existingLatestWorkOrders.sort((left, right) => left.localeCompare(right))
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-effective-disposition-queue.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-effective-disposition-queue.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-effective-disposition-queue.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-effective-disposition-queue.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-effective-disposition-queue.json",
    latestMarkdown: "coordination/release-intake/latest-A25-effective-disposition-queue.md",
    queueItems: queue.length,
    p0: queue.filter((item) => item.priority === 0).length,
    p1: queue.filter((item) => item.priority === 1).length,
    p2: queue.filter((item) => item.priority === 2).length
  }, null, 2));
}

function markdown(payload) {
  const rows = payload.queue.map((item) => {
    const dominantSlice = dominantBucket(item.sliceBuckets);
    return `| P${item.priority} | ${item.owner} | ${item.entries} | ${item.fromUnmappedRuntimeProposals} | ${dominantSlice.name}: ${dominantSlice.count} | \`${item.latestPathspec}\` | \`${item.workOrder}\` | ${item.priorityReason} |`;
  }).join("\n");

  return `# ${date} A25 Effective Disposition Queue

Generated: ${payload.generatedAt}

Overlay: \`${payload.overlay.latestJson}\`

Expanded status entries: ${payload.overlay.expandedStatusEntries}

Remaining unmapped runtime entries: ${payload.overlay.remainingUnmappedRuntimeEntries}

Remaining unmapped manual entries: ${payload.overlay.remainingUnmappedManualEntries}

## Queue

| Priority | Effective owner | Entries | From P0 | Dominant slice | Pathspec | Work order | Reason |
| ---: | --- | ---: | ---: | --- | --- | --- | --- |
${rows}

## Required Gates

- \`npm run release:dirty-map -- --assert-current --max-age-minutes 60\`
- \`node coordination/release-intake/assert-effective-owner-overlay-current.mjs\`
- \`node coordination/release-intake/assert-effective-disposition-queue-current.mjs\`
- \`node coordination/release-intake/assert-secret-env-quarantine.mjs\`
- \`node coordination/release-intake/assert-disposition-evidence-current.mjs\`
- \`node coordination/release-intake/assert-worktree-lifecycle.mjs\`
`;
}

main();
