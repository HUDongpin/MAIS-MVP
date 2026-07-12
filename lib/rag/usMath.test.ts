import assert from "node:assert/strict";
import test from "node:test";
import {
  unitedStatesMathExamPatternCards,
  unitedStatesMathGradeOverviewCards,
  unitedStatesMathNewYorkHighSchoolCourseCards,
  unitedStatesMathSafeCards,
  unitedStatesMathStandardsLibraryCards,
  unitedStatesMathTextbookCompatibilityCards,
  unitedStatesMathSourceRegistry,
  unitedStatesMathStateProfiles
} from "../../data/rag/usMath";
import {
  buildUnitedStatesMathEvidencePack,
  findUnitedStatesMathRawSourceArtifacts,
  getUnitedStatesMathSafeCards,
  getUnitedStatesMathSourceRegistryEntries,
  hasHighUnitedStatesMathSourceSimilarity
} from "./usMath";

test("California grade 6 ratio queries retrieve California standards-safe cards", () => {
  const cards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    grade: "P6",
    conceptIds: ["ratios", "unit-rate"],
    intent: "principal-demo",
    limit: 4
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "us-ca-math-g6-ratios-expressions-equations-statistics");
  assert.ok(cards.every((card) => card.curriculumTrack === "US_CA_MATH"));
  assert.ok(cards.every((card) => card.state === "CA"));
});

test("California Kindergarten queries retrieve California CCSS-M safe cards", () => {
  const cards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    grade: "K",
    conceptIds: ["counting-cardinality", "shape-attributes"],
    intent: "generate-lesson",
    limit: 6
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].grade, "K");
  assert.ok(cards.some((card) => card.id === "us-ca-math-k-counting-operations-measure-geometry"));
  assert.ok(cards.every((card) => card.curriculumTrack === "US_CA_MATH"));
  assert.ok(cards.every((card) => card.state === "CA"));
  assert.ok(cards.every((card) => card.standardsName === "California Common Core State Standards for Mathematics"));
  assert.ok(cards.every((card) => card.commonCoreStatus === "adopted-common-core"));
});

test("North Carolina grade 8 linear function queries stay in the NC track", () => {
  const cards = getUnitedStatesMathSafeCards({
    state: "NC",
    grade: "S2",
    domainTags: ["functions"],
    conceptIds: ["linear-equations", "slope"],
    intent: "generate-question",
    limit: 5
  });

  assert.ok(cards.length > 0);
  assert.equal(cards[0].id, "us-nc-math-g8-linear-functions-transformations-pythagorean");
  assert.ok(cards.every((card) => card.curriculumTrack === "US_NC_MATH"));
  assert.ok(cards.every((card) => card.state === "NC"));
});

test("state and curriculum-track mismatch returns no U.S. RAG cards", () => {
  const cards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    state: "NC",
    grade: "S3",
    intent: "assessment-design",
    limit: 3
  });

  assert.equal(cards.length, 0);
});

test("U.S. evidence pack includes source registry restrictions and original-content guardrails", () => {
  const pack = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_NC_MATH",
    grade: "S3",
    standardIds: ["NC.Math.HS.A-CED"],
    intent: "assessment-design",
    cardKinds: ["exam-pattern", "standards"],
    limit: 3
  });

  assert.equal(pack.curriculumTrack, "US_NC_MATH");
  assert.ok(pack.cards.length > 0);
  assert.ok(pack.sourceRegistry.length > 0);
  assert.ok(pack.sourceRegistry.every((source) => source.rawCorpusAllowed === false));
  assert.ok(pack.sourceRegistry.every((source) => source.allowedUse.length > 0));
  assert.ok(pack.sourceRegistry.every((source) => source.verbatimLimit.length > 0));
  assert.match(pack.evidenceText, /MAIS-authored original content/);
  assert.match(pack.evidenceText, /Layer:/);
  assert.match(pack.evidenceText, /No NCDPI, district, or publisher endorsement is implied/);
  assert.match(pack.evidenceText, /Common Core status:/);
  assert.doesNotMatch(pack.evidenceText, /MAINLAND_PEP_HIGH/);
});

test("top-11-state U.S. RAG supports Texas TEKS and Florida B.E.S.T. as non-Common-Core tracks", () => {
  const txCards = getUnitedStatesMathSafeCards({
    state: "TX",
    grade: "P6",
    standardIds: ["TX.TEKS.Math.G6.RP"],
    intent: "principal-demo",
    limit: 4
  });
  assert.ok(txCards.length > 0);
  assert.equal(txCards[0].curriculumTrack, "US_TX_MATH");
  assert.equal(txCards[0].commonCoreStatus, "state-specific-non-common-core");
  assert.equal(txCards[0].crosswalkRelationToCcss, "state-only");
  assert.match(txCards[0].safeSummary, /Texas/);

  const flEvidence = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_FL_MATH",
    grade: "S3",
    conceptIds: ["quadratic-functions"],
    intent: "assessment-design",
    limit: 3
  });
  assert.equal(flEvidence.curriculumTrack, "US_FL_MATH");
  assert.ok(flEvidence.cards.every((card) => card.state === "FL"));
  assert.match(flEvidence.evidenceText, /B\.E\.S\.T/);
  assert.match(flEvidence.evidenceText, /common-core-replaced/);
});

test("Arkansas RAG supports 2023 math standards metadata and ATLAS assessment patterns", () => {
  const arCards = getUnitedStatesMathSafeCards({
    state: "AR",
    grade: "S3",
    conceptIds: ["equations-inequalities", "function-notation"],
    intent: "assessment-design",
    cardKinds: ["standards"],
    limit: 5
  });

  assert.ok(arCards.length > 0);
  assert.ok(arCards.every((card) => card.curriculumTrack === "US_AR_MATH"));
  assert.ok(arCards.every((card) => card.state === "AR"));
  assert.ok(arCards.every((card) => card.cardKind === "standards"));
  assert.ok(arCards.every((card) => card.standardsName === "Arkansas Mathematics Standards"));
  assert.ok(arCards.every((card) => card.commonCoreStatus === "common-core-derived"));
  assert.ok(arCards.every((card) => card.sourceIds.some((sourceId) => sourceId.includes("arkansas"))));

  const arExamCards = getUnitedStatesMathSafeCards({
    state: "AR",
    grade: "S3",
    cardKinds: ["exam-pattern"],
    intent: "assessment-design",
    limit: 3
  });

  assert.ok(arExamCards.length > 0);
  assert.ok(arExamCards.some((card) => card.itemTypeTags.some((tag) => /ATLAS Algebra I EOC/.test(tag))));
  assert.ok(arExamCards.every((card) => card.sourceIds.some((sourceId) => sourceId.includes("atlas"))));

  const arEvidence = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_AR_MATH",
    grade: "S4",
    cardKinds: ["exam-pattern"],
    conceptIds: ["geometric-reasoning"],
    intent: "assessment-design",
    limit: 3
  });

  assert.equal(arEvidence.curriculumTrack, "US_AR_MATH");
  assert.ok(arEvidence.cards.some((card) => card.itemTypeTags.some((tag) => /ATLAS Geometry EOC/.test(tag))));
  assert.match(arEvidence.evidenceText, /ATLAS mathematics/);
  assert.match(arEvidence.evidenceText, /No Arkansas Department of Education/);
  assert.ok(arEvidence.sourceRegistry.some((source) => source.id === "ade-atlas-3-10-content-assessments"));
  assert.ok(arEvidence.sourceRegistry.every((source) => source.rawCorpusAllowed === false));
});

test("New York RAG supports high-school Next Generation course standards safe layer", () => {
  assert.equal(unitedStatesMathNewYorkHighSchoolCourseCards.length, 4);
  assert.deepEqual(
    unitedStatesMathNewYorkHighSchoolCourseCards.map((card) => card.id),
    [
      "us-ny-standards-course-algebra-i-next-generation-functions-modeling",
      "us-ny-standards-course-geometry-next-generation-transformations-proof-modeling",
      "us-ny-standards-course-algebra-ii-next-generation-advanced-functions-statistics",
      "us-ny-standards-course-plus-advanced-math-modeling-calculus-readiness"
    ]
  );

  const algebraCards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_NY_MATH",
    grade: "S3",
    cardKinds: ["standards"],
    conceptIds: ["algebra-1", "function-notation"],
    intent: "generate-lesson",
    limit: 6
  });
  assert.ok(algebraCards.some((card) => card.id === "us-ny-standards-course-algebra-i-next-generation-functions-modeling"));
  assert.ok(algebraCards.every((card) => card.curriculumTrack === "US_NY_MATH"));
  assert.ok(algebraCards.every((card) => card.state === "NY"));

  const geometryCards = getUnitedStatesMathSafeCards({
    state: "NY",
    grade: "S4",
    cardKinds: ["standards", "exam-pattern"],
    conceptIds: ["geometry-course", "geometric-proof"],
    intent: "assessment-design",
    limit: 6
  });
  assert.ok(geometryCards.some((card) => card.id === "us-ny-standards-course-geometry-next-generation-transformations-proof-modeling"));
  const geometryExamCards = getUnitedStatesMathSafeCards({
    state: "NY",
    grade: "S4",
    cardKinds: ["exam-pattern"],
    conceptIds: ["geometric-reasoning", "geometry-course"],
    intent: "assessment-design",
    limit: 3
  });
  assert.ok(geometryExamCards.some((card) => card.sourceIds.includes("nysed-geometry-regents-resources")));

  const algebraTwoPack = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_NY_MATH",
    grade: "S5",
    cardKinds: ["standards"],
    conceptIds: ["algebra-2", "exponential-logarithmic-models"],
    intent: "generate-lesson",
    limit: 6
  });
  assert.ok(algebraTwoPack.cards.some((card) => card.id === "us-ny-standards-course-algebra-ii-next-generation-advanced-functions-statistics"));
  assert.ok(algebraTwoPack.sourceRegistry.some((source) => source.id === "nysed-algebra-ii-regents-resources"));
  assert.ok(algebraTwoPack.sourceRegistry.every((source) => source.rawCorpusAllowed === false));
  assert.match(algebraTwoPack.evidenceText, /New York State Next Generation Mathematics Learning Standards/);
  assert.match(algebraTwoPack.evidenceText, /MAIS-authored original content/);
  assert.match(algebraTwoPack.evidenceText, /No NYSED, district, or publisher endorsement is implied/);
  assert.match(algebraTwoPack.evidenceText, /Algebra II/);
  assert.doesNotMatch(algebraTwoPack.evidenceText, /released\s+item/i);
  assert.doesNotMatch(algebraTwoPack.evidenceText, /answer\s+key/i);

  const plusCards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_NY_MATH",
    grade: "S6",
    cardKinds: ["standards"],
    conceptIds: ["plus-standards", "calculus-readiness"],
    intent: "generate-lesson",
    limit: 6
  });
  assert.ok(plusCards.some((card) => card.id === "us-ny-standards-course-plus-advanced-math-modeling-calculus-readiness"));
  assert.ok(plusCards.some((card) => /not claimed as a standalone required NYSED Regents course/.test(card.safeSummary)));
});

test("U.S. personal library supports standards, textbook compatibility, and exam-pattern layers", () => {
  const caStandards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    grade: "P6",
    cardKinds: ["standards"],
    standardIds: ["CA.CCSS.Math.G6.RP"],
    intent: "principal-demo",
    limit: 6
  });
  assert.ok(caStandards.length > 0);
  assert.ok(caStandards.every((card) => card.cardKind === "standards"));
  assert.ok(caStandards.every((card) => card.libraryLane === "public-standards"));

  const ncTextbook = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_NC_MATH",
    grade: "P5",
    cardKinds: ["textbook-compatibility"],
    intent: "generate-lesson",
    limit: 3
  });
  assert.ok(ncTextbook.length > 0);
  assert.ok(ncTextbook.every((card) => card.cardKind === "textbook-compatibility"));
  assert.ok(ncTextbook.every((card) => card.textbookCompatibilityNotes?.length));

  const caExam = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    grade: "S5",
    cardKinds: ["exam-pattern"],
    intent: "assessment-design",
    limit: 3
  });
  assert.ok(caExam.length > 0);
  assert.ok(caExam.every((card) => card.cardKind === "exam-pattern"));
  assert.ok(caExam.every((card) => card.examPatternNotes?.length));
});

test("California core algebra and geometry textbook compatibility stays source-safe", () => {
  const algebraCards = getUnitedStatesMathSafeCards({
    curriculumTrack: "US_CA_MATH",
    grade: "S3",
    cardKinds: ["textbook-compatibility"],
    conceptIds: ["algebra-1", "linear-equations"],
    intent: "generate-lesson",
    limit: 4
  });

  assert.ok(algebraCards.length > 0);
  assert.equal(algebraCards[0].id, "us-ca-textbook-core-algebra-1-modeling-functions-equations");
  assert.ok(algebraCards[0].sourceIds.includes("owner-provided-california-core-algebra-geometry-textbooks"));
  assert.ok(algebraCards[0].safeSummary.includes("metadata-level review"));

  const geometryPack = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_CA_MATH",
    grade: "S4",
    cardKinds: ["textbook-compatibility"],
    conceptIds: ["geometry-course", "geometric-proof"],
    intent: "generate-lesson",
    limit: 3
  });

  assert.ok(geometryPack.cards.some((card) => card.id === "us-ca-textbook-core-geometry-congruence-similarity-proofs"));
  assert.ok(geometryPack.sourceRegistry.some((source) => source.id === "owner-provided-california-core-algebra-geometry-textbooks"));
  const privateSource = geometryPack.sourceRegistry.find((source) => source.id === "owner-provided-california-core-algebra-geometry-textbooks");
  assert.ok(privateSource);
  assert.equal(privateSource.rawCorpusAllowed, false);
  assert.equal(privateSource.repositoryRetention, "local-private-analysis-only");
  assert.match(privateSource.verbatimLimit, /^0 committed publisher body words/);
  assert.match(geometryPack.evidenceText, /First-batch California core scope/);
  assert.match(geometryPack.evidenceText, /Generate fresh MAIS-authored contexts/);
  assert.doesNotMatch(geometryPack.evidenceText, /Question\s*\d+/i);
  assert.doesNotMatch(geometryPack.evidenceText, /answer\s+key/i);
  assert.doesNotMatch(geometryPack.evidenceText, /official\s+solution/i);
  assert.doesNotMatch(geometryPack.evidenceText, /OCR/i);
  assert.doesNotMatch(geometryPack.evidenceText, /screenshot/i);
});

test("source registry defaults exclude blocked noncommercial OER and retain review metadata", () => {
  const defaultSources = getUnitedStatesMathSourceRegistryEntries();
  const allSources = getUnitedStatesMathSourceRegistryEntries({ includeBlocked: true });

  assert.ok(defaultSources.every((source) => source.safeCardAllowed));
  assert.ok(defaultSources.every((source) => source.libraryLane));
  assert.ok(allSources.some((source) => source.id === "illustrative-mathematics-v360-noncommercial"));
  assert.ok(defaultSources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)));
  assert.ok(defaultSources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.lastCheckedAt)));
  assert.equal(unitedStatesMathSourceRegistry.filter((source) => source.rawCorpusAllowed).length, 0);
  const californiaPrivateSource = getUnitedStatesMathSourceRegistryEntries({ state: "CA" }).find(
    (source) => source.id === "owner-provided-california-core-algebra-geometry-textbooks"
  );
  assert.ok(californiaPrivateSource);
  assert.equal(californiaPrivateSource.repositoryRetention, "local-private-analysis-only");
  assert.equal(californiaPrivateSource.reviewedAt, "2026-06-01");
});

test("U.S. state profiles cover the requested top-11 state set and phases", () => {
  assert.deepEqual(
    unitedStatesMathStateProfiles.map((profile) => profile.state),
    ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "AR"]
  );
  assert.equal(new Set(unitedStatesMathStateProfiles.map((profile) => profile.curriculumTrack)).size, 11);
  assert.equal(unitedStatesMathStateProfiles.filter((profile) => profile.statePriorityPhase === 1).length, 4);
  assert.equal(unitedStatesMathStateProfiles.filter((profile) => profile.statePriorityPhase === 2).length, 6);
  assert.equal(unitedStatesMathStateProfiles.filter((profile) => profile.statePriorityPhase === 3).length, 1);
  assert.equal(unitedStatesMathStateProfiles.find((profile) => profile.state === "AR")?.assessmentProgram.includes("ATLAS"), true);
  assert.ok(unitedStatesMathStateProfiles.some((profile) => profile.commonCoreStatus === "state-specific-non-common-core"));
  assert.ok(unitedStatesMathStateProfiles.every((profile) => profile.standardsSourceIds.length > 0));
  assert.ok(unitedStatesMathStateProfiles.every((profile) => profile.crosswalkNotes.length > 0));
});

test("U.S. safe cards avoid source-copying artifacts and raw corpus permission mistakes", () => {
  const forbiddenPatterns = [
    /Question\s*\d+/i,
    /Item\s*\d+/i,
    /page\s+\d+/i,
    /p\.\s*\d+/i,
    /OCR/i,
    /screenshot/i,
    /official\s+solution/i
  ];
  const cardText = JSON.stringify(unitedStatesMathSafeCards);
  const evidence = buildUnitedStatesMathEvidencePack({
    curriculumTrack: "US_CA_MATH",
    grade: "S4",
    conceptIds: ["geometric-reasoning"],
    intent: "generate-lesson",
    limit: 2
  }).evidenceText;

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(cardText, pattern);
    assert.doesNotMatch(evidence, pattern);
  }
  assert.deepEqual(findUnitedStatesMathRawSourceArtifacts(unitedStatesMathSafeCards), []);

  assert.equal(unitedStatesMathGradeOverviewCards.length, 143);
  assert.equal(unitedStatesMathStandardsLibraryCards.length, 697);
  assert.equal(unitedStatesMathTextbookCompatibilityCards.length, 149);
  assert.equal(unitedStatesMathExamPatternCards.length, 89);
  assert.equal(unitedStatesMathSafeCards.length, 1078);
  assert.ok(unitedStatesMathSafeCards.every((card) => card.prohibitedReuseNotes.some((note) => /Do not/.test(note))));
  assert.ok(unitedStatesMathSafeCards.every((card) => card.sourceIds.length > 0));
  assert.ok(unitedStatesMathSafeCards.every((card) => card.materialsPolicy.length > 0));
  assert.ok(unitedStatesMathSafeCards.every((card) => card.assessmentProgram.length > 0));
});

test("similarity guard identifies near-source reuse but allows distant original prompts", () => {
  assert.equal(
    hasHighUnitedStatesMathSourceSimilarity(
      "A released triangle graph asks students to select the matching slope and intercept.",
      ["A released triangle graph asks students to select the matching slope and intercept."]
    ),
    true
  );
  assert.equal(
    hasHighUnitedStatesMathSourceSimilarity(
      "MAIS creates a new cafeteria unit-rate scenario with fresh numbers and an explanation prompt.",
      ["A bus schedule item asks for elapsed time using a table."]
    ),
    false
  );
});
