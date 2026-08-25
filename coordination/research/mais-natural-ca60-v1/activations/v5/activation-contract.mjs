import { createHash } from "node:crypto";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const PACKAGE_ROOT_HASH = "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1";
const V3_REGISTRATION_HASH = "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d";
const A11_REVIEW_COMMIT = "85fb01b494851b034e27b909065d6729e6a6adc0";
const A11_VERIFICATION_HASH = "f57d16b7a6603960511d2aae59b36911cbb9fec1bffaa63967cbd125da98ade4";
const A11_REVIEW_HASH = "2ab305f28bacc7d5d0d7889e1c48c2b5eba51e8da4bd1d8d0831f90aee9b04b9";
const RUNNER_COMMIT = "1dc093a1d0a300495dcd671091c849d24410fd5e";
const RUNNER_SOURCE_MANIFEST_ROOT_HASH = "2d333700f464fc856beea60f8f96c276eaaaaaed10b476b841c06ba4b9a127b0";
const RUNNER_HASH = "cfef4f67e1c294e60f10de594dea59828c4f4a94b8465e55ab36b5b65285789c";
const ADAPTER_HASH = "63beb1ca15a26c71563a73447f347383bdaa31cb27a2b932b33d534007767013";
const CUSTODY_REGISTRY_HASH = "aa48b5d02996ceed02daff2579b8961a4e5ea3c373dfdc023085fa181c2914a1";
const ACTIVATED_AT = "2026-08-25T18:05:00.000Z";
const SHA256 = /^[0-9a-f]{64}$/u;

export const POST_ACTIVATION_BLOCKERS_V1 = Object.freeze([
  "FINE_GRAINED_LINEAGE_AND_RIGHTS_BINDING_REQUIRED",
  "A22_CLEAN_EXECUTION_ENVIRONMENT_REQUIRED",
  "FRAME_REGISTRATION_REQUIRED",
  "SAMPLE_REGISTRATION_REQUIRED",
  "OPENAI_PROJECT_ROUTE_PREFLIGHT_REQUIRED",
  "OPENAI_CREDENTIAL_READINESS_REQUIRED",
  "CURRENT_OPENAI_PRICE_SNAPSHOT_REQUIRED",
  "HASH_BOUND_OPENAI_AUTHORIZATION_REQUIRED",
  "REFERENCE_LABEL_SEAL_REQUIRED",
  "DEEPSEEK_ROUTE_PROBE_REQUIRED",
  "HASH_BOUND_DEEPSEEK_AUTHORIZATION_REQUIRED",
  "EXECUTION_REGISTRATION_REQUIRED",
]);

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("canonical JSON rejects non-finite numbers");
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("canonical JSON rejects undefined values");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function jcsHash(value) {
  return createHash("sha256").update(Buffer.from(canonicalJson(value), "utf8")).digest("hex");
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function hashWithout(value, field) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy[field];
  return jcsHash(copy);
}

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

export function buildActiveDesignPointerV5() {
  return Object.freeze({
    schemaVersion: "NaturalCaActiveDesignPointerV1",
    artifactKind: "ACTIVE_DESIGN_POINTER_NOT_A_REGISTRATION",
    designFamily: "MAIS-NATURAL-CA60",
    activeDesignId: DESIGN_ID,
    activeDesignPath: "versions/design-v5/design-registration.json",
    activeRegistrationHash: REGISTRATION_HASH,
    predecessorDesignId: "MAIS-NATURAL-CA60-V3",
    predecessorRegistrationHash: V3_REGISTRATION_HASH,
    pointerUpdatedAt: ACTIVATED_AT,
    reason: `Append-only V5 method activation after A11 CONCURRED review ${A11_REVIEW_HASH}; provider execution remains blocked pending frame/sample, route, credential, price, and two hash-bound authorizations.`,
    firstProviderExecutionAllowed: false,
  });
}

function assertActivationInputs({ priorPointer, registration, packageManifest, verification, reviewReceipt }) {
  if (priorPointer?.activeDesignId !== "MAIS-NATURAL-CA60-V3"
    || priorPointer?.activeRegistrationHash !== V3_REGISTRATION_HASH
    || priorPointer?.firstProviderExecutionAllowed !== false) {
    throw new Error("prior V3 active pointer mismatch");
  }
  if (registration?.designId !== DESIGN_ID || registration?.registrationHash !== REGISTRATION_HASH
    || registration?.providerEventCount !== 0 || registration?.firstProviderExecutionAllowed !== false) {
    throw new Error("reviewed V5 registration mismatch or provider event drift");
  }
  if (packageManifest?.registrationHash !== REGISTRATION_HASH || packageManifest?.packageRootHash !== PACKAGE_ROOT_HASH) {
    throw new Error("reviewed V5 package root mismatch");
  }
  if (verification?.decision !== "CONCURRED" || verification?.verificationHash !== A11_VERIFICATION_HASH
    || verification?.designRegistrationHash !== REGISTRATION_HASH
    || verification?.designPackageRootHash !== PACKAGE_ROOT_HASH
    || verification?.runnerCommit !== RUNNER_COMMIT || verification?.runnerSourceManifestRootHash !== RUNNER_SOURCE_MANIFEST_ROOT_HASH
    || verification?.runnerHash !== RUNNER_HASH || verification?.adapterHash !== ADAPTER_HASH
    || verification?.custodyRegistryHash !== CUSTODY_REGISTRY_HASH
    || verification?.providerEventCount !== 0 || verification?.providerExecutionAuthorized !== false
    || verification?.activeDesignId !== "MAIS-NATURAL-CA60-V3" || verification?.activeV5AtReview !== false
    || hashWithout(verification, "verificationHash") !== verification.verificationHash) {
    throw new Error("A11 independent verification root or boundary mismatch");
  }
  if (reviewReceipt?.schemaVersion !== "IndependentDesignReviewReceiptV1"
    || reviewReceipt?.decision !== "CONCURRED" || reviewReceipt?.reviewHash !== A11_REVIEW_HASH
    || reviewReceipt?.designRegistrationHash !== REGISTRATION_HASH
    || reviewReceipt?.reviewedDesignPackageRootHash !== PACKAGE_ROOT_HASH
    || reviewReceipt?.runnerCommit !== RUNNER_COMMIT || reviewReceipt?.runnerHash !== RUNNER_HASH
    || reviewReceipt?.adapterHash !== ADAPTER_HASH || reviewReceipt?.reviewerLane !== "A11"
    || hashWithout(reviewReceipt, "reviewHash") !== reviewReceipt.reviewHash
    || !Number.isFinite(Date.parse(reviewReceipt.reviewedAt))
    || Date.parse(reviewReceipt.reviewedAt) >= Date.parse(ACTIVATED_AT)) {
    throw new Error("A11 review receipt root, decision, or chronology mismatch");
  }
}

export function buildActivationReceiptV1(input) {
  assertActivationInputs(input);
  const activePointer = buildActiveDesignPointerV5();
  const body = {
    schemaVersion: "NaturalCaDesignActivationReceiptV1",
    artifactKind: "APPEND_ONLY_METHOD_REGISTRATION_ACTIVATION_NOT_EXECUTION_AUTHORIZATION",
    designFamily: "MAIS-NATURAL-CA60",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    v5PackageRootHash: PACKAGE_ROOT_HASH,
    priorActiveDesignId: "MAIS-NATURAL-CA60-V3",
    priorActiveRegistrationHash: V3_REGISTRATION_HASH,
    priorActivePointerHash: jcsHash(input.priorPointer),
    newActivePointerHash: jcsHash(activePointer),
    a11ReviewCommit: A11_REVIEW_COMMIT,
    independentVerificationHash: A11_VERIFICATION_HASH,
    reviewReceiptHash: A11_REVIEW_HASH,
    reviewDecision: "CONCURRED",
    runnerCommit: RUNNER_COMMIT,
    runnerSourceManifestRootHash: RUNNER_SOURCE_MANIFEST_ROOT_HASH,
    runnerHash: RUNNER_HASH,
    adapterHash: ADAPTER_HASH,
    custodyRegistryHash: CUSTODY_REGISTRY_HASH,
    activatedAt: ACTIVATED_AT,
    activationAuthorityBasis: "OWNER_REQUESTED_PLAN_IMPLEMENTATION_AFTER_REQUIRED_A11_REVIEW",
    providerEventCountAtActivation: 0,
    firstProviderExecutionAllowed: false,
    providerExecutionAuthorizationCreated: false,
    frameRegistrationHash: null,
    sampleManifestHash: null,
    openaiProjectRoutePreflightReceiptHash: null,
    openaiAuthorizationHash: null,
    referenceLabelSealHash: null,
    deepSeekAuthorizationHash: null,
    executionRegistrationHash: null,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimScopeCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    postActivationBlockers: [...POST_ACTIVATION_BLOCKERS_V1],
    supersedesActivePointerHash: jcsHash(input.priorPointer),
  };
  return Object.freeze({ ...body, selfHash: jcsHash(body) });
}

export function validateActivationPackageV1(artifacts) {
  const errors = [];
  let expectedPointer;
  let expectedReceipt;
  try {
    expectedPointer = buildActiveDesignPointerV5();
    expectedReceipt = buildActivationReceiptV1(artifacts);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "activation input validation failed");
  }
  if (expectedPointer) add(errors, same(artifacts.activePointer, expectedPointer), "active V5 pointer mismatch");
  if (expectedReceipt) add(errors, same(artifacts.activationReceipt, expectedReceipt), "activation receipt mismatch");
  add(errors, artifacts.activePointer?.firstProviderExecutionAllowed === false, "active pointer must not authorize first provider execution");
  add(errors, artifacts.activationReceipt?.providerExecutionAuthorizationCreated === false, "activation receipt must not create provider authorization");
  add(errors, artifacts.activationReceipt?.providerEventCountAtActivation === 0, "activation receipt provider event count drift");
  add(errors, artifacts.activationReceipt?.frameRegistrationHash === null
    && artifacts.activationReceipt?.sampleManifestHash === null
    && artifacts.activationReceipt?.openaiAuthorizationHash === null
    && artifacts.activationReceipt?.deepSeekAuthorizationHash === null
    && artifacts.activationReceipt?.executionRegistrationHash === null,
  "activation receipt fabricates downstream evidence");
  add(errors, SHA256.test(artifacts.activationReceipt?.selfHash ?? "")
    && hashWithout(artifacts.activationReceipt, "selfHash") === artifacts.activationReceipt.selfHash,
  "activation receipt self hash mismatch");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze([...errors]),
    activationStatus: errors.length === 0 ? "V5_METHOD_ACTIVE_EXECUTION_BLOCKED" : "ACTIVATION_INVALID",
    designId: artifacts.activePointer?.activeDesignId ?? null,
    registrationHash: artifacts.activePointer?.activeRegistrationHash ?? null,
    activationReceiptHash: artifacts.activationReceipt?.selfHash ?? null,
    providerEventCount: artifacts.activationReceipt?.providerEventCountAtActivation ?? null,
    firstProviderExecutionAllowed: artifacts.activePointer?.firstProviderExecutionAllowed ?? null,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
  });
}
