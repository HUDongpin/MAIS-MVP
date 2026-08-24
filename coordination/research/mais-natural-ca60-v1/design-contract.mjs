import { createHash } from "node:crypto";

export const SCHEMA_VERSION = "NaturalCaPilotDesignRegistrationV1";
export const DESIGN_ID = "MAIS-NATURAL-CA60-V1";
export const FREEZE_TIMESTAMP = "2026-08-24T00:00:00.000Z";
export const BASELINE_SHA = "b6c7c347a49a813e454e707dd3c16399dcf29909";
export const PRIOR_NATURAL_DESIGN_SHA256 = "85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867";
export const PRESERVATION_ARCHIVE_SHA256 = "2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71";

export const RESPONSE_FORMS = Object.freeze(["FREE_RESPONSE", "MULTIPLE_CHOICE", "STRUCTURED_RESPONSE"]);
export const DIFFICULTIES = Object.freeze(["EASY", "MEDIUM", "HARD"]);
export const BINARY_LABELS = Object.freeze(["POSITIVE_DEFECT", "NEGATIVE_NO_DEFECT", "UNRESOLVED"]);
export const SEVERITIES = Object.freeze(["NONE", "MINOR", "MAJOR", "CRITICAL", "UNRESOLVED"]);
export const TAXONOMY = Object.freeze({
  CORRECT: "NONE",
  FINAL_ANSWER_ERROR: "CRITICAL",
  MATHEMATICAL_REASONING_ERROR: "MAJOR",
  INCOMPLETE_JUSTIFICATION: "MAJOR",
  INSTRUCTION_NONCOMPLIANCE: "MAJOR",
  AMBIGUOUS_OR_UNSCORABLE: "CRITICAL",
  LANGUAGE_OR_NOTATION_ERROR: "MINOR",
  SAFETY_OR_PRIVACY_ERROR: "CRITICAL",
  MACHINE_REFERENCE_UNRESOLVED: "UNRESOLVED",
});
export const DECISION_STATUSES = Object.freeze([
  "NOT_STARTED",
  "BLOCKED_AUTHORIZATION",
  "INVALID_REGISTRATION",
  "INCONCLUSIVE_UNRESOLVED",
  "INCONCLUSIVE_MACHINE_REFERENCE",
  "LIMITED_MACHINE_REFERENCE",
]);
export const REVIEW_STATUSES = Object.freeze(["CONCURRED", "DISCREPANCY", "UNREVIEWABLE"]);
export const FORBIDDEN_OVERALL_DECISION_WORDS = Object.freeze(["PASS", "APPROVED", "PRODUCTION", "PROMOTION"]);

function assertJsonValue(value, path, stack) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${path} contains unsupported ${typeof value}`);
  if (stack.has(value)) throw new TypeError(`${path} contains a cycle`);
  stack.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new TypeError(`${path} is sparse at index ${index}`);
      assertJsonValue(value[index], `${path}[${index}]`, stack);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} is not a plain object`);
    if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${path} contains symbol keys`);
    for (const key of Object.keys(value)) assertJsonValue(value[key], `${path}.${key}`, stack);
  }
  stack.delete(value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

/** RFC 8785-compatible canonical JSON for the supported JSON value domain. */
export function canonicalJson(value) {
  assertJsonValue(value, "$", new Set());
  return canonicalize(value);
}

export function sha256Hex(value) {
  if (typeof value !== "string" && !Buffer.isBuffer(value)) throw new TypeError("sha256Hex accepts a string or Buffer");
  return createHash("sha256").update(value).digest("hex");
}

export function calculateRegistrationHash(registration) {
  assertJsonValue(registration, "$registration", new Set());
  const { registrationHash: _omitted, ...hashable } = registration;
  return sha256Hex(canonicalJson(hashable));
}

export function buildDesignRegistration() {
  const cells = RESPONSE_FORMS.flatMap((responseForm) => DIFFICULTIES.map((difficulty) => ({ responseForm, difficulty })));
  return {
    schemaVersion: SCHEMA_VERSION,
    designId: DESIGN_ID,
    designKind: "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION",
    version: 1,
    frozenAt: FREEZE_TIMESTAMP,
    baselineCommitSha: BASELINE_SHA,
    provenance: {
      preservedPriorNaturalDesignSha256: PRIOR_NATURAL_DESIGN_SHA256,
      preservationArchiveSha256: PRESERVATION_ARCHIVE_SHA256,
      priorThreeRegionPlanStatus: "SUPERSEDED_NOT_EXECUTED",
    },
    scope: {
      jurisdiction: "CALIFORNIA",
      targetPopulation: "California runtime-visible and provider-egress-eligible mathematics items",
      samplingUnit: "distinct homology cluster",
      targetClusterCount: 60,
      claimBasis: "MACHINE_REFERENCE_ONLY",
      humanGoldClaim: false,
      claimCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      forbiddenClaims: ["PASS", "APPROVED", "PRODUCTION", "PROMOTION"],
    },
    eligibility: {
      inclusion: [
        "Item is visible through the California runtime inventory at frame freeze.",
        "Prompt, response options, stored answer, and required metadata are complete.",
        "Rights and privacy classification permits provider egress after separate authorization.",
        "Item belongs to exactly one frozen response-form by difficulty cell.",
      ],
      exclusion: [
        "Hidden, retired, draft-only, malformed, or non-California item.",
        "Item contains personal data, secrets, restricted source text, or egress-prohibited content.",
        "Item cannot be assigned to one response-form by difficulty cell before sampling.",
        "Item joins a blocked homology component under the frozen clustering rules.",
      ],
    },
    stratification: {
      responseForms: [...RESPONSE_FORMS],
      difficulties: [...DIFFICULTIES],
      cells,
      allocation: {
        method: "HAMILTON_LARGEST_REMAINDER",
        totalClusters: 60,
        minimumPerCell: 2,
        weights: "eligible distinct homology-cluster counts in the frozen frame",
        tieBreak: "ascending responseForm then difficulty code point order",
      },
    },
    homologyClustering: {
      normalization: "UNICODE_NFKC",
      representation: "template skeleton with case-folding, whitespace collapse, numeric literal slots, and option-order normalization",
      similarity: {
        trigramJaccardAtLeast: 0.9,
        normalizedEditSimilarityAtLeast: 0.92,
        edgeRule: "BOTH_THRESHOLDS_REQUIRED",
        componentRule: "UNDIRECTED_CONNECTED_COMPONENT",
      },
      blockers: {
        frameShareStrictlyGreaterThan: 0.05,
        topicBridgeCountStrictlyGreaterThan: 2,
        disposition: "BLOCK_COMPONENT_AND_FREEZE_FRAME_FOR_REVIEW",
      },
    },
    deterministicSelection: {
      hashAlgorithm: "SHA-256",
      formula: "SHA256(registrationHash + '\\n' + samplingFrameHash + '\\n' + clusterId)",
      ordering: "ascending lowercase hexadecimal digest; clusterId ascending breaks an impossible digest tie",
      withinClusterRepresentative: "lowest SHA256(itemId + '\\n' + normalizedPrompt) digest among eligible members",
      resultBlind: true,
      rerollAfterAnyLabelOrResult: false,
      replacementAfterAnyLabelOrResult: false,
    },
    machineReferenceWorkflow: {
      referenceProvider: { provider: "QWEN", model: "qwen3.8-max", role: "MACHINE_REFERENCE" },
      evaluatedProvider: { provider: "DEEPSEEK", model: "deepseek-v4-pro", role: "EVALUATED_PROVIDER" },
      separation: "Reference label is frozen before the evaluated-provider response is revealed to the labeler.",
      humanGold: false,
      independentReviewRequiredForInterpretation: true,
    },
    taxonomy: {
      codes: Object.keys(TAXONOMY),
      severityByCode: { ...TAXONOMY },
      binaryLabels: [...BINARY_LABELS],
      severities: [...SEVERITIES],
      positiveCodes: Object.entries(TAXONOMY).filter(([, severity]) => ["MAJOR", "CRITICAL"].includes(severity)).map(([code]) => code),
      negativeCodes: ["CORRECT", "LANGUAGE_OR_NOTATION_ERROR"],
      unresolvedCodes: ["MACHINE_REFERENCE_UNRESOLVED"],
    },
    labeling: {
      rawLabelImmutable: true,
      finalLabelSeparateFromRaw: true,
      allowedLabelers: ["A18_CURRICULUM_QA", "INDEPENDENT_REVIEWER"],
      adjudication: "Two documented labels that disagree require an independent adjudicator who has not seen provider identity.",
      unresolvedRule: "Missing evidence, reference ambiguity, or unresolved disagreement is UNRESOLVED and excluded from binary denominators but reported in full.",
      noSilentRelabeling: true,
    },
    analysis: {
      estimands: ["SENSITIVITY", "SPECIFICITY", "BALANCED_ACCURACY", "UNRESOLVED_RATE", "TAXONOMY_AGREEMENT"],
      matching: "One-to-one by designId + sampleManifestHash + clusterId + itemId; duplicates or missing counterparts invalidate the matched row.",
      confidenceIntervals: {
        sensitivity: "ONE_SIDED_95_PERCENT_WILSON_LOWER",
        specificity: "ONE_SIDED_95_PERCENT_WILSON_LOWER",
        proportionsExploratory: "TWO_SIDED_95_PERCENT_WILSON",
        zOneSided95: 1.6448536269514722,
        zTwoSided95: 1.959963984540054,
      },
      thresholds: {
        sensitivityLowerBoundAtLeast: 0.9,
        specificityLowerBoundAtLeast: 0.95,
        minimumResolvedPositiveClusters: 25,
        minimumResolvedNegativeClusters: 52,
        maximumUnresolvedRate: 0,
      },
      decisionPriority: [
        "INVALID_REGISTRATION",
        "BLOCKED_AUTHORIZATION",
        "INCONCLUSIVE_UNRESOLVED",
        "INCONCLUSIVE_MACHINE_REFERENCE",
        "LIMITED_MACHINE_REFERENCE",
      ],
      decisionStatuses: [...DECISION_STATUSES],
      ca60DecisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    },
    providerControls: {
      firstProviderExecutionAllowed: false,
      requiredAuthorizationSchema: "ProviderAuthorizationV1",
      allowedOrigins: ["FROZEN_RUNTIME_VISIBLE_CA_FRAME"],
      egress: {
        jurisdiction: "CALIFORNIA_ELIGIBLE_ONLY",
        personalDataAllowed: false,
        secretsAllowed: false,
        copyrightedLongFormSourceAllowed: false,
        exactPayloadHashRequired: true,
      },
      budgetEnvelope: {
        maximumReferenceAttempts: 60,
        maximumEvaluatedAttempts: 60,
        maximumTotalAttempts: 120,
        maximumInputTokensPerAttempt: 8000,
        maximumOutputTokensPerAttempt: 4000,
        maximumEstimatedUsd: 50,
        hardStopOnCap: true,
      },
    },
    artifactKinds: {
      thisArtifact: "DESIGN_REGISTRATION",
      futureDistinctArtifacts: ["SAMPLING_FRAME", "SAMPLE_MANIFEST", "PROVIDER_AUTHORIZATION", "PROVIDER_EXECUTION_RECEIPTS", "FINAL_EVALUATION", "INDEPENDENT_REVIEW"],
    },
    freezeChain: [
      "DESIGN_REGISTRATION",
      "SAMPLING_FRAME",
      "SAMPLE_MANIFEST",
      "PROVIDER_AUTHORIZATION",
      "MACHINE_REFERENCE_LABELS",
      "PROVIDER_ATTEMPT_RECEIPTS",
      "ITEM_EVALUATION_RESULTS",
      "FINAL_EVALUATION_RECEIPT",
      "INDEPENDENT_REVIEW_RECEIPT",
    ],
  };
}

export function validateDesignStructure(registration) {
  const errors = [];
  if (registration.schemaVersion !== SCHEMA_VERSION) errors.push("schemaVersion mismatch");
  if (registration.designId !== DESIGN_ID) errors.push("designId mismatch");
  if (registration.frozenAt !== FREEZE_TIMESTAMP) errors.push("freeze timestamp mismatch");
  if (registration.baselineCommitSha !== BASELINE_SHA) errors.push("baseline SHA mismatch");
  if (registration.scope?.targetClusterCount !== 60) errors.push("target cluster count must be 60");
  if (registration.scope?.claimCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") errors.push("claim ceiling mismatch");
  if (registration.providerControls?.firstProviderExecutionAllowed !== false) errors.push("provider execution must remain disabled");
  if (registration.stratification?.cells?.length !== 9) errors.push("exactly nine strata required");
  if (registration.freezeChain?.[0] !== "DESIGN_REGISTRATION") errors.push("design registration must lead freeze chain");
  const decisionText = (registration.analysis?.decisionStatuses ?? []).join(" ");
  for (const word of FORBIDDEN_OVERALL_DECISION_WORDS) {
    if (new RegExp(`(^|_)${word}(_|$)`, "u").test(decisionText)) errors.push(`forbidden decision word ${word}`);
  }
  return errors;
}
