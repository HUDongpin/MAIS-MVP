import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import baselineHistoryJson from "@/data/historical/hongKongQuestions-3f8f12c4.json";
import successorHistoryJson from "@/data/historical/hongKongQuestions-a18-exact67.json";
import easeHistoryJson from "@/data/historical/hongKongQuestions-hk-ease-39847.json";
import snapshotJson from "@/data/historical/hongKongQuestions-displayed255-preimage-20260813.json";
import versionManifest from "@/coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92.json";
import { activeHongKongQuestionIdByHistoricalId, questions, retiredHongKongQuestionIds } from "@/data/questions";
import { productionLessonByTopicId } from "@/data/lessons";
import { topics } from "@/data/topics";
import { questionFigureSemanticElements } from "@/components/practice/questionFigureSemantics";
import {
  buildQuestionDiagramSemanticSummary,
  normalizeQuestionDiagram,
  questionDiagramAltText
} from "./questionFigure";
import { selectLessonPracticeQuestions } from "./practiceQuestionDeduping";
import {
  historicalHongKongQuestionForId,
  questionMaterialFingerprint,
  versionMateriallyChangedHongKongQuestions
} from "./hongKongQuestionVersioning";
import { createHongKongDisplayed74Test } from "./hongKongDisplayed74FocusedTestLedger";
import { reverseResidual28VersionManifestPostimage } from "./hongKongResidual28Promotion";
import type { NumberLineQuestionDiagram, Question } from "@/types";

export const HONG_KONG_DISPLAYED74_FIGURE_HISTORY_SUITE_ID =
  "hk-displayed74-figure-history-contract-v1" as const;
const test = createHongKongDisplayed74Test(HONG_KONG_DISPLAYED74_FIGURE_HISTORY_SUITE_ID);

const snapshot = snapshotJson as typeof snapshotJson & { questionsPayloadSha256: string };
const snapshotPath = join(process.cwd(), "data/historical/hongKongQuestions-displayed255-preimage-20260813.json");
const expectedSnapshotSha = "4743173f55ee440912f4b594454bb227d7c21b1e0d533dbb3e17b6c45662efd6";
const expectedPayloadSha = "673bdd81a8a19d53ff0589a4fdd08841ff58ec2af09930f23b95269c2c64889f";
const displayed74IntermediateVersionManifest = {
  schemaVersion: versionManifest.schemaVersion,
  historySourceCommit: versionManifest.historySourceCommit,
  ...reverseResidual28VersionManifestPostimage(
    versionManifest.activeIdByHistoricalId,
    versionManifest.retiredHistoricalIds
  )
};

const immutablePreImplementationHistorySources = [
  {
    path: "data/historical/hongKongQuestions-3f8f12c4.json",
    sha256: "75af1eb004c8834136eed5307b25c229bc050f473638d1cc476dfca7c81593fd",
    expectedCount: 989,
    questions: (baselineHistoryJson as { questions: Question[] }).questions
  },
  {
    path: "data/historical/hongKongQuestions-a18-exact67.json",
    sha256: "2c31f6e054a4201076ef1db5c40642abe927eeb9efdb4883feba35c8141fe2bf",
    expectedCount: 2,
    questions: (successorHistoryJson as { questions: Question[] }).questions
  },
  {
    path: "data/historical/hongKongQuestions-hk-ease-39847.json",
    sha256: "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1",
    expectedCount: 701,
    questions: (easeHistoryJson as { questions: Question[] }).questions
  }
] as const;

const immutablePreImplementationVersionManifestContract = {
  sha256: "4d930e8cb468b171d97ea5020a6938231dc1fa1b478dcdb2ce12830ab1a78b9c",
  activeMappingCount: 1006,
  retiredIdCount: 1007,
  historicalUniqueCount: 1692,
  displayed74IdenticalOverlapCount: 5,
  displayed74UniqueAdditionCount: 69
} as const;

const promotionManifestPath = join(
  process.cwd(),
  "data/historical/hongKongDisplayed74PromotionManifest.json"
);
const promotionModulePath = join(process.cwd(), "lib/hongKongDisplayed74Promotion.ts");

type PromotionMaterialBindings = {
  question: "question-material-fingerprint-v1";
  responseContractRevision?: string;
  rendererSemanticsRevision?: string;
};

type PromotionManifestEntry = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageMaterialSha256: string;
  successorMaterialSha256: string;
  materialBindings: PromotionMaterialBindings;
};

type PromotionManifest = {
  schemaVersion: number;
  preimageSnapshotSha256: string;
  preimageQuestionsPayloadSha256: string;
  preimageVersionManifestSha256: string;
  preimageActiveMappingCount: number;
  preimageRetiredIdCount: number;
  preimageHistoricalUniqueCount: number;
  preimageIdenticalOverlapIds: string[];
  historyUniqueAdditionCount: number;
  promotions: PromotionManifestEntry[];
};

function loadPromotionManifest() {
  assert.equal(
    existsSync(promotionManifestPath),
    true,
    "missing production data/historical/hongKongDisplayed74PromotionManifest.json"
  );
  const parsed = JSON.parse(readFileSync(promotionManifestPath, "utf8")) as PromotionManifest;
  assert.equal(parsed.schemaVersion, 1, "promotion manifest schemaVersion");
  assert.equal(parsed.preimageSnapshotSha256, expectedSnapshotSha);
  assert.equal(parsed.preimageQuestionsPayloadSha256, expectedPayloadSha);
  assert.equal(parsed.preimageVersionManifestSha256, immutablePreImplementationVersionManifestContract.sha256);
  assert.equal(parsed.preimageActiveMappingCount, immutablePreImplementationVersionManifestContract.activeMappingCount);
  assert.equal(parsed.preimageRetiredIdCount, immutablePreImplementationVersionManifestContract.retiredIdCount);
  assert.equal(parsed.preimageHistoricalUniqueCount, immutablePreImplementationVersionManifestContract.historicalUniqueCount);
  assert.deepEqual(parsed.preimageIdenticalOverlapIds, [...exactHistoryOverlaps]);
  assert.equal(parsed.historyUniqueAdditionCount, immutablePreImplementationVersionManifestContract.displayed74UniqueAdditionCount);
  assert.equal(Array.isArray(parsed.promotions), true, "promotion manifest promotions array");
  return parsed;
}

function promotionMap() {
  return new Map(loadPromotionManifest().promotions.map(({ fromId, toId }) => [fromId, toId]));
}

function baseToV2IdSet() {
  return new Set(
    loadPromotionManifest().promotions
      .filter(({ fromId, toId }) => toId === `${fromId}-v2`)
      .map(({ fromId }) => fromId)
  );
}

function affectedMappingKeySet() {
  const affected = new Set<string>();
  for (const { fromId, baseId } of loadPromotionManifest().promotions) {
    affected.add(fromId);
    affected.add(baseId);
  }
  return affected;
}

const exactHistoryOverlaps = [
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-guided-example",
  "graph-p4-decimals-number-line"
] as const;

const adjudicationOverlapIds = [
  "supp-linear-equations-first-step-v2",
  "supp-trigonometry-s5-first-step-v2",
  "supp-differentiation-intro-first-step-v2"
] as const;

const exactForcedPromotionIds = [
  "supp-p3-multiplication-division-guided-example-v2",
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-key-fact-v2",
  "supp-polynomials-guided-example",
  "hk-s3-identities-square-patterns-1",
  "supp-identities-square-patterns-key-fact",
  "q10-v2",
  "supp-differentiation-intro-key-fact-v2",
  "supp-calculus-guided-example-v2"
] as const;

const exactResponseContractRevisionIds = [
  ...exactForcedPromotionIds,
  "supp-p5-volume-key-fact-v2",
  "graph-p4-decimals-number-line"
] as const;

const p4SafeSourceCaption = {
  en: "Number line from 3 to 4 in intervals of 0.1. Point P is on the seventh small tick after 3.",
  zh: "數線由 3 至 4，每小格表示 0.1。點 P 位於 3 之後第七個小刻度。",
  zhHans: "数轴从 3 到 4，每小格表示 0.1。点 P 位于 3 之后第七个小刻度。"
} as const;

type SemanticDisclosurePolicy = {
  kind: "ordinal-tick-position";
  pointLabel: string;
  ordinalTickFromMinimum: number;
  caption: typeof p4SafeSourceCaption;
};

type DisclosureAwareNumberLine = NumberLineQuestionDiagram & {
  semanticDisclosurePolicy?: SemanticDisclosurePolicy;
};

function p4DisclosurePolicy() {
  return {
    kind: "ordinal-tick-position",
    pointLabel: "P",
    ordinalTickFromMinimum: 7,
    caption: p4SafeSourceCaption
  } satisfies SemanticDisclosurePolicy;
}

function expectedNextId(oldId: string) {
  const expected = promotionMap().get(oldId);
  assert.ok(expected, `${oldId}: missing explicit promotion mapping`);
  return expected;
}

function liveRepairedQuestion(oldId: string) {
  const expectedId = expectedNextId(oldId);
  const question = questions.find((candidate) => candidate.id === expectedId);
  assert.ok(question, `${oldId}: missing expected active generation ${expectedId}`);
  return question;
}

test("the exact 74-row preimage snapshot and its final-v2 provenance stay byte locked", () => {
  const fileSha = createHash("sha256").update(readFileSync(snapshotPath)).digest("hex");
  assert.equal(fileSha, expectedSnapshotSha);
  assert.equal(snapshot.questions.length, 74);
  assert.equal(new Set(snapshot.questions.map((question) => question.id)).size, 74);
  assert.equal(snapshot.questionsPayloadSha256, expectedPayloadSha);
  assert.equal(
    createHash("sha256").update(JSON.stringify(snapshot.questions)).digest("hex"),
    expectedPayloadSha
  );
  assert.equal(snapshot.orderedIdListSha256, "fcb17ad572d52be11b4bb7651c6eff17c82bd97d2cee18a6b61fadda86dbfcc0");
  assert.equal(snapshot.sortedIdListSha256, "26d50e2670666468c342d20b1a2f8a04992b06a9fab3274e953bf875afaacf93");
  assert.deepEqual(snapshot.adjudicationSha256, {
    explanation: "d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55",
    response: "e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281",
    responseDecisionV1: "4c7155b9cb854241df3e570ca79465f841ecd49575426f35c608251c7bc9cbe9",
    responseDecisionV2: "bcd65fca1f789a9d9f60f343d13607c099ae044a0379b423b0b84592f843287f"
  });
  assert.deepEqual(snapshot.adjudicationAuthority, {
    responseDecisionV1: "superseded-immutable-audit-record",
    responseDecisionV2: "final-implementation-authority"
  });
});

test("one production promotion manifest binds all 74 exact generations and material revisions", () => {
  const manifest = loadPromotionManifest();
  assert.equal(manifest.promotions.length, 74);
  assert.equal(new Set(manifest.promotions.map(({ fromId }) => fromId)).size, 74);
  assert.equal(new Set(manifest.promotions.map(({ toId }) => toId)).size, 74);
  assert.deepEqual(
    manifest.promotions.map(({ fromId }) => fromId),
    snapshot.questions.map((question) => question.id),
    "the production manifest must preserve the immutable snapshot order"
  );

  const frozenById = new Map(snapshot.questions.map((question) => [question.id, question as Question]));
  let currentV2ToV3 = 0;
  let currentBaseToV2 = 0;
  let questionMaterialChanged = 0;
  let questionMaterialIdentical = 0;
  for (const entry of manifest.promotions) {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ["baseId", "fromId", "materialBindings", "preimageMaterialSha256", "successorMaterialSha256", "toId"],
      `${entry.fromId}: manifest entry keys`
    );
    const fromMatch = entry.fromId.match(/^(.*)-v2$/);
    const expectedBaseId = fromMatch?.[1] ?? entry.fromId;
    const expectedToId = fromMatch ? `${expectedBaseId}-v3` : `${expectedBaseId}-v2`;
    assert.equal(entry.baseId, expectedBaseId, `${entry.fromId}: baseId`);
    assert.equal(entry.toId, expectedToId, `${entry.fromId}: next generation`);
    assert.match(entry.preimageMaterialSha256, /^[0-9a-f]{64}$/);
    assert.match(entry.successorMaterialSha256, /^[0-9a-f]{64}$/);
    assert.equal(entry.materialBindings.question, "question-material-fingerprint-v1");
    assert.equal("questionRevision" in entry.materialBindings, false, `${entry.fromId}: obsolete binding key`);
    const expectedBindingKeys = [
      "question",
      ...(exactResponseContractRevisionIds.includes(entry.fromId as never) ? ["responseContractRevision"] : []),
      ...(entry.fromId === "graph-p4-decimals-number-line" ? ["rendererSemanticsRevision"] : [])
    ].sort();
    assert.deepEqual(Object.keys(entry.materialBindings).sort(), expectedBindingKeys, `${entry.fromId}: material bindings`);
    const frozen = frozenById.get(entry.fromId);
    assert.ok(frozen, `${entry.fromId}: missing immutable preimage`);
    assert.equal(
      createHash("sha256").update(questionMaterialFingerprint(frozen)).digest("hex"),
      entry.preimageMaterialSha256,
      `${entry.fromId}: preimage fingerprint digest`
    );
    const activeSuccessor = questions.find((question) => question.id === entry.toId);
    assert.ok(activeSuccessor, `${entry.fromId}: missing live successor ${entry.toId}`);
    assert.equal(
      createHash("sha256").update(questionMaterialFingerprint(activeSuccessor)).digest("hex"),
      entry.successorMaterialSha256,
      `${entry.fromId}: successor fingerprint digest`
    );
    if (fromMatch) currentV2ToV3 += 1;
    else currentBaseToV2 += 1;
    if (entry.preimageMaterialSha256 === entry.successorMaterialSha256) questionMaterialIdentical += 1;
    else questionMaterialChanged += 1;
  }
  assert.deepEqual({ currentV2ToV3, currentBaseToV2 }, { currentV2ToV3: 63, currentBaseToV2: 11 });
  assert.deepEqual({ questionMaterialChanged, questionMaterialIdentical }, {
    questionMaterialChanged: 63,
    questionMaterialIdentical: 11
  });
  assert.deepEqual(
    manifest.promotions
      .filter((entry) => entry.preimageMaterialSha256 === entry.successorMaterialSha256)
      .map(({ fromId }) => fromId),
    [...exactForcedPromotionIds],
    "only the exact 11 response-contract rows may force a question-identical promotion"
  );

  const responseRevisionIds = manifest.promotions
    .filter(({ materialBindings }) => materialBindings.responseContractRevision !== undefined)
    .map(({ fromId, materialBindings }) => {
      assert.equal(materialBindings.responseContractRevision, "hk-displayed74-response-contract-v1", fromId);
      return fromId;
    });
  assert.deepEqual(responseRevisionIds, [...exactResponseContractRevisionIds]);
  assert.equal(
    createHash("sha256").update(JSON.stringify(responseRevisionIds)).digest("hex"),
    "d9c3f1e5ffba46475903a51dd7b8e4042c7631e4551e2851e8014e5d86bb3939"
  );
  const rendererRevisionEntries = manifest.promotions.filter(
    ({ materialBindings }) => materialBindings.rendererSemanticsRevision !== undefined
  );
  assert.deepEqual(rendererRevisionEntries.map(({ fromId }) => fromId), ["graph-p4-decimals-number-line"]);
  assert.equal(
    rendererRevisionEntries[0]?.materialBindings.rendererSemanticsRevision,
    "p4-number-line-preanswer-no-solution-v1"
  );
});

test("the strict production promotion registry loads the same single manifest", async () => {
  assert.equal(existsSync(promotionModulePath), true, "missing lib/hongKongDisplayed74Promotion.ts");
  const registry = await import("./hongKongDisplayed74Promotion");
  const manifest = loadPromotionManifest();
  assert.deepEqual(registry.hongKongDisplayed74Promotions, manifest.promotions);
  assert.equal(registry.hongKongDisplayed74PromotionByFromId instanceof Map, true);
  assert.equal(registry.hongKongDisplayed74PromotionByFromId.size, 74);
  for (const entry of manifest.promotions) {
    assert.deepEqual(registry.hongKongDisplayed74PromotionByFromId.get(entry.fromId), entry);
    assert.deepEqual(registry.hongKongDisplayed74PromotionForId(entry.fromId), entry);
  }
  assert.equal(registry.hongKongDisplayed74PromotionForId("not-a-displayed74-row"), null);
});

test("the immutable pre-implementation history proves exactly five deep-equal overlaps and 69 unique additions", () => {
  const preImplementationHistory: Question[] = [];
  for (const source of immutablePreImplementationHistorySources) {
    const bytes = readFileSync(join(process.cwd(), source.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sha256, source.path);
    assert.equal(source.questions.length, source.expectedCount, `${source.path}: question count`);
    preImplementationHistory.push(...source.questions);
  }

  const preImplementationById = new Map<string, Question>();
  for (const question of preImplementationHistory) {
    assert.equal(
      preImplementationById.has(question.id),
      false,
      `${question.id}: duplicate in immutable pre-implementation history`
    );
    preImplementationById.set(question.id, question);
  }
  assert.equal(
    preImplementationById.size,
    immutablePreImplementationVersionManifestContract.historicalUniqueCount
  );

  const overlaps = snapshot.questions.filter((question) => preImplementationById.has(question.id));
  assert.deepEqual(overlaps.map((question) => question.id), [...exactHistoryOverlaps]);
  for (const overlap of overlaps) {
    assert.deepEqual(
      overlap,
      preImplementationById.get(overlap.id),
      `${overlap.id}: overlap must be byte-for-meaning identical before implementation`
    );
  }
  assert.equal(overlaps.length, immutablePreImplementationVersionManifestContract.displayed74IdenticalOverlapCount);
  assert.equal(
    snapshot.questions.length - overlaps.length,
    immutablePreImplementationVersionManifestContract.displayed74UniqueAdditionCount
  );
});

test("the post-implementation resolver deep-resolves all 74 preimages and exposes exactly 1761 unique generations", () => {
  for (const frozen of snapshot.questions) {
    assert.deepEqual(
      historicalHongKongQuestionForId(frozen.id),
      frozen,
      `${frozen.id}: post resolver must return the exact immutable preimage`
    );
  }

  const expectedUniqueIds = new Set([
    ...immutablePreImplementationHistorySources.flatMap((source) => source.questions.map((question) => question.id)),
    ...snapshot.questions.map((question) => question.id)
  ]);
  assert.equal(expectedUniqueIds.size, 1761);
  const resolved = [...expectedUniqueIds].map((questionId) => historicalHongKongQuestionForId(questionId));
  assert.equal(resolved.filter((question): question is Question => question !== null).length, 1761);
  assert.equal(new Set(resolved.map((question) => question?.id)).size, 1761);
});

test("the adjudication overlap is independently fixed at exactly three IDs", () => {
  assert.deepEqual([...adjudicationOverlapIds].sort(), [
    "supp-differentiation-intro-first-step-v2",
    "supp-linear-equations-first-step-v2",
    "supp-trigonometry-s5-first-step-v2"
  ]);
});

test("all 74 preimages receive their exact next generation, retire the old ID, and remain immutable in history", () => {
  const exactPromotionMap = promotionMap();
  const baseToV2Ids = baseToV2IdSet();
  const snapshotIds = new Set(snapshot.questions.map((question) => question.id));
  assert.deepEqual(
    new Set(snapshot.questions.filter((question) => !/-v2$/.test(question.id)).map((question) => question.id)),
    baseToV2Ids
  );
  assert.equal(exactPromotionMap.size, 74);
  assert.equal(new Set(exactPromotionMap.values()).size, 74);
  assert.equal(snapshot.questions.length - exactHistoryOverlaps.length, 69, "history adds exactly 69 nonduplicate objects");
  assert.deepEqual(
    new Set(snapshot.questions.filter((question) => /-v2$/.test(question.id)).map((question) => question.id)),
    new Set([...snapshotIds].filter((id) => !baseToV2Ids.has(id)))
  );

  const activeIds = new Set(questions.map((question) => question.id));
  for (const frozen of snapshot.questions) {
    const expectedId = expectedNextId(frozen.id);
    const active = liveRepairedQuestion(frozen.id);
    assert.equal(active.id, expectedId, `${frozen.id}: exact active next ID`);
    assert.equal(activeIds.has(frozen.id), false, `${frozen.id}: preimage ID remains selectable`);
    assert.equal(retiredHongKongQuestionIds.has(frozen.id), true, `${frozen.id}: preimage ID not retired`);
    assert.equal(activeHongKongQuestionIdByHistoricalId.get(frozen.id), expectedId, `${frozen.id}: lineage map`);
    assert.deepEqual(historicalHongKongQuestionForId(frozen.id), frozen, `${frozen.id}: historical object drift`);
  }
});

test("exactly 11 question-identical response-contract rows are explicitly forced to promote without a heuristic", () => {
  assert.equal(exactForcedPromotionIds.length, 11);
  assert.equal(
    createHash("sha256").update(JSON.stringify(exactForcedPromotionIds)).digest("hex"),
    "4b19d8c5eeb4a78c591d658def6d17f8acebc5994519f12b3b0468a19f66ebcf"
  );
  const frozenById = new Map(snapshot.questions.map((question) => [question.id, question as Question]));

  for (const oldId of exactForcedPromotionIds) {
    const frozen = frozenById.get(oldId);
    assert.ok(frozen, `${oldId}: missing forced-promotion preimage`);
    const sourceForm = structuredClone(frozen);
    sourceForm.id = oldId.replace(/-v2$/, "");
    const result = versionMateriallyChangedHongKongQuestions([sourceForm]);
    assert.equal(result.questions[0]?.id, expectedNextId(oldId), `${oldId}: explicit forced promotion`);
  }

  const nonForcedOldId = "supp-p3-multiplication-division-first-step-v2";
  assert.equal(exactForcedPromotionIds.includes(nonForcedOldId as never), false);
  const nonForced = structuredClone(frozenById.get(nonForcedOldId));
  assert.ok(nonForced);
  nonForced.id = nonForcedOldId.replace(/-v2$/, "");
  const unchangedResult = versionMateriallyChangedHongKongQuestions([nonForced]);
  assert.equal(
    unchangedResult.questions[0]?.id,
    nonForcedOldId,
    "a non-forced row promotes only after its material learner-facing content changes"
  );
});

test("version manifest adds exactly the 74 target mappings without changing any non-target mapping or retirement", () => {
  const exactPromotionMap = promotionMap();
  const affectedMappingKeys = affectedMappingKeySet();
  const targetIds = new Set(exactPromotionMap.keys());
  assert.equal(affectedMappingKeys.size, 137);
  assert.equal(
    Object.keys(displayed74IntermediateVersionManifest.activeIdByHistoricalId).length,
    immutablePreImplementationVersionManifestContract.activeMappingCount + exactPromotionMap.size
  );
  assert.equal(
    displayed74IntermediateVersionManifest.retiredHistoricalIds.length,
    immutablePreImplementationVersionManifestContract.retiredIdCount + exactPromotionMap.size
  );
  for (const [oldId, newId] of exactPromotionMap) {
    assert.equal(displayed74IntermediateVersionManifest.activeIdByHistoricalId[oldId], newId, oldId);
    assert.equal(displayed74IntermediateVersionManifest.retiredHistoricalIds.includes(oldId), true, `${oldId}: manifest retirement`);
    assert.equal(/-v4$/.test(newId), false, `${oldId}: unexpected v4 collision`);
    const versioned = oldId.match(/^(.*)-v2$/);
    if (versioned) {
      assert.equal(
        displayed74IntermediateVersionManifest.activeIdByHistoricalId[versioned[1]],
        newId,
        `${oldId}: base ancestor must map directly to the v3 successor`
      );
      assert.notEqual(
        displayed74IntermediateVersionManifest.activeIdByHistoricalId[versioned[1]],
        oldId,
        `${oldId}: stale base-to-v2 chain is forbidden`
      );
    }
  }
  const nonTargetMap = Object.entries(displayed74IntermediateVersionManifest.activeIdByHistoricalId)
    .filter(([oldId]) => !affectedMappingKeys.has(oldId))
    .sort(([left], [right]) => left.localeCompare(right));
  const nonTargetRetired = displayed74IntermediateVersionManifest.retiredHistoricalIds
    .filter((oldId) => !targetIds.has(oldId))
    .sort((left, right) => left.localeCompare(right));
  assert.equal(createHash("sha256").update(JSON.stringify(nonTargetMap)).digest("hex"), "f75f49e0c3d0a27478b7d70630b4a42c8fd6c897f23775fcffb83f1f8901223f");
  assert.equal(createHash("sha256").update(JSON.stringify(nonTargetRetired)).digest("hex"), "da290490f91beb2d5c020a2d51bc11731e1a2f326253a09136f30182cac38b5a");

  // Reconstruct the complete pre-promotion compact manifest from the immutable
  // residual28 postimage and the exact production promotion map. This makes the locked
  // preimage SHA reproducible without depending on another dirty worktree or
  // weakening the one-hop postimage invariants above.
  const reconstructedMapping: Record<string, string> = {
    ...displayed74IntermediateVersionManifest.activeIdByHistoricalId
  };
  for (const [oldId, newId] of exactPromotionMap) {
    assert.equal(reconstructedMapping[oldId], newId, `${oldId}: missing postimage mapping to reverse`);
    delete reconstructedMapping[oldId];
    const v2Match = oldId.match(/^(.*)-v2$/);
    if (v2Match) reconstructedMapping[v2Match[1]] = oldId;
  }
  const reconstructedPreimageManifest = {
    schemaVersion: displayed74IntermediateVersionManifest.schemaVersion,
    historySourceCommit: displayed74IntermediateVersionManifest.historySourceCommit,
    activeIdByHistoricalId: Object.fromEntries(
      Object.entries(reconstructedMapping).sort(([left], [right]) => left.localeCompare(right))
    ),
    retiredHistoricalIds: displayed74IntermediateVersionManifest.retiredHistoricalIds
      .filter((questionId) => !targetIds.has(questionId))
      .sort((left, right) => left.localeCompare(right))
  };
  assert.equal(
    Object.keys(reconstructedPreimageManifest.activeIdByHistoricalId).length,
    immutablePreImplementationVersionManifestContract.activeMappingCount
  );
  assert.equal(
    reconstructedPreimageManifest.retiredHistoricalIds.length,
    immutablePreImplementationVersionManifestContract.retiredIdCount
  );
  assert.equal(
    createHash("sha256")
      .update(`${JSON.stringify(reconstructedPreimageManifest, null, 2)}\n`)
      .digest("hex"),
    immutablePreImplementationVersionManifestContract.sha256,
    "the exact pre-promotion version manifest must be reproducible from package-local postimage bytes"
  );
});

function reconstructProductionHkLessonSelection() {
  const rows: Array<{ index: number; topicId: string; slot: number; question: Question }> = [];
  const hkTopics = topics.filter((topic) => topic.curriculumTrack === "HK");
  assert.equal(hkTopics.length, 51, "production HK topic count");

  for (const topic of hkTopics) {
    const lesson = productionLessonByTopicId.get(topic.id);
    assert.ok(lesson, `${topic.id}: missing production lesson`);
    const topicQuestions = questions.filter(
      (question) => question.curriculumTrack === "HK" && question.topicId === topic.id
    );
    const lessonQuestions = !lesson.practiceQuestionIds?.length
      ? topicQuestions
      : lesson.practiceQuestionIds.map((questionId) => {
        const question = questions.find((candidate) => candidate.id === questionId);
        assert.ok(question, `${topic.id}: missing literal lesson question ${questionId}`);
        return question;
      });
    const selected = selectLessonPracticeQuestions(lessonQuestions);
    assert.equal(selected.length, 5, `${topic.id}: production lesson must select exactly five questions`);
    selected.forEach((question, slot) => rows.push({ index: rows.length, topicId: topic.id, slot, question }));
  }
  return rows;
}

test("production 51x5 selects the exact promoted 74 positions and remains disjoint from EASE701", () => {
  const exactPromotionMap = promotionMap();
  const oldIds = new Set(exactPromotionMap.keys());
  const newIds = new Set(exactPromotionMap.values());
  const reversePromotionMap = new Map(
    [...exactPromotionMap].map(([oldId, newId]) => [newId, oldId] as const)
  );
  const literalOldReferences = topics
    .filter((topic) => topic.curriculumTrack === "HK")
    .flatMap((topic) => productionLessonByTopicId.get(topic.id)?.practiceQuestionIds ?? [])
    .filter((questionId) => oldIds.has(questionId));
  assert.deepEqual(literalOldReferences, [], "data/lessons.ts must not carry any of the old 74 IDs");

  const selected = reconstructProductionHkLessonSelection();
  const selectedIds = selected.map(({ question }) => question.id);
  assert.equal(selected.length, 255);
  assert.equal(new Set(selectedIds).size, 255);
  assert.equal(selectedIds.filter((questionId) => oldIds.has(questionId)).length, 0, "old74 selected count");

  const promotedRows = selected.filter(({ question }) => newIds.has(question.id));
  assert.equal(promotedRows.length, 74, "all and only the 74 promoted rows must remain displayed");
  assert.deepEqual(new Set(promotedRows.map(({ question }) => question.id)), newIds);
  const positionLedger = `${promotedRows.map(({ index, topicId, slot, question }) => {
    const oldId = reversePromotionMap.get(question.id);
    assert.ok(oldId, `${question.id}: missing reverse promotion lineage`);
    return `${index}|${topicId}|${slot}|${oldId}|${question.id}`;
  }).join("\n")}\n`;
  assert.equal(
    createHash("sha256").update(positionLedger).digest("hex"),
    "6ba3cbf4969222436054cd0acff202cd6a6c81e11f7c3669916324ff6591ce2c",
    "the exact global index/topic/slot/old/new position ledger drifted"
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(promotedRows.map(({ question }) => question.id))).digest("hex"),
    "c5f2a2ee67301701899967dc400e10a3060c806d5d79d5351ce2983712b1051a",
    "the promoted 74 order drifted"
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(selectedIds)).digest("hex"),
    "d057f942fb534e7587c2ffed9bfebe5bb0f3eeca0051f20179de9293d519c19f",
    "the full ordered 255-ID production selection drifted"
  );

  const easeIds = new Set(immutablePreImplementationHistorySources[2].questions.map((question) => question.id));
  const easeBaseIds = new Set([...easeIds].map((questionId) => questionId.replace(/-v\d+$/, "")));
  assert.equal(easeIds.size, 701);
  assert.deepEqual(selectedIds.filter((questionId) => easeIds.has(questionId)), []);
  assert.deepEqual(
    selectedIds.filter((questionId) => easeBaseIds.has(questionId.replace(/-v\d+$/, ""))),
    [],
    "displayed255 and EASE701 must also remain disjoint after version normalization"
  );
});

function disclosureMatches(serialized: string) {
  const decoded = serialized
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16)))
    .normalize("NFKC");
  const forbiddenPatterns = [
    /(^|[^\d])3\s*[.．]\s*7(?:0*)?(?!\d)/,
    /37\s*(?:\/|⁄|÷)\s*10/,
    /3\s+(?:7\s*(?:\/|⁄)\s*10|and\s+(?:7|seven)\s+tenths?)/i,
    /(?:3\s*\+\s*7\s*(?:\/|⁄)\s*10|7\s*(?:\/|⁄)\s*10\s*\+\s*3)/,
    /(?:3\s*\+\s*0\s*[.．]\s*7|0\s*[.．]\s*7\s*\+\s*3)/,
    /4\s*-\s*0\s*[.．]\s*3/,
    /370\s*%/,
    /3\s*[.．]\s*7\s*(?:e|×\s*10\s*\^)\s*0/i,
    /3\s*\+\s*7\s*(?:×|\*|x)\s*0\.1/i,
    /(?:answer|答案|point\s*value|點值|点值)\s*[:=]\s*3\.7/i,
    /P\s*(?:=|equals|represents|是|等於|代表|等于)\s*3\.7/i,
    /three\s+point\s+seven/i,
    /三[點点]七/,
    /三又十分之七/
  ];
  return forbiddenPatterns.filter((pattern) => pattern.test(decoded)).map(String);
}

function assertNoPreAnswerDisclosure(serialized: string, label: string) {
  assert.deepEqual(disclosureMatches(serialized), [], `${label}: pre-answer disclosure`);
}

function serializedMarkupSubsurfaces(markup: string) {
  const ariaAndDataAttributes = [...markup.matchAll(/\s((?:aria|data)-[\w-]+)="([^"]*)"/g)]
    .map(([, name, value]) => ({ name, value }));
  const hiddenRegions = [
    ...markup.matchAll(/<([a-z][\w-]*)[^>]*(?:class="[^"]*(?:sr-only|hidden)[^"]*"|\shidden(?:="")?)[^>]*>[\s\S]*?<\/\1>/gi)
  ].map(([region]) => region);
  return { ariaAndDataAttributes, hiddenRegions };
}

test("the P4 disclosure scanner catches decimal, fraction, mixed, percent, scientific, derivation, and word forms", () => {
  const disclosures = [
    "3.7",
    "3.700",
    "37/10",
    "37⁄10",
    "3 7/10",
    "3 and seven tenths",
    "3 + 7/10",
    "7/10 + 3",
    "3 + 0.7",
    "0.7 + 3",
    "4 - 0.3",
    "37 ÷ 10",
    "370%",
    "3.7e0",
    "3 + 7 × 0.1",
    "P equals 3.7",
    "three point seven",
    "三點七",
    "三点七",
    "三又十分之七",
    "&#51;&#46;&#55;"
  ];
  for (const disclosure of disclosures) {
    assert.ok(disclosureMatches(disclosure).length > 0, `scanner missed ${disclosure}`);
  }
  assertNoPreAnswerDisclosure(
    "Number line from 3 to 4 in intervals of 0.1. Point P is on the seventh small tick after 3.",
    "allowed source-only semantics"
  );
});

test("only an explicit validated disclosure policy selects ordinal P4 semantics", () => {
  const historical = snapshot.questions.find((question) => question.id === "graph-p4-decimals-number-line");
  assert.ok(historical);
  assert.equal(historical.diagram?.kind, "number-line");
  const historicalDiagram = historical.diagram as DisclosureAwareNumberLine;
  assert.equal("semanticDisclosurePolicy" in historicalDiagram, false, "the immutable preimage must not gain policy");
  assert.deepEqual(questionDiagramAltText(historicalDiagram), {
    en: "Number line from 3 to 4 with P = 3.7.",
    zh: "數線由 3 至 4，其中 P = 3.7。",
    zhHans: "数轴从 3 到 4，其中 P = 3.7。"
  }, "historical attempts must retain their exact original P=3.7 semantics");

  const policyDiagram = {
    ...structuredClone(historicalDiagram),
    semanticDisclosurePolicy: p4DisclosurePolicy()
  } satisfies DisclosureAwareNumberLine;
  assert.deepEqual(normalizeQuestionDiagram(policyDiagram), policyDiagram, "the one approved policy must normalize");
  assert.deepEqual(questionDiagramAltText(policyDiagram), p4SafeSourceCaption);
});

test("unknown, malformed, or diagram-inconsistent disclosure policies fail closed", () => {
  const historical = snapshot.questions.find((question) => question.id === "graph-p4-decimals-number-line");
  assert.ok(historical);
  assert.equal(historical.diagram?.kind, "number-line");
  const historicalDiagram = historical.diagram as NumberLineQuestionDiagram;
  const invalidDiagrams = [
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), kind: "answer-value" } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { kind: "ordinal-tick-position" } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), answer: "3.7" } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), computedResult: "3.7" } },
    {
      ...structuredClone(historicalDiagram),
      semanticDisclosurePolicy: {
        ...p4DisclosurePolicy(),
        caption: { ...p4SafeSourceCaption, en: "Point P = 3.7." }
      }
    },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), ordinalTickFromMinimum: 7.5 } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), ordinalTickFromMinimum: 11 } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), pointLabel: "missing" } },
    { ...structuredClone(historicalDiagram), semanticDisclosurePolicy: { ...p4DisclosurePolicy(), ordinalTickFromMinimum: 6 } }
  ];
  for (const invalid of invalidDiagrams) {
    assert.equal(normalizeQuestionDiagram(invalid), undefined, "invalid policy must not normalize");
    assert.throws(
      () => questionDiagramAltText(invalid as unknown as NumberLineQuestionDiagram),
      "invalid policy must not fall through to answer-revealing or inferred semantics"
    );
    assert.throws(
      () => buildQuestionDiagramSemanticSummary(invalid as unknown as NumberLineQuestionDiagram, "en"),
      "invalid policy must fail closed in the full semantic helper"
    );
  }

  const genericMissingValuePoint = {
    kind: "number-line",
    range: [0, 5],
    tickInterval: 1,
    points: [{ label: "Q" }]
  };
  assert.equal(normalizeQuestionDiagram(genericMissingValuePoint), undefined);
  assert.throws(() => questionDiagramAltText(genericMissingValuePoint as unknown as NumberLineQuestionDiagram));
});

test("the new active P4 row carries the explicit policy and fingerprints it as material versioned state", () => {
  const question = liveRepairedQuestion("graph-p4-decimals-number-line");
  assert.equal(question.diagram?.kind, "number-line");
  const diagram = question.diagram as DisclosureAwareNumberLine;
  assert.deepEqual(diagram.semanticDisclosurePolicy, p4DisclosurePolicy());
  assert.deepEqual(Object.keys(diagram.semanticDisclosurePolicy ?? {}).sort(), [
    "caption",
    "kind",
    "ordinalTickFromMinimum",
    "pointLabel"
  ]);
  assert.equal(JSON.stringify(diagram.semanticDisclosurePolicy).includes("3.7"), false);
  assert.equal(diagram.points?.[0]?.value, 3.7, "the versioned question retains the exact source geometry");
  const withoutPolicy = structuredClone(question);
  assert.equal(withoutPolicy.diagram?.kind, "number-line");
  if (withoutPolicy.diagram?.kind === "number-line") {
    delete (withoutPolicy.diagram as DisclosureAwareNumberLine).semanticDisclosurePolicy;
  }
  assert.notEqual(
    questionMaterialFingerprint(question),
    questionMaterialFingerprint(withoutPolicy),
    "the disclosure policy must participate in the material fingerprint"
  );
  const historical = snapshot.questions.find((candidate) => candidate.id === "graph-p4-decimals-number-line");
  assert.ok(historical);
  assert.deepEqual(historicalHongKongQuestionForId(historical.id), historical);
  assert.equal("semanticDisclosurePolicy" in (historical.diagram ?? {}), false);
  assert.deepEqual(withoutPolicy.diagram, historical.diagram, "P4 diagram delta is exactly the policy addition");
});

test("the P4 number-line semantic helper gives exact EN/ZH/ZH-Hans source data without computing P=3.7", () => {
  const question = liveRepairedQuestion("graph-p4-decimals-number-line");
  assert.equal(question.diagram?.kind, "number-line");
  const diagram = question.diagram as DisclosureAwareNumberLine;
  assert.deepEqual(diagram.semanticDisclosurePolicy, p4DisclosurePolicy());
  const expected = { ...p4SafeSourceCaption, "zh-Hans": p4SafeSourceCaption.zhHans } as const;
  const alt = questionDiagramAltText(diagram);
  assert.equal(alt.en, expected.en);
  assert.equal(alt.zh, expected.zh);
  assert.equal(alt.zhHans, expected["zh-Hans"]);
  for (const language of ["en", "zh", "zh-Hans"] as const) {
    const semantic = buildQuestionDiagramSemanticSummary(diagram, language);
    assert.equal(semantic.caption, expected[language]);
    const serialized = JSON.stringify(semantic);
    assertNoPreAnswerDisclosure(serialized, `${language} semantic payload`);
  }
});

test("the P4 disclosure policy leaves every non-target number-line semantic shape unchanged", () => {
  const contracts: Array<{ diagram: NumberLineQuestionDiagram; expected: ReturnType<typeof questionDiagramAltText> }> = [
    {
      diagram: {
        kind: "number-line",
        range: [0, 5],
        tickInterval: 1,
        points: [{ value: 2, label: "Q" }]
      },
      expected: {
        en: "Number line from 0 to 5 with Q = 2.",
        zh: "數線由 0 至 5，其中 Q = 2。",
        zhHans: "数轴从 0 到 5，其中 Q = 2。"
      }
    },
    {
      diagram: {
        kind: "number-line",
        range: [-1, 1],
        tickInterval: 0.5,
        points: [{ value: -0.5, label: "A" }, { value: 0.5, label: "B", marker: "open" }]
      },
      expected: {
        en: "Number line from -1 to 1 with A = -0.5, B = 0.5.",
        zh: "數線由 -1 至 1，其中 A = -0.5、B = 0.5。",
        zhHans: "数轴从 -1 到 1，其中 A = -0.5、B = 0.5。"
      }
    },
    {
      diagram: {
        kind: "number-line",
        range: [10, 20],
        highlights: [{ from: 12, to: 18, label: { en: "Interval", zh: "區間", zhHans: "区间" } }],
        points: [{ value: 15 }]
      },
      expected: {
        en: "Number line from 10 to 20.",
        zh: "數線由 10 至 20。",
        zhHans: "数轴从 10 到 20。"
      }
    }
  ];
  for (const { diagram, expected } of contracts) {
    assert.equal("semanticDisclosurePolicy" in diagram, false);
    assert.deepEqual(questionDiagramAltText(diagram), expected);
    assert.deepEqual(normalizeQuestionDiagram(diagram), diagram);
  }
});

test("QuestionFigure semantic render preserves exact P4 caption and contains no computed-result variant", () => {
  const question = liveRepairedQuestion("graph-p4-decimals-number-line");
  assert.equal(question.diagram?.kind, "number-line");
  const diagram = question.diagram as DisclosureAwareNumberLine;
  assert.deepEqual(diagram.semanticDisclosurePolicy, p4DisclosurePolicy());
  const expected = { ...p4SafeSourceCaption, "zh-Hans": p4SafeSourceCaption.zhHans } as const;
  for (const language of ["en", "zh", "zh-Hans"] as const) {
    const semantics = buildQuestionDiagramSemanticSummary(diagram, language);
    const markup = renderToStaticMarkup(
      createElement("figure", null, questionFigureSemanticElements(semantics))
    );
    assert.equal(markup.includes(`<figcaption`), true, `${language}: visible figcaption missing`);
    assert.equal(markup.includes(expected[language]), true, `${language}: exact solve-able meaning missing`);
    assertNoPreAnswerDisclosure(markup, `${language} SSR markup`);
    const subsurfaces = serializedMarkupSubsurfaces(markup);
    assertNoPreAnswerDisclosure(JSON.stringify(subsurfaces.ariaAndDataAttributes), `${language} ARIA/data attributes`);
    assertNoPreAnswerDisclosure(JSON.stringify(subsurfaces.hiddenRegions), `${language} hidden regions`);
  }
});
