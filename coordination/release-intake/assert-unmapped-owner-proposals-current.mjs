#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const proposals = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-unmapped-runtime-owner-proposals.json"), "utf8"));

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function main() {
  const currentUnmapped = dirtyMap.entries
    .filter((entry) => entry.owner === "Unmapped runtime owner review needed")
    .map((entry) => entry.path);
  const proposed = proposals.proposals.map((entry) => entry.path);
  const currentSorted = sorted(currentUnmapped);
  const proposedSorted = sorted(proposed);
  const missing = diff(currentSorted, proposedSorted);
  const stale = diff(proposedSorted, currentSorted);
  const noneConfidence = proposals.proposals.filter((entry) => entry.confidence === "none").map((entry) => entry.path);

  const payload = {
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    dirtyMapUnmappedRuntimeCount: currentSorted.length,
    proposalSourceCount: proposals.sourceCount,
    proposalCount: proposedSorted.length,
    proposedOwnerBuckets: proposals.proposalBuckets,
    confidenceBuckets: proposals.confidenceBuckets,
    missing,
    stale,
    noneConfidence,
    ok: missing.length === 0 && stale.length === 0 && noneConfidence.length === 0
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-owner-proposals-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (!payload.ok) {
    console.error("A25 unmapped owner proposal gate failed.");
    if (missing.length > 0) console.error(`Missing current paths: ${missing.slice(0, 20).join(", ")}`);
    if (stale.length > 0) console.error(`Stale proposed paths: ${stale.slice(0, 20).join(", ")}`);
    if (noneConfidence.length > 0) console.error(`Unassigned proposal paths: ${noneConfidence.slice(0, 20).join(", ")}`);
    process.exit(1);
  }

  console.log("A25 unmapped owner proposal gate passed");
  console.log(`Covered paths: ${proposedSorted.length}`);
  console.log(`Proposed owner buckets: ${Object.keys(proposals.proposalBuckets).length}`);
}

main();
