import type {
  GradeId,
  UnitedStatesMathSafeCard,
  UnitedStatesMathState,
  UnitedStatesMathStateProfile,
  UnitedStatesMathSourceRegistryEntry,
  UnitedStatesMathTrack
} from "@/types";

const reviewedAt = "2026-05-23";

type UnitedStatesMathStateCode = Exclude<UnitedStatesMathState, "US">;
type SourceRegistrySeed = Omit<
  UnitedStatesMathSourceRegistryEntry,
  "allowedUse" | "verbatimLimit" | "attributionText" | "lastCheckedAt" | "reviewedAt"
> &
  Partial<Pick<UnitedStatesMathSourceRegistryEntry, "allowedUse" | "verbatimLimit" | "attributionText" | "lastCheckedAt" | "reviewedAt">>;

function defaultAllowedUse(seed: SourceRegistrySeed) {
  if (!seed.safeCardAllowed) return "Blocked from MAIS generation and retrieval unless a separate written license is documented.";
  if (seed.repositoryRetention === "metadata-only") return "Metadata and policy notes only; no protected body text.";
  if (seed.repositoryRetention === "local-private-analysis-only") return "Local/private human review only; committed repository keeps metadata and MAIS-authored abstraction.";
  if (seed.repositoryRetention === "oer-attribution-required") return "Attribution-required OER lane only after product attribution and provenance display are implemented.";
  return "Standards-safe abstraction only: identifiers, grade/domain structure, topic tags, and MAIS-authored summaries.";
}

function makeSourceEntry(seed: SourceRegistrySeed): UnitedStatesMathSourceRegistryEntry {
  return {
    ...seed,
    allowedUse: seed.allowedUse ?? defaultAllowedUse(seed),
    verbatimLimit: seed.verbatimLimit ?? "0 committed source-body words; short attributed excerpts require legal/product review.",
    attributionText: seed.attributionText ?? `${seed.owner}: ${seed.title}`,
    lastCheckedAt: seed.lastCheckedAt ?? reviewedAt,
    reviewedAt: seed.reviewedAt ?? reviewedAt
  };
}

const originalityGuards = [
  "Use this card only as abstract standards-alignment and item-design guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify source wording, released items, textbook examples, figures, tables, rubrics, or solution language.",
  "Generate new MAIS-authored contexts, values, diagrams, prompts, hints, explanations, distractors, and teacher notes."
];

const unitedStatesMathSourceRegistrySeeds: SourceRegistrySeed[] = [
  {
    id: "cde-ca-ccss-math-resources",
    state: "CA",
    title: "California Department of Education mathematics resources for California Common Core State Standards",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "California Department of Education",
    url: "https://www.cde.ca.gov/re/cc/mathresources.asp",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use standard identifiers, grade/domain structure, and MAIS-authored labels only.",
      "Do not store full standard text, publication body text, examples, figures, or tables."
    ],
    reviewedAt
  },
  {
    id: "cde-2023-math-framework",
    state: "CA",
    title: "California Mathematics Framework adopted in 2023",
    sourceKind: "framework",
    libraryLane: "public-standards",
    owner: "California Department of Education",
    url: "https://www.cde.ca.gov/ci/pl/mathematics.asp",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only broad pedagogical signals such as coherence, reasoning, data literacy, and access.",
      "Do not store chapter text, examples, classroom vignettes, diagrams, or framework wording."
    ],
    reviewedAt
  },
  {
    id: "cde-copyright-statement",
    state: "CA",
    title: "California Department of Education copyright statement",
    sourceKind: "copyright-guidance",
    libraryLane: "public-standards",
    owner: "California Department of Education",
    url: "https://www.cde.ca.gov/re/di/cr/",
    licenseStatus: "permission-required",
    commercialUse: "permission-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Treat CDE publication expression as permission-required for reproduction.",
      "Keep only compliance metadata and owner-reviewed safe-card abstractions."
    ],
    reviewedAt
  },
  {
    id: "caaspp-smarter-balanced-public-assessment-resources",
    state: "CA",
    title: "CAASPP and Smarter Balanced public assessment resources",
    sourceKind: "assessment-blueprint",
    libraryLane: "public-standards",
    owner: "California Assessment of Student Performance and Progress / Smarter Balanced",
    url: "https://www.caaspp.org/",
    licenseStatus: "permission-required",
    commercialUse: "permission-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only abstract assessment mode signals such as selected response, constructed response, modeling, and technology-enhanced interaction.",
      "Never store or upload released/practice item stems, options, scoring language, images, tables, or screenshots."
    ],
    reviewedAt
  },
  {
    id: "cde-math-instructional-materials-adoption",
    state: "CA",
    title: "California mathematics instructional materials adoption information",
    sourceKind: "textbook-adoption-list",
    libraryLane: "licensed-private-library",
    owner: "California Department of Education",
    url: "https://www.cde.ca.gov/ci/ma/im/",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use adoption records only as market-compatibility metadata.",
      "Do not ingest commercial textbook body text, examples, exercises, images, teacher notes, or assessment banks without written authorization."
    ],
    reviewedAt
  },
  {
    id: "common-core-state-standards-public-license",
    state: "US",
    title: "Common Core State Standards public license",
    sourceKind: "copyright-guidance",
    libraryLane: "public-standards",
    owner: "National Governors Association Center for Best Practices and Council of Chief State School Officers",
    url: "https://www.thecorestandards.org/public-license/",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "review-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    allowedUse: "Record license conditions, attribution obligations, and CCSS identifier metadata only; legal review required before any committed standards wording.",
    verbatimLimit: "0 committed CCSS body words in RAG cards; use identifiers and MAIS-authored labels only.",
    attributionText: "Common Core State Standards (CCSS) public license, NGA Center/CCSSO.",
    notes: [
      "CCSS is publicly licensed with conditions and attribution requirements.",
      "The MAIS committed layer stores only standard IDs, mappings, and original abstraction."
    ],
    reviewedAt
  },
  {
    id: "us-copyright-office-ideas-facts-methods",
    state: "US",
    title: "U.S. Copyright Office guidance on ideas, facts, systems, and methods",
    sourceKind: "copyright-guidance",
    libraryLane: "public-standards",
    owner: "U.S. Copyright Office",
    url: "https://www.copyright.gov/help/faq/faq-protect.html",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "review-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    allowedUse: "Compliance metadata and product-policy guidance only; not a substitute for counsel review.",
    verbatimLimit: "0 committed source-body words in RAG cards.",
    attributionText: "U.S. Copyright Office copyright FAQ.",
    notes: [
      "Use as a policy reminder that standards concepts, facts, and methods differ from protected expression.",
      "Commercial rollout still requires U.S. IP counsel review."
    ],
    reviewedAt
  },
  {
    id: "tea-curriculum-standards",
    state: "TX",
    title: "Texas Education Agency curriculum standards portal",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Texas Education Agency",
    url: "https://tea.texas.gov/academics/curriculum-standards",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Texas uses state-specific TEKS rather than Common Core.",
      "Store TEKS identifiers, grade/course structure, and MAIS-authored crosswalk abstractions only."
    ],
    reviewedAt
  },
  {
    id: "tea-teks-mathematics",
    state: "TX",
    title: "Texas Essential Knowledge and Skills for mathematics",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Texas Education Agency",
    url: "https://tea.texas.gov/academics/curriculum-standards/teks/texas-essential-knowledge-and-skills",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use TEKS code references and broad skill-family abstraction only.",
      "Do not copy rule text, examples, or agency explanatory language into committed RAG cards."
    ],
    reviewedAt
  },
  {
    id: "tea-imra-math-adoption",
    state: "TX",
    title: "Texas Instructional Materials Review and Approval mathematics adoption information",
    sourceKind: "textbook-adoption-list",
    libraryLane: "licensed-private-library",
    owner: "Texas Education Agency",
    url: "https://tea.texas.gov/academics/instructional-materials/review-and-adoption-process/imra-multi-year-plan",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use approved/adopted material names and public status as market metadata only.",
      "Do not ingest publisher instructional-material text, media, assessment banks, or teacher editions."
    ],
    reviewedAt
  },
  {
    id: "tea-staar-math-assessments",
    state: "TX",
    title: "Texas STAAR mathematics assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Texas Education Agency",
    url: "https://tea.texas.gov/student-assessment/testing/staar",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only non-expressive assessment design metadata such as broad reporting categories and item-mode families.",
      "Do not store released STAAR item wording, answer choices, scoring materials, images, or tables."
    ],
    reviewedAt
  },
  {
    id: "fldoe-best-mathematics",
    state: "FL",
    title: "Florida B.E.S.T. Standards for Mathematics",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Florida Department of Education",
    url: "https://www.fldoe.org/academics/standards/subject-areas/math-science/mathematics/",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Florida replaced Common Core with B.E.S.T.; treat as an independent state standards corpus.",
      "Store benchmarks, grade/course structure, and MAIS-authored abstractions only."
    ],
    reviewedAt
  },
  {
    id: "fldoe-instructional-materials-adoption",
    state: "FL",
    title: "Florida instructional materials adoption information",
    sourceKind: "textbook-adoption-list",
    libraryLane: "licensed-private-library",
    owner: "Florida Department of Education",
    url: "https://www.fldoe.org/academics/standards/instructional-materials/index.stml",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use state adoption cycle and approved-material metadata only.",
      "Publisher content stays out of the committed RAG unless separately licensed."
    ],
    reviewedAt
  },
  {
    id: "fldoe-fast-math-assessments",
    state: "FL",
    title: "Florida statewide mathematics assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Florida Department of Education",
    url: "https://www.fldoe.org/accountability/assessments/k-12-student-assessment/",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only assessment-family and blueprint abstraction for FAST/EOC-style readiness.",
      "Do not store sample/released item text, answer keys, graphics, rubrics, or screenshots."
    ],
    reviewedAt
  },
  {
    id: "nysed-next-generation-math-standards",
    state: "NY",
    title: "New York State Next Generation Mathematics Learning Standards",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "New York State Education Department",
    url: "https://www.nysed.gov/standards-instruction/mathematics",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use Next Generation identifiers and broad grade/domain structure only.",
      "Preserve a Common Core-to-Next Generation crosswalk as MAIS-authored metadata."
    ],
    reviewedAt
  },
  {
    id: "nysed-math-guidance-resources",
    state: "NY",
    title: "NYSED mathematics guidance resources",
    sourceKind: "framework",
    libraryLane: "public-standards",
    owner: "New York State Education Department",
    url: "https://www.nysed.gov/standards-instruction/mathematics-guidance-resources",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use broad implementation and transition signals only.",
      "Do not copy guidance text, examples, tables, or classroom activities."
    ],
    reviewedAt
  },
  {
    id: "nysed-grade-3-8-math-assessments",
    state: "NY",
    title: "New York State Grade 3-8 mathematics assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "New York State Education Department",
    url: "https://www.nysed.gov/state-assessment/grades-3-8-ela-and-mathematics-tests",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only assessment program and reporting-category abstraction.",
      "Do not store released questions, scoring guides, tables, images, or answer keys."
    ],
    reviewedAt
  },
  {
    id: "pde-mathematics-pa-core",
    state: "PA",
    title: "Pennsylvania mathematics curriculum and PA Core information",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Pennsylvania Department of Education",
    url: "https://www.pa.gov/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/curriculum/mathematics",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Pennsylvania positions PA Core as mirroring Common Core content and rigor.",
      "Store PA Core identifiers, eligible-content signals, and MAIS-authored crosswalk notes only."
    ],
    reviewedAt
  },
  {
    id: "pdesas-standards-aligned-system",
    state: "PA",
    title: "Pennsylvania Standards Aligned System",
    sourceKind: "framework",
    libraryLane: "public-standards",
    owner: "Pennsylvania Department of Education",
    url: "https://www.pdesas.org/Standard/Views",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use standard lookup metadata and abstract alignment only.",
      "Do not store SAS lesson/activity text or proprietary-linked resources."
    ],
    reviewedAt
  },
  {
    id: "pde-state-assessments-math",
    state: "PA",
    title: "Pennsylvania state assessment and accountability information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Pennsylvania Department of Education",
    url: "https://www.pa.gov/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/assessment-and-accountability",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use assessment-family and eligible-content abstraction only.",
      "Do not ingest PSSA/Keystone item text, answer keys, or scoring language."
    ],
    reviewedAt
  },
  {
    id: "isbe-learning-standards-math",
    state: "IL",
    title: "Illinois Learning Standards for Mathematics",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Illinois State Board of Education",
    url: "https://www.isbe.net/Pages/Learning-Standards.aspx",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Illinois adopted Common Core in 2010 and implemented the standards in 2013-14.",
      "Store standards-family identifiers and MAIS-authored labels only."
    ],
    reviewedAt
  },
  {
    id: "isbe-assessments",
    state: "IL",
    title: "Illinois statewide assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Illinois State Board of Education",
    url: "https://www.isbe.net/Pages/Assessment.aspx",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use assessment-program metadata and broad item-mode abstraction only.",
      "Do not store test item text, visuals, rubrics, or scoring guides."
    ],
    reviewedAt
  },
  {
    id: "ode-learning-standards-math",
    state: "OH",
    title: "Ohio's Learning Standards for Mathematics",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Ohio Department of Education and Workforce",
    url: "https://education.ohio.gov/Topics/Learning-in-Ohio/OLS-Graphic-Sections/Learning-Standards",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use Ohio standard identifiers and grade/course structure only.",
      "Treat official wording, examples, appendices, and model-curriculum text as protected expression until reviewed."
    ],
    reviewedAt
  },
  {
    id: "ode-hqim-math-rubric",
    state: "OH",
    title: "Ohio mathematics high-quality instructional materials rubric",
    sourceKind: "framework",
    libraryLane: "public-standards",
    owner: "Ohio Department of Education and Workforce",
    url: "https://education.ohio.gov/getattachment/Topics/Learning-in-Ohio/OLS-Graphic-Sections/Resources/High-Quality-Instructional-Material/HQIM-Rubrics/Mathematics_HQIM-Rubric.pdf.aspx?lang=en-US",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use as a quality-evaluation policy signal, not as raw rubric text.",
      "Store only criteria-family labels and MAIS-authored review metadata."
    ],
    reviewedAt
  },
  {
    id: "ode-state-tests-math",
    state: "OH",
    title: "Ohio state testing information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Ohio Department of Education and Workforce",
    url: "https://education.ohio.gov/Topics/Testing",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use testing-program metadata and broad reporting-category abstraction only.",
      "Do not store released item text, answer keys, rubrics, graphics, or scoring guides."
    ],
    reviewedAt
  },
  {
    id: "gadoe-k12-math-standards",
    state: "GA",
    title: "Georgia K-12 Mathematics Standards",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Georgia Department of Education",
    url: "https://www.georgiastandards.org/Georgia-Standards/pages/math.aspx",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Georgia uses the 2021 K-12 Mathematics Standards, implemented in 2023-24.",
      "Store standard codes, grade/course structure, CASE-style metadata, and MAIS-authored crosswalk notes only."
    ],
    reviewedAt
  },
  {
    id: "gadoe-georgia-milestones",
    state: "GA",
    title: "Georgia Milestones assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Georgia Department of Education",
    url: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Assessment/Pages/default.aspx",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only assessment program metadata, reporting-category abstraction, and item-mode families.",
      "Do not store Georgia Milestones item wording, answer keys, passages, graphics, or scoring language."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-k12-math-standard-course-of-study",
    state: "NC",
    title: "North Carolina K-12 mathematics Standard Course of Study",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/districts-schools/classroom-resources/office-teaching-and-learning/standard-course-study",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use standard identifiers, grade/domain structure, and MAIS-authored labels only.",
      "Do not store full standard text, unpacking text, examples, figures, or tables."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-math-supporting-resources",
    state: "NC",
    title: "North Carolina mathematics standards supporting resources",
    sourceKind: "framework",
    libraryLane: "public-standards",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/districts-schools/classroom-resources/office-teaching-and-learning/standard-course-study/mathematics/standard-course-study-supporting-resources",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only abstract instructional support categories, not resource wording.",
      "Keep local review notes at the concept, competency, and misconception-tag level."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-eog-released-forms",
    state: "NC",
    title: "North Carolina EOG released forms and sample items",
    sourceKind: "released-assessment",
    libraryLane: "public-standards",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/accountability/testing/eog",
    licenseStatus: "local-analysis-only",
    commercialUse: "permission-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only local human abstraction of topic distribution, skill demand, and difficulty patterns.",
      "Do not upload released items to third-party applications or retain stems, options, diagrams, answer keys, or scoring language."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-eoc-released-forms",
    state: "NC",
    title: "North Carolina EOC released forms and sample items",
    sourceKind: "released-assessment",
    libraryLane: "public-standards",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/accountability/testing/eoc",
    licenseStatus: "local-analysis-only",
    commercialUse: "permission-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only local human abstraction for Math 1, Math 3, and related high-school assessment patterns.",
      "Do not retain item text, choices, figures, answer keys, or explanations."
    ],
    reviewedAt
  },
  {
    id: "caaspp-math-blueprints-and-specifications",
    state: "CA",
    title: "California assessment blueprints and mathematics test specifications",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "California Assessment of Student Performance and Progress / Smarter Balanced",
    url: "https://www.caaspp.org/",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only non-expressive blueprint metadata such as claim families, broad item modes, and grade coverage.",
      "Do not retain performance-task text, scoring language, item examples, figures, or response rubrics."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-eog-eoc-test-specifications",
    state: "NC",
    title: "North Carolina mathematics EOG/EOC public test specifications",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/accountability/testing",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only public test-structure signals such as grade/course coverage, item mode families, and reporting categories.",
      "Do not store released item content, answer keys, student samples, diagrams, scoring rubrics, or explanation text."
    ],
    reviewedAt
  },
  {
    id: "ncdpi-textbook-adoption-process",
    state: "NC",
    title: "North Carolina textbook adoption process",
    sourceKind: "textbook-adoption-list",
    libraryLane: "licensed-private-library",
    owner: "North Carolina Department of Public Instruction",
    url: "https://www.dpi.nc.gov/districts-schools/district-operations/textbook-adoption/textbook-adoption-process",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "metadata-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use adoption-process and material-list metadata only.",
      "District or publisher content requires documented authorization before any committed mapping."
    ],
    reviewedAt
  },
  {
    id: "mde-academic-standards-math",
    state: "MI",
    title: "Michigan mathematics academic standards",
    sourceKind: "state-standard",
    libraryLane: "public-standards",
    owner: "Michigan Department of Education",
    url: "https://www.michigan.gov/mde/services/academic-standards",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "safe-card-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Michigan K-12 standards guide local curriculum development.",
      "Store standard identifiers, grade/course structure, and MAIS-authored labels only."
    ],
    reviewedAt
  },
  {
    id: "mde-mstep-math",
    state: "MI",
    title: "Michigan M-STEP assessment information",
    sourceKind: "test-specification",
    libraryLane: "public-standards",
    owner: "Michigan Department of Education",
    url: "https://www.michigan.gov/mde/services/student-assessment/m-step",
    licenseStatus: "public-reference-restricted",
    commercialUse: "review-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Use only assessment-program metadata and broad skill/reporting abstractions.",
      "Do not store released item wording, answer keys, screenshots, tables, or scoring guides."
    ],
    reviewedAt
  },
  {
    id: "owner-provided-authorized-us-math-materials",
    state: "US",
    title: "Owner-provided or district-authorized U.S. math private library materials",
    sourceKind: "licensed-private-material",
    libraryLane: "licensed-private-library",
    owner: "Material owner, publisher, or participating district as documented by the project owner",
    url: "local-private-authorized-materials",
    licenseStatus: "permission-required",
    commercialUse: "permission-required",
    derivativeUse: "permission-required",
    repositoryRetention: "local-private-analysis-only",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Placeholder policy entry only; real material must stay in ignored local/private storage unless a written license permits repository retention.",
      "Only chapter titles, standard links, coverage metadata, and MAIS-authored abstractions may be committed by default."
    ],
    reviewedAt
  },
  {
    id: "open-up-resources-6-8-math-cc-by",
    state: "US",
    title: "Open Up Resources 6-8 Math CC BY curriculum notice",
    sourceKind: "oer-curriculum",
    libraryLane: "oer",
    owner: "Open Up Resources",
    url: "https://news.openupresources.org/open-up-resources-releases-its-first-free-oer-curriculum",
    licenseStatus: "open-commercial-attribution",
    commercialUse: "allowed-with-attribution",
    derivativeUse: "allowed-with-attribution",
    repositoryRetention: "oer-attribution-required",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    allowedUse: "Future OER lane after attribution/provenance UI exists; current committed RAG may store metadata and original abstraction only.",
    verbatimLimit: "0 committed lesson/task body words until an attribution-complete OER ingestion lane is implemented.",
    attributionText: "Open Up Resources 6-8 Math, CC BY 4.0 notice.",
    notes: [
      "Priority OER candidate for middle-school aligned content because the licensing posture is commercial-friendly with attribution.",
      "Do not ingest task text or media in this implementation slice."
    ],
    reviewedAt
  },
  {
    id: "illustrative-mathematics-cc-by-content",
    state: "US",
    title: "Illustrative Mathematics openly licensed content inventory",
    sourceKind: "oer-curriculum",
    libraryLane: "oer",
    owner: "Illustrative Mathematics",
    url: "https://illustrativemathematics.org/site-ip-content/",
    licenseStatus: "open-commercial-attribution",
    commercialUse: "allowed-with-attribution",
    derivativeUse: "allowed-with-attribution",
    repositoryRetention: "oer-attribution-required",
    safeCardAllowed: true,
    rawCorpusAllowed: false,
    notes: [
      "Potential future OER content lane only after attribution plumbing exists.",
      "This v1 safe-card slice does not ingest IM task text, lesson text, or media."
    ],
    reviewedAt
  },
  {
    id: "illustrative-mathematics-v360-noncommercial",
    state: "US",
    title: "Illustrative Mathematics v.360 noncommercial content notice",
    sourceKind: "oer-curriculum",
    libraryLane: "oer",
    owner: "Illustrative Mathematics",
    url: "https://illustrativemathematics.org/site-ip-content/",
    licenseStatus: "noncommercial-restricted",
    commercialUse: "not-allowed",
    derivativeUse: "not-allowed",
    repositoryRetention: "blocked-without-license",
    safeCardAllowed: false,
    rawCorpusAllowed: false,
    notes: [
      "Do not use in MAIS commercial RAG or generated-content pipelines without a separate commercial license.",
      "Record only this exclusion note for compliance."
    ],
    reviewedAt
  }
];

export const unitedStatesMathSourceRegistry: UnitedStatesMathSourceRegistryEntry[] =
  unitedStatesMathSourceRegistrySeeds.map(makeSourceEntry);

const gradeLabels: Record<GradeId, string> = {
  P1: "Grade 1",
  P2: "Grade 2",
  P3: "Grade 3",
  P4: "Grade 4",
  P5: "Grade 5",
  P6: "Grade 6",
  S1: "Grade 7",
  S2: "Grade 8",
  S3: "Grade 9",
  S4: "Grade 10",
  S5: "Grade 11",
  S6: "Grade 12"
};

type SafeCardSeed = Omit<
  UnitedStatesMathSafeCard,
  | "id"
  | "curriculumTrack"
  | "state"
  | "stateName"
  | "populationRank"
  | "statePriorityPhase"
  | "standardsName"
  | "standardsVersion"
  | "commonCoreStatus"
  | "crosswalkRelationToCcss"
  | "crosswalkNotes"
  | "adoptionPolicy"
  | "materialsPolicy"
  | "assessmentProgram"
  | "libraryLane"
  | "cardKind"
  | "usGradeLabel"
  | "prohibitedReuseNotes"
> & {
  idSuffix: string;
};

const globalPolicySourceIds = [
  "common-core-state-standards-public-license",
  "us-copyright-office-ideas-facts-methods"
];

function withGlobalPolicySources(sourceIds: string[]) {
  return Array.from(new Set([...sourceIds, ...globalPolicySourceIds]));
}

export const unitedStatesMathStateProfiles: UnitedStatesMathStateProfile[] = [
  {
    state: "CA",
    curriculumTrack: "US_CA_MATH",
    displayName: "California",
    populationRank: 1,
    statePriorityPhase: 1,
    standardsName: "California Common Core State Standards for Mathematics",
    standardsVersion: "California CCSS-M with 2023 Mathematics Framework support",
    commonCoreStatus: "adopted-common-core",
    standardPrefix: "CA.CCSS.Math",
    standardsSourceIds: ["cde-ca-ccss-math-resources", "cde-2023-math-framework", "cde-copyright-statement"],
    textbookSourceIds: ["cde-math-instructional-materials-adoption", "owner-provided-authorized-us-math-materials"],
    examSourceIds: ["caaspp-smarter-balanced-public-assessment-resources", "caaspp-math-blueprints-and-specifications"],
    baseSourceIds: ["cde-ca-ccss-math-resources", "cde-2023-math-framework", "caaspp-smarter-balanced-public-assessment-resources", "cde-math-instructional-materials-adoption"],
    assessmentProgram: "CAASPP / Smarter Balanced mathematics",
    adoptionPolicy: "K-8 has state-level mathematics instructional-materials adoption; local agencies still select and implement materials.",
    materialsPolicy: "Use CDE adoption metadata and authorized district sequence metadata only; commercial textbook body content remains license-required.",
    crosswalkRelationToCcss: "exact",
    crosswalkNotes: ["California is a CCSS-M state for this safe-RAG layer; use CCSS identifiers as the canonical crosswalk spine."],
    stateEvidenceNote: "Use CDE standards/framework signals and abstract CAASPP-style assessment metadata only.",
    noEndorsementNotice: "No CDE, CAASPP, Smarter Balanced, or publisher endorsement is implied."
  },
  {
    state: "TX",
    curriculumTrack: "US_TX_MATH",
    displayName: "Texas",
    populationRank: 2,
    statePriorityPhase: 1,
    standardsName: "Texas Essential Knowledge and Skills for Mathematics",
    standardsVersion: "Current TEKS mathematics standards and IMRA-era instructional-materials policy",
    commonCoreStatus: "state-specific-non-common-core",
    standardPrefix: "TX.TEKS.Math",
    standardsSourceIds: ["tea-curriculum-standards", "tea-teks-mathematics"],
    textbookSourceIds: ["tea-imra-math-adoption", "owner-provided-authorized-us-math-materials"],
    examSourceIds: ["tea-staar-math-assessments"],
    baseSourceIds: ["tea-curriculum-standards", "tea-teks-mathematics", "tea-imra-math-adoption", "tea-staar-math-assessments"],
    assessmentProgram: "STAAR mathematics and Algebra assessments",
    adoptionPolicy: "Texas uses TEKS and the state IMRA process for instructional-materials review and approval.",
    materialsPolicy: "Use IMRA approval metadata and local district evidence only; do not treat Texas materials as Common Core-aligned by default.",
    crosswalkRelationToCcss: "state-only",
    crosswalkNotes: ["Build a TEKS-to-CCSS crosswalk by concept similarity and teacher review; never infer direct Common Core adoption."],
    stateEvidenceNote: "Use TEKS identifiers, IMRA metadata, and abstract STAAR-style item-design families only.",
    noEndorsementNotice: "No TEA, STAAR, district, or publisher endorsement is implied."
  },
  {
    state: "FL",
    curriculumTrack: "US_FL_MATH",
    displayName: "Florida",
    populationRank: 3,
    statePriorityPhase: 1,
    standardsName: "B.E.S.T. Standards for Mathematics",
    standardsVersion: "B.E.S.T. Mathematics adopted in 2020",
    commonCoreStatus: "common-core-replaced",
    standardPrefix: "FL.BEST.Math",
    standardsSourceIds: ["fldoe-best-mathematics"],
    textbookSourceIds: ["fldoe-instructional-materials-adoption", "owner-provided-authorized-us-math-materials"],
    examSourceIds: ["fldoe-fast-math-assessments"],
    baseSourceIds: ["fldoe-best-mathematics", "fldoe-instructional-materials-adoption", "fldoe-fast-math-assessments"],
    assessmentProgram: "FAST mathematics and Florida EOC mathematics assessments",
    adoptionPolicy: "Florida maintains a state instructional-materials adoption process aligned to B.E.S.T.",
    materialsPolicy: "Use adoption list metadata and district evidence only; publisher content requires a license.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["Treat B.E.S.T. as a separate standards system; use CCSS only as a comparison graph, not as the source of truth."],
    stateEvidenceNote: "Use B.E.S.T. benchmark identifiers and abstract Florida assessment metadata only.",
    noEndorsementNotice: "No FLDOE, FAST/EOC, district, or publisher endorsement is implied."
  },
  {
    state: "NY",
    curriculumTrack: "US_NY_MATH",
    displayName: "New York",
    populationRank: 4,
    statePriorityPhase: 1,
    standardsName: "New York State Next Generation Mathematics Learning Standards",
    standardsVersion: "2017 Next Generation standards with full implementation from 2022",
    commonCoreStatus: "common-core-replaced",
    standardPrefix: "NY.NGMLS.Math",
    standardsSourceIds: ["nysed-next-generation-math-standards", "nysed-math-guidance-resources"],
    textbookSourceIds: ["owner-provided-authorized-us-math-materials"],
    examSourceIds: ["nysed-grade-3-8-math-assessments"],
    baseSourceIds: ["nysed-next-generation-math-standards", "nysed-math-guidance-resources", "nysed-grade-3-8-math-assessments"],
    assessmentProgram: "New York State mathematics assessments and Regents pathway metadata",
    adoptionPolicy: "New York standards are statewide; curriculum and instructional-material choices are primarily local.",
    materialsPolicy: "Use public district adoption evidence and authorized sequence metadata only.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["Maintain a Common Core-to-Next Generation crosswalk with relation labels and human review."],
    stateEvidenceNote: "Use NYSED standard identifiers, transition guidance metadata, and abstract state-assessment signals only.",
    noEndorsementNotice: "No NYSED, district, or publisher endorsement is implied."
  },
  {
    state: "PA",
    curriculumTrack: "US_PA_MATH",
    displayName: "Pennsylvania",
    populationRank: 5,
    statePriorityPhase: 2,
    standardsName: "Pennsylvania Core Standards for Mathematics",
    standardsVersion: "PA Core mathematics with eligible-content and assessment-anchor support",
    commonCoreStatus: "common-core-derived",
    standardPrefix: "PA.PA-Core.Math",
    standardsSourceIds: ["pde-mathematics-pa-core", "pdesas-standards-aligned-system"],
    textbookSourceIds: ["owner-provided-authorized-us-math-materials"],
    examSourceIds: ["pde-state-assessments-math"],
    baseSourceIds: ["pde-mathematics-pa-core", "pdesas-standards-aligned-system", "pde-state-assessments-math"],
    assessmentProgram: "PSSA and Keystone mathematics-related assessments",
    adoptionPolicy: "Pennsylvania provides standards, SAS, and assessment anchors; instructional-material decisions are mainly local.",
    materialsPolicy: "Use district procurement/curriculum-page metadata and authorized materials only.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["PA Core is Common Core-derived for many skill families; verify grade/course mappings against PA eligible content."],
    stateEvidenceNote: "Use PA Core/SAS identifiers and assessment-anchor abstraction only.",
    noEndorsementNotice: "No PDE, SAS, district, or publisher endorsement is implied."
  },
  {
    state: "IL",
    curriculumTrack: "US_IL_MATH",
    displayName: "Illinois",
    populationRank: 6,
    statePriorityPhase: 2,
    standardsName: "Illinois Learning Standards for Mathematics",
    standardsVersion: "Common Core-based Illinois standards adopted in 2010 and implemented in 2013-14",
    commonCoreStatus: "adopted-common-core",
    standardPrefix: "IL.ILS.Math",
    standardsSourceIds: ["isbe-learning-standards-math"],
    textbookSourceIds: ["owner-provided-authorized-us-math-materials"],
    examSourceIds: ["isbe-assessments"],
    baseSourceIds: ["isbe-learning-standards-math", "isbe-assessments"],
    assessmentProgram: "Illinois statewide mathematics assessment metadata",
    adoptionPolicy: "Illinois standards are statewide; curriculum and textbook adoption are primarily local district decisions.",
    materialsPolicy: "Use district adoption evidence and authorized publisher/district metadata only.",
    crosswalkRelationToCcss: "exact",
    crosswalkNotes: ["Use CCSS-M as the initial crosswalk spine, then confirm Illinois-specific labels and assessment metadata."],
    stateEvidenceNote: "Use ISBE standards and assessment metadata only; district textbook use requires separate evidence.",
    noEndorsementNotice: "No ISBE, district, or publisher endorsement is implied."
  },
  {
    state: "OH",
    curriculumTrack: "US_OH_MATH",
    displayName: "Ohio",
    populationRank: 7,
    statePriorityPhase: 2,
    standardsName: "Ohio's Learning Standards for Mathematics",
    standardsVersion: "2017-updated Ohio mathematics learning standards with HQIM guidance",
    commonCoreStatus: "common-core-derived",
    standardPrefix: "OH.OLS.Math",
    standardsSourceIds: ["ode-learning-standards-math", "ode-hqim-math-rubric"],
    textbookSourceIds: ["ode-hqim-math-rubric", "owner-provided-authorized-us-math-materials"],
    examSourceIds: ["ode-state-tests-math"],
    baseSourceIds: ["ode-learning-standards-math", "ode-hqim-math-rubric", "ode-state-tests-math"],
    assessmentProgram: "Ohio State Tests and high-school math assessment metadata",
    adoptionPolicy: "Ohio standards are statewide; instructional-material adoption is local, supported by HQIM rubrics and state guidance.",
    materialsPolicy: "Use HQIM criteria as metadata and local adoption evidence only; no publisher text without authorization.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["Use a CCSS-derived concept crosswalk with Ohio-specific review for model curriculum and assessment emphasis."],
    stateEvidenceNote: "Use Ohio standards, HQIM policy metadata, and abstract state-test signals only.",
    noEndorsementNotice: "No Ohio Department of Education and Workforce, district, or publisher endorsement is implied."
  },
  {
    state: "GA",
    curriculumTrack: "US_GA_MATH",
    displayName: "Georgia",
    populationRank: 8,
    statePriorityPhase: 2,
    standardsName: "Georgia's K-12 Mathematics Standards",
    standardsVersion: "2021 standards implemented in 2023-24",
    commonCoreStatus: "common-core-replaced",
    standardPrefix: "GA.Math",
    standardsSourceIds: ["gadoe-k12-math-standards"],
    textbookSourceIds: ["owner-provided-authorized-us-math-materials"],
    examSourceIds: ["gadoe-georgia-milestones"],
    baseSourceIds: ["gadoe-k12-math-standards", "gadoe-georgia-milestones"],
    assessmentProgram: "Georgia Milestones mathematics assessment metadata",
    adoptionPolicy: "Georgia standards are statewide; districts select instructional resources with state guidance and local procurement evidence.",
    materialsPolicy: "Use CASE/standards metadata and district adoption evidence only; publisher content remains license-required.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["Build GA-to-CCSS crosswalk from standards IDs, CASE metadata, and concept similarity; teacher review required."],
    stateEvidenceNote: "Use Georgia standard codes and abstract Milestones-style assessment metadata only.",
    noEndorsementNotice: "No Georgia Department of Education, district, or publisher endorsement is implied."
  },
  {
    state: "NC",
    curriculumTrack: "US_NC_MATH",
    displayName: "North Carolina",
    populationRank: 9,
    statePriorityPhase: 2,
    standardsName: "North Carolina Standard Course of Study for Mathematics",
    standardsVersion: "Current NCSCOS mathematics with ongoing review-cycle monitoring",
    commonCoreStatus: "common-core-derived",
    standardPrefix: "NC.Math",
    standardsSourceIds: ["ncdpi-k12-math-standard-course-of-study", "ncdpi-math-supporting-resources"],
    textbookSourceIds: ["ncdpi-textbook-adoption-process", "owner-provided-authorized-us-math-materials"],
    examSourceIds: ["ncdpi-eog-released-forms", "ncdpi-eoc-released-forms", "ncdpi-eog-eoc-test-specifications"],
    baseSourceIds: ["ncdpi-k12-math-standard-course-of-study", "ncdpi-math-supporting-resources", "ncdpi-eog-released-forms", "ncdpi-eoc-released-forms", "ncdpi-textbook-adoption-process"],
    assessmentProgram: "North Carolina EOG/EOC mathematics assessment metadata",
    adoptionPolicy: "North Carolina defines statewide standards and textbook adoption processes; local implementation choices still matter.",
    materialsPolicy: "Use NCDPI adoption-process metadata and district authorization only; released assessment and textbook content stays out of the committed RAG.",
    crosswalkRelationToCcss: "near",
    crosswalkNotes: ["Use CCSS-derived concept families as a starting graph, then preserve NCSCOS-specific standard IDs and review status."],
    stateEvidenceNote: "Use NCDPI standards/support signals and local-only EOG/EOC pattern abstraction only.",
    noEndorsementNotice: "No NCDPI, district, or publisher endorsement is implied."
  },
  {
    state: "MI",
    curriculumTrack: "US_MI_MATH",
    displayName: "Michigan",
    populationRank: 10,
    statePriorityPhase: 2,
    standardsName: "Michigan K-12 Standards for Mathematics",
    standardsVersion: "Michigan K-12 mathematics standards guiding local curriculum development",
    commonCoreStatus: "adopted-common-core",
    standardPrefix: "MI.Math",
    standardsSourceIds: ["mde-academic-standards-math"],
    textbookSourceIds: ["owner-provided-authorized-us-math-materials"],
    examSourceIds: ["mde-mstep-math"],
    baseSourceIds: ["mde-academic-standards-math", "mde-mstep-math"],
    assessmentProgram: "M-STEP mathematics assessment metadata",
    adoptionPolicy: "Michigan state standards guide local curriculum; instructional-material adoption is primarily local.",
    materialsPolicy: "Use local district adoption evidence and authorized materials only.",
    crosswalkRelationToCcss: "exact",
    crosswalkNotes: ["Use CCSS-M as the initial crosswalk spine for Michigan, with local curriculum and assessment metadata retained separately."],
    stateEvidenceNote: "Use MDE standards and M-STEP-style assessment metadata only.",
    noEndorsementNotice: "No Michigan Department of Education, district, or publisher endorsement is implied."
  }
];

const gradeSeeds: SafeCardSeed[] = [
  {
    idSuffix: "g1-operations-place-value-measure",
    grade: "P1",
    sourceIds: [],
    standardIds: ["G1.OA", "G1.NBT", "G1.MD", "G1.G"],
    domainTags: ["operations and algebraic thinking", "base-ten number sense", "measurement", "geometry"],
    clusterTags: ["add-subtract situations", "tens and ones", "length comparison", "shape attributes"],
    topicIds: ["p1-counting-number-bonds", "p1-addition-subtraction", "p1-shapes-patterns", "p1-measurement-time"],
    conceptIds: ["addition-subtraction", "number-bonds", "place-value", "measurement-comparison", "shape-attributes"],
    competencyTags: ["counting strategy", "representation choice", "early reasoning", "math language"],
    itemTypeTags: ["visual model task", "short constructed response", "selected response", "explain a strategy"],
    difficultyBand: "foundation",
    safeSummary: "Grade 1 alignment emphasizes flexible addition and subtraction, tens-and-ones structure, measurable attributes, and clear shape language through concrete representations.",
    generationGuidance: [
      "Create original classroom or home contexts with small counts, ten-frame style reasoning, and visible units.",
      "Ask students to show a model or compare two strategies before giving a final number."
    ],
    misconceptionTags: ["counts all instead of making ten", "confuses digit value and digit name", "measures without a shared unit", "names shapes by orientation only"],
    principalDemoNotes: ["Useful for showing early intervention, strategy evidence, and parent-friendly reports."]
  },
  {
    idSuffix: "g2-place-value-equal-groups-money-data",
    grade: "P2",
    sourceIds: [],
    standardIds: ["G2.OA", "G2.NBT", "G2.MD", "G2.G"],
    domainTags: ["operations and algebraic thinking", "base-ten computation", "measurement and data", "geometry"],
    clusterTags: ["fluency within 100", "three-digit place value", "time and money", "arrays and partitioning"],
    topicIds: ["p2-place-value", "p2-multiplication-foundations", "p2-money-time", "p2-length-data"],
    conceptIds: ["place-value", "addition-subtraction-fluency", "equal-groups", "money-time", "data-representation"],
    competencyTags: ["decompose numbers", "choose operation", "unit precision", "data reading"],
    itemTypeTags: ["number sentence", "bar chart interpretation", "multi-select", "measurement comparison"],
    difficultyBand: "foundation",
    safeSummary: "Grade 2 alignment strengthens base-ten reasoning, efficient addition/subtraction, equal groups, measurement, time, money, and early data interpretation.",
    generationGuidance: [
      "Use fresh values and contexts that require students to name hundreds, tens, and ones or compare units.",
      "Generate distractors that separate operation choice errors from place-value errors."
    ],
    misconceptionTags: ["regroups without place meaning", "chooses operation by keyword only", "mixes time units", "reads chart scale as one each"],
    principalDemoNotes: ["Supports principal demos of diagnostic distractors and standards coverage by classroom."]
  },
  {
    idSuffix: "g3-multiplication-fractions-area-data",
    grade: "P3",
    sourceIds: [],
    standardIds: ["G3.OA", "G3.NBT", "G3.NF", "G3.MD", "G3.G"],
    domainTags: ["multiplication and division", "fractions", "area and perimeter", "data", "geometry"],
    clusterTags: ["equal groups", "fraction as number", "area arrays", "scaled graphs", "shape categories"],
    topicIds: ["p3-multiplication-division", "p3-fractions-intro", "p3-measurement", "p3-geometry-patterns"],
    conceptIds: ["multiplication-division", "fraction-number-line", "area-model", "perimeter", "data-scale"],
    competencyTags: ["model with arrays", "reason about unit fractions", "connect area to multiplication", "interpret data"],
    itemTypeTags: ["array task", "number-line fraction", "area/perimeter comparison", "graph reasoning"],
    difficultyBand: "core",
    safeSummary: "Grade 3 alignment connects multiplication, division, fractions, area, perimeter, and scaled data so students can move between models and equations.",
    generationGuidance: [
      "Create original array, sharing, number-line, and measurement tasks with one clear conceptual target.",
      "Ask for a check step that explains why the unit or scale fits the question."
    ],
    misconceptionTags: ["treats denominator as shaded count", "confuses area and perimeter", "ignores graph scale", "divides unequal groups as equal groups"],
    principalDemoNotes: ["Good for showing transition from arithmetic fluency to conceptual modeling."]
  },
  {
    idSuffix: "g4-fractions-decimals-multi-digit-geometry-data",
    grade: "P4",
    sourceIds: [],
    standardIds: ["G4.OA", "G4.NBT", "G4.NF", "G4.MD", "G4.G"],
    domainTags: ["multi-digit operations", "fraction equivalence", "decimals", "measurement", "angles"],
    clusterTags: ["factors and multiples", "fraction comparison", "decimal notation", "unit conversion", "angle measure"],
    topicIds: ["p4-large-numbers", "p4-decimals", "p4-angles", "p4-perimeter-area"],
    conceptIds: ["multi-digit-computation", "fraction-equivalence", "decimal-place-value", "angle-measure", "unit-conversion"],
    competencyTags: ["use structure", "explain equivalence", "estimate reasonableness", "measure precisely"],
    itemTypeTags: ["multi-step word problem", "fraction comparison", "protractor-style reasoning", "unit conversion"],
    difficultyBand: "core",
    safeSummary: "Grade 4 alignment deepens multi-digit operations, fraction equivalence, decimal notation, measurement conversion, and geometric reasoning with angles.",
    generationGuidance: [
      "Use newly authored multi-step tasks where students choose a representation and justify equivalence or unit conversion.",
      "Vary contexts and numbers so the item targets the standard without resembling a source task."
    ],
    misconceptionTags: ["compares fractions by denominator only", "treats decimals as whole numbers", "uses wrong conversion direction", "reads angle size from side length"],
    principalDemoNotes: ["Shows how MAIS can identify whether a mistake is computation, concept, or measurement-language driven."]
  },
  {
    idSuffix: "g5-fraction-operations-volume-coordinate-data",
    grade: "P5",
    sourceIds: [],
    standardIds: ["G5.OA", "G5.NBT", "G5.NF", "G5.MD", "G5.G"],
    domainTags: ["fraction operations", "decimal operations", "volume", "coordinate plane", "data"],
    clusterTags: ["numerical patterns", "place-value powers", "fraction multiplication", "volume formulas", "coordinate graphing"],
    topicIds: ["p5-fractions-operations", "p5-volume", "p5-rates", "p5-charts-averages"],
    conceptIds: ["fraction-operations", "decimal-computation", "volume", "coordinate-plane", "data-claims"],
    competencyTags: ["model fraction operations", "calculate with precision", "visualize volume", "read coordinate pairs"],
    itemTypeTags: ["fraction model task", "volume decomposition", "coordinate interpretation", "data comparison"],
    difficultyBand: "core",
    safeSummary: "Grade 5 alignment extends fraction and decimal operations, volume, coordinate graphing, and data reasoning toward middle-school readiness.",
    generationGuidance: [
      "Create original visual fraction and volume tasks that ask students to name the operation and the unit.",
      "Use coordinate and data scenarios where students explain what each number represents."
    ],
    misconceptionTags: ["multiplies denominators for addition", "forgets cubic units", "reverses coordinate order", "treats average as a real observation"],
    principalDemoNotes: ["Supports standards coverage heatmaps for upper elementary readiness."]
  },
  {
    idSuffix: "g6-ratios-expressions-equations-statistics",
    grade: "P6",
    sourceIds: [],
    standardIds: ["G6.RP", "G6.NS", "G6.EE", "G6.G", "G6.SP"],
    domainTags: ["ratios and proportional reasoning", "number system", "expressions and equations", "geometry", "statistics"],
    clusterTags: ["unit rate", "rational numbers", "variables", "area and volume", "data distributions"],
    topicIds: ["p6-percentages", "p6-ratio-proportion", "p6-speed", "p6-pre-secondary-problem-solving"],
    conceptIds: ["ratios", "unit-rate", "rational-numbers", "expressions-equations", "statistical-variability"],
    competencyTags: ["proportional reasoning", "symbolic translation", "data interpretation", "model with quantities"],
    itemTypeTags: ["ratio table", "equation from context", "statistical display", "multi-step constructed response"],
    difficultyBand: "core",
    safeSummary: "Grade 6 alignment bridges elementary and middle school through ratios, rational numbers, expressions, geometry, and statistical variability.",
    generationGuidance: [
      "Generate original unit-rate and equation tasks that make students define each quantity before solving.",
      "Include data displays that require a claim and evidence, not only a computation."
    ],
    misconceptionTags: ["uses additive instead of multiplicative comparison", "drops negative sign context", "treats variable as label", "ignores spread in data"],
    principalDemoNotes: ["Strong principal-demo grade for transition readiness and intervention grouping."]
  },
  {
    idSuffix: "g7-proportional-relationships-rational-equations",
    grade: "S1",
    sourceIds: [],
    standardIds: ["G7.RP", "G7.NS", "G7.EE", "G7.G", "G7.SP"],
    domainTags: ["proportional relationships", "rational number operations", "linear expressions", "geometry", "statistics and probability"],
    clusterTags: ["constant of proportionality", "signed numbers", "equivalent expressions", "scale drawings", "sampling"],
    topicIds: ["integers", "algebra-basics", "ratios", "statistics-s1"],
    conceptIds: ["proportional-relationships", "integer-operations", "linear-expressions", "scale-factor", "random-sample"],
    competencyTags: ["compare representations", "operate with rational numbers", "write expressions", "reason from samples"],
    itemTypeTags: ["table-graph-equation match", "signed-number context", "scale drawing", "probability simulation"],
    difficultyBand: "core",
    safeSummary: "Grade 7 alignment centers proportional relationships, rational number operations, linear expressions, scale reasoning, and early inference from samples.",
    generationGuidance: [
      "Create original tasks that connect tables, graphs, equations, and verbal descriptions of proportional situations.",
      "Use distractors that reveal additive reasoning where multiplicative reasoning is needed."
    ],
    misconceptionTags: ["confuses slope with y-value", "uses absolute value as signed result", "combines unlike terms", "overgeneralizes from one sample"],
    principalDemoNotes: ["Useful for showing middle-school readiness diagnostics and intervention pathways."]
  },
  {
    idSuffix: "g8-linear-functions-transformations-pythagorean",
    grade: "S2",
    sourceIds: [],
    standardIds: ["G8.NS", "G8.EE", "G8.F", "G8.G", "G8.SP"],
    domainTags: ["linear equations", "functions", "transformations", "geometry", "bivariate data"],
    clusterTags: ["slope and intercept", "systems readiness", "function rule", "congruence and similarity", "scatter plots"],
    topicIds: ["linear-equations", "coordinates", "transformations", "probability-s2"],
    conceptIds: ["linear-equations", "functions", "slope", "transformations", "bivariate-data"],
    competencyTags: ["interpret rate of change", "solve and explain", "use coordinate geometry", "analyze association"],
    itemTypeTags: ["graph interpretation", "equation solving", "transformation sequence", "scatter-plot claim"],
    difficultyBand: "core",
    safeSummary: "Grade 8 alignment prepares students for algebra through linear equations, functions, transformations, coordinate geometry, and bivariate data reasoning.",
    generationGuidance: [
      "Create new graph, table, and equation scenarios where students identify the rate, initial value, and meaning.",
      "Use transformation tasks that require naming the move and its coordinate effect."
    ],
    misconceptionTags: ["swaps x and y meaning", "treats all relations as functions", "uses visual slope without units", "confuses correlation with causation"],
    principalDemoNotes: ["Good for showing standards-aligned Algebra I readiness evidence."]
  },
  {
    idSuffix: "g9-algebra-functions-coordinate-geometry",
    grade: "S3",
    sourceIds: [],
    standardIds: ["HS.N-RN", "HS.A-CED", "HS.A-REI", "HS.F-IF", "HS.G-GPE"],
    domainTags: ["algebra", "functions", "coordinate geometry", "modeling", "statistics"],
    clusterTags: ["equations from context", "function interpretation", "linear and quadratic models", "coordinate proof readiness", "residual thinking"],
    topicIds: ["polynomials", "quadratic-patterns", "trigonometry-basics", "circles"],
    conceptIds: ["equations-inequalities", "function-notation", "quadratic-functions", "coordinate-geometry", "modeling"],
    competencyTags: ["model with functions", "interpret parameters", "solve symbolically", "connect graph and equation"],
    itemTypeTags: ["modeling task", "function graph task", "short proof", "technology-enhanced graph interaction"],
    difficultyBand: "assessment",
    safeSummary: "Grade 9 alignment emphasizes algebraic modeling, function interpretation, quadratic structure, coordinate methods, and evidence-based explanation.",
    generationGuidance: [
      "Generate original modeling tasks with unfamiliar contexts, new quantities, and multiple representations.",
      "Ask students to interpret parameters and defend whether the model fits the situation."
    ],
    misconceptionTags: ["solves equation but misses context", "treats intercept as slope", "factors without checking domain", "uses graph shape as proof"],
    principalDemoNotes: ["Supports a principal demo around Algebra I readiness, placement, and standards reporting."]
  },
  {
    idSuffix: "g10-geometry-quadratics-probability",
    grade: "S4",
    sourceIds: [],
    standardIds: ["HS.G-CO", "HS.G-SRT", "HS.G-C", "HS.A-SSE", "HS.S-CP"],
    domainTags: ["geometry", "similarity", "trigonometry", "quadratics", "probability"],
    clusterTags: ["congruence", "similar triangles", "circle geometry", "quadratic structure", "conditional probability"],
    topicIds: ["functions", "coordinate-geometry", "more-algebra", "data-handling"],
    conceptIds: ["geometric-reasoning", "similarity", "right-triangle-trigonometry", "quadratic-structure", "conditional-probability"],
    competencyTags: ["construct an argument", "choose a theorem", "transform expressions", "reason with conditions"],
    itemTypeTags: ["diagram-supported reasoning", "structured proof", "quadratic rewrite", "probability table"],
    difficultyBand: "assessment",
    safeSummary: "Grade 10 alignment joins geometry, similarity, right-triangle trigonometry, quadratic structure, and probability through justification-heavy tasks.",
    generationGuidance: [
      "Create original diagrams and values from scratch; do not reuse source geometry layouts.",
      "Require students to state the condition that makes a theorem or probability rule valid."
    ],
    misconceptionTags: ["uses theorem without condition", "assumes diagram is to scale", "rewrites expression without preserving equality", "confuses conditional direction"],
    principalDemoNotes: ["Shows how MAIS can separate reasoning gaps from computation gaps in high-school math."]
  },
  {
    idSuffix: "g11-advanced-functions-trigonometry-statistics",
    grade: "S5",
    sourceIds: [],
    standardIds: ["HS.F-BF", "HS.F-LE", "HS.F-TF", "HS.S-ID", "HS.S-IC"],
    domainTags: ["advanced functions", "trigonometry", "exponential models", "statistics", "inference"],
    clusterTags: ["function transformations", "inverse reasoning", "trigonometric graphs", "data modeling", "sampling inference"],
    topicIds: ["advanced-functions", "trigonometry-s5", "probability-s5", "differentiation-intro"],
    conceptIds: ["function-transformations", "exponential-logarithmic-models", "trigonometric-functions", "statistical-inference", "rate-of-change"],
    competencyTags: ["compare models", "reason about periodicity", "interpret residuals", "evaluate claims"],
    itemTypeTags: ["model comparison", "trig graph interpretation", "data claim critique", "constructed response"],
    difficultyBand: "challenge",
    safeSummary: "Grade 11 alignment focuses on advanced functions, transformations, periodic behavior, exponential/logarithmic models, and statistics-based claims.",
    generationGuidance: [
      "Generate original multi-representation tasks where students compare function families or evaluate a data claim.",
      "Use newly authored periodic and exponential contexts with clear units and constraints."
    ],
    misconceptionTags: ["shifts graph in wrong direction", "mixes degrees and radians", "treats association as proof", "ignores model domain"],
    principalDemoNotes: ["Helps school leaders see college-readiness evidence without using copyrighted assessment items."]
  },
  {
    idSuffix: "g12-modeling-statistics-calculus-readiness",
    grade: "S6",
    sourceIds: [],
    standardIds: ["HS.N-Q", "HS.A-APR", "HS.F-IF", "HS.S-MD", "HS.Modeling"],
    domainTags: ["modeling", "quantitative reasoning", "polynomial structure", "statistics", "calculus readiness"],
    clusterTags: ["units and precision", "polynomial behavior", "decision-making under uncertainty", "function analysis", "rates"],
    topicIds: ["calculus", "statistics-s6", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["quantitative-reasoning", "polynomial-models", "decision-statistics", "function-analysis", "calculus-readiness"],
    competencyTags: ["choose assumptions", "analyze structure", "justify decisions", "communicate limitations"],
    itemTypeTags: ["capstone modeling task", "data decision task", "function analysis", "multi-step explanation"],
    difficultyBand: "challenge",
    safeSummary: "Grade 12 alignment emphasizes modeling, quantitative reasoning, function analysis, statistics for decisions, and readiness for postsecondary mathematics.",
    generationGuidance: [
      "Create original capstone tasks with new data summaries, assumptions, and decision criteria.",
      "Ask students to explain model limitations and select the most defensible method."
    ],
    misconceptionTags: ["ignores units in model", "overfits from limited data", "selects method by surface cue", "does not state assumptions"],
    principalDemoNotes: ["Best for demonstrating college-and-career readiness reporting to district leadership."]
  }
];

function sourceIdsForProfile(profile: UnitedStatesMathStateProfile, seedSourceIds: string[] = []) {
  return withGlobalPolicySources([...profile.baseSourceIds, ...seedSourceIds]);
}

function trackForState(state: UnitedStatesMathStateCode): UnitedStatesMathTrack {
  return profileForState(state).curriculumTrack;
}

function profileForState(state: UnitedStatesMathStateCode) {
  const profile = unitedStatesMathStateProfiles.find((entry) => entry.state === state);
  if (!profile) throw new Error(`Unsupported U.S. math state: ${state}`);
  return profile;
}

function profileForTrack(track: UnitedStatesMathTrack) {
  const profile = unitedStatesMathStateProfiles.find((entry) => entry.curriculumTrack === track);
  if (!profile) throw new Error(`Unsupported U.S. math track: ${track}`);
  return profile;
}

function stateSpecificSummary(profile: UnitedStatesMathStateProfile, summary: string) {
  return `${summary} The ${profile.displayName} slice uses ${profile.standardsName} metadata, ${profile.assessmentProgram} abstraction, and this state policy: ${profile.adoptionPolicy} ${profile.stateEvidenceNote}`;
}

function stateCardMetadata(profile: UnitedStatesMathStateProfile) {
  return {
    curriculumTrack: profile.curriculumTrack,
    state: profile.state,
    stateName: profile.displayName,
    populationRank: profile.populationRank,
    statePriorityPhase: profile.statePriorityPhase,
    standardsName: profile.standardsName,
    standardsVersion: profile.standardsVersion,
    commonCoreStatus: profile.commonCoreStatus,
    crosswalkRelationToCcss: profile.crosswalkRelationToCcss,
    crosswalkNotes: profile.crosswalkNotes,
    adoptionPolicy: profile.adoptionPolicy,
    materialsPolicy: profile.materialsPolicy,
    assessmentProgram: profile.assessmentProgram
  };
}

function stateSpecificStandardIds(profile: UnitedStatesMathStateProfile, standardIds: string[]) {
  return standardIds.map((standardId) => `${profile.standardPrefix}.${standardId}`);
}

function makeCardsForState(profile: UnitedStatesMathStateProfile) {
  const statePrefix = profile.state.toLowerCase();
  return gradeSeeds.map<UnitedStatesMathSafeCard>((seed) => ({
    ...seed,
    id: `us-${statePrefix}-math-${seed.idSuffix}`,
    ...stateCardMetadata(profile),
    libraryLane: "public-standards",
    cardKind: "grade-overview",
    usGradeLabel: gradeLabels[seed.grade],
    sourceIds: sourceIdsForProfile(profile, seed.sourceIds),
    standardIds: stateSpecificStandardIds(profile, seed.standardIds),
    safeSummary: stateSpecificSummary(profile, seed.safeSummary),
    prohibitedReuseNotes: originalityGuards
  }));
}

export const unitedStatesMathGradeOverviewCards: UnitedStatesMathSafeCard[] = [
  ...unitedStatesMathStateProfiles.flatMap(makeCardsForState)
];

function makeStandardsLibraryCardsForState(profile: UnitedStatesMathStateProfile) {
  const statePrefix = profile.state.toLowerCase();
  return gradeSeeds.flatMap<UnitedStatesMathSafeCard>((seed) =>
    seed.standardIds.map((standardId, index) => {
      const fullStandardId = `${profile.standardPrefix}.${standardId}`;
      const domainTag = seed.domainTags[index] ?? seed.domainTags[0] ?? "mathematics";
      const clusterTag = seed.clusterTags[index] ?? seed.clusterTags[0] ?? domainTag;

      return {
        id: `us-${statePrefix}-standards-${seed.grade.toLowerCase()}-${standardId.toLowerCase().replace(/\./g, "-")}`,
        ...stateCardMetadata(profile),
        libraryLane: "public-standards",
        cardKind: "standards",
        grade: seed.grade,
        usGradeLabel: gradeLabels[seed.grade],
        sourceIds: withGlobalPolicySources(profile.standardsSourceIds),
        standardIds: [fullStandardId],
        domainTags: [domainTag],
        clusterTags: [clusterTag],
        topicIds: seed.topicIds,
        conceptIds: seed.conceptIds,
        competencyTags: seed.competencyTags,
        itemTypeTags: seed.itemTypeTags,
        difficultyBand: seed.difficultyBand,
        safeSummary: stateSpecificSummary(
          profile,
          `${gradeLabels[seed.grade]} ${domainTag} coverage is represented as a standards-family card that maps ${fullStandardId} to MAIS topics, concepts, competencies, and misconception tags without storing official standards wording. Crosswalk relation to CCSS: ${profile.crosswalkRelationToCcss}.`
        ),
        generationGuidance: [
          `Use ${fullStandardId} only as a standards identifier and alignment target.`,
          "Generate MAIS-authored explanations, worked examples, practice items, and diagnostics from the concept tags, not from copied standards text.",
          `Apply this crosswalk policy: ${profile.crosswalkNotes.join(" ")}`
        ],
        misconceptionTags: seed.misconceptionTags,
        prohibitedReuseNotes: originalityGuards,
        principalDemoNotes: [
          `Show ${gradeLabels[seed.grade]} ${domainTag} as a standards coverage cell with linked MAIS topics and teacher-review status.`
        ]
      };
    })
  );
}

function makeTextbookCompatibilityCardsForState(profile: UnitedStatesMathStateProfile) {
  const statePrefix = profile.state.toLowerCase();
  return gradeSeeds.map<UnitedStatesMathSafeCard>((seed) => ({
    id: `us-${statePrefix}-textbook-compat-${seed.grade.toLowerCase()}-${seed.idSuffix}`,
    ...stateCardMetadata(profile),
    libraryLane: "licensed-private-library",
    cardKind: "textbook-compatibility",
    grade: seed.grade,
    usGradeLabel: gradeLabels[seed.grade],
    sourceIds: withGlobalPolicySources(profile.textbookSourceIds),
    standardIds: stateSpecificStandardIds(profile, seed.standardIds),
    domainTags: seed.domainTags,
    clusterTags: seed.clusterTags,
    topicIds: seed.topicIds,
    conceptIds: seed.conceptIds,
    competencyTags: ["chapter-to-standard mapping", "scope sequence compatibility", ...seed.competencyTags],
    itemTypeTags: ["chapter overview", "unit sequence", "readiness check", "teacher planning map"],
    difficultyBand: seed.difficultyBand,
    safeSummary: `${stateSpecificSummary(profile, seed.safeSummary)} This textbook-compatibility card is publisher-neutral and can be refined only from authorized table-of-contents, adoption records, or district-provided mapping metadata.`,
    generationGuidance: [
      "Use this card to align MAIS-authored lessons and practice to a district textbook sequence after authorization is documented.",
      "Do not store textbook examples, exercises, teacher notes, media, worked solutions, or assessment-bank content.",
      `Apply the ${profile.displayName} materials policy: ${profile.materialsPolicy}`
    ],
    misconceptionTags: seed.misconceptionTags,
    prohibitedReuseNotes: originalityGuards,
    principalDemoNotes: [
      "Use for principal pilots as an implementation-planning bridge: show which MAIS topics can align to a district's adopted sequence without claiming publisher endorsement."
    ],
    textbookCompatibilityNotes: [
      "Requires owner-provided authorization before publisher-specific chapter mapping.",
      "Commit only abstract chapter labels, standard IDs, topic links, and MAIS-authored summaries.",
      profile.materialsPolicy
    ]
  }));
}

const examGradeSeeds = gradeSeeds.filter((seed) => ["P3", "P4", "P5", "P6", "S1", "S2", "S3", "S5"].includes(seed.grade));

function examItemTagsForState(state: UnitedStatesMathStateCode, grade: GradeId) {
  if (state === "CA") {
    return grade === "S5"
      ? ["selected response", "constructed response", "technology-enhanced interaction", "performance task", "claim evidence"]
      : ["selected response", "constructed response", "technology-enhanced interaction", "short modeling task"];
  }

  if (state === "TX") {
    return ["STAAR-style reporting category abstraction", "numeric entry", "technology-enhanced interaction", "multi-step reasoning"];
  }

  if (state === "FL") {
    return ["FAST/EOC-style reporting category abstraction", "selected response", "technology-enhanced interaction", "multi-step modeling"];
  }

  if (state === "NY") {
    return ["state-test reporting-category abstraction", "constructed response", "multi-select", "evidence-supported reasoning"];
  }

  if (grade === "S3" || grade === "S5") {
    return ["course assessment reporting category", "numeric entry", "technology-enhanced interaction", "multi-step modeling"];
  }

  return ["selected response", "numeric entry", "technology-enhanced interaction", "grade-level reporting category"];
}

function makeExamPatternCardsForState(profile: UnitedStatesMathStateProfile) {
  const statePrefix = profile.state.toLowerCase();
  return examGradeSeeds.map<UnitedStatesMathSafeCard>((seed) => ({
    id: `us-${statePrefix}-exam-pattern-${seed.grade.toLowerCase()}-${seed.idSuffix}`,
    ...stateCardMetadata(profile),
    libraryLane: "public-standards",
    cardKind: "exam-pattern",
    grade: seed.grade,
    usGradeLabel: gradeLabels[seed.grade],
    sourceIds: withGlobalPolicySources(profile.examSourceIds),
    standardIds: stateSpecificStandardIds(profile, seed.standardIds),
    domainTags: seed.domainTags,
    clusterTags: seed.clusterTags,
    topicIds: seed.topicIds,
    conceptIds: seed.conceptIds,
    competencyTags: ["assessment blueprint abstraction", "DOK calibration", "evidence-centered diagnostic design", ...seed.competencyTags],
    itemTypeTags: examItemTagsForState(profile.state, seed.grade),
    difficultyBand: "assessment",
    safeSummary: `${stateSpecificSummary(profile, seed.safeSummary)} This exam-pattern card stores only non-expressive assessment design signals such as reporting categories, item-mode families, skill demand, and common misconception patterns.`,
    generationGuidance: [
      "Generate original MAIS assessment tasks from the concept and competency tags only.",
      "Use new contexts, numbers, diagrams, and answer choices; do not follow the layout, scenario, graph, or scoring language of any released item.",
      `Use ${profile.assessmentProgram} only as abstract readiness metadata.`
    ],
    misconceptionTags: seed.misconceptionTags,
    prohibitedReuseNotes: originalityGuards,
    principalDemoNotes: [
      "Use for principal demos to explain assessment readiness and intervention grouping without showing or reconstructing official released items."
    ],
    examPatternNotes: [
      `${profile.displayName} card uses ${profile.assessmentProgram} abstraction only, not practice, sample, or released item content.`,
      profile.noEndorsementNotice
    ]
  }));
}

export const unitedStatesMathStandardsLibraryCards: UnitedStatesMathSafeCard[] = [
  ...unitedStatesMathStateProfiles.flatMap(makeStandardsLibraryCardsForState)
];

export const unitedStatesMathTextbookCompatibilityCards: UnitedStatesMathSafeCard[] = [
  ...unitedStatesMathStateProfiles.flatMap(makeTextbookCompatibilityCardsForState)
];

export const unitedStatesMathExamPatternCards: UnitedStatesMathSafeCard[] = [
  ...unitedStatesMathStateProfiles.flatMap(makeExamPatternCardsForState)
];

export const unitedStatesMathSafeCards: UnitedStatesMathSafeCard[] = [
  ...unitedStatesMathGradeOverviewCards,
  ...unitedStatesMathStandardsLibraryCards,
  ...unitedStatesMathTextbookCompatibilityCards,
  ...unitedStatesMathExamPatternCards
];
