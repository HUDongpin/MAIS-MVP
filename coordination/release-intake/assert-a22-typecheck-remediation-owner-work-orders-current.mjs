#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS,
  buildA22TypecheckRemediationOwnerWorkOrders,
  stableA22TypecheckRemediationOwnerWorkOrdersProjection
} from "./generate-a22-typecheck-remediation-owner-work-orders.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-typecheck-remediation-owner-work-orders-current-gate.json");
const json = process.argv.includes("--json");

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function byId(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

function main() {
  const failures = [];
  for (const requiredPath of [
    A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestJson,
    A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestJson);
  const current = buildA22TypecheckRemediationOwnerWorkOrders();
  if (!sameJson(
    stableA22TypecheckRemediationOwnerWorkOrdersProjection(recorded),
    stableA22TypecheckRemediationOwnerWorkOrdersProjection(current)
  )) {
    failures.push("A22 typecheck remediation owner work orders are stale");
  }

  const routing = readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.remediationRouting);
  const typeCheck = readJson(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.topCandidateTypeCheck);
  const typeCheckPassed = typeCheck.summary?.typeCheckPassed === true;
  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const workOrders = recorded.workOrders ?? [];

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (recorded.remediationStatus !== routing.remediationStatus) failures.push("remediationStatus must match routing packet");
  if (recorded.topCandidate?.branch !== routing.topCandidate?.branch) failures.push("top candidate branch must match routing packet");
  if (recorded.topCandidate?.path !== routing.topCandidate?.path) failures.push("top candidate path must match routing packet");

  if (typeCheckPassed) {
    if (recorded.ownerWorkOrderStatus !== "not-required-typecheck-green") failures.push("green type-check must not require owner work orders");
    if (workOrders.length !== 0) failures.push("green type-check must have zero work orders");
  } else {
    if (recorded.ownerWorkOrderStatus !== "ready-for-owner-remediation") failures.push("red type-check must produce ready-for-owner-remediation work orders");
    if (workOrders.length !== (routing.ownerRoutes ?? []).length) failures.push("work order count must match routing owner route count");
    for (const ownerId of (routing.ownerRoutes ?? []).map((row) => row.ownerId).filter(Boolean)) {
      if (!workOrders.some((row) => row.ownerId === ownerId)) failures.push(`missing owner work order for ${ownerId}`);
    }
    if ((summary.routedErrorRows ?? 0) !== (routing.summary?.routedErrorRows ?? -1)) failures.push("routedErrorRows must match routing summary");
  }

  for (const order of workOrders) {
    if (!order.workOrderId?.startsWith("a22-typecheck-remediation-")) failures.push(`${order.ownerId}: invalid workOrderId`);
    if (!order.ownerId) failures.push("work order missing ownerId");
    if (!order.objective) failures.push(`${order.ownerId}: missing objective`);
    if ((order.allowedWriteScope ?? []).length === 0) failures.push(`${order.ownerId}: missing allowedWriteScope`);
    if ((order.checks ?? []).length < 6) failures.push(`${order.ownerId}: missing validation command sequence`);
    if ((order.acceptanceCriteria ?? []).length === 0) failures.push(`${order.ownerId}: missing acceptance criteria`);
    if ((order.stopConditions ?? []).length === 0) failures.push(`${order.ownerId}: missing stop conditions`);
    if (order.cleanupAuthorized !== false) failures.push(`${order.ownerId}: cleanupAuthorized must be false`);
    if (order.executableNow !== false) failures.push(`${order.ownerId}: executableNow must be false`);
    if (order.candidateMutationAuthorized !== false) failures.push(`${order.ownerId}: candidateMutationAuthorized must be false`);
    if (!exists(order.latestMarkdown)) failures.push(`${order.ownerId}: missing owner work-order markdown`);
  }

  for (const rowId of [
    "routing-current-source",
    "owner-work-orders-match-routes",
    "a22-direct-mutation-blocked",
    "merge-deploy-cleanup-still-blocked"
  ]) {
    const row = byId(recorded.validationRows, rowId);
    if (!row) failures.push(`missing validation row: ${rowId}`);
    if (row?.passed !== true) failures.push(`${rowId} must pass`);
  }

  for (const [key, expected] of [
    ["evidenceOnly", true],
    ["routesOwnerRemediation", true],
    ["recordsOwnerApproval", false],
    ["recordsExecutionInstruction", false],
    ["modifiesCandidate", false],
    ["copiesRootFiles", false],
    ["runsTypeCheck", false],
    ["runsBuild", false],
    ["runsRegression", false],
    ["selectsReleaseSource", false],
    ["stagesFiles", false],
    ["commits", false],
    ["merges", false],
    ["pushes", false],
    ["deploys", false],
    ["cleanupAuthorized", false],
    ["executableNow", false],
    ["destructiveGitAuthorized", false],
    ["physicalLifecycleCleanupAuthorized", false]
  ]) {
    if (boundary[key] !== expected) failures.push(`boundary.${key} must be ${expected}`);
  }

  const markdown = readText(A22_TYPECHECK_REMEDIATION_OWNER_WORK_ORDER_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Typecheck Remediation Owner Work Orders",
    "Work Orders",
    "Validation Rows",
    "A22 remains blocked from clean-source promotion"
  ]) {
    if (!markdown.includes(needle)) failures.push(`work-order markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("work-order markdown contains undefined");

  for (const order of workOrders) {
    if (!exists(order.latestMarkdown)) continue;
    const content = readText(order.latestMarkdown);
    if (content.includes("undefined")) failures.push(`${order.latestMarkdown} contains undefined`);
    if (!content.includes("Cleanup authorized: false")) failures.push(`${order.latestMarkdown} missing cleanup boundary`);
    if (!content.includes("Executable now: false")) failures.push(`${order.latestMarkdown} missing executable boundary`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    ownerWorkOrderStatus: recorded.ownerWorkOrderStatus,
    remediationStatus: recorded.remediationStatus,
    topCandidateBranch: recorded.topCandidate?.branch ?? "",
    ownerWorkOrderCount: summary.ownerWorkOrderCount ?? 0,
    routedErrorRows: summary.routedErrorRows ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A22 typecheck remediation owner work orders gate");
    console.log(`Status: ${payload.ownerWorkOrderStatus ?? "unknown"}`);
    console.log(`Work orders: ${payload.ownerWorkOrderCount ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A22 typecheck remediation owner work orders gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
