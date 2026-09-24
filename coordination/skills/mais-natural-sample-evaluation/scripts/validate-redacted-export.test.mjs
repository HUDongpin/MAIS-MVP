import assert from "node:assert/strict";
import test from "node:test";

import { buildSafeAggregateExport } from "./validate-redacted-export.mjs";
import {
  makeClosedPacket,
  makeM3Packet,
  makeSyntheticPacket,
  makeUnknownActivityPacket,
  runScript,
  withTempText,
} from "./test-fixtures.mjs";

test("emits only an authorized strict aggregate", async () => {
  const nowMs = Date.now();
  const output = await buildSafeAggregateExport(makeClosedPacket(nowMs), { nowMs });
  assert.equal(output.result, "valid", JSON.stringify(output.issues));
  assert.equal(output.aggregate.claimCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(output.aggregate.redaction.protectedContentIncluded, false);
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /codex\/natural-evaluation-fixture|runtime-natural-frame|protectedRootRef|sourceCustodyRef|routeTrustAnchor|authorization\.required/);
});

test("blocks export before final and claim review", async () => {
  const nowMs = Date.now();
  const output = await buildSafeAggregateExport(makeM3Packet(nowMs), { nowMs });
  assert.equal(output.result, "blocked");
  assert.equal(Object.hasOwn(output, "aggregate"), false);
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
});

test("blocks export while activity is unknown and never writes zero", async () => {
  const nowMs = Date.now();
  const packet = makeUnknownActivityPacket(nowMs);
  const output = await buildSafeAggregateExport(packet, { nowMs });
  assert.equal(output.result, "blocked");
  assert.equal(Object.hasOwn(output, "aggregate"), false);
  assert.equal(packet.activity.attempts.count, null);
});

test("reuses the complete envelope validator before emitting any aggregate", async () => {
  const nowMs = Date.now();
  const packet = makeClosedPacket(nowMs);
  packet.receiptGraph.at(-1).bindingDigestSha256 = "0".repeat(64);
  const output = await buildSafeAggregateExport(packet, { nowMs });
  assert.equal(output.result, "invalid");
  assert.equal(Object.hasOwn(output, "aggregate"), false);
  assert.ok(output.issues.some((entry) => entry.code === "GRAPH_BINDING_DIGEST_MISMATCH"));
});

test("never exports synthetic-fixture provenance as a natural result", async () => {
  const nowMs = Date.now();
  const output = await buildSafeAggregateExport(makeSyntheticPacket(nowMs), { nowMs });
  assert.equal(output.result, "blocked");
  assert.equal(Object.hasOwn(output, "aggregate"), false);
});

test("CLI rejects raw response material without echo", async () => {
  const packet = makeClosedPacket();
  packet.rawProviderResponse = "RAW-RESPONSE-DO-NOT-ECHO-612";
  await withTempText(JSON.stringify(packet), async (file) => {
    const result = runScript("validate-redacted-export.mjs", [file]);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /rawProviderResponse|RAW-RESPONSE-DO-NOT-ECHO-612/);
    assert.ok(JSON.parse(result.stdout).issues.some((entry) => entry.code === "UNSAFE_FIELD_PRESENT"));
  });
});

test("CLI help states strict offline redaction", () => {
  const result = runScript("validate-redacted-export.mjs", ["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /strict-allowlist/);
  assert.match(result.stdout, /Offline and read-only/);
  assert.match(result.stdout, /does not authenticate an external issuer or grant provider authority/);
});

test("CLI valid and blocked export outputs carry the explicit offline authority boundary", async () => {
  for (const [packet, expectedStatus, expectedResult] of [
    [makeClosedPacket(), 0, "valid"],
    [makeM3Packet(), 2, "blocked"],
  ]) {
    await withTempText(JSON.stringify(packet), async (file) => {
      const result = runScript("validate-redacted-export.mjs", [file]);
      assert.equal(result.status, expectedStatus, result.stdout);
      const output = JSON.parse(result.stdout);
      assert.equal(output.result, expectedResult);
      assert.equal(output.contentAddressScope, "packet-local-internal-closure");
      assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
      assert.equal(output.providerAuthorityGranted, false);
    });
  }
});
