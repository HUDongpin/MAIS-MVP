import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { signatureLabAssignments, type SignatureLabAssignment } from "./signatureLabAssignments";
import { visualizationLabCatalog } from "./visualizationLabs";
import { premiumThreeDCandidateRegionByLabId } from "../components/visualizations/three/threeDSceneMath";
import { toPrcSimplifiedText } from "../lib/i18n";

const expectedAssignments: Record<string, Pick<SignatureLabAssignment, "primary" | "related">> = {
  "us-ca-math-k-k-oa-compose-decompose": {
    primary: "NumberBondLab",
    related: ["StoryProblemLab", "SubtractionLab"]
  },
  "us-ca-math-p1-1-nbt-place-value": {
    primary: "TwoDigitNumberLab",
    related: [
      "HundredChartLab",
      "NumberLab",
      "TeenNumbersLab",
      "ComparingLab",
      "PlaceJumpLab",
      "PlaceValueStrategiesLab",
      "RegroupingSubtractionLab"
    ]
  },
  "us-ca-math-p1-1-h1-picture-join-stories-to-10": {
    primary: "AddLab",
    related: ["NumberBondLab", "SubtractionLab"]
  },
  "us-ca-math-p1-1-h2-picture-story-addition-equations": {
    primary: "AddLab",
    related: ["EqualSignLab"]
  },
  "us-ca-math-p1-1-h3-cube-train-join-models-to-10": {
    primary: "AddLab",
    related: ["NumberBondLab", "SubtractionLab"]
  },
  "us-ca-math-p1-1-h5-model-equation-join-stories-to-10": {
    primary: "AddLab",
    related: ["EqualSignLab", "SubtractionLab"]
  },
  "us-ca-math-p1-1-h6-equation-match-join-stories-to-10": {
    primary: "AddLab",
    related: ["EqualSignLab"]
  },
  "us-ca-math-p2-2-nbt-three-digit-place-value": {
    primary: "NumberLab",
    related: [
      "PlaceJumpLab",
      "ComparingLab",
      "PlaceValueStrategiesLab",
      "RegroupingSubtractionLab",
      "TwoDigitNumberLab",
      "MultiplesLab"
    ]
  },
  "us-ca-math-p3-3-g-categories": {
    primary: "QuadrilateralLab",
    related: ["EqualAreasLab"]
  },
  "us-ca-math-p4-4-oa-factors-patterns": {
    primary: "FactorLab",
    related: ["PatternsLab", "MultiplesLab", "PrimeNumbersLab", "MultiplicativeComparisonLab", "DivisionLab"]
  },
  "us-ca-math-p5-5-md-volume-data": {
    primary: "VolumeLab",
    related: ["FractionLinePlotLab", "UnitConversionLab"]
  },
  "us-ca-math-p6-chapter-02": {
    primary: "RationalNumbersLab",
    related: [
      "IntegerLab",
      "AbsoluteValueLab",
      "PointLab",
      "FractionDivisionLab",
      "DecimalArithmeticLab",
      "LongDivisionLab",
      "GreatestCommonFactorLab",
      "LCMLab",
      "PrimeFactorizationLab",
      "DistributiveLab",
      "EquivalentFractionsLab"
    ]
  },
  "us-ca-math-s1-chapter-02": {
    primary: "SignedAdditionLab",
    related: ["SignedNumbersLab", "RationalNumbersLab", "AbsoluteValueLab"]
  },
  "us-ca-math-s1-chapter-03": {
    primary: "DistributiveLab",
    related: ["LikeTermsLab", "EquationLab", "InequalityLab", "FormulaLab", "CommutativeLab"]
  },
  "us-ca-math-s2-chapter-01": {
    primary: "EquationLab",
    related: ["SystemsOfEquationsLab", "IrrationalLab", "RationalNumbersLab"]
  },
  "us-ca-math-s2-chapter-03": {
    primary: "TransformationsLab",
    related: ["CongruenceLab", "DilationsLab", "TransversalLab", "TriangleLab"]
  },
  "us-ca-math-s2-chapter-04": {
    primary: "PythagorasLab",
    related: [
      "DistanceLab",
      "RootsLab",
      "ExponentRulesLab",
      "ScientificNotationLab",
      "RectangularPrismLab",
      "ConeLab",
      "CylinderLab",
      "PyramidLab",
      "SphereLab"
    ]
  },
  "us-ca-math-s3-chapter-03": {
    primary: "LineParabolaLab",
    related: [
      "QuadraticEquationLab",
      "QuadraticPolynomialLab",
      "FactoringQuadraticsLab",
      "EquationLab",
      "SystemsOfEquationsLab",
      "EliminationLab"
    ]
  },
  "us-ca-math-s5-chapter-01": {
    primary: "AbsoluteValueLab",
    related: ["UndoLab", "CompositionLab", "SequencesLab"]
  },
  "us-ca-math-s5-chapter-04": {
    primary: "BestFitLab",
    related: [
      "CorrelationLab",
      "LurkingVariableLab",
      "BoxPlotLab",
      "HistogramLab",
      "StandardDeviationLab",
      "VarianceLab",
      "NormalDistributionLab",
      "TableLab"
    ]
  },
  "us-ca-math-s6-chapter-01": {
    primary: "FormulaLab",
    related: ["UnitConversionLab", "RoundingLab", "ScientificNotationLab"]
  },
  "us-ca-math-s6-chapter-04": {
    primary: "LineFunctionLab",
    related: [
      "FunctionLab",
      "SequencesLab",
      "AbsoluteValueLab",
      "PiecewiseLab",
      "PolynomialFunctionLab",
      "QuadraticFunctionLab",
      "QuadraticPolynomialLab",
      "RationalFunctionLab",
      "CompareFunctionsLab"
    ]
  }
};

function californiaLab(labId: string) {
  const lab = visualizationLabCatalog.find((candidate) => candidate.labId === labId);
  assert.ok(lab, `${labId}: missing California visualization lab`);
  return lab;
}

test("A18-reviewed California topics lead with the exact semantic model", () => {
  const assignmentTopicIds = Object.keys(signatureLabAssignments).sort();
  const catalogTopicIds = visualizationLabCatalog
    .filter((lab) => lab.publisher === "US_CA_MATH")
    .map((lab) => lab.topicId)
    .sort();

  assert.equal(assignmentTopicIds.length, 76, "all 76 California assignments remain explicit");
  assert.deepEqual(
    assignmentTopicIds,
    catalogTopicIds,
    "California assignment keys must exactly equal the live California catalog topic IDs"
  );

  for (const [topicId, expected] of Object.entries(expectedAssignments)) {
    const actual = signatureLabAssignments[topicId];
    assert.ok(actual, `${topicId}: missing signature assignment`);
    assert.equal(actual.primary, expected.primary, `${topicId}: semantic primary drifted`);
    assert.deepEqual(actual.related ?? [], expected.related ?? [], `${topicId}: semantic related order drifted`);
    assert.ok(actual.rationale.trim().length > 0, `${topicId}: rationale is required`);
  }
});

test("no-exact-bench routes make only honest, visibly scoped catalog claims", () => {
  const pairOff = californiaLab("us-ca-math-p2-2-oa-fluency-arrays");
  assert.match(pairOff.title.en, /Odd and Even Pair-Off/);
  assert.doesNotMatch(pairOff.title.en, /arrays|fluency/i);
  assert.match(pairOff.description.en, /even.*odd/i);
  assert.doesNotMatch(pairOff.description.en, /arrays|fluency/i);
  assert.match(pairOff.description.en, /none are left over.*even.*one is left over.*odd/i);
  assert.doesNotMatch(pairOff.description.en, /covers?.*only/i);
  assert.doesNotMatch(pairOff.description.zh, /只涵蓋|仍需要/);
  assert.doesNotMatch(pairOff.description.zhHans ?? "", /只涵盖|仍需要/);
  assert.match(pairOff.category.en, /odd and even/i);
  assert.doesNotMatch(pairOff.category.en, /arrays|fluency|number line/i);
  assert.deepEqual(pairOff.californiaAlignment?.standardIds, ["2.OA.C.3"]);
  assert.doesNotMatch(pairOff.californiaAlignment?.capabilitySummary.en ?? "", /arrays|fluency|addition|subtraction/i);

  const quantities = californiaLab("us-ca-math-s6-chapter-01");
  assert.equal(signatureLabAssignments[quantities.topicId].primary, expectedAssignments[quantities.topicId].primary);
  assert.deepEqual(
    signatureLabAssignments[quantities.topicId].related ?? [],
    expectedAssignments[quantities.topicId].related ?? []
  );
  assert.deepEqual(quantities.californiaAlignment?.standardIds, ["N-Q.1", "N-Q.2", "N-Q.3", "Modeling"]);
  assert.match(quantities.studentNote?.text.en ?? "", /connects this practice to California curriculum targets/i);
  assert.match(quantities.studentNote?.text.en ?? "", /What this lab demonstrates:/i);
  assert.match(quantities.studentNote?.text.en ?? "", /formulas.*unit choices.*foundations/i);
  assert.doesNotMatch(quantities.studentNote?.text.en ?? "", /\bIt supports\b/i);
  assert.match(quantities.studentNote?.text.zh ?? "", /課程目標.*本實驗實際展示/);
  assert.match(quantities.studentNote?.text.zhHans ?? "", /课程目标.*本实验实际展示/);
  assert.match(quantities.description.en, /formulas.*unit choices.*foundation.*quantity modeling/i);
  assert.match(quantities.description.en, /units and precision.*full modeling task/i);
  assert.doesNotMatch(quantities.description.en, /partial coverage|dedicated .* bench|still required/i);
  assert.doesNotMatch(quantities.templateConfig.focus.en, /partial coverage|dedicated .* bench|still required/i);
  assert.doesNotMatch(quantities.description.zh, /部分涵蓋|仍需要|專門/);
  assert.doesNotMatch(quantities.description.zhHans ?? "", /部分涵盖|仍需要|专门/);
  assert.doesNotMatch(quantities.templateConfig.focus.zh, /部分涵蓋|仍需要|專門/);
  assert.doesNotMatch(quantities.templateConfig.focus.zhHans ?? "", /部分涵盖|仍需要|专门/);
  assert.doesNotMatch(quantities.description.en, /vectors?|matrices/i);
  assert.ok(
    quantities.californiaAlignment?.standardIds.every((standardId) => !/^N-VM|^A-REI/.test(standardId)),
    "quantities route must not claim vector/matrix or A-REI standards"
  );

  const rates = californiaLab("us-ca-math-s6-chapter-04");
  assert.match(rates.studentNote?.text.en ?? "", /connects this practice to California curriculum targets/i);
  assert.match(rates.studentNote?.text.en ?? "", /constant rates.*average rates.*nonlinear intervals/i);
  assert.doesNotMatch(rates.studentNote?.text.en ?? "", /\bIt supports\b/i);
  assert.match(rates.description.en, /constant rates.*line model/i);
  assert.match(rates.description.en, /average rate.*nonlinear intervals/i);
  assert.doesNotMatch(rates.description.en, /partial coverage|dedicated .* bench|still required/i);
  assert.doesNotMatch(rates.templateConfig.focus.en, /partial coverage|dedicated .* bench|still required/i);
  assert.doesNotMatch(rates.description.zh, /部分涵蓋|仍需要|專門/);
  assert.doesNotMatch(rates.description.zhHans ?? "", /部分涵盖|仍需要|专门/);
  assert.doesNotMatch(rates.templateConfig.focus.zh, /部分涵蓋|仍需要|專門/);
  assert.doesNotMatch(rates.templateConfig.focus.zhHans ?? "", /部分涵盖|仍需要|专门/);
  assert.ok(![rates.templateConfig.focus.en, rates.description.en].some((text) => /derivative/i.test(text)));
  assert.ok(!(signatureLabAssignments[rates.topicId].related ?? []).includes("DerivativeLab"));
});

test("California chapter alignments use the curated source splits instead of domain-wide fallback", () => {
  const expectedStandards: Record<string, string[]> = {
    "us-ca-math-s2-chapter-01": ["8.EE.C.7", "8.EE.C.8", "8.NS.A.1", "8.NS.A.2"],
    "us-ca-math-s2-chapter-03": ["8.G.A.1", "8.G.A.2", "8.G.A.3", "8.G.A.4", "8.G.A.5"],
    "us-ca-math-s2-chapter-04": [
      "8.G.B.6",
      "8.G.B.7",
      "8.G.B.8",
      "8.G.C.9",
      "8.EE.A.1",
      "8.EE.A.2",
      "8.EE.A.3",
      "8.EE.A.4"
    ],
    "us-ca-math-s3-chapter-03": [
      "A-REI.1",
      "A-REI.2",
      "A-REI.3",
      "A-REI.4",
      "A-REI.5",
      "A-REI.6",
      "A-REI.7",
      "A-REI.8",
      "A-REI.9",
      "A-REI.10",
      "A-REI.11",
      "A-REI.12",
      "A-SSE.1",
      "A-SSE.2",
      "A-SSE.3"
    ]
  };

  for (const [labId, standardIds] of Object.entries(expectedStandards)) {
    assert.deepEqual(californiaLab(labId).californiaAlignment?.standardIds, standardIds, `${labId}: standards drifted`);
  }

  const linearQuadratic = californiaLab("us-ca-math-s3-chapter-03");
  assert.equal(linearQuadratic.californiaAlignment?.domainId, "CA.CCSS.Math.A-REI");
  assert.doesNotMatch(linearQuadratic.templateConfig.focus.en, /coordinate geometry|F-LE/i);
  assert.match(linearQuadratic.templateConfig.focus.en, /linear and quadratic/i);
});

test("California line-plot and rounding terminology stays mathematically precise in both Chinese locales", () => {
  const linePlot = californiaLab("us-ca-math-p4-4-md-conversion-angles");
  const linePlotSummary = linePlot.californiaAlignment?.capabilitySummary;
  assert.ok(linePlotSummary, "4.MD capability summary is required");
  assert.match(linePlotSummary.en, /line plots/u);
  assert.match(linePlotSummary.zh, /線圖/u);
  assert.match(linePlotSummary.zhHans ?? "", /线图/u);
  assert.doesNotMatch(linePlotSummary.zh, /線形圖/u);
  assert.doesNotMatch(linePlotSummary.zhHans ?? "", /线形图/u);
  assert.match(linePlot.studentNote?.text.zh ?? "", /線圖/u);
  assert.match(linePlot.studentNote?.text.zhHans ?? "", /线图/u);

  for (const labId of ["us-ca-math-p3-3-nbt-arithmetic", "us-ca-math-p5-5-nbt-decimals"]) {
    const roundingLab = californiaLab(labId);
    const roundingSummary = roundingLab.californiaAlignment?.capabilitySummary;
    assert.ok(roundingSummary, `${labId}: rounding capability summary is required`);
    assert.match(roundingSummary.en, /round(?:ing)?/iu);
    assert.match(roundingSummary.zh, /四捨五入/u);
    assert.match(roundingSummary.zhHans ?? "", /四舍五入/u);
    assert.doesNotMatch(roundingSummary.zh, /取整/u);
    assert.doesNotMatch(roundingSummary.zhHans ?? "", /取整/u);
    assert.match(roundingLab.studentNote?.text.zh ?? "", /四捨五入/u);
    assert.match(roundingLab.studentNote?.text.zhHans ?? "", /四舍五入/u);
  }

  const quantities = californiaLab("us-ca-math-s6-chapter-01");
  const traditionalQuantitySurfaces = [
    quantities.description.zh,
    quantities.templateConfig.focus.zh,
    quantities.californiaAlignment?.capabilitySummary.zh ?? "",
    quantities.studentNote?.text.zh ?? ""
  ];
  const simplifiedQuantitySurfaces = [
    quantities.description.zhHans ?? "",
    quantities.templateConfig.focus.zhHans ?? "",
    quantities.californiaAlignment?.capabilitySummary.zhHans ?? "",
    quantities.studentNote?.text.zhHans ?? ""
  ];

  for (const [index, surface] of traditionalQuantitySurfaces.entries()) {
    assert.match(surface, /(?:四捨五入|捨入)/u, `S6 N-Q Traditional Chinese surface ${index + 1} needs rounding terminology`);
    assert.doesNotMatch(surface, /取整/u, `S6 N-Q Traditional Chinese surface ${index + 1} must not use 取整`);
  }
  for (const [index, surface] of simplifiedQuantitySurfaces.entries()) {
    assert.match(surface, /(?:四舍五入|舍入)/u, `S6 N-Q Simplified Chinese surface ${index + 1} needs rounding terminology`);
    assert.doesNotMatch(surface, /取整/u, `S6 N-Q Simplified Chinese surface ${index + 1} must not use 取整`);
  }
});

test("California premium direct eligibility is derived from the two verified catalog double flags", () => {
  const californiaLabs = visualizationLabCatalog.filter((lab) => lab.publisher === "US_CA_MATH");
  const livePremiumIds = californiaLabs
    .filter((lab) => lab.threeD?.enabled === true && lab.threeD?.premiumLaunch === true)
    .map((lab) => lab.labId)
    .sort();

  assert.deepEqual(livePremiumIds, ["us-ca-math-s4-chapter-04", "us-ca-math-s5-chapter-03"]);

  const californiaPremiumCandidates = californiaLabs.filter(
    (candidate) =>
      candidate.threeD?.regionalPriority === "california" && candidate.threeD.coverageTier === "premium-3d"
  );
  assert.equal(californiaPremiumCandidates.length, 12, "historical California premium candidate inventory drifted");
  const sourceCandidateIds = Object.entries(premiumThreeDCandidateRegionByLabId)
    .filter(([, priority]) => priority === "california")
    .map(([labId]) => labId)
    .sort();
  assert.deepEqual(
    californiaPremiumCandidates.map((lab) => lab.labId).sort(),
    sourceCandidateIds,
    "catalog California candidates must preserve the historical candidate registry identities"
  );

  for (const lab of californiaPremiumCandidates) {
    const shouldBeLive = livePremiumIds.includes(lab.labId);
    assert.equal(lab.threeD?.enabled, shouldBeLive, `${lab.labId}: enabled must follow semantic verification`);
    assert.equal(lab.threeD?.premiumLaunch, shouldBeLive, `${lab.labId}: premiumLaunch must follow semantic verification`);
  }

  const trig = californiaLab("us-ca-math-s5-chapter-03");
  assert.match(trig.templateConfig.focus.en, /trigonometric|trigonometry/i);
  assert.doesNotMatch(trig.templateConfig.focus.en, /exponential/i);
});

test("California visible titles remain unique in every locale", () => {
  const californiaLabs = visualizationLabCatalog.filter((lab) => lab.publisher === "US_CA_MATH");
  assert.equal(californiaLabs.length, 76);

  const identityAndEnglishTitleDigest = createHash("sha256")
    .update(
      JSON.stringify(
        californiaLabs
          .map((lab) => [lab.labId, lab.title.en])
          .sort(([leftLabId], [rightLabId]) => leftLabId.localeCompare(rightLabId))
      )
    )
    .digest("hex");
  assert.equal(
    identityAndEnglishTitleDigest,
    "998f225b58b71fbee08ccbffcdf4e69de5c90fbe9bdf5eb1929d93d275b104d6",
    "California lab identities or canonical English titles drifted"
  );

  for (const locale of ["en", "zh", "zhHans"] as const) {
    const titles = californiaLabs.map((lab) => lab.title[locale] ?? lab.title.zh);
    assert.equal(new Set(titles).size, titles.length, `${locale}: duplicate California visible title`);
  }
});

test("California NBT Simplified Chinese titles and derived descriptions are PRC-glossary idempotent", () => {
  const nbtLabIds = [
    "us-ca-math-k-k-nbt-teen-numbers",
    "us-ca-math-p1-1-nbt-place-value",
    "us-ca-math-p2-2-nbt-three-digit-place-value",
    "us-ca-math-p3-3-nbt-arithmetic",
    "us-ca-math-p4-4-nbt-multi-digit",
    "us-ca-math-p5-5-nbt-decimals"
  ];

  for (const labId of nbtLabIds) {
    const lab = californiaLab(labId);
    const simplifiedTitle = lab.title.zhHans;
    const simplifiedDescription = lab.description.zhHans;
    const simplifiedDomainTitle = lab.californiaAlignment?.domainTitle.zhHans;
    const simplifiedCapability = lab.californiaAlignment?.capabilitySummary.zhHans;
    const simplifiedNote = lab.studentNote?.text.zhHans;

    assert.ok(simplifiedTitle, `${labId}: Simplified Chinese title is required`);
    assert.ok(simplifiedDescription, `${labId}: Simplified Chinese description is required`);
    assert.ok(simplifiedDomainTitle, `${labId}: Simplified Chinese domain title is required`);
    assert.ok(simplifiedCapability, `${labId}: Simplified Chinese capability is required`);
    assert.ok(simplifiedNote, `${labId}: Simplified Chinese student note is required`);
    assert.match(simplifiedTitle, /十进制数与运算/u, `${labId}: title needs the PRC base-ten term`);
    assert.match(simplifiedDomainTitle, /十进制数与运算/u, `${labId}: domain title needs the PRC base-ten term`);

    const localizedSurfaces = [
      ["title", simplifiedTitle],
      ["description", simplifiedDescription],
      ["domain title", simplifiedDomainTitle],
      ["capability", simplifiedCapability],
      ["student note", simplifiedNote]
    ] as const;

    for (const [surfaceName, surface] of localizedSurfaces) {
      assert.doesNotMatch(surface, /十进位|位值/u, `${labId}: ${surfaceName} contains a non-PRC glossary term`);
      assert.equal(toPrcSimplifiedText(surface), surface, `${labId}: ${surfaceName} must be glossary-idempotent`);
    }

    if (labId === "us-ca-math-k-k-nbt-teen-numbers" || labId === "us-ca-math-p2-2-nbt-three-digit-place-value") {
      assert.match(simplifiedCapability, /十进制/u, `${labId}: capability needs the PRC base-ten term`);
    } else {
      assert.match(simplifiedCapability, /数位/u, `${labId}: capability needs the PRC place-value term`);
    }
  }

  assert.match(californiaLab("us-ca-math-p1-1-nbt-place-value").title.zhHans ?? "", /：数位/u);
  assert.match(californiaLab("us-ca-math-p2-2-nbt-three-digit-place-value").title.zhHans ?? "", /：三位数的数位/u);
});

test("all California visible titles use natural localized stems while preserving the curriculum code", () => {
  const californiaLabs = visualizationLabCatalog.filter((lab) => lab.publisher === "US_CA_MATH");
  const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

  assert.equal(californiaLabs.length, 76, "the title-localization contract must cover every California lab");

  for (const lab of californiaLabs) {
    const curriculumCode = lab.title.en.match(/^((?:K|\d{1,2})-[A-Z]\.\d+)\s/u)?.[1];
    assert.ok(curriculumCode, `${lab.labId}: English title must retain its curriculum code`);

    for (const locale of ["zh", "zhHans"] as const) {
      const localizedTitle = lab.title[locale];
      assert.ok(localizedTitle, `${lab.labId}: ${locale} title is required`);
      assert.notEqual(localizedTitle, lab.title.en, `${lab.labId}: ${locale} title must not equal English`);
      assert.ok(
        localizedTitle.startsWith(`${curriculumCode} `),
        `${lab.labId}: ${locale} title must preserve curriculum code ${curriculumCode}`
      );
      assert.match(localizedTitle, cjkPattern, `${lab.labId}: ${locale} title needs CJK text`);

      const localizedStem = localizedTitle
        .replace(/^((?:K|\d{1,2})-[A-Z]\.\d+)\s*/u, "")
        .replace(/(?:視覺化實驗|可视化实验)$/u, "")
        .replace(/\b(?:California|MAIS|CCSS)\b/giu, "")
        .replace(/\b[A-Z](?:-[A-Z]+)+\b/gu, "")
        .trim();

      assert.match(localizedStem, cjkPattern, `${lab.labId}: ${locale} title stem needs localized content`);
      assert.doesNotMatch(
        localizedStem,
        /\b[A-Za-z]{3,}\b/u,
        `${lab.labId}: ${locale} title stem must not retain an English fallback phrase`
      );
    }
  }
});

test("all California capability summaries and student notes stay localized in Chinese", () => {
  const californiaLabs = visualizationLabCatalog.filter((lab) => lab.publisher === "US_CA_MATH");
  const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

  assert.equal(californiaLabs.length, 76, "the localization contract must cover every California lab");

  for (const lab of californiaLabs) {
    const alignment = lab.californiaAlignment;
    const note = lab.studentNote?.text;

    assert.ok(alignment, `${lab.labId}: California alignment is required`);
    assert.ok(note, `${lab.labId}: localized student note is required`);

    const traditionalSummary = alignment.capabilitySummary.zh;
    const simplifiedSummary = alignment.capabilitySummary.zhHans;
    const traditionalNote = note.zh;
    const simplifiedNote = note.zhHans;

    assert.ok(simplifiedSummary, `${lab.labId}: Simplified Chinese capability summary is required`);
    assert.ok(simplifiedNote, `${lab.labId}: Simplified Chinese student note is required`);

    assert.notEqual(
      traditionalSummary,
      alignment.capabilitySummary.en,
      `${lab.labId}: Traditional Chinese capability summary must not fall back to English`
    );
    assert.notEqual(
      simplifiedSummary,
      alignment.capabilitySummary.en,
      `${lab.labId}: Simplified Chinese capability summary must not fall back to English`
    );
    assert.match(traditionalSummary, cjkPattern, `${lab.labId}: Traditional Chinese capability summary needs CJK text`);
    assert.match(simplifiedSummary, cjkPattern, `${lab.labId}: Simplified Chinese capability summary needs CJK text`);

    assert.notEqual(traditionalNote, note.en, `${lab.labId}: Traditional Chinese student note must differ from English`);
    assert.notEqual(simplifiedNote, note.en, `${lab.labId}: Simplified Chinese student note must differ from English`);
    assert.match(traditionalNote, cjkPattern, `${lab.labId}: Traditional Chinese student note needs CJK text`);
    assert.match(simplifiedNote, cjkPattern, `${lab.labId}: Simplified Chinese student note needs CJK text`);
    assert.match(note.en, /^Read me first: This deterministic practice visualization uses /u);
    assert.doesNotMatch(
      note.en,
      /^Read me first: This [^.]+ is a deterministic practice visualization/iu,
      `${lab.labId}: English note must not use the old category-is grammar`
    );
    assert.doesNotMatch(
      note.en,
      /\bThis\b(?=[^.]*\b[A-Za-z]+s\b)[^.]*\bis\b/iu,
      `${lab.labId}: English note has plural-category grammar drift`
    );
    assert.match(traditionalNote, /^請先閱讀：/u, `${lab.labId}: Traditional Chinese note needs a localized opening`);
    assert.match(simplifiedNote, /^请先阅读：/u, `${lab.labId}: Simplified Chinese note needs a localized opening`);
    assert.doesNotMatch(traditionalNote, /^Read me first/iu, `${lab.labId}: Traditional Chinese note must not use an English opening`);
    assert.doesNotMatch(simplifiedNote, /^Read me first/iu, `${lab.labId}: Simplified Chinese note must not use an English opening`);
    assert.match(
      traditionalNote,
      /課程目標[\s\S]*本實驗實際展示/u,
      `${lab.labId}: Traditional Chinese note must distinguish curriculum targets from demonstrated capability`
    );
    assert.match(
      simplifiedNote,
      /课程目标[\s\S]*本实验实际展示/u,
      `${lab.labId}: Simplified Chinese note must distinguish curriculum targets from demonstrated capability`
    );
    assert.ok(
      traditionalNote.includes(traditionalSummary),
      `${lab.labId}: Traditional Chinese note must embed the localized demonstrated capability`
    );
    assert.ok(
      simplifiedNote.includes(simplifiedSummary),
      `${lab.labId}: Simplified Chinese note must embed the localized demonstrated capability`
    );

    const englishTitleStem = lab.title.en.replace(/ Visual Lab$/u, "");
    const traditionalTitleStem = lab.title.zh.replace(/視覺化實驗$/u, "");
    const simplifiedTitleStem = lab.title.zhHans?.replace(/可视化实验$/u, "");

    assert.ok(simplifiedTitleStem, `${lab.labId}: Simplified Chinese title stem is required`);
    assert.ok(
      traditionalNote.includes(traditionalTitleStem),
      `${lab.labId}: Traditional Chinese note must embed the localized title stem`
    );
    assert.ok(
      simplifiedNote.includes(simplifiedTitleStem),
      `${lab.labId}: Simplified Chinese note must embed the localized title stem`
    );
    assert.ok(
      !traditionalNote.includes(englishTitleStem),
      `${lab.labId}: Traditional Chinese note must not embed the English title fallback`
    );
    assert.ok(
      !simplifiedNote.includes(englishTitleStem),
      `${lab.labId}: Simplified Chinese note must not embed the English title fallback`
    );
  }
});
