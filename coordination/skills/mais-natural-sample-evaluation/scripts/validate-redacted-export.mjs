#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readPacketFile, validateNaturalEvidence } from "./verify-evidence-envelope.mjs";

const OFFLINE_VALIDATION_BOUNDARY = Object.freeze({
  contentAddressScope: "packet-local-internal-closure",
  issuerAuthenticity: "not-verified-by-offline-validator",
  providerAuthorityGranted: false,
});

function help() {
  return `Usage: node scripts/validate-redacted-export.mjs PACKET.json\n\nEmit a strict-allowlist, aggregate-only natural-evaluation summary after final independent review, claim review, and export authorization. Offline and read-only: no provider calls, credentials, protected content, item identifiers, exact custody paths, or raw responses are read or emitted. Packet-local validation does not authenticate an external issuer or grant provider authority.\n\nExit codes: 0 safe export emitted; 2 blocked/invalid; 3 tool failure.`;
}

function safeActivity(activity) {
  return {
    attempts: { known: activity.attempts.known, count: activity.attempts.known ? activity.attempts.count : null },
    completedCalls: { known: activity.completedCalls.known, count: activity.completedCalls.known ? activity.completedCalls.count : null },
    egress: { known: activity.egress.known, count: activity.egress.known ? activity.egress.count : null },
    unknown: { present: activity.unknown.present, categories: [...activity.unknown.categories] },
  };
}

export async function buildSafeAggregateExport(packet, options = {}) {
  const validation = await validateNaturalEvidence(packet, options);
  if (validation.result !== "valid") {
    return {
      tool: "validate-redacted-export",
      offline: true,
      readOnly: true,
      redacted: true,
      ...OFFLINE_VALIDATION_BOUNDARY,
      result: validation.result,
      issues: validation.issues.map(({ code, path: issuePath, severity }) => ({ code, path: issuePath, severity })),
    };
  }

  const exportIssues = [];
  if (!packet.activity.attempts.known || !packet.activity.completedCalls.known || !packet.activity.egress.known || packet.activity.unknown.present) {
    exportIssues.push({ code: "AGGREGATE_ACTIVITY_UNRESOLVED", path: "#/activity", severity: "blocked" });
  }
  if (!["AUTHORIZED", "EXPORTED"].includes(packet.aggregateExport.status)
      || !packet.aggregateExport.allowlistValidated
      || !packet.aggregateExport.publicationAuthorized
      || packet.aggregateExport.authorizationReceiptSha256 === null) {
    exportIssues.push({ code: "AGGREGATE_EXPORT_NOT_AUTHORIZED", path: "#/aggregateExport", severity: "blocked" });
  }
  if (packet.independentReview.final.status !== "CONCURRED" || packet.independentReview.claimBoundary.status !== "CONCURRED") {
    exportIssues.push({ code: "AGGREGATE_REVIEW_CHAIN_INCOMPLETE", path: "#/independentReview", severity: "blocked" });
  }
  if (packet.runProvenance !== "natural-registered"
      || packet.result.status !== "SEALED"
      || packet.aggregateExport.resultReceiptSha256 !== packet.result.resultReceiptSha256
      || packet.aggregateExport.metricsProvenance !== "natural-registered") {
    exportIssues.push({ code: "AGGREGATE_RESULT_BINDING_INVALID", path: "#/aggregateExport", severity: "blocked" });
  }
  if (exportIssues.length > 0 || validation.result === "blocked") {
    return {
      tool: "validate-redacted-export",
      offline: true,
      readOnly: true,
      redacted: true,
      ...OFFLINE_VALIDATION_BOUNDARY,
      result: "blocked",
      issues: [...validation.issues, ...exportIssues].map(({ code, path: issuePath, severity }) => ({ code, path: issuePath, severity })),
    };
  }

  return {
    tool: "validate-redacted-export",
    contract: "EvidenceEnvelopeV1+NaturalSample-v1",
    offline: true,
    readOnly: true,
    redacted: true,
    ...OFFLINE_VALIDATION_BOUNDARY,
    result: "valid",
    aggregate: {
      schemaVersion: packet.schemaVersion,
      skill: packet.skill,
      observedAt: packet.observedAt,
      repository: { head: packet.repository.head, clean: packet.repository.clean },
      evidenceClass: packet.evidenceClass,
      resolvedState: packet.resolvedState,
      runProvenance: packet.runProvenance,
      claimCeiling: packet.claimCeiling,
      resultConclusion: packet.result.resultConclusion,
      metrics: {
        sampleSize: packet.result.metrics.sampleSize,
        successfulCount: packet.result.metrics.successfulCount,
        failedCount: packet.result.metrics.failedCount,
      },
      activity: safeActivity(packet.activity),
      independentReview: {
        freeze: packet.independentReview.freeze.status,
        runner: packet.independentReview.runner.status,
        final: packet.independentReview.final.status,
        claimBoundary: packet.independentReview.claimBoundary.status,
      },
      aggregateExportStatus: packet.aggregateExport.status,
      evidenceHashes: [...packet.evidenceHashes].sort(),
      redaction: {
        protectedContentIncluded: false,
        credentialsIncluded: false,
        rawProviderResponsesIncluded: false,
      },
    },
    issues: [],
  };
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${help()}\n`);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    process.stdout.write(`${JSON.stringify({ tool: "validate-redacted-export", result: "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code: "ARGUMENT_INVALID", path: "#", severity: "invalid" }] })}\n`);
    return 2;
  }
  try {
    const packet = await readPacketFile(argv[0]);
    const output = await buildSafeAggregateExport(packet);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return output.result === "valid" ? 0 : 2;
  } catch (error) {
    const code = error?.code === "JSON_MALFORMED" || error?.code === "INPUT_TOO_LARGE" ? error.code : "INPUT_READ_FAILED";
    process.stdout.write(`${JSON.stringify({ tool: "validate-redacted-export", result: code === "INPUT_READ_FAILED" ? "error" : "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code, path: "#", severity: "invalid" }] })}\n`);
    return code === "INPUT_READ_FAILED" ? 3 : 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
