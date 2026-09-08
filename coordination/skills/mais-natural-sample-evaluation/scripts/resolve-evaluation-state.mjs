#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  readPacketFile,
  safeValidationOutput,
  validateNaturalEvidence,
} from "./verify-evidence-envelope.mjs";

function help() {
  return `Usage: node scripts/resolve-evaluation-state.mjs PACKET.json\n\nResolve the current natural-evaluation state from the append-only direct-parent receipt lineage. Offline, read-only, and redacted: branch labels, README status, credentials, provider calls, protected content, and raw responses are never used as state truth. Packet-local validation does not authenticate an external issuer or grant provider authority.\n\nExit codes: 0 actionable state with no blockers; 2 blocked/invalid; 3 tool failure.`;
}

function safeActivity(activity) {
  return {
    attempts: { known: activity.attempts.known, count: activity.attempts.known ? activity.attempts.count : null },
    completedCalls: { known: activity.completedCalls.known, count: activity.completedCalls.known ? activity.completedCalls.count : null },
    egress: { known: activity.egress.known, count: activity.egress.known ? activity.egress.count : null },
    unknown: { present: activity.unknown.present, categories: [...activity.unknown.categories] },
  };
}

export async function resolveEvaluationState(packet, options = {}) {
  const validation = await validateNaturalEvidence(packet, options);
  if (validation.result === "invalid") return safeValidationOutput(validation);
  return {
    tool: "resolve-evaluation-state",
    contract: "EvidenceEnvelopeV1+NaturalSample-v1",
    offline: true,
    readOnly: true,
    redacted: true,
    contentAddressScope: "packet-local-internal-closure",
    issuerAuthenticity: "not-verified-by-offline-validator",
    providerAuthorityGranted: false,
    result: validation.result,
    lifecycleState: validation.lifecycleState,
    effectiveState: validation.effectiveState,
    declaredState: packet.resolvedState,
    repository: { head: packet.repository.head, clean: packet.repository.clean },
    claimCeiling: packet.claimCeiling,
    runProvenance: packet.runProvenance,
    materialCurrentness: packet.materialCurrentness.status,
    nextAllowedAction: validation.nextAllowedAction,
    blockers: [...packet.blockers],
    declaredAuthority: {
      externalProofStatus: "not-verified-by-offline-validator",
      requiredCount: packet.authority.required.length,
      provenCount: packet.authority.proven.length,
      missingCount: packet.authority.missing.length,
      expiresAt: packet.authority.expiresAt ?? null,
    },
    activity: safeActivity(packet.activity),
    evidenceHashes: [...packet.evidenceHashes].sort(),
    issues: validation.issues.map(({ code, path: issuePath, severity }) => ({ code, path: issuePath, severity })),
  };
}

async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${help()}\n`);
    return 0;
  }
  if (argv.length !== 1 || argv[0].startsWith("-")) {
    process.stdout.write(`${JSON.stringify({ tool: "resolve-evaluation-state", result: "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code: "ARGUMENT_INVALID", path: "#", severity: "invalid" }] })}\n`);
    return 2;
  }
  try {
    const packet = await readPacketFile(argv[0]);
    const output = await resolveEvaluationState(packet);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return output.result === "valid" ? 0 : 2;
  } catch (error) {
    const code = ["JSON_MALFORMED", "JSON_DUPLICATE_KEY", "INPUT_TOO_LARGE"].includes(error?.code) ? error.code : "INPUT_READ_FAILED";
    process.stdout.write(`${JSON.stringify({ tool: "resolve-evaluation-state", result: code === "INPUT_READ_FAILED" ? "error" : "invalid", offline: true, readOnly: true, redacted: true, issues: [{ code, path: "#", severity: "invalid" }] })}\n`);
    return code === "INPUT_READ_FAILED" ? 3 : 2;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
