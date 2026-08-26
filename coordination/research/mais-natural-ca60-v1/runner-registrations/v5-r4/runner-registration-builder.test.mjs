import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import REGISTRATION_SCHEMA from "../../../../content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV3.schema.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import { validateProductionRunnerRegistrationV5R4 } from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r4.mjs";
import {
  buildNaturalCaExecutionRunnerRegistrationV5R4,
  PRODUCTION_SOURCE_PATHS_V5_R4,
  TEST_SOURCE_PATHS_V5_R4,
  workingTreeSourceReader,
} from "./build-runner-registration.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("V5-R4 registration binds the immutable V5-R3 discrepancy, complete frozen roots, exact sources, and zero authority", async () => {
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R4({
    repoRoot: REPO_ROOT,
    runnerCommit: "a".repeat(40),
    registeredAt: "2026-08-26T12:00:00.000Z",
    readSource: workingTreeSourceReader,
  });
  assert.equal(validateSelfHashV5R3(registration), true);
  assert.deepEqual(validateProductionRunnerRegistrationV5R4(registration), []);
  assert.equal(registration.supersedesRunnerRegistrationHash, "1dd8514b93638db806942bb85b04d975f17ce0f3b19fb77bc88ca81101ac0911");
  assert.equal(registration.discrepancyReviewHash, "2b8307b6547762499795952a2d4251cca033d70c6868586eb41bbc1409859faa");
  assert.equal(registration.discrepancyReviewCommit, "1bada03e41f140233fd49c2f7ebdbabf77c1dce0");
  assert.equal(registration.previousReceiptHash, registration.discrepancyReviewHash);
  assert.equal(registration.designRegistrationHash, "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632");
  assert.equal(registration.frameRegistrationHash, "b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f");
  assert.equal(registration.samplingFrameHash, "c5446c0cd2f29f00e865b949095045e439d1b946a46b132f811af398415046c7");
  assert.equal(registration.sampleManifestHash, "d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159");
  assert.equal(registration.samplePayloadSetHash, "952d8b54540e6ef000be2cbc9b3aff3e0686c8c49d65c283f1b98b2a3c3ccda0");
  assert.equal(registration.sampleSelectionContentRootHash, "aebf850db9981d576a7d83f220423c808157340836b2936d8a1e59cb1bf69d57");
  assert.equal(registration.c0RandomAuditHash, "f1f20cd071e7e95b0f344c123796aeb68a62a4d31dd23dbfaee2991fcdb2be4e");
  assert.equal(registration.privacyScreenHash, "eaf318921d47d8832c54a5df42b0e6fb6abe4d7e7484bc65153bae4043a9e446");
  assert.equal(registration.rightsScreenHash, "62afebea22efc89645134100f082cfaf4d82d024e7c15a26c16861fac1d784cb");
  assert.equal(registration.ownerDecisionRequestHash, "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78");
  assert.equal(registration.ownerDecisionReceiptHash, "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0");
  assert.equal(registration.rightsPolicyHash, "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66");
  assert.equal(registration.lineageRuleHash, "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449");
  assert.equal(registration.taxonomyHash, "987ff97aa683f8b577736814ee384d2f66bad742d8252b28855221758667a091");
  assert.equal(registration.labelingAndAdjudicationHash, "1fa05b20ff970cba00a8e181c8eb05d60203955e8746a9cffb516881707ea9c4");
  assert.equal(registration.thresholdsDecisionAndPowerHash, "33592fabdaf467abd30355cc9101502f6bd6eea70ebfa3db3632cc5826920fce");
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.providerContractErratumHash, "f9fad74c0250b4e3e816ba755aca44070d87d23dce03b98bd7b6a60ad5492f1d");
  assert.equal(registration.providerImplementations.openAI.model, "gpt-5.6-luna");
  assert.equal(registration.providerImplementations.openAI.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(registration.providerImplementations.openAI.projectResidency, "US_STORAGE_PROCESSING");
  assert.equal(registration.providerImplementations.deepSeek.model, "deepseek-v4-pro");
  assert.equal(registration.productionSourceManifest.length, PRODUCTION_SOURCE_PATHS_V5_R4.length);
  assert.equal(registration.testSourceManifest.length, TEST_SOURCE_PATHS_V5_R4.length);
  assert.equal(registration.productionSourceRootHash, sha256V5R3(canonicalJsonV5R3(registration.productionSourceManifest)));
  assert.equal(registration.testSourceRootHash, sha256V5R3(canonicalJsonV5R3(registration.testSourceManifest)));
  assert.equal(new Set(PRODUCTION_SOURCE_PATHS_V5_R4).size, PRODUCTION_SOURCE_PATHS_V5_R4.length);
  assert.equal(new Set(TEST_SOURCE_PATHS_V5_R4).size, TEST_SOURCE_PATHS_V5_R4.length);
  assert.deepEqual(Object.keys(registration).sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
  assert.deepEqual([...REGISTRATION_SCHEMA.required].sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
  for (const value of Object.values(registration.authorizationState)) assert.ok(value === false || value === 0);

  const { selfHash: _registrationHash, ...body } = registration;
  const frameDrift = sealV5R3Artifact({ ...body, sampleManifestHash: sha256V5R3("post-freeze-manifest") });
  assert.ok(validateProductionRunnerRegistrationV5R4(frameDrift).some((error) => /frozen frame, sample/u.test(error)));
  const componentDrift = sealV5R3Artifact({ ...body, providerImplementations: {
    ...body.providerImplementations,
    openAI: { ...body.providerImplementations.openAI, transportHash: sha256V5R3("unregistered-transport") },
  } });
  assert.ok(validateProductionRunnerRegistrationV5R4(componentDrift).some((error) => /component hashes/u.test(error)));
  const methodDrift = sealV5R3Artifact({ ...body, methodKernel: {
    ...body.methodKernel, bootstrapGoldenVectorHash: sha256V5R3("post-result-bootstrap") },
  });
  assert.ok(validateProductionRunnerRegistrationV5R4(methodDrift).some((error) => /method-kernel/u.test(error)));
});

test("V5-R4 registration refuses implicit chronology, inexact commits, and missing source bytes", async () => {
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R4({
    runnerCommit: "a".repeat(39), registeredAt: "2026-08-26T12:00:00.000Z", readSource: workingTreeSourceReader,
  }), /runnerCommit/u);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R4({
    runnerCommit: "a".repeat(40), readSource: workingTreeSourceReader,
  }), /registeredAt/u);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R4({
    runnerCommit: "a".repeat(40), registeredAt: "2026-08-26T12:00:00Z", readSource: workingTreeSourceReader,
  }), /registeredAt/u);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R4({
    runnerCommit: "a".repeat(40), registeredAt: "2026-08-26T12:00:00.000Z", readSource: async () => Buffer.alloc(0),
  }), /empty/u);
});
