import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import V5_R4_REGISTRATION from "../v5-r4/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R5,
  validateActiveRunnerRegistrationV5R5,
  validateExactRunnerRegistrationEvidenceV5R5,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r5.mjs";
import {
  buildRunnerSupersedingRegistrationV5R5,
  PRODUCTION_PATHS_V5_R5,
  sourceManifestFromGitV5R5,
  TEST_PATHS_V5_R5,
} from "./build-runner-registration.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../../..");
const REGISTRATION_PATH = path.join(HERE, "runner-registration.json");

function syntheticManifest(paths, family) {
  return paths.map((sourcePath) => ({
    path: sourcePath,
    byteLength: Buffer.byteLength(sourcePath, "utf8") + 1,
    sha256: sha256V5R3(`${family}:${sourcePath}`),
  }));
}

async function readRegistrationIfPresent() {
  try {
    return JSON.parse(await readFile(REGISTRATION_PATH, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

test("V5-R5 builder preserves frozen research roots, the exact OpenAI residency tuple, unresolved DeepSeek residency, and zero authority", () => {
  const registration = buildRunnerSupersedingRegistrationV5R5({
    runnerSourceCommit: "e".repeat(40),
    productionSourceManifest: syntheticManifest(PRODUCTION_PATHS_V5_R5, "production"),
    testSourceManifest: syntheticManifest(TEST_PATHS_V5_R5, "test"),
    registeredAt: "2026-08-26T05:40:00.000Z",
  });
  assert.deepEqual(validateActiveRunnerRegistrationV5R5({ activeRegistration: registration,
    baseRegistration: V5_R4_REGISTRATION }), []);
  assert.equal(registration.frameRegistrationHash, V5_R4_REGISTRATION.frameRegistrationHash);
  assert.equal(registration.sampleManifestHash, V5_R4_REGISTRATION.sampleManifestHash);
  assert.equal(registration.rightsPolicyHash, "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66");
  assert.equal(registration.lineageRuleHash, "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449");
  assert.equal(registration.ownerRunnerImplementationAuthorizationTextHash,
    "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f");
  assert.deepEqual(registration.providerEntrypoints.openAI, {
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    registeredCli: "runner-v5-r5-cli.mjs",
    coreGuardHash: registration.providerEntrypoints.openAI.coreGuardHash,
    providerCallsMade: 0,
  });
  assert.equal(registration.providerEntrypoints.deepSeek.projectResidency, "UNRESOLVED");
  assert.equal(registration.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(registration.claimCeiling, "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED");
  for (const value of Object.values(registration.authorizationState)) assert.ok(value === false || value === 0);
  assert.equal(validateSelfHashV5R3(registration), true);
  const { selfHash: _selfHash, ...body } = registration;
  const residencyDrift = sealV5R3Artifact({ ...body, providerEntrypoints: {
    ...body.providerEntrypoints,
    openAI: { ...body.providerEntrypoints.openAI, projectResidency: "UNRESOLVED" },
  } });
  assert.match(validateActiveRunnerRegistrationV5R5({ activeRegistration: residencyDrift,
    baseRegistration: V5_R4_REGISTRATION }).join("; "), /projectResidency|entrypoint/iu);
});

test("sealed V5-R5 registration, when present, exactly rebuilds from its immutable parent Git source commit", async (t) => {
  const registration = await readRegistrationIfPresent();
  if (registration === null) {
    t.skip("pre-source-commit test phase: sealed registration is intentionally absent");
    return;
  }
  const productionSourceManifest = await sourceManifestFromGitV5R5({ repoRoot: REPO_ROOT,
    commit: registration.runnerSourceCommit, paths: PRODUCTION_PATHS_V5_R5 });
  const testSourceManifest = await sourceManifestFromGitV5R5({ repoRoot: REPO_ROOT,
    commit: registration.runnerSourceCommit, paths: TEST_PATHS_V5_R5 });
  const rebuilt = buildRunnerSupersedingRegistrationV5R5({ runnerSourceCommit: registration.runnerSourceCommit,
    productionSourceManifest, testSourceManifest, registeredAt: registration.registeredAt });
  assert.equal(canonicalJsonV5R3(rebuilt), canonicalJsonV5R3(registration));
  assert.equal(validateSelfHashV5R3(registration), true);
});

test("production loader, when registration is present, proves tracked bytes, direct-parent source commit, and every exact source object", async (t) => {
  if (await readRegistrationIfPresent() === null) {
    t.skip("pre-source-commit test phase: sealed registration is intentionally absent");
    return;
  }
  const evidence = await loadExactTrackedRunnerRegistrationV5R5({ repoRoot: REPO_ROOT });
  assert.deepEqual(validateExactRunnerRegistrationEvidenceV5R5(evidence), []);
  assert.equal(evidence.verifiedFromGitObjects, true);
  assert.equal(evidence.runnerSourceCommit, evidence.activeRegistration.runnerSourceCommit);
  assert.equal(evidence.registrationHash, evidence.activeRegistration.selfHash);
});
