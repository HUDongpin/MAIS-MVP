export type Language = "en" | "zh" | "zh-Hans";
export type ThemeMode = "dark" | "light";
export type GradeId = "K" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
export type TopicStatus = "completed" | "in-progress" | "not-started";
export type Difficulty = "Low" | "Medium" | "High";
export type LegacyDifficulty = "Foundation" | "Core" | "Challenge" | "Exam";
export type DifficultyRecord = Difficulty | LegacyDifficulty;
export type CurriculumTrack = "HK" | "MAINLAND_PEP_HIGH" | "US_CA_MATH" | "US_NC_MATH" | "US_AR_MATH" | "US_FL_MATH";
export type CurriculumRegion = "HK" | "MAINLAND" | "US";
export type TextbookPublisher =
  | "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
  | "HK_UNITED_PRIME_MIA"
  | "HK_EPH_MIF"
  | "MAINLAND_PEP"
  | "MAINLAND_BNU"
  | "MAINLAND_HJB"
  | "US_CA_MATH"
  | "US_NC_MATH"
  | "US_AR_MATH"
  | "US_FL_MATH";
export type CurriculumProfile = {
  region: CurriculumRegion;
  publisher: TextbookPublisher;
};
export type MainlandPepHighSourceKind = "standard" | "textbook" | "exam-paper" | "exam-solution";
export type MainlandPepHighModule = "compulsory" | "selective-compulsory" | "elective";
export type MainlandPepHighDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type MainlandPepHighRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "exam-practice";
export type MainlandPepHighExamPatternIntent = "generate-question" | "exam-practice" | "diagnose-mistake";
export type MainlandHjbHighSourceKind = "textbook";
export type MainlandHjbHighExamPatternSourceKind = "school-assessment-pattern" | "review-pattern";
export type MainlandHjbHighAssessmentFamily =
  | "unit-test"
  | "midterm"
  | "final"
  | "topic-review"
  | "cross-volume-review";
export type MainlandHjbHighVolumeScope =
  | "compulsory-1"
  | "compulsory-2"
  | "compulsory-3"
  | "selective-compulsory-1"
  | "selective-compulsory-2"
  | "cross-volume-review";
export type MainlandHjbHighModule = "compulsory" | "selective-compulsory";
export type MainlandHjbHighDifficultyBand = MainlandPepHighDifficultyBand;
export type MainlandHjbHighRagIntent = MainlandPepHighRagIntent | "diagnose-mistake" | "assessment-design";
export type MainlandBnuHighSourceKind = "safe-abstraction";
export type MainlandBnuHighModule = "compulsory" | "selective-compulsory";
export type MainlandBnuHighDifficultyBand = MainlandPepHighDifficultyBand;
export type MainlandBnuHighRagIntent = MainlandPepHighRagIntent | "diagnose-mistake" | "assessment-design";
export type MainlandBnuHighGradeId = MainlandPepSecondaryGradeId;
export type MainlandBnuHighAssessmentPatternSourceKind = "school-assessment-pattern" | "review-pattern";
export type MainlandBnuHighAssessmentFamily =
  | "unit-test"
  | "midterm"
  | "final"
  | "comprehensive"
  | "topic-review"
  | "gaokao-review";
export type MainlandBnuHighAssessmentMaterialKind =
  | "unit-test"
  | "topic-practice"
  | "midterm-final"
  | "comprehensive-assessment"
  | "review"
  | "paper";
export type MainlandBnuHighAssessmentVolumeScope =
  | "compulsory-1"
  | "compulsory-2"
  | "selective-compulsory-1"
  | "selective-compulsory-2"
  | "cross-volume-review"
  | "full-year-review";
export type MainlandBnuHighVolumeScope = MainlandBnuHighAssessmentVolumeScope;
export type MainlandBnuHighAssessmentPatternIntent = MainlandBnuHighRagIntent;
export type MainlandBnuPrimarySourceKind = "safe-abstraction";
export type MainlandBnuJuniorSourceKind = "safe-abstraction";
export type MainlandHjbPrimarySourceKind = "safe-abstraction";
export type MainlandHjbJuniorSourceKind = "textbook";
export type MainlandPepSchoolStage = "primary" | "junior-secondary" | "senior-secondary";
export type MainlandPepSemester = "upper" | "lower" | "full-year";
export type MainlandPepDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type MainlandPepRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "exam-practice" | "diagnose-mistake" | "assessment-design";
export type MainlandBnuPrimaryGradeId = Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">;
export type MainlandHjbPrimaryGradeId = Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">;
export type MainlandPepJuniorGradeId = Extract<GradeId, "S1" | "S2" | "S3">;
export type MainlandPepSecondaryGradeId = Extract<GradeId, "S4" | "S5" | "S6">;
export type MainlandBnuPrimaryDifficultyBand = MainlandPepDifficultyBand;
export type MainlandBnuPrimaryRagIntent = MainlandPepRagIntent;
export type MainlandBnuJuniorGradeId = MainlandPepJuniorGradeId;
export type MainlandBnuJuniorDifficultyBand = MainlandPepDifficultyBand;
export type MainlandBnuJuniorRagIntent = MainlandPepRagIntent;
export type MainlandBnuJuniorAssessmentPatternSourceKind = "school-assessment-pattern" | "review-pattern";
export type MainlandBnuJuniorAssessmentPatternIntent = MainlandPepRagIntent;
export type MainlandBnuJuniorAssessmentFamily =
  | "unit-test"
  | "monthly"
  | "midterm"
  | "final"
  | "comprehensive"
  | "topic-review";
export type MainlandBnuJuniorAssessmentMaterialKind =
  | "unit-test"
  | "monthly-assessment"
  | "topic-practice"
  | "midterm-final"
  | "comprehensive-assessment"
  | "review"
  | "paper";
export type MainlandBnuPrimaryAssessmentFamily = MainlandPepPrimaryAssessmentFamily;
export type MainlandBnuPrimaryAssessmentMaterialKind = MainlandPepPrimaryMaterialKind;
export type MainlandBnuPrimaryAssessmentPatternIntent = MainlandPepRagIntent;
export type MainlandBnuPrimaryAssessmentPatternSourceKind = "exam-practice-pattern";
export type MainlandHjbPrimaryDifficultyBand = MainlandPepDifficultyBand;
export type MainlandHjbPrimaryRagIntent = MainlandPepRagIntent;
export type MainlandHjbPrimaryAssessmentFamily = MainlandPepPrimaryAssessmentFamily;
export type MainlandHjbPrimaryAssessmentMaterialKind = MainlandPepPrimaryMaterialKind;
export type MainlandHjbPrimaryAssessmentPatternIntent = MainlandPepRagIntent;
export type MainlandHjbPrimaryAssessmentPatternSourceKind = "exam-practice-pattern";
export type MainlandHjbJuniorGradeId = MainlandPepJuniorGradeId;
export type MainlandHjbJuniorDifficultyBand = MainlandPepDifficultyBand;
export type MainlandHjbJuniorRagIntent = MainlandPepRagIntent;
export type MainlandHjbJuniorAssessmentPatternSourceKind = "school-assessment-pattern" | "review-pattern";
export type MainlandHjbJuniorAssessmentPatternIntent = MainlandPepRagIntent;
export type MainlandHjbJuniorAssessmentFamily =
  | "unit-test"
  | "midterm"
  | "final"
  | "topic-review"
  | "comprehensive";
export type MainlandHjbJuniorAssessmentMaterialKind =
  | "unit-test"
  | "topic-practice"
  | "midterm-final"
  | "review"
  | "paper";
export type MainlandJuniorZhongkaoExamPatternSourceKind = "zhongkao-paper-pattern" | "zhongkao-solution-pattern";
export type MainlandPepJuniorExamPatternSourceKind = MainlandJuniorZhongkaoExamPatternSourceKind;
export type MainlandPepJuniorExamPatternIntent = MainlandPepRagIntent;
export type MainlandPepJuniorPaperPatternSourceKind = "junior-paper-pattern";
export type MainlandPepJuniorPaperPatternIntent = MainlandPepRagIntent;
export type MainlandHjbJuniorPaperPatternSourceKind = "junior-paper-pattern" | "review-pattern";
export type MainlandHjbJuniorPaperPatternIntent = MainlandPepRagIntent;
export type MainlandPepJuniorPaperAssessmentFamily =
  | "lesson-practice"
  | "unit-test"
  | "topic-drill"
  | "midterm"
  | "final"
  | "comprehensive";
export type MainlandPepJuniorPaperMaterialKind =
  | "unit-test"
  | "sync-practice"
  | "topic-practice"
  | "tiered-practice"
  | "midterm-final"
  | "error-extension"
  | "challenge-practice"
  | "comprehensive-assessment"
  | "calculation-practice"
  | "problem-solving"
  | "paper";
export type MainlandPepPrimaryAssessmentFamily =
  | "lesson-practice"
  | "unit-test"
  | "topic-drill"
  | "midterm"
  | "final"
  | "comprehensive";
export type MainlandPepPrimaryExamPatternIntent = MainlandPepRagIntent;
export type MainlandPepPrimaryExamPatternSourceKind = "exam-practice-pattern";
export type MainlandPepPrimaryMaterialKind =
  | "unit-test"
  | "sync-practice"
  | "topic-practice"
  | "tiered-practice"
  | "midterm-final"
  | "error-extension"
  | "challenge-practice"
  | "comprehensive-assessment"
  | "calculation-practice"
  | "problem-solving";
export type HongKongMathEdBStage =
  | "whole-curriculum"
  | "primary"
  | "junior-secondary"
  | "senior-secondary-compulsory"
  | "senior-secondary-m1"
  | "senior-secondary-m2"
  | "senior-secondary-support"
  | "implementation";
export type HongKongMathEdBDocumentPurpose =
  | "curriculum-guide"
  | "learning-content-supplement"
  | "curriculum-interpretation"
  | "revision-comparison"
  | "curriculum-assessment-guide"
  | "implementation-timeline"
  | "learning-diversity-support";
export type HongKongMathEdBDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type HongKongMathEdBRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design";
export type HongKongDseMathPaperComponent = "paper-1" | "paper-2" | "answer-file";
export type HongKongDseMathLanguageVariant = "en" | "zh";
export type HongKongDseMathDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type HongKongDseMathRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design" | "exam-practice";
export type HongKongDseUpVolume = "4A" | "4B" | "5A" | "5B" | "6A" | "6B";
export type HongKongDseUpDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type HongKongDseUpRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design" | "exam-practice";
export type HongKongModernPrimaryVolume = "1A" | "1B" | "1C" | "1D" | "3A" | "3B" | "3C" | "3D";
export type HongKongModernPrimaryDifficultyBand = HongKongDseUpDifficultyBand;
export type HongKongModernPrimaryRagIntent = HongKongDseUpRagIntent;
export type HongKongUpJuniorVolume = "1A" | "1B" | "2A" | "2B" | "3A" | "3B";
export type HongKongUpJuniorSourceLanguage = "zh" | "en";
export type HongKongUpJuniorDifficultyBand = HongKongDseUpDifficultyBand;
export type HongKongUpJuniorRagIntent = HongKongDseUpRagIntent;
export type HongKongUpJuniorResourceMaterialKind =
  | "lesson-worksheet"
  | "challenge-practice"
  | "junior-dse-type-practice"
  | "question-bank"
  | "solution-support"
  | "quick-practice"
  | "side-feature-practice"
  | "tsa-type-practice"
  | "hkdse-style-practice"
  | "assessment-practice";
export type HongKongUpJuniorResourceDifficultyBand = HongKongDseUpDifficultyBand;
export type HongKongUpJuniorResourceRagIntent = HongKongDseUpRagIntent;
export type HongKongDseEphVolume = "A" | "B" | "C" | "D" | "E";
export type HongKongDseEphDifficultyBand = "foundation" | "core" | "exam" | "challenge";
export type HongKongDseEphRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design" | "exam-practice";
export type HongKongEaseQuestionDifficultyBand = HongKongDseMathDifficultyBand;
export type HongKongEaseQuestionRagIntent = HongKongDseMathRagIntent;
export type HongKongEaseQuestionAssetKind = "question-image" | "answer-image" | "text-only";
export type UnitedStatesMathTrack =
  | "US_CA_MATH"
  | "US_TX_MATH"
  | "US_FL_MATH"
  | "US_NY_MATH"
  | "US_PA_MATH"
  | "US_IL_MATH"
  | "US_OH_MATH"
  | "US_GA_MATH"
  | "US_NC_MATH"
  | "US_MI_MATH"
  | "US_AR_MATH";
export type UnitedStatesMathGradeId = GradeId;
export type UnitedStatesMathState = "CA" | "TX" | "FL" | "NY" | "PA" | "IL" | "OH" | "GA" | "NC" | "MI" | "AR" | "US";
export type UnitedStatesMathLibraryLane = "public-standards" | "licensed-private-library" | "oer";
export type UnitedStatesMathSafeCardKind = "grade-overview" | "standards" | "textbook-compatibility" | "exam-pattern";
export type UnitedStatesMathCommonCoreStatus =
  | "adopted-common-core"
  | "common-core-derived"
  | "common-core-replaced"
  | "state-specific-non-common-core";
export type UnitedStatesMathCrosswalkRelation = "exact" | "near" | "broader" | "narrower" | "state-only";
export type UnitedStatesMathSourceKind =
  | "state-standard"
  | "framework"
  | "assessment-blueprint"
  | "released-assessment"
  | "test-specification"
  | "textbook-adoption-list"
  | "licensed-private-material"
  | "oer-curriculum"
  | "copyright-guidance";
export type UnitedStatesMathLicenseStatus =
  | "public-reference-restricted"
  | "permission-required"
  | "open-commercial-attribution"
  | "noncommercial-restricted"
  | "local-analysis-only";
export type UnitedStatesMathRepositoryRetention =
  | "safe-card-only"
  | "metadata-only"
  | "local-private-analysis-only"
  | "oer-attribution-required"
  | "blocked-without-license";
export type UnitedStatesMathCommercialUse = "allowed-with-attribution" | "permission-required" | "not-allowed" | "review-required";
export type UnitedStatesMathDifficultyBand = "foundation" | "core" | "assessment" | "challenge";
export type UnitedStatesMathRagIntent = "tutor-explain" | "generate-question" | "generate-lesson" | "diagnose-mistake" | "assessment-design" | "principal-demo";
export type StudentAvatarId = "delta" | "pi" | "sigma" | "theta" | "function" | "radical";

export type MainlandPepRagCard = {
  id: string;
  publisher: "MAINLAND_PEP";
  stage: MainlandPepSchoolStage;
  grade: GradeId;
  semester: MainlandPepSemester;
  unitTitle: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  misconceptionTags: string[];
  safeSummary: string;
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
  difficultyBand?: MainlandPepDifficultyBand;
  legacyCurriculumTrack?: "MAINLAND_PEP_HIGH";
  sourceKind?: MainlandPepHighSourceKind | "safe-abstraction";
  module?: MainlandPepHighModule;
  volume?: string;
};

export type MainlandPepRagQuery = {
  grade?: GradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  intent: MainlandPepRagIntent;
  difficultyBand?: MainlandPepDifficultyBand;
  limit?: number;
};

export type MainlandPepEvidencePack = {
  publisher: "MAINLAND_PEP";
  cards: MainlandPepRagCard[];
  primaryExamPatternCards: MainlandPepPrimaryExamPatternCard[];
  juniorPaperPatternCards: MainlandPepJuniorPaperPatternCard[];
  juniorExamPatternCards: MainlandPepJuniorExamPatternCard[];
  secondaryExamPatternCards: MainlandPepSecondaryExamPatternCard[];
  evidenceText: string;
};

export type MainlandBnuPrimaryRagCard = {
  id: string;
  publisher: "MAINLAND_BNU";
  stage: "primary";
  sourceKind: MainlandBnuPrimarySourceKind;
  volume?: string;
  grade: MainlandBnuPrimaryGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  unitTitle: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  difficultyBand: MainlandBnuPrimaryDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandBnuPrimaryRagQuery = {
  grade?: MainlandBnuPrimaryGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  intent: MainlandBnuPrimaryRagIntent;
  difficultyBand?: MainlandBnuPrimaryDifficultyBand;
  limit?: number;
};

export type MainlandBnuPrimaryAssessmentPatternCard = {
  id: string;
  publisher: "MAINLAND_BNU";
  stage: "primary";
  grade: MainlandBnuPrimaryGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandBnuPrimaryAssessmentPatternSourceKind;
  materialKinds: MainlandBnuPrimaryAssessmentMaterialKind[];
  assessmentFamilies?: MainlandBnuPrimaryAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags?: string[];
  itemTypeTags: string[];
  solutionStrategyTags?: string[];
  difficultyBand: MainlandBnuPrimaryDifficultyBand;
  patternSummary: string;
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandBnuPrimaryAssessmentPatternQuery = {
  grade?: MainlandBnuPrimaryGradeId;
  semester?: MainlandBnuPrimaryAssessmentPatternCard["semester"];
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandBnuPrimaryAssessmentMaterialKind;
  assessmentFamily?: MainlandBnuPrimaryAssessmentFamily;
  intent: MainlandBnuPrimaryAssessmentPatternIntent;
  difficultyBand?: MainlandBnuPrimaryDifficultyBand;
  limit?: number;
};

export type MainlandBnuPrimaryAssessmentPatternEvidencePack = {
  publisher: "MAINLAND_BNU";
  stage: "primary";
  cards: MainlandBnuPrimaryAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandBnuPrimaryEvidencePack = {
  publisher: "MAINLAND_BNU";
  stage: "primary";
  cards: MainlandBnuPrimaryRagCard[];
  assessmentPatternCards: MainlandBnuPrimaryAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandBnuJuniorRagCard = {
  id: string;
  publisher: "MAINLAND_BNU";
  stage: "junior-secondary";
  sourceKind: MainlandBnuJuniorSourceKind;
  volume: string;
  grade: MainlandBnuJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  unitTitle: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  difficultyBand: MainlandBnuJuniorDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandBnuJuniorRagQuery = {
  grade?: MainlandBnuJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  intent: MainlandBnuJuniorRagIntent;
  difficultyBand?: MainlandBnuJuniorDifficultyBand;
  limit?: number;
};

export type MainlandBnuJuniorAssessmentPatternCard = {
  id: string;
  publisher: "MAINLAND_BNU";
  stage: "junior-secondary";
  grade: MainlandBnuJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandBnuJuniorAssessmentPatternSourceKind;
  materialKinds: MainlandBnuJuniorAssessmentMaterialKind[];
  assessmentFamilies: MainlandBnuJuniorAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandBnuJuniorDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
  needsS18MappingReview?: boolean;
};

export type MainlandBnuJuniorAssessmentPatternQuery = {
  grade?: MainlandBnuJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandBnuJuniorAssessmentMaterialKind;
  assessmentFamily?: MainlandBnuJuniorAssessmentFamily;
  intent: MainlandBnuJuniorAssessmentPatternIntent;
  difficultyBand?: MainlandBnuJuniorDifficultyBand;
  includeNeedsS18MappingReview?: boolean;
  limit?: number;
};

export type MainlandBnuJuniorAssessmentPatternEvidencePack = {
  publisher: "MAINLAND_BNU";
  stage: "junior-secondary";
  cards: MainlandBnuJuniorAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandBnuJuniorEvidencePack = {
  publisher: "MAINLAND_BNU";
  stage: "junior-secondary";
  cards: MainlandBnuJuniorRagCard[];
  assessmentPatternCards: MainlandBnuJuniorAssessmentPatternCard[];
  zhongkaoExamPatternCards: MainlandJuniorZhongkaoExamPatternCard[];
  evidenceText: string;
};

export type MainlandBnuJuniorGenerationEvidencePack = {
  publisher: "MAINLAND_BNU";
  stage: "junior-secondary";
  curriculumCards: MainlandBnuJuniorRagCard[];
  assessmentPatternCards: MainlandBnuJuniorAssessmentPatternCard[];
  zhongkaoExamPatternCards: MainlandJuniorZhongkaoExamPatternCard[];
  evidenceText: string;
};

export type MainlandHjbPrimaryRagCard = {
  id: string;
  publisher: "MAINLAND_HJB";
  stage: "primary";
  sourceKind: MainlandHjbPrimarySourceKind;
  volume?: string;
  grade: MainlandHjbPrimaryGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  unitTitle: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  difficultyBand: MainlandHjbPrimaryDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbPrimaryRagQuery = {
  grade?: MainlandHjbPrimaryGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  intent: MainlandHjbPrimaryRagIntent;
  difficultyBand?: MainlandHjbPrimaryDifficultyBand;
  limit?: number;
};

export type MainlandHjbPrimaryAssessmentPatternCard = {
  id: string;
  publisher: "MAINLAND_HJB";
  stage: "primary";
  grade: MainlandHjbPrimaryGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandHjbPrimaryAssessmentPatternSourceKind;
  materialKinds: MainlandHjbPrimaryAssessmentMaterialKind[];
  assessmentFamilies?: MainlandHjbPrimaryAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags?: string[];
  itemTypeTags: string[];
  solutionStrategyTags?: string[];
  difficultyBand: MainlandHjbPrimaryDifficultyBand;
  patternSummary: string;
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbPrimaryAssessmentPatternQuery = {
  grade?: MainlandHjbPrimaryGradeId;
  semester?: MainlandHjbPrimaryAssessmentPatternCard["semester"];
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandHjbPrimaryAssessmentMaterialKind;
  assessmentFamily?: MainlandHjbPrimaryAssessmentFamily;
  intent: MainlandHjbPrimaryAssessmentPatternIntent;
  difficultyBand?: MainlandHjbPrimaryDifficultyBand;
  limit?: number;
};

export type MainlandHjbPrimaryAssessmentPatternEvidencePack = {
  publisher: "MAINLAND_HJB";
  stage: "primary";
  cards: MainlandHjbPrimaryAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandHjbPrimaryEvidencePack = {
  publisher: "MAINLAND_HJB";
  stage: "primary";
  cards: MainlandHjbPrimaryRagCard[];
  assessmentPatternCards: MainlandHjbPrimaryAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandHjbJuniorRagCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  sourceKind: MainlandHjbJuniorSourceKind;
  volume: string;
  grade: MainlandHjbJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  unitTitle: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  difficultyBand: MainlandHjbJuniorDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbJuniorRagQuery = {
  grade?: MainlandHjbJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  intent: MainlandHjbJuniorRagIntent;
  difficultyBand?: MainlandHjbJuniorDifficultyBand;
  limit?: number;
};

export type MainlandHjbJuniorEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  cards: MainlandHjbJuniorRagCard[];
  paperPatternCards: MainlandHjbJuniorPaperPatternCard[];
  zhongkaoExamPatternCards: MainlandJuniorZhongkaoExamPatternCard[];
  evidenceText: string;
};

export type MainlandHjbJuniorPaperPatternCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  grade: MainlandHjbJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandHjbJuniorPaperPatternSourceKind;
  materialKinds: MainlandPepJuniorPaperMaterialKind[];
  assessmentFamilies: MainlandPepJuniorPaperAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandHjbJuniorDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbJuniorPaperPatternQuery = {
  grade?: MainlandHjbJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandPepJuniorPaperMaterialKind;
  assessmentFamily?: MainlandPepJuniorPaperAssessmentFamily;
  intent: MainlandHjbJuniorPaperPatternIntent;
  difficultyBand?: MainlandHjbJuniorDifficultyBand;
  limit?: number;
};

export type MainlandHjbJuniorPaperEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  cards: MainlandHjbJuniorPaperPatternCard[];
  evidenceText: string;
};

export type MainlandHjbJuniorAssessmentPatternCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  grade: MainlandHjbJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandHjbJuniorAssessmentPatternSourceKind;
  materialKinds: MainlandHjbJuniorAssessmentMaterialKind[];
  assessmentFamilies: MainlandHjbJuniorAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandHjbJuniorDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
  needsS18MappingReview?: boolean;
};

export type MainlandHjbJuniorAssessmentPatternQuery = {
  grade?: MainlandHjbJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandHjbJuniorAssessmentMaterialKind;
  assessmentFamily?: MainlandHjbJuniorAssessmentFamily;
  intent: MainlandHjbJuniorAssessmentPatternIntent;
  difficultyBand?: MainlandHjbJuniorDifficultyBand;
  includeNeedsS18MappingReview?: boolean;
  limit?: number;
};

export type MainlandHjbJuniorAssessmentPatternEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  cards: MainlandHjbJuniorAssessmentPatternCard[];
  evidenceText: string;
};

export type MainlandHjbJuniorGenerationEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "junior-secondary";
  curriculumCards: MainlandHjbJuniorRagCard[];
  assessmentPatternCards: MainlandHjbJuniorAssessmentPatternCard[];
  paperPatternCards: MainlandHjbJuniorPaperPatternCard[];
  zhongkaoExamPatternCards: MainlandJuniorZhongkaoExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepPrimaryExamPatternCard = {
  id: string;
  publisher: "MAINLAND_PEP";
  stage: "primary";
  grade: GradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandPepPrimaryExamPatternSourceKind;
  materialKinds: MainlandPepPrimaryMaterialKind[];
  assessmentFamilies?: MainlandPepPrimaryAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags?: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandPepDifficultyBand;
  patternSummary: string;
  solutionStrategyTags?: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandPepPrimaryExamPatternQuery = {
  grade?: GradeId;
  semester?: MainlandPepPrimaryExamPatternCard["semester"];
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandPepPrimaryMaterialKind;
  assessmentFamily?: MainlandPepPrimaryAssessmentFamily;
  intent: MainlandPepPrimaryExamPatternIntent;
  difficultyBand?: MainlandPepDifficultyBand;
  limit?: number;
};

export type MainlandPepPrimaryExamEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "primary";
  cards: MainlandPepPrimaryExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepPrimaryExamPatternEvidencePack = MainlandPepPrimaryExamEvidencePack;

export type MainlandPepPrimaryExamGenerationEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "primary";
  curriculumCards: MainlandPepRagCard[];
  examPatternCards: MainlandPepPrimaryExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepJuniorPaperPatternCard = {
  id: string;
  publisher: "MAINLAND_PEP";
  stage: "junior-secondary";
  grade: MainlandPepJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  sourceKind: MainlandPepJuniorPaperPatternSourceKind;
  materialKinds: MainlandPepJuniorPaperMaterialKind[];
  assessmentFamilies?: MainlandPepJuniorPaperAssessmentFamily[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags?: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandPepDifficultyBand;
  patternSummary: string;
  solutionStrategyTags?: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandPepJuniorPaperPatternQuery = {
  grade?: MainlandPepJuniorGradeId;
  semester?: MainlandPepJuniorPaperPatternCard["semester"];
  conceptIds?: string[];
  unitTitle?: string;
  materialKind?: MainlandPepJuniorPaperMaterialKind;
  assessmentFamily?: MainlandPepJuniorPaperAssessmentFamily;
  intent: MainlandPepJuniorPaperPatternIntent;
  difficultyBand?: MainlandPepDifficultyBand;
  limit?: number;
};

export type MainlandPepJuniorPaperEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "junior-secondary";
  cards: MainlandPepJuniorPaperPatternCard[];
  evidenceText: string;
};

export type MainlandPepJuniorPaperPatternEvidencePack = MainlandPepJuniorPaperEvidencePack;

export type MainlandPepJuniorPaperGenerationEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "junior-secondary";
  curriculumCards: MainlandPepRagCard[];
  paperPatternCards: MainlandPepJuniorPaperPatternCard[];
  evidenceText: string;
};

export type MainlandJuniorZhongkaoExamPatternCard = {
  id: string;
  stage: "junior-secondary";
  grades: MainlandPepJuniorGradeId[];
  semesters: MainlandPepSemester[];
  sourceKind: MainlandJuniorZhongkaoExamPatternSourceKind;
  yearRange: string;
  examFamilies: string[];
  unitTitles: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandPepDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandJuniorZhongkaoExamPatternQuery = {
  grade?: MainlandPepJuniorGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  unitTitle?: string;
  examFamily?: string;
  intent: MainlandPepJuniorExamPatternIntent;
  difficultyBand?: MainlandPepDifficultyBand;
  limit?: number;
};

export type MainlandJuniorZhongkaoExamEvidencePack = {
  stage: "junior-secondary";
  cards: MainlandJuniorZhongkaoExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepJuniorExamPatternCard = MainlandJuniorZhongkaoExamPatternCard & {
  publisher: "MAINLAND_PEP";
};

export type MainlandPepJuniorExamPatternQuery = MainlandJuniorZhongkaoExamPatternQuery;

export type MainlandPepJuniorExamEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "junior-secondary";
  cards: MainlandPepJuniorExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepJuniorExamGenerationEvidencePack = {
  publisher: "MAINLAND_PEP";
  stage: "junior-secondary";
  curriculumCards: MainlandPepRagCard[];
  examPatternCards: MainlandPepJuniorExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepHighRagCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  sourceKind: MainlandPepHighSourceKind;
  module: MainlandPepHighModule;
  volume: string;
  chapter: string;
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandPepHighDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandPepHighRagQuery = {
  conceptIds?: string[];
  chapter?: string;
  intent: MainlandPepHighRagIntent;
  difficultyBand?: MainlandPepHighDifficultyBand;
  limit?: number;
};

export type MainlandPepHighEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  cards: MainlandPepHighRagCard[];
  evidenceText: string;
};

export type MainlandPepHighExamPatternCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  sourceKind: "exam-paper" | "exam-solution";
  yearRange: string;
  examFamilies: string[];
  chapter: string;
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandPepHighDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandPepSecondaryExamPatternCard = MainlandPepHighExamPatternCard & {
  publisher: "MAINLAND_PEP";
  stage: "senior-secondary";
  legacyCurriculumTrack: "MAINLAND_PEP_HIGH";
  grades: MainlandPepSecondaryGradeId[];
  semesters: MainlandPepSemester[];
};

export type MainlandPepHighExamPatternQuery = {
  grade?: MainlandPepSecondaryGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  chapter?: string;
  examFamily?: string;
  intent: MainlandPepHighExamPatternIntent;
  difficultyBand?: MainlandPepHighDifficultyBand;
  limit?: number;
};

export type MainlandPepHighExamEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  cards: MainlandPepHighExamPatternCard[];
  evidenceText: string;
};

export type MainlandPepHighExamGenerationEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  curriculumCards: MainlandPepHighRagCard[];
  examPatternCards: MainlandPepHighExamPatternCard[];
  evidenceText: string;
};

export type MainlandHjbHighRagCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  sourceKind: MainlandHjbHighSourceKind;
  module: MainlandHjbHighModule;
  volume: string;
  chapter: string;
  grades: MainlandPepSecondaryGradeId[];
  semesters: MainlandPepSemester[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandHjbHighDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbHighExamPatternCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "senior-secondary";
  sourceKind: MainlandHjbHighExamPatternSourceKind;
  assessmentFamilies: MainlandHjbHighAssessmentFamily[];
  volumeScope: MainlandHjbHighVolumeScope;
  grades: MainlandPepSecondaryGradeId[];
  semesters: MainlandPepSemester[];
  chapters: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandHjbHighDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandHjbHighExamPatternQuery = {
  grade?: MainlandPepSecondaryGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  chapter?: string;
  assessmentFamily?: MainlandHjbHighAssessmentFamily;
  intent: MainlandHjbHighRagIntent;
  difficultyBand?: MainlandHjbHighDifficultyBand;
  limit?: number;
};

export type MainlandHjbHighExamPatternEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  stage: "senior-secondary";
  cards: MainlandHjbHighExamPatternCard[];
  evidenceText: string;
};

export type MainlandHjbHighRagQuery = {
  grade?: MainlandPepSecondaryGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  chapter?: string;
  intent: MainlandHjbHighRagIntent;
  difficultyBand?: MainlandHjbHighDifficultyBand;
  limit?: number;
};

export type MainlandHjbHighEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_HJB";
  textbookCards: MainlandHjbHighRagCard[];
  hjbExamPatternCards: MainlandHjbHighExamPatternCard[];
  examPatternCards: MainlandPepHighExamPatternCard[];
  evidenceText: string;
};

export type MainlandBnuHighRagCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_BNU";
  stage: "senior-secondary";
  sourceKind: MainlandBnuHighSourceKind;
  module: MainlandBnuHighModule;
  volume: string;
  chapter: string;
  grades: MainlandBnuHighGradeId[];
  semesters: MainlandPepSemester[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandBnuHighDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandBnuHighAssessmentPatternCard = {
  id: string;
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_BNU";
  stage: "senior-secondary";
  sourceKind: MainlandBnuHighAssessmentPatternSourceKind;
  materialKinds: MainlandBnuHighAssessmentMaterialKind[];
  assessmentFamilies: MainlandBnuHighAssessmentFamily[];
  volumeScope: MainlandBnuHighAssessmentVolumeScope;
  grades: MainlandBnuHighGradeId[];
  semesters: MainlandPepSemester[];
  unitTitles: string[];
  chapters: string[];
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  itemTypeTags: string[];
  difficultyBand: MainlandBnuHighDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type MainlandBnuHighAssessmentPatternQuery = {
  grade?: MainlandBnuHighGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  chapter?: string;
  unitTitle?: string;
  assessmentFamily?: MainlandBnuHighAssessmentFamily;
  materialKind?: MainlandBnuHighAssessmentMaterialKind;
  intent: MainlandBnuHighAssessmentPatternIntent;
  difficultyBand?: MainlandBnuHighDifficultyBand;
  limit?: number;
};

export type MainlandBnuHighAssessmentPatternEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_BNU";
  stage: "senior-secondary";
  cards: MainlandBnuHighAssessmentPatternCard[];
  coverageGaps: string[];
  evidenceText: string;
};

export type MainlandBnuHighRagQuery = {
  grade?: MainlandBnuHighGradeId;
  semester?: MainlandPepSemester;
  conceptIds?: string[];
  chapter?: string;
  intent: MainlandBnuHighRagIntent;
  difficultyBand?: MainlandBnuHighDifficultyBand;
  limit?: number;
};

export type MainlandBnuHighEvidencePack = {
  curriculumTrack: "MAINLAND_PEP_HIGH";
  publisher: "MAINLAND_BNU";
  stage: "senior-secondary";
  cards: MainlandBnuHighRagCard[];
  assessmentPatternCards: MainlandBnuHighAssessmentPatternCard[];
  examPatternCards: MainlandPepHighExamPatternCard[];
  coverageGaps: string[];
  evidenceText: string;
};

export type HongKongMathEdBRagCard = {
  id: string;
  curriculumTrack: "HK";
  stage: HongKongMathEdBStage;
  documentPurposes: HongKongMathEdBDocumentPurpose[];
  grades: GradeId[];
  sourceFiles: string[];
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongMathEdBDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongMathEdBRagQuery = {
  grade?: GradeId;
  stage?: HongKongMathEdBStage;
  documentPurpose?: HongKongMathEdBDocumentPurpose;
  conceptIds?: string[];
  topicId?: string;
  intent: HongKongMathEdBRagIntent;
  difficultyBand?: HongKongMathEdBDifficultyBand;
  limit?: number;
};

export type HongKongMathEdBEvidencePack = {
  curriculumTrack: "HK";
  cards: HongKongMathEdBRagCard[];
  evidenceText: string;
};

export type HongKongDseMathExamPatternCard = {
  id: string;
  curriculumTrack: "HK";
  yearRange: string;
  languageVariants: HongKongDseMathLanguageVariant[];
  paperComponents: HongKongDseMathPaperComponent[];
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongDseMathDifficultyBand;
  patternSummary: string;
  solutionStrategyTags: string[];
  misconceptionTags: string[];
  generationGuidance: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongDseMathRagQuery = {
  grade?: GradeId;
  topicId?: string;
  conceptIds?: string[];
  paperComponent?: HongKongDseMathPaperComponent;
  intent: HongKongDseMathRagIntent;
  difficultyBand?: HongKongDseMathDifficultyBand;
  language?: HongKongDseMathLanguageVariant;
  limit?: number;
};

export type HongKongDseMathEvidencePack = {
  curriculumTrack: "HK";
  cards: HongKongDseMathExamPatternCard[];
  evidenceText: string;
};

export type HongKongDseUpSafeCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  volume: HongKongDseUpVolume;
  grade: GradeId;
  chapter: string;
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongDseUpDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFiles: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongDseUpRagQuery = {
  grade?: GradeId;
  volume?: HongKongDseUpVolume;
  chapter?: string;
  topicId?: string;
  conceptIds?: string[];
  intent: HongKongDseUpRagIntent;
  difficultyBand?: HongKongDseUpDifficultyBand;
  limit?: number;
};

export type HongKongDseUpEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  cards: HongKongDseUpSafeCard[];
  evidenceText: string;
};

export type HongKongUpJuniorSafeCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  stage: "junior-secondary";
  sourceLanguage: HongKongUpJuniorSourceLanguage;
  volume: HongKongUpJuniorVolume;
  grade: Extract<GradeId, "S1" | "S2" | "S3">;
  semester: "upper" | "lower";
  chapterSequence: number;
  chapter: string;
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongUpJuniorDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFiles: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongUpJuniorRagQuery = {
  grade?: GradeId;
  volume?: HongKongUpJuniorVolume;
  semester?: "upper" | "lower";
  sourceLanguage?: HongKongUpJuniorSourceLanguage;
  chapter?: string;
  topicId?: string;
  conceptIds?: string[];
  intent: HongKongUpJuniorRagIntent;
  difficultyBand?: HongKongUpJuniorDifficultyBand;
  limit?: number;
};

export type HongKongUpJuniorEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  stage: "junior-secondary";
  cards: HongKongUpJuniorSafeCard[];
  evidenceText: string;
};

export type HongKongModernPrimarySafeCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY";
  stage: "primary";
  sourceLanguage: "zh";
  volumes: HongKongModernPrimaryVolume[];
  grade: Extract<GradeId, "P1" | "P3">;
  chapterSequence: number;
  chapter: string;
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongModernPrimaryDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFiles: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongModernPrimaryRagQuery = {
  grade?: GradeId;
  volume?: HongKongModernPrimaryVolume;
  chapter?: string;
  topicId?: string;
  conceptIds?: string[];
  intent: HongKongModernPrimaryRagIntent;
  difficultyBand?: HongKongModernPrimaryDifficultyBand;
  limit?: number;
};

export type HongKongModernPrimaryEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY";
  stage: "primary";
  cards: HongKongModernPrimarySafeCard[];
  evidenceText: string;
};

export type HongKongUpJuniorResourcePatternCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  stage: "junior-secondary";
  sourceLanguage: HongKongUpJuniorSourceLanguage;
  materialKind: HongKongUpJuniorResourceMaterialKind;
  volumes: HongKongUpJuniorVolume[];
  grades: Extract<GradeId, "S1" | "S2" | "S3">[];
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongUpJuniorResourceDifficultyBand;
  patternSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFamilies: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongUpJuniorResourceRagQuery = {
  grade?: GradeId;
  volume?: HongKongUpJuniorVolume;
  sourceLanguage?: HongKongUpJuniorSourceLanguage;
  materialKind?: HongKongUpJuniorResourceMaterialKind;
  topicId?: string;
  conceptIds?: string[];
  intent: HongKongUpJuniorResourceRagIntent;
  difficultyBand?: HongKongUpJuniorResourceDifficultyBand;
  limit?: number;
};

export type HongKongUpJuniorResourceEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_UNITED_PRIME_MIA";
  stage: "junior-secondary";
  cards: HongKongUpJuniorResourcePatternCard[];
  evidenceText: string;
};

export type HongKongDseEphSafeCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_EPH_MIF";
  volume: HongKongDseEphVolume;
  grade: GradeId;
  chapter: string;
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongDseEphDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFiles: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongDseEphRagQuery = {
  grade?: GradeId;
  volume?: HongKongDseEphVolume;
  chapter?: string;
  topicId?: string;
  conceptIds?: string[];
  intent: HongKongDseEphRagIntent;
  difficultyBand?: HongKongDseEphDifficultyBand;
  limit?: number;
};

export type HongKongDseEphEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_EPH_MIF";
  cards: HongKongDseEphSafeCard[];
  evidenceText: string;
};

export type HongKongEaseQuestionPatternCard = {
  id: string;
  curriculumTrack: "HK";
  publisher: "HK_EASE_SHARED";
  stage: "junior-secondary" | "senior-secondary" | "cross-stage";
  grades: GradeId[];
  sourceLanguages: HongKongDseMathLanguageVariant[];
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: HongKongEaseQuestionDifficultyBand;
  assetKinds: HongKongEaseQuestionAssetKind[];
  questionCountRange: string;
  imageAssetSummary: string;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceFamilies: string[];
  prohibitedReuseNotes: string[];
};

export type HongKongEaseQuestionRagQuery = {
  grade?: GradeId;
  topicId?: string;
  conceptIds?: string[];
  language?: HongKongDseMathLanguageVariant;
  intent: HongKongEaseQuestionRagIntent;
  difficultyBand?: HongKongEaseQuestionDifficultyBand;
  requiresImageAssets?: boolean;
  limit?: number;
};

export type HongKongEaseQuestionEvidencePack = {
  curriculumTrack: "HK";
  publisher: "HK_EASE_SHARED";
  cards: HongKongEaseQuestionPatternCard[];
  evidenceText: string;
};

export type HongKongMathRagQuery = Omit<HongKongMathEdBRagQuery, "intent" | "difficultyBand"> & {
  curriculumProfile?: CurriculumProfile;
  intent: HongKongMathEdBRagIntent | HongKongDseMathRagIntent | HongKongDseUpRagIntent | HongKongDseEphRagIntent | HongKongModernPrimaryRagIntent | HongKongUpJuniorRagIntent | HongKongUpJuniorResourceRagIntent | HongKongEaseQuestionRagIntent;
  difficultyBand?: HongKongMathEdBDifficultyBand | HongKongDseMathDifficultyBand | HongKongDseUpDifficultyBand | HongKongDseEphDifficultyBand | HongKongModernPrimaryDifficultyBand | HongKongUpJuniorDifficultyBand | HongKongUpJuniorResourceDifficultyBand | HongKongEaseQuestionDifficultyBand;
  paperComponent?: HongKongDseMathPaperComponent;
  language?: HongKongDseMathLanguageVariant;
  textbookVolume?: HongKongDseUpVolume | HongKongDseEphVolume | HongKongModernPrimaryVolume | HongKongUpJuniorVolume;
  materialKind?: HongKongUpJuniorResourceMaterialKind;
  requiresImageAssets?: boolean;
  limit?: number;
};

export type HongKongMathEvidencePack = {
  curriculumTrack: "HK";
  curriculumCards: HongKongMathEdBRagCard[];
  textbookCards: Array<HongKongDseUpSafeCard | HongKongDseEphSafeCard | HongKongModernPrimarySafeCard | HongKongUpJuniorSafeCard | HongKongUpJuniorResourcePatternCard>;
  examPatternCards: HongKongDseMathExamPatternCard[];
  questionPatternCards: HongKongEaseQuestionPatternCard[];
  evidenceText: string;
};

export type UnitedStatesMathSourceRegistryEntry = {
  id: string;
  state: UnitedStatesMathState;
  title: string;
  sourceKind: UnitedStatesMathSourceKind;
  libraryLane: UnitedStatesMathLibraryLane;
  owner: string;
  url: string;
  licenseStatus: UnitedStatesMathLicenseStatus;
  allowedUse: string;
  verbatimLimit: string;
  commercialUse: UnitedStatesMathCommercialUse;
  derivativeUse: UnitedStatesMathCommercialUse;
  attributionText: string;
  repositoryRetention: UnitedStatesMathRepositoryRetention;
  safeCardAllowed: boolean;
  rawCorpusAllowed: boolean;
  notes: string[];
  lastCheckedAt: string;
  reviewedAt: string;
};

export type UnitedStatesMathStateProfile = {
  state: Exclude<UnitedStatesMathState, "US">;
  curriculumTrack: UnitedStatesMathTrack;
  displayName: string;
  populationRank: number;
  statePriorityPhase: 1 | 2 | 3;
  standardsName: string;
  standardsVersion: string;
  commonCoreStatus: UnitedStatesMathCommonCoreStatus;
  standardPrefix: string;
  standardsSourceIds: string[];
  textbookSourceIds: string[];
  examSourceIds: string[];
  baseSourceIds: string[];
  assessmentProgram: string;
  adoptionPolicy: string;
  materialsPolicy: string;
  crosswalkRelationToCcss: UnitedStatesMathCrosswalkRelation;
  crosswalkNotes: string[];
  stateEvidenceNote: string;
  noEndorsementNotice: string;
};

export type UnitedStatesMathSafeCard = {
  id: string;
  curriculumTrack: UnitedStatesMathTrack;
  state: Exclude<UnitedStatesMathState, "US">;
  stateName: string;
  populationRank: number;
  statePriorityPhase: 1 | 2 | 3;
  standardsName: string;
  standardsVersion: string;
  commonCoreStatus: UnitedStatesMathCommonCoreStatus;
  crosswalkRelationToCcss: UnitedStatesMathCrosswalkRelation;
  crosswalkNotes: string[];
  adoptionPolicy: string;
  materialsPolicy: string;
  assessmentProgram: string;
  libraryLane: UnitedStatesMathLibraryLane;
  cardKind: UnitedStatesMathSafeCardKind;
  grade: UnitedStatesMathGradeId;
  usGradeLabel: string;
  sourceIds: string[];
  standardIds: string[];
  domainTags: string[];
  clusterTags: string[];
  topicIds: string[];
  conceptIds: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: UnitedStatesMathDifficultyBand;
  safeSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  prohibitedReuseNotes: string[];
  principalDemoNotes: string[];
  textbookCompatibilityNotes?: string[];
  examPatternNotes?: string[];
  attributionNotes?: string[];
};

export type UnitedStatesMathRagQuery = {
  curriculumTrack?: UnitedStatesMathTrack;
  state?: Exclude<UnitedStatesMathState, "US">;
  grade?: UnitedStatesMathGradeId;
  standardIds?: string[];
  cardKinds?: UnitedStatesMathSafeCardKind[];
  libraryLanes?: UnitedStatesMathLibraryLane[];
  domainTags?: string[];
  conceptIds?: string[];
  topicId?: string;
  intent: UnitedStatesMathRagIntent;
  difficultyBand?: UnitedStatesMathDifficultyBand;
  limit?: number;
};

export type UnitedStatesMathEvidencePack = {
  curriculumTrack: UnitedStatesMathTrack;
  cards: UnitedStatesMathSafeCard[];
  sourceRegistry: UnitedStatesMathSourceRegistryEntry[];
  evidenceText: string;
};

export type StudentSession = {
  id: string;
  name: string;
  username: string;
  email?: string;
  schoolId?: string;
  passwordMustChange?: boolean;
  avatarId: StudentAvatarId;
  avatarImageDataUrl?: string;
  avatarImageObjectKey?: string;
  avatarImageUrl?: string;
  grade: GradeId;
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
  role: "student" | "teacher" | "parent" | "admin";
};

export type LearnerProfileOnboardingVersion = "learner-start-v1";
export type LearnerProfileOnboardingStatus = "not-started" | "completed" | "skipped";
export type LearnerProfileGoal = "repair" | "homework" | "preview" | "exam";
export type LearnerProfileChallengeStart = "easy" | "balanced" | "hard";
export type LearnerProfileHelpStyle = "hint" | "steps" | "example" | "method";

export type LearnerStartSetupAnswers = {
  goal: LearnerProfileGoal;
  challenge: LearnerProfileChallengeStart;
  help: LearnerProfileHelpStyle;
};

export type LearnerProfile = {
  userId: string;
  questionnaireVersion: LearnerProfileOnboardingVersion;
  status: LearnerProfileOnboardingStatus;
  answers?: LearnerStartSetupAnswers;
  initializedFrom: "login-onboarding";
  completedAt?: string;
  skippedAt?: string;
  updatedAt: string;
};

export type MistakeRecord = {
  questionId: string;
  lastSelectedAnswer: string;
  correctAnswer: string;
  wrongAttempts: number;
  firstWrongAt: string;
  lastAttemptAt: string;
  mastered: boolean;
};

export type MistakeBookItem = MistakeRecord & {
  question: PublicQuestion;
  explanation: LocalizedText;
};

export type LocalizedText = {
  en: string;
  zh: string;
  zhHans?: string;
};

export type Grade = {
  id: GradeId;
  name: LocalizedText;
  ageRange: string;
  focus: LocalizedText;
  color: string;
};

export type Topic = {
  id: string;
  curriculumTrack: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  region?: CurriculumRegion;
  publisher?: TextbookPublisher;
  canonicalTopicId?: string;
  grade: GradeId;
  title: LocalizedText;
  description: LocalizedText;
  status: TopicStatus;
  difficulty: Difficulty;
  minutes: number;
  mastery: number;
};

export type QuestionType = "multiple-choice" | "fill-in" | "short-answer" | "graph";

export type CoordinateGridQuestionDiagram = {
  kind: "coordinate-grid";
  xRange: [number, number];
  yRange: [number, number];
  points?: {
    label: string;
    x: number;
    y: number;
  }[];
  lines?: {
    label?: string;
    points: {
      x: number;
      y: number;
    }[];
  }[];
};

export type PlaneFigurePoint = {
  id: string;
  x: number;
  y: number;
  label?: string;
};

export type PlaneFigureSegment = {
  from: string;
  to: string;
  style?: "solid" | "dashed";
  tickMarks?: number;
  parallelMarks?: number;
  label?: LocalizedText;
};

export type PlaneFigurePolygon = {
  vertexIds: string[];
  shaded?: boolean;
};

export type PlaneFigureCircle = {
  centerId: string;
  radius: number;
  showCenter?: boolean;
  radiusToId?: string;
  label?: LocalizedText;
};

export type PlaneFigureAngleMark = {
  vertexId: string;
  fromId: string;
  toId: string;
  rightAngle?: boolean;
  arcs?: number;
  label?: LocalizedText;
};

export type PlaneFigureQuestionDiagram = {
  kind: "plane-figure";
  points: PlaneFigurePoint[];
  segments?: PlaneFigureSegment[];
  polygons?: PlaneFigurePolygon[];
  circles?: PlaneFigureCircle[];
  angleMarks?: PlaneFigureAngleMark[];
};

export type NumberLinePoint = {
  value: number;
  label?: string;
  marker?: "closed" | "open";
};

export type NumberLineHighlight = {
  from: number;
  to: number;
  label?: LocalizedText;
};

export type NumberLineQuestionDiagram = {
  kind: "number-line";
  range: [number, number];
  tickInterval?: number;
  points?: NumberLinePoint[];
  highlights?: NumberLineHighlight[];
};

export type SolidFigureShape = "cuboid" | "cube" | "cylinder" | "cone" | "sphere";

export type SolidFigureDimensionLabels = {
  width?: LocalizedText;
  depth?: LocalizedText;
  height?: LocalizedText;
  radius?: LocalizedText;
};

export type SolidFigureQuestionDiagram = {
  kind: "solid-figure";
  shape: SolidFigureShape;
  width?: number;
  depth?: number;
  height?: number;
  radius?: number;
  size?: number;
  labels?: SolidFigureDimensionLabels;
};

export type QuestionDiagram =
  | CoordinateGridQuestionDiagram
  | PlaneFigureQuestionDiagram
  | NumberLineQuestionDiagram
  | SolidFigureQuestionDiagram;

export type QuestionAsset = {
  kind: "image";
  src: string;
  alt: LocalizedText;
  caption?: LocalizedText;
};

export type Question = {
  id: string;
  curriculumTrack: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  region?: CurriculumRegion;
  publisher?: TextbookPublisher;
  canonicalTopicId?: string;
  grade: GradeId;
  topicId: string;
  topic: LocalizedText;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: LocalizedText;
  options?: LocalizedText[];
  answer: string;
  acceptedAnswers?: string[];
  explanation: LocalizedText;
  diagram?: QuestionDiagram;
  questionAssets?: QuestionAsset[];
};

export type PublicQuestion = Omit<Question, "answer" | "acceptedAnswers" | "explanation">;

export type AttemptFeedback = {
  correct: boolean;
  explanation: LocalizedText;
  correctAnswer?: string;
};

export type ProgressMetric = {
  label: LocalizedText;
  value: string;
  detail: LocalizedText;
  trend: string;
};

export type MasteryArea = {
  label: LocalizedText;
  value: number;
};

export type WeeklyActivity = {
  day: string;
  minutes: number;
};

export type RecentActivityItem = {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  timestamp: string;
};

export type ProgressData = {
  curriculumTrack: CurriculumTrack;
  progressMetrics: ProgressMetric[];
  weeklyActivity: WeeklyActivity[];
  masteryAreas: MasteryArea[];
  weakTopics: Topic[];
  recentActivity: RecentActivityItem[];
  totalMinutes: number;
  contentUnavailable?: LocalizedText | null;
};

export type DashboardData = {
  curriculumTrack: CurriculumTrack;
  streakDays: number;
  overallMastery: number;
  progressMetrics: ProgressMetric[];
  recommendedLesson: Topic | null;
  recentTopics: Topic[];
  weakTopics: Topic[];
  gradeTopics: Topic[];
  contentUnavailable?: LocalizedText | null;
};

export type LessonBlockType =
  | "concept"
  | "worked-example"
  | "visualization"
  | "interactive-lesson"
  | "practice"
  | "checklist"
  | "extension"
  | "teacher-guide";

export type LessonBlock = {
  id: string;
  type: LessonBlockType;
  title: LocalizedText;
  content?: LocalizedText;
  items?: LocalizedText[];
  visualizationConfig?: {
    moduleId: string;
    source: LearningAnalyticsEventSource;
    topicId: string;
  };
  /** For "interactive-lesson" blocks: which ported CCSS textbook lesson renders as the block body. */
  interactiveLessonConfig?: {
    ccssLessonSlug: string;
    topicId: string;
    standardIds: string[];
  };
  practiceQuestionIds?: string[];
};

export type LessonSummary = {
  slug: string;
  topicId: string;
  canonicalTopicId?: string;
  curriculumProfile?: CurriculumProfile;
  region?: CurriculumRegion;
  publisher?: TextbookPublisher;
  grade: GradeId;
  title: LocalizedText;
  description: LocalizedText;
  difficulty: Difficulty;
  estimatedMinutes: number;
  status: TopicStatus;
  mastery: number;
};

export type LessonEntryTarget = {
  href: string;
  slug: string;
  grade: GradeId;
  topicId: string;
};

export type LessonDetail = LessonSummary & {
  blocks: LessonBlock[];
  practiceQuestions: PublicQuestion[];
  topic: Topic;
  checklistState: Record<string, boolean>;
};

export type RoadmapData = {
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
  grade: GradeId | "all";
  topics: Topic[];
  lessons: LessonSummary[];
  recommendedLesson: LessonSummary | null;
  recentTopics: Topic[];
  weakTopics: Topic[];
  contentUnavailable?: LocalizedText | null;
};

export type AdaptiveActionType = "review" | "repair" | "practice" | "lesson" | "challenge";
export type AdaptiveConfidence = "thin" | "developing" | "strong";
export type AdaptiveEngineMode = "deterministic" | "llm-assisted";
export type AdaptiveLLMStatus = "disabled" | "pending" | "ready" | "failed" | "rejected";
export type AdaptiveEngineErrorKind = "configuration" | "format" | "guardrail" | "provider" | "rate-limit";
export type AdaptiveCandidateGuard =
  | "due-review"
  | "repair-required"
  | "weak-prerequisite"
  | "new-lesson"
  | "mastery-practice"
  | "challenge-ready"
  | "fallback";

export type AdaptiveAIConfidence = {
  score: number;
  label: LocalizedText;
  criteria: LocalizedText;
};

export type AdaptiveEngineMetadata = {
  version: "hybrid-v3";
  mode: AdaptiveEngineMode;
  llmStatus: AdaptiveLLMStatus;
  selectedCandidateId: string;
  deterministicCandidateId: string;
  candidateSignature: string;
  provider?: string;
  model?: string;
  teacherAuditNote?: LocalizedText;
  signalsUsed?: string[];
  confidenceExplanation?: LocalizedText;
  aiConfidence?: AdaptiveAIConfidence;
  error?: string;
  errorKind?: AdaptiveEngineErrorKind;
  finishReason?: string;
};

export type AdaptiveLLMRecommendation = {
  selectedCandidateId: string;
  questionIds?: string[];
  learnerReason: LocalizedText;
  teacherAuditNote: LocalizedText;
  signalsUsed: string[];
  confidenceExplanation: LocalizedText;
};

export type KnowledgeComponent = {
  id: string;
  topicId: string;
  grade: GradeId;
  title: LocalizedText;
  description: LocalizedText;
  prerequisites: string[];
  difficulty: Difficulty;
  misconceptionTags: string[];
  questionIds: string[];
};

export type AdaptiveSkillState = {
  skillId: string;
  pMastery: number;
  attemptCount: number;
  correctStreak: number;
  wrongStreak: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  hintCount: number;
  misconceptionTags: string[];
  updatedAt: string;
};

export type AdaptiveEvidence = {
  label: LocalizedText;
  value: string;
  detail: LocalizedText;
};

export type AdaptiveSkillSummary = {
  skill: KnowledgeComponent;
  state: AdaptiveSkillState;
  topic: Topic;
};

export type AdaptiveLearningCandidate = {
  candidateId: string;
  action: AdaptiveActionType;
  baseScore: number;
  hardGuardFlags: AdaptiveCandidateGuard[];
  skill: KnowledgeComponent;
  topic: Topic;
  lesson: LessonSummary | null;
  questions: PublicQuestion[];
  questionIds: string[];
  summary: AdaptiveSkillSummary;
  evidence: AdaptiveEvidence[];
};

export type AdaptiveLearningDecision = {
  action: AdaptiveActionType;
  confidence: AdaptiveConfidence;
  deterministic: boolean;
  evidenceCount: number;
  guardFlags: AdaptiveCandidateGuard[];
  nextReviewAt: string | null;
  generatedAt: string;
  engine: AdaptiveEngineMetadata;
  skill: KnowledgeComponent;
  topic: Topic;
  lesson: LessonSummary | null;
  questions: PublicQuestion[];
  skillMap: AdaptiveSkillSummary[];
  dueReviews: AdaptiveSkillSummary[];
  explanation: LocalizedText;
  evidence: AdaptiveEvidence[];
};

export type PilotPlatformRole = "student" | "teacher" | "parent" | "admin";
export type PilotPlatformVisibility = "student-owned" | "teacher-reviewed" | "parent-safe" | "blocked";
export type PilotPlatformEventType =
  | "adaptive-decision-requested"
  | "adaptive-state-transitioned"
  | "teacher-review-generated"
  | "teacher-review-approved"
  | "parent-safe-draft-published";

export type PilotPlatformGuard = {
  visibility: PilotPlatformVisibility;
  allowed: boolean;
  reason: LocalizedText;
};

export type PilotLearnerState = {
  studentId: string;
  grade: GradeId;
  curriculumProfile: CurriculumProfile;
  adaptiveDecision: AdaptiveLearningDecision | null;
  skillStates: AdaptiveSkillState[];
  lastTransitionAt: string | null;
  nextReviewAt: string | null;
  guard: PilotPlatformGuard;
};

export type PilotPlatformEvent = {
  id: string;
  type: PilotPlatformEventType;
  actorRole: PilotPlatformRole;
  actorId?: string;
  studentId?: string;
  classId?: string;
  reviewLessonId?: string;
  noticeId?: string;
  adaptiveAction?: AdaptiveActionType;
  generatedAt: string;
  summary: LocalizedText;
};

export type LearningAnalyticsEventType =
  | "mouse-click"
  | "keyboard"
  | "answer-correct"
  | "answer-wrong"
  | "hint-request"
  | "visualization-slider"
  | "visualization-drag"
  | "visualization-probe"
  | "visualization-simulate"
  | "visualization-reset"
  | "visualization-complete"
  | "page-view"
  | "mistake-review";

export type LearningAnalyticsEventSource =
  | "adaptive-learning"
  | "dashboard"
  | "practice"
  | "progress"
  | "lesson"
  | "ai-tutor"
  | "mistake-book"
  | "visualization-lab"
  | "function-graph"
  | "function-model"
  | "geometry"
  | "probability"
  | "coordinate-plane"
  | "trig-wave"
  | "calculus-stats"
  | "learning-path"
  | "navigation";

export type LearningAnalyticsEvent = {
  id: string;
  type: LearningAnalyticsEventType;
  source: LearningAnalyticsEventSource;
  timestamp: string;
  grade: GradeId;
  topicId: string;
  questionId?: string;
  classId?: string;
  assignmentId?: string;
  competencyId?: string;
  durationSeconds?: number;
};

export type LearningAnalyticsInput = {
  type: LearningAnalyticsEventType;
  source: LearningAnalyticsEventSource;
  topicId: string;
  questionId?: string;
  classId?: string;
  assignmentId?: string;
  competencyId?: string;
  durationSeconds?: number;
};

export type NovaLensSurface =
  | "lesson"
  | "practice"
  | "dashboard"
  | "roadmap"
  | "visualization"
  | "teacher-console"
  | "parent-console"
  | "admin-console"
  | "general";

export type NovaLensAction =
  | "explain"
  | "simple-example"
  | "why-step"
  | "prerequisite-gap"
  | "quick-check"
  | "teaching-support"
  | "risk-audit"
  | "rewrite-follow-up"
  | "family-support"
  | "custom";

export type NovaLensRunStatus =
  | "completed"
  | "blocked"
  | "provider-fallback"
  | "registration-required"
  | "error";

export type NovaLensPolicy = {
  enabled: boolean;
  allowedRoles: Array<StudentSession["role"]>;
  enabledSurfaces: NovaLensSurface[];
  maxSelectionLength: number;
  retentionDays: number;
  blockedPatterns: string[];
  updatedAt: string;
  updatedBy?: string;
};

export type NovaLensPolicyEvent = {
  id: string;
  actorId: string;
  changedFields: Array<keyof Pick<
    NovaLensPolicy,
    "enabled" | "allowedRoles" | "enabledSurfaces" | "maxSelectionLength" | "retentionDays" | "blockedPatterns"
  >>;
  previousPolicy: NovaLensPolicy;
  nextPolicy: NovaLensPolicy;
  createdAt: string;
};

export type NovaLensRunSummary = {
  id: string;
  userId: string;
  userName: string;
  role: StudentSession["role"];
  surface: NovaLensSurface;
  action: NovaLensAction;
  status: NovaLensRunStatus;
  selectedTextPreview: string;
  selectedTextHash: string;
  page: string;
  topicId?: string;
  questionId?: string;
  lessonSlug?: string;
  blockId?: string;
  blockType?: string;
  policyFlags: string[];
  allowedScopes: string[];
  deniedScopes: string[];
  model?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  createdAt: string;
};

export type NovaLensRunRequest = {
  selectedText: string;
  action: NovaLensAction;
  surface: NovaLensSurface;
  page: string;
  customQuestion?: string;
  context?: {
    title?: string;
    surroundingText?: string;
    topicId?: string;
    questionId?: string;
    lessonSlug?: string;
    blockId?: string;
    blockType?: string;
  };
};

export type NovaLensRunResponse = {
  mode: "nova-lens" | "registration-required";
  status: NovaLensRunStatus;
  reply: string;
  runId?: string;
  policyFlags?: string[];
  context?: {
    mode: "concept" | "question" | "figure" | "mistake" | "general";
    title: string;
    details?: string;
    topicId?: string;
    questionId?: string;
    lessonSlug?: string;
    dataScopes?: Array<"student-dashboard" | "teacher-dashboard" | "teacher-student-profile" | "adaptive-engine">;
    selection?: {
      selectedText: string;
      helpType: "explain" | "simple-example" | "why-step" | "prerequisite-gap" | "custom";
      lessonSlug?: string;
      topicId?: string;
      questionId?: string;
      blockId?: string;
      blockType?: string;
      surroundingText?: string;
    };
  };
};

export type LearningAnalyticsSummary = {
  windowDays: number;
  eventCount: number;
  hasActivity: boolean;
  firstEventAt: string | null;
  lastEventAt: string | null;
  counts: {
    mouseClicks: number;
    keyboardEvents: number;
    correctAnswers: number;
    wrongAnswers: number;
    hintRequests: number;
    visualizationEvents: number;
    pageViews: number;
    mistakeReviews: number;
  };
  answerStats: {
    total: number;
    accuracy: number | null;
  };
  duration: {
    averageSeconds: number | null;
    buckets: {
      fast: number;
      steady: number;
      slow: number;
    };
  };
  engagementScore: number | null;
};

export type LearningAnalyticsExportSummary = {
  generatedAt: string;
  studentId: string;
  grade: GradeId;
  summary: LearningAnalyticsSummary;
  privacy: string;
};

export type AssignmentContentType = "lesson" | "practice" | "visualization" | "resource" | "assessment";
export type AssignmentStatus = "draft" | "scheduled" | "active" | "closed";
export type SubmissionStatus =
  | "not-started"
  | "in-progress"
  | "submitted"
  | "graded"
  | "late"
  | "correction-required"
  | "correction-submitted"
  | "resolved";
export type TeacherMessageStatus = "unread" | "open" | "resolved";
export type TeacherMessagePriority = "normal" | "urgent";
export type TeacherMessageSenderRole = "student" | "teacher" | "parent";
export type ParentMessageCategory = "learning-support" | "homework" | "wellbeing" | "report-question" | "logistics";
export type GuardianRelationship = "mother" | "father" | "guardian" | "other";
export type GuardianLinkStatus = "pending" | "active" | "revoked";
export type TeacherNoticeSourceKind = "manual" | "teacher-review-lesson" | "assignment-reminder" | "system";
export type TeachingResourceType =
  | "slides"
  | "practice"
  | "quiz"
  | "worksheet"
  | "exam-paper"
  | "marking-scheme"
  | "image"
  | "document"
  | "other";
export type AssessmentType = "quiz" | "test" | "mock-exam" | "exam";
export type AssessmentStatus = "draft" | "scheduled" | "open" | "closed";
export type AssessmentSourceType = "question-bank" | "manual" | "resource" | "mistake-generated" | "mixed";
export type AssessmentSubmissionStatus = "not-started" | "in-progress" | "submitted" | "graded" | "late";
export type AssessmentAnalysisBorderlineType = "pass-borderline" | "excellent-borderline" | "low-score-risk";
export type AssessmentAnalysisScoreBandSetting = {
  label: string;
  min: number;
  max: number;
};
export type AssessmentAnalysisSettings = {
  passThreshold: number;
  excellentThreshold: number;
  lowScoreThreshold: number;
  borderlineRange: number;
  scoreBands: AssessmentAnalysisScoreBandSetting[];
  updatedAt?: string;
};
export type TeacherReportType = "student" | "class" | "assignment" | "assessment" | "parent-summary";
export type TeacherInterventionAction = "rebuild-foundation" | "redo-mistakes" | "challenge-extension" | "teacher-message";
export type TeacherActionQueueType =
  | "overdue-assignment"
  | "pending-grading"
  | "pending-correction-review"
  | "overdue-correction"
  | "unreplied-message"
  | "consecutive-mistakes"
  | "inactive-student"
  | "high-ai-tutor";
export type TeacherActionQueuePriority = "high" | "medium" | "low";
export type TeacherLessonKitStatus = "draft" | "generated" | "reviewed" | "published";
export type TeacherLessonKitReviewStatus = "needs-review" | "approved" | "rejected";
export type TeacherLessonKitSource = "manual" | "deterministic" | "ai";
export type TeacherLessonKitSectionKind =
  | "lesson-plan"
  | "learning-guide"
  | "slides"
  | "blackboard-design"
  | "objectives"
  | "key-points"
  | "worked-examples"
  | "class-practice"
  | "homework"
  | "classroom-activity";
export type TeacherLessonKitPublishTarget = "resources" | "assignment" | "assessment" | "live-session";
export type ClassroomWorkSampleStatus = "submitted" | "selected" | "hidden";

export type School = {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  contactName?: string;
  contactEmail?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SchoolMembershipRole = "student" | "teacher" | "parent" | "admin";

export type SchoolMembership = {
  id: string;
  schoolId: string;
  userId: string;
  role: SchoolMembershipRole;
  classId?: string;
  createdAt: string;
};

export type SchoolClass = {
  id: string;
  schoolId: string;
  classId: string;
  classCode: string;
  teacherId: string;
  createdAt: string;
};

export type ProvisioningImportSchool = {
  name: string;
  code: string;
  academicYear: string;
  contactName?: string;
  contactEmail?: string;
};

export type ProvisioningImportClass = {
  classCode: string;
  name?: string;
  grade: GradeId;
  academicYear?: string;
  teacherUsername?: string;
};

export type ProvisioningImportTeacher = {
  name: string;
  email?: string;
  username?: string;
  classCodes?: string[];
};

export type ProvisioningImportStudent = {
  name: string;
  grade: GradeId;
  classCode: string;
  studentNo: string;
  email?: string;
};

export type ProvisioningRequest = {
  school: ProvisioningImportSchool;
  classes?: ProvisioningImportClass[];
  teachers?: ProvisioningImportTeacher[];
  students?: ProvisioningImportStudent[];
  classesCsv?: string;
  teachersCsv?: string;
  studentsCsv?: string;
};

export type ProvisioningRowType = "school" | "class" | "teacher" | "student";
export type ProvisioningRowStatus = "valid" | "created" | "failed" | "skipped";
export type ProvisioningRowAction = "create" | "reuse" | "link" | "none";

export type ProvisioningRowResult = {
  id: string;
  batchId?: string;
  type: ProvisioningRowType;
  rowIndex: number;
  status: ProvisioningRowStatus;
  action: ProvisioningRowAction;
  errors: string[];
  warnings: string[];
  schoolId?: string;
  classId?: string;
  userId?: string;
  classCode?: string;
  username?: string;
  name?: string;
  role?: SchoolMembershipRole;
  temporaryPassword?: string;
};

export type ProvisioningTotals = {
  schools: number;
  classes: number;
  teachers: number;
  students: number;
  errors: number;
};

export type ProvisioningValidationResult = {
  valid: boolean;
  school?: School;
  rows: ProvisioningRowResult[];
  totals: ProvisioningTotals;
  errors: string[];
  warnings: string[];
};

export type ProvisioningCredential = {
  role: "student" | "teacher" | "parent";
  name: string;
  username: string;
  temporaryPassword: string;
  schoolCode: string;
  classCode?: string;
  passwordChangeRequired: true;
};

export type ProvisioningBatchStatus = "created" | "failed";

export type ProvisioningBatch = {
  id: string;
  school: School;
  status: ProvisioningBatchStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  totals: ProvisioningTotals;
  rows: ProvisioningRowResult[];
  credentials: {
    teachers: ProvisioningCredential[];
    studentsByClass: Record<string, ProvisioningCredential[]>;
  };
};

export type GamificationEventSource =
  | "lesson-complete"
  | "practice-accuracy"
  | "streak"
  | "visualization-complete"
  | "mistake-review"
  | "teacher-award"
  | "quest-complete"
  | "campaign-bonus"
  | "badge-earned"
  | "adventure-island-complete"
  | "fishing-game-complete"
  | "island-star";
export type GamificationEventStatus = "awarded" | "duplicate" | "capped" | "flagged";
export type BadgeCategory = "learning" | "practice" | "consistency" | "exploration" | "resilience" | "growth";
export type BadgeCriteriaKind =
  | "lesson-complete"
  | "practice-accuracy"
  | "streak-days"
  | "visualization-complete"
  | "mistake-review"
  | "level"
  | "adventure-island-complete"
  | "island-star";
export type QuestTargetType = "answer-correct" | "lesson-complete" | "visualization-complete" | "mistake-review";
export type QuestCadence = "daily" | "weekly";
export type RewardCampaignStatus = "draft" | "active" | "paused" | "ended";

export type LevelDefinition = {
  level: number;
  title: LocalizedText;
  minXp: number;
  maxXp?: number;
};

export type BadgeDefinition = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  category: BadgeCategory;
  criteria: {
    kind: BadgeCriteriaKind;
    target: number;
  };
  sortOrder: number;
};

export type StudentBadge = BadgeDefinition & {
  earned: boolean;
  earnedAt: string | null;
  progress: number;
};

export type QuestDefinition = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  targetType: QuestTargetType;
  targetCount: number;
  xp: number;
  rewardPoints: number;
  cadence: QuestCadence;
  sortOrder: number;
};

export type StudentQuestProgress = {
  quest: QuestDefinition;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  rewardPointReward: number;
};

export type GamificationEvent = {
  id: string;
  studentId: string;
  xp: number;
  rewardPoints: number;
  source: GamificationEventSource;
  sourceKey: string;
  label: LocalizedText;
  status: GamificationEventStatus;
  antiAbuseFlags: string[];
  economyVersion: string;
  campaignId?: string;
  createdAt: string;
};

export type ClassLeaderboardEntry = {
  rank: number;
  studentId: string;
  studentName: string;
  grade: GradeId;
  classNames: string[];
  weeklyXp: number;
  weeklyRewardPoints: number;
  level: number;
  badgeCount: number;
  streakDays: number;
  isCurrentStudent?: boolean;
};

export type RewardCampaign = {
  id: string;
  teacherId: string;
  classId: string;
  title: LocalizedText;
  description: LocalizedText;
  status: RewardCampaignStatus;
  budgetPoints: number;
  awardedPoints: number;
  questIds: string[];
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AntiAbuseDecision = {
  allowed: boolean;
  status: GamificationEventStatus;
  reason: LocalizedText;
  flags: string[];
  appliedXp: number;
  appliedRewardPoints: number;
  dailyXpTotal: number;
  dailyRewardPointsTotal: number;
};

export type GamificationEconomySummary = {
  version: string;
  expectedWeeklyRewardPoints: {
    min: number;
    max: number;
  };
  dailyXpCap: number;
  dailyRewardPointCap: number;
  teacherManualDailyPointCap: number;
  basicRewardTargetWeeks: string;
  premiumRewardTargetWeeks: string;
};

export type GamificationSummary = {
  generatedAt: string;
  studentId: string;
  xp: number;
  level: {
    current: LevelDefinition;
    next: LevelDefinition | null;
    xpIntoLevel: number;
    xpForNextLevel: number;
    progressPercent: number;
  };
  streakDays: number;
  badges: StudentBadge[];
  earnedBadges: StudentBadge[];
  quests: StudentQuestProgress[];
  leaderboard: ClassLeaderboardEntry[];
  recentEvents: GamificationEvent[];
  rewardSummary: RewardPointSummary;
  economy: GamificationEconomySummary;
  motivation: {
    celebrate: LocalizedText[];
    support: LocalizedText[];
  };
};

export type TeacherGamificationData = {
  generatedAt: string;
  classes: TeacherClass[];
  selectedClassId: string | null;
  leaderboard: ClassLeaderboardEntry[];
  campaigns: RewardCampaign[];
  economy: GamificationEconomySummary;
  antiAbuseAlerts: LocalizedText[];
  totals: {
    activeCampaigns: number;
    weeklyXp: number;
    weeklyRewardPoints: number;
    flaggedEvents: number;
  };
};

export type RewardPointReason =
  | "lesson-complete"
  | "practice-accuracy"
  | "streak"
  | "visualization-complete"
  | "mistake-review"
  | "teacher-award"
  | "redemption-spent"
  | "adventure-island-complete"
  | "fishing-game-complete"
  | "island-star";
export type RewardRedemptionStatus = "pending" | "approved" | "rejected" | "fulfilled";
export type RewardCatalogCategory = "toy" | "stationery" | "learning-tool";

export type RewardCatalogItem = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: RewardCatalogCategory;
  pointsCost: number;
  available: boolean;
  accent: string;
  thumbnailLabel: string;
};

export type RewardPointLedgerEntry = {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  reason: RewardPointReason;
  label: LocalizedText;
  note?: string;
  awardedBy?: string;
  awardedByName?: string;
  redemptionId?: string;
  sourceKey?: string;
  createdAt: string;
};

export type RewardRedemptionRequest = {
  id: string;
  studentId: string;
  studentName: string;
  item: RewardCatalogItem;
  pointsCost: number;
  status: RewardRedemptionStatus;
  requestedAt: string;
  decidedAt: string | null;
  fulfilledAt: string | null;
  decidedBy?: string;
  decidedByName?: string;
  teacherNote?: string;
};

export type RewardPointSummary = {
  balance: number;
  available: number;
  reserved: number;
  lifetimeEarned: number;
  spent: number;
  pendingRequests: number;
  approvedRequests: number;
};

export type RewardEarnRule = {
  id: string;
  label: LocalizedText;
  detail: LocalizedText;
  points: number;
};

export type StudentRewardsData = {
  summary: RewardPointSummary;
  earnRules: RewardEarnRule[];
  catalog: RewardCatalogItem[];
  ledger: RewardPointLedgerEntry[];
  redemptions: RewardRedemptionRequest[];
};

export type TeacherRewardStudentSummary = {
  studentId: string;
  studentName: string;
  grade: GradeId;
  classNames: string[];
  summary: RewardPointSummary;
};

export type TeacherRewardsData = {
  generatedAt: string;
  totals: {
    students: number;
    availablePoints: number;
    pendingRedemptions: number;
    approvedRedemptions: number;
    fulfilledRedemptions: number;
    pointsAwardedThisWeek: number;
  };
  reasonPresets: RewardEarnRule[];
  students: TeacherRewardStudentSummary[];
  catalog: RewardCatalogItem[];
  redemptions: RewardRedemptionRequest[];
  recentLedger: RewardPointLedgerEntry[];
};

export type TeacherClass = {
  id: string;
  teacherId: string;
  schoolId?: string;
  classCode?: string;
  name: string;
  grade: GradeId;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
  academicYear: string;
  description: LocalizedText;
  studentCount: number;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassAiTutorMode = "open" | "limited" | "fallback-only";

export type ClassAiTutorPolicy = {
  classId: string;
  mode: ClassAiTutorMode;
  previousLiveMode: Exclude<ClassAiTutorMode, "fallback-only"> | null;
  perStudentMinuteLimit: number;
  perStudentHourLimit: number;
  fallbackOnFailure: true;
  updatedBy: string;
  updatedAt: string;
};

export type ClassEnrollment = {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentGrade: GradeId;
  joinedAt: string;
};

export type Assignment = {
  id: string;
  classId: string;
  title: LocalizedText;
  description: LocalizedText;
  contentType: AssignmentContentType;
  targetId?: string;
  status: AssignmentStatus;
  dueAt: string | null;
  allowRetake: boolean;
  showAnswers: boolean;
  countTowardsGrade: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  completedCount: number;
};

export type AssignmentSubmissionAttemptKind = "initial" | "correction";
export type AssignmentSubmissionInputType = "text" | "image" | "handwriting" | "mixed";
export type AssignmentOcrProvider = "simpletex" | "mathpix" | "llm-vision" | "local" | "none";
export type AssignmentGradingRunStatus = "suggested" | "needs-review" | "failed";
export type AssignmentTeacherReviewAction = "score-only" | "accept" | "request-correction" | "resolve";

export type AssignmentOcrAlternative = {
  text: string;
  latex?: string;
  confidence?: number | null;
  provider: AssignmentOcrProvider;
};

export type AssignmentSubmissionOcrResult = {
  text: string;
  latex?: string;
  confidence: number | null;
  provider: AssignmentOcrProvider;
  accepted: boolean;
  alternatives: AssignmentOcrAlternative[];
  reason?: string;
};

export type AssignmentSubmissionAttempt = {
  id: string;
  submissionId: string;
  studentId: string;
  attemptNumber: number;
  kind: AssignmentSubmissionAttemptKind;
  inputType: AssignmentSubmissionInputType;
  answerText: string;
  imageDataUrl?: string;
  imageObjectKey?: string;
  imageUrl?: string;
  imageFileName?: string;
  ocrResult: AssignmentSubmissionOcrResult | null;
  submittedAt: string;
};

export type AssignmentGradingRun = {
  id: string;
  submissionId: string;
  attemptId: string | null;
  status: AssignmentGradingRunStatus;
  provider: AssignmentOcrProvider | "llm" | "manual";
  model: string;
  suggestedScore: number | null;
  confidence: number | null;
  feedback: LocalizedText | null;
  correctionRequest: LocalizedText | null;
  errorCode?: string;
  usage?: {
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
  };
  createdAt: string;
};

export type AssignmentTeacherReview = {
  id: string;
  submissionId: string;
  action: AssignmentTeacherReviewAction;
  finalScore: number | null;
  feedback: LocalizedText | null;
  correctionRequest: LocalizedText | null;
  correctionDueAt: string | null;
  reviewedBy: string;
  reviewerName: string;
  createdAt: string;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  score: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  feedback: LocalizedText | null;
  correctionRequest: LocalizedText | null;
  correctionDueAt: string | null;
  correctionRound: number;
  maxCorrectionRounds: number;
  resolvedAt: string | null;
  attempts: AssignmentSubmissionAttempt[];
  latestAttempt: AssignmentSubmissionAttempt | null;
  latestGradingRun: AssignmentGradingRun | null;
  latestTeacherReview: AssignmentTeacherReview | null;
  updatedAt: string;
};

export type TeacherMessage = {
  id: string;
  classId?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  guardianId?: string;
  guardianName?: string;
  assignmentId?: string;
  topicId?: string;
  reportId?: string;
  parentCategory?: ParentMessageCategory;
  subject: LocalizedText;
  latestMessage: string;
  status: TeacherMessageStatus;
  priority: TeacherMessagePriority;
  starred: boolean;
  lastMessageAt: string;
  createdAt: string;
};

export type TeacherMessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  url?: string;
};

export type TeacherMessageEntry = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: TeacherMessageSenderRole;
  senderName: string;
  recipientId: string;
  body: string;
  attachments: TeacherMessageAttachment[];
  createdAt: string;
};

export type TeachingResource = {
  id: string;
  title: LocalizedText;
  type: TeachingResourceType;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath?: string;
  grade: GradeId;
  topicId?: string;
  difficulty?: Difficulty;
  uploadedBy: string;
  createdAt: string;
  referenceCounts: {
    assignments: number;
    assessments: number;
    classroom: number;
  };
};

export type TeacherLessonKitSectionQuestion = {
  questionId?: string;
  prompt: LocalizedText;
  answer: string;
  explanation?: LocalizedText;
  difficulty?: Difficulty;
  source: "question-bank" | "ai-generated" | "manual";
  validationStatus: "validated" | "needs-review";
};

export type TeacherLessonKitSection = {
  id: string;
  kind: TeacherLessonKitSectionKind;
  title: LocalizedText;
  content: LocalizedText;
  items: LocalizedText[];
  questions?: TeacherLessonKitSectionQuestion[];
  estimatedMinutes?: number;
  teacherNotes?: LocalizedText;
  order: number;
};

export type TeacherLessonKit = {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  grade: GradeId;
  curriculumProfile: CurriculumProfile;
  publisher: TextbookPublisher;
  topicId: string;
  topicTitle: LocalizedText;
  lessonSlug?: string;
  lessonTitle: LocalizedText;
  chapterTitle: LocalizedText;
  lessonPeriod: number;
  lessonType: "new-lesson" | "review" | "practice" | "exam-prep";
  durationMinutes: number;
  status: TeacherLessonKitStatus;
  source: TeacherLessonKitSource;
  reviewStatus: TeacherLessonKitReviewStatus;
  generationNotes: LocalizedText;
  sections: TeacherLessonKitSection[];
  publishedResourceIds: string[];
  assignmentId?: string;
  assessmentId?: string;
  liveSessionId?: string;
  createdAt: string;
  updatedAt: string;
  generatedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
};

export type TeacherLessonKitListData = {
  generatedAt: string;
  classes: TeacherClass[];
  topicOptions: TeacherTopicOption[];
  kits: TeacherLessonKit[];
  totals: {
    kits: number;
    needsReview: number;
    published: number;
    mainlandTopics: number;
  };
};

export type TeacherLessonKitCreateData = {
  classes: TeacherClass[];
  topicOptions: TeacherTopicOption[];
};

export type TeacherLessonKitPublishResult = {
  resourceIds: string[];
  assignmentId?: string;
  assessmentId?: string;
  liveSessionId?: string;
};

export type TeacherReviewLessonStatus = "draft" | "generated" | "reviewed";
export type TeacherReviewLessonSource = "assessment" | "frequent-mistakes";
export type TeacherReviewLessonItemCategory = "must-teach" | "quick-review" | "individual-support";
export type TeacherReviewLessonMisconceptionTag =
  | "conceptual-understanding"
  | "calculation-symbol"
  | "reading-modeling"
  | "solution-steps"
  | "graph-table-reading"
  | "unit-format"
  | "strategy-choice";
export type TeacherReviewLessonQuestionValidationStatus = "validated" | "needs-teacher-review";

export type TeacherReviewLessonSourceSnapshot = {
  assessmentId: string;
  assessmentTitle: LocalizedText;
  assessmentUpdatedAt: string;
  classId: string;
  className: string;
  submittedCount: number;
  totalStudents: number;
  questionCount: number;
  generatedAt: string;
};

export type TeacherReviewLessonItem = {
  id: string;
  questionId: string;
  prompt: LocalizedText;
  correctAnswer?: string;
  explanation?: LocalizedText;
  sectionId?: string;
  sectionTitle?: LocalizedText;
  topicId?: string;
  topicTitle?: LocalizedText;
  maxPoints: number;
  correctRate: number | null;
  correctCount: number;
  totalResponses: number;
  wrongCount: number;
  wrongStudentIds: string[];
  wrongStudentNames: string[];
  commonWrongAnswer: string | null;
  commonWrongAnswerCount: number;
  category: TeacherReviewLessonItemCategory;
  categoryReason: LocalizedText;
  misconceptionTags: TeacherReviewLessonMisconceptionTag[];
  teachingScript: LocalizedText;
  teacherNotes: LocalizedText;
  order: number;
};

export type TeacherReviewLessonSlide = {
  id: string;
  title: LocalizedText;
  bullets: LocalizedText[];
  relatedItemIds: string[];
  speakerNotes: LocalizedText;
  order: number;
};

export type TeacherReviewLessonBoardColumn = {
  id: string;
  title: LocalizedText;
  blocks: LocalizedText[];
  order: number;
};

export type TeacherReviewLessonPracticeQuestion = {
  id: string;
  source: "question-bank" | "ai-generated" | "manual";
  prompt: LocalizedText;
  answer: string;
  explanation?: LocalizedText;
  topicId?: string;
  difficulty?: Difficulty;
  relatedItemId?: string;
  validationStatus: TeacherReviewLessonQuestionValidationStatus;
};

export type TeacherReviewLessonIndividualGroup = {
  id: string;
  label: LocalizedText;
  itemIds: string[];
  studentIds: string[];
  studentNames: string[];
  guidance: LocalizedText;
};

export type TeacherReviewLessonPlan = {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  assessmentId: string;
  title: LocalizedText;
  language: Language;
  durationMinutes: number;
  status: TeacherReviewLessonStatus;
  source: TeacherReviewLessonSource;
  sourceSnapshot: TeacherReviewLessonSourceSnapshot;
  sourceSnapshotStale: boolean;
  objectives: LocalizedText[];
  timeline: Array<{
    id: string;
    label: LocalizedText;
    minutes: number;
  }>;
  items: TeacherReviewLessonItem[];
  slides: TeacherReviewLessonSlide[];
  boardColumns: TeacherReviewLessonBoardColumn[];
  variationQuestions: TeacherReviewLessonPracticeQuestion[];
  remediationQuestions: TeacherReviewLessonPracticeQuestion[];
  individualGroups: TeacherReviewLessonIndividualGroup[];
  generationNotes: LocalizedText;
  createdAt: string;
  updatedAt: string;
  generatedAt: string;
  reviewedAt: string | null;
  remediationAssessmentId?: string;
};

export type TeacherReviewLessonDetailData = {
  reviewLesson: TeacherReviewLessonPlan;
  class: TeacherClass;
  assessment: Assessment;
  parentSafeDraft: ParentSafeTeacherDraft | null;
};

export type PilotTeacherReviewQueueItem = {
  reviewLessonId: string;
  assessmentId: string;
  classId: string;
  className: string;
  title: LocalizedText;
  status: TeacherReviewLessonStatus;
  generatedAt: string;
  reviewedAt: string | null;
  parentSafeDraft: ParentSafeTeacherDraft | null;
  guard: PilotPlatformGuard;
};

export type PilotPlatformLoopData = {
  mode: "p1-platform-loop";
  generatedAt: string;
  role: PilotPlatformRole;
  actorId: string;
  guard: PilotPlatformGuard;
  learnerState: PilotLearnerState | null;
  teacherReviewQueue: PilotTeacherReviewQueueItem[];
  parentSafeDrafts: ParentSafeTeacherDraft[];
  events: PilotPlatformEvent[];
};

export type AssessmentManualQuestion = {
  id: string;
  prompt: LocalizedText;
  answer: string;
  points: number;
};

export type AssessmentPaperItemSource = "question-bank" | "manual" | "ai-generated" | "mistake";

export type AssessmentEmbeddedQuestion = {
  type: QuestionType | "manual";
  prompt: LocalizedText;
  options?: LocalizedText[];
  answer: string;
  acceptedAnswers?: string[];
  explanation?: LocalizedText;
  topicId?: string;
  difficulty?: Difficulty;
  diagram?: QuestionDiagram;
};

export type AssessmentPaperItem = {
  id: string;
  source: AssessmentPaperItemSource;
  questionId?: string;
  embeddedQuestion?: AssessmentEmbeddedQuestion;
  points: number;
  order: number;
};

export type AssessmentPaperSection = {
  id: string;
  title: LocalizedText;
  instructions?: LocalizedText;
  order: number;
  items: AssessmentPaperItem[];
};

export type Assessment = {
  id: string;
  classId: string;
  title: LocalizedText;
  type: AssessmentType;
  status: AssessmentStatus;
  sourceType: AssessmentSourceType;
  sourceResourceId?: string;
  analysisSettings: AssessmentAnalysisSettings;
  examGroupId: string;
  examGroupName: LocalizedText;
  questionIds: string[];
  manualQuestions: AssessmentManualQuestion[];
  paperSections: AssessmentPaperSection[];
  opensAt: string | null;
  closesAt: string | null;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  randomizeQuestionOrder: boolean;
  showAnswersImmediately: boolean;
  gradeWeight: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  submittedCount: number;
};

export type AssessmentSubmissionAnswer = {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  maxPoints: number;
  teacherFeedback?: LocalizedText | null;
};

export type AssessmentSubmission = {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  status: AssessmentSubmissionStatus;
  attemptNumber: number;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  gradedAt: string | null;
  answers: AssessmentSubmissionAnswer[];
  updatedAt: string;
};

export type TeacherReport = {
  id: string;
  type: TeacherReportType;
  title: LocalizedText;
  classId?: string;
  studentId?: string;
  generatedBy: string;
  generatedAt: string;
  summary: LocalizedText;
  preview?: TeacherReportPreview;
};

export type StudentResourceDetailData = {
  resource: TeachingResource;
  assignment: StudentAssignmentItem | null;
  downloadUrl: string;
  canMarkComplete: boolean;
};

export type StudentAssessmentQuestion = {
  id: string;
  prompt: LocalizedText;
  type: QuestionType | "manual";
  options?: LocalizedText[];
  maxPoints: number;
  source?: AssessmentPaperItemSource;
  sectionId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  correctAnswer?: string;
  explanation?: LocalizedText;
  isAnswerVisible?: boolean;
};

export type StudentAssessmentQuestionSection = {
  id: string;
  title: LocalizedText;
  instructions?: LocalizedText;
  questions: StudentAssessmentQuestion[];
};

export type StudentAssessmentDetailData = {
  assessment: Assessment;
  className: string;
  questions: StudentAssessmentQuestion[];
  questionSections: StudentAssessmentQuestionSection[];
  submission: AssessmentSubmission;
  assignment: StudentAssignmentItem | null;
  canSubmit: boolean;
  unavailableReason?: LocalizedText;
};

export type StudentMessageThread = TeacherMessage & {
  className?: string;
  teacherName: string;
  messages: TeacherMessageEntry[];
};

export type StudentMessagesData = {
  threads: StudentMessageThread[];
  selectedThread: StudentMessageThread | null;
  classes: TeacherClass[];
  assignments: StudentAssignmentItem[];
};

export type GuardianLink = {
  id: string;
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  studentGrade: GradeId;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TeacherNoticeAudience = "parents" | "students" | "both";
export type TeacherNoticeStatus = "draft" | "queued" | "sent" | "failed";
export type TeacherNoticeRecipientStatus = "pending" | "acknowledged";
export type TeacherNoticeDeliveryStatus = "queued" | "sent" | "failed" | "disabled";

export type TeacherNoticeRecipient = {
  id: string;
  noticeId: string;
  studentId: string;
  studentName: string;
  guardianId?: string;
  guardianName?: string;
  status: TeacherNoticeRecipientStatus;
  acknowledgedBy?: string;
  acknowledgedAt: string | null;
  createdAt: string;
};

export type TeacherNoticeDeliveryAttempt = {
  id: string;
  noticeId: string;
  channelId: string;
  channelName: string;
  status: TeacherNoticeDeliveryStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptedAt: string;
};

export type TeacherNotice = {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  audience: TeacherNoticeAudience;
  channelId: string;
  channelName: string;
  subject: LocalizedText;
  body: LocalizedText;
  status: TeacherNoticeStatus;
  assignmentId?: string;
  source?: {
    kind: TeacherNoticeSourceKind;
    id?: string;
  };
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  recipients: TeacherNoticeRecipient[];
  deliveryAttempts: TeacherNoticeDeliveryAttempt[];
  acknowledgement: {
    total: number;
    acknowledged: number;
    pending: number;
  };
};

export type ParentSafeTeacherDraft = {
  id: string;
  noticeId: string;
  sourceReviewLessonId: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  title: LocalizedText;
  summary: LocalizedText;
  status: TeacherNoticeStatus;
  publishedAt: string | null;
  acknowledgement: TeacherNotice["acknowledgement"];
};

export type WeComChannelSummary = {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
};

export type TeacherReminderThreshold = "due-24h" | "overdue-0h" | "overdue-24h" | "overdue-72h" | "manual";

export type TeacherReminderPolicy = {
  enabled: boolean;
  thresholds: TeacherReminderThreshold[];
  quietHours: {
    start: string;
    end: string;
  };
};

export type TeacherReminderRun = {
  id: string;
  teacherId: string;
  classId: string;
  assignmentId: string;
  studentId: string;
  noticeId?: string;
  threshold: TeacherReminderThreshold;
  status: TeacherNoticeDeliveryStatus | "skipped";
  reason: string;
  createdAt: string;
};

export type TeacherMissingWorkItem = {
  assignmentId: string;
  assignmentTitle: LocalizedText;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  submissionId: string;
  submissionStatus: SubmissionStatus;
  dueAt: string | null;
  nextThreshold: TeacherReminderThreshold | null;
  lastReminderAt: string | null;
};

export type ClassRosterProfile = {
  enrollmentId: string;
  classId: string;
  studentId: string;
  studentName: string;
  grade: GradeId;
  studentNo?: string;
  seatLabel?: string;
  seatRow: number | null;
  seatColumn: number | null;
  displayOrder: number;
  guardianCount: number;
  guardianStatus: "linked" | "unlinked";
  updatedAt: string;
};

export type TeacherRosterImportRow = {
  rowIndex: number;
  studentNo: string;
  name: string;
  grade: GradeId | "";
  email?: string;
  username?: string;
  seatLabel?: string;
  seatRow: number | null;
  seatColumn: number | null;
  parentName?: string;
  parentEmail?: string;
  errors: string[];
  warnings: string[];
};

export type TeacherRosterImportValidation = {
  valid: boolean;
  rows: TeacherRosterImportRow[];
  totals: {
    rows: number;
    valid: number;
    errors: number;
    creates: number;
    updates: number;
  };
};

export type TeacherClassCollaboratorRole = "owner" | "co-teacher" | "viewer";

export type TeacherClassCollaborator = {
  id: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  teacherUsername: string;
  role: TeacherClassCollaboratorRole;
  status: "active" | "revoked";
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PrepTeamShareKind = "resource" | "assessment" | "lesson-kit" | "note";

export type PrepTeamShare = {
  id: string;
  prepTeamId: string;
  kind: PrepTeamShareKind;
  title: LocalizedText;
  targetId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
};

export type PrepTeam = {
  id: string;
  schoolId?: string;
  name: LocalizedText;
  description: LocalizedText;
  grade?: GradeId;
  teacherIds: string[];
  members: Array<{
    teacherId: string;
    teacherName: string;
  }>;
  shares: PrepTeamShare[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TermArchive = {
  id: string;
  classId: string;
  className: string;
  termLabel: string;
  createdBy: string;
  createdAt: string;
  snapshot: {
    studentCount: number;
    assignmentCount: number;
    submissionCount: number;
    reportCount: number;
    averageCompletionRate: number;
  };
  exportUrl: string;
};

export type ParentChildSummary = {
  student: StudentSession;
  classes: TeacherClass[];
  generatedAt: string;
  averageMastery: number;
  learningMinutes7d: number;
  latestActivityAt: string | null;
  weeklyActivity: WeeklyActivity[];
  strengths: Topic[];
  supportTopics: Topic[];
  assignments: StudentAssignmentItem[];
  rewardSummary: RewardPointSummary;
  motivationSummary: GamificationSummary | null;
  latestParentReport: TeacherReport | null;
  celebrate: LocalizedText[];
  support: LocalizedText[];
};

export type ParentFoundationData = {
  parent: StudentSession;
  children: ParentChildSummary[];
  selectedChild: ParentChildSummary | null;
  links: GuardianLink[];
  totals: {
    children: number;
    activeReports: number;
    openMessages: number;
    pendingAssignments: number;
  };
};

export type ParentReportData = {
  generatedAt: string;
  children: ParentChildSummary[];
  selectedChild: ParentChildSummary | null;
  reports: TeacherReport[];
};

export type ParentMessageThread = TeacherMessage & {
  className?: string;
  teacherName: string;
  messages: TeacherMessageEntry[];
};

export type ParentMessagesData = {
  generatedAt: string;
  children: ParentChildSummary[];
  selectedChild: ParentChildSummary | null;
  threads: ParentMessageThread[];
  selectedThread: ParentMessageThread | null;
  categories: Array<{
    id: ParentMessageCategory;
    label: LocalizedText;
  }>;
  reports: TeacherReport[];
};

export type ParentNoticeData = {
  generatedAt: string;
  children: ParentChildSummary[];
  notices: TeacherNotice[];
  parentSafeDrafts: ParentSafeTeacherDraft[];
};

export type TeacherFoundationData = {
  teacher: StudentSession;
  classes: TeacherClass[];
  totals: {
    classes: number;
    students: number;
    activeAssignments: number;
    unreadMessages: number;
    resources: number;
    assessments: number;
  };
  recentAssignments: Assignment[];
  inboxPreview: TeacherMessage[];
  resources: TeachingResource[];
  assessments: Assessment[];
};

export type TeacherOperationsData = {
  generatedAt: string;
  teacher: StudentSession;
  classes: TeacherClass[];
  selectedClassId: string | null;
  wecom: {
    enabled: boolean;
    channels: WeComChannelSummary[];
  };
  notices: TeacherNotice[];
  reminderPolicy: TeacherReminderPolicy;
  reminderRuns: TeacherReminderRun[];
  missingWork: TeacherMissingWorkItem[];
  roster: ClassRosterProfile[];
  collaborators: TeacherClassCollaborator[];
  prepTeams: PrepTeam[];
  termArchives: TermArchive[];
  totals: {
    notices: number;
    pendingAcknowledgements: number;
    missingWork: number;
    collaborators: number;
    archives: number;
  };
};

export type TeacherDashboardKpis = {
  pendingGrading: number;
  pendingCorrectionReview: number;
  correctionsRequired: number;
  unrepliedMessages: number;
  weeklyAssignmentCompletionRate: number;
  atRiskStudents: number;
};

export type TeacherDashboardRewardSummary = {
  pendingRedemptions: number;
  approvedRedemptions: number;
  pointsAwardedThisWeek: number;
  topStudentName: string | null;
  topStudentAvailablePoints: number;
};

export type TeacherClassDashboardSummary = {
  classId: string;
  className: string;
  grade: GradeId;
  studentCount: number;
  averageMastery: number;
  assignmentCompletionRate: number;
  activeAssignments: number;
  atRiskStudents: number;
  href: string;
};

export type TeacherMasteryHeatmapCell = {
  id: string;
  classId: string;
  className: string;
  grade: GradeId;
  topicId: string;
  topicTitle: LocalizedText;
  averageMastery: number;
  studentCount: number;
  weakStudentCount: number;
  href: string;
};

export type TeacherActionQueueItem = {
  id: string;
  type: TeacherActionQueueType;
  priority: TeacherActionQueuePriority;
  title: LocalizedText;
  description: LocalizedText;
  href: string;
  className?: string;
  studentName?: string;
  dueAt?: string | null;
  createdAt: string;
};

export type TeacherDashboardData = {
  generatedAt: string;
  teacher: StudentSession;
  kpis: TeacherDashboardKpis;
  rewardSummary: TeacherDashboardRewardSummary;
  classSummaries: TeacherClassDashboardSummary[];
  masteryHeatmap: TeacherMasteryHeatmapCell[];
  actionQueue: TeacherActionQueueItem[];
};

export type TeacherNavSignals = {
  pendingGrading: number;
  unrepliedMessages: number;
};

export type TeacherTopicOption = {
  id: string;
  grade: GradeId;
  title: LocalizedText;
  curriculumProfile?: CurriculumProfile;
  publisher?: TextbookPublisher;
};

export type TeacherResourceLibraryData = {
  generatedAt: string;
  resources: TeachingResource[];
  topicOptions: TeacherTopicOption[];
  totals: {
    resources: number;
    uploadedThisWeek: number;
    assignmentReferences: number;
    assessmentReferences: number;
  };
};

export type TeacherStudentRiskTag = "low-mastery" | "repeated-mistakes" | "inactive" | "high-ai-tutor" | "late-work";

export type TeacherAnalyticsTrendPoint = {
  date: string;
  activeStudents: number;
  answers: number;
  accuracy: number | null;
  hintRequests: number;
  aiTutorMessages: number;
  averageAnswerSeconds: number | null;
};

export type TeacherAnalyticsTopicCell = {
  id: string;
  classId: string;
  className: string;
  grade: GradeId;
  topicId: string;
  topicTitle: LocalizedText;
  averageMastery: number;
  studentCount: number;
  weakStudentCount: number;
  averageAnswerSeconds: number | null;
  hintRequests: number;
  aiTutorMessages: number;
  wrongAttempts: number;
  reteachRecommended: boolean;
  href: string;
};

export type TeacherAnalyticsStudentRisk = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  grade: GradeId;
  riskScore: number;
  averageMastery: number;
  assignmentCompletionRate: number;
  averageAnswerSeconds: number | null;
  latestActivityAt: string | null;
  hintRequests7d: number;
  aiTutorMessages7d: number;
  activeMistakes: number;
  tags: TeacherStudentRiskTag[];
  recommendedAction: TeacherInterventionAction;
  recommendation: LocalizedText;
  href: string;
};

export type TeacherAnalyticsFrequentMistake = {
  id: string;
  questionId: string;
  classId: string;
  className: string;
  topicId: string;
  topicTitle: LocalizedText;
  prompt: LocalizedText;
  wrongAttempts: number;
  studentCount: number;
  lastAttemptAt: string;
};

export type TeacherAnalyticsInterventionGroup = {
  id: string;
  classId: string;
  className: string;
  topicId?: string;
  title: LocalizedText;
  description: LocalizedText;
  action: TeacherInterventionAction;
  studentIds: string[];
  studentNames: string[];
  assignmentTitle: LocalizedText;
  assignmentDescription: LocalizedText;
  targetId?: string;
};

export type TeacherAnalyticsData = {
  generatedAt: string;
  selectedClassId: string | "all";
  classes: TeacherClass[];
  summary: {
    averageMastery: number;
    atRiskStudents: number;
    averageAnswerSeconds: number | null;
    hintRequests7d: number;
    aiTutorMessages7d: number;
    activeStudents7d: number;
    activeStudents30d: number;
  };
  topicMastery: TeacherAnalyticsTopicCell[];
  studentRisks: TeacherAnalyticsStudentRisk[];
  frequentMistakes: TeacherAnalyticsFrequentMistake[];
  activityTrend7d: TeacherAnalyticsTrendPoint[];
  activityTrend30d: TeacherAnalyticsTrendPoint[];
  interventionGroups: TeacherAnalyticsInterventionGroup[];
};

export type TeacherClassStudentSummary = {
  studentId: string;
  studentName: string;
  grade: GradeId;
  recentActivityAt: string | null;
  averageMastery: number;
  assignmentCompletionRate: number;
  riskTags: TeacherStudentRiskTag[];
  href: string;
};

export type TeacherClassDetailData = {
  class: TeacherClass;
  students: TeacherClassStudentSummary[];
  assignments: Assignment[];
};

export type TeacherStudentMasteryTarget = {
  topicId: string;
  mastery: number;
  note: string;
  updatedAt: string;
  teacherName: string;
};

// Per-student accommodations (IEP / Section 504). These attach to the student and
// follow them across every class and into the learning experience — a legal
// expectation under IDEA/504 and a daily need for mixed-needs classrooms. Any
// teacher who owns or co-teaches a class the student is enrolled in can view and
// update the profile; admins can see all. See lib/accommodations.ts for the pure
// helpers (defaults, normalization, extended-time multiplier, labels).
export type AccommodationExtendedTime = "none" | "extra-half" | "double" | "unlimited";
export type AccommodationCalculatorPolicy = "default" | "allowed" | "not-allowed";

export type StudentAccommodations = {
  // Extended time on timed work. "none" = standard time; "extra-half" = 1.5x;
  // "double" = 2x; "unlimited" = no time pressure.
  extendedTime: AccommodationExtendedTime;
  // Text-to-speech read-aloud support is offered in the learning experience.
  readAloud: boolean;
  // Cap on the number of multiple-choice options shown. 0 = show all options;
  // otherwise the count (>= 2) the student sees, always keeping the correct one.
  maxAnswerChoices: number;
  // Whether a calculator is permitted for this student.
  calculatorPolicy: AccommodationCalculatorPolicy;
  // Free-text note for the accommodation (e.g. the plan reference or context).
  notes: string;
};

export type StudentAccommodationsProfile = StudentAccommodations & {
  studentId: string;
  studentName: string;
  // True once any non-default accommodation is set — i.e. the student has an
  // active accommodations plan on record.
  hasPlan: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type StudentAccommodationsProfileResult =
  | { status: "ok"; profile: StudentAccommodationsProfile }
  | { status: "forbidden" }
  | { status: "student-not-found" };

export type TeacherStudentProfileData = {
  student: StudentSession;
  classes: TeacherClass[];
  parentInviteCode: string;
  guardianLinks: GuardianLink[];
  averageMastery: number;
  recentActivityAt: string | null;
  progress: Array<{
    topicId: string;
    title: LocalizedText;
    grade: GradeId;
    mastery: number;
    status: TopicStatus;
    updatedAt: string | null;
    teacherMasteryTarget: TeacherStudentMasteryTarget | null;
  }>;
  mistakes: MistakeBookItem[];
  recentAttempts: Array<{
    id: string;
    questionId: string;
    topic: LocalizedText;
    selectedAnswer: string;
    isCorrect: boolean;
    durationSeconds: number | null;
    createdAt: string;
  }>;
  assignments: Array<{
    assignment: Assignment;
    submission: Submission | null;
  }>;
  messages: TeacherMessage[];
  aiTutor: {
    messageCount7d: number;
    lastMessageAt: string | null;
    recentMessages: Array<{
      id: string;
      role: "student" | "tutor";
      content: string;
      createdAt: string;
    }>;
  };
};

export type TeacherAssignmentDetailData = {
  assignment: Assignment;
  class: TeacherClass;
  submissions: Submission[];
  completionRate: number;
  gradingSummary: {
    pendingGrading: number;
    correctionRequired: number;
    correctionSubmitted: number;
    resolved: number;
  };
};

export type StudentAssignmentItem = {
  assignment: Assignment;
  submission: Submission;
  className: string;
  classGrade: GradeId;
};

export type TeacherInboxThread = TeacherMessage & {
  className?: string;
  studentGrade: GradeId;
  messages: TeacherMessageEntry[];
  parentContext?: {
    guardianId: string;
    guardianName: string;
    category: ParentMessageCategory;
    reportId?: string;
  };
  studentContext: {
    averageMastery: number;
    activeMistakes: MistakeBookItem[];
    currentAssignments: StudentAssignmentItem[];
  };
};

export type TeacherInboxData = {
  threads: TeacherInboxThread[];
  selectedThread: TeacherInboxThread | null;
};

export type TeacherAssessmentQuestionOption = {
  id: string;
  grade: GradeId;
  topicId: string;
  topicTitle: LocalizedText;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: LocalizedText;
  source?: AssessmentPaperItemSource;
  usageCount?: number;
};

export type TeacherAssessmentCreateData = {
  classes: TeacherClass[];
  resources: TeachingResource[];
  topicOptions: {
    id: string;
    grade: GradeId;
    title: LocalizedText;
  }[];
  questionBank: TeacherAssessmentQuestionOption[];
};

export type TeacherAssessmentListData = {
  generatedAt: string;
  classes: TeacherClass[];
  assessments: Assessment[];
  totals: {
    assessments: number;
    openAssessments: number;
    submittedCount: number;
    averageScore: number | null;
  };
};

export type TeacherAssessmentScoreBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
};

export type TeacherAssessmentQuestionAnalytics = {
  questionId: string;
  prompt: LocalizedText;
  correctAnswer?: string;
  explanation?: LocalizedText;
  sectionId?: string;
  sectionTitle?: LocalizedText;
  topicId?: string;
  topicTitle?: LocalizedText;
  questionType?: QuestionType | "manual";
  maxPoints: number;
  averagePoints: number | null;
  scoreRate: number | null;
  difficultyIndex: number | null;
  discriminationIndex: number | null;
  correctRate: number | null;
  correctCount: number;
  totalResponses: number;
  commonWrongAnswer: string | null;
};

export type TeacherAssessmentSummaryAnalysis = {
  submittedCount: number;
  totalStudents: number;
  highestScore: number | null;
  lowestScore: number | null;
  averageScore: number | null;
  standardDeviation: number | null;
  passRate: number | null;
  excellentRate: number | null;
  lowScoreRate: number | null;
};

export type TeacherAssessmentRankingEntry = {
  rank: number | null;
  studentId: string;
  studentName: string;
  status: AssessmentSubmissionStatus;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  submittedAt: string | null;
  borderlineTypes: AssessmentAnalysisBorderlineType[];
};

export type TeacherAssessmentKnowledgeMastery = {
  topicId: string;
  topicTitle: LocalizedText;
  earnedPoints: number;
  maxPoints: number;
  masteryRate: number | null;
  questionCount: number;
};

export type TeacherAssessmentBorderlineStudent = {
  studentId: string;
  studentName: string;
  type: AssessmentAnalysisBorderlineType;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  threshold: number;
  gap: number;
};

export type TeacherAssessmentGradeComparisonClass = {
  classId: string;
  className: string;
  assessmentId: string;
  averageScore: number | null;
  submittedCount: number;
  studentCount: number;
};

export type TeacherAssessmentGradeComparison = {
  available: boolean;
  scopeLabel: LocalizedText;
  assessmentCount: number;
  classCount: number;
  submittedCount: number;
  gradeAverageScore: number | null;
  currentClassAverageScore: number | null;
  currentClassRank: number | null;
  classes: TeacherAssessmentGradeComparisonClass[];
  message: LocalizedText;
};

export type TeacherAssessmentAnalysis = {
  settings: AssessmentAnalysisSettings;
  summary: TeacherAssessmentSummaryAnalysis;
  scoreBands: TeacherAssessmentScoreBucket[];
  rankings: TeacherAssessmentRankingEntry[];
  itemAnalysis: TeacherAssessmentQuestionAnalytics[];
  knowledgeMastery: TeacherAssessmentKnowledgeMastery[];
  gradeComparison: TeacherAssessmentGradeComparison;
  borderlineStudents: TeacherAssessmentBorderlineStudent[];
};

export type TeacherAssessmentDetailData = {
  assessment: Assessment;
  class: TeacherClass;
  sourceResource: TeachingResource | null;
  submissions: AssessmentSubmission[];
  averageScore: number | null;
  submittedCount: number;
  scoreDistribution: TeacherAssessmentScoreBucket[];
  questionAnalytics: TeacherAssessmentQuestionAnalytics[];
  commonWrongQuestions: TeacherAssessmentQuestionAnalytics[];
  analysis: TeacherAssessmentAnalysis;
};

export type TeacherLiveSessionStatus = "active" | "ended";
export type TeacherLivePromptType = "poll" | "exit-ticket";
export type TeacherLiveToolType =
  | "attendance"
  | "random-call"
  | "buzzer"
  | "timer"
  | "teams"
  | "projector"
  | "screen-sync"
  | "whiteboard"
  | "math-workbench";

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type TeacherLiveAttendanceEntry = {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  checkedInAt: string | null;
  updatedAt: string;
};

export type TeacherLiveRandomCallState = {
  currentStudentId: string | null;
  currentStudentName: string | null;
  selectedStudentIds: string[];
  allowRepeats: boolean;
  updatedAt: string | null;
};

export type TeacherLiveBuzzerEntry = {
  studentId: string;
  studentName: string;
  submittedAt: string;
  rank: number;
};

export type BuzzerRound = {
  id: string;
  status: "idle" | "open" | "closed";
  openedAt: string | null;
  closedAt: string | null;
  entries: TeacherLiveBuzzerEntry[];
};

export type TimerState = {
  mode: "countdown" | "stopwatch";
  status: "idle" | "running" | "paused" | "ended";
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  updatedAt: string | null;
};

export type TeamScoreState = {
  teams: Array<{
    id: string;
    name: LocalizedText;
    studentIds: string[];
    score: number;
  }>;
  updatedAt: string | null;
};

export type TeacherLiveProjectionState = {
  mode: "answers" | "work-samples";
  showNames: boolean;
  selectedWorkSampleId: string | null;
  updatedAt: string | null;
};

export type TeacherLiveScreenSyncState = {
  target: "classroom" | "prompt" | "visualization" | "whiteboard" | "math-workbench";
  title: LocalizedText;
  href: string;
  locked: boolean;
  updatedAt: string | null;
};

export type WhiteboardStroke = {
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
  createdAt: string;
};

export type MathWorkbenchState = {
  tool: "function-graph" | "coordinate-plane" | "geometry" | "compass-straightedge";
  topicId: string | null;
  title: LocalizedText;
  parameters: Record<string, number | string | boolean>;
  locked: boolean;
  updatedAt: string | null;
};

export type TeacherLiveEvent = {
  id: string;
  type: TeacherLiveToolType | "session";
  label: LocalizedText;
  studentId?: string;
  studentName?: string;
  createdAt: string;
};

export type TeacherLiveCommand = {
  id: string;
  sessionId: string;
  type: TeacherLiveToolType;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type TeacherLiveToolState = {
  activeTool: TeacherLiveToolType;
  attendance: TeacherLiveAttendanceEntry[];
  randomCall: TeacherLiveRandomCallState;
  buzzer: BuzzerRound;
  timer: TimerState;
  teams: TeamScoreState;
  projection: TeacherLiveProjectionState;
  screenSync: TeacherLiveScreenSyncState;
  whiteboard: {
    strokes: WhiteboardStroke[];
    updatedAt: string | null;
  };
  mathWorkbench: MathWorkbenchState;
  events: TeacherLiveEvent[];
};

export type ClassroomLiveActionType = "attendance-check-in" | "buzzer-submit" | "screen-ack" | "work-sample-submit";

export type TeacherLivePromptOption = {
  id: string;
  label: LocalizedText;
};

export type TeacherLivePrompt = {
  id: string;
  type: TeacherLivePromptType;
  question: LocalizedText;
  options: TeacherLivePromptOption[];
  correctOptionId?: string;
};

export type TeacherLiveResponseSummary = {
  promptId: string;
  totalSubmissions: number;
  correctCount: number;
  accuracy: number | null;
  submittedStudentIds: string[];
  submissions: Array<{
    studentId: string;
    studentName: string;
    answer: string;
    isCorrect: boolean | null;
    submittedAt: string;
  }>;
  commonAnswers: Array<{
    answer: string;
    count: number;
    isCorrect: boolean | null;
  }>;
  needsReteach: boolean;
};

export type ClassroomWorkSample = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  imageDataUrl: string;
  imageObjectKey?: string;
  imageUrl?: string;
  caption: string;
  status: ClassroomWorkSampleStatus;
  createdAt: string;
  selectedAt: string | null;
};

export type TeacherLiveSession = {
  id: string;
  classId: string;
  className: string;
  grade: GradeId;
  status: TeacherLiveSessionStatus;
  title: LocalizedText;
  lessonTitle: LocalizedText;
  lessonSlug?: string;
  topicId?: string;
  topicTitle?: LocalizedText;
  visualizationTitle: LocalizedText;
  joinCode: string;
  startedAt: string;
  endedAt: string | null;
  currentPrompt: TeacherLivePrompt;
  studentCount: number;
  responseSummary: TeacherLiveResponseSummary;
  lessonKitId?: string;
  slideSections?: TeacherLessonKitSection[];
  workSamples: ClassroomWorkSample[];
  toolState: TeacherLiveToolState;
};

export type TeacherLiveData = {
  generatedAt: string;
  classes: TeacherClass[];
  activeSession: TeacherLiveSession | null;
  recentSessions: TeacherLiveSession[];
};

export type ClassroomLiveSession = {
  id: string;
  className: string;
  status: TeacherLiveSessionStatus;
  title: LocalizedText;
  lessonTitle: LocalizedText;
  joinCode: string;
  currentPrompt: TeacherLivePrompt;
  viewerStudentId?: string;
  attendanceStatus?: AttendanceStatus;
  viewerMode: "student" | "teacher-preview";
  canSubmit: boolean;
  submitted: boolean;
  submittedAnswer: string | null;
  workSamples: ClassroomWorkSample[];
  toolState: TeacherLiveToolState;
};

export type TeacherReportLanguage = "en" | "zh" | "zh-Hans";

export type TeacherReportTarget = {
  id: string;
  label: LocalizedText;
  type: "student" | "class" | "assignment" | "assessment";
  classId?: string;
  studentId?: string;
  assignmentId?: string;
  assessmentId?: string;
};

export type TeacherReportPreview = {
  id: string;
  type: TeacherReportType;
  language: TeacherReportLanguage;
  title: string;
  subtitle: string;
  generatedAt: string;
  subjectName: string;
  className?: string;
  metrics: {
    learningMinutes: number;
    masteryChange: number;
    averageMastery: number;
    accuracy: number | null;
    completionRate: number | null;
  };
  strengths: string[];
  weaknesses: string[];
  mistakeTypes: string[];
  suggestedPractice: string[];
  teacherRemarks: string;
};

export type TeacherReportsData = {
  generatedAt: string;
  classes: TeacherClass[];
  students: TeacherReportTarget[];
  assignments: TeacherReportTarget[];
  assessments: TeacherReportTarget[];
  reportHistory: TeacherReport[];
  defaultPreview: TeacherReportPreview | null;
};
