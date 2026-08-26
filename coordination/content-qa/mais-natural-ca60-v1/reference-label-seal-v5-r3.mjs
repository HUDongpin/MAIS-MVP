import {
  buildOpenAIAdjudicationTriggerReceiptV1,
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSampleExecutionInventoryV1,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";

const BASE_ROLES = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]);
const ROLE_ORDER = Object.freeze([...BASE_ROLES, "ADJUDICATOR"]);
const SEVERITIES = new Set(["NONE", "P2", "P1", "P0", "UNRESOLVED"]);
const LABELS = new Set(["DEFECT", "NO_FINDING", "UNRESOLVED_REFERENCE"]);

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function round(value) {
  return Number(value.toFixed(12));
}

function exactKeys(value, expected) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && canonicalJsonV5R3(Object.keys(value).sort()) === canonicalJsonV5R3([...expected].sort());
}

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function validateRawPayload(payload) {
  requireCondition(payload !== null && typeof payload === "object" && !Array.isArray(payload), "raw reference label payload is invalid");
  requireCondition(LABELS.has(payload.rawLabel), "raw reference label status is invalid");
  requireCondition(SEVERITIES.has(payload.rawSeverity), "raw reference label severity is invalid");
  requireCondition(Array.isArray(payload.rawTaxonomyCodes) && payload.rawTaxonomyCodes.length > 0
    && new Set(payload.rawTaxonomyCodes).size === payload.rawTaxonomyCodes.length, "raw reference taxonomy codes are invalid");
  requireCondition(payload.rawFindingFamilies !== null && typeof payload.rawFindingFamilies === "object" && !Array.isArray(payload.rawFindingFamilies), "raw finding families are invalid");
  requireCondition(Array.isArray(payload.rawFindings) && typeof payload.rawUncertain === "boolean", "raw findings or uncertainty are invalid");
}

export function buildRawMachineReferenceLabelV1(roleOutput) {
  requireCondition(validateSelfHashV5R3(roleOutput), "reference label role output self-hash is invalid");
  requireCondition(roleOutput.schemaVersion === "OpenAIReferenceRoleOutputV5R3"
    && roleOutput.provider === "OPENAI_DIRECT" && ["A_LABEL", "B_LABEL"].includes(roleOutput.role), "reference label role output tuple is invalid");
  validateRawPayload(roleOutput.parsedPayload);
  requireCondition(roleOutput.parsedPayloadHash === sha256V5R3(canonicalJsonV5R3(roleOutput.parsedPayload)), "reference label parsed payload hash is invalid");
  return sealV5R3Artifact({
    schemaVersion: "RawMachineReferenceLabelV1",
    labelSourceType: "machine_reference_panel",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    panelRole: roleOutput.role,
    roleOutputHash: roleOutput.selfHash,
    attemptReceiptHash: roleOutput.attemptReceiptHash,
    itemHash: roleOutput.itemHash,
    itemIdPseudonym: roleOutput.itemIdPseudonym,
    clusterId: roleOutput.clusterId,
    label: roleOutput.parsedPayload.rawLabel,
    codes: structuredClone(roleOutput.parsedPayload.rawTaxonomyCodes),
    severity: roleOutput.parsedPayload.rawSeverity,
    findingFamilies: structuredClone(roleOutput.parsedPayload.rawFindingFamilies),
    findings: structuredClone(roleOutput.parsedPayload.rawFindings),
    uncertain: roleOutput.parsedPayload.rawUncertain,
  });
}

function validateLedger({ ledgerEntries, authorization, inventory }) {
  requireCondition(Array.isArray(ledgerEntries) && ledgerEntries.length > 0 && ledgerEntries.length % 2 === 0, "reference execution ledger must contain complete reservation/completion pairs");
  const reservations = new Map();
  const attemptIds = new Set();
  const successfulReceipts = new Map();
  const attemptReceipts = [];
  let previous = null;
  for (const [index, entry] of ledgerEntries.entries()) {
    requireCondition(validateSelfHashV5R3(entry), `reference ledger entry ${index + 1} self-hash is invalid`);
    requireCondition(entry.sequenceNumber === index + 1 && entry.previousEntryHash === previous, `reference ledger entry ${index + 1} chain is invalid`);
    requireCondition(entry.authorizationHash === authorization.selfHash, `reference ledger entry ${index + 1} authorization binding is invalid`);
    previous = entry.selfHash;
    if (entry.entryType === "DISPATCH_RESERVED") {
      requireCondition(entry.schemaVersion === "ProviderDispatchReservationV1", "reference reservation schema is invalid");
      requireCondition(!reservations.has(entry.selfHash) && !attemptIds.has(entry.attemptId), "reference reservation or attempt ID is duplicated");
      requireCondition(inventory.items.some((item) => item.itemHash === entry.itemHash && item.itemIdPseudonym === entry.itemIdPseudonym
        && item.clusterId === entry.clusterId), "reference reservation is outside the sample inventory");
      requireCondition(entry.sampleExecutionInventoryHash === inventory.selfHash, "reference reservation inventory binding is invalid");
      reservations.set(entry.selfHash, { reservation: entry, completed: false });
      attemptIds.add(entry.attemptId);
    } else if (entry.entryType === "DISPATCH_COMPLETED") {
      requireCondition(entry.schemaVersion === "ProviderDispatchCompletionV1", "reference completion schema is invalid");
      const state = reservations.get(entry.reservationHash);
      requireCondition(state && !state.completed, "reference completion has no unique prior reservation");
      const receipt = entry.providerEventReceipt;
      requireCondition(validateSelfHashV5R3(receipt) && entry.providerEventReceiptHash === receipt.selfHash, "reference provider event receipt hash is invalid");
      requireCondition(receipt.schemaVersion === "ProviderEventReceiptV3" && receipt.reservationHash === state.reservation.selfHash
        && receipt.authorizationHash === authorization.selfHash && receipt.attemptId === state.reservation.attemptId
        && receipt.role === state.reservation.role && receipt.itemHash === state.reservation.itemHash
        && receipt.itemIdPseudonym === state.reservation.itemIdPseudonym && receipt.clusterId === state.reservation.clusterId
        && receipt.sampleExecutionInventoryHash === inventory.selfHash, "reference provider event receipt lineage is invalid");
      requireCondition(receipt.provider === "OPENAI_DIRECT" && receipt.requestedModel === "gpt-5.6-luna"
        && receipt.requestedEndpoint === "https://us.api.openai.com/v1/responses", "reference provider event tuple is invalid");
      requireCondition(entry.attemptStatus === receipt.attemptStatus, "reference completion status differs from provider receipt");
      state.completed = true;
      attemptReceipts.push(receipt);
      if (receipt.attemptStatus === "SUCCEEDED") successfulReceipts.set(receipt.selfHash, receipt);
    } else {
      throw new TypeError("reference ledger entry type is invalid");
    }
  }
  requireCondition([...reservations.values()].every(({ completed }) => completed), "reference ledger contains an incomplete reservation");
  requireCondition(reservations.size <= authorization.maximumAttempts, "reference attempt cap is exceeded");
  return Object.freeze({
    attemptReceipts,
    successfulReceipts,
    terminalEntryHash: ledgerEntries.at(-1).selfHash,
    attemptChainHash: sha256V5R3(canonicalJsonV5R3(ledgerEntries.map(({ selfHash }) => selfHash))),
  });
}

function validateRoleOutput({ output, expectedRole, item, successfulReceipts, inventory }) {
  requireCondition(validateSelfHashV5R3(output), `${expectedRole} role output self-hash is invalid`);
  requireCondition(output.schemaVersion === "OpenAIReferenceRoleOutputV5R3" && output.provider === "OPENAI_DIRECT"
    && output.role === expectedRole, `${expectedRole} role output tuple is invalid`);
  requireCondition(output.itemHash === item.itemHash && output.itemIdPseudonym === item.itemIdPseudonym
    && output.clusterId === item.clusterId, `${expectedRole} role output crosses the item boundary`);
  requireCondition(output.parsedPayloadHash === sha256V5R3(canonicalJsonV5R3(output.parsedPayload)), `${expectedRole} parsed payload hash is invalid`);
  const attempt = successfulReceipts.get(output.attemptReceiptHash);
  requireCondition(attempt?.attemptId === output.attemptId && attempt?.role === expectedRole
    && attempt?.itemHash === item.itemHash && attempt?.sampleExecutionInventoryHash === inventory.selfHash, `${expectedRole} successful attempt lineage is invalid`);
  return output;
}

function adjudicatedPayload(payload) {
  requireCondition(payload !== null && typeof payload === "object" && !Array.isArray(payload), "adjudicator payload is invalid");
  requireCondition(LABELS.has(payload.finalLabel) && SEVERITIES.has(payload.finalSeverity), "adjudicator final label or severity is invalid");
  requireCondition(Array.isArray(payload.finalTaxonomyCodes) && payload.finalTaxonomyCodes.length > 0
    && new Set(payload.finalTaxonomyCodes).size === payload.finalTaxonomyCodes.length, "adjudicator taxonomy codes are invalid");
  requireCondition(payload.finalFindingFamilies !== null && typeof payload.finalFindingFamilies === "object" && !Array.isArray(payload.finalFindingFamilies)
    && Array.isArray(payload.finalFindings) && Array.isArray(payload.adjudicationReasonCodes), "adjudicator findings are invalid");
  return {
    label: payload.finalLabel,
    taxonomyCodes: structuredClone(payload.finalTaxonomyCodes),
    severity: payload.finalSeverity,
    findingFamilies: structuredClone(payload.finalFindingFamilies),
    findings: structuredClone(payload.finalFindings),
  };
}

function mergedPayload(rawLabel) {
  return {
    label: rawLabel.label,
    taxonomyCodes: structuredClone(rawLabel.codes),
    severity: rawLabel.severity,
    findingFamilies: structuredClone(rawLabel.findingFamilies),
    findings: structuredClone(rawLabel.findings),
  };
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((value) => b.has(value)).length / union.size;
}

function categoricalAgreement(pairs) {
  const categories = [...new Set(pairs.flat())].sort();
  const observed = pairs.filter(([left, right]) => left === right).length / pairs.length;
  const leftRates = new Map(categories.map((category) => [category, pairs.filter(([left]) => left === category).length / pairs.length]));
  const rightRates = new Map(categories.map((category) => [category, pairs.filter(([, right]) => right === category).length / pairs.length]));
  const expectedKappa = categories.reduce((total, category) => total + leftRates.get(category) * rightRates.get(category), 0);
  const kappa = expectedKappa === 1 ? 1 : (observed - expectedKappa) / (1 - expectedKappa);
  const averageRates = categories.map((category) => (leftRates.get(category) + rightRates.get(category)) / 2);
  const expectedAc1 = categories.length <= 1 ? 0 : averageRates.reduce((total, rate) => total + rate * (1 - rate), 0) / (categories.length - 1);
  const ac1 = expectedAc1 === 1 ? 1 : (observed - expectedAc1) / (1 - expectedAc1);
  return { observed: round(observed), cohenKappa: round(kappa), gwetAc1: round(ac1) };
}

function agreementStatistics(rawPairs, triggerCount) {
  const categorical = categoricalAgreement(rawPairs.map(({ a, b }) => [a.label, b.label]));
  const severityAgreement = rawPairs.filter(({ a, b }) => a.severity === b.severity).length / rawPairs.length;
  const exactAgreement = rawPairs.filter(({ a, b }) => canonicalJsonV5R3({ label: a.label, codes: a.codes, severity: a.severity, findingFamilies: a.findingFamilies, findings: a.findings, uncertain: a.uncertain })
    === canonicalJsonV5R3({ label: b.label, codes: b.codes, severity: b.severity, findingFamilies: b.findingFamilies, findings: b.findings, uncertain: b.uncertain })).length / rawPairs.length;
  const codeJaccard = rawPairs.reduce((total, { a, b }) => total + jaccard(a.codes, b.codes), 0) / rawPairs.length;
  const familyJaccard = rawPairs.reduce((total, { a, b }) => total + jaccard(Object.values(a.findingFamilies).filter(Boolean), Object.values(b.findingFamilies).filter(Boolean)), 0) / rawPairs.length;
  return Object.freeze({
    rawExactAgreement: round(exactAgreement),
    severityAgreement: round(severityAgreement),
    codeJaccard: round(codeJaccard),
    familyJaccard: round(familyJaccard),
    cohenKappa: categorical.cohenKappa,
    gwetAc1: categorical.gwetAc1,
    adjudicationRate: round(triggerCount / rawPairs.length),
  });
}

export function buildMachineReferenceSealV2(input) {
  const { registration, authorization, inventory, ledgerEntries, itemBundles, sealedAt } = input;
  requireCondition(validateSelfHashV5R3(registration) && registration.schemaVersion === "NaturalCaExecutionRunnerRegistrationV2", "reference seal runner registration is invalid");
  requireCondition(validateSelfHashV5R3(authorization) && authorization.schemaVersion === "ProviderAuthorizationV3"
    && authorization.runnerRegistrationHash === registration.selfHash && authorization.provider === "OPENAI_DIRECT"
    && authorization.model === "gpt-5.6-luna" && authorization.endpoint === "https://us.api.openai.com/v1/responses", "reference seal authorization is invalid");
  requireCondition(authorization.sampleExecutionInventoryHash === inventory?.selfHash, "reference seal authorization inventory binding is invalid");
  const inventoryErrors = validateSampleExecutionInventoryV1({ registration, inventory });
  requireCondition(inventoryErrors.length === 0, `reference seal sample inventory is invalid: ${inventoryErrors.join("; ")}`);
  requireCondition(typeof sealedAt === "string" && Number.isFinite(Date.parse(sealedAt)), "reference seal timestamp is invalid");
  requireCondition(Array.isArray(itemBundles) && itemBundles.length === 60, "reference seal requires exactly 60 item bundles");
  const ledger = validateLedger({ ledgerEntries, authorization, inventory });
  const bundleByHash = new Map(itemBundles.map((bundle) => [bundle?.item?.itemHash, bundle]));
  requireCondition(bundleByHash.size === 60, "reference seal item bundles contain duplicate hashes");
  const summaries = [];
  const finalLabels = [];
  const rawPairs = [];
  const referencedSuccessfulReceipts = new Set();
  let adjudicationCount = 0;
  for (const item of inventory.items) {
    const bundle = bundleByHash.get(item.itemHash);
    requireCondition(bundle?.item?.itemIdPseudonym === item.itemIdPseudonym && bundle?.item?.clusterId === item.clusterId, "reference seal item bundle inventory identity is invalid");
    const triggerRequired = bundle?.adjudicationTrigger?.adjudicationRequired === true;
    const expectedRoles = triggerRequired ? ROLE_ORDER : BASE_ROLES;
    requireCondition(exactKeys(bundle?.roleOutputs, expectedRoles), `reference item ${item.itemIdPseudonym} role output set is invalid`);
    const outputs = {};
    for (const role of expectedRoles) {
      outputs[role] = validateRoleOutput({ output: bundle.roleOutputs[role], expectedRole: role, item, successfulReceipts: ledger.successfulReceipts, inventory });
      referencedSuccessfulReceipts.add(outputs[role].attemptReceiptHash);
    }
    const rawA = buildRawMachineReferenceLabelV1(outputs.A_LABEL);
    const rawB = buildRawMachineReferenceLabelV1(outputs.B_LABEL);
    rawPairs.push({ a: rawA, b: rawB });
    requireCondition(validateSelfHashV5R3(bundle.adjudicationTrigger), "reference adjudication trigger self-hash is invalid");
    const recomputedTrigger = buildOpenAIAdjudicationTriggerReceiptV1({
      item: { itemHash: item.itemHash, itemIdPseudonym: item.itemIdPseudonym },
      labelA: rawA,
      labelB: rawB,
      triggerEngineHash: bundle.adjudicationTrigger.triggerEngineHash,
    });
    requireCondition(recomputedTrigger.selfHash === bundle.adjudicationTrigger.selfHash, "reference adjudication trigger does not recompute from A/B labels");
    let resolved;
    let resolutionMethod;
    if (triggerRequired) {
      adjudicationCount += 1;
      resolved = adjudicatedPayload(outputs.ADJUDICATOR.parsedPayload);
      resolutionMethod = "OPENAI_ADJUDICATION";
    } else {
      requireCondition(canonicalJsonV5R3(rawA) !== canonicalJsonV5R3(rawB) || rawA.selfHash !== rawB.selfHash, "raw label role artifacts unexpectedly collapse to one artifact");
      requireCondition(canonicalJsonV5R3({ label: rawA.label, codes: rawA.codes, severity: rawA.severity, findingFamilies: rawA.findingFamilies, findings: rawA.findings, uncertain: rawA.uncertain })
        === canonicalJsonV5R3({ label: rawB.label, codes: rawB.codes, severity: rawB.severity, findingFamilies: rawB.findingFamilies, findings: rawB.findings, uncertain: rawB.uncertain }), "non-adjudicated A/B labels do not exactly agree");
      resolved = mergedPayload(rawA);
      resolutionMethod = "DETERMINISTIC_EXACT_AGREEMENT_MERGER";
    }
    const finalLabel = sealV5R3Artifact({
      schemaVersion: "MachineReferenceLabelV1",
      labelSourceType: "machine_reference_panel",
      humanGold: false,
      sameModelCorrelatedErrorRisk: true,
      provider: "OPENAI_DIRECT",
      model: "gpt-5.6-luna",
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      resolutionMethod,
      sourceRoleOutputHashes: expectedRoles.map((role) => outputs[role].selfHash),
      adjudicationTriggerHash: bundle.adjudicationTrigger.selfHash,
      ...resolved,
      unresolved: resolved.label === "UNRESOLVED_REFERENCE" || resolved.severity === "UNRESOLVED"
        || resolved.taxonomyCodes.some((code) => ["SCHEMA_GAP", "UNASSESSABLE"].includes(code)),
    });
    finalLabels.push(finalLabel);
    summaries.push(Object.freeze({
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      roleOutputHashes: Object.fromEntries(expectedRoles.map((role) => [role, outputs[role].selfHash])),
      adjudicationTriggerHash: bundle.adjudicationTrigger.selfHash,
      finalLabelHash: finalLabel.selfHash,
    }));
  }
  requireCondition(referencedSuccessfulReceipts.size === ledger.successfulReceipts.size, "reference ledger contains an unconsumed or multiply consumed successful role attempt");
  const successfulCount = ledger.successfulReceipts.size;
  requireCondition(successfulCount === 240 + adjudicationCount, "reference successful-call accounting is invalid");
  const unresolvedCount = finalLabels.filter(({ unresolved }) => unresolved).length;
  const sortedSummaries = [...summaries].sort((left, right) => codePointCompare(left.itemHash, right.itemHash));
  const sortedFinalLabels = [...finalLabels].sort((left, right) => codePointCompare(left.itemHash, right.itemHash));
  return sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    openAIReferenceAuthorizationHash: authorization.selfHash,
    sampleManifestHash: registration.sampleManifestHash,
    samplePayloadSetHash: registration.samplePayloadSetHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash,
    taxonomyHash: registration.taxonomyHash,
    labelingAndAdjudicationHash: registration.labelingAndAdjudicationHash,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    itemCount: 60,
    baseSuccessfulCallCount: 240,
    adjudicationSuccessfulCallCount: adjudicationCount,
    totalSuccessfulCallCount: successfulCount,
    totalAttemptCount: ledger.attemptReceipts.length,
    retryAttemptCount: ledger.attemptReceipts.length - successfulCount,
    providerEventCountAtSeal: ledger.attemptReceipts.length,
    executionLedgerTerminalHash: ledger.terminalEntryHash,
    attemptChainHash: ledger.attemptChainHash,
    itemSummaries: sortedSummaries,
    itemSealRoot: sha256V5R3(canonicalJsonV5R3(sortedSummaries)),
    finalLabels: sortedFinalLabels,
    finalLabelRoot: sha256V5R3(canonicalJsonV5R3(sortedFinalLabels.map(({ selfHash }) => selfHash))),
    unresolvedCount,
    unresolvedWithinExecutionCap: unresolvedCount <= 3,
    agreementStatistics: agreementStatistics(rawPairs, adjudicationCount),
    sealedAt,
  });
}

export function validateMachineReferenceSealV2(input) {
  const errors = [];
  if (input.seal?.schemaVersion !== "MachineReferenceSealV2" || !validateSelfHashV5R3(input.seal)) errors.push("machine reference seal self-hash or schema is invalid");
  try {
    const rebuilt = buildMachineReferenceSealV2({ ...input, sealedAt: input.seal?.sealedAt });
    if (rebuilt.selfHash !== input.seal?.selfHash) errors.push("machine reference seal does not exactly rebuild from raw lineage");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "machine reference seal rebuild failed");
  }
  return Object.freeze([...new Set(errors)]);
}

export const REFERENCE_LABEL_SEAL_V5_R3_CONSTANTS = Object.freeze({ baseRoles: BASE_ROLES, roleOrder: ROLE_ORDER });
