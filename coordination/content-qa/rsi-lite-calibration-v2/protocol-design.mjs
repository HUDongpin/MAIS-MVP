import { createHash } from "node:crypto";

export const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V2";
export const PROTOCOL_VERSION = "2.0.0-candidate";
export const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
export const ARMS = Object.freeze(["A_PRIME", "B_PRIME", "C0_PRIME"]);
export const REGIONS = Object.freeze(["CA", "HK", "MAINLAND"]);
export const VARIANTS = Object.freeze(["V1", "V2", "V3"]);

export const ROLE_CALLS_PER_RUN = Object.freeze({
  A_PRIME: 0,
  B_PRIME: 2,
  C0_PRIME: 5
});

const STRATA = Object.freeze([
  "L1-number-operations",
  "L2-fraction-operations",
  "L3-rectangle-area",
  "L4-linear-function-evaluation"
]);

const ROLE_PLANS = Object.freeze({
  A_PRIME: Object.freeze([
    Object.freeze({ role: "deterministic-baseline", providerCall: false })
  ]),
  B_PRIME: Object.freeze([
    Object.freeze({ role: "deterministic-baseline", providerCall: false }),
    Object.freeze({ role: "same-reviewer-critique", providerCall: true }),
    Object.freeze({ role: "same-reviewer-revision", providerCall: true })
  ]),
  C0_PRIME: Object.freeze([
    Object.freeze({ role: "answer-blind-solver", providerCall: true }),
    Object.freeze({ role: "tool-verifier", providerCall: true }),
    Object.freeze({ role: "adversarial-grader", providerCall: true }),
    Object.freeze({ role: "bilingual-curriculum-critic", providerCall: true }),
    Object.freeze({ role: "evidence-verifier", providerCall: true })
  ])
});

export const STOCHASTIC_REQUEST_PARAMETERS = Object.freeze({
  provider: "DeepSeek",
  model: "deepseek-v4-pro",
  temperature: 0,
  topP: 1,
  maxOutputTokens: 24_000,
  stream: false,
  requestedSeed: null,
  seedSupport: "not-assumed"
});

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableStringify(value))
    .digest("hex");
}

function seededRank(seed, label) {
  return sha256(`${seed}|${label}`);
}

function deterministicShuffle(values, seed, label) {
  return [...values].sort((left, right) => {
    const leftRank = seededRank(seed, `${label}|${stableStringify(left)}`);
    const rightRank = seededRank(seed, `${label}|${stableStringify(right)}`);
    return leftRank.localeCompare(rightRank);
  });
}

function packageId(seed, bundleId, variantId) {
  return `pkgv2-${sha256(`${seed}|${bundleId}|${variantId}`).slice(0, 20)}`;
}

function buildLatentBundles(seed) {
  const rows = [];
  for (const region of REGIONS) {
    const slots = STRATA.flatMap((stratumId) => [1, 2].map((replicate) => ({ stratumId, replicate })));
    const randomizedSlots = deterministicShuffle(slots, seed, `${region}|bundle-order`);
    const cleanIds = new Set(randomizedSlots.slice(0, 2).map((row) => `${row.stratumId}|${row.replicate}`));
    randomizedSlots.forEach((slot, index) => {
      const slotKey = `${slot.stratumId}|${slot.replicate}`;
      rows.push({
        id: `${region}-B${String(index + 1).padStart(2, "0")}`,
        region,
        stratumId: slot.stratumId,
        replicate: slot.replicate,
        status: cleanIds.has(slotKey) ? "clean" : "defect-bearing",
        defectBlock: cleanIds.has(slotKey) ? null : `D${(index % 3) + 1}`,
        matchedVersionCount: 3
      });
    });
  }
  return rows;
}

function buildPackageAssignments(seed, latentBundles) {
  const rows = [];
  for (const region of REGIONS) {
    const bundles = deterministicShuffle(
      latentBundles.filter((row) => row.region === region),
      seed,
      `${region}|assignment-row-order`
    );
    const armOrder = deterministicShuffle(ARMS, seed, `${region}|arm-order`);
    const variantOrder = deterministicShuffle(VARIANTS, seed, `${region}|variant-order`);
    bundles.forEach((bundle, rowIndex) => {
      armOrder.forEach((arm, armIndex) => {
        const variantId = variantOrder[(rowIndex + armIndex) % VARIANTS.length];
        rows.push({
          packageId: packageId(seed, bundle.id, variantId),
          latentBundleId: bundle.id,
          region,
          stratumId: bundle.stratumId,
          variantId,
          arm,
          providerCalls: ROLE_CALLS_PER_RUN[arm],
          rolePlan: ROLE_PLANS[arm].map((row) => ({ ...row })),
          contentStatus: "candidate-only-not-built",
          formalExecutionAuthorized: false
        });
      });
    });
  }
  return rows.sort((left, right) => left.packageId.localeCompare(right.packageId));
}

function buildRepeatabilityPlan(seed, latentBundles, packageAssignments) {
  const packageRepeats = [];
  for (const region of REGIONS) {
    const candidates = deterministicShuffle(
      latentBundles.filter((row) => row.region === region && row.status === "defect-bearing"),
      seed,
      `${region}|repeat-bundle`
    );
    const selectedBundle = candidates[0];
    for (const arm of ["B_PRIME", "C0_PRIME"]) {
      const assignment = packageAssignments.find(
        (row) => row.latentBundleId === selectedBundle.id && row.arm === arm
      );
      packageRepeats.push({
        repeatGroupId: `repeat-${sha256(`${seed}|${assignment.packageId}|${arm}`).slice(0, 16)}`,
        originalPackageId: assignment.packageId,
        latentBundleId: assignment.latentBundleId,
        region,
        arm,
        providerCalls: ROLE_CALLS_PER_RUN[arm],
        repeatIndex: 1,
        selectionTiming: "precommitted-before-results",
        sameFrozenProjectionRequired: true,
        sameRequestParametersRequired: true,
        distinctProviderResponseRequired: true
      });
    }
  }
  const successfulProviderCalls = packageRepeats.reduce((sum, row) => sum + row.providerCalls, 0);
  return {
    purpose: "measure-residual-provider-and-reviewer-stochasticity",
    coreEstimandIncludesRepeats: false,
    selectedLatentBundles: new Set(packageRepeats.map((row) => row.latentBundleId)).size,
    packageRepeats,
    successfulProviderCalls,
    corePlusRepeatSuccessfulProviderCalls: 168 + successfulProviderCalls
  };
}

function ownerEnvelopeProposal(repeatabilityPlan) {
  const priorObserved = {
    B_PRIME: { packages: 12, providerCalls: 24, apiCostUsd: 2.87936 },
    C0_PRIME: { packages: 12, providerCalls: 60, apiCostUsd: 4.0931 }
  };
  const estimatedCoreCostUsd = Number((
    priorObserved.B_PRIME.apiCostUsd * 2
    + priorObserved.C0_PRIME.apiCostUsd * 2
  ).toFixed(6));
  const estimatedRepeatCostUsd = Number((
    priorObserved.B_PRIME.apiCostUsd * 3 / priorObserved.B_PRIME.packages
    + priorObserved.C0_PRIME.apiCostUsd * 3 / priorObserved.C0_PRIME.packages
  ).toFixed(6));
  const providerCallCap = 220;
  return {
    authorizationStatus: "proposal-only-not-authorized",
    currencyCapUsd: 25,
    providerCallCap,
    tokenCap: 40_000_000,
    successfulCoreCallTarget: 168,
    successfulRepeatCallTarget: repeatabilityPlan.successfulProviderCalls,
    successfulCorePlusRepeatCallTarget: repeatabilityPlan.corePlusRepeatSuccessfulProviderCalls,
    retryCallReserve: providerCallCap - repeatabilityPlan.corePlusRepeatSuccessfulProviderCalls,
    estimatedCoreCostUsd,
    estimatedRepeatCostUsd,
    estimatedCorePlusRepeatCostUsd: Number((estimatedCoreCostUsd + estimatedRepeatCostUsd).toFixed(6)),
    estimateBasis: "scaled-observed-F3-B-and-C0-costs-before-new-provider-usage",
    supersedesPriorEnvelope: false,
    requiresFreshOwnerSignature: true
  };
}

export function buildCalibrationProtocolV2({ seed }) {
  if (typeof seed !== "string" || seed.trim() === "") throw new Error("A non-empty randomization seed is required.");
  const latentBundles = buildLatentBundles(seed);
  const packageAssignments = buildPackageAssignments(seed, latentBundles);
  const successfulProviderCallsByArm = Object.fromEntries(ARMS.map((arm) => [
    arm,
    packageAssignments
      .filter((row) => row.arm === arm)
      .reduce((sum, row) => sum + row.providerCalls, 0)
  ]));
  const repeatabilityPlan = buildRepeatabilityPlan(seed, latentBundles, packageAssignments);
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "candidate-only-protocol-not-executed",
    seedCommitmentSha256: sha256(seed),
    randomizationAlgorithm: "sha256-ranked-region-stratified-cyclic-three-arm-assignment-v1",
    arms: [...ARMS],
    regions: [...REGIONS],
    armContracts: {
      A_PRIME: {
        providerCalls: 0,
        roleSequence: ["deterministic-baseline"],
        aggregateRoles: ["deterministic-baseline"]
      },
      B_PRIME: {
        providerCalls: 2,
        roleSequence: ["deterministic-baseline", "same-reviewer-critique", "same-reviewer-revision"],
        aggregateRoles: ["deterministic-baseline", "same-reviewer-revision"]
      },
      C0_PRIME: {
        providerCalls: 5,
        roleSequence: [
          "answer-blind-solver",
          "tool-verifier",
          "adversarial-grader",
          "bilingual-curriculum-critic",
          "evidence-verifier"
        ],
        aggregateRoles: [
          "answer-blind-solver",
          "tool-verifier",
          "adversarial-grader",
          "bilingual-curriculum-critic",
          "evidence-verifier"
        ]
      }
    },
    latentBundles,
    packageAssignments,
    corePlan: {
      estimand: "matched-triplet-machine-QA-feasibility-and-calibration",
      latentBundleCount: latentBundles.length,
      packageRunCount: packageAssignments.length,
      providerCallsPerLatentBundle: 7,
      successfulProviderCallsByArm,
      successfulProviderCalls: Object.values(successfulProviderCallsByArm).reduce((sum, value) => sum + value, 0),
      cIsolationArmOmitted: true
    },
    stochasticRequestParameters: { ...STOCHASTIC_REQUEST_PARAMETERS },
    stochasticReceiptRequirement: {
      recordEveryRequestedParameter: true,
      recordObservedModelAndResponseId: true,
      recordFinishReasonAndTokenUsage: true,
      doNotClaimProviderSeedSupport: true
    },
    repeatabilityPlan,
    naturalGeneralizationPlan: {
      status: "design-only-not-sampled",
      purpose: "estimate-generalization-from-synthetic-calibration-to-natural-MAIS-candidates",
      targetQuestionCount: 180,
      regionQuotas: { CA: 60, HK: 60, MAINLAND: 60 },
      independentFromSyntheticCalibration: true,
      excludedFromPromptOrTaxonomyTuning: true,
      samplingFrameFrozenBeforeMachineReview: true,
      responseFormAndDifficultyStratificationRequired: true,
      labels: "independent-blinded-reference-labels-with-provenance",
      generalizationClaimRequiresCompletedIndependentLabels: true,
      perQuestionHumanReleaseGate: false,
      livePromotionDecisionIncluded: false,
      reporting: [
        "surface-detection-metrics",
        "code-family-concordant-metrics",
        "region-stratified-confidence-intervals",
        "response-form-stratified-confidence-intervals"
      ]
    },
    ownerEnvelopeProposal: ownerEnvelopeProposal(repeatabilityPlan),
    executionBoundary: {
      liveProviderAuthorized: false,
      formalExecutionAuthorized: false,
      productionAuthorized: false,
      deploymentAuthorized: false,
      gitCommitAuthorized: false,
      gitPushAuthorized: false,
      executionEntrypointIncluded: false,
      separateOwnerAuthorizationRequired: true,
      candidateContentStatus: "not-built",
      frozenF3EvidenceMutable: false
    }
  };
  return { ...body, designSha256: sha256(body) };
}

export function auditCalibrationProtocolV2(design) {
  const issues = [];
  const push = (code, detail) => issues.push({ code, detail });
  if (!design || typeof design !== "object") return [{ code: "design-shape", detail: "Protocol design must be an object." }];
  if (design.protocolId !== PROTOCOL_ID || design.protocolVersion !== PROTOCOL_VERSION) push("protocol-binding", "Protocol binding drifted.");
  const { designSha256, ...body } = design;
  if (designSha256 !== sha256(body)) push("design-hash", "Protocol design hash drifted.");
  if (!Array.isArray(design.latentBundles) || design.latentBundles.length !== 24) push("bundle-count", "Expected 24 latent bundles.");
  if (!Array.isArray(design.packageAssignments) || design.packageAssignments.length !== 72) push("package-count", "Expected 72 package assignments.");
  for (const region of REGIONS) {
    if (design.latentBundles?.filter((row) => row.region === region).length !== 8) push("region-balance", `Expected eight bundles for ${region}.`);
  }
  for (const bundle of design.latentBundles ?? []) {
    const rows = design.packageAssignments?.filter((row) => row.latentBundleId === bundle.id) ?? [];
    if (rows.length !== 3 || new Set(rows.map((row) => row.arm)).size !== 3 || new Set(rows.map((row) => row.variantId)).size !== 3) {
      push("triplet-topology", `Bundle ${bundle.id} is not a complete matched triplet.`);
    }
    if (rows.reduce((sum, row) => sum + row.providerCalls, 0) !== 7) push("triplet-call-count", `Bundle ${bundle.id} does not require exactly seven provider calls.`);
  }
  if ((design.packageAssignments ?? []).some((row) => !ARMS.includes(row.arm))) push("unknown-arm", "A removed or unknown arm is present.");
  if (design.corePlan?.successfulProviderCalls !== 168) push("core-call-count", "Core successful-call target must be 168.");
  if (design.repeatabilityPlan?.successfulProviderCalls !== 21) push("repeat-call-count", "Repeat supplement must require 21 successful calls.");
  if (design.repeatabilityPlan?.corePlusRepeatSuccessfulProviderCalls !== 189) push("total-successful-call-count", "Core plus repeat target must be 189 successful calls.");
  if (design.ownerEnvelopeProposal?.providerCallCap - 189 !== 31) push("retry-reserve", "Proposed call cap must leave 31 retry calls.");
  if (design.executionBoundary?.formalExecutionAuthorized !== false || design.executionBoundary?.liveProviderAuthorized !== false || design.executionBoundary?.executionEntrypointIncluded !== false) {
    push("authorization-boundary", "Design must not authorize or include live execution.");
  }
  if (design.naturalGeneralizationPlan?.perQuestionHumanReleaseGate !== false || design.naturalGeneralizationPlan?.independentFromSyntheticCalibration !== true) {
    push("natural-sample-boundary", "Natural sample must be independent and must not become a per-question release gate.");
  }
  return issues;
}
