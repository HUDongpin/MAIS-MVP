import { createHash } from "node:crypto";

export const ARMS = Object.freeze(["A", "B", "C0", "C"]);
export const VARIANTS = Object.freeze(["V1", "V2", "V3", "V4"]);
export const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
export const PROTOCOL_VERSION = "1.1.1-f2-r";
export const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";

export const REGIONS = Object.freeze([
  { id: "CA", curriculumTrack: "US_CA_MATH", canonicalLocale: "en", publishers: ["CA", "CA", "CA", "CA"] },
  { id: "HK", curriculumTrack: "HK_MATH", canonicalLocale: "zh", publishers: ["EDB", "EDB", "EDB", "EDB"] },
  { id: "MAINLAND", curriculumTrack: "CHINA_MATH", canonicalLocale: "zhHans", publishers: ["PEP", "PEP", "BNU", "HJB"] }
]);

export const STRATA = Object.freeze([
  {
    id: "L1",
    slug: "number-operations",
    knowledgeComponent: "whole-number-addition",
    reasoningStepCount: 1,
    numericComplexityBand: "two-digit-whole-numbers-sum-below-100",
    languageComplexityBand: "single-clause-direct-calculation",
    evidenceSurfaceKind: "equation-result-label",
    lessonTitles: {
      en: ["Adding two-digit numbers", "Checking an addition result"],
      zh: ["兩位數加法", "檢查加法結果"],
      zhHans: ["两位数加法", "检查加法结果"]
    },
    misconception: {
      id: "M-L1-WHOLE-ADDITION",
      primary: "changes one addend or makes a one-unit arithmetic slip",
      distractorCodes: ["one-too-high", "one-too-low", "two-too-high"]
    }
  },
  {
    id: "L2",
    slug: "fraction-operations",
    knowledgeComponent: "like-denominator-fraction-addition-and-reduction",
    reasoningStepCount: 2,
    numericComplexityBand: "proper-fractions-denominator-in-6-8-10-12",
    languageComplexityBand: "two-clause-operation-and-reduction",
    evidenceSurfaceKind: "fraction-result-label",
    lessonTitles: {
      en: ["Adding fractions with a common denominator", "Reducing a fraction to simplest form"],
      zh: ["同分母分數加法", "把分數化為最簡形式"],
      zhHans: ["同分母分数加法", "把分数化为最简形式"]
    },
    misconception: {
      id: "M-L2-LIKE-DENOMINATOR",
      primary: "changes the denominator or omits the required reduction",
      distractorCodes: ["numerator-one-high", "numerator-one-low", "adds-one-whole"]
    }
  },
  {
    id: "L3",
    slug: "rectangle-area",
    knowledgeComponent: "rectangle-area-from-side-lengths",
    reasoningStepCount: 1,
    numericComplexityBand: "integer-side-lengths-3-through-24-product-at-most-100",
    languageComplexityBand: "two-measurements-and-one-area-question",
    evidenceSurfaceKind: "area-result-label",
    lessonTitles: {
      en: ["Finding the area of a rectangle", "Checking square units"],
      zh: ["計算長方形面積", "檢查平方單位"],
      zhHans: ["计算长方形面积", "检查平方单位"]
    },
    misconception: {
      id: "M-L3-RECTANGLE-AREA",
      primary: "uses perimeter or adds a side instead of multiplying side lengths",
      distractorCodes: ["perimeter", "extra-width", "one-too-low"]
    }
  },
  {
    id: "L4",
    slug: "linear-function-evaluation",
    knowledgeComponent: "evaluate-a-linear-function-at-a-given-input",
    reasoningStepCount: 2,
    numericComplexityBand: "positive-integer-slope-input-and-intercept",
    languageComplexityBand: "symbolic-rule-plus-substitution-clause",
    evidenceSurfaceKind: "input-output-table-label",
    lessonTitles: {
      en: ["Evaluating a linear function", "Checking substitution in a function rule"],
      zh: ["計算一次函數的值", "檢查函數代入"],
      zhHans: ["计算一次函数的值", "检查函数代入"]
    },
    misconception: {
      id: "M-L4-LINEAR-EVALUATION",
      primary: "adds the input instead of multiplying it by the slope",
      distractorCodes: ["adds-slope", "one-too-low", "omits-multiplication"]
    }
  }
]);

export const DEFECT_FAMILIES = Object.freeze([
  { id: "F1", label: "answer-solvability-domain-unit-boundary" },
  { id: "F2", label: "equivalent-multiple-choice-options" },
  { id: "F3", label: "explanation-step-mismatch" },
  { id: "F4", label: "accepted-answer-false-reject-or-near-accept" },
  { id: "F5", label: "static-evidence-surface-mismatch" },
  { id: "F6", label: "language-semantic-mismatch" },
  { id: "F7", label: "curriculum-grade-publisher-fit" },
  { id: "F8", label: "template-or-identity-leakage" },
  { id: "F9", label: "oracle-contamination-or-provenance-drift" }
]);

const DEFECT_BLOCKS = Object.freeze({
  D1: ["F1", "F2", "F3", "F4", "F5", "F6"],
  D2: ["F1", "F2", "F3", "F7", "F8", "F9"],
  D3: ["F4", "F5", "F6", "F7", "F8", "F9"]
});

const SEVERITY_BY_FAMILY = Object.freeze({
  F1: "P0",
  F2: "P1",
  F3: "P1",
  F4: "P0",
  F5: "P1",
  F6: "P1",
  F7: "P1",
  F8: "P0",
  F9: "P0"
});

const ITEM_TYPES = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);
const LAST_SOURCE_CHECK = "2026-08-23";

const CA_SOURCE = Object.freeze({
  authority: "California Department of Education",
  documentTitle: "California Common Core State Standards: Mathematics",
  edition: "2013 update",
  url: "https://www2.cde.ca.gov/cacs/math",
  lastChecked: LAST_SOURCE_CHECK
});

const HK_PRIMARY_SOURCE = Object.freeze({
  authority: "Hong Kong Education Bureau, Curriculum Development Council",
  documentTitle: "Supplement to Mathematics Education Key Learning Area Curriculum Guide: Learning Content of Primary Mathematics",
  edition: "2017 curriculum with 2018/2020 explanatory notes",
  url: "https://www.edb.gov.hk/en/curriculum-development/kla/ma/curr/index2.html",
  lastChecked: LAST_SOURCE_CHECK
});

const HK_SECONDARY_SOURCE = Object.freeze({
  authority: "Hong Kong Education Bureau, Curriculum Development Council",
  documentTitle: "Explanatory Notes to Junior Secondary Mathematics Curriculum",
  edition: "2020",
  url: "https://www.edb.gov.hk/attachment/en/curriculum-development/kla/ma/curr/EN_KS3_e.pdf",
  lastChecked: LAST_SOURCE_CHECK
});

const MAINLAND_SOURCE = Object.freeze({
  authority: "中华人民共和国教育部",
  documentTitle: "义务教育数学课程标准（2022年版）",
  edition: "2022年版（2022年5月9日发布文件）",
  url: "https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582346895190.pdf",
  lastChecked: LAST_SOURCE_CHECK
});

const MAINLAND_CATALOG_URL = "https://www.moe.gov.cn/srcsite/A26/s8001/202408/W020240805496325238752.pdf";

const ALIGNMENTS = Object.freeze({
  CA: Object.freeze({
    L1: Object.freeze({
      grade: "2",
      primaryStandardId: "2.NBT.5",
      sourceLocator: "Grade 2 > Number and Operations in Base Ten > use place-value strategies to add and subtract within 100",
      sourceDocument: CA_SOURCE,
      deliveryContext: Object.freeze({ edition: "California CCSS Mathematics, 2013 update", volume: "Grade 2", chapterScope: "Number and Operations in Base Ten", publisherCode: "CA" })
    }),
    L2: Object.freeze({
      grade: "4",
      primaryStandardId: "4.NF.3",
      sourceLocator: "Grade 4 > Number and Operations—Fractions > build fractions from unit fractions",
      sourceDocument: CA_SOURCE,
      deliveryContext: Object.freeze({ edition: "California CCSS Mathematics, 2013 update", volume: "Grade 4", chapterScope: "Number and Operations—Fractions", publisherCode: "CA" })
    }),
    L3: Object.freeze({
      grade: "3",
      primaryStandardId: "3.MD.7",
      sourceLocator: "Grade 3 > Measurement and Data > relate area to multiplication and addition",
      sourceDocument: CA_SOURCE,
      deliveryContext: Object.freeze({ edition: "California CCSS Mathematics, 2013 update", volume: "Grade 3", chapterScope: "Measurement and Data—Area", publisherCode: "CA" })
    }),
    L4: Object.freeze({
      grade: "8",
      primaryStandardId: "8.F.1",
      sourceLocator: "Grade 8 > Functions > understand a function as assigning one output to each input",
      sourceDocument: CA_SOURCE,
      deliveryContext: Object.freeze({ edition: "California CCSS Mathematics, 2013 update", volume: "Grade 8", chapterScope: "Functions", publisherCode: "CA" })
    })
  }),
  HK: Object.freeze({
    L1: Object.freeze({
      grade: "P1",
      primaryStandardId: "EDB.2017.1N4",
      sourceLocator: "Primary 1 learning unit 1N4, Addition and subtraction (I)",
      sourceDocument: HK_PRIMARY_SOURCE,
      deliveryContext: Object.freeze({ edition: "Revised Primary Mathematics Curriculum 2017", volume: "Primary 1", chapterScope: "1N4 Addition and subtraction (I)", publisherCode: "EDB" })
    }),
    L2: Object.freeze({
      grade: "P4",
      primaryStandardId: "EDB.2017.4N6",
      sourceLocator: "Primary 4 learning unit 4N6, Fractions (II)",
      sourceDocument: HK_PRIMARY_SOURCE,
      deliveryContext: Object.freeze({ edition: "Revised Primary Mathematics Curriculum 2017", volume: "Primary 4", chapterScope: "4N6 Fractions (II)", publisherCode: "EDB" })
    }),
    L3: Object.freeze({
      grade: "P4",
      primaryStandardId: "EDB.2017.4M2",
      sourceLocator: "Primary 4 learning unit 4M2, Area (I)",
      sourceDocument: HK_PRIMARY_SOURCE,
      deliveryContext: Object.freeze({ edition: "Revised Primary Mathematics Curriculum 2017", volume: "Primary 4", chapterScope: "4M2 Area (I)", publisherCode: "EDB" })
    }),
    L4: Object.freeze({
      grade: "S1-S3",
      primaryStandardId: "EDB.2017.KS3.LU7.4",
      sourceLocator: "Key Stage 3 learning unit 7, learning objective 7.4: recognise the preliminary idea of functions through input-processing-output",
      sourceDocument: HK_SECONDARY_SOURCE,
      deliveryContext: Object.freeze({ edition: "Junior Secondary Mathematics Curriculum 2017; explanatory notes 2020", volume: "S1-S3", chapterScope: "Learning Unit 7, Algebraic expressions, objective 7.4", publisherCode: "EDB" })
    })
  }),
  MAINLAND: Object.freeze({
    L1: Object.freeze({
      grade: "2",
      primaryStandardId: "MOE.2022.STAGE1.NUMBER_OPERATIONS",
      sourceLocator: "第一学段（1—2年级）> 数与代数 > 数与运算",
      sourceDocument: MAINLAND_SOURCE,
      deliveryContext: Object.freeze({ edition: "2024国家教学用书目录（依据2022年版课标修订）", volume: "二年级上册", chapterScope: "100以内的加法和减法", publisherCode: "PEP", catalogUrl: MAINLAND_CATALOG_URL })
    }),
    L2: Object.freeze({
      grade: "5",
      primaryStandardId: "MOE.2022.STAGE3.FRACTION_OPERATIONS",
      sourceLocator: "第三学段（5—6年级）> 数与代数 > 数与运算（分数运算）",
      sourceDocument: MAINLAND_SOURCE,
      deliveryContext: Object.freeze({ edition: "2024国家教学用书目录（依据2022年版课标修订）", volume: "五年级下册", chapterScope: "分数的加法和减法", publisherCode: "PEP", catalogUrl: MAINLAND_CATALOG_URL })
    }),
    L3: Object.freeze({
      grade: "3",
      primaryStandardId: "MOE.2022.STAGE2.AREA_MEASUREMENT",
      sourceLocator: "第二学段（3—4年级）> 图形与几何 > 图形的测量（面积）",
      sourceDocument: MAINLAND_SOURCE,
      deliveryContext: Object.freeze({ edition: "2024国家教学用书目录（依据2022年版课标修订）", volume: "三年级下册", chapterScope: "面积", publisherCode: "BNU", catalogUrl: MAINLAND_CATALOG_URL })
    }),
    L4: Object.freeze({
      grade: "8",
      primaryStandardId: "MOE.2022.STAGE4.FUNCTIONS",
      sourceLocator: "第四学段（7—9年级）> 数与代数 > 函数",
      sourceDocument: MAINLAND_SOURCE,
      deliveryContext: Object.freeze({ edition: "2024国家教学用书目录（依据2022年版课标修订）", volume: "八年级下册", chapterScope: "函数及其图像", publisherCode: "HJB", catalogUrl: MAINLAND_CATALOG_URL })
    })
  })
});

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deterministicShuffle(values, seed, label) {
  return values
    .map((value, index) => ({ value, index, order: sha256(`${seed}|${label}|${stableStringify(value)}|${index}`) }))
    .sort((left, right) => left.order.localeCompare(right.order) || left.index - right.index)
    .map((row) => row.value);
}

function opaqueId(prefix, seed, label, length = 20) {
  return `${prefix}-${sha256(`${seed}|${label}`).slice(0, length)}`;
}

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function canonicalRational(numerator, denominator = 1) {
  if (denominator === 0) throw new Error("A rational answer cannot have denominator zero.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  const n = (sign * numerator) / divisor;
  const d = Math.abs(denominator) / divisor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function parseRational(value) {
  const text = String(value).trim();
  const fractionMatch = /^(-?\d+)\/(-?\d+)$/.exec(text);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) return null;
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    return { numerator: (sign * numerator) / divisor, denominator: Math.abs(denominator) / divisor };
  }
  if (/^-?\d+$/.test(text) || /^-?\d+\.0+$/.test(text)) return { numerator: Number(text), denominator: 1 };
  return null;
}

function normalizedAnswerKey(value) {
  const rational = parseRational(value);
  return rational ? `r:${rational.numerator}/${rational.denominator}` : `s:${String(value).trim().toLowerCase()}`;
}

function localizedValue(value) {
  return { en: String(value), zh: String(value), zhHans: String(value) };
}

function buildTupleBanks() {
  const banks = { L1: [], L2: [], L3: [], L4: [] };
  for (let left = 11; left <= 79; left += 1) {
    for (let right = 4; right <= 35 && left + right <= 99; right += 1) banks.L1.push([left, right]);
  }
  for (const denominator of [6, 8, 10, 12]) {
    for (let first = 1; first < denominator; first += 1) {
      for (let second = 1; first + second < denominator; second += 1) banks.L2.push([first, second, denominator]);
    }
  }
  for (let width = 3; width <= 24; width += 1) {
    for (let height = 2; height <= 20; height += 1) {
      if (width * height <= 100) banks.L3.push([width, height]);
    }
  }
  for (let slope = 2; slope <= 8; slope += 1) {
    for (let x = 2; x <= 15; x += 1) {
      for (let intercept = 1; intercept <= 20; intercept += 1) banks.L4.push([slope, x, intercept]);
    }
  }
  return banks;
}

const TUPLE_BANKS = buildTupleBanks();

function selectTuple(stratumId, itemIndex, variantIndex, regionIndex) {
  const bank = TUPLE_BANKS[stratumId];
  return bank[(itemIndex * 7 + variantIndex * 137 + regionIndex * 53) % bank.length];
}

function buildItemModel(stratumId, itemIndex, variantIndex, regionIndex) {
  const tuple = selectTuple(stratumId, itemIndex, variantIndex, regionIndex);
  if (stratumId === "L1") {
    const [left, right] = tuple;
    const answer = String(left + right);
    return {
      answer,
      en: `Calculate ${left} + ${right}.`,
      zh: `計算 ${left} + ${right}。`,
      zhHans: `计算 ${left} + ${right}。`,
      explanation: { en: `${left} plus ${right} equals ${answer}.`, zh: `${left} 加 ${right} 等於 ${answer}。`, zhHans: `${left} 加 ${right} 等于 ${answer}。` },
      model: { operation: "addition", operands: [left, right] }
    };
  }
  if (stratumId === "L2") {
    const [first, second, denominator] = tuple;
    const numerator = first + second;
    const answer = canonicalRational(numerator, denominator);
    return {
      answer,
      en: `Add ${first}/${denominator} and ${second}/${denominator}. Give the fraction in simplest form.`,
      zh: `計算 ${first}/${denominator} + ${second}/${denominator}，並把答案化為最簡分數。`,
      zhHans: `计算 ${first}/${denominator} + ${second}/${denominator}，并把答案化为最简分数。`,
      explanation: {
        en: `The denominators match, so add the numerators: ${first} + ${second} = ${numerator}; reduce ${numerator}/${denominator} to ${answer}.`,
        zh: `分母相同，把分子相加：${first} + ${second} = ${numerator}；把 ${numerator}/${denominator} 化簡為 ${answer}。`,
        zhHans: `分母相同，把分子相加：${first} + ${second} = ${numerator}；把 ${numerator}/${denominator} 化简为 ${answer}。`
      },
      model: { operation: "like-denominator-fraction-addition-and-reduction", operands: [first, second, denominator] }
    };
  }
  if (stratumId === "L3") {
    const [width, height] = tuple;
    const answer = String(width * height);
    return {
      answer,
      en: `A rectangle is ${width} units wide and ${height} units high. What is its area in square units?`,
      zh: `一個長方形寬 ${width} 單位、高 ${height} 單位。面積是多少平方單位？`,
      zhHans: `一个长方形宽 ${width} 单位、高 ${height} 单位。面积是多少平方单位？`,
      explanation: { en: `Area equals width times height: ${width} × ${height} = ${answer}.`, zh: `面積等於寬乘高：${width} × ${height} = ${answer}。`, zhHans: `面积等于宽乘高：${width} × ${height} = ${answer}。` },
      model: { operation: "rectangle-area", operands: [width, height] }
    };
  }
  const [slope, x, intercept] = tuple;
  const result = slope * x + intercept;
  return {
    answer: String(result),
    en: `For y = ${slope}x + ${intercept}, find y when x = ${x}.`,
    zh: `已知 y = ${slope}x + ${intercept}，當 x = ${x} 時求 y。`,
    zhHans: `已知 y = ${slope}x + ${intercept}，当 x = ${x} 时求 y。`,
    explanation: { en: `Substitute x = ${x}: y = ${slope} × ${x} + ${intercept} = ${result}.`, zh: `代入 x = ${x}：y = ${slope} × ${x} + ${intercept} = ${result}。`, zhHans: `代入 x = ${x}：y = ${slope} × ${x} + ${intercept} = ${result}。` },
    model: { operation: "linear-function-evaluation", operands: [slope, x, intercept] }
  };
}

function buildDistractors(answer) {
  const rational = parseRational(answer);
  if (!rational) throw new Error(`Unsupported canonical answer: ${answer}`);
  const { numerator, denominator } = rational;
  const candidates = [
    canonicalRational(numerator + 1, denominator),
    canonicalRational(numerator - 1, denominator),
    canonicalRational(numerator + denominator, denominator),
    canonicalRational(numerator + 2, denominator),
    canonicalRational(Math.max(0, numerator - 2), denominator)
  ];
  const seen = new Set([normalizedAnswerKey(answer)]);
  const distractors = [];
  for (const candidate of candidates) {
    const key = normalizedAnswerKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  if (distractors.length !== 3) throw new Error(`Unable to construct three unique distractors for ${answer}.`);
  return distractors;
}

function alignmentFor(region, stratum, publisher) {
  const source = ALIGNMENTS[region.id][stratum.id];
  if (source.deliveryContext.publisherCode !== publisher) throw new Error(`Alignment publisher mismatch for ${region.id}:${stratum.id}:${publisher}.`);
  return {
    grade: source.grade,
    primaryStandardId: source.primaryStandardId,
    sourceLocator: source.sourceLocator,
    sourceDocument: structuredClone(source.sourceDocument),
    deliveryContext: structuredClone(source.deliveryContext),
    identifierScope: region.id === "MAINLAND"
      ? "MAIS structural locator over the official 2022 curriculum; not an official alphanumeric code"
      : "official standard or learning-unit identifier",
    humanRatificationRequired: true,
    ratificationStatus: "candidate-awaiting-independent-A18"
  };
}

function answerContractFor(stratum, answer) {
  const isFraction = stratum.id === "L2";
  return {
    canonicalAnswer: answer,
    canonicalRepresentation: isFraction ? "reduced-fraction" : "base-10-integer",
    normalizationRule: isFraction
      ? "trim whitespace; parse an exact rational; require value equivalence; do not accept decimal approximations or units"
      : "trim whitespace; parse a base-10 integer; require exact numeric equivalence; do not accept units",
    acceptedForms: [answer],
    unitContract: { required: false, canonicalUnit: null, aliases: [] }
  };
}

function buildQuestion({ seed, packageId, itemIndex, variantIndex, region, regionIndex, stratum, publisher }) {
  const type = ITEM_TYPES[itemIndex % ITEM_TYPES.length];
  const model = buildItemModel(stratum.id, itemIndex, variantIndex, regionIndex);
  const questionId = opaqueId("q", seed, `${packageId}|question|${itemIndex}`);
  const optionValues = type === "multiple-choice"
    ? deterministicShuffle([model.answer, ...buildDistractors(model.answer)], seed, `${packageId}|options|${itemIndex}`)
    : undefined;
  const alignment = alignmentFor(region, stratum, publisher);
  return {
    id: questionId,
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    curriculumTrack: region.curriculumTrack,
    publisher,
    gradeBand: alignment.grade,
    standardIds: [alignment.primaryStandardId],
    alignment,
    type,
    prompt: { en: model.en, zh: model.zh, zhHans: model.zhHans },
    answer: model.answer,
    acceptedAnswers: [model.answer],
    answerContract: answerContractFor(stratum, model.answer),
    options: optionValues?.map(localizedValue),
    explanation: model.explanation,
    misconceptionMap: structuredClone(stratum.misconception),
    evidenceSurface: { kind: stratum.evidenceSurfaceKind, renderMode: "static-content-contract", expectedLabel: model.answer, visibleLabel: model.answer },
    templateTrace: { publicLabel: null },
    homologyContract: {
      knowledgeComponent: stratum.knowledgeComponent,
      reasoningStepCount: stratum.reasoningStepCount,
      responseForm: type,
      answerRepresentation: stratum.id === "L2" ? "reduced-fraction" : "integer",
      acceptedFormBurden: stratum.id === "L2" ? "one-exact-reduced-rational" : "one-exact-integer",
      numericComplexityBand: stratum.numericComplexityBand,
      languageComplexityBand: stratum.languageComplexityBand,
      misconceptionMapId: stratum.misconception.id,
      evidenceSurfaceKind: stratum.evidenceSurfaceKind
    },
    validation: {
      independentAnswer: model.answer,
      independentAnswerProvenance: "tool-derived-from-structured-model",
      sourceDistance: "synthetic-owner-authored-no-source-wording",
      modelFingerprint: sha256(stableStringify(model.model)).slice(0, 16)
    }
  };
}

function buildLessons({ seed, packageId, region, stratum, publisher, questions }) {
  const alignment = alignmentFor(region, stratum, publisher);
  return [0, 1].map((lessonIndex) => ({
    id: opaqueId("lesson", seed, `${packageId}|lesson|${lessonIndex}`),
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    curriculumTrack: region.curriculumTrack,
    publisher,
    gradeBand: alignment.grade,
    alignment: structuredClone(alignment),
    title: { en: stratum.lessonTitles.en[lessonIndex], zh: stratum.lessonTitles.zh[lessonIndex], zhHans: stratum.lessonTitles.zhHans[lessonIndex] },
    workedExample: { questionId: questions[lessonIndex].id, answer: questions[lessonIndex].answer, explanation: structuredClone(questions[lessonIndex].explanation) }
  }));
}

function buildCleanPackage({ seed, packageId, region, regionIndex, stratum, publisher, variantId, itemsPerPackage }) {
  const variantIndex = VARIANTS.indexOf(variantId);
  const questions = Array.from({ length: itemsPerPackage }, (_, itemIndex) => buildQuestion({ seed, packageId, itemIndex, variantIndex, region, regionIndex, stratum, publisher }));
  const lessons = buildLessons({ seed, packageId, region, stratum, publisher, questions });
  return {
    packageId,
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    sourceBaseline: SOURCE_BASELINE,
    estimandScope: "content-surfaces-only",
    region: region.id,
    stratumId: stratum.id,
    curriculumTrack: region.curriculumTrack,
    publisher,
    canonicalLocale: region.canonicalLocale,
    gradeBand: alignmentFor(region, stratum, publisher).grade,
    questionCount: questions.length,
    lessonCount: lessons.length,
    browserRouteCount: 0,
    questions,
    lessons,
    browserRoutes: []
  };
}

function chooseTargetIndex({ seed, latentBundleId, family, itemTypes, used }) {
  const requiredType = family === "F2" ? "multiple-choice" : undefined;
  const candidates = itemTypes
    .map((type, index) => ({ type, index }))
    .filter((row) => !requiredType || row.type === requiredType)
    .filter((row) => !used.has(row.index));
  const selected = deterministicShuffle(candidates, seed, `${latentBundleId}|target|${family}`)[0];
  if (!selected) throw new Error(`No unused target for ${latentBundleId}:${family}`);
  used.add(selected.index);
  return selected.index;
}

function numericNeighbor(answer) {
  const rational = parseRational(answer);
  return rational ? canonicalRational(rational.numerator + 1, rational.denominator) : `${answer}-near`;
}

function equivalentRepresentation(answer) {
  const rational = parseRational(answer);
  if (!rational) return `${answer} `;
  return rational.denominator === 1 ? `${rational.numerator}.0` : `${rational.numerator * 2}/${rational.denominator * 2}`;
}

function deepDiffPaths(before, after, prefix = "") {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    const paths = [];
    for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
      paths.push(...deepDiffPaths(before[index], after[index], prefix ? `${prefix}.${index}` : String(index)));
    }
    return paths;
  }
  if (before && after && typeof before === "object" && typeof after === "object") {
    const paths = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      paths.push(...deepDiffPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key));
    }
    return paths;
  }
  return [prefix];
}

function setPath(value, pathExpression, replacement) {
  const parts = pathExpression.split(".");
  let cursor = value;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = replacement;
}

function unmodifiedCommitment(value, changedPaths) {
  const clone = structuredClone(value);
  for (const changedPath of changedPaths) setPath(clone, changedPath, "<MUTATED-FIELD>");
  return sha256(stableStringify(clone));
}

function applyDefect(content, family, itemIndex) {
  const question = content.questions[itemIndex];
  const before = structuredClone(question);
  if (family === "F1") {
    question.answer = numericNeighbor(question.answer);
  } else if (family === "F2") {
    const correctIndex = question.options.findIndex((row) => normalizedAnswerKey(row.en) === normalizedAnswerKey(question.answer));
    const replacementIndex = question.options.findIndex((_, index) => index !== correctIndex);
    question.options[replacementIndex] = localizedValue(equivalentRepresentation(question.answer));
  } else if (family === "F3") {
    const incorrectIntermediate = numericNeighbor(question.validation.independentAnswer);
    question.explanation = {
      en: `The incorrect intermediate calculation gives ${incorrectIntermediate}, while the recorded answer remains ${question.answer}.`,
      zh: `錯誤的中間計算得 ${incorrectIntermediate}，但記錄答案仍為 ${question.answer}。`,
      zhHans: `错误的中间计算得 ${incorrectIntermediate}，但记录答案仍为 ${question.answer}。`
    };
  } else if (family === "F4") {
    question.acceptedAnswers = [numericNeighbor(question.answer)];
  } else if (family === "F5") {
    question.evidenceSurface.visibleLabel = numericNeighbor(question.evidenceSurface.expectedLabel);
  } else if (family === "F6") {
    question.prompt.zhHans = "这道题要求计算一个与英文题意不同的量。";
  } else if (family === "F7") {
    question.gradeBand = "UNALIGNED-GRADE";
    question.standardIds = ["MISMATCHED.INTERNAL.STANDARD"];
    question.alignment.grade = "UNALIGNED-GRADE";
    question.alignment.primaryStandardId = "MISMATCHED.INTERNAL.STANDARD";
  } else if (family === "F8") {
    question.templateTrace.publicLabel = `internal-template:${content.stratumId}:${itemIndex}`;
  } else if (family === "F9") {
    question.validation.independentAnswerProvenance = "metadata-copy-from-candidate-answer";
  } else {
    throw new Error(`Unsupported defect family: ${family}`);
  }
  const changedPaths = deepDiffPaths(before, question).sort();
  const unmodifiedFieldsSha256Before = unmodifiedCommitment(before, changedPaths);
  const unmodifiedFieldsSha256After = unmodifiedCommitment(question, changedPaths);
  if (unmodifiedFieldsSha256Before !== unmodifiedFieldsSha256After) throw new Error(`Mutation escaped its declared field paths for ${family}:${question.id}.`);
  return {
    surfaceId: question.id,
    beforeSha256: sha256(stableStringify(before)),
    afterSha256: sha256(stableStringify(question)),
    goldAnswer: before.validation.independentAnswer,
    candidateAnswer: question.answer,
    semanticMutationCount: 1,
    changedFieldGroup: DEFECT_FAMILIES.find((row) => row.id === family).label,
    changedPaths,
    unmodifiedFieldsSha256Before,
    unmodifiedFieldsSha256After
  };
}

function buildLatentBundles(seed) {
  const latentBundles = [];
  REGIONS.forEach((region, regionIndex) => {
    const cleanStratum = deterministicShuffle(STRATA, seed, `${region.id}|clean`)[0].id;
    const defectStrata = deterministicShuffle(STRATA.filter((row) => row.id !== cleanStratum), seed, `${region.id}|defect-strata`);
    const blocks = deterministicShuffle(Object.keys(DEFECT_BLOCKS), seed, `${region.id}|blocks`);
    STRATA.forEach((stratum, stratumIndex) => {
      const defectPosition = defectStrata.findIndex((row) => row.id === stratum.id);
      const status = stratum.id === cleanStratum ? "clean" : "defect-bearing";
      latentBundles.push({
        id: `${region.id}-${stratum.id}`,
        region: region.id,
        stratumId: stratum.id,
        stratumSlug: stratum.slug,
        curriculumTrack: region.curriculumTrack,
        canonicalLocale: region.canonicalLocale,
        publisher: region.publishers[stratumIndex],
        status,
        defectBlock: status === "defect-bearing" ? blocks[defectPosition] : null,
        regionIndex
      });
    });
  });
  return latentBundles;
}

function buildAssignments(seed, latentBundles) {
  const packageAssignments = [];
  for (const region of REGIONS) {
    const regionBundles = latentBundles.filter((row) => row.region === region.id);
    const rowOrder = deterministicShuffle(regionBundles, seed, `${region.id}|latin-rows`);
    const armColumns = deterministicShuffle(ARMS, seed, `${region.id}|latin-arms`);
    const variantLabels = deterministicShuffle(VARIANTS, seed, `${region.id}|latin-variants`);
    rowOrder.forEach((bundle, rowIndex) => {
      armColumns.forEach((arm, columnIndex) => {
        const variantId = variantLabels[(rowIndex + columnIndex) % VARIANTS.length];
        packageAssignments.push({
          packageId: opaqueId("pkg", seed, `${bundle.id}|${variantId}`),
          latentBundleId: bundle.id,
          region: bundle.region,
          stratumId: bundle.stratumId,
          variantId,
          arm,
          status: bundle.status,
          defectBlock: bundle.defectBlock,
          publisher: bundle.publisher
        });
      });
    });
  }
  return packageAssignments;
}

function buildLatentDefects(seed, latentBundles, itemsPerPackage) {
  const latentDefects = [];
  const itemTypes = Array.from({ length: itemsPerPackage }, (_, index) => ITEM_TYPES[index % ITEM_TYPES.length]);
  for (const bundle of latentBundles.filter((row) => row.status === "defect-bearing")) {
    const used = new Set();
    for (const family of DEFECT_BLOCKS[bundle.defectBlock]) {
      latentDefects.push({
        id: opaqueId("ld", seed, `${bundle.id}|${family}`),
        latentBundleId: bundle.id,
        region: bundle.region,
        defectBlock: bundle.defectBlock,
        family,
        severity: SEVERITY_BY_FAMILY[family],
        latentItemIndex: chooseTargetIndex({ seed, latentBundleId: bundle.id, family, itemTypes, used }),
        expectedDisposition: "finding-required"
      });
    }
  }
  return latentDefects;
}

function numericTokens(text) {
  return [...String(text).matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => match[0]).join("|");
}

export function auditCandidateContent(content) {
  const findings = [];
  const push = (family, code, surfaceId) => findings.push({ family, code, surfaceId });
  const prompts = new Map();
  for (const question of content.questions) {
    const promptKey = stableStringify(question.prompt);
    prompts.set(promptKey, [...(prompts.get(promptKey) ?? []), question.id]);
    const answerMismatch = question.answer !== question.validation.independentAnswer;
    if (answerMismatch) push("F1", "answer-independent-mismatch", question.id);
    if (!answerMismatch && !question.acceptedAnswers.includes(question.answer)) push("F4", "accepted-answer-false-reject", question.id);
    if (question.evidenceSurface.visibleLabel !== question.evidenceSurface.expectedLabel) push("F5", "evidence-label-mismatch", question.id);
    if (numericTokens(question.prompt.en) !== numericTokens(question.prompt.zhHans)) push("F6", "cross-language-numeric-mismatch", question.id);
    const expectedAlignment = ALIGNMENTS[content.region][content.stratumId];
    if (
      question.alignment.primaryStandardId !== expectedAlignment.primaryStandardId
      || question.standardIds[0] !== expectedAlignment.primaryStandardId
      || question.gradeBand !== expectedAlignment.grade
      || question.alignment.grade !== expectedAlignment.grade
    ) push("F7", "alignment-contract-mismatch", question.id);
    if (question.templateTrace.publicLabel !== null) push("F8", "internal-template-label-visible", question.id);
    if (question.validation.independentAnswerProvenance !== "tool-derived-from-structured-model") push("F9", "oracle-provenance-contamination", question.id);
    if (question.explanation.en.includes("incorrect intermediate calculation")) push("F3", "explanation-step-mismatch", question.id);
    if (question.type === "multiple-choice") {
      const keys = question.options.map((row) => normalizedAnswerKey(row.en));
      const equivalentOptions = new Set(keys).size !== keys.length;
      const correctValueCount = question.options.filter((row) => normalizedAnswerKey(row.en) === normalizedAnswerKey(question.answer)).length;
      if (equivalentOptions || correctValueCount !== 1) push("F2", "equivalent-or-multiple-correct-options", question.id);
    }
  }
  for (const ids of prompts.values()) {
    if (ids.length > 1) for (const surfaceId of ids) push("NATURAL", "duplicate-tri-locale-prompt", surfaceId);
  }
  const questionsById = new Map(content.questions.map((question) => [question.id, question]));
  for (const lesson of content.lessons) {
    const question = questionsById.get(lesson.workedExample.questionId);
    if (!question) {
      push("NATURAL", "lesson-question-missing", lesson.id);
      continue;
    }
    if (lesson.workedExample.answer !== question.validation.independentAnswer) push("NATURAL", "lesson-answer-mismatch", lesson.id);
    if (/[a-z]+-[a-z]+/.test(lesson.title.zh) || /[a-z]+-[a-z]+/.test(lesson.title.zhHans)) push("NATURAL", "lesson-internal-slug-visible", lesson.id);
  }
  if (content.browserRoutes.length !== 0) push("NATURAL", "browser-estimand-out-of-scope", content.packageId);
  return findings.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId) || left.code.localeCompare(right.code));
}

export function buildCalibrationDesign({ seed, itemsPerPackage = 100 }) {
  if (typeof seed !== "string" || seed.length < 16) throw new Error("A sealed seed of at least 16 characters is required.");
  if (!Number.isInteger(itemsPerPackage) || itemsPerPackage < 80 || itemsPerPackage > 120) throw new Error("itemsPerPackage must be an integer from 80 through 120.");
  const seedCommitment = sha256(seed);
  const latentBundles = buildLatentBundles(seed);
  const packageAssignments = buildAssignments(seed, latentBundles);
  const latentDefects = buildLatentDefects(seed, latentBundles, itemsPerPackage);
  const packages = [];
  const instances = [];
  for (const assignment of packageAssignments) {
    const bundle = latentBundles.find((row) => row.id === assignment.latentBundleId);
    const region = REGIONS.find((row) => row.id === assignment.region);
    const stratum = STRATA.find((row) => row.id === assignment.stratumId);
    const content = buildCleanPackage({ seed, packageId: assignment.packageId, region, regionIndex: bundle.regionIndex, stratum, publisher: bundle.publisher, variantId: assignment.variantId, itemsPerPackage });
    for (const latentDefect of latentDefects.filter((row) => row.latentBundleId === bundle.id)) {
      instances.push({
        id: opaqueId("di", seed, `${latentDefect.id}|${assignment.packageId}`),
        latentDefectId: latentDefect.id,
        packageId: assignment.packageId,
        arm: assignment.arm,
        variantId: assignment.variantId,
        family: latentDefect.family,
        severity: latentDefect.severity,
        ...applyDefect(content, latentDefect.family, latentDefect.latentItemIndex)
      });
    }
    packages.push({ packageId: assignment.packageId, content, contentSha256: sha256(stableStringify(content)) });
  }
  const candidateSetRows = packages.map((row) => ({ packageId: row.packageId, contentSha256: row.contentSha256 })).sort((left, right) => left.packageId.localeCompare(right.packageId));
  const candidateSetSha256 = sha256(stableStringify(candidateSetRows));
  const publicManifest = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: "candidate-only",
    executionStatus: "not-authorized",
    estimandScope: "content-surfaces-only",
    seedCommitment,
    candidateSetSha256,
    counts: {
      independentClusters: latentBundles.length,
      packages: packages.length,
      questions: packages.reduce((sum, row) => sum + row.content.questions.length, 0),
      lessons: packages.reduce((sum, row) => sum + row.content.lessons.length, 0),
      browserRoutes: 0
    },
    packages: candidateSetRows.map((row) => {
      const packageRow = packages.find((candidate) => candidate.packageId === row.packageId);
      return { ...row, status: "candidate-only", questionCount: packageRow.content.questions.length, lessonCount: packageRow.content.lessons.length, browserRouteCount: 0 };
    })
  };
  const sealedManifest = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    seedCommitment,
    candidateSetSha256,
    itemsPerPackage,
    latentBundles: latentBundles.map(({ regionIndex, ...row }) => row),
    packageAssignments
  };
  const goldLedger = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    seedCommitment,
    candidateSetSha256,
    status: "sealed-candidate-gold-not-adjudicated",
    latentDefects,
    instances
  };
  return { seedCommitment, candidateSetSha256, publicManifest, sealedManifest, goldLedger, packages };
}

export function auditCalibrationDesign(design) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  if (design.publicManifest.protocolVersion !== PROTOCOL_VERSION) push("protocol-version", "Unexpected protocol version.");
  if (design.publicManifest.estimandScope !== "content-surfaces-only") push("estimand-scope", "Browser estimand was not removed.");
  if (design.sealedManifest.latentBundles.length !== 12) push("latent-bundle-count", "Expected 12 latent bundles.");
  if (design.packages.length !== 48) push("package-count", "Expected 48 packages.");
  if (design.goldLedger.latentDefects.length !== 54) push("latent-defect-count", "Expected 54 latent defects.");
  if (design.goldLedger.instances.length !== 216) push("defect-instance-count", "Expected 216 defect instances.");
  const packageIds = new Set();
  const surfaceIds = new Set();
  for (const row of design.packages) {
    if (packageIds.has(row.packageId)) push("duplicate-package-id", row.packageId);
    packageIds.add(row.packageId);
    if (row.content.questions.length < 80 || row.content.questions.length > 120) push("question-count", row.packageId);
    if (row.content.lessons.length !== 2) push("lesson-count", row.packageId);
    if (row.content.browserRoutes.length !== 0) push("route-count", row.packageId);
    if (sha256(stableStringify(row.content)) !== row.contentSha256) push("content-hash", row.packageId);
    const expectedFamilies = design.goldLedger.instances.filter((instance) => instance.packageId === row.packageId).map((instance) => instance.family).sort();
    const contentFindings = auditCandidateContent(row.content);
    const observedFamilies = contentFindings.filter((finding) => finding.family !== "NATURAL").map((finding) => finding.family).sort();
    const naturalFindings = contentFindings.filter((finding) => finding.family === "NATURAL");
    if (naturalFindings.length > 0) push("natural-content-defect", `${row.packageId}:${naturalFindings.map((finding) => finding.code).join(",")}`);
    if (stableStringify(expectedFamilies) !== stableStringify(observedFamilies)) push("defect-observability", `${row.packageId}: expected ${expectedFamilies.join(",")} observed ${observedFamilies.join(",")}`);
    for (const question of row.content.questions) {
      if (surfaceIds.has(question.id)) push("duplicate-surface-id", question.id);
      surfaceIds.add(question.id);
      if (!question.prompt.en || !question.prompt.zh || !question.prompt.zhHans) push("language-field", question.id);
      if (!question.answer || !Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length === 0) push("answer-shape", question.id);
      if (!question.answerContract || !question.misconceptionMap || !question.homologyContract) push("qa-contract", question.id);
    }
  }
  for (const instance of design.goldLedger.instances) {
    const packageRow = design.packages.find((row) => row.packageId === instance.packageId);
    if (!packageRow) {
      push("missing-defect-package", instance.packageId);
      continue;
    }
    if (![...packageRow.content.questions, ...packageRow.content.lessons].some((surface) => surface.id === instance.surfaceId)) push("missing-defect-surface", instance.id);
    if (instance.semanticMutationCount !== 1) push("semantic-mutation-count", instance.id);
    if (instance.unmodifiedFieldsSha256Before !== instance.unmodifiedFieldsSha256After) push("mutation-isolation", instance.id);
  }
  const candidateSetRows = design.packages.map((row) => ({ packageId: row.packageId, contentSha256: row.contentSha256 })).sort((left, right) => left.packageId.localeCompare(right.packageId));
  if (sha256(stableStringify(candidateSetRows)) !== design.publicManifest.candidateSetSha256) push("candidate-set-hash", "Candidate-set commitment mismatch.");
  return findings;
}

export function serializeCalibrationArtifact(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
