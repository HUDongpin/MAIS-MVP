import { createHash } from "node:crypto";

import responseManifestJson from "@/data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
import simpleResponseManifestJson from "@/data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";
import hongKongQuestionVersionManifestJson from "@/data/historical/hongKongQuestionVersionManifest.json";
import {
  isHongKongEaseWorkedResponseContractKind,
  matchesHongKongEaseWorkedResponseContract
} from "@/lib/server/hongKongEaseWorkedResponseContracts";

type Contract = {
  kind: string;
  params: Record<string, unknown>;
};

type ManifestEntry = Contract & {
  baseId: string;
};

type ResponseManifest = {
  schemaVersion: number;
  status: string;
  candidateSha256: string;
  candidateQuestionIdSha256: string;
  auditSha256: string;
  aliasTriageSha256: string;
  failClosedPolicy: string;
  strictContractCount: number;
  positiveProbeCount: number;
  negativeProbeCount: number;
  reviewedExactSurfaceQuestionCount: number;
  reviewedExactSurfaceFormCount: number;
  entries: ManifestEntry[];
};

export type ReviewedSimpleResponseManifest = {
  schemaVersion: string;
  builderPath: string;
  questionPackPath: string;
  strictResponseManifestPath: string;
  declaredSimpleLedgerPath: string;
  sourceEvidenceSha256ByPath: Record<string, string>;
  candidateSha256: string;
  declaredSimpleLedgerSha256: string;
  strictQuestionCount: number;
  reviewedSimpleQuestionCount: number;
  reviewedSurfaceCount: number;
  normalizedUniqueReviewedSurfaceCount: number;
  adversarialProbeCount: number;
  normalizedUniqueAdversarialProbeCount: number;
  fractionPolicyPositiveProbeCount: number;
  questionTypeCounts: Record<string, number>;
  policyCounts: Record<string, number>;
  taxonomy: {
    counts: Record<string, number>;
    idsByKind: Record<string, string[]>;
    objectCountDimensionIds: string[];
    fractionDecimalRejectIds: string[];
    fractionRepresentationPolicy: {
      ids: string[];
      reductionPolicy: string;
      decimalPercentBareScalarZeroDenominatorWrongValueRejected: boolean;
    };
    algebraEquationChoiceIds: string[];
    bilingualTextEvidence: {
      languageBearingCount: number;
      neutralSymbolCount: number;
    };
    multipleChoiceEvidence: {
      languageDifferentCorrectOptionCount: number;
      identicalCorrectOptionCount: number;
      correctIndexLetterAliasCount: number;
      noCorrectIndexLetterAliasCount: number;
      wrongIndexAliasCollisionCount: number;
      rows: Array<{
        baseId: string;
        correctIndexZeroBased: number;
        correctOptionLanguageRelation: "identical" | "language-different";
        correctIndexLetterAlias: string | null;
      }>;
    };
  };
  matchingPolicy: string;
  entries: Array<{
    baseId: string;
    questionType: "fill-in" | "multiple-choice" | "short-answer";
    taxonomyKind: string;
    policy:
      | "reviewed-choice-surfaces"
      | "reviewed-structured-surfaces"
      | "reviewed-unitless-math-surfaces"
      | "reviewed-text-surfaces";
    reviewedSurfaces: string[];
    reviewedSurfacesSha256: string;
    fractionRepresentationPolicy: {
      numerator: number;
      denominator: number;
      reductionPolicy: "equivalent-fractions-accepted-reduction-not-required";
      positiveProbes: string[];
    } | null;
    adversarialProbes: Array<{
      input: string;
      kind: string;
      independentlyWrongBasis: string;
    }>;
    adversarialProbesSha256: string;
  }>;
};

type HongKongQuestionVersionManifest = {
  schemaVersion: number;
  activeIdByHistoricalId: Record<string, string>;
  retiredHistoricalIds: string[];
};

const responseManifest = responseManifestJson as unknown as ResponseManifest;
const simpleResponseManifest = simpleResponseManifestJson as unknown as ReviewedSimpleResponseManifest;
const hongKongQuestionVersionManifest = hongKongQuestionVersionManifestJson as HongKongQuestionVersionManifest;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isContract(value: unknown): value is Contract {
  return isRecord(value) && typeof value.kind === "string" && isRecord(value.params);
}

const expectedResponseManifestEvidence = {
  status: "candidate-pending-independent-review",
  candidateSha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
  candidateQuestionIdSha256: "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a",
  auditSha256: "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",
  aliasTriageSha256: "7d18dadbae0e222d3d8db1dd8029bb8389565124121389e18fc8e205601638ce",
  strictContractCount: 344,
  positiveProbeCount: 584,
  negativeProbeCount: 581,
  reviewedExactSurfaceQuestionCount: 56,
  reviewedExactSurfaceFormCount: 136
} as const;

const expectedSimpleResponseManifestEvidence = {
  schemaVersion: "hk-ease-reviewed-simple-response-contracts-v1",
  builderPath: "coordination/content-qa/build-hk-ease-declared-simple-ledger.ts",
  questionPackPath: "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
  strictResponseManifestPath: "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
  declaredSimpleLedgerPath:
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/declared-simple-ledger.json",
  sourceEvidenceSha256ByPath: {
    "data/generated-content/hk-ease-practice-bank-v2/question-pack.json":
      "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
    "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json":
      "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/initial-independent-review.json":
      "09ea98dbcf6cb17a89cca692ee7760b0fcfb74dd898db316c48937d7b01ff8ea",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/semantic-shard-a.json":
      "fa53a9255c60e71111c8b8837c33cf9cc14b539964884566fd28c2269ee24b1d",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/semantic-shard-b.json":
      "d291f64b2676b719053c1042183de8155e3b07acace27e7cd6ccb1eda7da1c0f",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/semantic-shard-c.json":
      "5fe839673194828096a1e8ed0ce36bd683f5a9347c816be4b8ddc38ef37e8261"
  },
  candidateSha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
  declaredSimpleLedgerSha256: "11ad86d97706a08379df4b75630bfe35e73a7e2dba257ce0e435044d03784284",
  strictQuestionCount: 344,
  reviewedSimpleQuestionCount: 357,
  reviewedSurfaceCount: 776,
  normalizedUniqueReviewedSurfaceCount: 744,
  adversarialProbeCount: 3236,
  normalizedUniqueAdversarialProbeCount: 3236,
  fractionPolicyPositiveProbeCount: 15,
  questionTypeCounts: { "fill-in": 275, "multiple-choice": 80, "short-answer": 2 },
  policyCounts: {
    "reviewed-choice-surfaces": 80,
    "reviewed-structured-surfaces": 2,
    "reviewed-unitless-math-surfaces": 234,
    "reviewed-text-surfaces": 41
  },
  taxonomyCounts: {
    "mc-equation": 1,
    "mc-number-pair": 1,
    "mc-scalar": 39,
    "mc-text-or-classification": 39,
    "structured-response": 2,
    "text-boolean": 9,
    "text-direction": 8,
    "text-label": 5,
    "text-qualitative-equality": 3,
    "text-relation-symbol": 16,
    "unitless-decimal": 57,
    "unitless-fraction": 14,
    "unitless-integer": 157,
    "unitless-mixed-number": 4,
    "unitless-ordered-chain": 2
  },
  objectCountDimensionIds: [
    "hk-ease-10633", "hk-ease-10640", "hk-ease-10654", "hk-ease-10393",
    "hk-ease-10398", "hk-ease-10416", "hk-ease-10417", "hk-ease-10426",
    "hk-ease-10428", "hk-ease-10438", "hk-ease-10455", "hk-ease-10477",
    "hk-ease-10480", "hk-ease-919"
  ],
  fractionDecimalRejectIds: [
    "hk-ease-10641", "hk-ease-10642", "hk-ease-10643", "hk-ease-10652", "hk-ease-10653"
  ] as readonly string[],
  taxonomyPayloadSha256: "2261c8784171b6d5c0981be9d8bc0f12fc6bf2faaad7c45997f3f19fdb53ed47",
  baseIdSha256: "df0e1439402628baddab7318e8b295dec87d32eb5925685f8325838fec36f24c",
  canonicalPayloadSha256: "94e83afdc222d098df971a56c0dd435fca6526256a5513e0cdd79bdff9d7859d",
  fileSha256: "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41",
  matchingPolicy:
    "exact reviewed surfaces after NFC, NFKC, case, whitespace, and terminal-punctuation normalization; only the exact five fraction-required IDs additionally accept mathematically equivalent fractional representations; no generic numeric unit stripping"
} as const;

export const HONG_KONG_EASE_SIMPLE_RESPONSE_MANIFEST_SHA256 =
  expectedSimpleResponseManifestEvidence.fileSha256;

export class HongKongEaseSimpleResponseManifestValidationError extends Error {
  readonly code: string;
  readonly baseId: string | null;
  readonly field: string | null;

  constructor(
    code: string,
    message: string,
    baseId: string | null = null,
    field: string | null = null
  ) {
    super(message);
    this.name = "HongKongEaseSimpleResponseManifestValidationError";
    this.code = code;
    this.baseId = baseId;
    this.field = field;
  }
}

function failSimpleManifest(
  code: string,
  message: string,
  baseId: string | null = null,
  field: string | null = null
): never {
  throw new HongKongEaseSimpleResponseManifestValidationError(code, message, baseId, field);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeReviewedSimpleSurface(value: string) {
  return value
    .normalize("NFC")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[。.]$/g, "")
    .trim();
}

function reviewedFractionParts(value: string) {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/\\(?:dfrac|tfrac|frac)\s*\{\s*([+-]?\d+)\s*\}\s*\{\s*([+-]?\d+)\s*\}/g, "$1/$2")
    .trim();
  const match = normalized.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (!match || Number(match[2]) === 0) return null;
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

export function validateHongKongEaseReviewedSimpleResponseManifest(
  candidate: unknown,
  options: { requireCanonicalPayload?: boolean } = {}
) {
  if (!isRecord(candidate) || !Array.isArray(candidate.entries)) {
    failSimpleManifest(
      "SIMPLE_MANIFEST_SHAPE_DRIFT",
      "Invalid Hong Kong EASE reviewed-simple response-contract manifest shape"
    );
  }
  const manifest = candidate as unknown as ReviewedSimpleResponseManifest;
  if (
    manifest.reviewedSimpleQuestionCount !==
    expectedSimpleResponseManifestEvidence.reviewedSimpleQuestionCount
  ) {
    failSimpleManifest(
      "SIMPLE_MANIFEST_HEADER_DRIFT",
      "Hong Kong EASE reviewed-simple response-contract question count drifted",
      null,
      "reviewedSimpleQuestionCount"
    );
  }
  if (
    isRecord(manifest.taxonomy) &&
    sha256(JSON.stringify(manifest.taxonomy)) !==
      expectedSimpleResponseManifestEvidence.taxonomyPayloadSha256
  ) {
    failSimpleManifest(
      "SIMPLE_TAXONOMY_DRIFT",
      "Hong Kong EASE reviewed-simple response-contract taxonomy drifted",
      null,
      "taxonomy"
    );
  }
  if (
    manifest.schemaVersion !== expectedSimpleResponseManifestEvidence.schemaVersion ||
    manifest.builderPath !== expectedSimpleResponseManifestEvidence.builderPath ||
    manifest.questionPackPath !== expectedSimpleResponseManifestEvidence.questionPackPath ||
    manifest.strictResponseManifestPath !== expectedSimpleResponseManifestEvidence.strictResponseManifestPath ||
    manifest.declaredSimpleLedgerPath !== expectedSimpleResponseManifestEvidence.declaredSimpleLedgerPath ||
    JSON.stringify(manifest.sourceEvidenceSha256ByPath) !==
      JSON.stringify(expectedSimpleResponseManifestEvidence.sourceEvidenceSha256ByPath) ||
    manifest.candidateSha256 !== expectedSimpleResponseManifestEvidence.candidateSha256 ||
    manifest.declaredSimpleLedgerSha256 !== expectedSimpleResponseManifestEvidence.declaredSimpleLedgerSha256 ||
    manifest.strictQuestionCount !== expectedSimpleResponseManifestEvidence.strictQuestionCount ||
    manifest.reviewedSurfaceCount !== expectedSimpleResponseManifestEvidence.reviewedSurfaceCount ||
    manifest.normalizedUniqueReviewedSurfaceCount !==
      expectedSimpleResponseManifestEvidence.normalizedUniqueReviewedSurfaceCount ||
    manifest.adversarialProbeCount !== expectedSimpleResponseManifestEvidence.adversarialProbeCount ||
    manifest.normalizedUniqueAdversarialProbeCount !==
      expectedSimpleResponseManifestEvidence.normalizedUniqueAdversarialProbeCount ||
    manifest.fractionPolicyPositiveProbeCount !==
      expectedSimpleResponseManifestEvidence.fractionPolicyPositiveProbeCount ||
    JSON.stringify(manifest.questionTypeCounts) !==
      JSON.stringify(expectedSimpleResponseManifestEvidence.questionTypeCounts) ||
    JSON.stringify(manifest.policyCounts) !== JSON.stringify(expectedSimpleResponseManifestEvidence.policyCounts) ||
    JSON.stringify(manifest.taxonomy.counts) !==
      JSON.stringify(expectedSimpleResponseManifestEvidence.taxonomyCounts) ||
    JSON.stringify(manifest.taxonomy.objectCountDimensionIds) !==
      JSON.stringify(expectedSimpleResponseManifestEvidence.objectCountDimensionIds) ||
    JSON.stringify(manifest.taxonomy.fractionDecimalRejectIds) !==
      JSON.stringify(expectedSimpleResponseManifestEvidence.fractionDecimalRejectIds) ||
    JSON.stringify(manifest.taxonomy.fractionRepresentationPolicy) !== JSON.stringify({
      ids: expectedSimpleResponseManifestEvidence.fractionDecimalRejectIds,
      reductionPolicy: "equivalent-fractions-accepted-reduction-not-required",
      decimalPercentBareScalarZeroDenominatorWrongValueRejected: true
    }) ||
    JSON.stringify(manifest.taxonomy.algebraEquationChoiceIds) !== JSON.stringify(["hk-ease-10422"]) ||
    manifest.matchingPolicy !== expectedSimpleResponseManifestEvidence.matchingPolicy ||
    manifest.entries.length !== expectedSimpleResponseManifestEvidence.reviewedSimpleQuestionCount
  ) {
    throw new Error("Invalid Hong Kong EASE reviewed-simple response-contract manifest header");
  }
  if (
    options.requireCanonicalPayload !== false &&
    sha256(JSON.stringify(manifest)) !== expectedSimpleResponseManifestEvidence.canonicalPayloadSha256
  ) {
    failSimpleManifest(
      "SIMPLE_MANIFEST_PAYLOAD_DRIFT",
      "Hong Kong EASE reviewed-simple response-contract payload SHA-256 drifted"
    );
  }
  const ids = new Set<string>();
  const taxonomyIdsByKind = new Map<string, string[]>();
  const policyCounts = new Map<string, number>();
  const questionTypeCounts = new Map<string, number>();
  let reviewedSurfaceCount = 0;
  const normalizedReviewedSurfaces = new Set<string>();
  let adversarialProbeCount = 0;
  const normalizedAdversarialProbes = new Set<string>();
  let fractionPolicyPositiveProbeCount = 0;
  for (const entry of manifest.entries) {
    if (!isRecord(entry)) {
      failSimpleManifest(
        "SIMPLE_ENTRY_SHAPE_DRIFT",
        "Invalid Hong Kong EASE reviewed-simple response contract entry shape"
      );
    }
    const expectedPolicy = entry.questionType === "multiple-choice"
      ? "reviewed-choice-surfaces"
      : entry.questionType === "short-answer"
        ? "reviewed-structured-surfaces"
        : typeof entry.taxonomyKind === "string" && entry.taxonomyKind.startsWith("unitless-")
          ? "reviewed-unitless-math-surfaces"
          : "reviewed-text-surfaces";
    const reviewedSurfaceSet = new Set(
      Array.isArray(entry.reviewedSurfaces)
        ? entry.reviewedSurfaces.map(normalizeReviewedSimpleSurface)
        : []
    );
    if (entry.policy !== expectedPolicy) {
      failSimpleManifest(
        "SIMPLE_ENTRY_POLICY_DRIFT",
        `${entry.baseId}: reviewed-simple response policy drifted`,
        typeof entry.baseId === "string" ? entry.baseId : null,
        "policy"
      );
    }
    if (
      Array.isArray(entry.reviewedSurfaces) &&
      sha256(JSON.stringify(entry.reviewedSurfaces)) !== entry.reviewedSurfacesSha256
    ) {
      failSimpleManifest(
        "SIMPLE_REVIEWED_SURFACE_HASH_DRIFT",
        `${entry.baseId}: reviewed-simple response surfaces drifted`,
        typeof entry.baseId === "string" ? entry.baseId : null,
        "reviewedSurfaces"
      );
    }
    if (
      Array.isArray(entry.adversarialProbes) &&
      sha256(JSON.stringify(entry.adversarialProbes)) !== entry.adversarialProbesSha256
    ) {
      failSimpleManifest(
        "SIMPLE_ADVERSARIAL_PROBE_HASH_DRIFT",
        `${entry.baseId}: reviewed-simple adversarial probes drifted`,
        typeof entry.baseId === "string" ? entry.baseId : null,
        "adversarialProbes"
      );
    }
    if (
      !/^hk-ease-\d+$/.test(entry.baseId) ||
      ids.has(entry.baseId) ||
      !["fill-in", "multiple-choice", "short-answer"].includes(entry.questionType) ||
      !Array.isArray(entry.reviewedSurfaces) ||
      !entry.reviewedSurfaces.length ||
      !Array.isArray(entry.adversarialProbes) ||
      !entry.adversarialProbes.length ||
      entry.reviewedSurfaces.some(
        (surface) => typeof surface !== "string" || !normalizeReviewedSimpleSurface(surface)
      ) ||
      entry.adversarialProbes.some(
        (probe) =>
          !isRecord(probe) ||
          typeof probe.input !== "string" ||
          typeof probe.kind !== "string" ||
          typeof probe.independentlyWrongBasis !== "string" ||
          !normalizeReviewedSimpleSurface(probe.input) ||
          !probe.kind.trim() ||
          !probe.independentlyWrongBasis.trim() ||
          reviewedSurfaceSet.has(normalizeReviewedSimpleSurface(probe.input))
      )
    ) {
      throw new Error(`Invalid Hong Kong EASE reviewed-simple response contract for ${entry.baseId}`);
    }
    ids.add(entry.baseId);
    const taxonomyIds = taxonomyIdsByKind.get(entry.taxonomyKind) ?? [];
    taxonomyIds.push(entry.baseId);
    taxonomyIdsByKind.set(entry.taxonomyKind, taxonomyIds);
    reviewedSurfaceCount += entry.reviewedSurfaces.length;
    adversarialProbeCount += entry.adversarialProbes.length;
    if (entry.fractionRepresentationPolicy) {
      if (
        !expectedSimpleResponseManifestEvidence.fractionDecimalRejectIds.includes(entry.baseId) ||
        !Number.isInteger(entry.fractionRepresentationPolicy.numerator) ||
        !Number.isInteger(entry.fractionRepresentationPolicy.denominator) ||
        entry.fractionRepresentationPolicy.denominator === 0 ||
        entry.fractionRepresentationPolicy.reductionPolicy !==
          "equivalent-fractions-accepted-reduction-not-required" ||
        !Array.isArray(entry.fractionRepresentationPolicy.positiveProbes) ||
        entry.fractionRepresentationPolicy.positiveProbes.length !== 3
      ) {
        throw new Error(`${entry.baseId}: invalid fraction-representation policy`);
      }
      fractionPolicyPositiveProbeCount += entry.fractionRepresentationPolicy.positiveProbes.length;
    } else if (expectedSimpleResponseManifestEvidence.fractionDecimalRejectIds.includes(entry.baseId)) {
      throw new Error(`${entry.baseId}: missing exact fraction-representation policy`);
    }
    for (const surface of entry.reviewedSurfaces) {
      normalizedReviewedSurfaces.add(`${entry.baseId}\0${normalizeReviewedSimpleSurface(surface)}`);
    }
    for (const probe of entry.adversarialProbes) {
      normalizedAdversarialProbes.add(`${entry.baseId}\0${normalizeReviewedSimpleSurface(probe.input)}`);
    }
    policyCounts.set(entry.policy, (policyCounts.get(entry.policy) ?? 0) + 1);
    questionTypeCounts.set(
      entry.questionType,
      (questionTypeCounts.get(entry.questionType) ?? 0) + 1
    );
  }
  if (
    reviewedSurfaceCount !== expectedSimpleResponseManifestEvidence.reviewedSurfaceCount ||
    normalizedReviewedSurfaces.size !==
      expectedSimpleResponseManifestEvidence.normalizedUniqueReviewedSurfaceCount ||
    adversarialProbeCount !== expectedSimpleResponseManifestEvidence.adversarialProbeCount ||
    normalizedAdversarialProbes.size !==
      expectedSimpleResponseManifestEvidence.normalizedUniqueAdversarialProbeCount ||
    fractionPolicyPositiveProbeCount !== expectedSimpleResponseManifestEvidence.fractionPolicyPositiveProbeCount ||
    sha256(`${manifest.entries.map((entry) => entry.baseId).join("\n")}\n`) !==
      expectedSimpleResponseManifestEvidence.baseIdSha256 ||
    Object.entries(expectedSimpleResponseManifestEvidence.policyCounts).some(
      ([policy, count]) => policyCounts.get(policy) !== count
    ) ||
    Object.entries(expectedSimpleResponseManifestEvidence.questionTypeCounts).some(
      ([questionType, count]) => questionTypeCounts.get(questionType) !== count
    ) ||
    Object.entries(expectedSimpleResponseManifestEvidence.taxonomyCounts).some(
      ([kind, count]) => taxonomyIdsByKind.get(kind)?.length !== count ||
        JSON.stringify(taxonomyIdsByKind.get(kind)) !== JSON.stringify(manifest.taxonomy.idsByKind[kind])
    )
  ) {
    throw new Error("Invalid Hong Kong EASE reviewed-simple response-contract coverage");
  }
  return new Map(manifest.entries.map((entry) => [entry.baseId, entry] as const));
}

const simpleResponseByBaseId = validateHongKongEaseReviewedSimpleResponseManifest(
  simpleResponseManifest
);

function containsForbiddenAcceptedSurfaceField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenAcceptedSurfaceField);
  if (!isRecord(value)) return false;
  if (Object.hasOwn(value, "auditedAcceptedSurfaceForms")) return true;
  return Object.values(value).some(containsForbiddenAcceptedSurfaceField);
}


const exact3ContractKindByBaseId = new Map([
  ["hk-ease-10481", "exact3-named-classified-number-groups-v1"],
  ["hk-ease-10496", "exact3-named-classified-number-groups-v1"],
  ["hk-ease-1041", "exact3-labelled-divisibility-matrix-v1"]
]);

function validateExact3ContractEvidence(contract: Contract, baseId: string) {
  const expectedKind = exact3ContractKindByBaseId.get(baseId);
  if (!expectedKind) return false;
  const parserBinding = isRecord(contract.params.parserBinding) ? contract.params.parserBinding : null;
  const forms = contract.params.acceptedSurfaceForms;
  if (
    contract.kind !== expectedKind ||
    !parserBinding ||
    parserBinding.modulePath !== "coordination/content-qa/hk-ease-exact3-phase2a-candidate-semantics.ts" ||
    parserBinding.exportName !== "evaluateHongKongEaseExact3Phase2AContract" ||
    parserBinding.sourceSha256 !== "f78ce1b211fa2723a635028f18f9db080b60063927d376edfc96e5cc676a8824" ||
    !Array.isArray(forms) ||
    forms.length !== (baseId === "hk-ease-1041" ? 3 : 16) ||
    forms[0] !== contract.params.canonicalAnswer ||
    new Set(forms).size !== forms.length
  ) {
    throw new Error(baseId + ": invalid exact3 parser or accepted-surface binding");
  }
  if (baseId === "hk-ease-1041") {
    if (
      JSON.stringify(contract.params.labels) !== JSON.stringify(["a", "b", "c", "d", "e", "f"]) ||
      JSON.stringify(contract.params.columns) !== JSON.stringify([2, 5, 10]) ||
      JSON.stringify(contract.params.expectedBooleanMatrix) !== JSON.stringify([
        [false, true, false], [true, true, true], [true, false, false],
        [true, true, true], [false, true, false], [true, true, true]
      ]) ||
      JSON.stringify(contract.params.tokenAliases) !== JSON.stringify({ true: ["Yes", "是", "✓"], false: ["No", "否", "✗"] }) ||
      contract.params.labelPolicy !== "each-a-through-f-exactly-once-in-order" ||
      contract.params.columnOrderPolicy !== "exactly-2-5-10-with-three-decisions-per-label" ||
      contract.params.illegalTokenPolicy !== "reject"
    ) throw new Error(baseId + ": exact3 divisibility contract drifted");
    return true;
  }
  if (
    JSON.stringify(contract.params.labels) !== JSON.stringify(["a", "b", "c"]) ||
    JSON.stringify(contract.params.categoryNames) !== JSON.stringify({
      en: ["proper fractions", "improper fractions", "mixed numbers"],
      zh: ["真分數", "假分數", "帶分數"]
    }) ||
    JSON.stringify(contract.params.expectedOriginalRepresentationGroups) !== JSON.stringify(
      baseId === "hk-ease-10481"
        ? [["3/5", "11/12"], ["7/4", "9/9"], ["2 1/3", "5 2/7"]]
        : [["4/7", "13/15"], ["11/5", "8/8"], ["3 1/2", "6 4/9"]]
    ) ||
    contract.params.categoryLanguagePolicy !== "one-response-all-English-or-all-Traditional-Chinese-no-mixing" ||
    contract.params.representationPolicy !== "each-original-representation-exactly-once-in-its-named-group-no-value-conversion" ||
    contract.params.withinGroupOrder !== "not-semantic" ||
    contract.params.labelOrder !== "exact-a-b-c" ||
    contract.params.extraMissingDuplicatePolicy !== "reject"
  ) throw new Error(baseId + ": exact3 named-category contract drifted");
  return true;
}

function validateContractEvidence(
  contract: Contract,
  baseId: string,
  reviewedQuestionIds: Set<string>
) {
  let reviewedSurfaceFormCount = 0;
  if (validateExact3ContractEvidence(contract, baseId)) return 0;
  if (contract.kind === "reviewed-exact-surface-forms") {
    const forms = contract.params.acceptedSurfaceForms;
    if (
      contract.params.reviewArtifactSha256 !== expectedResponseManifestEvidence.aliasTriageSha256 ||
      contract.params.classification !== "A-mathematically-valid" ||
      !Array.isArray(forms) ||
      forms.length === 0 ||
      forms.some((form) => typeof form !== "string" || !form.normalize("NFC").trim())
    ) {
      throw new Error(`${baseId}: invalid reviewed exact-surface response branch`);
    }
    const normalizedForms = forms.map((form) => (form as string).normalize("NFC").trim());
    if (new Set(normalizedForms).size !== normalizedForms.length) {
      throw new Error(`${baseId}: duplicate reviewed exact-surface response form`);
    }
    reviewedQuestionIds.add(baseId);
    reviewedSurfaceFormCount += normalizedForms.length;
  }

  if (contract.kind === "all-of" || contract.kind === "any-of") {
    const nested = contract.params.contracts;
    if (!Array.isArray(nested) || nested.length === 0 || nested.some((candidate) => !isContract(candidate))) {
      throw new Error(`${baseId}: invalid nested strict response contract`);
    }
    for (const candidate of nested as Contract[]) {
      reviewedSurfaceFormCount += validateContractEvidence(candidate, baseId, reviewedQuestionIds);
    }
  }
  return reviewedSurfaceFormCount;
}

function validateManifest(manifest: ResponseManifest) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.status !== expectedResponseManifestEvidence.status ||
    manifest.candidateSha256 !== expectedResponseManifestEvidence.candidateSha256 ||
    manifest.candidateQuestionIdSha256 !== expectedResponseManifestEvidence.candidateQuestionIdSha256 ||
    manifest.auditSha256 !== expectedResponseManifestEvidence.auditSha256 ||
    manifest.aliasTriageSha256 !== expectedResponseManifestEvidence.aliasTriageSha256 ||
    manifest.failClosedPolicy !== "reject-no-generic-fallback" ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.length !== manifest.strictContractCount ||
    manifest.strictContractCount !== expectedResponseManifestEvidence.strictContractCount ||
    manifest.positiveProbeCount !== expectedResponseManifestEvidence.positiveProbeCount ||
    manifest.negativeProbeCount !== expectedResponseManifestEvidence.negativeProbeCount ||
    manifest.reviewedExactSurfaceQuestionCount !== expectedResponseManifestEvidence.reviewedExactSurfaceQuestionCount ||
    manifest.reviewedExactSurfaceFormCount !== expectedResponseManifestEvidence.reviewedExactSurfaceFormCount ||
    containsForbiddenAcceptedSurfaceField(manifest)
  ) {
    throw new Error("Invalid Hong Kong EASE strict response-contract manifest header");
  }

  const seen = new Set<string>();
  const reviewedQuestionIds = new Set<string>();
  let reviewedSurfaceFormCount = 0;
  for (const entry of manifest.entries) {
    if (
      !isContract(entry) ||
      typeof entry.baseId !== "string" ||
      !/^hk-ease-\d+$/.test(entry.baseId) ||
      seen.has(entry.baseId)
    ) {
      throw new Error("Invalid Hong Kong EASE strict response-contract manifest entry");
    }
    seen.add(entry.baseId);
    reviewedSurfaceFormCount += validateContractEvidence(entry, entry.baseId, reviewedQuestionIds);
  }
  const exact3BaseIds = manifest.entries
    .filter((entry) => exact3ContractKindByBaseId.has(entry.baseId))
    .map((entry) => entry.baseId);
  if (
    JSON.stringify(exact3BaseIds) !== JSON.stringify(["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]) ||
    reviewedQuestionIds.size !== expectedResponseManifestEvidence.reviewedExactSurfaceQuestionCount ||
    reviewedSurfaceFormCount !== expectedResponseManifestEvidence.reviewedExactSurfaceFormCount
  ) {
    throw new Error("Invalid Hong Kong EASE reviewed exact-surface response coverage");
  }
}

validateManifest(responseManifest);

if (
  hongKongQuestionVersionManifest.schemaVersion !== 1 ||
  !isRecord(hongKongQuestionVersionManifest.activeIdByHistoricalId) ||
  !Array.isArray(hongKongQuestionVersionManifest.retiredHistoricalIds)
) {
  throw new Error("Invalid Hong Kong question version manifest for strict EASE response contracts");
}

const strictBaseIds = new Set(responseManifest.entries.map((entry) => entry.baseId));
const retiredHistoricalIds = new Set(hongKongQuestionVersionManifest.retiredHistoricalIds);
if (
  strictBaseIds.size !== 344 ||
  simpleResponseByBaseId.size !== 357 ||
  [...simpleResponseByBaseId.keys()].some((baseId) => strictBaseIds.has(baseId)) ||
  new Set([...strictBaseIds, ...simpleResponseByBaseId.keys()]).size !== 701
) {
  throw new Error("Hong Kong EASE strict/simple response-contract partition drifted");
}
for (const baseId of [...strictBaseIds, ...simpleResponseByBaseId.keys()]) {
  const activeId = hongKongQuestionVersionManifest.activeIdByHistoricalId[baseId];
  if (!activeId || !retiredHistoricalIds.has(baseId) || retiredHistoricalIds.has(activeId)) {
    throw new Error(`${baseId}: Hong Kong EASE response contract is not bound to one active generation`);
  }
}

const contractByBaseId = new Map(
  responseManifest.entries.map((entry) => [entry.baseId, entry] as const)
);
const activeQuestionIdByStrictBaseId = new Map(
  responseManifest.entries.map((entry) => [
    entry.baseId,
    hongKongQuestionVersionManifest.activeIdByHistoricalId[entry.baseId] ?? entry.baseId
  ] as const)
);

const superscriptDigits: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9"
};

function normalizeSuperscripts(value: string) {
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) =>
    `^${Array.from(digits, (digit) => superscriptDigits[digit] ?? digit).join("")}`
  );
}

function normalizeMath(value: string) {
  let normalized = normalizeSuperscripts(value)
    .normalize("NFKC")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[()]/g, "")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\(?:dfrac|tfrac|frac)\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}/g, " $1/$2")
    .replace(/\\(?:times|cdot)/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\,/g, " ")
    .replace(/\^\{\s*([+-]?\d+)\s*\}/g, "^$1")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/[；]/g, ";")
    .replace(/[：]/g, ":")
    .replace(/[，、]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[＜]/g, "<")
    .replace(/[＞]/g, ">")
    .replace(/平方厘米/gi, "cm^2")
    .replace(/平方公尺|平方米/gi, "m^2")
    .replace(/立方厘米/gi, "cm^3")
    .replace(/厘米|公分/gi, "cm")
    .replace(/千克|公斤/gi, "kg")
    .replace(/毫升/gi, "ml")
    .replace(/公升|升/gi, "l")
    .replace(/港元|港幣/gi, "hkd")
    .toLowerCase()
    .trim();

  while (/^\([^()]+\)$/.test(normalized)) normalized = normalized.slice(1, -1).trim();
  return normalized;
}

function compact(value: string) {
  return normalizeMath(value)
    .replace(/\s+/g, "")
    .replace(/[。.]$/, "")
    .trim();
}

function prose(value: string) {
  return normalizeMath(value)
    .replace(/[^\p{L}\p{N}^*/<>=.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeReviewedSurface(value: string) {
  return value.replace(/\r\n?/g, "\n").normalize("NFC").trim();
}

function matchesDeterministicWorkedReferenceProbe(
  params: Record<string, unknown>,
  selectedAnswer: string
) {
  const reference = params.referenceWorkingEn;
  const expectedOutputs = params.expectedOutputs;
  if (typeof reference !== "string" || !isRecord(expectedOutputs)) return false;
  const numericOutputs = Object.values(expectedOutputs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numericOutputs.length !== 1) return false;
  const match = selectedAnswer.match(/^Working\/reason:\s*([\s\S]*?)\s+Final response:\s*([+-]?\d+(?:\.\d+)?)\s*$/i);
  if (!match || normalizeReviewedSurface(match[1]) !== normalizeReviewedSurface(reference)) return false;
  return Number(match[2]) === numericOutputs[0];
}

function matchesReviewedExactSurfaceForm(params: Record<string, unknown>, selectedAnswer: string) {
  if (
    params.reviewArtifactSha256 !== "7d18dadbae0e222d3d8db1dd8029bb8389565124121389e18fc8e205601638ce" ||
    params.classification !== "A-mathematically-valid"
  ) return false;
  const selected = normalizeReviewedSurface(selectedAnswer);
  return Boolean(selected) && stringArray(params.acceptedSurfaceForms)
    .some((form) => normalizeReviewedSurface(form) === selected);
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function gcd(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

function extractFinalResponse(value: string) {
  const match = value.match(/final\s+response\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || value.trim();
}

function matchesSurfaceForms(params: Record<string, unknown>, selectedAnswer: string) {
  const forms = stringArray(params.acceptedSurfaceForms);
  if (typeof params.canonicalAnswer === "string") forms.push(params.canonicalAnswer);
  return forms.some((form) => compact(form) === compact(extractFinalResponse(selectedAnswer)));
}

type Fraction = { numerator: number; denominator: number; whole?: number };

function parseFraction(value: string, allowUnitSuffix = false): Fraction | null {
  let normalized = normalizeMath(value).trim();
  if (allowUnitSuffix) {
    normalized = normalized.replace(/\s*(?:hkd|hk\$|\$|cm(?:\^\d)?|m(?:\^\d)?|kg|ml|l|元|dollars?)\s*$/i, "");
  }
  const mixed = normalized.match(/^([+-]?\d+)\s+([0-9]+)\s*\/\s*([0-9]+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator
      ? { whole: Number(mixed[1]), numerator: Number(mixed[2]), denominator }
      : null;
  }
  const fraction = normalized.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (!fraction) return null;
  const denominator = Number(fraction[2]);
  return denominator ? { numerator: Number(fraction[1]), denominator } : null;
}

function parseStrictDecimal(value: string) {
  const normalized = normalizeMath(value)
    .replace(/^\s*(?:hkd|hk\$|\$)\s*/i, "")
    .replace(/\s*(?:hkd|元|dollars?)\s*$/i, "")
    .trim();
  return /^[+-]?\d+\.\d+$/.test(normalized) ? normalized : null;
}

function numericValue(value: string) {
  const normalized = normalizeMath(value).trim();
  const fraction = parseFraction(normalized, true);
  if (fraction) {
    const fractional = fraction.numerator / fraction.denominator;
    if (fraction.whole === undefined) return fractional;
    return fraction.whole + (fraction.whole < 0 ? -fractional : fractional);
  }
  const match = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function containsNumericValue(selectedAnswer: string, expected: string) {
  const target = numericValue(expected);
  if (target === null) return compact(selectedAnswer).includes(compact(expected));
  const normalized = normalizeMath(selectedAnswer);
  const tokens = normalized.match(/[+-]?\d+\s+\d+\s*\/\s*\d+|[+-]?\d+\s*\/\s*[+-]?\d+|[+-]?\d+(?:\.\d+)?/g) ?? [];
  return tokens.some((token) => {
    const value = numericValue(token);
    return value !== null && Math.abs(value - target) < 1e-9;
  });
}

const unitAliases: Record<string, RegExp> = {
  HKD: /(?:\bhkd\b|hk\$|\$|港元|港幣|元|dollars?)/i,
  cm: /(?:\bcm\b|厘米|公分)/i,
  m: /(?:\bm\b|米)/i,
  "cm^2": /(?:cm\s*(?:\^?2|²)|平方厘米)/i,
  "m^2": /(?:(?:^|[^a-z])m\s*(?:\^?2|²)|平方米|平方公尺)/i,
  "cm^3": /(?:cm\s*(?:\^?3|³)|立方厘米)/i,
  L: /(?:\bl\b|升|公升)/i,
  mL: /(?:\bml\b|毫升)/i,
  kg: /(?:\bkg\b|千克|公斤)/i,
  degree: /(?:°|degrees?|度)/i
};

const anyUnitPattern = /(?:\bhkd\b|hk\$|\$|\bkg\b|\bcm(?:\s*(?:\^?\d|[²³]))?|\bml\b|\bl\b|\bm(?:\s*(?:\^?\d|[²³]))?|厘米|公分|米|千克|公斤|升|毫升|港元|港幣|元|dollars?|degrees?|度|°)/gi;

function unitMatches(canonicalUnit: string, selectedAnswer: string) {
  const pattern = unitAliases[canonicalUnit] ?? new RegExp(canonicalUnit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return pattern.test(selectedAnswer);
}

function hasWrongUnit(canonicalUnit: string, selectedAnswer: string) {
  const units = selectedAnswer.match(anyUnitPattern) ?? [];
  return units.some((unit) => !unitMatches(canonicalUnit, unit));
}

function matchQuantityUnit(params: Record<string, unknown>, selectedAnswer: string) {
  const canonicalAnswer = typeof params.canonicalAnswer === "string" ? params.canonicalAnswer : "";
  const canonicalUnit = typeof params.canonicalUnit === "string" ? params.canonicalUnit : "";
  if (!canonicalAnswer || !canonicalUnit || !selectedAnswer.trim()) return false;
  const permitsConvertibleCentimetres = canonicalUnit === "m" && params.expectedDimension === "length" &&
    unitMatches("m", selectedAnswer) && unitMatches("cm", selectedAnswer);
  if (!permitsConvertibleCentimetres && hasWrongUnit(canonicalUnit, selectedAnswer)) return false;

  const requiresUnit = params.unitPolicy === "unit-token-required" || params.unitPolicy === "unit-token-required-no-scalar";
  if ((requiresUnit || params.allowBareNumberWhenPromptFixesUnit === false) && !unitMatches(canonicalUnit, selectedAnswer)) {
    return false;
  }

  const canonicalValues = normalizeMath(canonicalAnswer)
    .replace(/\^[23]\b/g, "")
    .match(/[+-]?\d+\s+\d+\s*\/\s*\d+|[+-]?\d+\s*\/\s*\d+|[+-]?\d+(?:\.\d+)?/g) ?? [];
  const expectedValues = canonicalValues;
  if (!expectedValues.length) return matchesSurfaceForms(params, selectedAnswer);
  return expectedValues.every((value) => containsNumericValue(selectedAnswer, value));
}

function matchUnitOnly(params: Record<string, unknown>, selectedAnswer: string) {
  const canonicalUnit = typeof params.canonicalUnit === "string" ? params.canonicalUnit : "";
  if (!canonicalUnit || /\d/.test(normalizeMath(selectedAnswer).replace(/\^\d/g, ""))) return false;
  return unitMatches(canonicalUnit, selectedAnswer) && !hasWrongUnit(canonicalUnit, selectedAnswer);
}

function matchSimplestFraction(params: Record<string, unknown>, selectedAnswer: string) {
  const fraction = parseFraction(selectedAnswer, true);
  const numerator = Number(params.expectedNumerator ?? params.numerator);
  const denominator = Number(params.expectedDenominator ?? params.denominator);
  if (Number.isInteger(numerator) && Number.isInteger(denominator)) {
    return Boolean(fraction && fraction.whole === undefined && fraction.denominator > 0 &&
      fraction.numerator === numerator && fraction.denominator === denominator &&
      gcd(fraction.numerator, fraction.denominator) === 1);
  }

  const response = extractFinalResponse(selectedAnswer);
  const canonical = typeof params.canonicalAnswer === "string" ? params.canonicalAnswer : "";
  const expectedValue = numericValue(canonical);
  const actualValue = numericValue(response);
  if (expectedValue === null || actualValue === null || Math.abs(expectedValue - actualValue) > 1e-9) return false;
  if (/^[+-]?\d+$/.test(normalizeMath(response))) return /^[+-]?\d+$/.test(normalizeMath(canonical));
  if (!fraction || gcd(fraction.numerator, fraction.denominator) !== 1) return false;
  return true;
}

function matchMixedNumber(params: Record<string, unknown>, selectedAnswer: string) {
  const fraction = parseFraction(selectedAnswer);
  if (!fraction || fraction.whole === undefined) return false;
  const whole = Number(params.whole);
  const numerator = Number(params.numerator);
  const denominator = Number(params.denominator);
  return fraction.whole === whole && fraction.numerator === numerator && fraction.denominator === denominator &&
    numerator < denominator && gcd(numerator, denominator) === 1;
}

function matchImproperFraction(params: Record<string, unknown>, selectedAnswer: string) {
  const fraction = parseFraction(selectedAnswer);
  if (!fraction || fraction.whole !== undefined) return false;
  const numerator = Number(params.numerator);
  const denominator = Number(params.denominator);
  return fraction.numerator === numerator && fraction.denominator === denominator && numerator > denominator &&
    gcd(numerator, denominator) === 1;
}

function matchIntegerOrReducedFraction(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer).trim();
  if (/^[+-]?\d+$/.test(normalized)) {
    const targetNumerator = Number(params.targetNumerator);
    const targetDenominator = Number(params.targetDenominator);
    if (Number.isFinite(targetNumerator) && Number.isFinite(targetDenominator)) {
      return Number(normalized) === targetNumerator / targetDenominator;
    }
    const canonical = typeof params.canonicalAnswer === "string" ? numericValue(params.canonicalAnswer) : null;
    return canonical !== null && Number(normalized) === canonical;
  }

  const fraction = parseFraction(extractFinalResponse(selectedAnswer));
  if (!fraction || gcd(fraction.numerator, fraction.denominator) !== 1) return false;
  if (typeof params.canonicalAnswer === "string") {
    const expected = numericValue(params.canonicalAnswer);
    const actual = numericValue(extractFinalResponse(selectedAnswer));
    return expected !== null && actual !== null && Math.abs(expected - actual) < 1e-9;
  }
  return fraction.numerator === Number(params.targetNumerator) && fraction.denominator === Number(params.targetDenominator);
}

function matchReducedMixedOrImproper(params: Record<string, unknown>, selectedAnswer: string) {
  const response = extractFinalResponse(selectedAnswer);
  const fraction = parseFraction(response);
  if (!fraction || gcd(fraction.numerator, fraction.denominator) !== 1) return false;
  return stringArray(params.acceptedSurfaceForms).some((form) => compact(form) === compact(response));
}

type PrimePowers = Map<number, number>;

function isPrime(value: number) {
  if (!Number.isSafeInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function parsePrimePowers(value: string, requireExponentForRepeated: boolean): PrimePowers | null {
  const normalized = compact(value).replace(/^\((.*)\)$/, "$1");
  if (!normalized || !/[\^*]/.test(normalized)) return null;
  const factors = normalized.split("*");
  const powers: PrimePowers = new Map();
  for (const factor of factors) {
    const match = factor.match(/^(\d+)(?:\^([1-9]\d*))?$/);
    if (!match) return null;
    const base = Number(match[1]);
    const exponent = Number(match[2] ?? 1);
    if (!isPrime(base)) return null;
    if (requireExponentForRepeated && powers.has(base)) return null;
    powers.set(base, (powers.get(base) ?? 0) + exponent);
  }
  return powers;
}

function expectedPrimePowers(params: Record<string, unknown>) {
  if (isRecord(params.expectedPrimePowers)) {
    return new Map(Object.entries(params.expectedPrimePowers).map(([base, exponent]) => [Number(base), Number(exponent)]));
  }
  const source = typeof params.canonicalAnswer === "string"
    ? params.canonicalAnswer
    : stringArray(params.acceptedSurfaceForms).find((form) => /[\^×*]|\\times/.test(form));
  return source ? parsePrimePowers(source, false) : null;
}

function primePowersEqual(left: PrimePowers | null, right: PrimePowers | null) {
  if (!left || !right || left.size !== right.size) return false;
  for (const [base, exponent] of left) if (right.get(base) !== exponent) return false;
  return true;
}

function matchPrimePowerContract(params: Record<string, unknown>, selectedAnswer: string) {
  const response = extractFinalResponse(selectedAnswer);
  if (stringArray(params.acceptedSurfaceForms).some((form) => compact(form) === compact(response))) return true;
  const expected = expectedPrimePowers(params);
  const actual = parsePrimePowers(response, params.requireExponentNotationForRepeatedFactors === true || params.requireExponentialNotationForRepeatedFactors === true);
  return primePowersEqual(expected, actual);
}

function matchCompletePrimeProduct(params: Record<string, unknown>, selectedAnswer: string) {
  return matchesSurfaceForms(params, selectedAnswer);
}

function matchDecimal(params: Record<string, unknown>, selectedAnswer: string) {
  const actual = parseStrictDecimal(extractFinalResponse(selectedAnswer));
  const canonical = typeof params.canonicalAnswer === "string" ? params.canonicalAnswer : String(params.target ?? "");
  const expected = parseStrictDecimal(canonical);
  if (!actual || !expected || Number(actual) !== Number(expected)) return false;
  if (typeof params.exactDecimalPlaces === "number") return actual.split(".")[1].length === params.exactDecimalPlaces;
  if (typeof params.canonicalDecimalPlaces === "number" && params.preserveTrailingZeros === true) {
    return actual.split(".")[1].length === params.canonicalDecimalPlaces;
  }
  return true;
}

function splitParts(value: string) {
  return normalizeMath(value)
    .split(/;|\n|(?=\([a-z]\))/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchMultipart(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  if (typeof params.canonicalAnswer === "string" && compact(extractFinalResponse(selectedAnswer)) === compact(params.canonicalAnswer)) {
    return true;
  }
  const labels = stringArray(params.requiredLabels ?? params.requireLabels);
  const minimum = Number(params.minimumPartCount ?? labels.length ?? 1);
  const parts = splitParts(normalized);
  if (parts.length >= minimum) return true;
  if (labels.length && labels.every((label) => new RegExp(`(?:\\(${label}\\)|\\b${label}\\s*[:.)])`, "i").test(normalized))) {
    return labels.length >= minimum || hasReasonEvidence(selectedAnswer);
  }
  if (minimum <= 1) return true;
  return normalized.includes("=") && normalized.split("=").filter(Boolean).length >= minimum;
}

function matchOrderedList(params: Record<string, unknown>, selectedAnswer: string) {
  const response = extractFinalResponse(selectedAnswer);
  if (matchesSurfaceForms(params, response)) return true;
  const normalized = compact(response);
  return stringArray(params.acceptedSurfaceForms).some((form) => {
    const accepted = compact(form);
    if (normalized.endsWith(accepted)) return true;
    const partB = accepted.lastIndexOf("(b)");
    const separator = accepted.lastIndexOf(";");
    const suffixStart = Math.max(partB === -1 ? -1 : partB + 3, separator);
    const suffix = suffixStart >= 0 ? accepted.slice(suffixStart + (suffixStart === separator ? 1 : 0)) : "";
    return Boolean(suffix && normalized.endsWith(suffix));
  });
}

function tokenSet(value: string) {
  return compact(value)
    .replace(/[()]/g, "")
    .replace(/\band\b|\b和\b/g, ",")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchUnorderedSelect(params: Record<string, unknown>, selectedAnswer: string) {
  const expected = stringArray(params.expectedOptions).length
    ? stringArray(params.expectedOptions).map((item) => compact(item))
    : tokenSet(String(params.canonicalAnswer ?? ""));
  const actual = tokenSet(extractFinalResponse(selectedAnswer));
  if (params.rejectDuplicates === true && new Set(actual).size !== actual.length) return false;
  return actual.length === expected.length && actual.every((item) => expected.includes(item));
}

function matchPair(params: Record<string, unknown>, selectedAnswer: string) {
  if (!matchMultipart({ minimumPartCount: 2 }, selectedAnswer)) return false;
  if (typeof params.canonicalAnswer === "string") return compact(selectedAnswer) === compact(params.canonicalAnswer);
  return false;
}

function matchHcfLcmPair(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(extractFinalResponse(selectedAnswer));
  const hcfSegment = normalized.match(/(?:h\.?c\.?f\.?|g\.?c\.?f\.?|最大公因數)\s*=\s*([^;,]+)/i)?.[1];
  const lcmSegment = normalized.match(/(?:l\.?c\.?m\.?|最小公倍數)\s*=\s*([^;,]+)/i)?.[1];
  if (!hcfSegment || !lcmSegment) return false;
  const finalLabelValue = (segment: string) => segment.match(/(?:^|=)\s*([a-z]|\d+)\s*$/i)?.[1] ?? null;
  const hcf = finalLabelValue(hcfSegment);
  const lcm = finalLabelValue(lcmSegment);
  if (!hcf || !lcm) return false;
  if (typeof params.hcf === "number" && Number(hcf) !== params.hcf) return false;
  if (typeof params.lcm === "number" && Number(lcm) !== params.lcm) return false;
  if (typeof params.canonicalAnswer === "string") {
    const expectedHcfSegment = normalizeMath(params.canonicalAnswer).match(/(?:h\.?c\.?f\.?|g\.?c\.?f\.?)\s*=\s*([^;,]+)/i)?.[1] ?? "";
    const expectedLcmSegment = normalizeMath(params.canonicalAnswer).match(/l\.?c\.?m\.?\s*=\s*([^;,]+)/i)?.[1] ?? "";
    const expectedHcf = finalLabelValue(expectedHcfSegment);
    const expectedLcm = finalLabelValue(expectedLcmSegment);
    if (expectedHcf && hcf.toLowerCase() !== expectedHcf.toLowerCase()) return false;
    if (expectedLcm && lcm.toLowerCase() !== expectedLcm.toLowerCase()) return false;
  }
  return true;
}

function matchParenthesizedEquation(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = compact(selectedAnswer);
  const target = Number(params.target);
  const expression = normalized.split("=")[0];
  if ((expression.match(/\(/g) ?? []).length !== Number(params.requiredParenthesisPairs ?? 1)) return false;
  const sourceTokens = stringArray(params.sourceTokens).join("");
  if (expression.replace(/[()]/g, "") !== sourceTokens) return false;
  if (!/^[\d+\-*/().]+$/.test(expression)) return false;
  try {
    // The character whitelist above makes this arithmetic-only evaluation.
    const value = Function(`"use strict"; return (${expression})`)() as unknown;
    if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value - target) > 1e-9) return false;
  } catch {
    return false;
  }
  if (normalized.includes("=") && Number(normalized.split("=")[1]) !== target) return false;
  return true;
}

function hasDecision(value: string, expected: string | boolean) {
  const normalized = normalizeMath(value);
  const wantsYes = expected === true || /^(?:yes|agree)$/i.test(String(expected));
  const yes = /(?:\byes\b|\bagree\b|(?<!不)同意|(?<!不)會|(?<!不)可以)/i.test(normalized);
  const no = /(?:\bno\b|\bdisagree\b|不同意|不會|不能|不可以|否)/i.test(normalized);
  return wantsYes ? yes && !no : no && !yes;
}

function hasReasonEvidence(value: string) {
  const normalized = normalizeMath(value);
  return /(?:because|since|therefore|so\b|reason|因為|由於|所以|因此|depends|取決|只有|other than|除了|divisible|整除|factor|因數|公因數|equal sides|等邊|四邊)/i.test(normalized);
}

function matchDecisionWithReason(params: Record<string, unknown>, selectedAnswer: string) {
  if (!hasDecision(selectedAnswer, String(params.expectedDecision ?? "")) || !hasReasonEvidence(selectedAnswer)) return false;
  const normalized = normalizeMath(selectedAnswer);
  const concepts = stringArray(params.acceptedReasonConcepts);
  if (concepts.includes("last-three-digits-divisible-by-8")) return /(?:last three|末三|後三)/i.test(normalized) && /512/.test(normalized) && /(?:8|八)/.test(normalized);
  if (concepts.includes("last-two-digits-00-divisible-by-4")) return /(?:last two|末兩|後兩)/i.test(normalized) && /00/.test(normalized) && /(?:4|四)/.test(normalized);
  if (concepts.includes("hcf-is-greatest-common-factor")) return /(?:greatest|highest|最大)/i.test(normalized) && /(?:common factor|公因數)/i.test(normalized);
  return true;
}

function matchOpenExplanation(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  if (params.concept === "coprime") {
    return /(?:coprime|互質)/i.test(normalized) && /(?:no .*common factor.*(?:other than|except).*1|only .*common factor.*1|除了\s*1.*公因數|公因數.*只有\s*1|除.*1.*無.*公因數)/i.test(normalized);
  }
  if (params.concept === "square-is-rhombus-because-four-sides-equal") {
    return /(?:square|正方形)/i.test(normalized) && /(?:rhombus|菱形)/i.test(normalized) && /(?:four equal sides|four sides.*equal|四邊.*相等|四條邊.*相等)/i.test(normalized);
  }
  return hasReasonEvidence(selectedAnswer);
}

function matchClassificationReason(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  const classification = String(params.expectedClassification ?? params.classification ?? "");
  if (classification === "neither") {
    return /(?:neither.*prime.*composite|neither.*composite.*prime|既不是質數也不是合成數|非質數.*非合成數)/i.test(normalized) &&
      /(?:only one positive factor|one positive factor|只有一個正因數|一個正因數)/i.test(normalized);
  }
  return hasReasonEvidence(selectedAnswer);
}

function integerTokens(value: string) {
  return (normalizeMath(value).match(/(?<![.^])\b\d+\b(?!\s*\^)/g) ?? []).map(Number);
}

function matchFactorsClassification(params: Record<string, unknown>, selectedAnswer: string, requireReason: boolean) {
  const expected = numberArray(params.expectedFactors ?? params.expectedIntegers);
  const classification = String(params.classification ?? "");
  const normalized = normalizeMath(selectedAnswer);
  const factorNumbers = new Set(integerTokens(normalized));
  if (!expected.length || expected.some((value) => !factorNumbers.has(value))) return false;
  if ([...factorNumbers].some((value) => !expected.includes(value))) return false;
  if (classification === "prime" && !/(?:\bprime\b|質數)/i.test(normalized)) return false;
  if (classification === "composite" && !/(?:\bcomposite\b|合成數)/i.test(normalized)) return false;
  if (classification === "prime" && /(?:\bcomposite\b|合成數)/i.test(normalized)) return false;
  if (classification === "composite" && /(?:\bprime\b|質數)/i.test(normalized)) return false;
  if (!requireReason) return true;
  if (classification === "prime") {
    return /(?:only.*factors?|exactly\s+two.*factors?|只有.*因數|因數.*只有|兩個正因數)/i.test(normalized);
  }
  return /(?:more than\s+two.*factors?|nontrivial factors?|factor pairs?|超過兩個.*因數|因數對)/i.test(normalized);
}

function matchMultipartIntegerSets(params: Record<string, unknown>, selectedAnswer: string) {
  if (!isRecord(params.expectedByPart)) return false;
  const normalized = normalizeMath(selectedAnswer);
  const labels = stringArray(params.requireLabels);
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const next = labels[index + 1];
    const pattern = new RegExp(`\\(${label}\\)([\\s\\S]*?)${next ? `(?=\\(${next}\\))` : "$"}`, "i");
    const match = normalized.match(pattern);
    if (!match) return false;
    const actual = integerTokens(match[1]);
    const expected = numberArray(params.expectedByPart[label]);
    if (actual.length !== expected.length || actual.some((value) => !expected.includes(value))) return false;
  }
  return true;
}

function matchExpressionAndResult(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = compact(selectedAnswer);
  const [left, right, ...extra] = normalized.split("=");
  if (!left || !right || extra.length || Number(right) !== Number(params.result)) return false;
  const operands = numberArray(params.operands);
  const operator = String(params.operator);
  const token = operator === "addition" ? "+" : operator === "subtraction" ? "-" : operator === "multiplication" ? "*" : "/";
  const parts = left.split(token).map(Number);
  if (parts.length !== 2 || parts.some((value) => !Number.isFinite(value))) return false;
  const direct = parts[0] === operands[0] && parts[1] === operands[1];
  const swapped = params.allowCommutativeOrder === true && parts[0] === operands[1] && parts[1] === operands[0];
  return direct || swapped;
}

function matchUnevaluatedExpression(params: Record<string, unknown>, selectedAnswer: string) {
  if (normalizeMath(selectedAnswer).includes("=")) return false;
  if (matchesSurfaceForms(params, selectedAnswer)) return true;
  const operands = numberArray(params.operands);
  if (operands.length !== 2) return false;
  const operator = String(params.operator ?? "");
  const token = operator === "addition" ? "+" : operator === "subtraction" ? "-" : operator === "multiplication" ? "*" : operator === "division" ? "/" : "";
  return Boolean(token) && compact(selectedAnswer) === `${operands[0]}${token}${operands[1]}`;
}

function matchPlaceValuePair(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  if (typeof params.expectedPlace === "string" && !stringArray(params.acceptedPlaceAliases).some((alias) => normalized.includes(normalizeMath(alias)))) return false;
  if (typeof params.expectedValue === "string" && !containsNumericValue(selectedAnswer, params.expectedValue) &&
      !(typeof params.equivalentFractionValue === "string" && compact(selectedAnswer).includes(compact(params.equivalentFractionValue)))) return false;
  if (typeof params.canonicalAnswer === "string" && !params.expectedPlace) return compact(selectedAnswer) === compact(params.canonicalAnswer);
  return true;
}

function matchWorkedReference(params: Record<string, unknown>, selectedAnswer: string) {
  const finalAnswer = typeof params.finalAnswer === "string" ? params.finalAnswer : "";
  const reference = typeof params.referenceWorkingEn === "string" ? params.referenceWorkingEn : "";
  if (finalAnswer && compact(selectedAnswer) === compact(finalAnswer) && !/[=*]/.test(normalizeMath(finalAnswer))) return false;
  if (reference && compact(selectedAnswer).includes(compact(reference))) return true;

  const normalized = normalizeMath(selectedAnswer);
  if (params.method === "short-division") {
    const colonLadder = parseColonShortDivisionLadder(normalized);
    if (colonLadder) return colonLadder;
    return /(?:\/|短除)/.test(normalized) && /→/.test(normalized) && !/→\s*999/.test(normalized) &&
      (/(?:h\.?c\.?f\.?|最大公因數)/i.test(normalized) || /(?:l\.?c\.?m\.?|最小公倍數)/i.test(normalized));
  }
  if (params.method === "prime-factorization") {
    const decompositions = [...normalized.matchAll(/(?<![0-9^*])\b(\d+)\s*=\s*([0-9^*\s]+)/g)];
    const validDecompositions = decompositions.filter((match) => {
      const expected = Number(match[1]);
      const expression = match[2].split(/h\.?c\.?f\.?|l\.?c\.?m\.?|therefore|因此/i)[0].trim();
      const powers = parsePrimePowers(expression, false);
      if (!powers) return false;
      let actual = 1;
      for (const [base, exponent] of powers) actual *= base ** exponent;
      return actual === expected;
    });
    const sourceLabelledParts = /\(b\)/i.test(normalized) && /\(c\)/i.test(normalized);
    return validDecompositions.length >= (sourceLabelledParts ? 1 : 2) &&
      /(?:h\.?c\.?f\.?|最大公因數)/i.test(normalized);
  }
  return /(?:=|working|reason|因為|所以|短除|factor pairs?|因數對)/i.test(normalized);
}

function parseColonShortDivisionLadder(selectedAnswer: string) {
  const normalized = compact(selectedAnswer);
  const initial = normalized.match(/^\(?([0-9]+(?:,[0-9]+)+)\)?/);
  if (!initial) return false;

  let current = initial[1].split(",").map(Number);
  const divisors: number[] = [];
  const commonDivisors: number[] = [];
  const transitionPattern = /→([0-9]+):\(?([0-9]+(?:,[0-9]+)+)\)?/g;
  for (const transition of normalized.matchAll(transitionPattern)) {
    const divisor = Number(transition[1]);
    const next = transition[2].split(",").map(Number);
    if (!isPrime(divisor) || next.length !== current.length || !current.some((value) => value % divisor === 0)) return false;
    const expectedNext = current.map((value) => value % divisor === 0 ? value / divisor : value);
    if (next.some((value, index) => value !== expectedNext[index])) return false;
    divisors.push(divisor);
    if (current.every((value) => value % divisor === 0)) commonDivisors.push(divisor);
    current = next;
  }
  if (!divisors.length) return false;

  const product = (values: number[]) => values.reduce((result, value) => result * value, 1);
  const hcfSegment = normalized.match(/(?:h\.?c\.?f\.?|最大公因數)=([^;,]+)/i)?.[1];
  const lcmSegment = normalized.match(/(?:l\.?c\.?m\.?|最小公倍數)=([^;,]+)/i)?.[1];
  const finalValue = (segment: string | undefined) => Number(segment?.match(/(?:^|=)(\d+)$/)?.[1] ?? Number.NaN);
  if (hcfSegment && finalValue(hcfSegment) !== product(commonDivisors)) return false;
  if (lcmSegment && finalValue(lcmSegment) !== product(divisors)) return false;
  if (!hcfSegment && !lcmSegment) return false;
  return true;
}

function matchWorkedFormula(params: Record<string, unknown>, selectedAnswer: string) {
  if (typeof params.finalAnswer === "string" && compact(selectedAnswer) === compact(params.finalAnswer)) return false;
  if (!/[=*+\-/]/.test(normalizeMath(selectedAnswer))) return false;
  const method = String(params.method ?? "");
  if (method === "rectangle-area-formula") return /(?:area|面積)/i.test(selectedAnswer) && /15\s*[*×]\s*6\s*=\s*90/.test(normalizeMath(selectedAnswer));
  if (method === "square-area-formula") return /(?:area|面積)/i.test(selectedAnswer) && /7\s*[*×]\s*7\s*=\s*49/.test(normalizeMath(selectedAnswer));
  return true;
}

function matchWorkedProperty(params: Record<string, unknown>, selectedAnswer: string) {
  if (!matchWorkedReference(params, selectedAnswer)) return false;
  const normalized = normalizeMath(selectedAnswer);
  if (!/(?:commutative|交換)/i.test(normalized) || !/(?:associative|結合)/i.test(normalized)) return false;

  const requiredEvidence = stringArray(params.requiredRearrangementEvidence);
  if (requiredEvidence.length && requiredEvidence.some((evidence) => !compact(normalized).includes(compact(evidence)))) {
    return false;
  }

  const equalityChainPattern = /[0-9](?:[0-9\s*()+\-/^.]*=[0-9\s*()+\-/^.]*)+[0-9]/g;
  const selectedChains = normalized.match(equalityChainPattern)?.map(compact) ?? [];
  const reference = typeof params.referenceWorkingEn === "string" ? normalizeMath(params.referenceWorkingEn) : "";
  const referenceChains = reference.match(equalityChainPattern)?.map(compact) ?? [];
  if (referenceChains.length) {
    return selectedChains.length === 1 && referenceChains.length === 1 && selectedChains[0] === referenceChains[0];
  }
  return requiredEvidence.length > 0;
}

function matchWorkedFactorEnumeration(params: Record<string, unknown>, selectedAnswer: string) {
  if (compact(selectedAnswer) === compact(String(params.finalAnswer ?? ""))) return false;
  const normalized = normalizeMath(selectedAnswer);
  return ["1*48", "2*24", "3*16", "4*12", "6*8"].every((pair) => compact(normalized).includes(pair));
}

function matchStructuredDivisibility(params: Record<string, unknown>, selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  return hasDecision(selectedAnswer, false) && /(?:last two|final two|末兩|後兩)/i.test(normalized) &&
    normalized.includes(String(params.relevantSuffix)) && /(?:not.*divisible|not.*multiple|不能.*整除|不可.*整除|不是.*倍數)/i.test(normalized);
}

function matchPrimeFactorizationPlusHcf(params: Record<string, unknown>, selectedAnswer: string) {
  if (!isRecord(params.factorization) || !isRecord(params.requiredLabels)) return false;
  const normalized = normalizeMath(selectedAnswer);
  const factorLabel = String(params.requiredLabels.factorization);
  const hcfLabel = String(params.requiredLabels.hcf);
  if (!new RegExp(`\\(${factorLabel}\\)`, "i").test(normalized) || !new RegExp(`\\(${hcfLabel}\\)`, "i").test(normalized)) return false;
  const expected = new Map(Object.entries(params.factorization).map(([base, exponent]) => [Number(base), Number(exponent)]));
  const factorSection = normalized.match(new RegExp(`\\(${factorLabel}\\)([\\s\\S]*?)(?=\\(${hcfLabel}\\))`, "i"))?.[1] ?? "";
  const factorExpression = factorSection
    .replace(/^\s*[:=]?\s*/, "")
    .trim()
    .replace(/[;,]+$/, "")
    .split("=")
    .at(-1) ?? "";
  const actual = parsePrimePowers(factorExpression, true);
  return primePowersEqual(expected, actual) && containsNumericValue(normalized.match(new RegExp(`\\(${hcfLabel}\\)([\\s\\S]*)$`, "i"))?.[1] ?? "", String(params.hcf));
}

function matchClockTime(params: Record<string, unknown>, selectedAnswer: string) {
  return typeof params.canonicalAnswer === "string" && compact(selectedAnswer) === compact(params.canonicalAnswer);
}

function matchWorkedQuantityComparison(selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  if (!hasDecision(selectedAnswer, false) || /\bkg\b|千克|公斤/i.test(selectedAnswer)) return false;
  const hasBlueCalculation = /(?:2\s*\(?\s*\*?\s*4\.5|4\.5\s*\*\s*2)/i.test(normalized);
  const hasBlueWorking = hasBlueCalculation && /9\s*m/i.test(normalized);
  const hasRedCalculation = /(?:3\s*\(?\s*\*?\s*(?:1\.2|120)|(?:1\.2|120)\s*\*\s*3)/i.test(normalized);
  const hasRedWorking = hasRedCalculation && /(?:3\.6\s*m|360\s*cm)/i.test(normalized);
  const hasDifference = /9\s*-\s*3\.6\s*=\s*5\.4\s*m/i.test(normalized) || /相差\s*5\.4\s*m/i.test(normalized);
  const comparesSix = /(?:not|不是)\s*6\s*m/i.test(normalized);
  return hasBlueWorking && hasRedWorking && hasDifference && comparesSix;
}

function matchMultipartQuantityDecision(selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer);
  if (!/\(a\)/i.test(normalized) || !/\(b\)/i.test(normalized) || hasWrongUnit("kg", selectedAnswer)) return false;
  if (!hasDecision(selectedAnswer, false)) return false;
  const hasTotal = /(?:27\s*\/\s*10|2\.7)\s*kg/i.test(normalized);
  const hasRemaining = /(?:9\s*\/\s*10|0\.9)\s*kg/i.test(normalized);
  const hasComparison = /(?:<\s*1\s*kg|less than\s*1\s*kg|小於\s*1\s*kg)/i.test(normalized);
  return hasTotal && hasRemaining && hasComparison;
}

type ExactClassifiedFractionGroups = readonly [
  readonly [string, string],
  readonly [string, string],
  readonly [string, string]
];

const exactClassifiedFractionGroupsByBaseId: Readonly<
  Record<"hk-ease-10481" | "hk-ease-10496", ExactClassifiedFractionGroups>
> = {
  "hk-ease-10481": [
    ["3/5", "11/12"],
    ["7/4", "9/9"],
    ["2 1/3", "5 2/7"]
  ],
  "hk-ease-10496": [
    ["4/7", "13/15"],
    ["11/5", "8/8"],
    ["3 1/2", "6 4/9"]
  ]
};

function exactFractionRepresentation(value: string) {
  const normalized = normalizeMath(value).trim();
  const mixed = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return `${mixed[1]} ${mixed[2]}/${mixed[3]}`;
  const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  return fraction ? `${fraction[1]}/${fraction[2]}` : null;
}

function exactFractionRepresentationList(value: string) {
  const parts = normalizeMath(value)
    .split(/\s*(?:,|\band\b|和)\s*/iu)
    .filter(Boolean);
  if (!parts.length) return null;
  const representations = parts.map(exactFractionRepresentation);
  return representations.every((item): item is string => item !== null) ? representations : null;
}

function exactUnorderedRepresentationsMatch(actual: string[] | null, expected: readonly string[]) {
  return Boolean(
    actual &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((item) => expected.includes(item))
  );
}

function matchExactClassifiedFractionGroups(
  expected: ExactClassifiedFractionGroups,
  selectedAnswer: string
) {
  const normalized = normalizeMath(selectedAnswer).replace(/[。.]$/, "").trim();
  const english = normalized.match(
    /^\(a\)\s*proper\s+fractions\s*:\s*([\s\S]*?)\s*;\s*\(b\)\s*improper\s+fractions\s*:\s*([\s\S]*?)\s*;\s*\(c\)\s*mixed\s+numbers\s*:\s*([\s\S]*?)$/i
  );
  const chinese = normalized.match(
    /^\(a\)\s*真分數\s*:\s*([\s\S]*?)\s*;\s*\(b\)\s*假分數\s*:\s*([\s\S]*?)\s*;\s*\(c\)\s*帶分數\s*:\s*([\s\S]*?)$/
  );
  const groups = english ?? chinese;
  if (!groups) return false;
  return expected.every((representations, index) =>
    exactUnorderedRepresentationsMatch(
      exactFractionRepresentationList(groups[index + 1] ?? ""),
      representations
    )
  );
}

const exactDivisibilityMatrix = [
  [false, true, false],
  [true, true, true],
  [true, false, false],
  [true, true, true],
  [false, true, false],
  [true, true, true]
] as const;

function exactBooleanDecision(value: string): boolean | null {
  const normalized = normalizeMath(value).trim();
  if (normalized === "yes" || normalized === "是" || normalized === "✓") return true;
  if (normalized === "no" || normalized === "否" || normalized === "✗") return false;
  return null;
}

function matchExactDivisibilityMatrix(selectedAnswer: string) {
  const normalized = normalizeMath(selectedAnswer).replace(/[。.]$/, "").trim();
  const match = normalized.match(
    /^\(a\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(b\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(c\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(d\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(e\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(f\)\s*:?\s*([^;\n]+)$/
  );
  if (!match) return false;
  return exactDivisibilityMatrix.every((expected, rowIndex) => {
    const decisions = (match[rowIndex + 1] ?? "")
      .split(/\s*,\s*/)
      .map(exactBooleanDecision);
    return decisions.length === expected.length &&
      decisions.every((decision, columnIndex) => decision === expected[columnIndex]);
  });
}

/**
 * Pure exact-row semantics for the three production-repair rows. This is
 * intentionally separate from the live strict-contract dispatcher until the
 * history-safe successor artifacts are promoted as one atomic slice.
 */
export function hongKongEaseExact3SemanticResponseDecision(
  baseId: string,
  selectedAnswer: string
): boolean | null {
  if (baseId === "hk-ease-1041") return matchExactDivisibilityMatrix(selectedAnswer);
  if (baseId === "hk-ease-10481" || baseId === "hk-ease-10496") {
    return matchExactClassifiedFractionGroups(
      exactClassifiedFractionGroupsByBaseId[baseId],
      selectedAnswer
    );
  }
  return null;
}

function matchContract(contract: Contract, selectedAnswer: string): boolean {
  if (!selectedAnswer.trim()) return false;
  const { kind, params } = contract;

  if (kind === "all-of") {
    const contracts = Array.isArray(params.contracts) ? params.contracts.filter(isContract) : [];
    return contracts.length > 0 && contracts.length === (params.contracts as unknown[]).length &&
      contracts.every((candidate) => matchContract(candidate, selectedAnswer));
  }

  if (kind === "any-of") {
    const contracts = Array.isArray(params.contracts) ? params.contracts.filter(isContract) : [];
    return contracts.length > 0 && contracts.length === (params.contracts as unknown[]).length &&
      contracts.some((candidate) => matchContract(candidate, selectedAnswer));
  }

  if (kind === "reviewed-exact-surface-forms") {
    return matchesReviewedExactSurfaceForm(params, selectedAnswer);
  }

  if (isHongKongEaseWorkedResponseContractKind(kind) && "inputs" in params) {
    const workedInput = selectedAnswer.replace(/\((\d+(?:\s*,\s*\d+)+)\)/g, "$1");
    return matchesHongKongEaseWorkedResponseContract(contract, workedInput) ||
      matchesDeterministicWorkedReferenceProbe(params, selectedAnswer);
  }

  switch (kind) {
    case "parenthesized-equation":
      return matchParenthesizedEquation(params, selectedAnswer);
    case "quantity-unit":
      return matchQuantityUnit(params, selectedAnswer);
    case "unit-only":
      return matchUnitOnly(params, selectedAnswer);
    case "simplest-fraction":
      return matchSimplestFraction(params, selectedAnswer);
    case "mixed-number-only":
      return matchMixedNumber(params, selectedAnswer);
    case "improper-fraction-only":
      return matchImproperFraction(params, selectedAnswer);
    case "integer-only":
      return /^[+-]?\d+$/.test(normalizeMath(extractFinalResponse(selectedAnswer))) && matchesSurfaceForms(params, selectedAnswer);
    case "integer-or-simplest-fraction":
      return matchIntegerOrReducedFraction(params, selectedAnswer);
    case "reduced-mixed-or-improper-fraction":
      return matchReducedMixedOrImproper(params, selectedAnswer);
    case "decimal-notation":
    case "fixed-decimal-representation":
      return matchDecimal(params, selectedAnswer);
    case "multipart-response":
      return matchMultipart(params, selectedAnswer);
    case "estimate-and-exact-pair":
    case "quotient-remainder-pair":
      return matchPair(params, selectedAnswer);
    case "ordered-complete-list":
    case "classified-number-groups":
      return matchOrderedList(params, selectedAnswer);
    case "unordered-multi-select":
      return matchUnorderedSelect(params, selectedAnswer);
    case "hcf-lcm-pair":
      return matchHcfLcmPair(params, selectedAnswer);
    case "classification-with-reason":
      return matchClassificationReason(params, selectedAnswer);
    case "decision-with-reason":
      return matchDecisionWithReason(params, selectedAnswer);
    case "open-concept-explanation":
      return matchOpenExplanation(params, selectedAnswer);
    case "clock-time":
      return matchClockTime(params, selectedAnswer);
    case "worked-property-calculation":
      return matchWorkedProperty(params, selectedAnswer);
    case "worked-formula":
      return matchWorkedFormula(params, selectedAnswer);
    case "worked-prime-factorization":
    case "worked-short-division":
      return matchWorkedReference(params, selectedAnswer);
    case "worked-calculation":
      return matchWorkedQuantityComparison(selectedAnswer);
    case "worked-factor-enumeration":
      return matchWorkedFactorEnumeration(params, selectedAnswer);
    case "factors-classification-reason":
      return matchFactorsClassification(params, selectedAnswer, true);
    case "factors-with-classification":
      return matchesSurfaceForms(params, selectedAnswer) || matchFactorsClassification({
        expectedFactors: integerTokens(String(params.canonicalAnswer ?? "")),
        classification: /composite/i.test(String(params.canonicalAnswer ?? "")) ? "composite" : "prime"
      }, selectedAnswer, false);
    case "unordered-integer-set-with-classification":
      return matchFactorsClassification(params, selectedAnswer, false);
    case "multipart-unordered-integer-sets":
      return matchMultipartIntegerSets(params, selectedAnswer);
    case "index-notation":
    case "prime-factorization-index-notation":
    case "commutative-prime-power-product":
      return matchPrimePowerContract(params, selectedAnswer);
    case "complete-prime-factor-product":
      return matchCompletePrimeProduct(params, selectedAnswer);
    case "prime-factorization-plus-hcf":
      return matchPrimeFactorizationPlusHcf(params, selectedAnswer);
    case "unevaluated-expression":
      return matchUnevaluatedExpression(params, selectedAnswer);
    case "expression-and-result":
      return matchExpressionAndResult(params, selectedAnswer);
    case "superscript-before-nfkc":
      return Boolean(normalizeMath(selectedAnswer));
    case "place-value-pair":
      return matchPlaceValuePair(params, selectedAnswer);
    case "structured-divisibility-explanation":
      return matchStructuredDivisibility(params, selectedAnswer);
    case "worked-quantity-comparison":
    case "decision-with-calculation":
      return matchWorkedQuantityComparison(selectedAnswer);
    case "multipart-quantity-decision-reason":
    case "multipart-quantity-decision-with-working":
      return matchMultipartQuantityDecision(selectedAnswer);
    default:
      return false;
  }
}

function strictBaseIdFor(questionId: string | undefined) {
  if (!questionId) return null;
  const match = questionId.match(/^(hk-ease-\d+)(?:-v\d+)?$/);
  return match?.[1] && contractByBaseId.has(match[1]) ? match[1] : null;
}

function simpleBaseIdFor(questionId: string | undefined) {
  if (!questionId) return null;
  const match = questionId.match(/^(hk-ease-\d+)(?:-v\d+)?$/);
  return match?.[1] && simpleResponseByBaseId.has(match[1]) ? match[1] : null;
}

/**
 * Returns null only when the ID is outside the reviewed-simple EASE surface.
 * A boolean decision is final and must not fall through to generic matching.
 */
export function hongKongEaseReviewedSimpleResponseDecision(
  questionId: string | undefined,
  selectedAnswer: string
): boolean | null {
  const baseId = simpleBaseIdFor(questionId);
  if (!baseId) return null;
  if (questionId !== activeQuestionIdForBaseId(baseId)) return false;
  const contract = simpleResponseByBaseId.get(baseId);
  if (!contract) return null;
  const selected = normalizeReviewedSimpleSurface(selectedAnswer);
  if (contract.reviewedSurfaces.some(
    (surface) => normalizeReviewedSimpleSurface(surface) === selected
  )) return true;
  if (contract.fractionRepresentationPolicy) {
    const selectedFraction = reviewedFractionParts(selectedAnswer);
    return Boolean(
      selectedFraction &&
      selectedFraction.numerator * contract.fractionRepresentationPolicy.denominator ===
        contract.fractionRepresentationPolicy.numerator * selectedFraction.denominator
    );
  }
  return false;
}

function activeQuestionIdForBaseId(baseId: string) {
  return hongKongQuestionVersionManifest.activeIdByHistoricalId[baseId] ?? baseId;
}

export function isReviewedSimpleHongKongEaseResponseQuestion(questionId: string | undefined) {
  const baseId = simpleBaseIdFor(questionId);
  return Boolean(baseId && questionId === activeQuestionIdForBaseId(baseId));
}

export function reviewedSimpleHongKongEaseResponseEntries() {
  return [...simpleResponseByBaseId.entries()] as Array<
    readonly [string, ReviewedSimpleResponseManifest["entries"][number]]
  >;
}

/**
 * Returns null when no strict EASE contract applies. A boolean result is final:
 * false must never be followed by generic answer or option-text fallback.
 */
export function hongKongEaseResponseContractDecision(
  questionId: string | undefined,
  selectedAnswer: string
): boolean | null {
  const baseId = strictBaseIdFor(questionId);
  if (!baseId) return null;
  if (questionId !== activeQuestionIdByStrictBaseId.get(baseId)) return false;
  const contract = contractByBaseId.get(baseId);
  if (!contract) return null;

  try {
    if (exact3ContractKindByBaseId.has(baseId)) {
      const decision = hongKongEaseExact3SemanticResponseDecision(baseId, selectedAnswer);
      return decision ?? false;
    }
    return matchContract(contract, selectedAnswer);
  } catch {
    return false;
  }
}

export function isStrictHongKongEaseResponseQuestion(questionId: string | undefined) {
  return Boolean(strictBaseIdFor(questionId));
}
