import promotionManifestJson from "@/data/historical/hongKongDisplayed74PromotionManifest.json";

export const HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_REVISION =
  "hk-displayed74-response-contract-v1" as const;
export const HONG_KONG_DISPLAYED74_RENDERER_SEMANTICS_REVISION =
  "p4-number-line-preanswer-no-solution-v1" as const;

export type HongKongDisplayed74PromotionMaterialBindings = {
  question: "question-material-fingerprint-v1";
  responseContractRevision?: typeof HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_REVISION;
  rendererSemanticsRevision?: typeof HONG_KONG_DISPLAYED74_RENDERER_SEMANTICS_REVISION;
};

export type HongKongDisplayed74Promotion = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageMaterialSha256: string;
  successorMaterialSha256: string;
  materialBindings: HongKongDisplayed74PromotionMaterialBindings;
};

type HongKongDisplayed74PromotionManifest = {
  schemaVersion: number;
  preimageSnapshotSha256: string;
  preimageQuestionsPayloadSha256: string;
  preimageVersionManifestSha256: string;
  preimageActiveMappingCount: number;
  preimageRetiredIdCount: number;
  preimageHistoricalUniqueCount: number;
  preimageIdenticalOverlapIds: string[];
  historyUniqueAdditionCount: number;
  promotions: HongKongDisplayed74Promotion[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const EXPECTED_IDENTICAL_OVERLAPS = [
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-guided-example",
  "graph-p4-decimals-number-line"
] as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid HK displayed74 promotion manifest: ${message}`);
}

function expectedGeneration(fromId: string) {
  const v2Match = fromId.match(/^(.*)-v2$/);
  return v2Match
    ? { baseId: v2Match[1], toId: `${v2Match[1]}-v3` }
    : { baseId: fromId, toId: `${fromId}-v2` };
}

function validatePromotionManifest(
  candidate: HongKongDisplayed74PromotionManifest
): readonly HongKongDisplayed74Promotion[] {
  assertCondition(candidate.schemaVersion === 1, "unsupported schemaVersion");
  assertCondition(
    candidate.preimageSnapshotSha256 ===
      "4743173f55ee440912f4b594454bb227d7c21b1e0d533dbb3e17b6c45662efd6",
    "preimage snapshot SHA mismatch"
  );
  assertCondition(
    candidate.preimageQuestionsPayloadSha256 ===
      "673bdd81a8a19d53ff0589a4fdd08841ff58ec2af09930f23b95269c2c64889f",
    "preimage payload SHA mismatch"
  );
  assertCondition(
    candidate.preimageVersionManifestSha256 ===
      "4d930e8cb468b171d97ea5020a6938231dc1fa1b478dcdb2ce12830ab1a78b9c",
    "preimage version-manifest SHA mismatch"
  );
  assertCondition(candidate.preimageActiveMappingCount === 1006, "preimage mapping count mismatch");
  assertCondition(candidate.preimageRetiredIdCount === 1007, "preimage retired count mismatch");
  assertCondition(candidate.preimageHistoricalUniqueCount === 1692, "preimage history count mismatch");
  assertCondition(candidate.historyUniqueAdditionCount === 69, "history delta must be exactly 69");
  assertCondition(
    JSON.stringify(candidate.preimageIdenticalOverlapIds) === JSON.stringify(EXPECTED_IDENTICAL_OVERLAPS),
    "the five pre-existing historical overlaps drifted"
  );
  assertCondition(Array.isArray(candidate.promotions) && candidate.promotions.length === 74, "promotion count must be 74");

  const fromIds = new Set<string>();
  const baseIds = new Set<string>();
  const toIds = new Set<string>();
  let v2ToV3Count = 0;
  let baseToV2Count = 0;
  let identicalQuestionMaterialCount = 0;
  let responseRevisionCount = 0;
  let rendererRevisionCount = 0;

  for (const entry of candidate.promotions) {
    const expected = expectedGeneration(entry.fromId);
    assertCondition(entry.baseId === expected.baseId, `${entry.fromId}: baseId drift`);
    assertCondition(entry.toId === expected.toId, `${entry.fromId}: successor generation drift`);
    assertCondition(!fromIds.has(entry.fromId), `${entry.fromId}: duplicate fromId`);
    assertCondition(!baseIds.has(entry.baseId), `${entry.fromId}: duplicate baseId`);
    assertCondition(!toIds.has(entry.toId), `${entry.fromId}: duplicate toId`);
    fromIds.add(entry.fromId);
    baseIds.add(entry.baseId);
    toIds.add(entry.toId);
    if (/-v2$/.test(entry.fromId)) v2ToV3Count += 1;
    else baseToV2Count += 1;

    assertCondition(SHA256.test(entry.preimageMaterialSha256), `${entry.fromId}: invalid preimage material SHA`);
    assertCondition(SHA256.test(entry.successorMaterialSha256), `${entry.fromId}: invalid successor material SHA`);
    if (entry.preimageMaterialSha256 === entry.successorMaterialSha256) {
      identicalQuestionMaterialCount += 1;
      assertCondition(
        entry.materialBindings.responseContractRevision === HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_REVISION,
        `${entry.fromId}: question-identical promotion lacks an explicit response revision`
      );
    }
    assertCondition(
      entry.materialBindings.question === "question-material-fingerprint-v1",
      `${entry.fromId}: question material binding drift`
    );
    if (entry.materialBindings.responseContractRevision !== undefined) {
      assertCondition(
        entry.materialBindings.responseContractRevision === HONG_KONG_DISPLAYED74_RESPONSE_CONTRACT_REVISION,
        `${entry.fromId}: response revision drift`
      );
      responseRevisionCount += 1;
    }
    if (entry.materialBindings.rendererSemanticsRevision !== undefined) {
      assertCondition(
        entry.fromId === "graph-p4-decimals-number-line" &&
          entry.materialBindings.rendererSemanticsRevision ===
            HONG_KONG_DISPLAYED74_RENDERER_SEMANTICS_REVISION,
        `${entry.fromId}: renderer revision is not the exact P4 contract`
      );
      rendererRevisionCount += 1;
    }
  }

  assertCondition(v2ToV3Count === 63 && baseToV2Count === 11, "generation distribution must be 63 v2-to-v3 plus 11 base-to-v2");
  assertCondition(identicalQuestionMaterialCount === 11, "question-identical response promotions must be exactly 11");
  assertCondition(responseRevisionCount === 13, "response-contract bindings must be exactly 13");
  assertCondition(rendererRevisionCount === 1, "renderer-semantics binding must be exactly one P4 row");
  return candidate.promotions;
}

export const hongKongDisplayed74PromotionManifest =
  promotionManifestJson as HongKongDisplayed74PromotionManifest;

export const hongKongDisplayed74Promotions = validatePromotionManifest(
  hongKongDisplayed74PromotionManifest
);

export const hongKongDisplayed74PromotionByFromId = new Map(
  hongKongDisplayed74Promotions.map((entry) => [entry.fromId, entry] as const)
);

export const hongKongDisplayed74PromotionByBaseId = new Map(
  hongKongDisplayed74Promotions.map((entry) => [entry.baseId, entry] as const)
);

export function hongKongDisplayed74PromotionForId(questionId: string) {
  return hongKongDisplayed74PromotionByFromId.get(questionId) ?? null;
}

export function hongKongDisplayed74PromotionForSourceId(questionId: string) {
  return hongKongDisplayed74PromotionByBaseId.get(questionId)
    ?? hongKongDisplayed74PromotionByFromId.get(questionId)
    ?? null;
}
