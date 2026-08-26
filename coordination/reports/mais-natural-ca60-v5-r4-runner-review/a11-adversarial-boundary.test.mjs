import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRunnerFixtureV5R4,
  buildAuthorizationFixtureV5R4,
} from "../../content-qa/mais-natural-ca60-v1/runner-v5-r4-test-fixtures.mjs";
import { sealV5R3Artifact } from "../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R4,
} from "../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r4.mjs";
import {
  validateSampleExecutionInventoryV2,
} from "../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r4.mjs";
import {
  validateProviderAuthorizationV5R4,
} from "../../content-qa/mais-natural-ca60-v1/route-authorization-v5-r4.mjs";
import {
  buildProviderRequestArtifactV5R4,
} from "../../content-qa/mais-natural-ca60-v1/provider-request-v5-r4.mjs";

const HASH = "f".repeat(64);

test("DeepSeek B-prime and C0 requests construct without an actual reference seal, execution registration, or C0 set", () => {
  const fixture = buildAuthorizationFixtureV5R4(
    buildRunnerFixtureV5R4(),
    "DEEPSEEK_DIRECT",
    { referenceSealHash: HASH, referenceAttemptChainHash: HASH },
  );
  assert.deepEqual(validateProviderAuthorizationV5R4(fixture), []);

  const common = {
    registration: fixture.registration,
    authorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaf: fixture.itemLeaves[59],
    ledgerEntries: [],
  };
  const bPrime = buildProviderRequestArtifactV5R4({
    ...common,
    role: "B_PRIME_CRITIQUE",
    attemptId: "a11-direct-b-prime-without-execution-registration",
  });
  const c0 = buildProviderRequestArtifactV5R4({
    ...common,
    role: "C0_PRIME_ROLE_1",
    attemptId: "a11-direct-c0-outside-registered-random-set",
  });

  assert.equal(bPrime.role, "B_PRIME_CRITIQUE");
  assert.equal(c0.role, "C0_PRIME_ROLE_1");
  assert.equal(fixture.inventory.items[59].registeredRandomAudit, false);
});

test("inventory validator accepts changed random-audit membership and analysis values without the manifest or C0 audit", () => {
  const core = buildRunnerFixtureV5R4();
  const items = core.inventory.items.map((item, index) => ({
    ...item,
    stratum: `caller-authored-${index}`,
    secondaryAnalysisWeight: 1000 + index,
    inclusionProbability: 0.01,
    registeredRandomAudit: index >= 12 && index < 24,
  }));
  const forged = sealV5R3Artifact({
    ...Object.fromEntries(Object.entries(core.inventory).filter(([key]) => key !== "selfHash")),
    items,
  });

  assert.deepEqual(validateSampleExecutionInventoryV2({ registration: core.registration, inventory: forged }), []);
  assert.notEqual(forged.selfHash, core.inventory.selfHash);
  assert.equal(forged.items[0].registeredRandomAudit, false);
  assert.equal(forged.items[12].registeredRandomAudit, true);
});

test("authorization accepts caller-authored CONFIRMED route leaves without any source bytes", () => {
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4());
  assert.deepEqual(validateProviderAuthorizationV5R4(fixture), []);
  for (const leaf of [fixture.routeEvidence.accountEvidence, fixture.routeEvidence.billingEvidence, fixture.routeEvidence.dataRegionEvidence]) {
    assert.equal(leaf.status, "CONFIRMED");
    assert.match(leaf.sourceBytesHash, /^[0-9a-f]{64}$/u);
    assert.equal(Object.hasOwn(leaf, "sourceBytes"), false);
  }
  assert.equal(fixture.routeEvidence.accountEvidence.sourceAttemptReceiptHash, null);
  assert.equal(fixture.routeEvidence.billingEvidence.sourceAttemptReceiptHash, null);
});

test("custom closed-schema validator misses conditional discrepancy-code cardinality", () => {
  const common = {
    schemaVersion: "IndependentExecutionResultReviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: HASH,
    aggregateScoreReceiptHash: HASH,
    finalVerificationReceiptHash: HASH,
    reviewerLane: "A11",
    independentImplementation: true,
    reviewedAt: "2026-08-26T05:30:00.000Z",
  };
  const contradictoryConcurrence = sealV5R3Artifact({
    ...common,
    decision: "CONCURRED",
    discrepancyCodes: ["MUST_BE_FORBIDDEN_BY_MAX_ITEMS_ZERO"],
  });
  const emptyDiscrepancy = sealV5R3Artifact({
    ...common,
    decision: "DISCREPANCY",
    discrepancyCodes: [],
  });

  assert.deepEqual(validateClosedSelfHashedArtifactV5R4(contradictoryConcurrence), []);
  assert.deepEqual(validateClosedSelfHashedArtifactV5R4(emptyDiscrepancy), []);
});
