#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const helperPath = "coordination/release-intake/review-owner-pathspec.mjs";
const overlay = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-effective-owner-overlay.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-effective-disposition-queue.json"), "utf8"));

function latestEffectiveWorkOrders() {
  return fs.readdirSync(outDir)
    .filter((fileName) => /^latest-A25-effective-work-order-.*\.md$/.test(fileName))
    .map((fileName) => `coordination/release-intake/${fileName}`)
    .sort((left, right) => left.localeCompare(right));
}

function main() {
  const failures = [];
  if (!fs.existsSync(path.join(root, helperPath))) failures.push(`missing owner pathspec review helper: ${helperPath}`);
  if (queue.overlay.dirtyMapStatusSignature !== overlay.dirtyMap.statusSignature) {
    failures.push("effective disposition queue overlay signature is stale");
  }
  if (queue.overlay.remainingUnmappedRuntimeEntries !== 0) {
    failures.push(`queue has ${queue.overlay.remainingUnmappedRuntimeEntries} remaining unmapped runtime entries`);
  }
  if (queue.overlay.remainingUnmappedManualEntries !== 0) {
    failures.push(`queue has ${queue.overlay.remainingUnmappedManualEntries} remaining unmapped manual entries`);
  }

  const overlayOwners = new Map(overlay.ownerQueue.map((item) => [item.owner, item]));
  const queueOwners = new Map(queue.queue.map((item) => [item.owner, item]));
  for (const owner of overlayOwners.keys()) {
    if (!queueOwners.has(owner)) failures.push(`missing queue owner: ${owner}`);
  }
  for (const owner of queueOwners.keys()) {
    if (!overlayOwners.has(owner)) failures.push(`stale queue owner: ${owner}`);
  }

  const workOrderFailures = [];
  for (const item of queue.queue) {
    const workOrderPath = path.join(root, item.workOrder);
    const pathspecPath = path.join(root, item.latestPathspec);
    if (!fs.existsSync(workOrderPath)) workOrderFailures.push(`${item.owner}: missing work order`);
    else {
      const workOrder = fs.readFileSync(workOrderPath, "utf8");
      if (workOrder.includes("--pathspec-from-file")) {
        workOrderFailures.push(`${item.owner}: work order uses unsupported --pathspec-from-file review command`);
      }
      if (!workOrder.includes(`node coordination/release-intake/review-owner-pathspec.mjs ${item.latestPathspec} --status`)) {
        workOrderFailures.push(`${item.owner}: work order missing executable status review command`);
      }
      if (!workOrder.includes(`node coordination/release-intake/review-owner-pathspec.mjs ${item.latestPathspec} --diffstat`)) {
        workOrderFailures.push(`${item.owner}: work order missing executable diffstat review command`);
      }
    }
    if (!fs.existsSync(pathspecPath)) workOrderFailures.push(`${item.owner}: missing pathspec`);
  }
  const expectedCurrentWorkOrders = new Set(queue.queue.map((item) => item.workOrder));
  const expectedSuperseded = latestEffectiveWorkOrders().filter((filePath) => !expectedCurrentWorkOrders.has(filePath));
  const actualSuperseded = queue.supersededLatestWorkOrders ?? [];
  if (JSON.stringify(actualSuperseded) !== JSON.stringify(expectedSuperseded)) {
    workOrderFailures.push("superseded latest work-order list is stale");
  }
  for (const filePath of latestEffectiveWorkOrders()) {
    const markdown = fs.readFileSync(path.join(root, filePath), "utf8");
    if (markdown.includes("--pathspec-from-file")) {
      workOrderFailures.push(`${filePath}: latest work order uses unsupported --pathspec-from-file review command`);
    }
  }
  if (workOrderFailures.length > 0) failures.push(...workOrderFailures);

  const payload = {
    checkedAt: new Date().toISOString(),
    overlaySignature: overlay.dirtyMap.statusSignature,
    queueSignature: queue.overlay.dirtyMapStatusSignature,
    queueItems: queue.queue.length,
    remainingUnmappedRuntimeEntries: queue.overlay.remainingUnmappedRuntimeEntries,
    remainingUnmappedManualEntries: queue.overlay.remainingUnmappedManualEntries,
    supersededLatestWorkOrders: queue.supersededLatestWorkOrders ?? [],
    failures
  };
  fs.writeFileSync(path.join(outDir, "latest-A25-effective-disposition-queue-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("A25 effective disposition queue gate failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("A25 effective disposition queue gate passed");
  console.log(`Queue items: ${queue.queue.length}`);
}

main();
