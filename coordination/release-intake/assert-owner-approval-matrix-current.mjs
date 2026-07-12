#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pending(status) {
  return String(status ?? "").startsWith("pending");
}

function main() {
  const failures = [];
  const paths = {
    dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
    ledger: "coordination/release-intake/latest-A25-lifecycle-decision-ledger.json",
    requestIndex: "coordination/release-intake/latest-A25-lifecycle-decision-request-index.json",
    runbook: "coordination/release-intake/latest-A25-lifecycle-closure-runbook.json",
    approvalSelection: "coordination/release-intake/latest-A25-owner-approval-selection.json",
    matrix: "coordination/release-intake/latest-A25-owner-approval-matrix.json",
    matrixMarkdown: "coordination/release-intake/latest-A25-owner-approval-matrix.md"
  };

  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) finish({ failures, rows: [] });

  const dirtyMap = readJson(paths.dirtyMap);
  const ledger = readJson(paths.ledger);
  const requestIndex = readJson(paths.requestIndex);
  const runbook = readJson(paths.runbook);
  const approvalSelection = exists(paths.approvalSelection) ? readJson(paths.approvalSelection) : null;
  const matrix = readJson(paths.matrix);
  const ledgerIds = new Set((ledger.decisions ?? []).map((decision) => decision.id));
  const matrixRows = new Map((matrix.rows ?? []).map((row) => [row.id, row]));

  if (matrix.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("approval matrix dirty-map signature is stale");
  if (matrix.ledgerDirtyMapStatusSignature !== ledger.dirtyMapStatusSignature) failures.push("approval matrix ledger signature is stale");
  if (matrix.requestIndexDirtyMapStatusSignature !== requestIndex.dirtyMapStatusSignature) failures.push("approval matrix request-index signature is stale");
  if (matrix.runbookDirtyMapStatusSignature !== runbook.dirtyMapStatusSignature) failures.push("approval matrix runbook signature is stale");
  if (matrix.rowCount !== ledger.decisionCount) failures.push(`rowCount mismatch: matrix ${matrix.rowCount}, ledger ${ledger.decisionCount}`);

  const pendingCount = [...matrixRows.values()].filter((row) => pending(row.approvalStatus)).length;
  if (matrix.pendingApprovalCount !== pendingCount) {
    failures.push(`pendingApprovalCount mismatch: matrix ${matrix.pendingApprovalCount}, actual ${pendingCount}`);
  }

  for (const id of ledgerIds) {
    if (!matrixRows.has(id)) failures.push(`missing approval row: ${id}`);
  }
  for (const id of matrixRows.keys()) {
    if (!ledgerIds.has(id)) failures.push(`unexpected approval row: ${id}`);
  }

  for (const [id, row] of matrixRows.entries()) {
    if (!Array.isArray(row.allowedFinalStates) || row.allowedFinalStates.length === 0) failures.push(`${id}: missing allowed final states`);
    if (!Array.isArray(row.accountableOwners) || row.accountableOwners.length === 0) failures.push(`${id}: missing accountable owners`);
    if (!row.requestPacket || !exists(row.requestPacket)) failures.push(`${id}: missing request packet ${row.requestPacket || "(empty)"}`);
    if (!row.closureRunbook || !exists(row.closureRunbook)) failures.push(`${id}: missing closure runbook ${row.closureRunbook || "(empty)"}`);
    const approval = approvalSelection?.decisions?.[id];
    if (approval) {
      if (row.approvalStatus !== "approved") failures.push(`${id}: selection exists but matrix row is not approved`);
      if (row.selectedFinalState !== approval.selectedFinalState) failures.push(`${id}: selected final state does not match approval selection`);
      if (!row.approvedBy) failures.push(`${id}: approved row missing approvedBy`);
      if (!row.approvedAt) failures.push(`${id}: approved row missing approvedAt`);
    }
    if (strict && pending(row.approvalStatus)) failures.push(`pending owner approval: ${id}`);
  }

  finish({
    checkedAt: new Date().toISOString(),
    strict,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    rowCount: matrix.rowCount,
    pendingApprovalCount: matrix.pendingApprovalCount,
    failures,
    rows: [...matrixRows.values()].map((row) => ({
      id: row.id,
      approvalStatus: row.approvalStatus,
      requestPacket: row.requestPacket
    }))
  });
}

function finish(payload) {
  fs.writeFileSync(
    path.join(outDir, "latest-A25-owner-approval-matrix-current-gate.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner approval matrix gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Rows: ${payload.rowCount ?? 0}`);
    console.log(`Pending approvals: ${payload.pendingApprovalCount ?? "unknown"}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 owner approval matrix gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
