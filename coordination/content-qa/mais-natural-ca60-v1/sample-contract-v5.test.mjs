import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as v4 from "../../research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs";
import * as v5 from "./sample-contract-v5.mjs";
import {
  buildV5SourceEnumerationHashErratum,
  validateV5SourceEnumerationHashErratum,
} from "./source-enumeration-hash-erratum-v5.mjs";

const REGISTRATION_PATH = new URL(
  "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json",
  import.meta.url,
);

test("V5 formal-freeze contract preserves every selection and clustering algorithm root", () => {
  assert.equal(v5.DESIGN_ID, "MAIS-NATURAL-CA60-V5");
  assert.equal(v5.LINEAGE_RULE_HASH_V4, v4.LINEAGE_RULE_HASH_V4);
  assert.equal(v5.SAMPLE_ALGORITHM_VERSION, v4.SAMPLE_ALGORITHM_VERSION);
  assert.equal(v5.SAMPLE_ALGORITHM_HASH, v4.SAMPLE_ALGORITHM_HASH);
  assert.equal(v5.C0_AUDIT_ALGORITHM_VERSION, v4.C0_AUDIT_ALGORITHM_VERSION);
  assert.equal(v5.C0_AUDIT_ALGORITHM_HASH, v4.C0_AUDIT_ALGORITHM_HASH);
  assert.deepEqual(v5.SAMPLE_SELECTION_GOLDEN_VECTOR, v4.SAMPLE_SELECTION_GOLDEN_VECTOR);
  assert.deepEqual(v5.C0_AUDIT_SELECTION_GOLDEN_VECTOR, v4.C0_AUDIT_SELECTION_GOLDEN_VECTOR);

  const selectionInput = {
    designHash: "1".repeat(64),
    frameHash: "2".repeat(64),
    algorithmVersion: v5.SAMPLE_ALGORITHM_VERSION,
    stratum: "fill-in::Medium",
    clusterId: "homology-test",
    itemHash: "3".repeat(64),
  };
  assert.equal(v5.selectionDigestV3(selectionInput), v4.selectionDigestV3(selectionInput));
});

test("append-only erratum separates the inherited extraction hash from active V5 provider chronology", async () => {
  const registration = JSON.parse(await readFile(REGISTRATION_PATH, "utf8"));
  assert.equal(
    v5.RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    registration.runtimePopulation.sourceEnumerationEvidenceContractHash,
  );
  assert.deepEqual(
    v5.ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT,
    registration.runtimePopulation.sourceEnumerationEvidenceContract,
  );
  assert.notEqual(
    v5.ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    registration.runtimePopulation.sourceEnumerationEvidenceContractHash,
  );

  const erratum = buildV5SourceEnumerationHashErratum({
    recordedAt: "2026-08-25T19:37:37.000Z",
  });
  assert.deepEqual(validateV5SourceEnumerationHashErratum(erratum), []);
  assert.equal(erratum.providerEventCountAtDiscovery, 0);
  assert.equal(erratum.changesFrameMethod, false);
  assert.equal(erratum.changesSampleMethod, false);
  assert.equal(erratum.changesDecisionThresholds, false);
  assert.equal(erratum.authorizesProviderExecution, false);
});
