import REFERENCE_AUTHORITY_SCHEMA from "./schemas/ReferenceDispatchAuthorityReceiptV1.schema.json" with { type: "json" };
import PERMIT_SCHEMA from "./schemas/ProviderDispatchPermitV5.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  planOpenAIReferenceResumeV5R4,
} from "./execution-state-v5-r4.mjs";
import {
  validateSemanticDispatchAuthorityV5R11,
} from "./semantic-dispatch-v5-r11.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function root(entries) {
  return sha256V5R3(canonicalJsonV5R3((entries ?? []).map(({ selfHash }) => selfHash)));
}

export function buildReferenceDispatchAuthorityV5R11(input) {
  const errors = validateExecutionLedgerEntriesV5R4({
    entries: input?.ledgerEntries ?? [],
    authorization: input?.authorization?.compatibilityAuthorization,
    inventory: input?.inventory,
  });
  requireCondition(errors.length === 0 && input?.authorization?.provider === "OPENAI_DIRECT"
    && input.authorization.activeRunnerRegistrationHash === input.activeRegistration?.selfHash
    && input.authorization.compatibilityAuthorizationHash
      === input.authorization.compatibilityAuthorization.selfHash,
  `R11 reference authority upstream validation failed: ${errors.join("; ")}`);
  const plan = planOpenAIReferenceResumeV5R4({
    registration: input.registration,
    authorization: input.authorization.compatibilityAuthorization,
    inventory: input.inventory,
    ledgerEntries: input.ledgerEntries,
    generatedAt: input.issuedAt,
  });
  requireCondition(plan.planStatus === "NEXT_ACTION", `R11 reference planner is ${plan.planStatus}`);
  const item = input.inventory.items[plan.manifestOrdinal - 1];
  requireCondition(item?.itemHash === plan.itemHash, "R11 reference plan is outside the frozen inventory");
  const attemptOrdinal = plan.failedAttemptsForItemRole + 1;
  const receipt = sealV5R3Artifact({
    schemaVersion: "ReferenceDispatchAuthorityReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    compatibilityAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    mode: "REFERENCE_RESUME",
    ledgerPrefixRootHash: root(input.ledgerEntries),
    ledgerPrefixTerminalHash: input.ledgerEntries.at(-1)?.selfHash ?? null,
    compatibilityPlanHash: plan.selfHash,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    manifestOrdinal: item.manifestOrdinal,
    role: plan.role,
    failedAttemptsForItemRole: plan.failedAttemptsForItemRole,
    attemptOrdinal,
    attemptId: `V5R11O:${input.activeRegistration.selfHash}:${plan.selfHash}:${attemptOrdinal}`,
    roleOrderVerified: true,
    referenceBlindnessVerified: true,
    authorityStatus: "EXACT_REFERENCE_PLANNER_REBUILT_BEFORE_RESERVATION",
    issuedAt: input.issuedAt,
  });
  assertClosedSelfHashedArtifactV5R11(receipt, receipt.schemaVersion);
  return receipt;
}

export function validateReferenceDispatchAuthorityV5R11({ referenceDispatchAuthority, ...input }) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(referenceDispatchAuthority,
    "ReferenceDispatchAuthorityReceiptV1")];
  try {
    const rebuilt = buildReferenceDispatchAuthorityV5R11({
      ...input,
      issuedAt: referenceDispatchAuthority?.issuedAt,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(referenceDispatchAuthority)) {
      errors.push("R11 reference authority differs from exact planner reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function validateDispatchAuthorityV5R11(input) {
  return input.authorization.provider === "OPENAI_DIRECT"
    ? validateReferenceDispatchAuthorityV5R11({
      ...(input.dispatchAuthorityContext ?? input),
      referenceDispatchAuthority: input.dispatchAuthority,
    })
    : validateSemanticDispatchAuthorityV5R11({
      ...(input.dispatchAuthorityContext ?? input),
      semanticDispatchAuthority: input.dispatchAuthority,
    });
}

export function buildProviderDispatchPermitV5R11({ input, reservation }) {
  const authority = input.dispatchAuthority;
  const errors = validateDispatchAuthorityV5R11(input);
  requireCondition(errors.length === 0 && input.requestArtifact.attemptId === authority.attemptId
    && input.requestArtifact.itemHash === authority.itemHash
    && input.requestArtifact.role === authority.role,
  `R11 dispatch authority/request binding is invalid: ${errors.join("; ")}`);
  const receipt = sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV5",
    mode: "LIVE",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    freshRunnerReviewHash: input.freshReview.selfHash,
    authorizationHash: input.authorization.selfHash,
    authenticatedRouteEvidenceHash: (input.routeEvidenceEnvelope
      ?? input.authenticatedRouteEvidence).selfHash,
    costPreviewHash: input.costPreview.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    reservationHash: reservation.selfHash,
    requestArtifactHash: input.requestArtifact.selfHash,
    compatibilityRequestArtifactHash: input.requestArtifact.compatibilityRequestArtifactHash,
    dispatchAuthorityHash: authority.selfHash,
    attemptId: authority.attemptId,
    provider: input.authorization.provider,
    model: input.authorization.model,
    endpoint: input.authorization.endpoint,
    projectResidency: input.authorization.projectResidency,
    dataRegion: input.authorization.dataRegion,
    projectIdentityHash: input.authorization.projectIdentityHash,
    role: authority.role,
    itemHash: authority.itemHash,
    itemIdPseudonym: authority.itemIdPseudonym,
    wireRequestBodyHash: input.requestArtifact.wireRequestBodyHash,
    wireRequestByteLength: input.requestArtifact.wireRequestByteLength,
    issuedAt: input.at,
  });
  assertClosedSelfHashedArtifactV5R11(receipt, receipt.schemaVersion);
  return receipt;
}

export function validateProviderDispatchPermitV5R11({ permit, input, reservation }) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(permit, "ProviderDispatchPermitV5")];
  try {
    const rebuilt = buildProviderDispatchPermitV5R11({
      input: { ...input, at: permit?.issuedAt },
      reservation,
    });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(permit)) {
      errors.push("R11 dispatch permit differs from exact authority/request/reservation reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}
