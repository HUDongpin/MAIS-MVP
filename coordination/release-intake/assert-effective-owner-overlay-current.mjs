#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const proposals = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-unmapped-runtime-owner-proposals.json"), "utf8"));
const manualProposals = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-unmapped-manual-owner-proposals.json"), "utf8"));
const overlay = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-effective-owner-overlay.json"), "utf8"));

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function readLines(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8").split("\n").filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function main() {
  const failures = [];
  if (overlay.dirtyMap.statusSignature !== dirtyMap.statusSignature) {
    failures.push("overlay dirty-map signature is stale");
  }

  const currentPaths = sorted(dirtyMap.entries.map((entry) => entry.path));
  const overlayPaths = sorted(overlay.effectiveEntries.map((entry) => entry.path));
  const missing = diff(currentPaths, overlayPaths);
  const stale = diff(overlayPaths, currentPaths);
  if (missing.length > 0) failures.push(`overlay missing ${missing.length} current dirty paths`);
  if (stale.length > 0) failures.push(`overlay has ${stale.length} stale paths`);

  const currentUnmapped = dirtyMap.entries.filter((entry) => entry.owner === "Unmapped runtime owner review needed").map((entry) => entry.path);
  const proposalPaths = new Set(proposals.proposals.map((entry) => entry.path));
  const unmappedWithoutProposal = currentUnmapped.filter((filePath) => !proposalPaths.has(filePath));
  if (unmappedWithoutProposal.length > 0) failures.push(`unmapped runtime paths without proposals: ${unmappedWithoutProposal.length}`);
  if (overlay.remainingUnmappedRuntimeEntries !== 0) failures.push(`overlay still has ${overlay.remainingUnmappedRuntimeEntries} unmapped runtime entries`);

  const currentManual = dirtyMap.entries.filter((entry) => entry.owner === "Unmapped/manual owner needed").map((entry) => entry.path);
  const manualProposalPaths = new Set(manualProposals.proposals.map((entry) => entry.path));
  const manualWithoutProposal = currentManual.filter((filePath) => !manualProposalPaths.has(filePath));
  if (manualWithoutProposal.length > 0) failures.push(`unmapped manual paths without proposals: ${manualWithoutProposal.length}`);
  if (overlay.remainingUnmappedManualEntries !== 0) failures.push(`overlay still has ${overlay.remainingUnmappedManualEntries} unmapped manual entries`);

  const pathspecFailures = [];
  for (const item of overlay.ownerQueue) {
    const expected = sorted(overlay.effectiveEntries.filter((entry) => entry.effectiveOwner === item.owner).map((entry) => entry.path));
    const actual = readLines(item.latestPathspec);
    const missingFromPathspec = diff(expected, actual);
    const extraInPathspec = diff(actual, expected);
    if (missingFromPathspec.length > 0 || extraInPathspec.length > 0) {
      pathspecFailures.push({ owner: item.owner, missing: missingFromPathspec.slice(0, 10), extra: extraInPathspec.slice(0, 10) });
    }
  }
  if (pathspecFailures.length > 0) failures.push(`effective owner pathspec mismatches: ${pathspecFailures.length}`);

  const payload = {
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    effectiveOwnerCount: overlay.effectiveOwnerCount,
    dirtyMapEntries: dirtyMap.entries.length,
    overlayEntries: overlay.effectiveEntries.length,
    currentUnmappedRuntimeEntries: currentUnmapped.length,
    overlayRemainingUnmappedRuntimeEntries: overlay.remainingUnmappedRuntimeEntries,
    proposalCount: proposals.proposals.length,
    currentUnmappedManualEntries: currentManual.length,
    overlayRemainingUnmappedManualEntries: overlay.remainingUnmappedManualEntries,
    manualProposalCount: manualProposals.proposals.length,
    failures,
    pathspecFailures
  };
  fs.writeFileSync(path.join(outDir, "latest-A25-effective-owner-overlay-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("A25 effective owner overlay gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("A25 effective owner overlay gate passed");
  console.log(`Effective owners: ${overlay.effectiveOwnerCount}`);
  console.log(`Overlay entries: ${overlay.effectiveEntries.length}`);
}

main();
