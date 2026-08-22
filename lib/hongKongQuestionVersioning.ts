import historySnapshot from "@/data/historical/hongKongQuestions-3f8f12c4.json";
import successorHistorySnapshot from "@/data/historical/hongKongQuestions-a18-exact67.json";
import easeV2HistorySnapshot from "@/data/historical/hongKongQuestions-hk-ease-39847.json";
import easeExact3V3HistorySnapshot from "@/data/historical/hongKongQuestions-hk-ease-exact3-v3.json";
import displayed74PreimageSnapshot from "@/data/historical/hongKongQuestions-displayed255-preimage-20260813.json";
import residual28PreimageSnapshot from "@/data/historical/hongKongQuestions-residual28-preimage-20260813.json";
import type { Question } from "@/types";
import {
  hongKongDisplayed74PromotionForSourceId,
  hongKongDisplayed74Promotions
} from "./hongKongDisplayed74Promotion";
import {
  hongKongResidual28PromotionForSourceId,
  hongKongResidual28Promotions
} from "./hongKongResidual28Promotion";
import {
  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,
  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256
} from "./hongKongQuestionVersioningContract";

export {
  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,
  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,
  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256
} from "./hongKongQuestionVersioningContract";

type HistorySnapshot = {
  schemaVersion: number;
  sourceCommit: string;
  generatedAt: null;
  questions: Question[];
};

type SuccessorHistorySnapshot = {
  schemaVersion: number;
  sourceCommit: string;
  sourcePackageSha256: string;
  frozenAt: string;
  questions: Question[];
};

type Displayed74PreimageSnapshot = {
  schemaVersion: number;
  sourceCommit: string;
  frozenAt: string;
  questionsPayloadSha256: string;
  orderedIdListSha256: string;
  sortedIdListSha256: string;
  adjudicationSha256: {
    explanation: string;
    response: string;
    responseDecisionV1: string;
    responseDecisionV2: string;
  };
  adjudicationAuthority: {
    responseDecisionV1: string;
    responseDecisionV2: string;
  };
  questions: Question[];
};

type Residual28PreimageSnapshot = {
  schemaVersion: number;
  sourceCommit: string;
  frozenAt: string;
  sourceQuestionsPath: string;
  sourceQuestionsSha256: string;
  sourceQuestionsRecoveryReceiptPath: string;
  sourceQuestionsRecoveryReceiptSha256: string;
  currentQuestionsPath: string;
  currentQuestionsSha256: string;
  adjudicationLedgerPath: string;
  adjudicationLedgerSha256: string;
  residualPartitionPath: string;
  residualPartitionSha256: string;
  residual47OrderedIdSha256: string;
  residual47QuestionsPayloadSha256: string;
  questionsPayloadSha256: string;
  orderedIdListSha256: string;
  sortedIdListSha256: string;
  preExistingHistoricalOverlapIds: string[];
  historyUniqueAdditionCount: number;
  questions: Question[];
};

const typedHistorySnapshot = historySnapshot as HistorySnapshot;

if (typedHistorySnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong question-history schema ${typedHistorySnapshot.schemaVersion}.`);
}
if (typedHistorySnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong question-history snapshot source commit does not match its checked-in contract.");
}

export const historicalHongKongQuestions: readonly Question[] = typedHistorySnapshot.questions;

const typedSuccessorHistorySnapshot = successorHistorySnapshot as SuccessorHistorySnapshot;
if (typedSuccessorHistorySnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong successor-history schema ${typedSuccessorHistorySnapshot.schemaVersion}.`);
}
if (typedSuccessorHistorySnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong successor-history source commit does not match the locked baseline contract.");
}
if (typedSuccessorHistorySnapshot.sourcePackageSha256 !== HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256) {
  throw new Error("Hong Kong successor-history package SHA does not match its checked-in contract.");
}

export const successorHistoricalHongKongQuestions: readonly Question[] = typedSuccessorHistorySnapshot.questions;
const typedEaseV2HistorySnapshot = easeV2HistorySnapshot as SuccessorHistorySnapshot;
if (typedEaseV2HistorySnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong EASE v2 history schema ${typedEaseV2HistorySnapshot.schemaVersion}.`);
}
if (typedEaseV2HistorySnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong EASE v2 history source commit does not match the locked baseline contract.");
}
if (typedEaseV2HistorySnapshot.sourcePackageSha256 !== HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256) {
  throw new Error("Hong Kong EASE v2 history package SHA does not match its checked-in contract.");
}
if (typedEaseV2HistorySnapshot.questions.length !== 701) {
  throw new Error("Hong Kong EASE v2 history snapshot must contain exactly 701 active question generations.");
}

export const easeV2HistoricalHongKongQuestions: readonly Question[] = typedEaseV2HistorySnapshot.questions;


type Exact3V3HistorySnapshot = {
  schemaVersion: "hk-ease-exact3-phase2a-v3-history-v1";
  status: "phase2a-candidate-only-promotion-not-authorized";
  sourceBindings: {
    v2History: { path: string; sha256: string };
  };
  rowCount: number;
  orderedRowIds: string[];
  orderedRowIdSha256: string;
  rowsPayloadSha256: string;
  rowSha256: string[];
  questions: Question[];
  questionCount: number;
  frozenPredecessorPolicy: string;
};

const typedEaseExact3V3HistorySnapshot = easeExact3V3HistorySnapshot as Exact3V3HistorySnapshot;
const exact3HistoryIds = ["hk-ease-10481-v3", "hk-ease-10496-v3", "hk-ease-1041-v3"];
if (
  typedEaseExact3V3HistorySnapshot.schemaVersion !== "hk-ease-exact3-phase2a-v3-history-v1" ||
  typedEaseExact3V3HistorySnapshot.status !== "phase2a-candidate-only-promotion-not-authorized" ||
  typedEaseExact3V3HistorySnapshot.rowCount !== 3 ||
  typedEaseExact3V3HistorySnapshot.questionCount !== 3 ||
  typedEaseExact3V3HistorySnapshot.questions.length !== 3 ||
  JSON.stringify(typedEaseExact3V3HistorySnapshot.orderedRowIds) !== JSON.stringify(exact3HistoryIds) ||
  JSON.stringify(typedEaseExact3V3HistorySnapshot.questions.map((question) => question.id)) !== JSON.stringify(exact3HistoryIds) ||
  typedEaseExact3V3HistorySnapshot.orderedRowIdSha256 !== "f080f64c2ac8b199571165cdc21eb386379feb5976bc48e5ab8ca7aa3894c380" ||
  typedEaseExact3V3HistorySnapshot.rowsPayloadSha256 !== "354ea19dda82fe00464757cf2304b5fa3530311c7425f34d7576a72d884cf0b1" ||
  typedEaseExact3V3HistorySnapshot.sourceBindings.v2History.sha256 !== "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1" ||
  typedEaseExact3V3HistorySnapshot.frozenPredecessorPolicy !== "v2-history-bytes-remain-immutable"
) {
  throw new Error("Hong Kong EASE exact3 v3 history candidate drifted from its immutable contract.");
}
export const easeExact3V3HistoricalHongKongQuestions: readonly Question[] =
  typedEaseExact3V3HistorySnapshot.questions;


const typedDisplayed74PreimageSnapshot = displayed74PreimageSnapshot as Displayed74PreimageSnapshot;
if (typedDisplayed74PreimageSnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong displayed74 preimage schema ${typedDisplayed74PreimageSnapshot.schemaVersion}.`);
}
if (typedDisplayed74PreimageSnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong displayed74 preimage source commit does not match the locked baseline contract.");
}
if (typedDisplayed74PreimageSnapshot.questions.length !== 74) {
  throw new Error("Hong Kong displayed74 preimage snapshot must contain exactly 74 question generations.");
}
if (
  typedDisplayed74PreimageSnapshot.questionsPayloadSha256
    !== "673bdd81a8a19d53ff0589a4fdd08841ff58ec2af09930f23b95269c2c64889f"
  || typedDisplayed74PreimageSnapshot.orderedIdListSha256
    !== "fcb17ad572d52be11b4bb7651c6eff17c82bd97d2cee18a6b61fadda86dbfcc0"
  || typedDisplayed74PreimageSnapshot.sortedIdListSha256
    !== "26d50e2670666468c342d20b1a2f8a04992b06a9fab3274e953bf875afaacf93"
) {
  throw new Error("Hong Kong displayed74 preimage payload or ID-list provenance does not match its checked-in contract.");
}
if (
  typedDisplayed74PreimageSnapshot.adjudicationSha256.explanation
    !== "d86746cf2fc44cbe7f66ab22c86668340db72e1687dfaaeff2e45c5c7e0f7d55"
  || typedDisplayed74PreimageSnapshot.adjudicationSha256.response
    !== "e282d7e64ae2e17f20a59c0a9f990a27f14659cdbb148660ad9b400703d57281"
  || typedDisplayed74PreimageSnapshot.adjudicationSha256.responseDecisionV2
    !== "bcd65fca1f789a9d9f60f343d13607c099ae044a0379b423b0b84592f843287f"
  || typedDisplayed74PreimageSnapshot.adjudicationAuthority.responseDecisionV1
    !== "superseded-immutable-audit-record"
  || typedDisplayed74PreimageSnapshot.adjudicationAuthority.responseDecisionV2
    !== "final-implementation-authority"
) {
  throw new Error("Hong Kong displayed74 preimage adjudication lineage is incomplete or stale.");
}

export const displayed74PreimageHistoricalHongKongQuestions: readonly Question[] =
  typedDisplayed74PreimageSnapshot.questions;

const typedResidual28PreimageSnapshot = residual28PreimageSnapshot as Residual28PreimageSnapshot;
if (typedResidual28PreimageSnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong residual28 preimage schema ${typedResidual28PreimageSnapshot.schemaVersion}.`);
}
if (typedResidual28PreimageSnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong residual28 preimage source commit does not match the locked baseline contract.");
}
if (
  typedResidual28PreimageSnapshot.sourceQuestionsPath
    !== "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt"
  || typedResidual28PreimageSnapshot.sourceQuestionsSha256
    !== "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a"
  || typedResidual28PreimageSnapshot.sourceQuestionsRecoveryReceiptPath
    !== "coordination/content-qa/authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json"
  || typedResidual28PreimageSnapshot.sourceQuestionsRecoveryReceiptSha256
    !== "badd8ba52a6da7f7960a40f1da900357d8f9aac87a5fc0b215004143a6f60807"
  || typedResidual28PreimageSnapshot.currentQuestionsPath !== "data/questions.ts"
  || typedResidual28PreimageSnapshot.currentQuestionsSha256
    !== "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"
  || typedResidual28PreimageSnapshot.adjudicationLedgerPath
    !== "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json"
  || typedResidual28PreimageSnapshot.adjudicationLedgerSha256
    !== "0879eb17b5c65ac76a38f311972f279e1c47d6c3b2c8dec22aabea6af830716c"
  || typedResidual28PreimageSnapshot.residualPartitionPath
    !== "coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json"
  || typedResidual28PreimageSnapshot.residualPartitionSha256
    !== "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37"
) {
  throw new Error("Hong Kong residual28 source or adjudication lineage is incomplete or stale.");
}
if (
  typedResidual28PreimageSnapshot.questions.length !== 28
  || typedResidual28PreimageSnapshot.questionsPayloadSha256
    !== "77357d41cffa3bea7660aea9ec5062fe6adfe8949188208ccc7e146818817465"
  || typedResidual28PreimageSnapshot.orderedIdListSha256
    !== "bd6e3fb5f22b13851de17e1b4674795683a06a96dd03c9073199cda112887aa5"
  || typedResidual28PreimageSnapshot.sortedIdListSha256
    !== "2f0b7ad4bc2e8f984ad315ab29233b4b170bee6ddd1894f242fbba8f5fb32cc6"
  || typedResidual28PreimageSnapshot.historyUniqueAdditionCount !== 27
  || JSON.stringify(typedResidual28PreimageSnapshot.preExistingHistoricalOverlapIds)
    !== JSON.stringify(["supp-p4-decimals-guided-example"])
) {
  throw new Error("Hong Kong residual28 preimage payload, ID list, or history-delta contract drifted.");
}

export const residual28PreimageHistoricalHongKongQuestions: readonly Question[] =
  typedResidual28PreimageSnapshot.questions;

const displayed74IdenticalHistoryOverlapIds = new Set([
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-guided-example",
  "graph-p4-decimals-number-line"
]);
const seenDisplayed74IdenticalHistoryOverlapIds = new Set<string>();
const allHistoricalHongKongQuestions: Question[] = [];
const historicalQuestionById = new Map<string, Question>();

for (const question of [
  ...historicalHongKongQuestions,
  ...successorHistoricalHongKongQuestions,
  ...easeV2HistoricalHongKongQuestions,
  ...easeExact3V3HistoricalHongKongQuestions
]) {
  if (historicalQuestionById.has(question.id)) {
    throw new Error(`${question.id}: duplicate Hong Kong historical question generation.`);
  }
  historicalQuestionById.set(question.id, question);
  allHistoricalHongKongQuestions.push(question);
}

for (const question of displayed74PreimageHistoricalHongKongQuestions) {
  const existing = historicalQuestionById.get(question.id);
  if (existing) {
    if (!displayed74IdenticalHistoryOverlapIds.has(question.id)) {
      throw new Error(`${question.id}: unapproved duplicate Hong Kong displayed74 historical generation.`);
    }
    if (JSON.stringify(existing) !== JSON.stringify(question)) {
      throw new Error(`${question.id}: displayed74 historical overlap is not deeply identical.`);
    }
    seenDisplayed74IdenticalHistoryOverlapIds.add(question.id);
    continue;
  }
  historicalQuestionById.set(question.id, question);
  allHistoricalHongKongQuestions.push(question);
}
if (
  seenDisplayed74IdenticalHistoryOverlapIds.size !== displayed74IdenticalHistoryOverlapIds.size
  || [...displayed74IdenticalHistoryOverlapIds].some(
    (questionId) => !seenDisplayed74IdenticalHistoryOverlapIds.has(questionId)
  )
) {
  throw new Error("Hong Kong displayed74 history must overlap exactly five deeply identical preimages.");
}

const residual28IdenticalHistoryOverlapIds = new Set(["supp-p4-decimals-guided-example"]);
const seenResidual28IdenticalHistoryOverlapIds = new Set<string>();
for (const question of residual28PreimageHistoricalHongKongQuestions) {
  const existing = historicalQuestionById.get(question.id);
  if (existing) {
    if (!residual28IdenticalHistoryOverlapIds.has(question.id)) {
      throw new Error(`${question.id}: unapproved duplicate Hong Kong residual28 historical generation.`);
    }
    if (JSON.stringify(existing) !== JSON.stringify(question)) {
      throw new Error(`${question.id}: residual28 historical overlap is not deeply identical.`);
    }
    seenResidual28IdenticalHistoryOverlapIds.add(question.id);
    continue;
  }
  historicalQuestionById.set(question.id, question);
  allHistoricalHongKongQuestions.push(question);
}
if (
  seenResidual28IdenticalHistoryOverlapIds.size !== residual28IdenticalHistoryOverlapIds.size
  || [...residual28IdenticalHistoryOverlapIds].some(
    (questionId) => !seenResidual28IdenticalHistoryOverlapIds.has(questionId)
  )
) {
  throw new Error("Hong Kong residual28 history must overlap exactly one deeply identical preimage.");
}
if (allHistoricalHongKongQuestions.length !== 1791 || historicalQuestionById.size !== 1791) {
  throw new Error("Hong Kong question history must contain exactly 1791 unique generations after exact3 intake.");
}

function historyGeneration(questionId: string) {
  const match = questionId.match(/^(.*)-v([2-9]\d*)$/);
  return match
    ? { baseId: match[1], version: Number(match[2]) }
    : { baseId: questionId, version: 1 };
}

const historicalGenerationsByBaseId = new Map<string, Array<{ question: Question; version: number }>>();
for (const question of allHistoricalHongKongQuestions) {
  const { baseId, version } = historyGeneration(question.id);
  const generations = historicalGenerationsByBaseId.get(baseId) ?? [];
  generations.push({ question, version });
  historicalGenerationsByBaseId.set(baseId, generations);
}
for (const [baseId, generations] of historicalGenerationsByBaseId) {
  generations.sort((left, right) => left.version - right.version);
  const fingerprints = new Set<string>();
  for (const [index, generation] of generations.entries()) {
    if (generation.version !== index + 1) {
      throw new Error(`${baseId}: Hong Kong question history has a version-generation gap.`);
    }
    const fingerprint = questionMaterialFingerprint(generation.question);
    if (fingerprints.has(fingerprint)) {
      throw new Error(`${baseId}: Hong Kong question history duplicates a material generation.`);
    }
    fingerprints.add(fingerprint);
  }
}

const explicitActiveIdByHistoricalId = new Map<string, string>([
  ["graph-p4-angles-straight-line", "graph-s1-angles-straight-line"]
]);

function materialQuestionState(question: Question) {
  return {
    curriculumTrack: question.curriculumTrack,
    curriculumProfile: question.curriculumProfile,
    region: question.region,
    publisher: question.publisher,
    canonicalTopicId: question.canonicalTopicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: question.explanation,
    diagram: question.diagram,
    questionAssets: question.questionAssets
  };
}

export function questionMaterialFingerprint(question: Question) {
  return JSON.stringify(materialQuestionState(question));
}

export function questionMateriallyDiffersFromHistory(question: Question) {
  if (question.curriculumTrack !== "HK") return false;
  const historical = historicalQuestionById.get(question.id);
  return Boolean(historical && questionMaterialFingerprint(historical) !== questionMaterialFingerprint(question));
}

export type HongKongQuestionVersioningResult = {
  questions: Question[];
  activeIdByHistoricalId: ReadonlyMap<string, string>;
  retiredHistoricalIds: ReadonlySet<string>;
};

export function versionMateriallyChangedHongKongQuestions(questions: Question[]): HongKongQuestionVersioningResult {
  const sourceIds = new Set(questions.map((question) => question.id));
  const activeIdByHistoricalId = new Map<string, string>();
  const retiredHistoricalIds = new Set<string>();

  const versionedQuestions = questions.map((question) => {
    if (question.curriculumTrack !== "HK") return question;
    const { baseId } = historyGeneration(question.id);
    const generations = historicalGenerationsByBaseId.get(baseId);
    if (!generations?.length) return question;

    const currentFingerprint = questionMaterialFingerprint(question);
    const displayed74Promotion = hongKongDisplayed74PromotionForSourceId(question.id);
    if (displayed74Promotion) {
      if (displayed74Promotion.baseId !== baseId) {
        throw new Error(`${question.id}: displayed74 promotion resolved to a different base ID.`);
      }
      const frozenPreimage = historicalQuestionById.get(displayed74Promotion.fromId);
      if (!frozenPreimage) {
        throw new Error(`${displayed74Promotion.fromId}: displayed74 promotion preimage is not immutable history.`);
      }
      const preimageFingerprint = questionMaterialFingerprint(frozenPreimage);
      const expectsQuestionIdenticalPromotion =
        displayed74Promotion.preimageMaterialSha256 === displayed74Promotion.successorMaterialSha256;
      const isFrozenPreimageMaterial = currentFingerprint === preimageFingerprint;

      // Material-changing rows only advance when the checked-in source has
      // actually moved away from the frozen preimage. The exact successor SHA
      // is independently locked by the manifest contract tests. The eleven
      // question-identical rows advance solely through their explicit response
      // contract revision, never through a heuristic.
      if (expectsQuestionIdenticalPromotion || !isFrozenPreimageMaterial) {
        if (sourceIds.has(displayed74Promotion.toId)) {
          throw new Error(
            `${displayed74Promotion.fromId}: cannot assign displayed74 successor ${displayed74Promotion.toId}; that ID already exists.`
          );
        }
        const activeGeneration = historyGeneration(displayed74Promotion.toId).version;
        const latestHistoricalGeneration = Math.max(...generations.map(({ version }) => version));
        if (activeGeneration !== latestHistoricalGeneration + 1) {
          throw new Error(`${displayed74Promotion.fromId}: displayed74 promotion is not the collision-free next generation.`);
        }
        for (const { question: historical, version } of generations) {
          if (version >= activeGeneration) continue;
          retiredHistoricalIds.add(historical.id);
          activeIdByHistoricalId.set(historical.id, displayed74Promotion.toId);
        }
        return { ...question, id: displayed74Promotion.toId };
      }
    }

    const residual28Promotion = hongKongResidual28PromotionForSourceId(question.id);
    if (residual28Promotion) {
      if (residual28Promotion.baseId !== baseId) {
        throw new Error(`${question.id}: residual28 promotion resolved to a different base ID.`);
      }
      const frozenPreimage = historicalQuestionById.get(residual28Promotion.fromId);
      if (!frozenPreimage) {
        throw new Error(`${residual28Promotion.fromId}: residual28 promotion preimage is not immutable history.`);
      }
      const preimageFingerprint = questionMaterialFingerprint(frozenPreimage);
      if (currentFingerprint === preimageFingerprint) {
        throw new Error(`${residual28Promotion.fromId}: residual28 source did not apply its material repair.`);
      }
      if (sourceIds.has(residual28Promotion.toId)) {
        throw new Error(
          `${residual28Promotion.fromId}: cannot assign residual28 successor ${residual28Promotion.toId}; that ID already exists.`
        );
      }
      const activeGeneration = historyGeneration(residual28Promotion.toId).version;
      const latestHistoricalGeneration = Math.max(...generations.map(({ version }) => version));
      if (activeGeneration !== latestHistoricalGeneration + 1) {
        throw new Error(`${residual28Promotion.fromId}: residual28 promotion is not the collision-free next generation.`);
      }
      for (const { question: historical, version } of generations) {
        if (version >= activeGeneration) continue;
        retiredHistoricalIds.add(historical.id);
        activeIdByHistoricalId.set(historical.id, residual28Promotion.toId);
      }
      return { ...question, id: residual28Promotion.toId };
    }

    const matchingGeneration = generations.find(
      ({ question: historical }) => questionMaterialFingerprint(historical) === currentFingerprint
    );
    if (matchingGeneration?.version === 1) return { ...question, id: baseId };

    const activeVersion = matchingGeneration?.version
      ?? Math.max(...generations.map(({ version }) => version)) + 1;
    const activeId = `${baseId}-v${activeVersion}`;
    if (sourceIds.has(activeId)) {
      throw new Error(`${baseId}: cannot assign history-safe ID ${activeId}; that ID already exists.`);
    }
    for (const { question: historical, version } of generations) {
      if (version >= activeVersion) continue;
      retiredHistoricalIds.add(historical.id);
      activeIdByHistoricalId.set(historical.id, activeId);
    }
    return { ...question, id: activeId };
  });

  const finalIds = new Set<string>();
  for (const question of versionedQuestions) {
    if (finalIds.has(question.id)) throw new Error(`${question.id}: duplicate question ID after Hong Kong versioning.`);
    finalIds.add(question.id);
  }

  // A question that existed in the locked historical catalog but no longer has
  // the same active ID is retired as well. This covers deliberate replacements
  // (for example, a chart or grade-route correction) without deleting the old
  // question object that historical attempts still need to display faithfully.
  for (const historical of allHistoricalHongKongQuestions) {
    if (!finalIds.has(historical.id)) retiredHistoricalIds.add(historical.id);
  }

  for (const [historicalId, activeId] of explicitActiveIdByHistoricalId) {
    if (!historicalQuestionById.has(historicalId)) {
      throw new Error(`${historicalId}: explicit replacement is not present in the locked HK history snapshot.`);
    }
    if (!finalIds.has(activeId)) continue;
    retiredHistoricalIds.add(historicalId);
    activeIdByHistoricalId.set(historicalId, activeId);
  }

  for (const promotion of hongKongDisplayed74Promotions) {
    if (!finalIds.has(promotion.toId)) continue;
    if (finalIds.has(promotion.fromId)) {
      throw new Error(`${promotion.fromId}: displayed74 historical ID remains active beside its successor.`);
    }
    retiredHistoricalIds.add(promotion.fromId);
    activeIdByHistoricalId.set(promotion.fromId, promotion.toId);
  }

  for (const promotion of hongKongResidual28Promotions) {
    if (!finalIds.has(promotion.toId)) continue;
    if (finalIds.has(promotion.fromId)) {
      throw new Error(`${promotion.fromId}: residual28 historical ID remains active beside its successor.`);
    }
    retiredHistoricalIds.add(promotion.fromId);
    activeIdByHistoricalId.set(promotion.fromId, promotion.toId);
  }

  return {
    questions: versionedQuestions,
    activeIdByHistoricalId,
    retiredHistoricalIds
  };
}

export function historicalHongKongQuestionForId(questionId: string) {
  return historicalQuestionById.get(questionId) ?? null;
}
