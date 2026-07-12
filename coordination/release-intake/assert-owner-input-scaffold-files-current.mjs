#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-owner-input-scaffold-files-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  canonicalStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  wave01Template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  wave01ExecutionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  wave01Starter: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json",
  blockerRecordsTemplate: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.json"
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function rowCount(payload, key) {
  return Array.isArray(payload?.[key]) ? payload[key].length : 0;
}

function countExecutableRows(rows) {
  return rows.filter((row) => row?.cleanupAuthorized === true || row?.executableNow === true).length;
}

function flagIsTrue(payload, key) {
  return payload?.[key] === true;
}

function boundaryFlagIsTrue(payload, key) {
  return payload?.boundary?.[key] === true;
}

function sourceFailures(payload, definition, dirtyMap) {
  const failures = [];
  if (payload.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    failures.push("dirtyMapStatusSignature is stale");
  }
  if (payload.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) {
    failures.push("expandedStatusEntries is stale");
  }
  for (const [field, expected] of Object.entries(definition.expectedSourceFields)) {
    if (payload[field] !== expected) failures.push(`${field} is stale`);
  }
  return failures;
}

function targetDefinitions() {
  const dirtyMap = readJson(paths.dirtyMap);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const canonicalStarter = readJson(paths.canonicalStarter);
  const wave01Template = readJson(paths.wave01Template);
  const wave01ExecutionPacket = readJson(paths.wave01ExecutionPacket);
  const wave01Starter = readJson(paths.wave01Starter);
  const blockerRecordsTemplate = readJson(paths.blockerRecordsTemplate);

  return {
    dirtyMap,
    definitions: [
      {
        id: "canonical-next-owner-authorizations",
        target: canonicalStarter.authorizationTarget,
        scaffoldKind: "canonical-next-owner-authorizations",
        rowKey: "authorizations",
        draftKey: "draftAuthorizationsDoNotAuthorize",
        expectedDraftRows: canonicalStarter.authorizations ?? [],
        expectedSourceFields: {
          sourceNextOwnerPacketGeneratedAt: nextOwnerPacket.generatedAt,
          sourceStarterGeneratedAt: canonicalStarter.generatedAt
        }
      },
      {
        id: "wave01-package-resync-owner-authorizations",
        target: wave01Starter.authorizationTarget,
        scaffoldKind: "wave01-package-resync-owner-authorizations",
        rowKey: "authorizations",
        draftKey: "draftAuthorizationsDoNotAuthorize",
        expectedDraftRows: wave01Starter.authorizations ?? wave01Template.authorizations ?? [],
        expectedSourceFields: {
          sourceTemplateGeneratedAt: wave01Template.generatedAt,
          sourceExecutionPacketGeneratedAt: wave01ExecutionPacket.generatedAt
        }
      },
      {
        id: "owner-package-blocker-report-records",
        target: blockerRecordsTemplate.targetRecordsFile,
        scaffoldKind: "owner-package-blocker-report-records",
        rowKey: "records",
        draftKey: "draftRecordsDoNotAuthorize",
        expectedDraftRows: blockerRecordsTemplate.records ?? [],
        expectedSourceFields: {
          sourceTemplateGeneratedAt: blockerRecordsTemplate.generatedAt
        }
      }
    ]
  };
}

function evaluateTarget(definition, dirtyMap) {
  const failures = [];
  if (!definition.target) failures.push("target path is not declared by source packet");
  if (!definition.target || !exists(definition.target)) {
    return {
      id: definition.id,
      target: definition.target ?? null,
      mode: "missing",
      passed: false,
      ownerRows: 0,
      draftRows: 0,
      cleanupExecutableRows: 0,
      failures: failures.length > 0 ? failures : [`missing target file: ${definition.target}`]
    };
  }

  const payload = readJson(definition.target);
  const rows = Array.isArray(payload?.[definition.rowKey]) ? payload[definition.rowKey] : [];
  const draftRows = Array.isArray(payload?.[definition.draftKey]) ? payload[definition.draftKey] : [];
  const ownerRows = rows.length;
  const cleanupExecutableRows = countExecutableRows(rows);

  if (flagIsTrue(payload, "cleanupAuthorized")) failures.push("top-level cleanupAuthorized must not be true");
  if (flagIsTrue(payload, "executableNow")) failures.push("top-level executableNow must not be true");
  if (boundaryFlagIsTrue(payload, "createsExecutableRows")) failures.push("boundary.createsExecutableRows must not be true");
  if (boundaryFlagIsTrue(payload, "cleanupAuthorized")) failures.push("boundary.cleanupAuthorized must not be true");
  if (boundaryFlagIsTrue(payload, "executableNow")) failures.push("boundary.executableNow must not be true");
  if (boundaryFlagIsTrue(payload, "destructiveGitAuthorized")) failures.push("boundary.destructiveGitAuthorized must not be true");
  if (boundaryFlagIsTrue(payload, "deployAuthorized")) failures.push("boundary.deployAuthorized must not be true");

  if (ownerRows > 0) {
    return {
      id: definition.id,
      target: definition.target,
      mode: "owner-input-present",
      passed: failures.length === 0,
      ownerRows,
      draftRows: draftRows.length,
      cleanupExecutableRows,
      delegatedToOwnerValidators: true,
      failures
    };
  }

  if (payload.scaffoldManaged !== true) failures.push("empty target must be scaffoldManaged");
  if (payload.scaffoldKind !== definition.scaffoldKind) failures.push(`scaffoldKind must be ${definition.scaffoldKind}`);
  if (payload.boundary?.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (payload.boundary?.createsExecutableRows !== false) failures.push("boundary.createsExecutableRows must be false");
  if (payload.boundary?.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (payload.boundary?.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (payload.boundary?.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (payload.boundary?.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (rowCount(payload, definition.rowKey) !== 0) failures.push(`${definition.rowKey} must be empty in scaffold mode`);
  if (draftRows.length !== definition.expectedDraftRows.length) {
    failures.push(`${definition.draftKey} row count is stale`);
  } else if (!sameJson(draftRows, definition.expectedDraftRows)) {
    failures.push(`${definition.draftKey} rows are stale`);
  }
  failures.push(...sourceFailures(payload, definition, dirtyMap));

  return {
    id: definition.id,
    target: definition.target,
    mode: "empty-scaffold",
    passed: failures.length === 0,
    ownerRows,
    draftRows: draftRows.length,
    expectedDraftRows: definition.expectedDraftRows.length,
    cleanupExecutableRows,
    failures
  };
}

function main() {
  const sourceMissing = Object.values(paths).filter((relativePath) => !exists(relativePath));
  if (sourceMissing.length > 0) {
    return finish({
      checkedAt: new Date().toISOString(),
      root,
      result: "fail",
      summary: {
        targetFiles: 0,
        emptyScaffoldFiles: 0,
        ownerInputFiles: 0,
        ownerRows: 0,
        draftRows: 0,
        cleanupExecutableRows: 0
      },
      failures: sourceMissing.map((relativePath) => `missing source file: ${relativePath}`),
      targets: []
    });
  }

  const { dirtyMap, definitions } = targetDefinitions();
  const targets = definitions.map((definition) => evaluateTarget(definition, dirtyMap));
  const failures = targets.flatMap((target) => target.failures.map((failure) => `${target.id}: ${failure}`));
  const emptyScaffoldFiles = targets.filter((target) => target.mode === "empty-scaffold").length;
  const ownerInputFiles = targets.filter((target) => target.mode === "owner-input-present").length;

  finish({
    checkedAt: new Date().toISOString(),
    root,
    result: failures.length === 0 ? "pass" : "fail",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries,
    summary: {
      targetFiles: targets.length,
      emptyScaffoldFiles,
      ownerInputFiles,
      ownerRows: targets.reduce((sum, target) => sum + target.ownerRows, 0),
      draftRows: targets.reduce((sum, target) => sum + target.draftRows, 0),
      cleanupExecutableRows: targets.reduce((sum, target) => sum + target.cleanupExecutableRows, 0)
    },
    failures,
    targets
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 owner input scaffold files gate");
    console.log(`Target files: ${payload.summary.targetFiles}`);
    console.log(`Empty scaffold files: ${payload.summary.emptyScaffoldFiles}`);
    console.log(`Owner input files: ${payload.summary.ownerInputFiles}`);
    console.log(`Owner rows: ${payload.summary.ownerRows}`);
    console.log(`Draft rows: ${payload.summary.draftRows}`);
    console.log(`Cleanup/executable rows: ${payload.summary.cleanupExecutableRows}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 owner input scaffold files gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
