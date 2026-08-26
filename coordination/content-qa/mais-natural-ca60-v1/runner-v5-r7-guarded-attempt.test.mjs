import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  runGuardedProviderAttemptV5R7,
} from "./guarded-provider-attempt-v5-r7.mjs";
import {
  createResolvedExactProviderTransportV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  buildSemanticDispatchAuthorityV5R7,
} from "./semantic-dispatch-v5-r7.mjs";
import {
  deepSeekResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  buildResolvedGuardedAttemptFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";

const SECRET = "r7-guarded-fixture-secret-never-persist";

function fixtureClock() {
  let milliseconds = Date.parse("2026-08-26T08:31:00.000Z");
  return () => new Date(milliseconds += 10);
}

async function setup() {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-guarded-"));
  const fixture = buildResolvedGuardedAttemptFixtureV5R6("DEEPSEEK_DIRECT");
  const semanticContext = {
    ...fixture,
    mode: "DEEPSEEK_CANARY",
    ledgerEntries: [],
    issuedAt: "2026-08-26T08:30:00.000Z",
  };
  const semanticDispatchAuthority = buildSemanticDispatchAuthorityV5R7(semanticContext);
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const ledger = await createAtomicExecutionLedgerV5R7({
    trustedRoot,
    ledgerRelativePath: "fixture-ledger",
    authorization: fixture.authorization.compatibilityAuthorization,
    inventory: fixture.inventory,
    priceSnapshot: fixture.priceSnapshot,
  });
  const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
  return { protectedRoot, fixture, semanticContext, semanticDispatchAuthority, ledger, rawResponseStore };
}

test("R7 DeepSeek guard persists semantic authority, raw binding, intent, completion, and final receipt in order", async () => {
  const context = await setup();
  try {
    let credentialReadCount = 0;
    let httpRequestCount = 0;
    const order = [];
    const transport = createResolvedExactProviderTransportV5R6({
      clock: fixtureClock(),
      credentialReader: async () => {
        credentialReadCount += 1;
        return { apiKey: SECRET, subjectIdentity: context.fixture.subjectIdentity };
      },
      fetchImplementation: async () => {
        httpRequestCount += 1;
        return new Response(JSON.stringify(deepSeekResponseEnvelopeV5R4()), {
          status: 200,
          headers: { "content-type": "application/json", "x-request-id": "r7-guarded-fixture" },
        });
      },
    });
    const run = await runGuardedProviderAttemptV5R7({
      ...context.fixture,
      semanticDispatchContext: context.semanticContext,
      semanticDispatchAuthority: context.semanticDispatchAuthority,
      ledger: context.ledger,
      rawResponseStore: context.rawResponseStore,
      transport,
      semanticDispatchAuthorityStore: {
        append: async (value) => { order.push("SEMANTIC_AUTHORITY"); return { contentHash: value.selfHash }; },
      },
      dispatchAuditStore: {
        append: async (value) => { order.push("COMPATIBILITY_AUDIT"); return { contentHash: value.selfHash }; },
      },
      dispatchPermitStore: { append: async (value) => ({ contentHash: value.selfHash }) },
      compatibilityDispatchPermitStore: { append: async (value) => ({ contentHash: value.selfHash }) },
      attemptCommitIntentStore: {
        append: async (value) => { order.push("ATTEMPT_INTENT"); return { contentHash: value.selfHash }; },
      },
      resolvedAttemptReceiptStore: {
        append: async (value) => { order.push("FINAL_RESOLVED"); return { contentHash: value.selfHash }; },
      },
      failureClock: fixtureClock(),
    });
    assert.equal(run.status, "SUCCEEDED");
    assert.equal(credentialReadCount, 1);
    assert.equal(httpRequestCount, 1);
    assert.deepEqual(order, ["SEMANTIC_AUTHORITY", "COMPATIBILITY_AUDIT", "ATTEMPT_INTENT", "FINAL_RESOLVED"]);
    assert.equal(run.resolvedAttemptReceipt.commitIntentPersistedBeforeCompletion, true);
    assert.equal(run.resolvedAttemptReceipt.rawResponseIndependentlyReparsed, true);
    assert.equal(run.roleOutput.runnerRegistrationHash, context.fixture.registration.selfHash);
    const verified = await context.ledger.verify();
    assert.deepEqual(verified.errors, []);
    assert.equal(verified.entries.length, 2);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 DeepSeek guard rejects missing semantic authority before credential read or HTTP", async () => {
  const context = await setup();
  try {
    let credentialReadCount = 0;
    let httpRequestCount = 0;
    const transport = createResolvedExactProviderTransportV5R6({
      credentialReader: async () => { credentialReadCount += 1; return null; },
      fetchImplementation: async () => { httpRequestCount += 1; throw new Error("must not dispatch"); },
    });
    await assert.rejects(runGuardedProviderAttemptV5R7({
      ...context.fixture,
      semanticDispatchContext: context.semanticContext,
      semanticDispatchAuthority: null,
      ledger: context.ledger,
      rawResponseStore: context.rawResponseStore,
      transport,
      semanticDispatchAuthorityStore: { append: async () => { throw new Error("must not append"); } },
      dispatchAuditStore: { append: async () => { throw new Error("must not append"); } },
      dispatchPermitStore: { append: async () => { throw new Error("must not append"); } },
      compatibilityDispatchPermitStore: { append: async () => { throw new Error("must not append"); } },
      attemptCommitIntentStore: { append: async () => { throw new Error("must not append"); } },
      resolvedAttemptReceiptStore: { append: async () => { throw new Error("must not append"); } },
    }), /semantic authority|schema|closed/u);
    assert.equal(credentialReadCount, 0);
    assert.equal(httpRequestCount, 0);
    const verified = await context.ledger.verify();
    assert.deepEqual(verified.entries, []);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});
