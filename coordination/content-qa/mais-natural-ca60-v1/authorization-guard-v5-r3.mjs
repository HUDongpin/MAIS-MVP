import {
  egressPolicyHashV5R3,
  roleReservationPolicyHashV5R3,
  validateOwnerGrantForAuthorizationV5R3,
  validateDeepSeekExecutionRegistrationV1,
  validatePriorRoleArtifactV5R3,
  validateRunnerReviewForAuthorizationV5R3,
  validateSampleExecutionInventoryV1,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const COMMON_EGRESS_DENYLIST = Object.freeze([
  "OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK",
  "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE",
  "SOURCE_PATH",
  "GIT_METADATA",
  "CREDENTIAL",
  "STUDENT_OR_USER_DATA",
  "OTHER_ITEM",
  "UNAUTHORIZED_COPYRIGHT_CONTENT",
  "INTERNAL_RESEARCH_RECORD",
]);
const OPENAI_EGRESS_ALLOWLIST = Object.freeze([
  "prompt", "options", "locale", "grade", "topic", "responseForm", "storedAnswer",
  "acceptedAnswers", "explanation", "itemSolveArtifact", "aSolveArtifact", "aLabelArtifact",
  "bSolveArtifact", "bLabelArtifact",
]);
const DEEPSEEK_EGRESS_ALLOWLIST = Object.freeze([
  "prompt", "options", "storedAnswer", "acceptedAnswers", "explanation", "rubric",
  "difficulty", "itemPseudonym", "bPrimeCritiqueArtifact",
]);
const REQUIRED_NON_AUTHORIZATIONS = Object.freeze([
  "NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK",
  "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT",
]);

function exactStringSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function expectedEgressPolicy(provider) {
  return Object.freeze({
    egressAllowlist: provider === "OPENAI_DIRECT" ? OPENAI_EGRESS_ALLOWLIST : DEEPSEEK_EGRESS_ALLOWLIST,
    egressDenylist: COMMON_EGRESS_DENYLIST,
  });
}

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

export function evaluateProviderAuthorizationV5R3(input = {}) {
  const { registration, review, authorization, routeReceipt, priceSnapshot, request } = input;
  const errors = [...validateRunnerReviewForAuthorizationV5R3({ registration, review, authorization })];
  errors.push(...validateSampleExecutionInventoryV1({ registration, inventory: input.sampleExecutionInventory }));
  errors.push(...validateOwnerGrantForAuthorizationV5R3({
    registration,
    review,
    authorization,
    ownerGrant: input.ownerGrant,
    credentialReadinessReceipt: input.credentialReadinessReceipt,
    routeReceipt,
    priceSnapshot,
  }));
  add(errors, validateSelfHashV5R3(routeReceipt), "sealed provider route receipt is required");
  add(errors, authorization?.routeReceiptHash === routeReceipt?.selfHash, "authorization route receipt binding is invalid");
  add(errors, routeReceipt?.registrationHash === registration?.selfHash, "route receipt runner registration binding is invalid");
  const routeConfirmed = authorization?.provider === "OPENAI_DIRECT"
    ? routeReceipt?.schemaVersion === "OpenAIProjectRoutePreflightReceiptV2" && routeReceipt?.preflightStatus === "CONFIRMED"
    : routeReceipt?.schemaVersion === "DeepSeekDirectRouteProbeReceiptV1" && routeReceipt?.probeStatus === "CONFIRMED";
  add(errors, routeConfirmed, "provider route is not confirmed by the required receipt");
  add(errors, validateSelfHashV5R3(priceSnapshot) && authorization?.priceSnapshotHash === priceSnapshot?.selfHash, "authorization price snapshot binding is invalid");
  add(errors, authorization?.credentialReadAuthorized === true, "credential read is not authorized");
  add(errors, authorization?.providerExecutionAuthorized === true, "provider execution is not authorized");
  add(errors, authorization?.naturalQuestionEgressAuthorized === true, "natural-question egress is not authorized");
  add(errors, authorization?.tokenAuthorizationCreated === true && authorization?.attemptAuthorizationCreated === true
    && authorization?.usdAuthorizationCreated === true, "token, attempt, and USD authorization is incomplete");
  const egress = expectedEgressPolicy(authorization?.provider);
  add(errors, exactStringSet(authorization?.egressAllowlist, egress.egressAllowlist)
    && exactStringSet(authorization?.egressDenylist, egress.egressDenylist), "authorization egress allow/deny policy is invalid");
  let expectedEgressHash = null;
  let expectedRolePolicyHash = null;
  try {
    expectedEgressHash = egressPolicyHashV5R3({ provider: authorization?.provider, ...egress });
    expectedRolePolicyHash = roleReservationPolicyHashV5R3(authorization?.roleReservationPolicy);
  } catch {}
  add(errors, authorization?.egressPolicyHash === expectedEgressHash, "authorization egress policy hash is invalid");
  add(errors, authorization?.roleReservationPolicyHash === expectedRolePolicyHash, "authorization role reservation policy hash is invalid");
  add(errors, exactStringSet(Object.keys(authorization?.roleReservationPolicy ?? {}), authorization?.roleSet ?? []), "authorization role reservation policy does not exactly cover roleSet");
  add(errors, exactStringSet(authorization?.nonAuthorizations, REQUIRED_NON_AUTHORIZATIONS), "authorization non-authorizations are incomplete");
  const now = Date.parse(input.now);
  add(errors, Number.isFinite(now) && now >= Date.parse(authorization?.issuedAt) && now < Date.parse(authorization?.expiresAt), "provider authorization is not currently valid");
  add(errors, validateSelfHashV5R3(request), "sealed provider request is required");
  add(errors, request?.provider === authorization?.provider && request?.model === authorization?.model
    && request?.endpoint === authorization?.endpoint, "request provider tuple drifted from authorization");
  add(errors, Array.isArray(authorization?.roleSet) && authorization.roleSet.includes(request?.role), "request role is outside authorization");
  add(errors, request?.sampleManifestHash === registration?.sampleManifestHash
    && request?.samplePayloadSetHash === registration?.samplePayloadSetHash, "request sample binding is invalid");
  add(errors, request?.privacyScreenHash === registration?.privacyScreenHash
    && request?.rightsScreenHash === registration?.rightsScreenHash, "request rights/privacy binding is invalid");
  const inventoryItem = Array.isArray(input.sampleExecutionInventory?.items)
    ? input.sampleExecutionInventory.items.find((item) => item.itemHash === request?.itemHash)
    : null;
  add(errors, inventoryItem?.itemIdPseudonym === request?.itemIdPseudonym
    && inventoryItem?.clusterId === request?.clusterId
    && inventoryItem?.egressEligible === true, "request item is outside the frozen egress-eligible sample inventory");
  add(errors, authorization?.sampleExecutionInventoryHash === input.sampleExecutionInventory?.selfHash, "authorization sample execution inventory binding is invalid");
  add(errors, authorization?.frameRegistrationHash === registration?.frameRegistrationHash
    && authorization?.sampleManifestHash === registration?.sampleManifestHash
    && authorization?.samplePayloadSetHash === registration?.samplePayloadSetHash, "authorization frame/sample binding is invalid");
  add(errors, authorization?.privacyScreenHash === registration?.privacyScreenHash
    && authorization?.rightsScreenHash === registration?.rightsScreenHash, "authorization rights/privacy binding is invalid");
  add(errors, authorization?.providerContractErratumHash === registration?.providerContractErratumHash, "provider contract erratum binding is invalid");
  if (authorization?.provider === "OPENAI_DIRECT") {
    add(errors, authorization.model === "gpt-5.6-luna" && authorization.endpoint === "https://us.api.openai.com/v1/responses"
      && authorization.projectResidency === "US_STORAGE_PROCESSING", "OpenAI reference tuple is invalid");
    add(errors, request?.deepSeekInputCount === 0, "OpenAI request contains DeepSeek material");
    add(errors, /^[0-9a-f]{64}$/u.test(authorization?.projectIdentityHash ?? "")
      && authorization.projectIdentityHash === routeReceipt?.projectIdentityHash, "OpenAI project identity evidence binding is invalid");
  } else if (authorization?.provider === "DEEPSEEK_DIRECT") {
    add(errors, authorization.model === "deepseek-v4-pro" && authorization.endpoint === "https://api.deepseek.com/chat/completions", "DeepSeek evaluation tuple is invalid");
    add(errors, request?.referenceInputCount === 0, "DeepSeek request contains machine-reference material");
    errors.push(...validateDeepSeekExecutionRegistrationV1({
      executionRegistration: input.executionRegistration,
      runnerRegistration: registration,
      runnerReview: review,
      authorization,
    }));
  } else {
    add(errors, false, "provider is outside the frozen V5-R3 tuples");
  }
  if (Array.isArray(input.priorRoleBindings)) {
    for (const [index, binding] of input.priorRoleBindings.entries()) {
      const lineageErrors = validatePriorRoleArtifactV5R3({
        ...binding,
        itemHash: request?.itemHash,
        itemIdPseudonym: request?.itemIdPseudonym,
      });
      for (const error of lineageErrors) errors.push(`prior role binding ${index + 1}: ${error}`);
    }
  }
  return Object.freeze({
    dispatchAllowed: errors.length === 0,
    errors: Object.freeze([...new Set(errors)]),
  });
}
