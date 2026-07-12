#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-owner-package-blocker-report-records-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  template: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.json",
  templateMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.md",
  records: "coordination/release-intake/latest-A25-owner-package-blocker-report-records.json"
};

const exactKeys = [
  "reportId",
  "reportFingerprint",
  "assignmentId",
  "agentId",
  "owner",
  "role",
  "objective",
  "recommendedWorktree",
  "packageRows",
  "uniqueReadFiles",
  "writeScope",
  "coordinationRequired",
  "checks",
  "stopConditions",
  "dirtyStateFinalAction",
  "worktreeLifecycleAction"
];

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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function suggestedNextAction(row) {
  const firstCheck = row.checks?.[0]
    ? ` then rerun \`${row.checks[0]}\``
    : "";
  return `Use \`${row.recommendedWorktree}\` to resolve the routed blockers inside ${row.agentId}'s allowed write scope, or record this row with reportStatus=recorded-owner-blocker and a concrete blocker summary${firstCheck}.`;
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner package blocker report records gate");
    console.log(`Records file present: ${payload.recordsFilePresent ? "yes" : "no"}`);
    console.log(`Template rows: ${payload.templateRows ?? 0}`);
    console.log(`Valid records: ${payload.validRecords ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 owner package blocker report records gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function expectedTemplateRows(starter) {
  return (starter.reports ?? [])
    .filter((row) => row.reportId !== "owner-package-blocker-report-a25")
    .map((row) => ({
      ...Object.fromEntries(exactKeys.map((key) => [key, row[key]])),
      reportStatus: "",
      reportedBy: "",
      reportedAt: "",
      blockerSummary: "",
      ownerDecision: "",
      evidenceReviewed: [
        paths.starter,
        `coordination/release-intake/latest-A25-pending-owner-blocker-report-${row.agentId.toLowerCase()}.md`
      ],
      nextAction: suggestedNextAction(row),
      notes: "",
      cleanupAuthorized: false,
      executableNow: false
    }));
}

function main() {
  const failures = [];
  for (const requiredPath of [paths.dirtyMap, paths.starter, paths.template, paths.templateMarkdown]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, templateRows: 0, validRecords: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  const template = readJson(paths.template);
  const expectedRows = expectedTemplateRows(starter);
  const templateRows = template.records ?? [];

  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("starter expanded dirty entry count is stale");
  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("template dirty-map signature is stale");
  if (template.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("template expanded dirty entry count is stale");
  if (template.sourceStarterGeneratedAt !== starter.generatedAt) failures.push("template source starter timestamp is stale");
  if (template.targetRecordsFile !== paths.records) failures.push("template target records file is stale");
  if (!sameJson(templateRows, expectedRows)) failures.push("template records are stale");
  if ((templateRows ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) {
    failures.push("template contains executable or cleanup-authorized row");
  }

  const markdown = readText(paths.templateMarkdown);
  if (markdown.includes("undefined")) failures.push("template markdown contains undefined");
  if (!markdown.includes("This template is coordination evidence only.")) failures.push("template markdown missing non-authorization boundary");

  if (!exists(paths.records)) {
    return finish({
      checkedAt: new Date().toISOString(),
      dirtyMapStatusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
      recordsFile: paths.records,
      recordsFilePresent: false,
      templateRows: expectedRows.length,
      recordsInFile: 0,
      validRecords: 0,
      pendingRecords: expectedRows.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      failures
    });
  }

  const recordsPayload = readJson(paths.records);
  const records = recordsPayload.records ?? [];
  const templateByReportId = new Map(expectedRows.map((row) => [row.reportId, row]));

  if (!Array.isArray(records)) failures.push("records file must contain a records array");
  if (recordsPayload.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("records file dirty-map signature is stale or missing");
  if (recordsPayload.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("records file expanded dirty entry count is stale or missing");
  if (recordsPayload.sourceTemplateGeneratedAt !== template.generatedAt) failures.push("records file source template timestamp is stale or missing");
  if (recordsPayload.cleanupAuthorized === true) failures.push("records file cleanupAuthorized must not be true");
  if (recordsPayload.executableNow === true) failures.push("records file executableNow must not be true");

  const seen = new Set();
  const validReportIds = new Set();
  for (const row of Array.isArray(records) ? records : []) {
    const rowFailureStart = failures.length;
    if (!nonEmptyString(row.reportId)) {
      failures.push("record row missing reportId");
      continue;
    }
    if (seen.has(row.reportId)) failures.push(`${row.reportId}: duplicate reportId`);
    seen.add(row.reportId);

    const templateRow = templateByReportId.get(row.reportId);
    if (!templateRow) {
      failures.push(`${row.reportId}: unknown reportId`);
      continue;
    }
    for (const key of exactKeys) {
      if (!sameJson(row[key], templateRow[key])) failures.push(`${row.reportId}: ${key} must exactly match the template`);
    }
    if (row.reportStatus !== "recorded-owner-blocker") failures.push(`${row.reportId}: reportStatus must be recorded-owner-blocker`);
    if (!nonEmptyString(row.reportedBy)) failures.push(`${row.reportId}: reportedBy is required`);
    if (!validIsoDate(row.reportedAt)) failures.push(`${row.reportId}: reportedAt must be an ISO-compatible date`);
    if (!nonEmptyString(row.blockerSummary)) failures.push(`${row.reportId}: blockerSummary is required`);
    if (!nonEmptyString(row.ownerDecision)) failures.push(`${row.reportId}: ownerDecision is required`);
    if (!Array.isArray(row.evidenceReviewed) || !row.evidenceReviewed.includes(paths.starter) || !row.evidenceReviewed.includes(templateRow.evidenceReviewed[1])) {
      failures.push(`${row.reportId}: evidenceReviewed must include ${paths.starter} and ${templateRow.evidenceReviewed[1]}`);
    }
    if (!nonEmptyString(row.nextAction)) failures.push(`${row.reportId}: nextAction is required`);
    if (row.cleanupAuthorized === true) failures.push(`${row.reportId}: cleanupAuthorized must not be true`);
    if (row.executableNow === true) failures.push(`${row.reportId}: executableNow must not be true`);

    if (failures.length === rowFailureStart) validReportIds.add(row.reportId);
  }

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    recordsFile: paths.records,
    recordsFilePresent: true,
    templateRows: expectedRows.length,
    recordsInFile: Array.isArray(records) ? records.length : 0,
    validRecords: validReportIds.size,
    pendingRecords: Math.max(expectedRows.length - validReportIds.size, 0),
    cleanupAuthorizedRows: Array.isArray(records) ? records.filter((row) => row.cleanupAuthorized).length : 0,
    executableRows: Array.isArray(records) ? records.filter((row) => row.executableNow).length : 0,
    failures
  });
}

main();
