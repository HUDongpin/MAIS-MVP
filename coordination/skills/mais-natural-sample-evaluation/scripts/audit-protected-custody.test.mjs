import assert from "node:assert/strict";
import test from "node:test";

import { auditCustodyMetadata } from "./audit-protected-custody.mjs";
import {
  makeClosedPacket,
  makeCustodyBlockedPacket,
  runScript,
  withTempText,
} from "./test-fixtures.mjs";

test("passes hash-bound protected custody and controlled handoff metadata", async () => {
  const nowMs = Date.now();
  const output = await auditCustodyMetadata(makeClosedPacket(nowMs), { nowMs });
  assert.equal(output.result, "valid", JSON.stringify(output.issues));
  assert.equal(output.custody.directoryMode0700, true);
  assert.equal(output.custody.filesMode0600, true);
  assert.equal(output.custody.symlinkFree, true);
  assert.equal(output.custody.contentExposed, false);
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
});

test("blocks cross-custody runner/sample use without a receipt", async () => {
  const nowMs = Date.now();
  const output = await auditCustodyMetadata(makeCustodyBlockedPacket(nowMs), { nowMs });
  assert.equal(output.result, "blocked");
  assert.ok(output.issues.some((entry) => entry.code === "CUSTODY_HANDOFF_REQUIRED"));
  assert.equal(output.custody.handoffReceiptHashBound, false);
  assert.equal(output.contentAddressScope, "packet-local-internal-closure");
  assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
  assert.equal(output.providerAuthorityGranted, false);
});

test("derives handoff need from custody contexts instead of a required flag", async () => {
  const packet = makeCustodyBlockedPacket();
  assert.equal(Object.hasOwn(packet.runner.custodyHandoff, "required"), false);
  assert.notEqual(packet.sampleFreeze.custody.custodyContextSha256, packet.runner.custodyContextSha256);
  const output = await auditCustodyMetadata(packet);
  assert.equal(output.custody.crossCustodyHandoffRequired, true);
  assert.equal(output.result, "blocked");
});

test("rejects unsafe exact paths without echoing them", async () => {
  const packet = makeClosedPacket();
  packet.protectedPath = "PROTECTED-PATH-CANARY-8841";
  await withTempText(JSON.stringify(packet), async (file) => {
    const result = runScript("audit-protected-custody.mjs", [file]);
    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /protectedPath|PROTECTED-PATH-CANARY-8841/);
    assert.ok(JSON.parse(result.stdout).issues.some((entry) => entry.code === "UNSAFE_FIELD_PRESENT"));
  });
});

test("CLI help states that protected roots are never opened", () => {
  const result = runScript("audit-protected-custody.mjs", ["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /never opens a protected root/);
  assert.match(result.stdout, /Offline and read-only/);
  assert.match(result.stdout, /does not authenticate an external issuer or grant provider authority/);
});

test("CLI blocked custody output carries the explicit offline authority boundary", async () => {
  const packet = makeCustodyBlockedPacket();
  await withTempText(JSON.stringify(packet), async (file) => {
    const result = runScript("audit-protected-custody.mjs", [file]);
    assert.equal(result.status, 2, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.result, "blocked");
    assert.equal(output.contentAddressScope, "packet-local-internal-closure");
    assert.equal(output.issuerAuthenticity, "not-verified-by-offline-validator");
    assert.equal(output.providerAuthorityGranted, false);
  });
});
