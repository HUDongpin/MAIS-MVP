#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const proposals = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-unmapped-manual-owner-proposals.json"), "utf8"));

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function main() {
  const current = sorted(dirtyMap.entries.filter((entry) => entry.owner === "Unmapped/manual owner needed").map((entry) => entry.path));
  const proposed = sorted(proposals.proposals.map((entry) => entry.path));
  const missing = diff(current, proposed);
  const stale = diff(proposed, current);
  const noneConfidence = proposals.proposals.filter((entry) => entry.confidence === "none").map((entry) => entry.path);
  const payload = {
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    dirtyMapUnmappedManualCount: current.length,
    proposalSourceCount: proposals.sourceCount,
    proposalCount: proposed.length,
    proposedOwnerBuckets: proposals.proposalBuckets,
    confidenceBuckets: proposals.confidenceBuckets,
    missing,
    stale,
    noneConfidence,
    ok: missing.length === 0 && stale.length === 0 && noneConfidence.length === 0
  };
  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-manual-proposals-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (!payload.ok) {
    console.error("A25 unmapped manual proposal gate failed.");
    if (missing.length > 0) console.error(`Missing current paths: ${missing.slice(0, 20).join(", ")}`);
    if (stale.length > 0) console.error(`Stale proposed paths: ${stale.slice(0, 20).join(", ")}`);
    if (noneConfidence.length > 0) console.error(`Unassigned proposal paths: ${noneConfidence.slice(0, 20).join(", ")}`);
    process.exit(1);
  }

  console.log("A25 unmapped manual proposal gate passed");
  console.log(`Covered paths: ${proposed.length}`);
  console.log(`Proposed owner buckets: ${Object.keys(proposals.proposalBuckets).length}`);
}

main();
