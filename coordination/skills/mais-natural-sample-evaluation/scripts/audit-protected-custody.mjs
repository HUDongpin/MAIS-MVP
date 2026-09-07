#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readPacketFile, validateNaturalEvidence } from "./verify-evidence-envelope.mjs";

function help() {
  return `Usage: node scripts/audit-protected-custody.mjs PACKET.json\n\nAudit only redacted custody metadata and a hash-bound cross-custody handoff receipt. Offline and read-only: this script never opens a protected root, lists item files, prints a path, or reads question/provider content. Packet-local validation does not authenticate an external issuer or grant provider authority.\n\nExit codes: 0 custody metadata passes; 2 blocked/invalid; 3 tool failure.`;
}

function custodyIssues(packet) {
  const issues = [];
  const custody = packet.sampleFreeze.custody;
  const handoff = packet.runner.custodyHandoff;
  const required = custody.custodyContextSha256 !== null
    && packet.runner.custodyContextSha256 !== null
    && custody.custodyContextSha256 !== packet.runner.custodyContextSha256;
  if (packet.sampleFreeze.status === "NOT_STARTED") {
    issues.push({ code: "CUSTODY_SAMPLE_NOT_FROZEN", path: "#/sampleFreeze/status", severity: "blocked" });
  }
  if (custody.metadataReceiptSha256 === null || custody.protectedRootRefSha256 === null) {
    issues.push({ code: "CUSTODY_METADATA_HASH_MISSING", path: "#/sampleFreeze/custody", severity: "blocked" });
  }
  if (custody.directoryMode !== "MODE_0700_VERIFIED"
      || custody.filesMode !== "MODE_0600_VERIFIED"
      || custody.symlinkStatus !== "SYMLINK_FREE_VERIFIED") {
    issues.push({ code: "CUSTODY_MODE_OR_SYMLINK_INVALID", path: "#/sampleFreeze/custody", severity: "blocked" });
  }
  if (required && handoff.status !== "VERIFIED") {
    issues.push({ code: "CUSTODY_HANDOFF_REQUIRED", path: "#/runner/custodyHandoff", severity: "blocked" });
  }
  if (handoff.status === "VERIFIED") {
    const hashesPresent = handoff.handoffReceiptSha256 !== null
      && handoff.sampleManifestSha256 !== null
      && handoff.runnerRegistrationSha256 !== null
      && handoff.runnerClosureSha256 !== null
      && handoff.sourceCustodyRefSha256 !== null
      && handoff.destinationCustodyRefSha256 !== null;
    if (!hashesPresent) {
      issues.push({ code: "CUSTODY_HANDOFF_HASHES_MISSING", path: "#/runner/custodyHandoff", severity: "blocked" });
    }
    const graphBound = packet.receiptGraph.some((node) => node.kind === "CUSTODY_HANDOFF"
      && node.receiptSha256 === handoff.handoffReceiptSha256);
    if (!graphBound) {
      issues.push({ code: "CUSTODY_HANDOFF_NOT_IN_LINEAGE", path: "#/runner/custodyHandoff", severity: "blocked" });
    }
  }
  return issues;
}

export async function auditCustodyMetadata(packet, options = {}) {
  const validation = await validateNaturalEvidence(packet, options);
  const invalidIssues = validation.issues.filter((entry) => entry.severity === "invalid");
  if (invalidIssues.length > 0) {
    return {
      tool: "audit-protected-custody",
      offline: true,
      readOnly: true,
      redacted: true,
      result: "invalid",
      issues: invalidIssues.map(({ code, path: issuePath, severity }) => ({ code, path: issuePath, severity })),
    };
  }
  const issues = custodyIssues(packet);
  return {
    tool: "audit-protected-custody",
    offline: true,
    readOnly: true,
    redacted: true,
    contentAddressScope: "packet-local-internal-closure",
    issuerAuthenticity: "not-verified-by-offline-validator",
    providerAuthorityGranted: false,
    result: issues.length === 0 ? "valid" : "blocked",
    custody: {
      sampleFrozen: packet.sampleFreeze.status !== "NOT_STARTED",
      metadataHashBound: packet.sampleFreeze.custody.metadataReceiptSha256 !== null,
      protectedRootRefHashBound: packet.sampleFreeze.custody.protectedRootRefSha256 !== null,
      directoryMode0700: packet.sampleFreeze.custody.directoryMode === "MODE_0700_VERIFIED",
      filesMode0600: packet.sampleFreeze.custody.filesMode === "MODE_0600_VERIFIED",
      symlinkFree: packet.sampleFreeze.custody.symlinkStatus === "SYMLINK_FREE_VERIFIED",
      contentExposed: false,
      crossCustodyHandoffRequired: packet.sampleFreeze.custody.custodyContextSha256 !== null
        && packet.runner.custodyContextSha256 !== null
        && packet.sampleFreeze.custody.custodyContextSha256 !== packet.runner.custodyContextSha256,
      crossCustodyHandoffComplete: packet.runner.custodyHandoff.status === "VERIFIED",
      handoffReceiptHashBound: packet.runner.custodyHandoff.handoffReceiptSha256 !== null,
      contentCopiedToPublicArea: false,
    },
    issues,
  };
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${help()}\n`);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    process.stdout.write(`${JSON.stringify({ tool: "audit-protected-custody", result: "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code: "ARGUMENT_INVALID", path: "#", severity: "invalid" }] })}\n`);
    return 2;
  }
  try {
    const packet = await readPacketFile(argv[0]);
    const output = await auditCustodyMetadata(packet);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return output.result === "valid" ? 0 : 2;
  } catch (error) {
    const code = error?.code === "JSON_MALFORMED" || error?.code === "INPUT_TOO_LARGE" ? error.code : "INPUT_READ_FAILED";
    process.stdout.write(`${JSON.stringify({ tool: "audit-protected-custody", result: code === "INPUT_READ_FAILED" ? "error" : "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code, path: "#", severity: "invalid" }] })}\n`);
    return code === "INPUT_READ_FAILED" ? 3 : 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
