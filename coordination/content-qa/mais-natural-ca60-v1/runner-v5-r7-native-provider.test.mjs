import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildProviderDispatchPermitV5R7,
  buildReferenceDispatchAuthorityV5R7,
  validateProviderDispatchPermitV5R7,
  validateReferenceDispatchAuthorityV5R7,
} from "./dispatch-authority-v5-r7.mjs";
import {
  createNativeProviderTransportV5R7,
} from "./native-provider-attempt-v5-r7.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  establishProtectedRootV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  buildResolvedActivationFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";

test("R7 reference authority and permit rebuild exactly, while stale registration fails before credential read", async () => {
  const protectedRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), "mais-v5-r7-native-"));
  try {
    const fixture = buildResolvedActivationFixtureV5R6("OPENAI_DIRECT");
    const issuedAt = "2026-08-26T10:00:00.000Z";
    const authorityContext = { ...fixture, ledgerEntries: [], issuedAt };
    const authority = buildReferenceDispatchAuthorityV5R7(authorityContext);
    assert.equal(authority.role, "A_SOLVE");
    assert.deepEqual(validateReferenceDispatchAuthorityV5R7({
      ...authorityContext,
      referenceDispatchAuthority: authority,
    }), []);
    const row = fixture.sampleManifest.selectedRows[0];
    const itemLeaf = fixture.itemLeaves.find(({ itemId }) => itemId === row.itemId);
    const requestArtifact = buildProviderRequestArtifactV5R6({
      activeRegistration: fixture.activeRegistration,
      authorization: fixture.authorization,
      registration: fixture.registration,
      inventory: fixture.inventory,
      sampleManifest: fixture.sampleManifest,
      itemLeaf,
      role: authority.role,
      attemptId: authority.attemptId,
      ledgerEntries: [],
    });
    const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
    const ledger = await createAtomicExecutionLedgerV5R7({
      trustedRoot,
      ledgerRelativePath: "native-reference-ledger",
      authorization: fixture.authorization.compatibilityAuthorization,
      inventory: fixture.inventory,
      priceSnapshot: fixture.priceSnapshot,
    });
    const reservation = await ledger.reserve({ requestArtifact: requestArtifact.compatibilityRequestArtifact });
    const input = { ...fixture, at: issuedAt, ledgerEntries: [], requestArtifact,
      dispatchAuthority: authority, dispatchAuthorityContext: authorityContext };
    const permit = buildProviderDispatchPermitV5R7({ input, reservation });
    assert.deepEqual(validateProviderDispatchPermitV5R7({ permit, input, reservation }), []);

    let credentialReads = 0;
    let httpRequests = 0;
    const transport = createNativeProviderTransportV5R7({
      credentialReader: async () => { credentialReads += 1; return null; },
      fetchImplementation: async () => { httpRequests += 1; throw new Error("must not run"); },
    });
    await assert.rejects(() => transport.send({ input, reservation, permit }),
      /R7 native transport rejected before credential read/u);
    assert.equal(credentialReads, 0);
    assert.equal(httpRequests, 0);
  } finally {
    await rm(protectedRoot, { recursive: true, force: true });
  }
});
