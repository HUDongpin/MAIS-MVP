import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  resolveSuccessfulRoleOutputV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  buildMachineReferenceSealV5R4,
  buildRawMachineReferenceLabelV5R4,
} from "./reference-label-seal-v5-r4.mjs";
import {
  computeReferenceAgreementV5R5,
} from "./reference-agreement-v5-r5.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function round(value) { return Number(value.toFixed(12)); }
function comparable(raw) {
  return { label: raw.label, codes: raw.codes, severity: raw.severity,
    findingFamilies: raw.findingFamilies, findings: raw.findings, uncertain: raw.uncertain };
}
function jaccard(left, right) {
  const a = new Set(left); const b = new Set(right); const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : [...a].filter((value) => b.has(value)).length / union.size;
}

function correctedAgreement({ inventory, authorization, ledgerEntries, adjudicationCount }) {
  const pairs = inventory.items.map((item) => {
    const outputA = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role: "A_LABEL" }).output;
    const outputB = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role: "B_LABEL" }).output;
    return { a: buildRawMachineReferenceLabelV5R4(outputA), b: buildRawMachineReferenceLabelV5R4(outputB) };
  });
  const categorical = computeReferenceAgreementV5R5(pairs.map(({ a, b }) => ({ a: a.label, b: b.label })));
  return Object.freeze({
    pairCount: pairs.length,
    categoryCount: categorical.categoryCount,
    rawExactAgreement: round(pairs.filter(({ a, b }) => canonicalJsonV5R3(comparable(a)) === canonicalJsonV5R3(comparable(b))).length / pairs.length),
    severityAgreement: round(pairs.filter(({ a, b }) => a.severity === b.severity).length / pairs.length),
    codeJaccard: round(pairs.reduce((sum, { a, b }) => sum + jaccard(a.codes, b.codes), 0) / pairs.length),
    familyJaccard: round(pairs.reduce((sum, { a, b }) => sum + jaccard(Object.values(a.findingFamilies).filter(Boolean), Object.values(b.findingFamilies).filter(Boolean)), 0) / pairs.length),
    cohenKappa: categorical.cohenKappa,
    gwetAc1: categorical.gwetAc1,
    degenerateKappaDisposition: categorical.degenerateKappaDisposition,
    adjudicationRate: round(adjudicationCount / pairs.length),
  });
}

export function buildMachineReferenceSealV5R5(input) {
  requireCondition(validateSelfHashV5R3(input?.activeRegistration)
    && input.activeRegistration.runnerVersion === "V5-R5", "active V5-R5 runner registration is invalid");
  const compatibilitySeal = buildMachineReferenceSealV5R4({
    registration: input.registration,
    authorization: input.authorization,
    inventory: input.inventory,
    ledgerEntries: input.ledgerEntries,
    sealedAt: input.sealedAt,
  });
  const agreementStatistics = correctedAgreement({
    inventory: input.inventory,
    authorization: input.authorization,
    ledgerEntries: input.ledgerEntries,
    adjudicationCount: compatibilitySeal.adjudicationSuccessfulCallCount,
  });
  const body = Object.fromEntries(Object.entries(compatibilitySeal)
    .filter(([key]) => !["schemaVersion", "selfHash", "agreementStatistics"].includes(key)));
  const seal = sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV4",
    ...body,
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    compatibilityBaseSealHash: compatibilitySeal.selfHash,
    agreementMethod: "R5_DEGENERATE_COHEN_KAPPA_REPORTED_AS_NULL",
    agreementStatistics,
  });
  assertClosedSelfHashedArtifactV5R5(seal, "MachineReferenceSealV4");
  return seal;
}

export function validateMachineReferenceSealV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.seal, "MachineReferenceSealV4")];
  if (!validateSelfHashV5R3(input?.seal) || input?.seal?.schemaVersion !== "MachineReferenceSealV4") {
    errors.push("R5 machine reference seal is not a self-hashed V4 artifact");
  }
  try {
    const rebuilt = buildMachineReferenceSealV5R5({ ...input, sealedAt: input.seal?.sealedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.seal)) errors.push("R5 machine reference seal differs from exact raw-ledger reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}
