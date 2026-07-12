#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const proposals = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-unmapped-runtime-owner-proposals.json"), "utf8"));
const manualProposalsPath = path.join(outDir, "latest-A25-unmapped-manual-owner-proposals.json");
const manualProposals = fs.existsSync(manualProposalsPath)
  ? JSON.parse(fs.readFileSync(manualProposalsPath, "utf8"))
  : { proposals: [], sourceCount: 0, confidenceBuckets: {}, proposalBuckets: {} };
const date = hktDateStamp();

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

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] ?? "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function writePathspec(fileName, paths) {
  fs.writeFileSync(path.join(outDir, fileName), `${paths.sort((left, right) => left.localeCompare(right)).join("\n")}\n`);
}

function main() {
  const proposalByPath = new Map(proposals.proposals.map((entry) => [entry.path, entry]));
  const manualProposalByPath = new Map(manualProposals.proposals.map((entry) => [entry.path, entry]));
  const effectiveEntries = dirtyMap.entries.map((entry) => {
    const proposal = entry.owner === "Unmapped runtime owner review needed" ? proposalByPath.get(entry.path) : null;
    const manualProposal = entry.owner === "Unmapped/manual owner needed" ? manualProposalByPath.get(entry.path) : null;
    const appliedProposal = proposal ?? manualProposal;
    return {
      ...entry,
      originalOwner: entry.owner,
      effectiveOwner: appliedProposal?.proposedOwner ?? entry.owner,
      effectiveOwnerSource: proposal ? "A25 unmapped runtime proposal" : manualProposal ? "A25 unmapped manual proposal" : "dirty map owner rule",
      proposalConfidence: appliedProposal?.confidence ?? null,
      proposalCoordination: appliedProposal?.coordination ?? [],
      proposalRationale: appliedProposal?.rationale ?? null
    };
  });

  const byOwner = new Map();
  for (const entry of effectiveEntries) {
    if (!byOwner.has(entry.effectiveOwner)) byOwner.set(entry.effectiveOwner, []);
    byOwner.get(entry.effectiveOwner).push(entry);
  }

  const ownerQueue = [...byOwner.entries()]
    .map(([owner, entries]) => {
      const latestPathspec = `coordination/release-intake/latest-A25-effective-owner-${slug(owner)}.pathspec`;
      const datedPathspec = `coordination/release-intake/${date}-A25-effective-owner-${slug(owner)}.pathspec`;
      const paths = entries.map((entry) => entry.path);
      writePathspec(path.basename(latestPathspec), paths);
      writePathspec(path.basename(datedPathspec), paths);
      return {
        owner,
        entries: entries.length,
        fromUnmappedRuntimeProposals: entries.filter((entry) => entry.effectiveOwnerSource === "A25 unmapped runtime proposal").length,
        sliceBuckets: countBy(entries, "slice"),
        originalOwnerBuckets: countBy(entries, "originalOwner"),
        latestPathspec,
        datedPathspec
      };
    })
    .sort((left, right) => right.entries - left.entries || left.owner.localeCompare(right.owner));

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMap: {
      latestJson: "coordination/release-intake/latest-A25-dirty-tree-map.json",
      generatedAt: dirtyMap.generatedAt,
      statusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries
    },
    proposalSource: {
      latestJson: "coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.json",
      sourceCount: proposals.sourceCount,
      confidenceBuckets: proposals.confidenceBuckets,
      proposalBuckets: proposals.proposalBuckets
    },
    manualProposalSource: {
      latestJson: "coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.json",
      sourceCount: manualProposals.sourceCount,
      confidenceBuckets: manualProposals.confidenceBuckets,
      proposalBuckets: manualProposals.proposalBuckets
    },
    effectiveOwnerCount: ownerQueue.length,
    remainingUnmappedRuntimeEntries: effectiveEntries.filter((entry) => entry.effectiveOwner === "Unmapped runtime owner review needed").length,
    remainingUnmappedManualEntries: effectiveEntries.filter((entry) => entry.effectiveOwner === "Unmapped/manual owner needed").length,
    ownerQueue,
    effectiveEntries
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-effective-owner-overlay.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-effective-owner-overlay.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-effective-owner-overlay.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-effective-owner-overlay.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-effective-owner-overlay.json",
    latestMarkdown: "coordination/release-intake/latest-A25-effective-owner-overlay.md",
    effectiveOwnerCount: payload.effectiveOwnerCount,
    remainingUnmappedRuntimeEntries: payload.remainingUnmappedRuntimeEntries
  }, null, 2));
}

function markdown(payload) {
  const rows = payload.ownerQueue.map((item) => {
    const dominantSlice = Object.entries(item.sliceBuckets)[0]?.join(": ") ?? "none";
    return `| ${item.owner} | ${item.entries} | ${item.fromUnmappedRuntimeProposals} | ${dominantSlice} | \`${item.latestPathspec}\` |`;
  }).join("\n");

  return `# ${date} A25 Effective Owner Overlay

Generated: ${payload.generatedAt}

Dirty map: \`${payload.dirtyMap.latestJson}\`

Expanded status entries: ${payload.dirtyMap.expandedStatusEntries}

Proposal source: \`${payload.proposalSource.latestJson}\`

Manual proposal source: \`${payload.manualProposalSource.latestJson}\`

Remaining unmapped runtime entries after overlay: ${payload.remainingUnmappedRuntimeEntries}

Remaining unmapped manual entries after overlay: ${payload.remainingUnmappedManualEntries}

## Effective Owner Queue

| Effective owner | Entries | From P0 proposals | Dominant slice | Pathspec |
| --- | ---: | ---: | --- | --- |
${rows}

## Notes

- This overlay does not mutate the canonical dirty map owner rules.
- It applies A25's P0 unmapped-runtime proposals as a routing layer for execution.
- It also applies A25's unmapped/manual proposals as a routing layer for execution.
- Owners still need to confirm, adjust, commit, discard, archive, or block their packages.
`;
}

main();
