import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSemanticDispatchAuthorityV5R7,
  validateSemanticDispatchAuthorityV5R7,
} from "./semantic-dispatch-v5-r7.mjs";
import {
  H_V5_R6,
  buildResolvedActivationFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";

const AT = "2026-08-26T10:00:00.000Z";

function successfulBaseLedger(inventory) {
  const entries = [];
  for (const item of inventory.items.slice(1)) {
    for (const role of ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]) {
      const reservationHash = H_V5_R6(`reservation:${item.itemHash}:${role}`);
      entries.push({
        schemaVersion: "FixtureReservationV1",
        entryType: "DISPATCH_RESERVED",
        itemHash: item.itemHash,
        role,
        attemptId: `fixture:${item.itemHash}:${role}`,
        selfHash: reservationHash,
      });
      entries.push({
        schemaVersion: "FixtureCompletionV1",
        entryType: "DISPATCH_COMPLETED",
        reservationHash,
        attemptStatus: "SUCCEEDED",
        selfHash: H_V5_R6(`completion:${item.itemHash}:${role}`),
      });
    }
  }
  return entries;
}

test("R7 semantic authority derives the first canary action from an exact empty ledger", () => {
  const fixture = buildResolvedActivationFixtureV5R6("DEEPSEEK_DIRECT");
  const input = { ...fixture, mode: "DEEPSEEK_CANARY", ledgerEntries: [], issuedAt: AT };
  const authority = buildSemanticDispatchAuthorityV5R7(input);
  assert.equal(authority.role, "B_PRIME_CRITIQUE");
  assert.equal(authority.manifestOrdinal, 1);
  assert.equal(authority.canaryFirstVerified, true);
  assert.equal(authority.roleOrderVerified, true);
  assert.deepEqual(validateSemanticDispatchAuthorityV5R7({
    ...input,
    semanticDispatchAuthority: authority,
  }), []);
});

test("R7 reproduces the R6 plain-object C0 bypass as a fail-closed validation error", () => {
  const fixture = buildResolvedActivationFixtureV5R6("DEEPSEEK_DIRECT");
  const selected = fixture.inventory.items[1];
  assert.throws(() => buildSemanticDispatchAuthorityV5R7({
    ...fixture,
    mode: "DEEPSEEK_RESUME",
    issuedAt: AT,
    ledgerEntries: successfulBaseLedger(fixture.inventory),
    canaryGate: { state: "CANARY_INTEGRITY_CLEARED_NO_TUNING" },
    c0ExecutionSet: {
      selectedItemHashes: [selected.itemHash],
      decisions: [{ itemHash: selected.itemHash, selfHash: H_V5_R6("caller-authored-c0-decision") }],
    },
  }), /ledger|schema|selfHash|validation/u);
});

test("R7 rejects hash-shaped but non-rebuildable canary and C0 objects before planning", () => {
  const fixture = buildResolvedActivationFixtureV5R6("DEEPSEEK_DIRECT");
  assert.throws(() => buildSemanticDispatchAuthorityV5R7({
    ...fixture,
    mode: "DEEPSEEK_RESUME",
    issuedAt: AT,
    ledgerEntries: [],
    canaryGate: { schemaVersion: "CanaryGateReceiptV3", selfHash: "a".repeat(64) },
    c0ExecutionSet: { schemaVersion: "DeepSeekC0ExecutionSetV4", selfHash: "b".repeat(64) },
    predicateInputsByItem: new Map(),
  }), /rebuildable|validation|schema|additional|required/u);
});
