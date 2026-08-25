import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as designContract from "./design-contract.mjs";
import ON_DISK_DESIGN_REGISTRATION from "./design-registration.json" with { type: "json" };
import {
  calculateFrozenContractHashes,
  calculateRegistrationHash,
} from "./validate-design-registration.mjs";

export const TEST_FIXTURE_ONLY_REGISTRATION_KIND = "TEST_FIXTURE_ONLY_SYNTHETIC_SEALED_REGISTRATION";
export const TEST_FIXTURE_ONLY_REGISTRATION_LIFECYCLE = "TEST_FIXTURE_ONLY_NONAUTHORIZING_IN_MEMORY_SEAL";
export const TEST_FIXTURE_ONLY_BLOCKER = "TEST_FIXTURE_ONLY_NO_OWNER_OR_PROVIDER_AUTHORIZATION";
export const TEST_FIXTURE_ONLY_DESIGN_FROZEN_AT = "2026-08-25T04:50:00.000Z";
export const HYPOTHETICAL_FROZEN_REGISTRATION_LIFECYCLE = "FROZEN_PRE_EXECUTION_DESIGN_REGISTRATION";

const SOURCE_V4_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const SOURCE_V2_DIRECTORY = join(SOURCE_V4_DIRECTORY, "..", "design-v2");
const DESIGN_COMPONENT_HASH_FIELDS = Object.freeze([
  "taxonomyHash",
  "labelingAndAdjudicationHash",
  "analysisThresholdAndDecisionHash",
  "providerControlsHash",
  "samplingAndClusteringHash",
  "interfacesAndIntegrityHash",
]);

function validationErrors(registration) {
  const errors = [];
  const isNonauthorizingFixture = registration?.artifactKind === TEST_FIXTURE_ONLY_REGISTRATION_KIND
    && registration?.lifecycleStatus === TEST_FIXTURE_ONLY_REGISTRATION_LIFECYCLE
    && registration?.freezeAllowed === false
    && Array.isArray(registration?.blockingDecisionCodes)
    && registration.blockingDecisionCodes.length === 1
    && registration.blockingDecisionCodes[0] === TEST_FIXTURE_ONLY_BLOCKER;
  const isHypotheticalFrozenRegistration = !Object.hasOwn(registration ?? {}, "artifactKind")
    && registration?.lifecycleStatus === HYPOTHETICAL_FROZEN_REGISTRATION_LIFECYCLE
    && registration?.freezeAllowed === true
    && Array.isArray(registration?.blockingDecisionCodes)
    && registration.blockingDecisionCodes.length === 0;
  if (!isNonauthorizingFixture && !isHypotheticalFrozenRegistration) {
    errors.push("temporary registration must be either the exact nonauthorizing fixture or the production-shaped hypothetical frozen registration");
  }
  if (registration?.designKind !== "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION"
    || registration?.providerEventCount !== 0
    || registration?.firstProviderExecutionAllowed !== false
    || registration?.preExecutionState?.providerEventCount !== 0
    || registration?.preExecutionState?.firstProviderExecutionAllowed !== false
    || registration?.executionLifecycle?.firstProviderCallProhibitedByThisDesignArtifact !== true) {
    errors.push("test-only registration must prohibit execution and contain zero provider events");
  }
  if (registration?.methodComponentRootSetHash !== designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH) {
    errors.push("test-only registration does not bind the current method-component root set");
  }
  const expectedFrozenContractHashes = calculateFrozenContractHashes(registration);
  if (designContract.canonicalJson(registration?.frozenContractHashes)
    !== designContract.canonicalJson(expectedFrozenContractHashes)
    || designContract.canonicalJson(Object.keys(registration?.frozenContractHashes ?? {}).sort())
      !== designContract.canonicalJson([...DESIGN_COMPONENT_HASH_FIELDS].sort())) {
    errors.push("test-only registration frozen contract roots mismatch");
  }
  if (registration?.registrationHash !== calculateRegistrationHash(registration)) {
    errors.push("test-only registration self-hash mismatch");
  }
  return [...new Set(errors)];
}

/**
 * Build an in-memory-only registration for review-gate unit tests. This object
 * is deliberately nonauthorizing and is never accepted by the real production
 * module, which remains pinned to the unchanged on-disk candidate.
 */
export function buildTestFixtureOnlySyntheticSealedRegistrationV4() {
  const registration = structuredClone(ON_DISK_DESIGN_REGISTRATION);
  Object.assign(registration, {
    artifactKind: TEST_FIXTURE_ONLY_REGISTRATION_KIND,
    designKind: "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION",
    lifecycleStatus: TEST_FIXTURE_ONLY_REGISTRATION_LIFECYCLE,
    freezeAllowed: false,
    blockingDecisionCodes: [TEST_FIXTURE_ONLY_BLOCKER],
    frozenAt: TEST_FIXTURE_ONLY_DESIGN_FROZEN_AT,
    thresholdsFrozenAt: TEST_FIXTURE_ONLY_DESIGN_FROZEN_AT,
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
    methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    registrationHash: null,
  });
  registration.preExecutionState = {
    ...registration.preExecutionState,
    state: TEST_FIXTURE_ONLY_REGISTRATION_LIFECYCLE,
    registrationHash: null,
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
  };
  registration.frozenContractHashes = calculateFrozenContractHashes(registration);
  registration.registrationHash = calculateRegistrationHash(registration);
  const errors = validationErrors(registration);
  if (errors.length > 0) {
    throw new TypeError(`invalid test-only synthetic registration: ${errors.join("; ")}`);
  }
  return registration;
}

/**
 * Production-shaped hypothetical frozen registration used only as the adjacent
 * consistency anchor of a temporary copied module. It does not authorize
 * publication and is never written to the repo, ACTIVE, or any provider path.
 */
export function buildHypotheticalFrozenRegistrationV4() {
  const registration = structuredClone(ON_DISK_DESIGN_REGISTRATION);
  Object.assign(registration, {
    designKind: "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION",
    lifecycleStatus: HYPOTHETICAL_FROZEN_REGISTRATION_LIFECYCLE,
    freezeAllowed: true,
    blockingDecisionCodes: [],
    frozenAt: TEST_FIXTURE_ONLY_DESIGN_FROZEN_AT,
    thresholdsFrozenAt: TEST_FIXTURE_ONLY_DESIGN_FROZEN_AT,
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
    methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    registrationHash: null,
  });
  delete registration.artifactKind;
  registration.preExecutionState = {
    ...registration.preExecutionState,
    state: "DESIGN_FROZEN_AWAITING_SEPARATE_PROVIDER_AUTHORIZATIONS",
    registrationHash: null,
    providerEventCount: 0,
    firstProviderExecutionAllowed: false,
  };
  registration.frozenContractHashes = calculateFrozenContractHashes(registration);
  registration.registrationHash = calculateRegistrationHash(registration);
  const errors = validationErrors(registration);
  if (errors.length > 0) {
    throw new TypeError(`invalid hypothetical frozen registration: ${errors.join("; ")}`);
  }
  return registration;
}

/**
 * Load an exact copy of the ordinary production module in a bounded temporary
 * directory whose adjacent design-registration.json is either the closed
 * nonauthorizing fixture or the production-shaped hypothetical frozen fixture.
 * No caller-trust override is added to the production module namespace, and
 * neither temporary module can authorize publication without protected custody.
 */
export async function createTestFixtureOnlyReviewGateV4(trustedRegistration, testControls = {}) {
  const trusted = structuredClone(trustedRegistration);
  const errors = validationErrors(trusted);
  if (errors.length > 0) {
    throw new TypeError(`refusing invalid temporary pinned registration: ${errors.join("; ")}`);
  }
  if (testControls === null || typeof testControls !== "object" || Array.isArray(testControls)
    || Object.keys(testControls).some((key) => !["failAfterMkdtempForTest", "observeTemporaryRootForTest"].includes(key))
    || (Object.hasOwn(testControls, "failAfterMkdtempForTest") && typeof testControls.failAfterMkdtempForTest !== "boolean")
    || (Object.hasOwn(testControls, "observeTemporaryRootForTest") && typeof testControls.observeTemporaryRootForTest !== "function")) {
    throw new TypeError("temporary review test controls are not the closed test-only shape");
  }

  let temporaryRoot = null;
  let setupComplete = false;
  let reviewModule;
  try {
    temporaryRoot = await mkdtemp(join(tmpdir(), "mais-natural-ca60-review-test-"));
    testControls.observeTemporaryRootForTest?.(temporaryRoot);
    if (testControls.failAfterMkdtempForTest === true) {
      throw new TypeError("injected post-mkdtemp setup failure");
    }
    const temporaryV4Directory = join(temporaryRoot, "design-v4");
    const temporaryV4SchemasDirectory = join(temporaryV4Directory, "schemas");
    const temporaryV2Directory = join(temporaryRoot, "design-v2");
    await mkdir(temporaryV4Directory, { recursive: true });
    await mkdir(temporaryV4SchemasDirectory, { recursive: true });
    await mkdir(temporaryV2Directory, { recursive: true });
    await Promise.all([
      copyFile(join(SOURCE_V4_DIRECTORY, "review-gate.mjs"), join(temporaryV4Directory, "review-gate.mjs")),
      copyFile(join(SOURCE_V4_DIRECTORY, "design-contract.mjs"), join(temporaryV4Directory, "design-contract.mjs")),
      copyFile(join(SOURCE_V4_DIRECTORY, "sample-contract.mjs"), join(temporaryV4Directory, "sample-contract.mjs")),
      copyFile(
        join(SOURCE_V4_DIRECTORY, "schemas", "ProviderAuthorizationV1.schema.json"),
        join(temporaryV4SchemasDirectory, "ProviderAuthorizationV1.schema.json"),
      ),
      copyFile(
        join(SOURCE_V4_DIRECTORY, "schemas", "ProviderAttemptReceiptV1.schema.json"),
        join(temporaryV4SchemasDirectory, "ProviderAttemptReceiptV1.schema.json"),
      ),
      copyFile(join(SOURCE_V2_DIRECTORY, "design-contract.mjs"), join(temporaryV2Directory, "design-contract.mjs")),
      writeFile(
        join(temporaryV4Directory, "design-registration.json"),
        `${JSON.stringify(trusted, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600 },
      ),
    ]);
    const moduleUrl = `${pathToFileURL(join(temporaryV4Directory, "review-gate.mjs")).href}?fixture=${trusted.registrationHash}`;
    reviewModule = await import(moduleUrl);
    const namespaceBypasses = Object.keys(reviewModule).filter((name) => /AgainstTrustedRegistration|TestFixtureOnly/u.test(name));
    if (namespaceBypasses.length > 0) {
      throw new TypeError(`temporary production module exposes caller-trust bypasses: ${namespaceBypasses.join(", ")}`);
    }
    const registrationErrors = reviewModule.validateReviewDesignRegistrationV4(trusted);
    if (!Array.isArray(registrationErrors) || registrationErrors.length > 0) {
      throw new TypeError(`temporary production module did not exact-pin the test registration: ${registrationErrors?.join("; ")}`);
    }
    if (reviewModule.canExportAggregateReport({}) !== false) {
      throw new TypeError("nonauthorizing test registration unexpectedly opened aggregate export");
    }
    if (typeof reviewModule.validateAggregatePublicationConsistencyV1 !== "function"
      || typeof reviewModule.evaluateAggregatePublicationAuthorizationV1 !== "function") {
      throw new TypeError("temporary production module lacks the explicit publication consistency or authorization-status contract");
    }
    setupComplete = true;
  } finally {
    if (!setupComplete && temporaryRoot !== null) {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  let disposed = false;
  return Object.freeze({
    authorizationMode: trusted.freezeAllowed === true
      ? "HYPOTHETICAL_FROZEN_CONSISTENCY_ONLY"
      : "TEST_FIXTURE_ONLY_NONAUTHORIZING",
    trustedDesignRegistration: structuredClone(trusted),
    validateReviewDesignRegistrationV4: reviewModule.validateReviewDesignRegistrationV4,
    validateV4ReviewStageContext: reviewModule.validateV4ReviewStageContext,
    validateReviewRegistrationContextV1: reviewModule.validateReviewRegistrationContextV1,
    validateIndependentReviewReceiptV1: reviewModule.validateIndependentReviewReceiptV1,
    validateAggregatePublicationConsistencyV1: reviewModule.validateAggregatePublicationConsistencyV1,
    evaluateAggregatePublicationAuthorizationV1: reviewModule.evaluateAggregatePublicationAuthorizationV1,
    canExportAggregateReport: reviewModule.canExportAggregateReport,
    dispose: async () => {
      if (!disposed) {
        await rm(temporaryRoot, { recursive: true, force: true });
        disposed = true;
      }
    },
  });
}

/**
 * Atomically construct the two temporary review modules used by the full gate
 * tests. If the second setup fails, the already-created first module is
 * disposed before the factory rejects, closing the pre-test.after leak window.
 */
export async function createTestFixtureOnlyReviewGatePairV4(
  firstRegistration,
  secondRegistration,
  testControls = {},
) {
  if (testControls === null || typeof testControls !== "object" || Array.isArray(testControls)
    || Object.keys(testControls).some((key) => !["firstTestControls", "secondTestControls"].includes(key))) {
    throw new TypeError("temporary review pair controls are not the closed test-only shape");
  }
  let firstGate = null;
  let secondGate = null;
  try {
    firstGate = await createTestFixtureOnlyReviewGateV4(
      firstRegistration,
      testControls.firstTestControls ?? {},
    );
    secondGate = await createTestFixtureOnlyReviewGateV4(
      secondRegistration,
      testControls.secondTestControls ?? {},
    );
  } catch (error) {
    const cleanup = await Promise.allSettled([
      secondGate?.dispose(),
      firstGate?.dispose(),
    ].filter(Boolean));
    const cleanupErrors = cleanup
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);
    if (cleanupErrors.length > 0) {
      throw new AggregateError([error, ...cleanupErrors], "temporary review gate pair setup and cleanup failed");
    }
    throw error;
  }

  let disposed = false;
  return Object.freeze({
    firstGate,
    secondGate,
    dispose: async () => {
      if (disposed) return;
      const cleanup = await Promise.allSettled([
        secondGate.dispose(),
        firstGate.dispose(),
      ]);
      const cleanupErrors = cleanup
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "temporary review gate pair cleanup failed");
      }
      disposed = true;
    },
  });
}
