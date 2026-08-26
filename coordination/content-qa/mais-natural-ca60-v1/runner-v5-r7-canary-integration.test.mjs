import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  reconstructAttemptGraphV5R7,
  roleOutputByEvidenceV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  buildCanaryGateReceiptV5R7,
  buildCanaryPredicateInputMapV5R7,
  buildCanaryPredicateReceiptV5R7,
  validateCanaryGateReceiptV5R7,
} from "./c0-state-v5-r7.mjs";
import {
  runGuardedProviderAttemptV5R7,
} from "./guarded-provider-attempt-v5-r7.mjs";
import {
  buildStateBoundDispatchAuditV5R6,
  createResolvedExactProviderTransportV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  buildCompatibilityCanaryC0DecisionSetV5R7,
  buildSemanticDispatchAuthorityV5R7,
  buildSemanticDispatchVerificationReceiptV5R7,
} from "./semantic-dispatch-v5-r7.mjs";
import {
  deepSeekResponseEnvelopeV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";
import {
  buildResolvedActivationFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";

const SECRET = "r7-canary-fixture-secret-never-persist";

function clock() {
  let milliseconds = Date.parse("2026-08-26T09:00:00.000Z");
  return () => new Date(milliseconds += 10);
}

function responsePayload(role, critiqueOutput) {
  if (role === "B_PRIME_CRITIQUE") {
    return { valid: true, surfaceDisposition: "NO_FINDING", findings: [], requiredRevisionCodes: [] };
  }
  if (role === "B_PRIME_REVISION") {
    return { valid: true, surfaceDisposition: "NO_FINDING", findings: [],
      critiqueArtifactHash: critiqueOutput.selfHash, resolutions: [] };
  }
  return { valid: true, surfaceDisposition: "NO_FINDING", findings: [] };
}

test("R7 reaches a normal seven-role registered canary gate from raw-reparsed attempts", async () => {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-canary-"));
  try {
    const fixture = buildResolvedActivationFixtureV5R6("DEEPSEEK_DIRECT");
    const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
    const ledger = await createAtomicExecutionLedgerV5R7({
      trustedRoot,
      ledgerRelativePath: "canary-ledger",
      authorization: fixture.authorization.compatibilityAuthorization,
      inventory: fixture.inventory,
      priceSnapshot: fixture.priceSnapshot,
    });
    const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
    const requestArtifacts = [];
    const dispatchAudits = [];
    const dispatchPermits = [];
    const compatibilityDispatchPermits = [];
    const rawResponseArtifacts = [];
    const rawResponseBindingReceipts = [];
    const attemptCommitIntents = [];
    const resolvedAttemptReceipts = [];
    const semanticDispatchAuthorities = [];
    const semanticAuthorityContextsByHash = new Map();
    let currentRole = null;
    let critiqueOutput = null;
    let canaryPredicateReceipt = null;
    let canaryPredicateInput = null;

    const transport = createResolvedExactProviderTransportV5R6({
      clock: clock(),
      credentialReader: async () => ({ apiKey: SECRET, subjectIdentity: fixture.subjectIdentity }),
      fetchImplementation: async () => new Response(JSON.stringify(deepSeekResponseEnvelopeV5R4(
        responsePayload(currentRole, critiqueOutput),
      )), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": `r7-${currentRole}` },
      }),
    });

    async function graph(derivedAt) {
      const verified = await ledger.verify();
      assert.deepEqual(verified.errors, []);
      return reconstructAttemptGraphV5R7({
        ...fixture,
        ledgerEntries: verified.entries,
        requestArtifacts,
        dispatchAudits,
        dispatchPermits,
        compatibilityDispatchPermits,
        semanticDispatchAuthorities,
        rawResponseArtifacts,
        rawResponseBindingReceipts,
        attemptCommitIntents,
        resolvedAttemptReceipts,
        canaryPredicateReceipt,
        canaryPredicateInput,
        derivedAt,
      });
    }

    for (let index = 0; index < 7; index += 1) {
      const verified = await ledger.verify();
      const at = new Date(Date.parse("2026-08-26T09:01:00.000Z") + index * 60_000).toISOString();
      const state = {
        ...fixture,
        mode: "DEEPSEEK_CANARY",
        ledgerEntries: verified.entries,
        canaryPredicateReceipt,
        canaryPredicateInput,
        c0ExecutionSet: canaryPredicateReceipt
          ? buildCompatibilityCanaryC0DecisionSetV5R7(canaryPredicateReceipt) : null,
        at,
      };
      const semanticContext = { ...state, c0ExecutionSet: null, issuedAt: at };
      const semanticDispatchAuthority = buildSemanticDispatchAuthorityV5R7(semanticContext);
      const audit = buildStateBoundDispatchAuditV5R6(state);
      assert.equal(audit.itemHash, semanticDispatchAuthority.itemHash);
      assert.equal(audit.role, semanticDispatchAuthority.role);
      currentRole = audit.role;
      const row = fixture.sampleManifest.selectedRows[audit.executionPlan.manifestOrdinal - 1];
      const itemLeaf = fixture.itemLeaves.find(({ itemId }) => itemId === row.itemId);
      const requestArtifact = buildProviderRequestArtifactV5R6({
        activeRegistration: fixture.activeRegistration,
        authorization: fixture.authorization,
        registration: fixture.registration,
        inventory: fixture.inventory,
        sampleManifest: fixture.sampleManifest,
        itemLeaf,
        role: audit.role,
        attemptId: audit.attemptId,
        ledgerEntries: verified.entries,
      });
      const run = await runGuardedProviderAttemptV5R7({
        ...state,
        itemLeaf,
        requestArtifact,
        semanticDispatchContext: semanticContext,
        semanticDispatchAuthority,
        ledger,
        rawResponseStore,
        transport,
        semanticDispatchAuthorityStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        dispatchAuditStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        dispatchPermitStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        compatibilityDispatchPermitStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        attemptCommitIntentStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        resolvedAttemptReceiptStore: { append: async (value) => ({ contentHash: value.selfHash }) },
        failureClock: clock(),
      });
      assert.equal(run.status, "SUCCEEDED");
      requestArtifacts.push(requestArtifact);
      dispatchAudits.push(run.compatibilityDispatchAudit);
      dispatchPermits.push(run.permit);
      compatibilityDispatchPermits.push(run.compatibilityPermit);
      semanticDispatchAuthorities.push(semanticDispatchAuthority);
      semanticAuthorityContextsByHash.set(semanticDispatchAuthority.selfHash, semanticContext);
      rawResponseArtifacts.push(run.rawResponseArtifact);
      rawResponseBindingReceipts.push(run.rawResponseBindingReceipt);
      attemptCommitIntents.push(run.attemptCommitIntent);
      resolvedAttemptReceipts.push(run.resolvedAttemptReceipt);
      if (run.roleOutput.role === "B_PRIME_CRITIQUE") critiqueOutput = run.roleOutput;

      if (index === 1) {
        const partial = await graph("2026-08-26T09:03:30.000Z");
        assert.equal(partial.receipt.graphStatus, "COMPLETE_VALID");
        const roleOutputs = roleOutputByEvidenceV5R7({
          roleAttemptEvidenceReceipts: partial.roleAttemptEvidenceReceipts,
          ledgerEntries: (await ledger.verify()).entries,
        });
        const predicateInputs = buildCanaryPredicateInputMapV5R7({
          inventory: fixture.inventory,
          itemLeaves: fixture.itemLeaves,
          roleAttemptEvidenceReceipts: partial.roleAttemptEvidenceReceipts,
          roleOutputs,
        });
        canaryPredicateInput = predicateInputs.get(fixture.inventory.items[0].itemHash);
        canaryPredicateReceipt = buildCanaryPredicateReceiptV5R7({
          activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
          executionRegistrationHash: fixture.executionRegistration.selfHash,
          inventory: fixture.inventory,
          predicateInputsByItem: predicateInputs,
        });
        assert.equal(canaryPredicateReceipt.selectedForC0, true);
      }
    }

    const finalLedger = await ledger.verify();
    const finalGraph = await graph("2026-08-26T09:10:00.000Z");
    assert.equal(finalGraph.receipt.graphStatus, "COMPLETE_VALID");
    assert.equal(finalGraph.roleAttemptEvidenceReceipts.length, 7);
    const roleOutputs = roleOutputByEvidenceV5R7({
      roleAttemptEvidenceReceipts: finalGraph.roleAttemptEvidenceReceipts,
      ledgerEntries: finalLedger.entries,
    });
    const semanticDispatchVerificationReceipt = buildSemanticDispatchVerificationReceiptV5R7({
      activeRegistration: fixture.activeRegistration,
      authorization: fixture.authorization,
      executionRegistration: fixture.executionRegistration,
      inventory: fixture.inventory,
      mode: "DEEPSEEK_CANARY",
      ledgerEntries: finalLedger.entries,
      semanticDispatchAuthorities,
      semanticAuthorityContextsByHash,
      roleAttemptEvidenceReceipts: finalGraph.roleAttemptEvidenceReceipts,
      canaryPredicateReceipt,
      verifiedAt: "2026-08-26T09:11:00.000Z",
    });
    const gateInput = {
      activeRunnerRegistrationHash: fixture.activeRegistration.selfHash,
      executionRegistrationHash: fixture.executionRegistration.selfHash,
      deepSeekAuthorizationHash: fixture.authorization.selfHash,
      inventory: fixture.inventory,
      canaryPredicateReceipt,
      canaryPredicateInput,
      roleAttemptEvidenceReceipts: finalGraph.roleAttemptEvidenceReceipts,
      roleOutputs,
      semanticDispatchVerificationReceipt,
      ledgerTerminalHash: finalLedger.entries.at(-1).selfHash,
      passedAt: "2026-08-26T09:12:00.000Z",
    };
    const canaryGate = buildCanaryGateReceiptV5R7(gateInput);
    assert.equal(canaryGate.state, "CANARY_INTEGRITY_CLEARED_NO_TUNING");
    assert.deepEqual(validateCanaryGateReceiptV5R7({ ...gateInput, canaryGate }), []);

    const firstPostCanaryBaseAuthority = buildSemanticDispatchAuthorityV5R7({
      ...fixture,
      mode: "DEEPSEEK_RESUME",
      ledgerEntries: finalLedger.entries,
      canaryGate,
      canaryGateContext: gateInput,
      canaryPredicateReceipt: null,
      canaryPredicateInput: null,
      c0ExecutionSet: null,
      predicateInputsByItem: null,
      issuedAt: "2026-08-26T09:13:00.000Z",
    });
    assert.equal(firstPostCanaryBaseAuthority.manifestOrdinal, 2);
    assert.equal(firstPostCanaryBaseAuthority.role, "B_PRIME_CRITIQUE");
    assert.equal(firstPostCanaryBaseAuthority.c0ExecutionSetHash, null);
  } finally {
    await rm(protectedRoot, { recursive: true, force: true });
  }
});
