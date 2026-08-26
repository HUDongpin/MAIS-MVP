import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };

import {
  reconstructAttemptGraphV5R7,
  roleOutputByEvidenceV5R7,
  validateAttemptGraphReconstructionReceiptV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  buildProviderAttemptCommitIntentV5R7,
  buildResolvedProviderAttemptReceiptV5R7,
  commitProviderAttemptWithDurableIntentV5R7,
  validateProviderAttemptCommitIntentV5R7,
  validateResolvedProviderAttemptReceiptV5R7,
} from "./attempt-transaction-v5-r7.mjs";
import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  createAtomicExecutionLedgerV5R5,
} from "./atomic-execution-ledger-v5-r5.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  buildResolvedDispatchPermitV5R6,
  createResolvedExactProviderTransportV5R6,
  runGuardedProviderAttemptV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  deepSeekResponseEnvelopeV5R4,
  openAIResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  buildResolvedGuardedAttemptFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";
import {
  buildSemanticDispatchAuthorityV5R7,
} from "./semantic-dispatch-v5-r7.mjs";

const SECRET_SENTINEL = "r7-fixture-secret-never-persist";

function fixtureClock() {
  let milliseconds = Date.parse("2026-08-26T08:31:00.000Z");
  return () => new Date(milliseconds += 10);
}

function responseBody(provider) {
  return JSON.stringify(provider === "OPENAI_DIRECT"
    ? openAIResponseEnvelopeV5R4() : deepSeekResponseEnvelopeV5R4());
}

async function successfulCompatibilityAttempt(provider = "DEEPSEEK_DIRECT") {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-attempt-"));
  const fixture = buildResolvedGuardedAttemptFixtureV5R6(provider);
  const semanticAuthority = provider === "DEEPSEEK_DIRECT"
    ? buildSemanticDispatchAuthorityV5R7({
      ...fixture,
      mode: "DEEPSEEK_CANARY",
      ledgerEntries: [],
      issuedAt: "2026-08-26T08:31:00.000Z",
    }) : null;
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const ledger = await createAtomicExecutionLedgerV5R5({
    trustedRoot,
    ledgerRelativePath: path.join("fixture-ledgers", provider.toLowerCase()),
    activeRegistration: V5_R5_REGISTRATION,
    authorization: fixture.authorization.compatibilityAuthorization,
    inventory: fixture.inventory,
    priceSnapshot: fixture.priceSnapshot,
    clock: fixtureClock(),
    ownerPid: process.pid,
  });
  const custody = await createRawResponseCustodyStoreV5R6({ protectedRoot });
  let rawResponseArtifact = null;
  const rawResponseStore = {
    persist: async (input) => {
      const persisted = await custody.persist(input);
      rawResponseArtifact = persisted.artifact;
      return persisted;
    },
    persistBinding: (binding) => custody.persistBinding(binding),
  };
  const transport = createResolvedExactProviderTransportV5R6({
    clock: fixtureClock(),
    credentialReader: async () => ({
      apiKey: SECRET_SENTINEL,
      subjectIdentity: fixture.subjectIdentity,
      ...(provider === "OPENAI_DIRECT" ? { openAIProjectId: fixture.subjectIdentity } : {}),
    }),
    fetchImplementation: async () => new Response(responseBody(provider), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "r7-fixture-request" },
    }),
  });
  const run = await runGuardedProviderAttemptV5R6({
    ...fixture,
    ledger,
    rawResponseStore,
    transport,
    dispatchAuditStore: { append: async (value) => ({ contentHash: value.selfHash }) },
    attemptReceiptStore: { append: async (value) => ({ contentHash: value.selfHash }) },
    failureClock: fixtureClock(),
  });
  assert.equal(run.status, "SUCCEEDED");
  assert.ok(rawResponseArtifact);
  const ledgerVerification = await ledger.verify();
  assert.deepEqual(ledgerVerification.errors, []);
  return { protectedRoot, fixture, semanticAuthority, run, rawResponseArtifact,
    ledgerEntries: ledgerVerification.entries };
}

function common({ fixture, run, rawResponseArtifact }) {
  return {
    activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
    authorizationHash: fixture.authorization.selfHash,
    authenticatedRouteEvidenceHash: fixture.authenticatedRouteEvidence.selfHash,
    requestArtifact: fixture.requestArtifact,
    dispatchAudit: run.dispatchAudit,
    reservation: run.reservation,
    dispatchPermit: run.permit,
    compatibilityDispatchPermit: run.compatibilityPermit,
    rawResponseArtifact,
    rawResponseBindingReceipt: run.rawResponseBindingReceipt,
    providerEventReceipt: run.providerEventReceipt,
    roleOutput: run.roleOutput,
    preparedCompletion: run.completion,
    rawAndBindingDurable: true,
    projectResidency: fixture.authorization.projectResidency,
    dataRegion: fixture.authorization.dataRegion,
    credentialReadCount: run.credentialReadCount,
    preparedAt: "2026-08-26T08:32:00.000Z",
  };
}

test("R7 attempt intent and resolved receipt rebuild the exact retained-raw lineage", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const intent = buildProviderAttemptCommitIntentV5R7(input);
    assert.deepEqual(validateProviderAttemptCommitIntentV5R7({ ...input, intent }), []);
    const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
      ...input,
      intent,
      committedCompletion: context.run.completion,
    });
    assert.deepEqual(validateResolvedProviderAttemptReceiptV5R7({
      ...input,
      intent,
      committedCompletion: context.run.completion,
      resolvedAttemptReceipt,
    }), []);
    assert.equal(resolvedAttemptReceipt.commitIntentPersistedBeforeCompletion, true);
    assert.equal(resolvedAttemptReceipt.rawResponseIndependentlyReparsed, true);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 two-phase commit persists intent before compatibility completion and final receipt", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const order = [];
    const result = await commitProviderAttemptWithDurableIntentV5R7({
      ...input,
      ledger: {
        completeWithDurableIntent: async ({ persistIntent }) => {
          const persisted = await persistIntent(context.run.completion);
          order.push("COMPLETION");
          return { completion: context.run.completion, intentHash: persisted.intent.selfHash };
        },
      },
      attemptCommitIntentStore: {
        append: async (value) => {
          order.push("INTENT");
          return { contentHash: value.selfHash };
        },
      },
      resolvedAttemptReceiptStore: {
        append: async (value) => {
          order.push("RESOLVED");
          return { contentHash: value.selfHash };
        },
      },
    });
    assert.deepEqual(order, ["INTENT", "COMPLETION", "RESOLVED"]);
    assert.equal(result.intentPersistedBeforeCompletion, true);
    assert.equal(result.completionMatchesPreparedHash, true);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 rejects raw-byte drift and a pre-provider chronology fabricated after the fact", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const rawDrift = { ...context.rawResponseArtifact, rawResponseBody: `${context.rawResponseArtifact.rawResponseBody} ` };
    assert.ok(validateProviderAttemptCommitIntentV5R7({
      ...input,
      rawResponseArtifact: rawDrift,
      intent: buildProviderAttemptCommitIntentV5R7(input),
    }).length > 0);
    assert.throws(() => buildProviderAttemptCommitIntentV5R7({
      ...input,
      preparedAt: "2026-08-26T08:00:00.000Z",
    }), /chronology/u);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 final-store failure cannot erase the already durable intent or completion", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const order = [];
    await assert.rejects(commitProviderAttemptWithDurableIntentV5R7({
      ...input,
      ledger: {
        completeWithDurableIntent: async ({ persistIntent }) => {
          const persisted = await persistIntent(context.run.completion);
          order.push("COMPLETION");
          return { completion: context.run.completion, intentHash: persisted.intent.selfHash };
        },
      },
      attemptCommitIntentStore: {
        append: async (value) => {
          order.push("INTENT");
          return { contentHash: value.selfHash };
        },
      },
      resolvedAttemptReceiptStore: {
        append: async () => {
          order.push("RESOLVED_WRITE_FAILED");
          throw new Error("fixture final-store failure");
        },
      },
    }), /fixture final-store failure/u);
    assert.deepEqual(order, ["INTENT", "COMPLETION", "RESOLVED_WRITE_FAILED"]);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

function graphInput(context, intent, resolvedAttemptReceipt) {
  return {
    ...context.fixture,
    activeRegistration: context.fixture.activeRegistration,
    authorization: context.fixture.authorization,
    authenticatedRouteEvidence: context.fixture.authenticatedRouteEvidence,
    registration: context.fixture.registration,
    inventory: context.fixture.inventory,
    sampleManifest: context.fixture.sampleManifest,
    itemLeaves: context.fixture.itemLeaves,
    ledgerEntries: context.ledgerEntries,
    requestArtifacts: [context.fixture.requestArtifact],
    dispatchAudits: [context.run.dispatchAudit],
    semanticDispatchAuthorities: context.semanticAuthority ? [context.semanticAuthority] : [],
    dispatchPermits: [context.run.permit],
    compatibilityDispatchPermits: [context.run.compatibilityPermit],
    rawResponseArtifacts: [context.rawResponseArtifact],
    rawResponseBindingReceipts: [context.run.rawResponseBindingReceipt],
    attemptCommitIntents: [intent],
    resolvedAttemptReceipts: [resolvedAttemptReceipt],
    derivedAt: "2026-08-26T08:33:00.000Z",
  };
}

test("R7 independently reconstructs every attempt edge and only then emits role evidence", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const intent = buildProviderAttemptCommitIntentV5R7(input);
    const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
      ...input,
      intent,
      committedCompletion: context.run.completion,
    });
    const graphInputs = graphInput(context, intent, resolvedAttemptReceipt);
    const graph = reconstructAttemptGraphV5R7(graphInputs);
    assert.equal(graph.receipt.graphStatus, "COMPLETE_VALID");
    assert.equal(graph.receipt.lineageErrorCount, 0);
    assert.equal(graph.roleAttemptEvidenceReceipts.length, 1);
    assert.equal(graph.roleAttemptEvidenceReceipts[0].rawResponseReparsed, true);
    assert.deepEqual(validateAttemptGraphReconstructionReceiptV5R7({
      ...graphInputs,
      attemptGraphReceipt: graph.receipt,
    }), []);
    assert.equal(roleOutputByEvidenceV5R7({
      roleAttemptEvidenceReceipts: graph.roleAttemptEvidenceReceipts,
      ledgerEntries: context.ledgerEntries,
    })[0].selfHash, context.run.roleOutput.selfHash);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 graph rejects a self-hashed but lineage-fabricated resolved attempt", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const intent = buildProviderAttemptCommitIntentV5R7(input);
    const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
      ...input,
      intent,
      committedCompletion: context.run.completion,
    });
    const { selfHash: _resolvedHash, ...resolvedBody } = resolvedAttemptReceipt;
    const fabricated = sealV5R3Artifact({
      ...resolvedBody,
      compatibilityCompletionHash: "f".repeat(64),
    });
    const graph = reconstructAttemptGraphV5R7(graphInput(context, intent, fabricated));
    assert.equal(graph.receipt.graphStatus, "INCOMPLETE_OR_INVALID");
    assert.ok(graph.receipt.lineageErrorCount > 0);
    assert.equal(graph.roleAttemptEvidenceReceipts.length, 0);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 role-output resolver rejects a self-hashed evidence receipt with altered semantics", async () => {
  const context = await successfulCompatibilityAttempt();
  try {
    const input = common(context);
    const intent = buildProviderAttemptCommitIntentV5R7(input);
    const resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
      ...input,
      intent,
      committedCompletion: context.run.completion,
    });
    const graph = reconstructAttemptGraphV5R7(graphInput(context, intent, resolvedAttemptReceipt));
    const { selfHash: _evidenceHash, ...evidenceBody } = graph.roleAttemptEvidenceReceipts[0];
    const fabricatedEvidence = sealV5R3Artifact({
      ...evidenceBody,
      role: "C0_PRIME_ROLE_5",
    });
    assert.throws(() => roleOutputByEvidenceV5R7({
      roleAttemptEvidenceReceipts: [fabricatedEvidence],
      ledgerEntries: context.ledgerEntries,
    }), /exact compatibility role output/u);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

async function runCompatibilityAttemptThroughR7Ledger({ failIntentStore = false } = {}) {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-ledger-"));
  const fixture = buildResolvedGuardedAttemptFixtureV5R6("DEEPSEEK_DIRECT");
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const atomicLedger = await createAtomicExecutionLedgerV5R7({
    trustedRoot,
    ledgerRelativePath: "r7-ledger",
    authorization: fixture.authorization.compatibilityAuthorization,
    inventory: fixture.inventory,
    priceSnapshot: fixture.priceSnapshot,
  });
  const custody = await createRawResponseCustodyStoreV5R6({ protectedRoot });
  let rawResponseArtifact = null;
  let rawResponseBindingReceipt = null;
  let attemptCommitIntent = null;
  const order = [];
  const rawResponseStore = {
    persist: async (input) => {
      const persisted = await custody.persist(input);
      rawResponseArtifact = persisted.artifact;
      return persisted;
    },
    persistBinding: async (binding) => {
      const persisted = await custody.persistBinding(binding);
      rawResponseBindingReceipt = binding;
      return persisted;
    },
  };
  const ledger = {
    reserve: (input) => atomicLedger.reserve(input),
    complete: async ({ reservationHash, providerEventReceipt, roleOutput }) => {
      const before = await atomicLedger.verify();
      const reservation = before.entries.find(({ selfHash }) => selfHash === reservationHash);
      const dispatchPermit = buildResolvedDispatchPermitV5R6({
        input: fixture,
        reservation,
        dispatchAudit: fixture.dispatchAudit,
      });
      const committed = await atomicLedger.completeWithDurableIntent({
        reservationHash,
        providerEventReceipt,
        roleOutput,
        persistIntent: async (preparedCompletion) => {
          if (failIntentStore) throw new Error("fixture durable-intent store unavailable");
          attemptCommitIntent = buildProviderAttemptCommitIntentV5R7({
            activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
            authorizationHash: fixture.authorization.selfHash,
            requestArtifact: fixture.requestArtifact,
            dispatchAudit: fixture.dispatchAudit,
            reservation,
            dispatchPermit,
            compatibilityDispatchPermit: providerEventReceipt.dispatchPermit,
            rawResponseArtifact,
            rawResponseBindingReceipt,
            providerEventReceipt,
            roleOutput,
            preparedCompletion,
            rawAndBindingDurable: true,
            preparedAt: "2026-08-26T08:32:00.000Z",
          });
          order.push("INTENT");
          return { intent: attemptCommitIntent, contentHash: attemptCommitIntent.selfHash };
        },
      });
      order.push("COMPLETION");
      return committed.completion;
    },
  };
  const transport = createResolvedExactProviderTransportV5R6({
    clock: fixtureClock(),
    credentialReader: async () => ({
      apiKey: SECRET_SENTINEL,
      subjectIdentity: fixture.subjectIdentity,
    }),
    fetchImplementation: async () => new Response(responseBody("DEEPSEEK_DIRECT"), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "r7-ledger-fixture" },
    }),
  });
  const runPromise = runGuardedProviderAttemptV5R6({
    ...fixture,
    ledger,
    rawResponseStore,
    transport,
    dispatchAuditStore: { append: async (value) => ({ contentHash: value.selfHash }) },
    attemptReceiptStore: { append: async (value) => ({ contentHash: value.selfHash }) },
    failureClock: fixtureClock(),
  });
  return { protectedRoot, fixture, atomicLedger, order, runPromise,
    getIntent: () => attemptCommitIntent };
}

test("R7 atomic ledger appends the exact prepared completion only after its durable intent", async () => {
  const context = await runCompatibilityAttemptThroughR7Ledger();
  try {
    const run = await context.runPromise;
    assert.equal(run.status, "SUCCEEDED");
    assert.deepEqual(context.order, ["INTENT", "COMPLETION"]);
    assert.equal(context.getIntent().preparedCompletionHash, run.completion.selfHash);
    const verified = await context.atomicLedger.verify();
    assert.deepEqual(verified.errors, []);
    assert.equal(verified.entries.length, 2);
    assert.equal(verified.entries[1].selfHash, run.completion.selfHash);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});

test("R7 atomic ledger leaves an unresolved reservation when durable intent persistence fails", async () => {
  const context = await runCompatibilityAttemptThroughR7Ledger({ failIntentStore: true });
  try {
    await assert.rejects(context.runPromise, /durable-intent store unavailable/u);
    assert.deepEqual(context.order, []);
    const verified = await context.atomicLedger.verify();
    assert.deepEqual(verified.errors, []);
    assert.equal(verified.entries.length, 1);
    assert.equal(verified.entries[0].entryType, "DISPATCH_RESERVED");
    assert.equal(verified.accounting.active.length, 1);
  } finally {
    await rm(context.protectedRoot, { recursive: true, force: true });
  }
});
