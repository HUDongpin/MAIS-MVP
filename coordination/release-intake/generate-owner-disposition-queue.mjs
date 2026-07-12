#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const dashboard = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-worktree-hygiene-dashboard.json"), "utf8"));
const date = hktDateStamp();

const PRIORITY_RULES = [
  [/Unmapped runtime owner review needed/, 0, "Assign owner before any release or commit package."],
  [/A22 production reliability/, 1, "Release gate and deploy-source hygiene."],
  [/A25 git hygiene/, 1, "Release-intake evidence should be reviewed/committed as one coordination package."],
  [/A06 visualization/, 2, "Largest dirty owner package; also linked to dirty visualization worktree."],
  [/A12 backend\/API/, 2, "High-risk API/storage surface; requires contract tests."],
  [/A11 QA/, 2, "Regression evidence should be split by owning product surface."],
  [/A10 tooling/, 3, "Shared coordination/config surface."],
  [/A18 curriculum QA \/ A21 content pipeline/, 3, "Content QA and generation pipeline must stay separated."],
  [/A21 content pipeline/, 3, "Generated/RAG backlog requires provenance review."],
  [/Unmapped\/manual/, 3, "Manual classification required."],
];

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function priorityFor(owner) {
  const match = PRIORITY_RULES.find(([pattern]) => pattern.test(owner));
  if (match) return { priority: match[1], reason: match[2] };
  return { priority: 4, reason: "Standard owner review package." };
}

function dominantBucket(buckets) {
  const [name, count] = Object.entries(buckets)[0] ?? ["none", 0];
  return { name, count };
}

function commandFor(item) {
  return [
    `node coordination/release-intake/review-owner-pathspec.mjs ${item.latestPathspec} --status`,
    `node coordination/release-intake/review-owner-pathspec.mjs ${item.latestPathspec} --diffstat`,
    item.acceptanceCheck
  ];
}

function main() {
  const queue = dashboard.ownerBoard
    .map((item) => {
      const priority = priorityFor(item.owner);
      const dominantSlice = dominantBucket(item.sliceBuckets);
      return {
        ...item,
        priority: priority.priority,
        priorityReason: priority.reason,
        dominantSlice,
        recommendedCommands: commandFor(item),
        requiredFinalState: "reviewed commit, owner-approved discard, evidence archive, or blocker"
      };
    })
    .sort((left, right) => left.priority - right.priority || right.dirtyEntries - left.dirtyEntries || left.owner.localeCompare(right.owner));

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMap: {
      latestJson: "coordination/release-intake/latest-A25-dirty-tree-map.json",
      generatedAt: dirtyMap.generatedAt,
      statusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries
    },
    gates: [
      {
        name: "dirty map current",
        command: "npm run release:dirty-map -- --assert-current --max-age-minutes 60"
      },
      {
        name: "owner pathspecs current",
        command: "node coordination/release-intake/assert-owner-pathspecs-current.mjs"
      },
      {
        name: "unmapped runtime owner proposals current",
        command: "node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs"
      },
      {
        name: "effective owner overlay current",
        command: "node coordination/release-intake/assert-effective-owner-overlay-current.mjs"
      },
      {
        name: "unmapped manual owner proposals current",
        command: "node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs"
      },
      {
        name: "secret/env quarantine",
        command: "node coordination/release-intake/assert-secret-env-quarantine.mjs"
      },
      {
        name: "disposition evidence current",
        command: "node coordination/release-intake/assert-disposition-evidence-current.mjs"
      },
      {
        name: "worktree lifecycle normal",
        command: "node coordination/release-intake/assert-worktree-lifecycle.mjs"
      },
      {
        name: "release source clean",
        command: "node coordination/release-intake/assert-release-source-clean.mjs"
      },
      {
        name: "worktree lifecycle strict closure",
        command: "node coordination/release-intake/assert-worktree-lifecycle.mjs --strict"
      }
    ],
    queue
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-owner-disposition-queue.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-owner-disposition-queue.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-owner-disposition-queue.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-owner-disposition-queue.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-owner-disposition-queue.json",
    latestMarkdown: "coordination/release-intake/latest-A25-owner-disposition-queue.md",
    queueItems: queue.length,
    p0: queue.filter((item) => item.priority === 0).length,
    p1: queue.filter((item) => item.priority === 1).length,
    p2: queue.filter((item) => item.priority === 2).length
  }, null, 2));
}

function markdown(payload) {
  return `# ${date} A25 Owner Disposition Queue

Generated: ${payload.generatedAt}

Dirty map: \`${payload.dirtyMap.latestJson}\`

Expanded status entries: ${payload.dirtyMap.expandedStatusEntries}

Status signature: \`${payload.dirtyMap.statusSignature}\`

## Required Gates

${payload.gates.map((gate) => `- ${gate.name}: \`${gate.command}\``).join("\n")}

## Queue

| Priority | Owner | Entries | Dominant slice | Pathspec | Required final state | Reason |
| ---: | --- | ---: | --- | --- | --- | --- |
${payload.queue
  .map((item) => `| P${item.priority} | ${item.owner} | ${item.dirtyEntries} | ${item.dominantSlice.name}: ${item.dominantSlice.count} | \`${item.latestPathspec}\` | ${item.requiredFinalState} | ${item.priorityReason} |`)
  .join("\n")}

## Usage

- Start with P0/P1 packages.
- Use each row's pathspec for focused review only.
- Do not mix neighboring dirty files into a package.
- Every package must end as reviewed commit, owner-approved discard, evidence archive, or blocker.
`;
}

main();
