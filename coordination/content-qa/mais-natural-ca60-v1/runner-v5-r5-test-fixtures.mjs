import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildRunnerSupersedingRegistrationV5R5,
  PRODUCTION_PATHS_V5_R5,
  TEST_PATHS_V5_R5,
} from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/build-runner-registration.mjs";
import {
  V5_R4_A11_REVIEW_HASH,
  V5_R4_REGISTRATION_HASH,
} from "./execution-evidence-v5-r5.mjs";

export const H_V5_R5 = (value) => sha256V5R3(String(value));

function syntheticManifest(paths, family) {
  return paths.map((sourcePath) => ({ path: sourcePath, byteLength: Buffer.byteLength(sourcePath, "utf8") + 1,
    sha256: H_V5_R5(`${family}:${sourcePath}`) }));
}

export function buildActiveRegistrationFixtureV5R5() {
  return buildRunnerSupersedingRegistrationV5R5({
    runnerSourceCommit: "c".repeat(40),
    productionSourceManifest: syntheticManifest(PRODUCTION_PATHS_V5_R5, "production"),
    testSourceManifest: syntheticManifest(TEST_PATHS_V5_R5, "test"),
    registeredAt: "2026-08-26T05:40:00.000Z",
  });
}

export function buildFreshReviewFixtureV5R5(activeRegistration = buildActiveRegistrationFixtureV5R5()) {
  return sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R5",
    reviewedAt: "2026-08-26T05:45:00.000Z",
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: activeRegistration.selfHash,
    reviewedRunnerSourceCommit: activeRegistration.runnerSourceCommit,
    reviewedProductionSourceRootHash: activeRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: activeRegistration.testSourceRootHash,
  });
}

export function buildExactRegistrationEvidenceFixtureV5R5(activeRegistration = buildActiveRegistrationFixtureV5R5()) {
  return sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV1",
    registrationCommit: "d".repeat(40),
    registrationPath: "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json",
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit: activeRegistration.runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    compatibilityBaseRunnerRegistrationHash: V5_R4_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R4_A11_REVIEW_HASH,
    verifiedFromGitObjects: true,
    activeRegistration,
  });
}
