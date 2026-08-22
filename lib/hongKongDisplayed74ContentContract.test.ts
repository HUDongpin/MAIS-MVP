import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createHongKongDisplayed74Test } from "./hongKongDisplayed74FocusedTestLedger";

import { questions, retiredHongKongQuestionIds } from "@/data/questions";
import type { Question } from "@/types";
import displayed74SnapshotJson from "../data/historical/hongKongQuestions-displayed255-preimage-20260813.json";
import genericExplanationContractJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-generic-explanations.json";
import preimageExtractionManifestJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-preimage-extraction-manifest.json";
import repairContractJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-repair-contract.json";
import { questionMaterialFingerprint } from "./hongKongQuestionVersioning";

export const HONG_KONG_DISPLAYED74_CONTENT_CONTRACT_SUITE_ID = "hk-displayed74-content-contract-v1" as const;
const test = createHongKongDisplayed74Test(HONG_KONG_DISPLAYED74_CONTENT_CONTRACT_SUITE_ID);

const repairContract = repairContractJson;
const genericExplanationContract = genericExplanationContractJson.explanations as Record<string, Question["explanation"]>;
const displayed74Snapshot = displayed74SnapshotJson as typeof displayed74SnapshotJson & { questions: Question[] };
const preimageExtractionManifest = preimageExtractionManifestJson;
const genericFirstStepIds = repairContract.explanation.genericFirstStepIds;
const genericCommonCheckIds = repairContract.explanation.genericCommonCheckIds;

const bespoke: Record<string, { prompt?: { en: string; zh: string }; explanation: { en: string; zh: string } }> = {
  "supp-p5-volume-first-step-v2": {
    prompt: {
      en: "Identify the volume and dimensions, then decide which quantity is unknown before choosing the operation",
      zh: "先辨認體積和各個尺寸，再找出未知量，然後選擇運算"
    },
    explanation: {
      en: "Here height is unknown. From V = lwh, divide the volume by the base area: h = 48 ÷ (4 × 3) = 4 cm.",
      zh: "這題的未知量是高。由 V = lwh，用體積除以底面積：h = 48 ÷（4 × 3）= 4 厘米。"
    }
  },
  "supp-p5-charts-averages-first-step-v2": {
    explanation: {
      en: "Use the legend to match 9 to Class A and 6 to Class B in the same category; then add 9 + 6 = 15 votes.",
      zh: "先按圖例把同一類別中的 9 票配對到甲班、6 票配對到乙班，再計算 9 + 6 = 15 票。"
    }
  },
  "supp-p6-ratio-proportion-first-step-v2": {
    prompt: {
      en: "For a mean, divide the total by the number of data values; for a broken-line graph, read the axis labels, scales, units, and data order first",
      zh: "求平均數時用總和除以數據個數；閱讀折線圖時先看坐標軸標籤、刻度、單位和數據次序"
    },
    explanation: {
      en: "For 6, 8, 10, the mean is (6 + 8 + 10) ÷ 3 = 8. On a broken-line graph, the axis labels, scales, units, and point order determine what each segment represents.",
      zh: "對 6、8、10，平均數是（6 + 8 + 10）÷ 3 = 8。閱讀折線圖時，坐標軸標籤、刻度、單位和各點次序決定每條線段所表示的意思。"
    }
  },
  "supp-statistics-s1-first-step-v2": {
    prompt: {
      en: "Identify whether the question asks for a measure of centre or spread; order the data when finding the median",
      zh: "先辨認題目要求集中趨勢還是離散程度；求中位數時把數據排序"
    },
    explanation: {
      en: "The range is a measure of spread, not an average: 12 − 3 = 9. For the median, order the data before selecting the middle value.",
      zh: "全距是離散程度的量度，不是平均數：12 − 3 = 9。求中位數時，先把數據排序，再找中間值。"
    }
  },
  "supp-differentiation-intro-first-step-v2": {
    explanation: {
      en: "A derivative describes gradient or rate of change. For x^n, the power rule calculates the derivative: d/dx(x^n) = nx^(n−1).",
      zh: "導數表示斜率或變化率。對 x^n，冪法則可求出導數：d/dx(x^n) = nx^(n−1)。"
    }
  },
  "supp-ratios-common-check-v2": {
    explanation: {
      en: "When scaling a ratio, every term must use the same multiplier. For 3:5, multiplying both terms by the one-part value 5 gives shares 15:25, which still has ratio 3:5.",
      zh: "縮放一個比時，每一項都必須使用同一倍數。對 3:5，把兩項同乘每份的數值 5，得 15:25，所得比仍是 3:5。"
    }
  },
  "supp-statistics-s1-common-check-v2": {
    explanation: {
      en: "Sort the data first: 2, 5, 9. The middle value is then 5, so the median is 5.",
      zh: "先把數據排序為 2、5、9。中間值是 5，所以中位數是 5。"
    }
  },
  "supp-polynomials-common-check-v2": {
    explanation: {
      en: "Expand the proposed factors and simplify; the result must reproduce every term of the original polynomial. For example, x(x + 4) = x^2 + 4x.",
      zh: "把所擬因式展開並化簡，結果必須重現原多項式的每一項。例如，x(x + 4) = x^2 + 4x。"
    }
  },
  "supp-identities-square-patterns-common-check": {
    explanation: {
      en: "Expand both factors and check every term and sign. For example, (a − b)^2 = (a − b)(a − b) ≡ a^2 − 2ab + b^2; the two ab terms combine to −2ab.",
      zh: "展開兩個因式並檢查每一項和正負號。例如，（a − b）^2 =（a − b）（a − b）≡ a^2 − 2ab + b^2；兩個 ab 項合併為 −2ab。"
    }
  },
  "supp-circles-common-check-v2": {
    explanation: {
      en: "Mark every radius from the centre; radii of the same circle are equal. At a point of contact, also mark the 90° angle between the radius and the tangent.",
      zh: "標示由圓心連到圓周的每條半徑；同一圓的半徑相等。在接觸點亦要標示半徑與切線之間的 90° 角。"
    }
  },
  "supp-calculus-common-check-v2": {
    explanation: {
      en: "At a stationary point, compare the sign of f'(x) immediately before and after it: + to − gives a local maximum, − to + gives a local minimum, and no sign change gives neither.",
      zh: "在駐點處，比較其前後 f'(x) 的正負：由正變負是局部極大值，由負變正是局部極小值；若沒有變號，則兩者都不是。"
    }
  },
  "supp-exam-revision-common-check-v2": {
    explanation: {
      en: "Use minutes per mark to set the working-time budget, then reserve a separate final checking period; give priority in that period to high-mark answers.",
      zh: "先按每分所需分鐘設定作答時間預算，再另外預留最後檢查時間；檢查時優先核對高分題。"
    }
  }
};

const authoringPhrases = [
  "The topic's key fact shows why this structure matters",
  "The alternatives instead encode these specific misconceptions",
  "This check is consistent with both the key fact",
  "the other checks would preserve a topic-specific error rather than expose it",
  "本課題的關鍵知識說明這個結構為何重要",
  "其餘選項分別包含以下具體誤解",
  "這項檢查同時符合關鍵知識",
  "其餘檢查會保留本課題的具體錯誤，而不能揭示錯誤"
] as const;

const distractorRepairs = repairContract.distractorReplacements;

const baseToV2Ids = new Set([
  "supp-identities-square-patterns-first-step",
  "supp-arc-length-sector-area-first-step",
  "supp-arc-length-sector-area-common-check",
  "supp-identities-square-patterns-common-check",
  "q2",
  "supp-algebra-basics-key-fact",
  "q18",
  "supp-polynomials-guided-example",
  "hk-s3-identities-square-patterns-1",
  "supp-identities-square-patterns-key-fact",
  "graph-p4-decimals-number-line"
]);

function expectedNextId(oldId: string) {
  return baseToV2Ids.has(oldId) ? `${oldId}-v2` : oldId.replace(/-v2$/, "-v3");
}

function repairedQuestion(oldId: string): Question {
  const expected = expectedNextId(oldId);
  const question = questions.find((candidate) => candidate.id === expected);
  assert.ok(question, `${oldId}: missing mandatory successor ${expected}`);
  assert.equal(questions.some((candidate) => candidate.id === oldId), false, `${oldId}: old generation remains active`);
  assert.equal(retiredHongKongQuestionIds.has(oldId), true, `${oldId}: old generation is not retired`);
  return question;
}

function correctLocalizedOption(question: Question) {
  const option = question.options?.find((candidate) => candidate.en === question.answer);
  assert.ok(option, `${question.id}: missing localized correct option`);
  return option;
}

function activeQuestionForBase(baseId: string) {
  const matches = questions.filter((question) => question.id === baseId || question.id.startsWith(`${baseId}-v`));
  assert.equal(matches.length, 1, `${baseId}: expected exactly one active generation`);
  return matches[0];
}

function normalizeMeaning(value: string) {
  return value
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/\s+/g, " ")
    .trim();
}

function materialSha(question: Question) {
  return createHash("sha256").update(questionMaterialFingerprint(question)).digest("hex");
}

function sha256Json(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

const explanationIds = [
  ...genericFirstStepIds,
  ...genericCommonCheckIds,
  ...repairContract.explanation.bespokeFirstStepIds,
  ...repairContract.explanation.bespokeCommonCheckIds
];
const responseIds = repairContract.responseDefectIds;
const oldQuestionById = new Map(displayed74Snapshot.questions.map((question) => [question.id, question]));

function leafDiffPaths(left: unknown, right: unknown, path = ""): string[] {
  if (Object.is(left, right)) return [];
  if (
    left === null || right === null ||
    typeof left !== "object" || typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)
  ) return [path];

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = sortedUnique([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  return keys.flatMap((key) => leafDiffPaths(leftRecord[key], rightRecord[key], path ? `${path}.${key}` : key));
}

function expectedRepairedQuestion(oldQuestion: Question): Question {
  const expected = structuredClone(oldQuestion) as Question & { diagram?: Record<string, unknown> };
  expected.id = expectedNextId(oldQuestion.id);

  const genericExplanation = genericExplanationContract[oldQuestion.id];
  if (genericExplanation) expected.explanation = structuredClone(genericExplanation);

  const bespokeContract = bespoke[oldQuestion.id];
  if (bespokeContract) {
    expected.explanation = structuredClone(bespokeContract.explanation);
    if (bespokeContract.prompt) {
      assert.ok(expected.options, `${oldQuestion.id}: bespoke first-step row needs options`);
      expected.options[0] = structuredClone(bespokeContract.prompt);
      expected.answer = bespokeContract.prompt.en;
    }
  }

  const distractorRepair = distractorRepairs.find((repair) => repair.id === oldQuestion.id);
  if (distractorRepair) {
    assert.ok(expected.options, `${oldQuestion.id}: distractor repair needs options`);
    expected.options[distractorRepair.index] = structuredClone(distractorRepair.replacement);
  }

  if (oldQuestion.id === repairContract.tank.id) {
    expected.prompt = structuredClone(repairContract.tank.prompt);
    expected.explanation = structuredClone(repairContract.tank.explanation);
  }

  if (oldQuestion.id === repairContract.numberLineDisclosure.id) {
    assert.ok(expected.diagram, `${oldQuestion.id}: disclosure policy requires the preserved number-line diagram`);
    expected.diagram.semanticDisclosurePolicy = structuredClone(repairContract.numberLineDisclosure.value);
  }

  return expected;
}

function machineAllowedLeafPaths(oldId: string): string[] {
  const matrix = repairContract.allowedQuestionDeltaMatrix;
  if ((matrix.explanationOnlyIds as readonly string[]).includes(oldId)) return [...matrix.explanationOnlyLeafPaths];
  if ((matrix.firstStepOptionAnswerExplanationIds as readonly string[]).includes(oldId)) {
    return [...matrix.firstStepOptionAnswerExplanationLeafPaths];
  }
  const distractor = distractorRepairs.find((repair) => repair.id === oldId);
  if (distractor) return [...distractor.allowedLeafPathsIncludingVersionedId];
  if (matrix.tankPromptExplanationId === oldId) return [...matrix.tankPromptExplanationLeafPaths];
  if (matrix.numberLineDisclosureOnlyId === oldId) return [...matrix.numberLineDisclosureOnlyLeafPaths];
  if ((matrix.responseContractOnlyNoQuestionObjectDeltaIds as readonly string[]).includes(oldId)) {
    return [...matrix.responseContractOnlyNoQuestionObjectDeltaLeafPaths];
  }
  assert.fail(`${oldId}: no machine-readable allowed-delta category`);
}

test("the machine-readable adjudication sets independently bind 61 explanation rows, 16 response rows, exact overlap 3, and union 74", () => {
  assert.equal(HONG_KONG_DISPLAYED74_CONTENT_CONTRACT_SUITE_ID, "hk-displayed74-content-contract-v1");
  assert.equal(sha256Json(genericFirstStepIds), "e468dd4295b43bb78eeb47f5cfdee54ebb5a81fa0864c9da5cf72164c248fc9c");
  assert.equal(sha256Json(genericCommonCheckIds), "4cb2fb598fa2422b5c3056072f2ced3762c5684df8f79a1c0de1ca0e1bd06fef");
  assert.equal(sha256Json(repairContract.explanation.bespokeFirstStepIds), "2e6cc581c32d3932715eef6085944a29fcdfbb1c2ece54fc77ce1866401bd51e");
  assert.equal(sha256Json(repairContract.explanation.bespokeCommonCheckIds), "3f0c1f183b2655903c310b08190554900998245273d9accd52257b27d8978e4c");

  const uniqueExplanationIds = sortedUnique(explanationIds);
  const uniqueResponseIds = sortedUnique(responseIds);
  const intersection = uniqueExplanationIds.filter((id) => uniqueResponseIds.includes(id));
  const union = sortedUnique([...uniqueExplanationIds, ...uniqueResponseIds]);
  const frozenSnapshotIds = sortedUnique(displayed74Snapshot.questions.map((question) => question.id));

  assert.equal(uniqueExplanationIds.length, 61);
  assert.equal(sha256Json(uniqueExplanationIds), "13e89a093bc1dc2882b1f24cccc8e7581fc13381a98437372bae80d97342acbe");
  assert.equal(uniqueResponseIds.length, 16);
  assert.equal(sha256Json(uniqueResponseIds), "57e9fe8a308402404105b57a6db4f6e5fd3c5cddbc647f03964c2c7db29f123d");
  assert.deepEqual(intersection, [...repairContract.overlapIds].sort((left, right) => left.localeCompare(right)));
  assert.equal(sha256Json(intersection), "0f1eb96c5f5a5ffea195e0b9057c87dcc9903c29338a82437c2c82eba3ab48e8");
  assert.equal(union.length, 74);
  assert.equal(sha256Json(union), "26d50e2670666468c342d20b1a2f8a04992b06a9fab3274e953bf875afaacf93");
  assert.deepEqual(union, frozenSnapshotIds, "the combined independently sourced sets must equal the immutable 74-row snapshot");
});

test("the exact allowed-delta matrix partitions all 74 rows into 55+3+3+1+1+11 non-overlapping contracts", () => {
  const matrix = repairContract.allowedQuestionDeltaMatrix;
  assert.equal(matrix.explanationOnlyIds.length, 55);
  assert.equal(matrix.firstStepOptionAnswerExplanationIds.length, 3);
  assert.equal(matrix.distractorAndExplanationIds.length, 3);
  assert.equal(matrix.responseContractOnlyNoQuestionObjectDeltaIds.length, 11);
  assert.equal(matrix.tankPromptExplanationId, repairContract.tank.id);
  assert.equal(matrix.numberLineDisclosureOnlyId, repairContract.numberLineDisclosure.id);

  const partition = [
    ...matrix.explanationOnlyIds,
    ...matrix.firstStepOptionAnswerExplanationIds,
    ...matrix.distractorAndExplanationIds,
    matrix.tankPromptExplanationId,
    matrix.numberLineDisclosureOnlyId,
    ...matrix.responseContractOnlyNoQuestionObjectDeltaIds
  ];
  assert.equal(partition.length, 74);
  assert.equal(new Set(partition).size, 74);
  assert.deepEqual(sortedUnique(partition), sortedUnique(displayed74Snapshot.questions.map((question) => question.id)));
  for (const oldQuestion of displayed74Snapshot.questions) {
    const expected = expectedRepairedQuestion(oldQuestion);
    assert.deepEqual(
      leafDiffPaths(oldQuestion, expected).sort(),
      machineAllowedLeafPaths(oldQuestion.id).sort(),
      `${oldQuestion.id}: declared paths must exactly describe the frozen expected object`
    );
  }
});

test("the extraction manifest binds every old ID, the exact package-local source bytes, and the execution boundary", () => {
  assert.equal(preimageExtractionManifest.source.path, "data/questions.ts");
  assert.equal(preimageExtractionManifest.source.sha256, "900ab6f081ee5e6e021fa50ec06155bfd13356cddf1d188e8d960b44937d5ef4");
  assert.equal(preimageExtractionManifest.source.byteLength, 195078);
  assert.equal(preimageExtractionManifest.source.lineCount, 3130);
  assert.match(preimageExtractionManifest.source.status, /independently recovered and hash-verified/);
  assert.match(preimageExtractionManifest.source.status, /materialized byte-for-byte as package-local immutable evidence/);
  assert.equal(preimageExtractionManifest.packageLocalSourceEvidence.path, "coordination/content-qa/authoritative/2026-08-13-data-questions-preimage.txt");
  assert.equal(preimageExtractionManifest.packageLocalSourceEvidence.sha256, preimageExtractionManifest.source.sha256);
  assert.match(preimageExtractionManifest.reproducibilityBoundary, /Re-executing that source alone is not claimed to reproduce the full exported bank/);
  assert.match(preimageExtractionManifest.reproducibilityBoundary, /External absolute paths document the recovery chain only and are never read/);
  assert.equal(preimageExtractionManifest.artifact.questionsCount, 74);
  assert.equal(Object.keys(preimageExtractionManifest.objectSha256ByOldId).length, 74);
  assert.equal(Object.keys(preimageExtractionManifest.materialFingerprintSha256ByOldId).length, 74);

  for (const oldQuestion of displayed74Snapshot.questions) {
    assert.equal(
      sha256Json(oldQuestion),
      preimageExtractionManifest.objectSha256ByOldId[oldQuestion.id as keyof typeof preimageExtractionManifest.objectSha256ByOldId],
      `${oldQuestion.id}: immutable complete-object fingerprint`
    );
    assert.equal(
      materialSha(oldQuestion),
      preimageExtractionManifest.materialFingerprintSha256ByOldId[oldQuestion.id as keyof typeof preimageExtractionManifest.materialFingerprintSha256ByOldId],
      `${oldQuestion.id}: immutable material fingerprint`
    );
  }
});

test("the adjudicated explanation queue is exactly 61 rows: 49 generic and 12 bespoke", () => {
  const generic = [...genericFirstStepIds, ...genericCommonCheckIds];
  const bespokeIds = Object.keys(bespoke);
  const machineBespokeIds = [
    ...repairContract.explanation.bespokeFirstStepIds,
    ...repairContract.explanation.bespokeCommonCheckIds
  ];
  assert.equal(generic.length, 49);
  assert.equal(bespokeIds.length, 12);
  assert.deepEqual(sortedUnique(bespokeIds), sortedUnique(machineBespokeIds));
  assert.deepEqual(sortedUnique(Object.keys(genericExplanationContract)), sortedUnique(generic));
  assert.equal(new Set([...generic, ...bespokeIds]).size, 61);
});

test("all 49 generic rows equal the package-local exact bilingual fallback payloads", () => {
  for (const oldId of [...genericFirstStepIds, ...genericCommonCheckIds]) {
    const question = repairedQuestion(oldId);
    const correct = correctLocalizedOption(question);
    const keyFact = activeQuestionForBase(`supp-${question.topicId}-key-fact`);
    const independentlyRecomputed = {
      en: `${correct.en}. ${keyFact.explanation.en}`,
      zh: `${correct.zh}。${keyFact.explanation.zh}`
    };
    const expected = genericExplanationContract[oldId];
    assert.ok(expected, `${oldId}: missing package-local exact fallback`);
    assert.deepEqual(expected, independentlyRecomputed, `${oldId}: machine artifact matches selected option plus active key-fact reasoning`);
    assert.deepEqual(question.explanation, expected, `${oldId}: exact EN/ZH fallback`);
    assert.equal(question.explanation.en.startsWith(`${correct.en}. `), true, `${oldId}: EN starts with selected strategy/check`);
    assert.equal(question.explanation.zh.startsWith(`${correct.zh}。`), true, `${oldId}: ZH starts with selected strategy/check`);
  }
});

test("all 12 bespoke rows preserve the authoritative bilingual wording and revised first steps", () => {
  for (const [oldId, contract] of Object.entries(bespoke)) {
    const question = repairedQuestion(oldId);
    assert.equal(normalizeMeaning(question.explanation.en), normalizeMeaning(contract.explanation.en), `${oldId}: EN explanation`);
    assert.equal(normalizeMeaning(question.explanation.zh), normalizeMeaning(contract.explanation.zh), `${oldId}: ZH explanation`);
    if (contract.prompt) {
      const correct = correctLocalizedOption(question);
      assert.equal(normalizeMeaning(correct.en), normalizeMeaning(contract.prompt.en), `${oldId}: EN first step`);
      assert.equal(normalizeMeaning(correct.zh), normalizeMeaning(contract.prompt.zh), `${oldId}: ZH first step`);
      assert.equal(question.answer, correct.en, `${oldId}: answer follows revised option`);
    }
  }
});

test("all 61 final explanations reject the eight internal authoring phrases", () => {
  const ids = [...genericFirstStepIds, ...genericCommonCheckIds, ...Object.keys(bespoke)];
  for (const oldId of ids) {
    const text = JSON.stringify(repairedQuestion(oldId).explanation);
    for (const phrase of authoringPhrases) assert.equal(text.includes(phrase), false, `${oldId}: leaked '${phrase}'`);
  }
});

test("the three ambiguous distractors are replaced bilingually and the superseded phrases are absent", () => {
  for (const repair of distractorRepairs) {
    const question = repairedQuestion(repair.id);
    const oldQuestion = oldQuestionById.get(repair.id);
    assert.ok(oldQuestion?.options, `${repair.id}: frozen preimage options`);
    assert.ok(question.options, `${repair.id}: repaired options`);
    const learnerPayload = JSON.stringify(question);
    assert.deepEqual(oldQuestion.options[repair.index], repair.old, `${repair.id}: repair must target the adjudicated preimage index`);
    assert.deepEqual(question.options[repair.index], repair.replacement, `${repair.id}: exact bilingual replacement at index ${repair.index}`);
    for (const locale of [repair.old.en, repair.old.zh]) assert.equal(learnerPayload.includes(locale), false, `${repair.id}: ${locale}`);
    const replacementOptions = question.options?.filter((option) =>
      option.en === repair.replacement.en && option.zh === repair.replacement.zh
    ) ?? [];
    assert.equal(replacementOptions.length, 1, `${repair.id}: exact bilingual replacement option`);
    assert.notEqual(replacementOptions[0].en, question.answer, `${repair.id}: distractor cannot be the answer`);
    assert.equal(question.options?.filter((option) => option.en === question.answer).length, 1, `${repair.id}: one defensible best option`);
    for (const index of oldQuestion.options.keys()) {
      if (index === repair.index) continue;
      assert.deepEqual(question.options[index], oldQuestion.options[index], `${repair.id}: option ${index} and ordering must remain byte-equivalent`);
    }
  }
});

test("the tank content is exactly the final cuboid, explicit-unit prompt and learner reasoning", () => {
  const question = repairedQuestion(repairContract.tank.id);
  assert.deepEqual(question.prompt, repairContract.tank.prompt);
  assert.deepEqual(question.explanation, repairContract.tank.explanation);
});

test("the P4 number-line adds only the exact diagram-local nonvisual ordinal-tick disclosure policy", () => {
  assert.equal(repairContract.numberLineDisclosure.path, "diagram.semanticDisclosurePolicy");
  const question = repairedQuestion(repairContract.numberLineDisclosure.id) as Question & {
    diagram?: { semanticDisclosurePolicy?: unknown };
  };
  assert.deepEqual(question.diagram?.semanticDisclosurePolicy, repairContract.numberLineDisclosure.value);
  assert.equal(JSON.stringify(question.diagram?.semanticDisclosurePolicy).includes("3.7"), false);
});

test("every one of the 74 successors has exactly its per-ID allowed delta and all other fields are deep-equal to the frozen preimage", () => {
  for (const oldQuestion of displayed74Snapshot.questions) {
    const expected = expectedRepairedQuestion(oldQuestion);
    const actual = repairedQuestion(oldQuestion.id);
    const expectedPaths = leafDiffPaths(oldQuestion, expected).sort();
    const actualPaths = leafDiffPaths(oldQuestion, actual).sort();
    assert.deepEqual(expectedPaths, machineAllowedLeafPaths(oldQuestion.id).sort(), `${oldQuestion.id}: machine allowed-delta paths`);
    assert.deepEqual(actualPaths, expectedPaths, `${oldQuestion.id}: exact allowed leaf-delta paths`);
    assert.deepEqual(actual, expected, `${oldQuestion.id}: no unapproved learner-content field may drift`);
  }
});

test("the three NOT-DEFECT rows retain their exact pre-adjudication material", () => {
  const locked = new Map([
    ["pq-p2-multiplication-foundations-1-v2", "a407eefd43de7fbd2418e3c4eeef488c75798ab60ce2f1e7461edcda3a8f3560"],
    ["supp-p2-multiplication-foundations-key-fact-v2", "dcd18ded821f622fb024213a7f7fab61b58fddd08353866b348e80ffefe5280c"],
    ["pq-p3-multiplication-division-2-v2", "00f63b41e48669a66f9b5fc03a922f434c6b432ec3f6fa31c473507fe4ece1db"]
  ]);
  for (const [id, expectedSha] of locked) {
    const question = questions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id}: NOT-DEFECT row must remain active at the same ID`);
    assert.equal(materialSha(question), expectedSha, `${id}: NOT-DEFECT material drift`);
  }
});
