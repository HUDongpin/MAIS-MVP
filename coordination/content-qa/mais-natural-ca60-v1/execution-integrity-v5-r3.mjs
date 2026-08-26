import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_COMMIT = /^[0-9a-f]{40}$/u;

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function canonicalJsonV5R3(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON forbids non-finite numbers");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonV5R3).join(",")}]`;
  if (!plainObject(value)) throw new TypeError("canonical JSON requires plain JSON values");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonV5R3(value[key])}`).join(",")}}`;
}

export function sha256V5R3(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function roleReservationPolicyHashV5R3(policy) {
  if (!plainObject(policy)) throw new TypeError("role reservation policy must be a plain object");
  return sha256V5R3(canonicalJsonV5R3({ schemaVersion: "RoleReservationPolicyV1", policy }));
}

export function egressPolicyHashV5R3({ provider, egressAllowlist, egressDenylist }) {
  if (typeof provider !== "string" || !Array.isArray(egressAllowlist) || !Array.isArray(egressDenylist)
    || [...egressAllowlist, ...egressDenylist].some((value) => typeof value !== "string" || value.length === 0)) {
    throw new TypeError("egress policy is invalid");
  }
  return sha256V5R3(canonicalJsonV5R3({
    schemaVersion: "ProviderEgressPolicyV1",
    provider,
    egressAllowlist: [...egressAllowlist].sort(),
    egressDenylist: [...egressDenylist].sort(),
  }));
}

export function sealV5R3Artifact(body) {
  if (!plainObject(body) || Object.hasOwn(body, "selfHash")) throw new TypeError("artifact body must be a plain object without selfHash");
  const clone = structuredClone(body);
  return Object.freeze({ ...clone, selfHash: sha256V5R3(canonicalJsonV5R3(clone)) });
}

export function validateSelfHashV5R3(artifact) {
  if (!plainObject(artifact) || !SHA256.test(artifact.selfHash ?? "")) return false;
  const { selfHash, ...body } = artifact;
  return selfHash === sha256V5R3(canonicalJsonV5R3(body));
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function inventoryRoots(items) {
  const sorted = [...items].sort((left, right) => codePointCompare(left.itemHash, right.itemHash));
  return Object.freeze({
    samplePayloadSetHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash }) => itemHash))),
    privacyScreenHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash, privacyScreenEvidenceHash }) => [itemHash, privacyScreenEvidenceHash]))),
    rightsScreenHash: sha256V5R3(canonicalJsonV5R3(sorted.map(({ itemHash, rightsScreenEvidenceHash }) => [itemHash, rightsScreenEvidenceHash]))),
  });
}

export function buildSampleExecutionInventoryV1({ registration, items }) {
  if (!validateSelfHashV5R3(registration) || registration.schemaVersion !== "NaturalCaExecutionRunnerRegistrationV2") {
    throw new TypeError("sealed NaturalCaExecutionRunnerRegistrationV2 is required");
  }
  const normalized = Array.isArray(items) ? structuredClone(items) : null;
  const provisional = sealV5R3Artifact({
    schemaVersion: "SampleExecutionInventoryV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    sampleManifestHash: registration.sampleManifestHash,
    samplePayloadSetHash: registration.samplePayloadSetHash,
    privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash,
    itemCount: normalized?.length ?? 0,
    items: normalized ?? [],
  });
  const errors = validateSampleExecutionInventoryV1({ registration, inventory: provisional });
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return provisional;
}

export function validateSampleExecutionInventoryV1({ registration, inventory }) {
  const errors = [];
  add(errors, validateSelfHashV5R3(registration), "runner registration self-hash is invalid");
  add(errors, inventory?.schemaVersion === "SampleExecutionInventoryV1" && validateSelfHashV5R3(inventory), "sample execution inventory self-hash is invalid");
  add(errors, inventory?.runnerRegistrationHash === registration?.selfHash, "sample execution inventory runner binding is invalid");
  add(errors, inventory?.sampleManifestHash === registration?.sampleManifestHash, "sample execution inventory manifest binding is invalid");
  add(errors, inventory?.samplePayloadSetHash === registration?.samplePayloadSetHash
    && inventory?.privacyScreenHash === registration?.privacyScreenHash
    && inventory?.rightsScreenHash === registration?.rightsScreenHash, "sample execution inventory frozen-root binding is invalid");
  const items = Array.isArray(inventory?.items) ? inventory.items : [];
  add(errors, inventory?.itemCount === 60 && items.length === 60, "sample execution inventory must contain exactly 60 items");
  for (const [index, item] of items.entries()) {
    add(errors, plainObject(item), `sample execution inventory item ${index + 1} is invalid`);
    add(errors, SHA256.test(item?.itemHash ?? ""), `sample execution inventory item ${index + 1} hash is invalid`);
    add(errors, typeof item?.itemIdPseudonym === "string" && item.itemIdPseudonym.length > 0, `sample execution inventory item ${index + 1} pseudonym is invalid`);
    add(errors, typeof item?.clusterId === "string" && item.clusterId.length > 0, `sample execution inventory item ${index + 1} cluster is invalid`);
    add(errors, SHA256.test(item?.privacyScreenEvidenceHash ?? "") && SHA256.test(item?.rightsScreenEvidenceHash ?? ""), `sample execution inventory item ${index + 1} screen evidence is invalid`);
    add(errors, item?.egressEligible === true, `sample execution inventory item ${index + 1} is not egress eligible`);
  }
  for (const [field, label] of [["itemHash", "item hash"], ["itemIdPseudonym", "item pseudonym"], ["clusterId", "cluster"]]) {
    add(errors, new Set(items.map((item) => item?.[field])).size === items.length, `sample execution inventory ${label} values are not unique`);
  }
  if (items.length === 60 && items.every((item) => SHA256.test(item?.itemHash ?? "")
    && SHA256.test(item?.privacyScreenEvidenceHash ?? "") && SHA256.test(item?.rightsScreenEvidenceHash ?? ""))) {
    const roots = inventoryRoots(items);
    add(errors, roots.samplePayloadSetHash === registration?.samplePayloadSetHash, "sample execution inventory payload-set root is invalid");
    add(errors, roots.privacyScreenHash === registration?.privacyScreenHash, "sample execution inventory privacy-screen root is invalid");
    add(errors, roots.rightsScreenHash === registration?.rightsScreenHash, "sample execution inventory rights-screen root is invalid");
  }
  return Object.freeze([...new Set(errors)]);
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

export function buildRunnerReviewReceiptV2({ reviewedAt, decision, reviewedRegistration, reviewerLane, findingCount }) {
  if (!validateSelfHashV5R3(reviewedRegistration)) throw new TypeError("reviewed runner registration self-hash is invalid");
  if (!iso(reviewedAt)) throw new TypeError("reviewedAt must be an explicit ISO timestamp");
  if (!["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"].includes(decision)) throw new TypeError("runner review decision is invalid");
  if (reviewerLane !== "A11" || !Number.isSafeInteger(findingCount) || findingCount < 0) throw new TypeError("runner review attribution is invalid");
  return sealV5R3Artifact({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: reviewedRegistration.runnerVersion,
    reviewedAt,
    decision,
    reviewerLane,
    findingCount,
    reviewedRunnerRegistrationHash: reviewedRegistration.selfHash,
    reviewedRunnerSourceCommit: reviewedRegistration.runnerSourceCommit,
    reviewedProductionSourceRootHash: reviewedRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: reviewedRegistration.testSourceRootHash,
  });
}

export function validateRunnerReviewForAuthorizationV5R3({ registration, review, authorization }) {
  const errors = [];
  add(errors, validateSelfHashV5R3(registration), "runner registration self-hash is invalid");
  add(errors, review?.schemaVersion === "IndependentExecutionRunnerReviewReceiptV2", "fresh runner review schema is required");
  add(errors, validateSelfHashV5R3(review), "fresh runner review self-hash is invalid");
  add(errors, review?.decision === "CONCURRED" && review?.findingCount === 0, "fresh runner review must be CONCURRED with zero findings");
  add(errors, review?.reviewedRunnerRegistrationHash === registration?.selfHash, "fresh runner review registration binding is invalid");
  add(errors, review?.reviewedRunnerSourceCommit === registration?.runnerSourceCommit, "fresh runner review commit binding is invalid");
  add(errors, review?.reviewedProductionSourceRootHash === registration?.productionSourceRootHash, "fresh runner review production root binding is invalid");
  add(errors, review?.reviewedTestSourceRootHash === registration?.testSourceRootHash, "fresh runner review test root binding is invalid");
  add(errors, authorization?.schemaVersion === "ProviderAuthorizationV3" && validateSelfHashV5R3(authorization), "ProviderAuthorizationV3 self-hash is invalid");
  add(errors, authorization?.runnerRegistrationHash === registration?.selfHash, "authorization runner registration binding is invalid");
  add(errors, authorization?.freshRunnerReviewHash === review?.selfHash, "authorization fresh review binding is invalid");
  add(errors, authorization?.runnerSourceCommit === registration?.runnerSourceCommit, "authorization runner commit binding is invalid");
  add(errors, authorization?.productionSourceRootHash === registration?.productionSourceRootHash, "authorization production source root binding is invalid");
  add(errors, authorization?.testSourceRootHash === registration?.testSourceRootHash, "authorization test source root binding is invalid");
  add(errors, iso(registration?.registeredAt) && iso(review?.reviewedAt) && Date.parse(review.reviewedAt) >= Date.parse(registration.registeredAt), "fresh review must not predate runner registration");
  add(errors, iso(review?.reviewedAt) && iso(authorization?.issuedAt) && Date.parse(authorization.issuedAt) > Date.parse(review.reviewedAt), "authorization must be issued after fresh runner review");
  add(errors, iso(authorization?.issuedAt) && iso(authorization?.expiresAt) && Date.parse(authorization.expiresAt) > Date.parse(authorization.issuedAt), "authorization expiry chronology is invalid");
  return Object.freeze(errors);
}

export function deriveProviderCostUsd({ inputTokens, outputTokens }, priceSnapshot) {
  if (!validateSelfHashV5R3(priceSnapshot) || priceSnapshot.schemaVersion !== "ProviderPriceSnapshotV1") throw new TypeError("price snapshot is invalid");
  if (![inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new TypeError("token usage is invalid");
  const cost = ((inputTokens * priceSnapshot.inputUsdPerMillionTokens)
    + (outputTokens * priceSnapshot.outputUsdPerMillionTokens)) / 1_000_000;
  return Number(cost.toFixed(12));
}

export function buildAuthorizationEvidenceHashV5R3({ ownerGrant, credentialReadinessReceipt, routeReceipt, priceSnapshot }) {
  for (const [name, artifact] of Object.entries({ ownerGrant, credentialReadinessReceipt, routeReceipt, priceSnapshot })) {
    if (!validateSelfHashV5R3(artifact)) throw new TypeError(`${name} self-hash is invalid`);
  }
  return sha256V5R3(canonicalJsonV5R3({
    schemaVersion: "ProviderAuthorizationEvidenceRootV1",
    ownerGrantHash: ownerGrant.selfHash,
    credentialReadinessReceiptHash: credentialReadinessReceipt.selfHash,
    routeReceiptHash: routeReceipt.selfHash,
    priceSnapshotHash: priceSnapshot.selfHash,
  }));
}

export function validateOwnerGrantForAuthorizationV5R3({ registration, review, authorization, ownerGrant, credentialReadinessReceipt, routeReceipt, priceSnapshot }) {
  const errors = [];
  add(errors, ownerGrant?.schemaVersion === "OwnerProviderGrantV1" && validateSelfHashV5R3(ownerGrant), "sealed owner provider grant is required");
  add(errors, credentialReadinessReceipt?.schemaVersion === "CredentialReadinessReceiptV1"
    && validateSelfHashV5R3(credentialReadinessReceipt), "sealed credential-readiness receipt is required");
  add(errors, authorization?.ownerGrantHash === ownerGrant?.selfHash, "authorization owner grant binding is invalid");
  add(errors, authorization?.credentialReadinessReceiptHash === credentialReadinessReceipt?.selfHash, "authorization credential-readiness binding is invalid");
  add(errors, ownerGrant?.runnerRegistrationHash === registration?.selfHash
    && ownerGrant?.freshRunnerReviewHash === review?.selfHash, "owner grant runner/review binding is invalid");
  add(errors, ownerGrant?.provider === authorization?.provider && ownerGrant?.model === authorization?.model
    && ownerGrant?.endpoint === authorization?.endpoint, "owner grant provider tuple is invalid");
  add(errors, ownerGrant?.routeReceiptHash === routeReceipt?.selfHash && ownerGrant?.priceSnapshotHash === priceSnapshot?.selfHash, "owner grant route/price binding is invalid");
  for (const key of ["sampleExecutionInventoryHash", "egressPolicyHash", "roleReservationPolicyHash"]) {
    add(errors, SHA256.test(ownerGrant?.[key] ?? "") && ownerGrant?.[key] === authorization?.[key], `owner grant ${key} binding is invalid`);
  }
  for (const key of ["maximumAttempts", "maximumSuccessfulCalls", "maximumInputTokens", "maximumOutputTokens", "maximumTokens", "maximumEstimatedUsd", "concurrencyCap", "maximumAttemptsPerRole"]) {
    add(errors, ownerGrant?.[key] === authorization?.[key], `owner grant ${key} binding is invalid`);
  }
  add(errors, ownerGrant?.issuedAt === authorization?.issuedAt && ownerGrant?.expiresAt === authorization?.expiresAt, "owner grant chronology binding is invalid");
  add(errors, credentialReadinessReceipt?.provider === authorization?.provider
    && credentialReadinessReceipt?.status === "READY_REDACTED_NO_VALUE_RECORDED", "credential-readiness status/provider is invalid");
  let evidenceHash = null;
  try { evidenceHash = buildAuthorizationEvidenceHashV5R3({ ownerGrant, credentialReadinessReceipt, routeReceipt, priceSnapshot }); } catch {}
  add(errors, authorization?.authorizationEvidenceHash === evidenceHash, "authorization evidence root is invalid");
  return Object.freeze(errors);
}

function observedUsage(responseEnvelope) {
  const usage = plainObject(responseEnvelope?.usage) ? responseEnvelope.usage : null;
  if (!usage) return null;
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens;
  const totalTokens = usage.total_tokens;
  if (![inputTokens, outputTokens, totalTokens].every((value) => Number.isSafeInteger(value) && value >= 0)) return null;
  if (inputTokens + outputTokens !== totalTokens) return null;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens
    ?? usage.completion_tokens_details?.reasoning_tokens
    ?? 0;
  if (!Number.isSafeInteger(reasoningTokens) || reasoningTokens < 0 || reasoningTokens > outputTokens) return null;
  return { inputTokens, outputTokens, reasoningTokens, totalTokens };
}

export function buildProviderEventReceiptV3(input) {
  if (!validateSelfHashV5R3(input.reservation)) throw new TypeError("dispatch reservation self-hash is invalid");
  if (!validateSelfHashV5R3(input.priceSnapshot)) throw new TypeError("price snapshot self-hash is invalid");
  if (!iso(input.completedAt)) throw new TypeError("provider event completedAt is invalid");
  const usage = observedUsage(input.responseEnvelope);
  const rawResponseBodyHash = typeof input.rawResponseBody === "string" ? sha256V5R3(input.rawResponseBody) : null;
  const inputTokens = usage?.inputTokens ?? null;
  const outputTokens = usage?.outputTokens ?? null;
  const reasoningTokens = usage?.reasoningTokens ?? null;
  const totalTokens = usage?.totalTokens ?? null;
  const estimatedCostUsd = usage
    ? deriveProviderCostUsd({ inputTokens, outputTokens }, input.priceSnapshot)
    : input.reservation.reservedUsd;
  return sealV5R3Artifact({
    schemaVersion: "ProviderEventReceiptV3",
    reservationHash: input.reservation.selfHash,
    authorizationHash: input.reservation.authorizationHash,
    attemptId: input.reservation.attemptId,
    role: input.reservation.role,
    itemHash: input.reservation.itemHash,
    itemIdPseudonym: input.reservation.itemIdPseudonym,
    clusterId: input.reservation.clusterId,
    sampleExecutionInventoryHash: input.reservation.sampleExecutionInventoryHash,
    provider: input.provider,
    requestedModel: input.requestedModel,
    observedModel: input.observedModel ?? null,
    requestedEndpoint: input.requestedEndpoint,
    observedEndpoint: input.observedEndpoint ?? null,
    transportStatus: input.transportStatus,
    bodyReadStatus: input.bodyReadStatus,
    httpStatus: input.httpStatus ?? null,
    providerEventCount: input.providerEventCount,
    httpRequestCount: input.httpRequestCount,
    responseBodyHash: rawResponseBodyHash,
    usageSource: usage ? "PROVIDER_ENVELOPE" : "UNAVAILABLE_RESERVED_WORST_CASE",
    inputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    priceSnapshotHash: input.priceSnapshot.selfHash,
    estimatedCostUsd,
    reservedCostUsd: input.reservation.reservedUsd,
    providerInvoiceAuthoritative: true,
    parseStatus: input.parseStatus,
    schemaStatus: input.schemaStatus,
    finishReason: input.finishReason ?? null,
    attemptStatus: input.attemptStatus ?? (input.transportStatus === "DELIVERED" && input.parseStatus === "PARSED" && input.schemaStatus === "VALID"
      ? "SUCCEEDED"
      : input.transportStatus),
    completedAt: input.completedAt,
  });
}

export function buildDeepSeekExecutionRegistrationV1(input) {
  const { runnerRegistration, runnerReview, authorization } = input;
  const reviewErrors = validateRunnerReviewForAuthorizationV5R3({ registration: runnerRegistration, review: runnerReview, authorization });
  if (reviewErrors.length > 0) throw new TypeError(reviewErrors.join("; "));
  for (const [name, value] of Object.entries({
    referenceSealHash: input.referenceSealHash,
    referenceAttemptChainHash: input.referenceAttemptChainHash,
    frameRegistrationHash: input.frameRegistrationHash,
    sampleManifestHash: input.sampleManifestHash,
    routeReceiptHash: input.routeReceiptHash,
    adapterHash: input.adapterHash,
  })) if (!SHA256.test(value ?? "")) throw new TypeError(`${name} is invalid`);
  if (!iso(input.registeredAt) || Date.parse(input.registeredAt) <= Date.parse(authorization.issuedAt)) throw new TypeError("execution registration chronology is invalid");
  return sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: input.registeredAt,
    runnerRegistrationHash: runnerRegistration.selfHash,
    freshRunnerReviewHash: runnerReview.selfHash,
    authorizationHash: authorization.selfHash,
    referenceSealHash: input.referenceSealHash,
    referenceAttemptChainHash: input.referenceAttemptChainHash,
    frameRegistrationHash: input.frameRegistrationHash,
    sampleManifestHash: input.sampleManifestHash,
    routeReceiptHash: input.routeReceiptHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    adapterHash: input.adapterHash,
  });
}

export function validateDeepSeekExecutionRegistrationV1({ executionRegistration, runnerRegistration, runnerReview, authorization }) {
  const errors = [];
  add(errors, executionRegistration?.schemaVersion === "DeepSeekExecutionRegistrationV1", "DeepSeek execution registration schema is invalid");
  add(errors, validateSelfHashV5R3(executionRegistration), "DeepSeek execution registration self-hash is invalid");
  add(errors, executionRegistration?.runnerRegistrationHash === runnerRegistration?.selfHash, "DeepSeek execution registration runner binding is invalid");
  add(errors, executionRegistration?.freshRunnerReviewHash === runnerReview?.selfHash, "DeepSeek execution registration review binding is invalid");
  add(errors, executionRegistration?.authorizationHash === authorization?.selfHash, "DeepSeek execution registration authorization binding is invalid");
  add(errors, executionRegistration?.frameRegistrationHash === runnerRegistration?.frameRegistrationHash, "DeepSeek execution registration frame binding is invalid");
  add(errors, executionRegistration?.sampleManifestHash === runnerRegistration?.sampleManifestHash, "DeepSeek execution registration sample binding is invalid");
  add(errors, executionRegistration?.routeReceiptHash === authorization?.routeReceiptHash, "DeepSeek execution registration route binding is invalid");
  add(errors, executionRegistration?.provider === "DEEPSEEK_DIRECT" && executionRegistration?.model === "deepseek-v4-pro"
    && executionRegistration?.endpoint === "https://api.deepseek.com/chat/completions", "DeepSeek execution registration provider tuple is invalid");
  add(errors, SHA256.test(executionRegistration?.referenceSealHash ?? "") && SHA256.test(executionRegistration?.referenceAttemptChainHash ?? ""), "DeepSeek execution registration reference binding is invalid");
  return Object.freeze(errors);
}

export function validatePriorRoleArtifactV5R3({ artifact, attemptReceipt, expectedRole, itemHash, itemIdPseudonym }) {
  const errors = [];
  add(errors, validateSelfHashV5R3(attemptReceipt), "prior attempt receipt self-hash is invalid");
  add(errors, validateSelfHashV5R3(artifact), "prior role artifact self-hash is invalid");
  add(errors, attemptReceipt?.attemptStatus === "SUCCEEDED", "prior attempt did not succeed");
  add(errors, attemptReceipt?.role === expectedRole && artifact?.role === expectedRole, "prior role binding is invalid");
  add(errors, attemptReceipt?.itemHash === itemHash && artifact?.itemHash === itemHash, "prior item hash binding is invalid");
  add(errors, attemptReceipt?.itemIdPseudonym === itemIdPseudonym && artifact?.itemIdPseudonym === itemIdPseudonym, "prior item pseudonym binding is invalid");
  add(errors, artifact?.attemptId === attemptReceipt?.attemptId && artifact?.attemptReceiptHash === attemptReceipt?.selfHash, "prior successful-attempt lineage is invalid");
  return Object.freeze(errors);
}

function validateSameItemArtifact(artifact, item, expectedRole = null) {
  if (!validateSelfHashV5R3(artifact)) throw new TypeError("trigger input self-hash is invalid");
  if (artifact.itemHash !== item.itemHash || artifact.itemIdPseudonym !== item.itemIdPseudonym) throw new TypeError("trigger input crosses the item boundary");
  if (expectedRole !== null && artifact.panelRole !== expectedRole) throw new TypeError("trigger input role is invalid");
}

export function buildOpenAIAdjudicationTriggerReceiptV1({ item, labelA, labelB, triggerEngineHash }) {
  if (!SHA256.test(item?.itemHash ?? "") || typeof item?.itemIdPseudonym !== "string" || !SHA256.test(triggerEngineHash ?? "")) throw new TypeError("adjudication trigger identity is invalid");
  validateSameItemArtifact(labelA, item, "A_LABEL");
  validateSameItemArtifact(labelB, item, "B_LABEL");
  const reasons = [];
  if (canonicalJsonV5R3({ severity: labelA.severity, codes: labelA.codes }) !== canonicalJsonV5R3({ severity: labelB.severity, codes: labelB.codes })) reasons.push("FIELD_DISAGREEMENT");
  if (labelA.uncertain === true || labelB.uncertain === true) reasons.push("UNCERTAIN");
  if ([labelA.severity, labelB.severity].some((severity) => severity === "P0")) reasons.push("P0_RAISED");
  if ([labelA.severity, labelB.severity].some((severity) => severity === "P1")) reasons.push("P1_RAISED");
  return sealV5R3Artifact({
    schemaVersion: "OpenAIAdjudicationTriggerReceiptV1",
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    triggerEngineHash,
    labelAHash: labelA.selfHash,
    labelBHash: labelB.selfHash,
    reasons: [...new Set(reasons)],
    adjudicationRequired: reasons.length > 0,
  });
}

export function buildDeepSeekC0TriggerReceiptV1({ item, randomAuditSelectionReceipt, mandatoryTriggerReceipt, triggerEngineHash }) {
  if (!SHA256.test(item?.itemHash ?? "") || typeof item?.itemIdPseudonym !== "string" || !SHA256.test(triggerEngineHash ?? "")) throw new TypeError("C0 trigger identity is invalid");
  validateSameItemArtifact(randomAuditSelectionReceipt, item);
  validateSameItemArtifact(mandatoryTriggerReceipt, item);
  const reasons = [];
  if (randomAuditSelectionReceipt.selected === true) reasons.push("REGISTERED_RANDOM_AUDIT");
  if (Array.isArray(mandatoryTriggerReceipt.triggeredCodes) && mandatoryTriggerReceipt.triggeredCodes.length > 0) reasons.push("MANDATORY_POLICY_TRIGGER");
  return sealV5R3Artifact({
    schemaVersion: "DeepSeekC0TriggerReceiptV1",
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    triggerEngineHash,
    randomAuditSelectionReceiptHash: randomAuditSelectionReceipt.selfHash,
    mandatoryTriggerReceiptHash: mandatoryTriggerReceipt.selfHash,
    reasons,
    c0Required: reasons.length > 0,
  });
}

export function buildOpenAIProjectRouteReceiptV1(input) {
  for (const key of ["registrationHash", "preflightAuthorizationHash", "credentialReadinessReceiptHash", "projectResidencyConsoleEvidenceHash", "projectIdentityHash", "providerAttemptReceiptHash", "priceSnapshotHash"]) {
    if (!SHA256.test(input[key] ?? "")) throw new TypeError(`${key} is invalid`);
  }
  if (!iso(input.completedAt)) throw new TypeError("OpenAI route receipt timestamp is invalid");
  const confirmed = input.observedEndpoint === "https://us.api.openai.com/v1/responses"
    && input.observedModel === "gpt-5.6-luna"
    && input.projectStorageAndProcessingConfirmed === true
    && input.modelAvailableOnProject === true;
  return sealV5R3Artifact({
    schemaVersion: "OpenAIProjectRoutePreflightReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: input.registrationHash,
    preflightAuthorizationHash: input.preflightAuthorizationHash,
    credentialReadinessReceiptHash: input.credentialReadinessReceiptHash,
    provider: "OPENAI_DIRECT",
    requestedProjectResidency: "US_STORAGE_PROCESSING",
    requestedEndpoint: "https://us.api.openai.com/v1/responses",
    requestedModel: "gpt-5.6-luna",
    containsNaturalQuestionText: false,
    observedEndpoint: input.observedEndpoint ?? null,
    observedModel: input.observedModel ?? null,
    projectResidencyConsoleEvidenceHash: input.projectResidencyConsoleEvidenceHash,
    projectIdentityHash: input.projectIdentityHash,
    projectStorageAndProcessingConfirmed: input.projectStorageAndProcessingConfirmed,
    modelAvailableOnProject: input.modelAvailableOnProject,
    providerAttemptReceiptHash: input.providerAttemptReceiptHash,
    priceSnapshotHash: input.priceSnapshotHash,
    preflightStatus: confirmed ? "CONFIRMED" : "BLOCKED",
    completedAt: input.completedAt,
  });
}

export function buildDeepSeekRouteProbeReceiptV1(input) {
  for (const key of ["registrationHash", "probeAuthorizationHash", "credentialReadinessReceiptHash", "directBillingEvidenceHash", "dataRegionEvidenceHash", "providerAttemptReceiptHash", "priceSnapshotHash"]) {
    if (!SHA256.test(input[key] ?? "")) throw new TypeError(`${key} is invalid`);
  }
  if (!iso(input.completedAt)) throw new TypeError("DeepSeek route receipt timestamp is invalid");
  const confirmed = input.observedEndpoint === "https://api.deepseek.com/chat/completions"
    && input.observedModel === "deepseek-v4-pro" && input.directBillingConfirmed === true
    && typeof input.dataRegion === "string" && input.dataRegion !== "UNKNOWN";
  return sealV5R3Artifact({
    schemaVersion: "DeepSeekDirectRouteProbeReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: input.registrationHash,
    probeAuthorizationHash: input.probeAuthorizationHash,
    credentialReadinessReceiptHash: input.credentialReadinessReceiptHash,
    provider: "DEEPSEEK_DIRECT",
    requestedEndpoint: "https://api.deepseek.com/chat/completions",
    requestedModel: "deepseek-v4-pro",
    containsNaturalQuestionText: false,
    observedEndpoint: input.observedEndpoint ?? null,
    observedModel: input.observedModel ?? null,
    directBillingEvidenceHash: input.directBillingEvidenceHash,
    dataRegionEvidenceHash: input.dataRegionEvidenceHash,
    directBillingConfirmed: input.directBillingConfirmed,
    dataRegion: input.dataRegion,
    providerAttemptReceiptHash: input.providerAttemptReceiptHash,
    priceSnapshotHash: input.priceSnapshotHash,
    probeStatus: confirmed ? "CONFIRMED" : "BLOCKED",
    completedAt: input.completedAt,
  });
}

export const V5_R3_INTEGRITY_PATTERNS = Object.freeze({ SHA256, GIT_COMMIT });
