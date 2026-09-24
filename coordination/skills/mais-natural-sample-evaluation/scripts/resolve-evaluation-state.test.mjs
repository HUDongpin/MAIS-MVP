import assert from "node:assert/strict";
import test from "node:test";

import { resolveEvaluationState } from "./resolve-evaluation-state.mjs";
import {
  clone,
  makeClosedPacket,
  makeExecutionBlockedPacket,
  makeM3Packet,
  makeUnregisteredPacket,
  refreshGraphBindings,
  runScript,
  withTempText,
} from "./test-fixtures.mjs";

test("resolves from receipt lineage rather than a misleading branch label", async () => {
  const nowMs = Date.now();
  const packet = makeM3Packet(nowMs);
  packet.repository.branch = "docs/old-status-label";
  refreshGraphBindings(packet);
  const output = await resolveEvaluationState(packet, { nowMs });
  assert.equal(output.lifecycleState, "RUNNER_INDEPENDENTLY_VERIFIED");
  assert.equal(output.declaredState, "RUNNER_INDEPENDENTLY_VERIFIED");
  assert.equal(output.nextAllowedAction, "REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION");
  assert.doesNotMatch(JSON.stringify(output), /old-status-label|source-runtime/);
});

test("execution request without fresh grant and custody handoff is blocked", async () => {
  const nowMs = Date.now();
  const output = await resolveEvaluationState(makeExecutionBlockedPacket(nowMs), { nowMs });
  assert.equal(output.result, "blocked");
  assert.equal(output.effectiveState, "BLOCKED_CUSTODY");
  assert.deepEqual(output.activity.attempts, { known: false, count: null });
  assert.ok(output.blockers.includes("AUTHORITY_MISSING"));
  assert.ok(output.blockers.includes("ROUTE_AUTHENTICITY_UNPROVEN"));
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
  assert.equal(Object.hasOwn(output, "authority"), false);
  assert.equal(output.declaredAuthority.provenCount, 1);
  assert.equal(output.declaredAuthority.externalProofStatus, "not-verified-by-offline-validator");
});

test("closed packet resolves cleanly", async () => {
  const nowMs = Date.now();
  const output = await resolveEvaluationState(makeClosedPacket(nowMs), { nowMs });
  assert.equal(output.result, "valid");
  assert.equal(output.lifecycleState, "CLOSED");
  assert.equal(output.nextAllowedAction, "CLOSE");
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
  assert.equal(Object.hasOwn(output, "authority"), false);
  assert.equal(output.declaredAuthority.provenCount, 4);
  assert.equal(output.declaredAuthority.externalProofStatus, "not-verified-by-offline-validator");
});

test("terminal cap evidence resolves to STOP_BLOCKED rather than trusting declared CLOSE", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.evaluated.grantBinding.caps.attemptCap = 2;
  packet.sourceRights.evaluatedGrantBinding = clone(packet.evaluated.grantBinding);
  packet.receiptGraph.find((node) => node.kind === "EVALUATED_AUTHORIZATION").providerGrantBinding = clone(packet.evaluated.grantBinding);
  refreshGraphBindings(packet);

  const output = await resolveEvaluationState(packet, { nowMs });
  assert.equal(output.result, "blocked");
  assert.equal(output.declaredState, "CLOSED");
  assert.equal(output.effectiveState, "BLOCKED_SEQUENCE");
  assert.equal(output.nextAllowedAction, "STOP_BLOCKED");
});

test("invalid terminal packets are summarized with a non-advancing state and action", async () => {
  const packet = makeClosedPacket();
  packet.reference.status = "NOT_STARTED";
  const output = await resolveEvaluationState(packet);
  assert.equal(output.result, "invalid");
  assert.notEqual(output.effectiveState, "CLOSED");
  assert.equal(output.nextAllowedAction, "STOP_BLOCKED");
  assert.equal(Object.hasOwn(output, "claimCeiling"), false);
});

test("unregistered state is valid only at NO_EVALUATION_CLAIM and never leaks a higher ceiling", async () => {
  const clean = await resolveEvaluationState(makeUnregisteredPacket());
  assert.equal(clean.result, "valid");
  assert.equal(clean.claimCeiling, "NO_EVALUATION_CLAIM");

  const packet = makeUnregisteredPacket();
  packet.claimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.protocol.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  packet.registeredInferenceFrame.registeredClaimCeiling = "AGGREGATE_MACHINE_REFERENCE_ONLY";
  const rejected = await resolveEvaluationState(packet);
  assert.equal(rejected.result, "invalid");
  assert.equal(Object.hasOwn(rejected, "claimCeiling"), false);
  assert.ok(rejected.issues.some((entry) => entry.code === "UNREGISTERED_CLAIM_CEILING_FORBIDDEN"));
});

test("CLI output is redacted and help is offline", async () => {
  const packet = makeM3Packet();
  await withTempText(JSON.stringify(packet), async (file) => {
    const result = runScript("resolve-evaluation-state.mjs", [file]);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /codex\/natural-evaluation-fixture|runtime-natural-frame/);
    const output = JSON.parse(result.stdout);
    assert.equal(output.offline, true);
    assert.equal(output.contentAddressScope, "packet-local-internal-closure");
    assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
    assert.equal(output.providerAuthorityGranted, false);
    assert.equal(Object.hasOwn(output, "authority"), false);
    assert.equal(output.declaredAuthority.externalProofStatus, "not-verified-by-offline-validator");
  });
  const help = runScript("resolve-evaluation-state.mjs", ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Offline, read-only/);
  assert.match(help.stdout, /does not authenticate an external issuer or grant provider authority/);
});
