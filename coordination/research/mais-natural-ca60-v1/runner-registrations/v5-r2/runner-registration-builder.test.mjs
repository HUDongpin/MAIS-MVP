import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { jcsHash } from "../../versions/design-v5/design-contract.mjs";
import REGISTRATION_SCHEMA from "../../../../content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV1.schema.json" with { type: "json" };
import {
  buildNaturalCaExecutionRunnerRegistrationV5R2,
  PRODUCTION_SOURCE_PATHS_V5_R2,
  TEST_SOURCE_PATHS_V5_R2,
} from "./build-runner-registration.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("V5-R2 runner registration builder binds immutable research roots and zero execution authority", async () => {
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R2({
    repoRoot: REPO_ROOT,
    runnerCommit: "a".repeat(40),
    createdAt: "2026-08-26T06:00:00.000Z",
  });
  assert.equal(registration.designId, "MAIS-NATURAL-CA60-V5");
  assert.equal(registration.runnerVersion, "V5-R2");
  assert.equal(registration.frozenBindings.frameRegistrationHash, "b8a4752e05fb8bf39a34afa6c63beb363731d08530069d9c454ad1b3e3fe975f");
  assert.equal(registration.frozenBindings.sampleManifestHash, "d8856f0fb60f38eeecce5249e2018ba90417d68e0f84ef6e2ad9522016d9e159");
  assert.equal(registration.frozenBindings.rightsPolicyHash, "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66");
  assert.equal(registration.frozenBindings.lineageRuleHash, "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449");
  assert.equal(registration.supersedes.providerEventCountBeforeSupersede, 0);
  assert.equal(registration.authorityBoundary.providerExecutionAuthorized, false);
  assert.equal(registration.authorityBoundary.credentialReadAuthorized, false);
  assert.equal(registration.authorityBoundary.naturalQuestionEgressAuthorized, false);
  assert.equal(registration.authorityBoundary.providerEventCount, 0);
  assert.equal(registration.providerImplementations.openAIReference.model, "gpt-5.6-luna");
  assert.equal(registration.providerImplementations.openAIReference.endpoint, "https://us.api.openai.com/v1/responses");
  assert.equal(registration.providerImplementations.deepSeekEvaluation.referenceInputCount, 0);
  assert.equal(registration.sourceRoots.productionSourceManifest.length, PRODUCTION_SOURCE_PATHS_V5_R2.length);
  assert.equal(registration.sourceRoots.testSourceManifest.length, TEST_SOURCE_PATHS_V5_R2.length);
  assert.deepEqual(Object.keys(registration).sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
  assert.deepEqual([...REGISTRATION_SCHEMA.required].sort(), Object.keys(REGISTRATION_SCHEMA.properties).sort());
  const body = structuredClone(registration);
  delete body.registrationHash;
  assert.equal(registration.registrationHash, jcsHash(body));
});

test("V5-R2 registration builder rejects inferred timestamps and non-exact commits", async () => {
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R2({ repoRoot: REPO_ROOT, runnerCommit: "a".repeat(39), createdAt: "2026-08-26T06:00:00.000Z" }), /runnerCommit/iu);
  await assert.rejects(buildNaturalCaExecutionRunnerRegistrationV5R2({ repoRoot: REPO_ROOT, runnerCommit: "a".repeat(40) }), /createdAt/iu);
});
