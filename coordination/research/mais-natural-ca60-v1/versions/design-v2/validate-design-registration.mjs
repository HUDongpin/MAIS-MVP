#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BASELINE_SHA,
  buildDesignRegistration,
  calculateRegistrationHash,
  canonicalJson,
  DECISION_STATUSES,
  DESIGN_ID,
  FORBIDDEN_OVERALL_DECISION_WORDS,
  FREEZE_TIMESTAMP,
  PRESERVATION_ARCHIVE_SHA256,
  PRIOR_NATURAL_DESIGN_SHA256,
  SCHEMA_VERSION,
  TAXONOMY,
  validateDesignStructure,
} from "./design-contract.mjs";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_SCHEMA_TITLES = [
  "FinalEvaluationReceiptV1",
  "IndependentReviewReceiptV1",
  "ItemEvaluationResultV1",
  "MachineReferenceLabelV1",
  "NaturalCaPilotDesignRegistrationV2",
  "ProviderAttemptReceiptV1",
  "ProviderAuthorizationV1",
  "SampleManifestV1",
  "SamplingFrameRowV1",
];
const EPSILON = 1e-12;

function nearlyEqual(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= EPSILON;
}

export function wilsonInterval(n, successes, z) {
  if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(successes) || successes < 0 || successes > n || !Number.isFinite(z) || z <= 0) {
    throw new RangeError("invalid Wilson interval inputs");
  }
  const p = successes / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (p + zSquared / (2 * n)) / denominator;
  const halfWidth = z * Math.sqrt((p * (1 - p)) / n + zSquared / (4 * n * n)) / denominator;
  return { lower: center - halfWidth, upper: center + halfWidth, halfWidth };
}

export function oneSidedAllSuccessLower(n, z) {
  if (!Number.isInteger(n) || n <= 0 || !Number.isFinite(z) || z <= 0) throw new RangeError("invalid all-success Wilson inputs");
  return n / (n + z * z);
}

export function minimumAllSuccessN(target, z) {
  if (!(target > 0 && target < 1)) throw new RangeError("target must be between zero and one");
  let n = 1;
  while (oneSidedAllSuccessLower(n, z) < target) n += 1;
  return n;
}

export function zeroMissRequiredN(targetMissRate, tailProbability = 0.05) {
  if (!(targetMissRate > 0 && targetMissRate < 1) || !(tailProbability > 0 && tailProbability < 1)) throw new RangeError("invalid zero-miss inputs");
  return Math.ceil(Math.log(tailProbability) / Math.log(1 - targetMissRate));
}

export function buildStatisticalPower(registrationHash) {
  const zOne = 1.6448536269514722;
  const zTwo = 1.959963984540054;
  const positiveN = minimumAllSuccessN(0.9, zOne);
  const negativeN = minimumAllSuccessN(0.95, zOne);
  const interval = wilsonInterval(60, 30, zTwo);
  const zeroMissOpportunity = [0.05, 0.02, 0.01].map((targetMissRate) => {
    const requiredN = zeroMissRequiredN(targetMissRate);
    return {
      targetMissRate,
      zeroMissTailProbabilityAtRequiredN: (1 - targetMissRate) ** requiredN,
      requiredN,
      formula: "ceil(log(0.05)/log(1-targetMissRate))",
    };
  });
  return {
    schemaVersion: "NaturalCaStatisticalPowerV1",
    designId: DESIGN_ID,
    designRegistrationHash: registrationHash,
    calculationPolicy: {
      calculatedBy: "validate-design-registration.mjs",
      oneSidedConfidence: 0.95,
      oneSidedWilsonZ: zOne,
      twoSidedConfidence: 0.95,
      twoSidedWilsonZ: zTwo,
      rounding: "Stored IEEE-754 calculation outputs are validated within 1e-12; integer minima are exact.",
    },
    binaryThresholdOpportunity: {
      sensitivityTargetLowerBound: 0.9,
      minimumAllSuccessPositiveN: positiveN,
      positiveNMinusOneLowerBound: oneSidedAllSuccessLower(positiveN - 1, zOne),
      positiveNLowerBound: oneSidedAllSuccessLower(positiveN, zOne),
      specificityTargetLowerBound: 0.95,
      minimumAllSuccessNegativeN: negativeN,
      negativeNMinusOneLowerBound: oneSidedAllSuccessLower(negativeN - 1, zOne),
      negativeNLowerBound: oneSidedAllSuccessLower(negativeN, zOne),
      requiredTotal: positiveN + negativeN,
      availableDistinctClusters: 60,
      structurallyPossibleWithin60: false,
      limitedConclusionAvailable: false,
      derivation: "For x=n, the one-sided Wilson lower bound is n/(n+z^2); 25+52=77>60.",
    },
    ca60WorstCasePrecision: {
      n: 60,
      assumedProportion: 0.5,
      method: "TWO_SIDED_95_PERCENT_WILSON",
      lower: interval.lower,
      upper: interval.upper,
      halfWidth: interval.halfWidth,
    },
    zeroMissOpportunity,
    planningScale: {
      worstCaseNormalApproximationNForFivePercentagePointHalfWidth: (zTwo * zTwo * 0.25) / (0.05 ** 2),
      recommendedIndependentClusters: 400,
      note: "Plan approximately 400 independent homology clusters for worst-case plus or minus 5 percentage-point precision; this is planning guidance, not a CA60 claim.",
    },
    ca60Conclusion: "LIMITED_UNAVAILABLE_INCONCLUSIVE_MACHINE_REFERENCE",
  };
}

export function determineLifecycleStatus({ authorized }) {
  return authorized === true ? "READY_FOR_REGISTERED_EXECUTION" : "AUTHORIZATION_BLOCKED";
}

export function determineDecision({ invalidForGeneralization, executionIntegrityFailed, p0FalseNegatives, minimumEndpoints, maximumErrorEndpoints }) {
  if (invalidForGeneralization === true) return "INVALID_FOR_GENERALIZATION";
  if (executionIntegrityFailed === true) return "EXECUTION_INTEGRITY_FAILED";
  if (!Number.isInteger(p0FalseNegatives) || p0FalseNegatives < 0 || !Array.isArray(minimumEndpoints) || !Array.isArray(maximumErrorEndpoints)) {
    return "INVALID_FOR_GENERALIZATION";
  }
  if (p0FalseNegatives > 0) return "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  const minimumDecisivelyBelow = minimumEndpoints.some((endpoint) => Number.isFinite(endpoint?.threshold) && Number.isFinite(endpoint?.oneSidedUcb95) && endpoint.oneSidedUcb95 < endpoint.threshold);
  const maximumDecisivelyAbove = maximumErrorEndpoints.some((endpoint) => Number.isFinite(endpoint?.threshold) && Number.isFinite(endpoint?.oneSidedLcb95) && endpoint.oneSidedLcb95 > endpoint.threshold);
  if (minimumDecisivelyBelow || maximumDecisivelyAbove) return "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE";
  return "INCONCLUSIVE_MACHINE_REFERENCE";
}

function collectEnums(value, enums = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectEnums(entry, enums);
  } else if (value && typeof value === "object") {
    if (Array.isArray(value.enum)) enums.push(value.enum);
    for (const entry of Object.values(value)) collectEnums(entry, enums);
  }
  return enums;
}

function containsForbiddenDecisionWord(value) {
  if (typeof value !== "string") return false;
  const tokens = value.split(/[^A-Z]+/u);
  return FORBIDDEN_OVERALL_DECISION_WORDS.some((word) => tokens.includes(word));
}

function validateSchemaContracts(schemas, errors) {
  if (schemas.length === 0) return;
  const titles = schemas.map((schema) => schema.title).sort();
  if (canonicalJson(titles) !== canonicalJson(EXPECTED_SCHEMA_TITLES)) errors.push("schema title set mismatch");
  for (const schema of schemas) {
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") errors.push(`${schema.title}: draft mismatch`);
    if (schema.$id !== `https://mais.hk/schemas/research/${schema.title}.schema.json`) errors.push(`${schema.title}: $id mismatch`);
    if (schema.type !== "object" || schema.additionalProperties !== false) errors.push(`${schema.title}: root must be a closed object`);
    if (schema.properties?.schemaVersion?.const !== schema.title) errors.push(`${schema.title}: schemaVersion const mismatch`);
    if (!schema.required?.includes("schemaVersion")) errors.push(`${schema.title}: schemaVersion is not required`);
  }
  const decisionEnums = schemas.flatMap((schema) => collectEnums(schema)).flat();
  for (const value of decisionEnums) {
    if (containsForbiddenDecisionWord(value)) errors.push(`forbidden overall decision word in schema enum: ${value}`);
  }
  const review = schemas.find((schema) => schema.title === "IndependentReviewReceiptV1");
  if (canonicalJson(review?.properties?.reviewStatus?.enum) !== canonicalJson(["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"])) {
    errors.push("independent review status vocabulary mismatch");
  }
}

function validatePower(registration, power, errors) {
  const zOne = 1.6448536269514722;
  const zTwo = 1.959963984540054;
  const positiveN = minimumAllSuccessN(0.9, zOne);
  const negativeN = minimumAllSuccessN(0.95, zOne);
  const interval = wilsonInterval(60, 30, zTwo);
  const expectedP0 = [0.05, 0.02, 0.01].map((targetMissRate) => ({ targetMissRate, requiredN: zeroMissRequiredN(targetMissRate) }));
  if (canonicalJson(power) !== canonicalJson(buildStatisticalPower(registration.registrationHash))) errors.push("power artifact drift from deterministic frozen calculation");
  const checks = [
    [power.designRegistrationHash === registration.registrationHash, "power registration hash binding mismatch"],
    [power.calculationPolicy?.oneSidedWilsonZ === zOne, "one-sided Wilson z mismatch"],
    [power.binaryThresholdOpportunity?.minimumAllSuccessPositiveN === positiveN, "positive minimum n mismatch"],
    [power.binaryThresholdOpportunity?.minimumAllSuccessNegativeN === negativeN, "negative minimum n mismatch"],
    [power.binaryThresholdOpportunity?.requiredTotal === positiveN + negativeN, "required total mismatch"],
    [positiveN + negativeN === 77 && 77 > 60, "77>60 structural proof mismatch"],
    [power.binaryThresholdOpportunity?.structurallyPossibleWithin60 === false, "CA60 structural possibility must be false"],
    [power.binaryThresholdOpportunity?.limitedConclusionAvailable === false, "CA60 LIMITED must be unavailable"],
    [nearlyEqual(power.binaryThresholdOpportunity?.positiveNMinusOneLowerBound, oneSidedAllSuccessLower(positiveN - 1, zOne)), "positive n-1 lower bound mismatch"],
    [nearlyEqual(power.binaryThresholdOpportunity?.positiveNLowerBound, oneSidedAllSuccessLower(positiveN, zOne)), "positive n lower bound mismatch"],
    [nearlyEqual(power.binaryThresholdOpportunity?.negativeNMinusOneLowerBound, oneSidedAllSuccessLower(negativeN - 1, zOne)), "negative n-1 lower bound mismatch"],
    [nearlyEqual(power.binaryThresholdOpportunity?.negativeNLowerBound, oneSidedAllSuccessLower(negativeN, zOne)), "negative n lower bound mismatch"],
    [nearlyEqual(power.ca60WorstCasePrecision?.lower, interval.lower), "CA60 Wilson lower mismatch"],
    [nearlyEqual(power.ca60WorstCasePrecision?.upper, interval.upper), "CA60 Wilson upper mismatch"],
    [nearlyEqual(power.ca60WorstCasePrecision?.halfWidth, interval.halfWidth), "CA60 Wilson half-width mismatch"],
    [power.planningScale?.recommendedIndependentClusters === 400, "planning cluster count mismatch"],
    [power.ca60Conclusion === "LIMITED_UNAVAILABLE_INCONCLUSIVE_MACHINE_REFERENCE", "power conclusion mismatch"],
  ];
  for (const [ok, message] of checks) if (!ok) errors.push(message);
  for (let index = 0; index < expectedP0.length; index += 1) {
    const actual = power.zeroMissOpportunity?.[index];
    const expected = expectedP0[index];
    if (actual?.targetMissRate !== expected.targetMissRate || actual?.requiredN !== expected.requiredN) errors.push(`zero-miss opportunity ${expected.targetMissRate} mismatch`);
    if (!nearlyEqual(actual?.zeroMissTailProbabilityAtRequiredN, (1 - expected.targetMissRate) ** expected.requiredN)) errors.push(`zero-miss tail ${expected.targetMissRate} mismatch`);
  }
}

export async function validateArtifacts({ registration, power, schemas = [], providerEvents = [] }) {
  const errors = [];
  errors.push(...validateDesignStructure(registration));
  if (registration.registrationHash !== calculateRegistrationHash(registration)) errors.push("registrationHash does not match canonical registration content");
  const expected = buildDesignRegistration();
  if (calculateRegistrationHash(expected) !== registration.registrationHash) errors.push("registrationHash does not match the frozen deterministic design builder");
  if (registration.baselineCommitSha !== BASELINE_SHA) errors.push("baseline binding mismatch");
  if (registration.provenance?.preservedPriorNaturalDesignSha256 !== PRIOR_NATURAL_DESIGN_SHA256) errors.push("prior design hash binding mismatch");
  if (registration.provenance?.preservationArchiveSha256 !== PRESERVATION_ARCHIVE_SHA256) errors.push("archive hash binding mismatch");
  if (registration.frozenAt !== FREEZE_TIMESTAMP) errors.push("freeze timestamp drift");
  if (registration.schemaVersion !== SCHEMA_VERSION || registration.designId !== DESIGN_ID) errors.push("design identity mismatch");
  if (canonicalJson(registration.taxonomy?.severityByCode) !== canonicalJson(TAXONOMY)) errors.push("taxonomy severity map mismatch");
  if (canonicalJson(registration.analysis?.decisionStatuses) !== canonicalJson(DECISION_STATUSES)) errors.push("decision status vocabulary mismatch");
  for (const value of registration.analysis?.decisionStatuses ?? []) {
    if (containsForbiddenDecisionWord(value)) errors.push(`forbidden overall decision word: ${value}`);
  }
  validateSchemaContracts(schemas, errors);
  validatePower(registration, power, errors);

  const frozenAtMs = Date.parse(registration.frozenAt);
  if (!Number.isFinite(frozenAtMs)) errors.push("invalid registration freeze timestamp");
  if (providerEvents.length > 0 && registration.providerControls?.firstProviderExecutionAllowed === false) errors.push("provider event exists while firstProviderExecutionAllowed is false");
  for (const event of providerEvents) {
    const eventMs = Date.parse(event.startedAt);
    if (!Number.isFinite(eventMs) || eventMs <= frozenAtMs) errors.push(`provider event ${event.receiptHash ?? "unknown"} does not follow frozen design thresholds`);
    if (event.registrationHash !== registration.registrationHash) errors.push(`provider event ${event.receiptHash ?? "unknown"} registration binding mismatch`);
  }

  return {
    ok: errors.length === 0,
    designId: registration.designId,
    registrationHash: registration.registrationHash,
    schemaCount: schemas.length,
    providerEventCount: providerEvents.length,
    thresholdFreezePrecedesProviderEvents: providerEvents.length === 0 || errors.every((error) => !error.includes("does not follow frozen design thresholds")),
    decisionCeiling: registration.scope?.claimCeiling,
    errors,
  };
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadPackage() {
  const registration = await loadJson(path.join(packageDirectory, "design-registration.json"));
  const power = await loadJson(path.join(packageDirectory, "statistical-power.json"));
  const schemaDirectory = path.join(packageDirectory, "schemas");
  const schemaNames = (await readdir(schemaDirectory)).filter((name) => name.endsWith(".schema.json")).sort();
  const schemas = await Promise.all(schemaNames.map((name) => loadJson(path.join(schemaDirectory, name))));
  const rootJsonNames = (await readdir(packageDirectory)).filter((name) => name.endsWith(".json") && !["design-registration.json", "statistical-power.json"].includes(name));
  const rootJson = await Promise.all(rootJsonNames.map((name) => loadJson(path.join(packageDirectory, name))));
  const providerEvents = rootJson.filter((artifact) => artifact.schemaVersion === "ProviderAttemptReceiptV1");
  return { registration, power, schemas, providerEvents };
}

async function main() {
  const allowed = new Set(["--json"]);
  const unknown = process.argv.slice(2).filter((argument) => !allowed.has(argument));
  if (unknown.length > 0) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  const result = await validateArtifacts(await loadPackage());
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (result.ok) {
    process.stdout.write(`VALID ${result.designId} ${result.registrationHash}; schemas=${result.schemaCount}; providerEvents=${result.providerEventCount}; ceiling=${result.decisionCeiling}\n`);
  } else {
    process.stderr.write(`INVALID ${result.designId}\n${result.errors.map((error) => `- ${error}`).join("\n")}\n`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
