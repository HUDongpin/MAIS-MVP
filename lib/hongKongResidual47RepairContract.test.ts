import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { productionLessonByTopicId } from "../data/lessons";
import {
  activeHongKongQuestionIdByHistoricalId,
  questions,
  retiredHongKongQuestionIds
} from "../data/questions";
import easeHistoryJson from "../data/historical/hongKongQuestions-hk-ease-39847.json";
import displayed74SnapshotJson from "../data/historical/hongKongQuestions-displayed255-preimage-20260813.json";
import residual28SnapshotJson from "../data/historical/hongKongQuestions-residual28-preimage-20260813.json";
import residual28PromotionManifestJson from "../data/historical/hongKongResidual28PromotionManifest.json";
import versionManifestJson from "../data/historical/hongKongQuestionVersionManifest.json";
import { topics } from "../data/topics";
import repairContractJson from "../coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json";
import semanticReauditJson from "../coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json";
import residual47LedgerJson from "../coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger.json";
import residual47PartitionJson from "../coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json";
import { selectLessonPracticeQuestions } from "./practiceQuestionDeduping";
import { hkIndependentAnswersById } from "./questionBankSolvability";
import {
  easeExact3V3HistoricalHongKongQuestions,
  easeV2HistoricalHongKongQuestions,
  historicalHongKongQuestionForId,
  historicalHongKongQuestions,
  questionMaterialFingerprint,
  successorHistoricalHongKongQuestions
} from "./hongKongQuestionVersioning";
import {
  hongKongResidual28PromotionManifest,
  hongKongResidual28Promotions,
  reverseResidual28VersionManifestPostimage,
  serializeResidual28VersionManifestSnapshot
} from "./hongKongResidual28Promotion";
import {
  assertHongKongResidual47FocusedTestLedger,
  createHongKongResidual47Test
} from "./hongKongResidual47FocusedTestLedger";
import { applyHongKongResidual47Replacement } from "./hongKongResidual47Repair";
import { questionAnswerMatches } from "./server/answerMatching";
import {
  hasStrictQuestionResponseContract,
  questionResponseContractFor
} from "./server/questionResponseContracts";
import { assertCheckedInHongKongResidual28RepairContract } from "../coordination/content-qa/build-hk-residual28-repair-contract";
import { assertCheckedInHongKongResidual28PreimageSnapshot } from "../coordination/content-qa/build-hk-residual28-preimage-snapshot";
import { assertCheckedInHongKongResidual28PromotionManifest } from "../coordination/content-qa/build-hk-residual28-promotion-manifest";
import { assertCheckedInHongKongResidual47LedgerV2 } from "../coordination/content-qa/build-hk-residual47-ledger-v2";
import {
  assertCheckedInHongKongResidual28SourcePreimage,
  extractHongKongResidual28SourcePreimage
} from "../coordination/content-qa/extract-hk-residual28-source-preimage";
import {
  assertHongKongResidual28ProvenanceGraph,
  hashRepositoryProvenanceFile,
  hongKongResidual28ProvenanceArtifacts,
  readHongKongResidual28ReconstructionSource,
  scanHongKongResidual28Provenance
} from "../coordination/content-qa/hongKongResidual28Provenance";
import { assertCheckedInHongKongResidual47Evidence } from "../coordination/content-qa/recover-hk-residual47-evidence";
import type { Question } from "../types";

export const HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID =
  "hk-residual47-repair-contract-v1" as const;
const test = createHongKongResidual47Test(HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID);

type Repair = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageQuestionPayloadSha256: string;
  allowedPaths: string[];
  replacements: Record<string, string | undefined>;
};

type SemanticReauditRow = {
  toId: string;
  semanticCategory: string;
  issueCodes: string[];
  allowedPaths: string[];
  replacements: Record<string, string>;
};

const semanticReaudit = semanticReauditJson as typeof semanticReauditJson & {
  rows: SemanticReauditRow[];
};

const exactSemanticReauditExplanations = {
  "supp-p1-addition-subtraction-common-check-v3": {
    en: String.raw`Check the story action and identify the unknown before choosing addition or subtraction. If 5 items increase by a known 2 and the final amount is unknown, use \(5+2=7\). If the final amount is 7 and the increase is unknown, use \(7-5=2\).`,
    zh: String.raw`先檢查故事中的數量變化，並找出未知量，再決定用加法還是減法。若原有 5 件，已知增加 2 件並要求最後數量，就用 \(5+2=7\)；若最後有 7 件、原有 5 件並要求增加了多少，就用 \(7-5=2\)。`
  },
  "supp-p5-fractions-operations-common-check-v3": {
    en: String.raw`Simplify the final fraction when possible. After using a common denominator and completing the operation, divide the numerator and denominator by their greatest common factor, or keep dividing by common factors until none greater than 1 remains. Since 7 and 12 have no common factor greater than 1, \(7/12\) is already in simplest form.`,
    zh: String.raw`答案如可約簡，要化成最簡分數。通分並完成運算後，把分子和分母同除以它們的最大公因數，或持續以公因數約分，直至沒有大於 1 的公因數。7 和 12 沒有大於 1 的公因數，所以 \(7/12\) 已是最簡分數。`
  },
  "supp-p3-multiplication-division-common-check-v3": {
    en: String.raw`In whole-number division with a positive divisor, check that the remainder is at least 0 and smaller than the divisor. Since \(47=4\times11+3\) and \(0\le3<4\), quotient 11 remainder 3 is valid. If the remainder were 4 or more, another group of 4 could be made.`,
    zh: String.raw`整數除法中，若除數是正數，餘數必須不少於 0 且小於除數。因為 \(47=4\times11+3\) 而且 \(0\le3<4\)，所以商 11 餘 3 是合理的。若餘數是 4 或以上，便仍可再分成一組 4。`
  },
  "supp-p3-measurement-common-check-v3": {
    en: String.raw`Check that the quantities are of the same kind and convert units when needed before calculating. For quantities of the same kind, convert to a common unit before using the operation required by the question: \(2\text{ L}=2000\text{ mL}\). If the question asks for the total of lengths already measured in centimetres, \(35+20=55\text{ cm}\).`,
    zh: String.raw`計算前檢查各數量是否屬於同一種類，並按需要換算單位。同屬一種類的數量，先換成相同單位，再按題意選擇運算：\(2\text{ 升}=2000\text{ 毫升}\)。若題目要求把兩段已用厘米量度的長度相加，則 \(35+20=55\text{ 厘米}\)。`
  },
  "supp-p4-large-numbers-common-check-v3": {
    en: String.raw`Check that each factor divides with no remainder and that each claimed common factor or multiple applies to both numbers. A common factor must divide both numbers exactly; the H.C.F. is their greatest positive common factor. A common multiple must be divisible by both numbers; the L.C.M. is their least positive common multiple. For 12 and 18, the H.C.F. is 6 and the L.C.M. is 36.`,
    zh: String.raw`檢查每個因數都能整除，並核對每個聲稱的公因數或公倍數是否同時適用於兩個數。公因數必須能整除兩數；最大公因數是兩數最大的正公因數。公倍數必須同時是兩數的倍數；最小公倍數是兩數最小的正公倍數。12 和 18 的最大公因數是 6，最小公倍數是 36。`
  },
  "supp-p3-fractions-intro-common-check-v3": {
    en: String.raw`Check that the denominator names the equal parts. The denominator 3 in \(1/3\) means the whole is divided into three equal parts. For example, multiplying the numerator and denominator of \(2/3\) by 2 gives \(4/6\), so \(2/3=4/6\).`,
    zh: String.raw`檢查分母是否表示等份總數。\(1/3\) 的分母 3 表示整體分成三等份。例如，把 \(2/3\) 的分子和分母同乘 2，得到 \(4/6\)，所以 \(2/3=4/6\)。`
  },
  "supp-p4-perimeter-area-common-check-v3": {
    en: String.raw`Use linear units for perimeter and square units for area. Perimeter measures the outside boundary; when the lengths are in centimetres, report it in centimetres. Area measures a surface, so when the lengths are in centimetres, \(6\times4-3\times2=18\) is reported in square centimetres.`,
    zh: String.raw`周界用長度單位，面積用平方單位。周界量度外圍；當邊長以厘米表示時，周界以厘米作答。面積量度表面，所以當邊長以厘米表示時，\(6\times4-3\times2=18\) 要以平方厘米作答。`
  },
  "supp-p6-percentages-common-check-v3": {
    en: String.raw`Add the percentage amount to the original amount for an increase and subtract it from the original amount for a decrease. Since 25% of the original 60 is 15, a 25% increase gives \(60+15=75\); a 25% decrease gives \(60-15=45\).`,
    zh: String.raw`增加時，把百分數所代表的數量加到原數量；減少時，則從原數量減去該數量。原數量 60 的 \(25\%\) 是 15，所以增加 \(25\%\) 後是 \(60+15=75\)；減少 \(25\%\) 後是 \(60-15=45\)。`
  },
  "supp-p6-speed-common-check-v3": {
    en: String.raw`Check whether to divide or multiply using the units. Total distance divided by total elapsed time gives average speed, so \(120\text{ km}\div2\text{ h}=60\text{ km/h}\). If a speed of \(6\text{ km/h}\) is maintained for \(3\text{ h}\), then the distance is \(6\text{ km/h}\times3\text{ h}=18\text{ km}\).`,
    zh: String.raw`按單位檢查應除還是乘。總路程除以總時間得平均速率，所以 \(120\text{ 公里}\div2\text{ 小時}=60\text{ 公里每小時}\)。若以 \(6\text{ 公里每小時}\) 的速率持續 \(3\text{ 小時}\)，路程就是 \(6\text{ 公里每小時}\times3\text{ 小時}=18\text{ 公里}\)。`
  },
  "supp-transformations-common-check-v3": {
    en: String.raw`Label original and image points clearly. For one stated transformation, apply it once to each original point: translating \((1,2)\) by \((3,-1)\) gives \((4,1)\), and reflecting in the \(x\)-axis changes only the sign of \(y\). If the question states a sequence of transformations, use the image from one stated step as the input to the next.`,
    zh: String.raw`清楚標示原像點和影像點。若題目只指定一次變換，就把該變換對每個原像點套用一次：把 \((1,2)\) 按 \((3,-1)\) 平移得到 \((4,1)\)；關於 \(x\) 軸反射只會改變 \(y\) 坐標的符號。若題目指定一連串變換，則把上一步的影像作為下一步的輸入。`
  },
  "supp-quadratic-patterns-first-step-v3": {
    en: String.raw`Look for second differences, the vertex, or the axis of symmetry. For equally spaced input values, constant non-zero second differences indicate a quadratic pattern. A parabola has no centre of symmetry; its vertex lies on its axis of symmetry and helps locate the graph. For \(y=x^2+2x+1\), the axis of symmetry is \(x=-b/(2a)=-1\), and the vertex is \((-1,0)\).`,
    zh: String.raw`先找二階差、頂點或對稱軸。當輸入值等距時，固定且非零的二階差表示二次規律。拋物線沒有對稱中心；它的頂點位於對稱軸上，可用來確定圖像的位置。對 \(y=x^2+2x+1\)，對稱軸是 \(x=-b/(2a)=-1\)，頂點是 \((-1,0)\)。`
  }
} as const;

const repairContract = repairContractJson as typeof repairContractJson & { repairs: Repair[] };
const residual28Snapshot = residual28SnapshotJson as typeof residual28SnapshotJson & { questions: Question[] };
const residual28ReconstructionCoordinate =
  repairContract.sourceSnapshot.preimageVersionManifestReconstruction;
const residual28BoundVersionManifest = readHongKongResidual28ReconstructionSource({
  repositoryRoot: process.cwd(),
  sourcePostimagePath: residual28ReconstructionCoordinate.sourcePostimagePath,
  sourcePostimageSha256: residual28ReconstructionCoordinate.sourcePostimageSha256
}).versionManifest as unknown as typeof versionManifestJson;
const activeById = new Map(questions.map((question) => [question.id, question] as const));
const frozenById = new Map<string, Question>(
  (residual28Snapshot.questions as Question[]).map((question) => [question.id, question] as const)
);

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function fileSha(relativePath: string) {
  return sha256(readFileSync(join(process.cwd(), relativePath)));
}

function sorted<T extends string>(values: Iterable<T>) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function setPath(target: Record<string, any>, path: string, value: string) {
  const option = path.match(/^options\[(\d+)]\.([a-z]+)$/);
  if (option) {
    target.options[Number(option[1])][option[2]] = value;
    return;
  }
  const [first, second] = path.split(".");
  if (second) target[first][second] = value;
  else target[first] = value;
}

function expectedSuccessor(oldQuestion: Question, repair: Repair): Question {
  const expected = structuredClone(oldQuestion) as Question & Record<string, any>;
  expected.id = repair.toId;
  for (const [path, value] of Object.entries(repair.replacements)) {
    if (typeof value !== "string") {
      assert.fail(`${repair.fromId}: replacement ${path} must be a string`);
    }
    setPath(expected, path, value);
  }
  return expected;
}

function leafDiffPaths(left: unknown, right: unknown, path = ""): string[] {
  if (Object.is(left, right)) return [];
  if (
    left === null || right === null ||
    typeof left !== "object" || typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)
  ) return [path];
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  return [...keys].flatMap((key) =>
    leafDiffPaths(leftRecord[key], rightRecord[key], path ? `${path}.${key}` : key)
  );
}

function displayedHongKongQuestions() {
  return topics.filter((topic) => topic.curriculumTrack === "HK").flatMap((topic) => {
    const lesson = productionLessonByTopicId.get(topic.id);
    assert.ok(lesson, `${topic.id}: missing lesson`);
    const candidates = lesson.practiceQuestionIds?.length
      ? lesson.practiceQuestionIds.map((questionId) => {
        const question = activeById.get(questionId);
        assert.ok(question, `${topic.id}: missing literal lesson question ${questionId}`);
        return question;
      })
      : questions.filter((question) => question.curriculumTrack === "HK" && question.topicId === topic.id);
    const selected = selectLessonPracticeQuestions(candidates);
    assert.equal(selected.length, 5, `${topic.id}: lesson selection count`);
    return selected;
  });
}

test("residual47 authority, partition, preimage, and repair artifacts are exact immutable bytes", () => {
  assert.equal(HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID, "hk-residual47-repair-contract-v1");
  assert.equal(
    fileSha("coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger.json"),
    "0db36ad492e282d68fbe9a5ead50fd3156809f7ee8c2e6812ce2e973a6ef89e6"
  );
  assert.equal(
    fileSha("coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json"),
    "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37"
  );
  assert.equal(
    fileSha("data/historical/hongKongQuestions-residual28-preimage-20260813.json"),
    "8f9cc79f256fec67f1818942c4aaab3d00fbdbb87c465869f4ed4e4675494059"
  );
  assert.equal(
    fileSha("coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json"),
    "89891eb15b8823f29c7ca5c22a1a7f59ad4501d5c7600fea7a2ef82dce72f0b4"
  );
  assert.equal(
    fileSha("data/historical/hongKongResidual28PromotionManifest.json"),
    "b1e77a04e0ef7c6d381afcd114e790bdaae97dedc5b8829328fe0d7945aa7540"
  );
  assert.equal(residual47LedgerJson.counts.reviewedRows, 47);
  assert.equal(residual47LedgerJson.counts.confirmedDefectRows, 28);
  assert.equal(residual47LedgerJson.counts.confirmedIssueInstances, 29);
  assert.equal(residual47LedgerJson.counts.cleanRows, 19);
  assert.equal(residual47PartitionJson.residualCount, 47);
  assert.equal(residual47PartitionJson.residualOrderedIdSha256, "c33a5f05db153f39b7b7328177f7c3f894f711e12d642b182e77504051bc00b6");
  assert.equal(residual47PartitionJson.residualPayloadSha256, "fb2d405426994d4fd2ede55ee706fc3ede7582ebaac2380a1f64fc3ece65f88c");
});

test("the exact 28-row snapshot binds full Question objects, 27 v2 rows, one base row, and one identical history overlap", () => {
  assert.equal(residual28Snapshot.sourceQuestionsSha256, "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a");
  assert.equal(residual28Snapshot.questions.length, 28);
  assert.equal(new Set(residual28Snapshot.questions.map((question) => question.id)).size, 28);
  assert.equal(residual28Snapshot.questions.filter((question) => /-v2$/.test(question.id)).length, 27);
  assert.deepEqual(residual28Snapshot.questions.filter((question) => !/-v2$/.test(question.id)).map((question) => question.id), [
    "supp-p4-decimals-guided-example"
  ]);
  assert.equal(sha256Json(residual28Snapshot.questions), "77357d41cffa3bea7660aea9ec5062fe6adfe8949188208ccc7e146818817465");
  assert.equal(sha256Json(residual28Snapshot.questions.map((question) => question.id)), "bd6e3fb5f22b13851de17e1b4674795683a06a96dd03c9073199cda112887aa5");
  assert.equal(sha256Json(sorted(residual28Snapshot.questions.map((question) => question.id))), "2f0b7ad4bc2e8f984ad315ab29233b4b170bee6ddd1894f242fbba8f5fb32cc6");

  for (const repair of repairContract.repairs) {
    const frozen = frozenById.get(repair.fromId);
    assert.ok(frozen, `${repair.fromId}: missing frozen object`);
    assert.equal(sha256Json(frozen), repair.preimageQuestionPayloadSha256, `${repair.fromId}: complete-object SHA`);
  }
  const preExisting = historicalHongKongQuestions.find((question) => question.id === "supp-p4-decimals-guided-example");
  assert.ok(preExisting);
  assert.deepEqual(preExisting, frozenById.get(preExisting.id));
});

test("the machine contract binds exact28 repairs plus exact11 semantic re-audit rows and 13 issue instances", () => {
  assert.equal(repairContract.repairs.length, 28);
  assert.equal(repairContract.counts.originalAdjudicationIssueInstances, 29);
  assert.equal(repairContract.counts.commonCheckExplanationRows, 25);
  assert.equal(repairContract.counts.firstStepExplanationRows, 2);
  assert.equal(repairContract.counts.answerAndOptionRows, 4);
  assert.equal(repairContract.counts.distractorOptionRows, 1);
  assert.equal(repairContract.counts.semanticReauditRows, 11);
  assert.equal(repairContract.counts.semanticReauditIssueInstances, 13);
  assert.equal(repairContract.counts.changedPathCount, 69);
  assert.equal(repairContract.counts.promptRows, 1);
  assert.equal(repairContract.counts.v2ToV3, 27);
  assert.equal(repairContract.counts.baseToV2, 1);
  assert.equal(repairContract.cleanRows.length, 19);
  assert.deepEqual(assertCheckedInHongKongResidual28RepairContract(), repairContractJson);
  assert.deepEqual(assertCheckedInHongKongResidual28PromotionManifest(), residual28PromotionManifestJson);
  assert.deepEqual(hongKongResidual28PromotionManifest, residual28PromotionManifestJson);
  assert.deepEqual(
    hongKongResidual28Promotions.map((promotion) => ({
      fromId: promotion.fromId,
      baseId: promotion.baseId,
      toId: promotion.toId,
      preimageQuestionPayloadSha256: promotion.preimageQuestionPayloadSha256,
      allowedPaths: promotion.allowedPaths,
      replacements: promotion.replacements
    })),
    repairContract.repairs
  );
  assert.deepEqual(
    sorted(repairContract.repairs.map((repair) => repair.fromId)),
    sorted(residual47LedgerJson.rows.filter((row) => row.classification === "confirmed-defect").map((row) => row.id))
  );
  assert.deepEqual(
    sorted(repairContract.cleanRows.map((row) => row.id)),
    sorted(residual47LedgerJson.rows.filter((row) => row.classification === "independently-clean-on-bound-snapshot").map((row) => row.id))
  );
  assert.equal(
    fileSha("coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v2.json"),
    "e7770b90edb29e3aa3fea35ab6ded53b84ebaa607122c21ef9a90c96cd23bbec"
  );
  assert.equal(
    fileSha("coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json"),
    "e8bbb5926275c612e025c75da1ebb7c63aa35c2f3b753a908948d7a90ad47dc3"
  );
  assert.equal(
    semanticReaudit.supersedes.repairContractPath,
    "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json"
  );
  assert.equal(
    semanticReaudit.supersedes.repairContractSha256,
    "3dca07ca1d34af54e09444c462d41671b8dfbc3dd340ea4a24960e1334816235"
  );
  assert.equal(
    fileSha(semanticReaudit.supersedes.repairContractPath),
    semanticReaudit.supersedes.repairContractSha256
  );
  assert.equal(
    repairContract.authority.semanticReauditPath,
    "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json"
  );
  assert.equal(
    fileSha(repairContract.authority.semanticReauditPath),
    repairContract.authority.semanticReauditSha256
  );
  assert.equal(semanticReaudit.rows.length, 11);
  assert.equal(new Set(semanticReaudit.rows.map((row) => row.toId)).size, 11);
  const issueCodes = semanticReaudit.rows.flatMap((row) => row.issueCodes);
  assert.equal(issueCodes.length, 13);
  assert.equal(new Set(issueCodes).size, 13);
  const semanticCategories = semanticReaudit.rows.map((row) => row.semanticCategory);
  assert.equal(semanticCategories.length, 11);
  assert.equal(new Set(semanticCategories).size, 11);
  assert.equal(semanticReaudit.counts.semanticCategories, semanticCategories.length);
  assert.equal(repairContract.authority.supersessionReason.includes("exact-eight"), false);
  assert.match(repairContract.authority.supersessionReason, /exact-eleven/);
  for (const category of semanticCategories) {
    assert.equal(
      repairContract.authority.supersessionReason.split(category).length - 1,
      1,
      `${category}: exact row category must appear exactly once in provenance`
    );
  }
  assert.equal(semanticReaudit.counts.rows, semanticReaudit.rows.length);
  assert.equal(semanticReaudit.counts.issueInstances, issueCodes.length);
  assert.deepEqual(
    semanticReaudit.rows.map((row) => ({
      toId: row.toId,
      allowedPaths: row.allowedPaths,
      replacements: row.replacements
    })),
    repairContract.repairs
      .filter((repair) => semanticReaudit.rows.some((row) => row.toId === repair.toId))
      .map((repair) => ({
        toId: repair.toId,
        allowedPaths: repair.allowedPaths,
        replacements: repair.replacements
      })),
    "exact11 report and repair-contract rows must match bidirectionally and byte-for-byte"
  );
  assert.deepEqual(
    sorted(semanticReaudit.rows.map((row) => row.toId)),
    sorted(Object.keys(exactSemanticReauditExplanations)),
    "the report cannot add or omit a semantic-reaudit row"
  );
  for (const row of semanticReaudit.rows) {
    assert.deepEqual(
      {
        en: row.replacements["explanation.en"],
        zh: row.replacements["explanation.zh"]
      },
      exactSemanticReauditExplanations[row.toId as keyof typeof exactSemanticReauditExplanations],
      `${row.toId}: independently duplicated exact learner explanation`
    );
  }
});

test("every repair has only its exact allowed leaf delta and every successor object equals the frozen contract", () => {
  for (const repair of hongKongResidual28Promotions) {
    const frozen = frozenById.get(repair.fromId);
    assert.ok(frozen, `${repair.fromId}: missing frozen preimage`);
    const active = activeById.get(repair.toId);
    assert.ok(active, `${repair.fromId}: missing successor ${repair.toId}`);
    const expected = expectedSuccessor(frozen, repair);
    const expectedDiffs = sorted(leafDiffPaths(frozen, expected));
    const actualDiffs = sorted(leafDiffPaths(frozen, active));
    const declaredPaths = repair.allowedPaths.map((path) => path.replace(/^options\[(\d+)]/, "options.$1"));
    assert.deepEqual(expectedDiffs, sorted(["id", ...declaredPaths]), `${repair.fromId}: allowed path declaration`);
    assert.deepEqual(actualDiffs, expectedDiffs, `${repair.fromId}: no unapproved field delta`);
    assert.deepEqual(active, expected, `${repair.fromId}: exact successor object`);
    assert.equal(sha256Json(frozen), repair.preimageQuestionPayloadSha256, `${repair.fromId}: preimage payload SHA`);
    assert.equal(sha256Json(active), repair.successorQuestionPayloadSha256, `${repair.fromId}: successor payload SHA`);
    assert.equal(
      sha256(questionMaterialFingerprint(frozen)),
      repair.preimageMaterialSha256,
      `${repair.fromId}: preimage material SHA`
    );
    assert.equal(
      sha256(questionMaterialFingerprint(active)),
      repair.successorMaterialSha256,
      `${repair.fromId}: successor material SHA`
    );
  }

  const optionSeed = frozenById.get("supp-transformations-common-check-v2");
  assert.ok(optionSeed?.options);
  for (const [path, value] of [
    ["options[0].en", "replacement-option-zero-en"],
    ["options[0].zh", "替換選項零中文"],
    ["options[3].en", "replacement-option-three-en"],
    ["options[3].zh", "替換選項三中文"]
  ] as const) {
    const actual: Question = structuredClone(optionSeed);
    const expected: Question = structuredClone(optionSeed);
    const match = path.match(/^options\[(\d+)]\.(en|zh)$/);
    assert.ok(match);
    expected.options![Number(match[1])][match[2] as "en" | "zh"] = value;
    applyHongKongResidual47Replacement(actual, path, value);
    assert.deepEqual(actual, expected, `${path}: mutate exactly one localized option leaf`);
  }

  const noOptions = structuredClone(optionSeed);
  delete noOptions.options;
  assert.throws(() => applyHongKongResidual47Replacement(noOptions, "options[0].en", "x"));
  for (const invalidPath of [
    "options[4].en",
    "options[-1].en",
    "options[0.5].en",
    "options[0].zhHans",
    "options[0].en.value",
    "options.en"
  ]) {
    assert.throws(
      () => applyHongKongResidual47Replacement(structuredClone(optionSeed), invalidPath, "x"),
      `${invalidPath}: malformed or out-of-range option path must fail closed`
    );
  }
  assert.throws(
    () => applyHongKongResidual47Replacement(
      structuredClone(optionSeed),
      "options[0].en",
      undefined as unknown as string
    ),
    "non-string replacement must fail closed"
  );
});

test("all 19 clean residual rows remain active and byte-exact", () => {
  for (const clean of repairContract.cleanRows) {
    const active = activeById.get(clean.id);
    assert.ok(active, `${clean.id}: clean row missing`);
    assert.equal(sha256Json(active), clean.questionPayloadSha256, `${clean.id}: clean row drift`);
  }
});

test("all 28 old IDs are retired and immutable, all exact next IDs are active, and compact lineage changes only 55 affected keys", () => {
  assert.equal(activeHongKongQuestionIdByHistoricalId.size, 1111);
  assert.equal(retiredHongKongQuestionIds.size, 1112);
  assert.equal(Object.keys(versionManifestJson.activeIdByHistoricalId).length, 1111);
  assert.equal(versionManifestJson.retiredHistoricalIds.length, 1112);
  assert.deepEqual(Object.fromEntries(activeHongKongQuestionIdByHistoricalId), versionManifestJson.activeIdByHistoricalId);
  assert.deepEqual(sorted(retiredHongKongQuestionIds), sorted(versionManifestJson.retiredHistoricalIds));

  const affectedKeys = new Set<string>();
  for (const repair of repairContract.repairs) {
    affectedKeys.add(repair.baseId);
    affectedKeys.add(repair.fromId);
    assert.equal(activeById.has(repair.fromId), false, `${repair.fromId}: old ID active`);
    assert.equal(activeById.has(repair.toId), true, `${repair.toId}: successor missing`);
    assert.equal(retiredHongKongQuestionIds.has(repair.fromId), true, `${repair.fromId}: not retired`);
    assert.equal(activeHongKongQuestionIdByHistoricalId.get(repair.fromId), repair.toId, `${repair.fromId}: direct map`);
    assert.deepEqual(historicalHongKongQuestionForId(repair.fromId), frozenById.get(repair.fromId), `${repair.fromId}: immutable resolution`);
    if (repair.fromId.endsWith("-v2")) {
      assert.equal(activeHongKongQuestionIdByHistoricalId.get(repair.baseId), repair.toId, `${repair.baseId}: base must map directly to v3`);
      assert.notEqual(activeHongKongQuestionIdByHistoricalId.get(repair.baseId), repair.fromId, `${repair.baseId}: chained v2 map forbidden`);
    }
  }
  assert.equal(affectedKeys.size, 55);
  const nonTargetMap = Object.entries(residual28BoundVersionManifest.activeIdByHistoricalId)
    .filter(([oldId]) => !affectedKeys.has(oldId))
    .sort(([left], [right]) => left.localeCompare(right));
  const oldIds = new Set(repairContract.repairs.map((repair) => repair.fromId));
  const nonTargetRetired = residual28BoundVersionManifest.retiredHistoricalIds
    .filter((oldId) => !oldIds.has(oldId))
    .sort((left, right) => left.localeCompare(right));
  assert.equal(sha256Json(nonTargetMap), repairContract.sourceSnapshot.unaffectedMappingEntriesSha256);
  assert.equal(sha256Json(nonTargetRetired), repairContract.sourceSnapshot.unaffectedRetiredIdsSha256);

  const reconstructedPreimage = {
    schemaVersion: residual28BoundVersionManifest.schemaVersion,
    historySourceCommit: residual28BoundVersionManifest.historySourceCommit,
    ...reverseResidual28VersionManifestPostimage(
      residual28BoundVersionManifest.activeIdByHistoricalId,
      residual28BoundVersionManifest.retiredHistoricalIds
    )
  };
  const reconstructedBytes = serializeResidual28VersionManifestSnapshot(reconstructedPreimage);
  assert.equal(Buffer.byteLength(reconstructedBytes), 80523);
  assert.equal(sha256(reconstructedBytes), repairContract.sourceSnapshot.preimageVersionManifestReconstruction.sha256);
  assert.equal(sha256(reconstructedBytes), hongKongResidual28PromotionManifest.preimageVersionManifestReconstruction.sha256);
});

test("the immutable resolver adds exactly 27 unique residual preimages and exposes all 1791 generations", () => {
  const uniqueIds = new Set([
    ...historicalHongKongQuestions.map((question) => question.id),
    ...successorHistoricalHongKongQuestions.map((question) => question.id),
    ...easeV2HistoricalHongKongQuestions.map((question) => question.id),
    ...easeExact3V3HistoricalHongKongQuestions.map((question) => question.id),
    ...(displayed74SnapshotJson.questions as Question[]).map((question) => question.id),
    ...residual28Snapshot.questions.map((question) => question.id)
  ]);
  assert.equal(uniqueIds.size, 1791);
  for (const questionId of uniqueIds) assert.ok(historicalHongKongQuestionForId(questionId), `${questionId}: unresolved immutable generation`);
});

test("all exact learner-facing semantics are clean, localized MC answers remain unique, and decimal grading stays strict", () => {
  assert.equal(Object.keys(exactSemanticReauditExplanations).length, 11);
  const independentlyReviewedAnswers = hkIndependentAnswersById();
  for (const [toId, expectedExplanation] of Object.entries(exactSemanticReauditExplanations)) {
    const active = activeById.get(toId);
    assert.ok(active, `${toId}: semantic-reaudit successor missing`);
    assert.deepEqual(active.explanation, expectedExplanation, `${toId}: exact semantic-reaudit explanation`);

    const repair = repairContract.repairs.find((candidate) => candidate.toId === toId);
    assert.ok(repair, `${toId}: semantic-reaudit promotion missing`);
    const frozen = frozenById.get(repair.fromId);
    assert.ok(frozen, `${toId}: semantic-reaudit frozen preimage missing`);
    assert.deepEqual(active.prompt, frozen.prompt, `${toId}: prompt must stay byte-semantic`);
    if (repair.allowedPaths.includes("answer")) {
      assert.deepEqual(repair.allowedPaths, [
        "answer", "explanation.en", "explanation.zh", "options[0].en", "options[0].zh"
      ], `${toId}: exact answer-and-option five-path delta`);
      assert.equal(active.answer, repair.replacements.answer, `${toId}: exact replacement answer`);
      assert.deepEqual(active.options?.[0], {
        en: active.answer,
        zh: repair.replacements["options[0].zh"]
      });
      assert.deepEqual(active.options?.slice(1), frozen.options?.slice(1), `${toId}: distractor indices and bytes`);
      assert.equal(active.options?.filter((option) => option.en === active.answer).length, 1, `${toId}: unique English correct option`);
      assert.equal(active.options?.filter((option) => option.zh === active.options?.[0].zh).length, 1, `${toId}: unique Chinese correct option`);
      assert.equal(questionAnswerMatches(active, active.answer), true, `${toId}: new English answer accepted`);
      assert.equal(questionAnswerMatches(active, active.options?.[0].zh ?? ""), true, `${toId}: new Chinese answer accepted`);
      assert.equal(questionAnswerMatches(active, frozen.answer), false, `${toId}: superseded English answer rejected`);
      assert.equal(questionAnswerMatches(active, frozen.options?.[0].zh ?? ""), false, `${toId}: superseded Chinese answer rejected`);
      assert.equal(independentlyReviewedAnswers.get(toId), active.answer, `${toId}: active-generation answer oracle`);
    } else if (repair.allowedPaths.includes("options[3].en")) {
      assert.deepEqual(repair.allowedPaths, [
        "explanation.en", "explanation.zh", "options[3].en", "options[3].zh"
      ], `${toId}: exact distractor four-path delta`);
      assert.equal(active.answer, frozen.answer, `${toId}: answer must stay byte-semantic`);
      assert.deepEqual(active.options?.slice(0, 3), frozen.options?.slice(0, 3), `${toId}: options 0..2 and order`);
      assert.deepEqual(active.options?.[3], {
        en: repair.replacements["options[3].en"],
        zh: repair.replacements["options[3].zh"]
      });
      assert.equal(questionAnswerMatches(active, active.options?.[3].en ?? ""), false, `${toId}: new distractor rejected`);
      assert.equal(questionAnswerMatches(active, active.options?.[3].zh ?? ""), false, `${toId}: localized new distractor rejected`);
    } else {
      assert.deepEqual(repair.allowedPaths, ["explanation.en", "explanation.zh"], `${toId}: explanation-only delta`);
      assert.equal(active.answer, frozen.answer, `${toId}: answer must stay byte-semantic`);
      assert.deepEqual(active.options, frozen.options, `${toId}: options must stay byte-semantic`);
    }
  }

  function hasConstantNonZeroSecondDifference(outputs: readonly number[]) {
    const firstDifferences = outputs.slice(1).map((value, index) => value - outputs[index]);
    const secondDifferences = firstDifferences.slice(1).map((value, index) => value - firstDifferences[index]);
    return secondDifferences.length > 0
      && secondDifferences[0] !== 0
      && secondDifferences.every((value) => value === secondDifferences[0]);
  }

  assert.equal(hasConstantNonZeroSecondDifference([0, 1, 4, 9]), true, "genuine quadratic table");
  assert.equal(hasConstantNonZeroSecondDifference([1, 3, 5, 7]), false, "linear second-difference-zero table");
  assert.equal(hasConstantNonZeroSecondDifference([5, 5, 5, 5]), false, "constant second-difference-zero table");

  const quadratic = activeById.get("supp-quadratic-patterns-first-step-v3");
  assert.ok(quadratic);
  const quadraticPayload = JSON.stringify(quadratic.explanation);
  assert.equal(quadraticPayload.includes("constant second differences identify a quadratic sequence"), false);
  assert.equal(quadraticPayload.includes("vertex and axis locate a parabola's centre"), false);
  assert.equal(quadraticPayload.includes("固定的二階差可辨認二次數列"), false);
  assert.equal(quadraticPayload.includes("頂點和對稱軸則可確定拋物線的中心位置"), false);
  assert.match(quadratic.explanation.en, /constant non-zero second differences/);
  assert.match(quadratic.explanation.zh, /固定且非零的二階差/);
  assert.match(quadratic.explanation.en, /no centre of symmetry/);
  assert.match(quadratic.explanation.zh, /沒有對稱中心/);
  const a = 1;
  const b = 2;
  const c = 1;
  const axis = -b / (2 * a);
  const vertexY = a * axis ** 2 + b * axis + c;
  assert.deepEqual({ axis, vertex: [axis, vertexY] }, { axis: -1, vertex: [-1, 0] });
  assert.equal(
    quadratic.explanation.en.includes(String.raw`axis of symmetry is \(x=-b/(2a)=-1\), and the vertex is \((-1,0)\)`),
    true
  );
  assert.equal(
    quadratic.explanation.zh.includes(String.raw`對稱軸是 \(x=-b/(2a)=-1\)，頂點是 \((-1,0)\)`),
    true
  );

  const forbidden = [
    "This check is consistent with both the key fact",
    "the other checks would preserve a topic-specific error rather than expose it",
    "The alternatives instead encode these specific misconceptions",
    "這項檢查同時符合關鍵知識",
    "其餘檢查會保留本課題的具體錯誤，而不能揭示錯誤",
    "其餘選項分別包含以下具體誤解"
  ];
  for (const repair of repairContract.repairs) {
    const question = activeById.get(repair.toId);
    assert.ok(question);
    const payload = JSON.stringify(question);
    for (const phrase of forbidden) assert.equal(payload.includes(phrase), false, `${repair.toId}: leaked '${phrase}'`);
    if (question.type === "multiple-choice") {
      const correct = question.options?.filter((option) => option.en === question.answer) ?? [];
      assert.equal(correct.length, 1, `${repair.toId}: unique English answer option`);
      assert.ok(correct[0].zh.trim(), `${repair.toId}: localized correct option`);
      assert.equal(questionAnswerMatches(question, question.answer), true, `${repair.toId}: stored answer rejected`);
      assert.equal(questionAnswerMatches(question, correct[0].zh), true, `${repair.toId}: Chinese correct option rejected`);
    }
  }

  const counting = activeById.get("supp-p1-counting-number-bonds-common-check-v3");
  assert.ok(counting?.options);
  assert.equal(counting.answer, "Check whether the question asks for the number before, the number after, or a missing part");
  assert.equal(counting.options[0].en, counting.answer);
  assert.equal(counting.options[0].zh, "檢查題目問的是前一個數、後一個數，還是缺少的數");

  const decimal = activeById.get("supp-p4-decimals-guided-example-v2");
  assert.ok(decimal);
  assert.deepEqual(decimal.prompt, {
    en: "Find 4.6−1.2. Give your answer as a decimal.",
    zh: "計算 4.6−1.2，並以小數作答。"
  });
  assert.equal(hasStrictQuestionResponseContract("supp-p4-decimals-guided-example"), false);
  assert.equal(hasStrictQuestionResponseContract(decimal.id), true);
  assert.ok(questionResponseContractFor(decimal.id));
  assert.equal(questionAnswerMatches(decimal, "3.4"), true);
  assert.equal(questionAnswerMatches(decimal, "17/5"), false);
  assert.equal(questionAnswerMatches(decimal, "34/10"), false);
});

test("post-repair HK remains the exact disjoint 255 displayed plus 701 EASE plus promoted residual47 partition", () => {
  const activeHk = questions.filter((question) => question.curriculumTrack === "HK");
  const displayed = displayedHongKongQuestions();
  const displayedIds = new Set(displayed.map((question) => question.id));
  const easeIds = new Set(activeHk.filter((question) => /^hk-ease-\d+-v\d+$/.test(question.id)).map((question) => question.id));
  const residual = activeHk.filter((question) => !displayedIds.has(question.id) && !easeIds.has(question.id));
  const repairByOldId = new Map(repairContract.repairs.map((repair) => [repair.fromId, repair] as const));
  const expectedResidualIds = residual47PartitionJson.residualIds.map((oldId) => repairByOldId.get(oldId)?.toId ?? oldId);

  assert.equal(activeHk.length, 1003);
  assert.equal(displayed.length, 255);
  assert.equal(displayedIds.size, 255);
  assert.equal(easeIds.size, 701);
  assert.equal(residual.length, 47);
  assert.deepEqual(displayed.filter((question) => easeIds.has(question.id)), []);
  assert.deepEqual(residual.map((question) => question.id), expectedResidualIds);
  assert.equal(new Set(expectedResidualIds).size, 47);
  assert.deepEqual(expectedResidualIds.filter((questionId) => displayedIds.has(questionId) || easeIds.has(questionId)), []);
  assert.equal(easeHistoryJson.questions.length, 701);
});

test("residual28 provenance and recovered source evidence are package-local exhaustive and fail closed", () => {
  assertCheckedInHongKongResidual47Evidence();
  assertCheckedInHongKongResidual47LedgerV2();
  assertCheckedInHongKongResidual28PreimageSnapshot();
  const checkedInSource = assertCheckedInHongKongResidual28SourcePreimage();
  const extractedSource = extractHongKongResidual28SourcePreimage();
  assert.deepEqual(extractedSource, checkedInSource, "immutable source-map recovery must reproduce checked-in bytes");
  const mutate = (change: (artifacts: any) => void) => {
    const artifacts = structuredClone(hongKongResidual28ProvenanceArtifacts) as any;
    change(artifacts);
    return artifacts;
  };
  const rejectsScan = (change: (artifacts: any) => void, pattern: RegExp) =>
    assert.throws(() => scanHongKongResidual28Provenance(mutate(change)), pattern);
  const rejectsGraph = (
    change: (artifacts: any) => void,
    pattern: RegExp,
    versionManifest?: unknown
  ) => assert.throws(
    () => assertHongKongResidual28ProvenanceGraph(
      mutate(change),
      versionManifest === undefined ? undefined : structuredClone(versionManifest)
    ),
    pattern
  );

  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.classification = "unknown-class"; }, /unknown provenance classification/);
  rejectsScan((artifacts) => { delete artifacts.ledgerV2.sourceSnapshot.currentSource.sha256; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.extra = true; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.sha256 = artifacts.ledgerV2.sourceSnapshot.currentSource.sha256.toUpperCase(); }, /malformed\/lowercase classified SHA/);
  rejectsScan((artifacts) => { delete artifacts.ledgerV2.evidence.partition.sha256; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.evidence.partition.sha256 = artifacts.ledgerV2.evidence.partition.sha256.toUpperCase(); }, /malformed\/lowercase classified SHA/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.rows[2].proposal.extra = true; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.rows[2].proposal.exactWordingArtifact.extra = true; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.rows[0].proposal.exactWordingArtifactSha256 = null; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.path = "/data/questions.ts"; }, /absolute provenance path forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.path = ".tmp/data/questions.ts"; }, /temporary provenance path forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.path = "data/../data/questions.ts"; }, /traversal provenance path forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.path = "data\\questions.ts"; }, /separator forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.orphanPath = "data/questions.ts"; }, /orphan path/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.orphanSha256 = artifacts.ledgerV2.scope.residualOrderedIdSha256; }, /orphan or unapproved standalone SHA/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.raw = { path: "data/questions.ts", sha256: artifacts.ledgerV2.sourceSnapshot.currentSource.sha256 }; }, /unclassified lowercase provenance key forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.raw = { path: "data/questions.ts" }; }, /unclassified lowercase provenance key forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.raw = { sha256: artifacts.ledgerV2.sourceSnapshot.currentSource.sha256 }; }, /unclassified lowercase provenance key forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.raw = { nested: { path: "data/questions.ts", sha256: artifacts.ledgerV2.sourceSnapshot.currentSource.sha256 } }; }, /unclassified lowercase provenance key forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.scope.residualOrderedIdSha256 = null; }, /nullable SHA bypass forbidden/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.sourceSnapshot.originalSourceCoordinate.classification = "non-authoritative-recovery-coordinate"; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.ledgerV2.rows[0].classification = "non-authoritative-historical-coordinate"; }, /non-authoritative classification misuse/);
  rejectsGraph((artifacts) => { artifacts.ledgerV2.sourceSnapshot.currentSource.sha256 = "0".repeat(64); }, /referenced bytes drift/);
  rejectsGraph((artifacts) => { artifacts.ledgerV2.evidence.partition.path = "coordination/content-qa/authoritative/2026-08-13-hk-residual47-Partition.json"; }, /repository path spelling drift/);
  rejectsGraph((artifacts) => { artifacts.sourceRecoveryReceipt.recoveredArtifact.path = "coordination/content-qa/authoritative/2026-08-13-data-questions-preimage.txt"; }, /referenced bytes drift/);
  rejectsGraph((artifacts) => { artifacts.ledgerV2.evidence.duplicate = artifacts.ledgerV2.evidence.partition; }, /duplicate\/cyclic object occurrence forbidden/);
  rejectsGraph((artifacts) => { artifacts.ledgerV2.evidence.unexpected = structuredClone(artifacts.ledgerV2.evidence.partition); }, /provenance pair occurrence count drift/);

  rejectsScan((artifacts) => { delete artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.serialization; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.unexpected = true; }, /exact object shape drift/);
  rejectsScan((artifacts) => { artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.serialization = "equivalent prose"; }, /reconstruction serialization drift/);
  rejectsGraph((artifacts) => { artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.sourcePostimageSha256 = "0".repeat(64); }, /reconstruction source drift/);
  rejectsGraph((artifacts) => { artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.byteLength += 1; }, /reconstruction byte length drift/);
  rejectsGraph((artifacts) => { artifacts.repairContract.sourceSnapshot.preimageVersionManifestReconstruction.sha256 = "0".repeat(64); }, /reconstruction output drift/);
  rejectsGraph((artifacts) => { artifacts.promotionManifest.promotions[0].toId = "mutated-successor"; }, /injected mapping drift/);
  const mutatedVersionManifest = structuredClone(residual28BoundVersionManifest) as any;
  mutatedVersionManifest.activeIdByHistoricalId[residual28PromotionManifestJson.promotions[0].fromId] = "mutated-successor";
  rejectsGraph(() => {}, /injected mapping drift/, mutatedVersionManifest);
  rejectsGraph((artifacts) => { artifacts.promotionManifest.promotions[0].extra = true; }, /injected promotion: exact object shape drift/);

  const configuredTmpRoot = process.env.TMPDIR;
  assert.ok(typeof configuredTmpRoot === "string", "runner-provided TMPDIR is required");
  const tmpRoot = realpathSync(configuredTmpRoot);
  const runRoot = realpathSync(dirname(tmpRoot));
  const workspaceRoot = realpathSync(process.cwd());
  assert.equal(basename(tmpRoot), "tmp", "TMPDIR must be the runner receipt tmpRoot");
  assert.equal(dirname(runRoot), join(workspaceRoot, ".tmp", "hk-question-bank-evidence-runs"));
  const outerReceipt = JSON.parse(readFileSync(join(runRoot, "outer-exit-receipt.json"), "utf8"));
  assert.equal(outerReceipt.uniqueRunRoot, true);
  assert.equal(realpathSync(outerReceipt.runRoot), runRoot);
  assert.equal(realpathSync(outerReceipt.paths.tmpRoot), tmpRoot);
  const fixturePrefix = "hk-residual-provenance-paths.";
  assert.deepEqual(readdirSync(tmpRoot).filter((name) => name.startsWith(fixturePrefix)), []);
  const pathFixtureRoot = mkdtempSync(join(tmpRoot, fixturePrefix));
  const fakeRepository = join(pathFixtureRoot, "repository");
  const outsideRepository = join(pathFixtureRoot, "outside");
  mkdirSync(fakeRepository);
  mkdirSync(outsideRepository);
  writeFileSync(join(outsideRepository, "escape.txt"), "escape\n");
  symlinkSync(join(outsideRepository, "escape.txt"), join(fakeRepository, "direct-link.txt"));
  symlinkSync(outsideRepository, join(fakeRepository, "linked-directory"));
  try {
    assert.throws(
      () => hashRepositoryProvenanceFile("../outside/escape.txt", fakeRepository),
      /traversal provenance path forbidden/
    );
    assert.throws(
      () => hashRepositoryProvenanceFile("direct-link.txt", fakeRepository),
      /symlink provenance target forbidden/
    );
    assert.throws(
      () => hashRepositoryProvenanceFile("linked-directory/escape.txt", fakeRepository),
      /physical repository escape forbidden/
    );
  } finally {
    rmSync(pathFixtureRoot, { recursive: true, force: false });
  }
  assert.equal(existsSync(pathFixtureRoot), false, "path mutation fixture cleanup failed");
  assert.deepEqual(readdirSync(tmpRoot).filter((name) => name.startsWith(fixturePrefix)), []);

  const graph = assertHongKongResidual28ProvenanceGraph(hongKongResidual28ProvenanceArtifacts);
  assert.equal(graph.pairs.length, 63);
  assert.equal(graph.standalone.length, 219);
  assert.equal(graph.nonAuthoritative.length, 3);
  assert.equal(graph.reconstructible.length, 2);
});

assertHongKongResidual47FocusedTestLedger(HONG_KONG_RESIDUAL47_REPAIR_CONTRACT_SUITE_ID);
