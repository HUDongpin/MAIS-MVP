#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  collectLiveRuntimeEvidence,
  validateMachineQaPacket,
} from "./machine-qa-contract.mjs";

const EXIT_VALID = 0;
const EXIT_BLOCKED = 2;
const EXIT_INTERNAL = 3;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_EMITTED_ISSUES = 100;

function printHelp() {
  process.stdout.write(`Usage: node scripts/validate-machine-qa-packet.mjs PACKET.json

Offline, read-only validation of the common EvidenceEnvelopeV1 plus RSI
machine-QA semantics. Live-use evidence is validated only; this tool never
calls a provider. For a declared live run it recomputes the canonical
executable-code manifest and exact static local import closure, verifies every
listed file against clean current HEAD and working-tree bytes/modes, and
requires the packet outside that repository or in a verified ignored
quarantine. It parses but never links, evaluates, or executes the runner.

A structurally valid packet is never provider authority. A live call still
requires fresh exact authorization from the current task and comparison with
the externally trusted receipt. Trust-anchor hashes prove field/byte closure,
not issuer authentication; this validator performs no signature verification.

Exit codes:
  0  structurally valid, semantically valid, current complete packet
  2  blocked, invalid, malformed, unsafe, stale, or unauthorized packet
  3  internal tool or filesystem failure
`);
}

function emit(result, issues = []) {
  const bounded = issues.slice(0, MAX_EMITTED_ISSUES);
  process.stdout.write(`${JSON.stringify({
    tool: "validate-machine-qa-packet",
    contract: "EvidenceEnvelopeV1+RSI-v2",
    result,
    issueCount: issues.length,
    issuesTruncated: issues.length > bounded.length,
    issues: bounded,
  })}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    printHelp();
    return EXIT_VALID;
  }
  if (args.length !== 1 || args[0].startsWith("-")) {
    emit("blocked", [{ code: "USAGE_INVALID", path: "$" }]);
    return EXIT_BLOCKED;
  }

  let source;
  try {
    source = await readFile(args[0], "utf8");
  } catch {
    emit("internal-error", [{ code: "INPUT_READ_FAILED", path: "$" }]);
    return EXIT_INTERNAL;
  }
  if (Buffer.byteLength(source, "utf8") > MAX_INPUT_BYTES) {
    emit("blocked", [{ code: "INPUT_TOO_LARGE", path: "$" }]);
    return EXIT_BLOCKED;
  }

  let packet;
  try {
    packet = JSON.parse(source);
  } catch {
    emit("blocked", [{ code: "JSON_MALFORMED", path: "$" }]);
    return EXIT_BLOCKED;
  }

  const runtimeEvidence = await collectLiveRuntimeEvidence(args[0], packet);
  const issues = validateMachineQaPacket(packet, { runtimeEvidence });
  if (issues.length > 0) {
    emit("blocked", issues);
    return EXIT_BLOCKED;
  }
  emit("valid");
  return EXIT_VALID;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    emit("internal-error", [{ code: "UNEXPECTED_INTERNAL_FAILURE", path: "$" }]);
    process.exitCode = EXIT_INTERNAL;
  });
