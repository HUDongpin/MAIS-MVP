#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  starter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  target: "coordination/release-intake/latest-A25-owner-package-blocker-report-records.json",
  latestJson: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-package-blocker-report-records-template.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-package-blocker-report-records-template.md`
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

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function exactFields(row) {
  return Object.fromEntries(exactKeys.map((key) => [key, row[key]]));
}

function pendingTemplatePath(row) {
  return `coordination/release-intake/latest-A25-pending-owner-blocker-report-${slug(row.agentId)}.md`;
}

function suggestedNextAction(row) {
  const firstCheck = row.checks?.[0]
    ? ` then rerun \`${row.checks[0]}\``
    : "";
  return `Use \`${row.recommendedWorktree}\` to resolve the routed blockers inside ${row.agentId}'s allowed write scope, or record this row with reportStatus=recorded-owner-blocker and a concrete blocker summary${firstCheck}.`;
}

function templateRow(row) {
  return {
    ...exactFields(row),
    reportStatus: "",
    reportedBy: "",
    reportedAt: "",
    blockerSummary: "",
    ownerDecision: "",
    evidenceReviewed: [
      paths.starter,
      pendingTemplatePath(row)
    ],
    nextAction: suggestedNextAction(row),
    notes: "",
    cleanupAuthorized: false,
    executableNow: false
  };
}

function markdown(payload) {
  const rows = payload.records.map((row) => (
    `| \`${row.reportId}\` | ${row.agentId} | ${row.owner} | ${row.packageRows.length} | \`${pendingTemplatePath(row)}\` | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | n/a | no |";

  return `# A25 Owner Package Blocker Report Records Template

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source starter generated: ${payload.sourceStarterGeneratedAt}

Target owner-filled records file: \`${paths.target}\`

This template is coordination evidence only. It does not create the target records file, does not record reports on behalf of owners, and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Template rows: ${payload.summary.templateRows}
- Blank owner decision rows: ${payload.summary.blankOwnerDecisionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Owner Rows

| Report ID | Agent | Owner | Package rows | Pending template | Executable |
| --- | --- | --- | ---: | --- | --- |
${rows}

## Target File Shape

Create or update \`${paths.target}\` with this structure, filling only real owner-reviewed records:

\`\`\`json
{
  "dirtyMapStatusSignature": "${payload.dirtyMapStatusSignature}",
  "expandedStatusEntries": ${payload.expandedStatusEntries},
  "sourceTemplateGeneratedAt": "${payload.generatedAt}",
  "cleanupAuthorized": false,
  "executableNow": false,
  "records": [
    {
      "...": "copy one row from the template records array",
      "reportStatus": "recorded-owner-blocker",
      "reportedBy": "<owner agent id or owner name>",
      "reportedAt": "<ISO-8601>",
      "blockerSummary": "<what remains blocked and why>",
      "ownerDecision": "<resolved | partially-resolved | blocked, with exact scope>",
      "evidenceReviewed": [
        "${paths.starter}",
        "coordination/release-intake/latest-A25-pending-owner-blocker-report-aXX.md"
      ],
      "nextAction": "<specific next step>",
      "cleanupAuthorized": false,
      "executableNow": false
    }
  ]
}
\`\`\`
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const starter = readJson(paths.starter);
  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("owner package blocker report starter dirty-map signature is stale");
  }
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("owner package blocker report starter expanded dirty entry count is stale");
  }

  const records = (starter.reports ?? [])
    .filter((row) => row.reportId !== "owner-package-blocker-report-a25")
    .map(templateRow);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceStarterGeneratedAt: starter.generatedAt,
    targetRecordsFile: paths.target,
    note: "Template only. Owners must create the target records file with reviewed rows before reports can be recorded.",
    summary: {
      templateRows: records.length,
      blankOwnerDecisionRows: records.filter((row) => !row.ownerDecision && !row.reportedBy && !row.reportedAt).length,
      cleanupAuthorizedRows: records.filter((row) => row.cleanupAuthorized).length,
      executableRows: records.filter((row) => row.executableNow).length
    },
    records
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    templateRows: payload.summary.templateRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
