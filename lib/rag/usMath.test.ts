import assert from "node:assert/strict";
import test from "node:test";
import {
  unitedStatesMathExamPatternCards,
  unitedStatesMathGradeOverviewCards,
  unitedStatesMathSafeCards,
  unitedStatesMathStandardsLibraryCards,
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

test("top-10-state U.S. RAG supports Texas TEKS and Florida B.E.S.T. as non-Common-Core tracks", () => {
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

test("source registry defaults exclude blocked noncommercial OER and retain review metadata", () => {
  const defaultSources = getUnitedStatesMathSourceRegistryEntries();
  const allSources = getUnitedStatesMathSourceRegistryEntries({ includeBlocked: true });

  assert.ok(defaultSources.every((source) => source.safeCardAllowed));
  assert.ok(defaultSources.every((source) => source.libraryLane));
  assert.ok(allSources.some((source) => source.id === "illustrative-mathematics-v360-noncommercial"));
  assert.ok(defaultSources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)));
  assert.ok(defaultSources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.lastCheckedAt)));
  assert.equal(unitedStatesMathSourceRegistry.filter((source) => source.rawCorpusAllowed).length, 0);
});

test("U.S. state profiles cover the requested top-10 population states and phases", () => {
  assert.deepEqual(
    unitedStatesMathStateProfiles.map((profile) => profile.state),
    ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI"]
  );
  assert.equal(new Set(unitedStatesMathStateProfiles.map((profile) => profile.curriculumTrack)).size, 10);
  assert.equal(unitedStatesMathStateProfiles.filter((profile) => profile.statePriorityPhase === 1).length, 4);
  assert.equal(unitedStatesMathStateProfiles.filter((profile) => profile.statePriorityPhase === 2).length, 6);
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

  assert.equal(unitedStatesMathGradeOverviewCards.length, 120);
  assert.equal(unitedStatesMathStandardsLibraryCards.length, 580);
  assert.equal(unitedStatesMathExamPatternCards.length, 80);
  assert.equal(unitedStatesMathSafeCards.length, 900);
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
