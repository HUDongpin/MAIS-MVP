#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();
const apply = process.argv.includes("--apply");
const json = process.argv.includes("--json");
const scope = argValue("--scope") ?? "all";
const validScopes = new Set(["all", "canonical", "wave01", "records"]);

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  canonicalStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  wave01Template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  wave01ExecutionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  wave01Starter: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json",
  blockerRecordsTemplate: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.json",
  latestJson: "coordination/release-intake/latest-A25-owner-input-scaffold-report.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-input-scaffold-report.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-input-scaffold-report.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-input-scaffold-report.md`
};

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

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.mkdirSync(path.dirname(absolute(relativePath)), { recursive: true });
  fs.writeFileSync(absolute(relativePath), content);
}

function rowCount(payload, rowKey) {
  return Array.isArray(payload?.[rowKey]) ? payload[rowKey].length : 0;
}

function shouldWriteScaffold(target, rowKey) {
  if (!exists(target)) {
    return {
      ok: true,
      action: "create-scaffold",
      existingRows: 0,
      reason: "target input file is absent"
    };
  }

  const existing = readJson(target);
  const existingRows = rowCount(existing, rowKey);
  if (existingRows > 0) {
    return {
      ok: false,
      action: "skip-existing-owner-rows",
      existingRows,
      reason: "target input file already contains owner rows"
    };
  }
  if (existing.scaffoldManaged !== true) {
    return {
      ok: false,
      action: "skip-unmanaged-empty-file",
      existingRows,
      reason: "target input file exists and is not marked scaffoldManaged"
    };
  }
  return {
    ok: true,
    action: "refresh-empty-scaffold",
    existingRows,
    reason: "target input file is an empty scaffold"
  };
}

function canonicalScaffold(dirtyMap, nextOwnerPacket, starter) {
  return {
    generatedAt: new Date().toISOString(),
    scaffoldManaged: true,
    scaffoldKind: "canonical-next-owner-authorizations",
    note: "A25 scaffold only. Rows in draftAuthorizationsDoNotAuthorize are not owner authorizations until copied into authorizations with selectedFinalState, approvedBy, approvedAt, evidenceReviewed, and notes.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceNextOwnerPacketGeneratedAt: nextOwnerPacket.generatedAt,
    sourceStarterGeneratedAt: starter.generatedAt,
    cleanupAuthorized: false,
    executableNow: false,
    authorizations: [],
    draftAuthorizationsDoNotAuthorize: starter.authorizations ?? [],
    boundary: {
      evidenceOnly: true,
      createsExecutableRows: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

function mergeAuthorizationEvidenceReviewed(templateRow, existingRow) {
  const values = [
    ...(templateRow.evidenceReviewed ?? []),
    ...(existingRow?.evidenceReviewed ?? [])
  ].filter(Boolean);
  return Array.from(new Set(values));
}

function synchronizedCanonicalAuthorizationsScaffold(dirtyMap, nextOwnerPacket, starter, existingPayload) {
  const existingByApprovalId = new Map((existingPayload.authorizations ?? []).map((row) => [row.approvalId, row]));
  const authorizations = (starter.authorizations ?? []).flatMap((starterRow) => {
    const existingRow = existingByApprovalId.get(starterRow.approvalId);
    if (!existingRow) return [];
    return {
      ...starterRow,
      selectedFinalState: existingRow.selectedFinalState ?? "",
      approvedBy: existingRow.approvedBy ?? "",
      approvedAt: existingRow.approvedAt ?? "",
      evidenceReviewed: mergeAuthorizationEvidenceReviewed(starterRow, existingRow),
      notes: existingRow.notes ?? "",
      authorizationText: existingRow.authorizationText || starterRow.authorizationText || starterRow.requiredAuthorizationText,
      cleanupAuthorized: false,
      executableNow: false
    };
  });

  const authorizedIds = new Set(authorizations.map((row) => row.approvalId));
  return {
    ...canonicalScaffold(dirtyMap, nextOwnerPacket, starter),
    note: "A25 synchronized authorization scaffold. Existing owner authorization decisions are preserved while starter fingerprints and exact routing fields are refreshed to the latest dirty-map baseline.",
    authorizations,
    draftAuthorizationsDoNotAuthorize: (starter.authorizations ?? []).filter((row) => !authorizedIds.has(row.approvalId))
  };
}

function wave01Scaffold(dirtyMap, template, executionPacket, starter) {
  return {
    generatedAt: new Date().toISOString(),
    scaffoldManaged: true,
    scaffoldKind: "wave01-package-resync-owner-authorizations",
    note: "A25 scaffold only. Rows in draftAuthorizationsDoNotAuthorize are not owner authorizations until copied into authorizations with approvedBy, approvedAt, evidenceReviewed, and notes.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceTemplateGeneratedAt: template.generatedAt,
    sourceExecutionPacketGeneratedAt: executionPacket.generatedAt,
    cleanupAuthorized: false,
    executableNow: false,
    authorizations: [],
    draftAuthorizationsDoNotAuthorize: starter.authorizations ?? template.authorizations ?? [],
    boundary: {
      evidenceOnly: true,
      createsExecutableRows: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

function wave01ApprovalFingerprint(row, dirtyMap, executionPacket) {
  const fingerprintPayload = {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceExecutionPacketGeneratedAt: executionPacket.generatedAt,
    approvalId: row.approvalId,
    owner: row.owner,
    worktreePath: row.worktreePath,
    branch: row.branch,
    path: row.path,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd
  };
  return crypto.createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

function synchronizedWave01AuthorizationsScaffold(dirtyMap, template, executionPacket, starter, existingPayload) {
  const templateRows = template.authorizations ?? starter.authorizations ?? [];
  const existingByApprovalId = new Map((existingPayload.authorizations ?? []).map((row) => [row.approvalId, row]));
  const authorizations = templateRows.flatMap((templateRow) => {
    const existingRow = existingByApprovalId.get(templateRow.approvalId);
    if (!existingRow) return [];
    return {
      ...templateRow,
      approvalFingerprint: wave01ApprovalFingerprint(templateRow, dirtyMap, executionPacket),
      approvedBy: existingRow.approvedBy ?? "",
      approvedAt: existingRow.approvedAt ?? "",
      evidenceReviewed: mergeAuthorizationEvidenceReviewed(templateRow, existingRow),
      notes: existingRow.notes ?? "",
      authorizationText: existingRow.authorizationText || templateRow.authorizationText || "",
      cleanupAuthorized: false,
      executableNow: false
    };
  });

  const authorizedIds = new Set(authorizations.map((row) => row.approvalId));
  return {
    ...wave01Scaffold(dirtyMap, template, executionPacket, starter),
    note: "A25 synchronized Wave01 authorization scaffold. Existing owner authorization decisions are preserved while template fingerprints and exact routing fields are refreshed to the latest dirty-map baseline.",
    authorizations,
    draftAuthorizationsDoNotAuthorize: (starter.authorizations ?? templateRows).filter((row) => !authorizedIds.has(row.approvalId))
  };
}

function blockerRecordsScaffold(dirtyMap, template) {
  return {
    generatedAt: new Date().toISOString(),
    scaffoldManaged: true,
    scaffoldKind: "owner-package-blocker-report-records",
    note: "A25 scaffold only. Rows in draftRecordsDoNotAuthorize are not recorded owner blocker reports until copied into records with reportStatus=recorded-owner-blocker, reportedBy, reportedAt, blockerSummary, ownerDecision, evidenceReviewed, and nextAction.",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceTemplateGeneratedAt: template.generatedAt,
    cleanupAuthorized: false,
    executableNow: false,
    records: [],
    draftRecordsDoNotAuthorize: template.records ?? [],
    boundary: {
      evidenceOnly: true,
      createsExecutableRows: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

function mergeEvidenceReviewed(templateRow, existingRow) {
  const values = [
    ...(templateRow.evidenceReviewed ?? []),
    ...(existingRow?.evidenceReviewed ?? [])
  ].filter(Boolean);
  return Array.from(new Set(values));
}

function synchronizedBlockerRecordsScaffold(dirtyMap, template, existingPayload) {
  const existingByReportId = new Map((existingPayload.records ?? []).map((row) => [row.reportId, row]));
  const records = (template.records ?? []).map((templateRow) => {
    const existingRow = existingByReportId.get(templateRow.reportId) ?? {};
    return {
      ...templateRow,
      reportStatus: existingRow.reportStatus || "recorded-owner-blocker",
      reportedBy: existingRow.reportedBy ?? "",
      reportedAt: existingRow.reportedAt ?? "",
      blockerSummary: existingRow.blockerSummary ?? "",
      ownerDecision: existingRow.ownerDecision ?? "",
      evidenceReviewed: mergeEvidenceReviewed(templateRow, existingRow),
      nextAction: existingRow.nextAction || templateRow.nextAction || "",
      notes: existingRow.notes ?? "",
      cleanupAuthorized: false,
      executableNow: false
    };
  });

  return {
    ...blockerRecordsScaffold(dirtyMap, template),
    note: "A25 synchronized records scaffold. Existing owner blocker text is preserved while template fingerprints and exact routing fields are refreshed to the latest dirty-map baseline.",
    records,
    draftRecordsDoNotAuthorize: template.records ?? []
  };
}

function buildPlan() {
  if (!validScopes.has(scope)) {
    throw new Error(`Invalid --scope ${scope}. Expected one of: ${Array.from(validScopes).join(", ")}`);
  }

  const dirtyMap = readJson(paths.dirtyMap);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const canonicalStarter = readJson(paths.canonicalStarter);
  const wave01Template = readJson(paths.wave01Template);
  const wave01ExecutionPacket = readJson(paths.wave01ExecutionPacket);
  const wave01Starter = readJson(paths.wave01Starter);
  const blockerRecordsTemplate = readJson(paths.blockerRecordsTemplate);

  const canonicalTarget = canonicalStarter.authorizationTarget;
  const canonicalExisting = exists(canonicalTarget) ? readJson(canonicalTarget) : null;
  const canonicalExistingRows = canonicalExisting ? rowCount(canonicalExisting, "authorizations") : 0;
  const canonicalPayload = canonicalExistingRows > 0
    ? synchronizedCanonicalAuthorizationsScaffold(dirtyMap, nextOwnerPacket, canonicalStarter, canonicalExisting)
    : canonicalScaffold(dirtyMap, nextOwnerPacket, canonicalStarter);

  const recordsTarget = blockerRecordsTemplate.targetRecordsFile;
  const recordsExisting = exists(recordsTarget) ? readJson(recordsTarget) : null;
  const recordsExistingRows = recordsExisting ? rowCount(recordsExisting, "records") : 0;
  const recordsPayload = recordsExistingRows > 0
    ? synchronizedBlockerRecordsScaffold(dirtyMap, blockerRecordsTemplate, recordsExisting)
    : blockerRecordsScaffold(dirtyMap, blockerRecordsTemplate);

  const wave01Target = wave01Starter.authorizationTarget;
  const wave01Existing = exists(wave01Target) ? readJson(wave01Target) : null;
  const wave01ExistingRows = wave01Existing ? rowCount(wave01Existing, "authorizations") : 0;
  const wave01Payload = wave01ExistingRows > 0
    ? synchronizedWave01AuthorizationsScaffold(dirtyMap, wave01Template, wave01ExecutionPacket, wave01Starter, wave01Existing)
    : wave01Scaffold(dirtyMap, wave01Template, wave01ExecutionPacket, wave01Starter);

  const targets = [
    {
      scope: "canonical",
      id: "canonical-next-owner-authorizations",
      target: canonicalTarget,
      rowKey: "authorizations",
      draftKey: "draftAuthorizationsDoNotAuthorize",
      scaffold: canonicalPayload,
      expectedDraftRows: (canonicalStarter.authorizations ?? []).length
    },
    {
      scope: "wave01",
      id: "wave01-package-resync-owner-authorizations",
      target: wave01Target,
      rowKey: "authorizations",
      draftKey: "draftAuthorizationsDoNotAuthorize",
      scaffold: wave01Payload,
      expectedDraftRows: (wave01Starter.authorizations ?? wave01Template.authorizations ?? []).length
    },
    {
      scope: "records",
      id: "owner-package-blocker-report-records",
      target: recordsTarget,
      rowKey: "records",
      draftKey: "draftRecordsDoNotAuthorize",
      scaffold: recordsPayload,
      expectedDraftRows: (blockerRecordsTemplate.records ?? []).length
    }
  ];

  const scopedTargets = targets.filter((target) => scope === "all" || target.scope === scope);
  const targetPlans = scopedTargets.map((target) => {
    const decision = target.scope === "canonical" && canonicalExistingRows > 0
      ? {
          ok: true,
          action: "sync-existing-owner-authorizations",
          existingRows: canonicalExistingRows,
          reason: "target authorization file contains owner rows; preserve owner fields while refreshing starter fields"
        }
      : target.scope === "wave01" && wave01ExistingRows > 0
      ? {
          ok: true,
          action: "sync-existing-wave01-owner-authorizations",
          existingRows: wave01ExistingRows,
          reason: "target Wave01 authorization file contains owner rows; preserve owner fields while refreshing template fields"
        }
      : target.scope === "records" && recordsExistingRows > 0
      ? {
          ok: true,
          action: "sync-existing-owner-records",
          existingRows: recordsExistingRows,
          reason: "target records file contains owner rows; preserve owner fields while refreshing template fields"
        }
      : shouldWriteScaffold(target.target, target.rowKey);
    return {
      id: target.id,
      target: target.target,
      rowKey: target.rowKey,
      draftKey: target.draftKey,
      action: decision.action,
      willWrite: decision.ok,
      existingRows: decision.existingRows,
      expectedDraftRows: target.expectedDraftRows,
      reason: decision.reason,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      payload: target.scaffold
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    applied: apply,
    scope,
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    targets: targetPlans,
    summary: {
      targetFiles: targetPlans.length,
      willWrite: targetPlans.filter((row) => row.willWrite).length,
      skipped: targetPlans.filter((row) => !row.willWrite).length,
      existingOwnerRows: targetPlans.reduce((sum, row) => sum + row.existingRows, 0),
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      scaffoldOnly: true,
      createsExecutableRows: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

function markdown(report) {
  const rows = report.targets.map((row) => (
    `| ${row.id} | \`${row.target}\` | ${row.action} | ${row.willWrite ? "yes" : "no"} | ${row.existingRows} | ${row.expectedDraftRows} |`
  )).join("\n");

  return `# A25 Owner Input Scaffold Report

Generated: ${report.generatedAt}

Applied: ${report.applied ? "yes" : "no"}

Scope: ${report.scope}

Expanded dirty entries: ${report.expandedStatusEntries}

This report covers scaffold files only. Scaffold files contain empty owner input arrays and non-authorizing draft rows. They do not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Target files: ${report.summary.targetFiles}
- Files that ${report.applied ? "were" : "would be"} written: ${report.summary.willWrite}
- Files skipped: ${report.summary.skipped}
- Existing owner rows protected: ${report.summary.existingOwnerRows}
- Cleanup-authorized rows: ${report.summary.cleanupAuthorizedRows}
- Executable rows: ${report.summary.executableRows}

## Targets

| Input | Target file | Action | ${report.applied ? "Written" : "Would write"} | Existing owner rows | Draft rows |
| --- | --- | --- | --- | ---: | ---: |
${rows}

## Boundary

The target files are intentionally non-executable. Owner rows must be copied into the validated arrays and completed by an authorized owner, then the A25 validators and execution preview must be rerun. A separate owner instruction naming exact approval IDs and exact commands is still required before any physical cleanup can run.
`;
}

function main() {
  const report = buildPlan();

  if (apply) {
    for (const target of report.targets) {
      if (!target.willWrite) continue;
      write(target.target, `${JSON.stringify(target.payload, null, 2)}\n`);
    }
    const reportForDisk = {
      ...report,
      targets: report.targets.map(({ payload, ...target }) => target)
    };
    write(paths.latestJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
    write(paths.datedJson, `${JSON.stringify(reportForDisk, null, 2)}\n`);
    write(paths.latestMarkdown, markdown(reportForDisk));
    write(paths.datedMarkdown, markdown(reportForDisk));
  }

  const output = {
    applied: report.applied,
    latestJson: apply ? paths.latestJson : null,
    latestMarkdown: apply ? paths.latestMarkdown : null,
    targetFiles: report.summary.targetFiles,
    scope: report.scope,
    willWrite: report.summary.willWrite,
    skipped: report.summary.skipped,
    existingOwnerRows: report.summary.existingOwnerRows,
    cleanupAuthorizedRows: report.summary.cleanupAuthorizedRows,
    executableRows: report.summary.executableRows,
    targets: report.targets.map(({ payload, ...target }) => target)
  };

  if (json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("A25 owner input scaffold generator");
    console.log(`Applied: ${apply ? "yes" : "no"}`);
    console.log(`Target files: ${output.targetFiles}`);
    console.log(`Will write: ${output.willWrite}`);
    console.log(`Skipped: ${output.skipped}`);
    console.log(`Existing owner rows protected: ${output.existingOwnerRows}`);
    console.log(`Cleanup-authorized rows: ${output.cleanupAuthorizedRows}`);
    console.log(`Executable rows: ${output.executableRows}`);
  }
}

main();
