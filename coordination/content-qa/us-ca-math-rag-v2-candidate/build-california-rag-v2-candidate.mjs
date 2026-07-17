#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const skillRoot =
  process.env.CALIFORNIA_MATH_COMMON_CORE_SKILL_ROOT ??
  path.join(repoRoot, ".local/skills/california-math-common-core");
const standardsIndexPath = path.join(skillRoot, "references/standards-index.json");
const generatedAt = "2026-06-19";
const packageId = "us-ca-math-rag-v2-candidate";

const sourcePolicy = {
  sourceHierarchy: [
    "CDE and official California CCSS-M resources are authoritative for standards structure.",
    "Common Core public-license materials provide the CCSS structure and attribution requirements.",
    "IXL California standards pages are secondary navigation and alignment-observation sources only."
  ],
  committedArtifactRules: [
    "Use standard identifiers, route/button organization, and MAIS-authored summaries.",
    "Do not copy IXL item stems, preview screens, exercise layouts, shortcut sequences, or skill-row wording.",
    "Do not copy official CDE/CCSS prose into public product files without separate license review.",
    "Keep raw source analysis out of committed artifacts unless the owner explicitly approves it."
  ],
  releaseSafeLanguage: [
    "California Math Practice Beta",
    "California standards-aligned practice coverage",
    "Candidate lesson package pending S18/S11 gates"
  ],
  forbiddenReleaseLanguage: [
    "complete California curriculum",
    "official California course",
    "fully launched California lessons",
    "IXL-equivalent exercises"
  ]
};

const ownerFlow = {
  generatedBy: "S21 content pipeline",
  qaOwner: "S18 curriculum QA",
  practiceOwner: "S04 practice lead",
  lessonOwner: "S05 lesson lead",
  regressionOwner: "S11 QA and release quality",
  promotionOwner: "S23 integration and promotion",
  status: "candidate-only"
};

const sourceIds = [
  "california-math-common-core-skill",
  "cde-ca-ccss-math-resources",
  "common-core-state-standards-public-license",
  "ixl-california-math-standards-navigation-only"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(__dirname, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(__dirname, fileName), value.endsWith("\n") ? value : `${value}\n`);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function flattenRecords(records) {
  const domains = [];
  const clusters = [];
  for (const record of records) {
    for (const domain of record.domains || []) {
      const domainEntry = { record, domain };
      domains.push(domainEntry);
      for (const cluster of domain.clusters || []) {
        clusters.push({ record, domain, cluster });
      }
    }
  }
  return { domains, clusters };
}

function toMaisStandardId(standardId) {
  if (/^PK\./.test(standardId)) {
    return `CA.Preschool.Math.${standardId}`;
  }
  if (/^K\./.test(standardId)) {
    return `CA.CCSS.Math.${standardId}`;
  }
  const gradeMatch = standardId.match(/^([1-8])\.(.+)$/);
  if (gradeMatch) {
    return `CA.CCSS.Math.G${gradeMatch[1]}.${gradeMatch[2]}`;
  }
  return `CA.CCSS.Math.HS.${standardId}`;
}

function toMaisDomainId(domainId) {
  if (/^PK\./.test(domainId)) {
    return `CA.Preschool.Math.${domainId}`;
  }
  if (/^K\./.test(domainId)) {
    return `CA.CCSS.Math.${domainId}`;
  }
  const gradeMatch = domainId.match(/^([1-8])\.(.+)$/);
  if (gradeMatch) {
    return `CA.CCSS.Math.G${gradeMatch[1]}.${gradeMatch[2]}`;
  }
  return `CA.CCSS.Math.HS.${domainId}`;
}

function gradeBand(record) {
  if (record.buttonLabel === "Pre-K") return "readiness";
  if (["Kindergarten", "First", "Second"].includes(record.buttonLabel)) return "early-elementary";
  if (["Third", "Fourth", "Fifth"].includes(record.buttonLabel)) return "upper-elementary";
  if (["Sixth", "Seventh", "Eighth"].includes(record.buttonLabel)) return "middle-school";
  return "high-school";
}

function gradeSafeSummary(record) {
  const domainTitles = (record.domains || []).map((domain) => domain.title);
  return [
    `${record.buttonLabel} California math coverage is organized around ${domainTitles.join(", ")}.`,
    "Use this card as a standards-aligned retrieval spine for original MAIS practice, remediation, and lesson planning."
  ].join(" ");
}

function domainSafeSummary(record, domain) {
  const capabilitySummaries = (domain.clusters || []).map((cluster) => cluster.capabilitySummary);
  return `${record.buttonLabel} / ${domain.id} focuses on ${domain.title}. MAIS should target: ${capabilitySummaries.join(" ")}`;
}

function clusterSafeSummary(record, domain, cluster) {
  return `${record.buttonLabel} / ${domain.id} / ${cluster.id}: ${cluster.capabilitySummary}`;
}

function makeEvidenceScope(record, domain, cluster) {
  return {
    buttonLabel: record.buttonLabel,
    routeSlug: record.routeSlug,
    maisGrade: record.maisGrade,
    gradeBand: gradeBand(record),
    domainId: domain?.id ?? null,
    domainTitle: domain?.title ?? null,
    clusterId: cluster?.id ?? null,
    sourceIds,
    skillReference: "$california-math-common-core",
    screenshotBoundary: "Grade buttons and directed standards-page organization only; no preview item text, images, or proprietary exercise sequence copied."
  };
}

function cardBase(id, kind, record, domain, cluster) {
  const rawStandardIds = cluster
    ? cluster.standardIds || []
    : domain
      ? unique((domain.clusters || []).flatMap((item) => item.standardIds || []))
      : unique((record.domains || []).flatMap((item) => item.clusters || []).flatMap((item) => item.standardIds || []));
  const domainIds = domain
    ? [domain.id]
    : (record.domains || []).map((item) => item.id);

  return {
    id,
    packageId,
    cardKind: kind,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    status: "candidate-only",
    sourceSkill: "$california-math-common-core",
    generatedAt,
    buttonLabel: record.buttonLabel,
    routeSlug: record.routeSlug,
    maisGrade: record.maisGrade,
    gradeBand: gradeBand(record),
    domainIds,
    maisDomainIds: domainIds.map(toMaisDomainId),
    canonicalStandardIds: rawStandardIds,
    maisStandardIds: rawStandardIds.map(toMaisStandardId),
    caAddition: Boolean(cluster?.caAddition || record.commonCore === false || record.buttonLabel === "Pre-K"),
    sourceSafety: {
      allowedUse: "standards structure, identifiers, and MAIS-authored abstraction",
      ixlUse: "secondary navigation and alignment signal only",
      copiedSourceText: false,
      releaseClaim: "candidate-only"
    },
    evidenceScope: makeEvidenceScope(record, domain, cluster),
    handoffOwners: ownerFlow
  };
}

function makeGradeCards(records) {
  return records.map((record) => {
    const domains = record.domains || [];
    const domainTitles = domains.map((domain) => domain.title);
    const misconceptions = unique(domains.flatMap((domain) => domain.clusters || []).flatMap((cluster) => cluster.commonMisconceptions || []));
    const affordances = unique(domains.flatMap((domain) => domain.clusters || []).flatMap((cluster) => cluster.itemDesignAffordances || []));
    return {
      ...cardBase(`ca-rag-v2-grade-${slugify(record.routeSlug)}`, "grade-overview-v2", record),
      domainTitles,
      clusterIds: domains.flatMap((domain) => (domain.clusters || []).map((cluster) => cluster.id)),
      safeSummary: gradeSafeSummary(record),
      generationGuidance: [
        "Retrieve this grade card before generating grade-wide pacing, diagnostic coverage, parent-facing reports, or remediation maps.",
        "Expand into domain or cluster cards before generating student-facing questions or lessons."
      ],
      misconceptionTags: misconceptions,
      itemDesignAffordances: affordances,
      bilingualTerminologyNotes: unique(domains.flatMap((domain) => domain.clusters || []).map((cluster) => cluster.bilingualTermNotes)).filter(Boolean)
    };
  });
}

function makeDomainCards(records) {
  const cards = [];
  for (const record of records) {
    for (const domain of record.domains || []) {
      const clusters = domain.clusters || [];
      const misconceptions = unique(clusters.flatMap((cluster) => cluster.commonMisconceptions || []));
      const affordances = unique(clusters.flatMap((cluster) => cluster.itemDesignAffordances || []));
      cards.push({
        ...cardBase(`ca-rag-v2-domain-${slugify(record.routeSlug)}-${slugify(domain.id)}`, "domain-safe-card-v2", record, domain),
        domainTitle: domain.title,
        clusterIds: clusters.map((cluster) => cluster.id),
        safeSummary: domainSafeSummary(record, domain),
        generationGuidance: [
          "Use as the default retrieval unit for California RAG v2 domain-level tutoring and teacher planning.",
          "For practice or lesson generation, select one cluster at a time and preserve the standard IDs as metadata."
        ],
        misconceptionTags: misconceptions,
        itemDesignAffordances: affordances,
        bilingualTerminologyNotes: unique(clusters.map((cluster) => cluster.bilingualTermNotes)).filter(Boolean)
      });
    }
  }
  return cards;
}

function makeClusterCards(records) {
  const cards = [];
  for (const record of records) {
    for (const domain of record.domains || []) {
      for (const cluster of domain.clusters || []) {
        cards.push({
          ...cardBase(`ca-rag-v2-cluster-${slugify(record.routeSlug)}-${slugify(cluster.id)}`, "cluster-safe-card-v2", record, domain, cluster),
          domainTitle: domain.title,
          clusterId: cluster.id,
          safeSummary: clusterSafeSummary(record, domain, cluster),
          generationGuidance: [
            "Generate original examples, representations, values, names, diagrams, and distractors.",
            "Attach the listed MAIS standard IDs to every generated item or lesson section.",
            "Use misconception tags to design diagnostic feedback rather than to imitate any source exercise."
          ],
          misconceptionTags: cluster.commonMisconceptions || [],
          itemDesignAffordances: cluster.itemDesignAffordances || [],
          bilingualTerminologyNotes: cluster.bilingualTermNotes ? [cluster.bilingualTermNotes] : []
        });
      }
    }
  }
  return cards;
}

function makePracticeBriefs(records) {
  const briefs = [];
  for (const record of records) {
    for (const domain of record.domains || []) {
      for (const cluster of domain.clusters || []) {
        const canonicalStandardIds = cluster.standardIds || [];
        briefs.push({
          id: `s04-practice-${slugify(record.routeSlug)}-${slugify(cluster.id)}`,
          packageId,
          owner: "S04 practice lead",
          upstreamOwner: "S21 content pipeline",
          qaOwner: "S18 curriculum QA",
          status: "candidate-brief",
          curriculumTrack: "US_CA_MATH",
          buttonLabel: record.buttonLabel,
          maisGrade: record.maisGrade,
          domainId: domain.id,
          domainTitle: domain.title,
          clusterId: cluster.id,
          canonicalStandardIds,
          maisStandardIds: canonicalStandardIds.map(toMaisStandardId),
          itemTargets: {
            minimumDraftItems: record.buttonLabel === "High school" ? 8 : 6,
            representations: cluster.itemDesignAffordances || [],
            diagnosticMisconceptions: cluster.commonMisconceptions || [],
            answerEvidenceRequired: true,
            bilingualSupport: Boolean(cluster.bilingualTermNotes)
          },
          authoringRules: [
            "Create fresh contexts, numbers, names, diagrams, and distractors.",
            "Use one primary standard/cluster per item unless the item is explicitly tagged as synthesis.",
            "Include independent solution evidence and source-distance status.",
            "Do not use IXL skill text, preview stems, screenshot values, or proprietary layout as item content."
          ]
        });
      }
    }
  }
  return briefs;
}

function makeLessonBriefs(records) {
  const briefs = [];
  for (const record of records) {
    for (const domain of record.domains || []) {
      for (const cluster of domain.clusters || []) {
        const canonicalStandardIds = cluster.standardIds || [];
        briefs.push({
          id: `s05-lesson-${slugify(record.routeSlug)}-${slugify(cluster.id)}`,
          packageId,
          owner: "S05 lesson lead",
          upstreamOwner: "S21 content pipeline",
          qaOwner: "S18 curriculum QA",
          status: "candidate-brief",
          curriculumTrack: "US_CA_MATH",
          buttonLabel: record.buttonLabel,
          maisGrade: record.maisGrade,
          domainId: domain.id,
          domainTitle: domain.title,
          clusterId: cluster.id,
          canonicalStandardIds,
          maisStandardIds: canonicalStandardIds.map(toMaisStandardId),
          lessonModuleSkeleton: [
            "concept hook with original context",
            "teacher-facing objective and prerequisite check",
            "visual or concrete model",
            "worked example with reasoning prompts",
            "guided practice with diagnostic feedback",
            "independent practice with answer evidence",
            "remediation branch for listed misconceptions",
            "extension or modeling task where age-appropriate",
            "bilingual terminology note when helpful"
          ],
          capabilityTarget: cluster.capabilitySummary,
          misconceptionTargets: cluster.commonMisconceptions || [],
          representationOptions: cluster.itemDesignAffordances || [],
          authoringRules: [
            "Write original explanation and examples; do not paste standard prose or IXL text.",
            "Treat this as a textbook/lesson candidate, not as a live launch artifact.",
            "Require S18 content QA and S11 route regression before live integration."
          ]
        });
      }
    }
  }
  return briefs;
}

function findBrief(briefs, clusterId) {
  const brief = briefs.find((item) => item.clusterId === clusterId);
  if (!brief) {
    throw new Error(`Representative brief not found for ${clusterId}`);
  }
  return brief;
}

function makePracticeSamples(practiceBriefs) {
  const samples = [
    {
      brief: findBrief(practiceBriefs, "K.CC.cardinality-compare"),
      prompt: "A student places 4 blue cubes and 6 red cubes on a table. Which color has more cubes, and how many more?",
      answer: "Red has more cubes by 2.",
      solutionEvidence: "Compare 6 red cubes with 4 blue cubes. Since 6 is greater than 4 and 6 - 4 = 2, the red group has 2 more cubes.",
      itemFormat: "short-answer with optional manipulatives",
      misconceptionProbe: "Student may compare by the size of the drawn group instead of matching one cube to one cube."
    },
    {
      brief: findBrief(practiceBriefs, "1.OA.add-subtract"),
      prompt: "There are 8 pencils in a cup. Leo adds 5 pencils. Then 3 pencils are used. How many pencils are in the cup now?",
      answer: "10 pencils.",
      solutionEvidence: "Start with 8, add 5 to get 13, then subtract 3 to get 10.",
      itemFormat: "multi-step word problem",
      misconceptionProbe: "Student may do only the first operation or choose an operation from a keyword."
    },
    {
      brief: findBrief(practiceBriefs, "6.RP.ratios"),
      prompt: "A smoothie recipe uses 3 cups of yogurt for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of yogurt are needed?",
      answer: "12 cups of yogurt.",
      solutionEvidence: "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply yogurt by the same factor: 3 x 4 = 12.",
      itemFormat: "ratio table or equivalent-ratio response",
      misconceptionProbe: "Student may add 15 instead of using a multiplicative scale factor."
    },
    {
      brief: findBrief(practiceBriefs, "8.F.function-relationships"),
      prompt: "A table shows x-values 0, 1, 2, 3 and y-values 4, 7, 10, 13. Write a rule for y in terms of x.",
      answer: "y = 3x + 4.",
      solutionEvidence: "Each time x increases by 1, y increases by 3, so the rate is 3. When x = 0, y = 4, so the starting value is 4.",
      itemFormat: "table-to-rule constructed response",
      misconceptionProbe: "Student may use the starting value as the rate or ignore the x = 0 row."
    },
    {
      brief: findBrief(practiceBriefs, "A-SSE.structure"),
      prompt: "Factor the expression 6x^2 + 15x completely.",
      answer: "3x(2x + 5).",
      solutionEvidence: "Both terms share a factor of 3x. Dividing gives 6x^2 / 3x = 2x and 15x / 3x = 5, so the expression is 3x(2x + 5).",
      itemFormat: "algebraic structure response",
      misconceptionProbe: "Student may factor only the numeric 3 or treat x as optional."
    }
  ];

  return samples.map((sample) => ({
    id: `s04-sample-${slugify(sample.brief.clusterId)}`,
    packageId,
    owner: "S04 practice lead",
    qaOwner: "S18 curriculum QA",
    status: "candidate-sample",
    curriculumTrack: "US_CA_MATH",
    sourceSkill: "$california-math-common-core",
    sourceDistance: "MAIS-authored original item based on cluster target only",
    sourceSafety: {
      copiedIxlText: false,
      copiedOfficialStandardProse: false,
      copiedSourceLayout: false
    },
    briefId: sample.brief.id,
    buttonLabel: sample.brief.buttonLabel,
    maisGrade: sample.brief.maisGrade,
    domainId: sample.brief.domainId,
    clusterId: sample.brief.clusterId,
    canonicalStandardIds: sample.brief.canonicalStandardIds,
    maisStandardIds: sample.brief.maisStandardIds,
    prompt: sample.prompt,
    answer: sample.answer,
    solutionEvidence: sample.solutionEvidence,
    itemFormat: sample.itemFormat,
    misconceptionProbe: sample.misconceptionProbe,
    releaseStatus: "not-live"
  }));
}

function makeLessonSamples(lessonBriefs) {
  const samples = [
    {
      brief: findBrief(lessonBriefs, "K.CC.cardinality-compare"),
      title: "Comparing Two Small Collections",
      objective: "Students compare two visible groups by matching objects and explaining which group has more, fewer, or the same number.",
      sections: [
        "Concept hook: compare two classroom supply groups with one-to-one matching.",
        "Model: line up each object in one group with one object in the other group.",
        "Worked example: compare 5 counters and 3 counters, then explain the difference.",
        "Guided practice: students compare two original object groups and say the comparison sentence aloud.",
        "Remediation: if students compare by object size, return to matching one object to one object."
      ]
    },
    {
      brief: findBrief(lessonBriefs, "6.RP.ratios"),
      title: "Scaling Ratios With Tables",
      objective: "Students use equivalent ratio tables to solve rate and percent-ready contextual problems.",
      sections: [
        "Concept hook: mix a classroom drink recipe with two ingredient columns.",
        "Model: multiply both quantities in a ratio by the same scale factor.",
        "Worked example: scale 2:7 to a larger batch and explain the factor.",
        "Guided practice: complete missing rows in an equivalent ratio table.",
        "Remediation: contrast additive growth with multiplicative scaling."
      ]
    },
    {
      brief: findBrief(lessonBriefs, "A-SSE.structure"),
      title: "Seeing Common Structure in Expressions",
      objective: "Students identify common factors and rewrite expressions to reveal useful algebraic structure.",
      sections: [
        "Concept hook: compare two area expressions that share a side length.",
        "Model: mark common factors before rewriting the expression.",
        "Worked example: factor a quadratic expression and verify by expanding.",
        "Guided practice: choose between equivalent forms based on what each form reveals.",
        "Remediation: separate term, factor, coefficient, and variable language."
      ]
    }
  ];

  return samples.map((sample) => ({
    id: `s05-sample-${slugify(sample.brief.clusterId)}`,
    packageId,
    owner: "S05 lesson lead",
    qaOwner: "S18 curriculum QA",
    status: "candidate-sample",
    curriculumTrack: "US_CA_MATH",
    sourceSkill: "$california-math-common-core",
    sourceDistance: "MAIS-authored lesson skeleton based on cluster target only",
    sourceSafety: {
      copiedIxlText: false,
      copiedOfficialStandardProse: false,
      copiedSourceLayout: false
    },
    briefId: sample.brief.id,
    buttonLabel: sample.brief.buttonLabel,
    maisGrade: sample.brief.maisGrade,
    domainId: sample.brief.domainId,
    clusterId: sample.brief.clusterId,
    canonicalStandardIds: sample.brief.canonicalStandardIds,
    maisStandardIds: sample.brief.maisStandardIds,
    title: sample.title,
    objective: sample.objective,
    sections: sample.sections,
    releaseStatus: "not-live"
  }));
}

function makeCoverageSummary(index, cards, practiceBriefs, lessonBriefs) {
  const { domains, clusters } = flattenRecords(index.records);
  const byButton = index.records.map((record) => {
    const recordDomains = record.domains || [];
    const recordClusters = recordDomains.flatMap((domain) => domain.clusters || []);
    const standardIds = unique(recordClusters.flatMap((cluster) => cluster.standardIds || []));
    return {
      buttonLabel: record.buttonLabel,
      routeSlug: record.routeSlug,
      maisGrade: record.maisGrade,
      commonCore: record.commonCore !== false,
      domainCount: recordDomains.length,
      clusterCount: recordClusters.length,
      standardCount: standardIds.length,
      domainIds: recordDomains.map((domain) => domain.id),
      maisDomainIds: recordDomains.map((domain) => toMaisDomainId(domain.id))
    };
  });

  return {
    packageId,
    generatedAt,
    sourceIndexName: index.name,
    sourceIndexSchemaVersion: index.schemaVersion,
    sourceSafety: index.sourceSafety,
    counts: {
      gradeButtons: index.gradeButtons.length,
      records: index.records.length,
      domains: domains.length,
      clusters: clusters.length,
      standards: unique(clusters.flatMap(({ cluster }) => cluster.standardIds || [])).length,
      cards: cards.length,
      gradeCards: cards.filter((card) => card.cardKind === "grade-overview-v2").length,
      domainCards: cards.filter((card) => card.cardKind === "domain-safe-card-v2").length,
      clusterCards: cards.filter((card) => card.cardKind === "cluster-safe-card-v2").length,
      practiceBriefs: practiceBriefs.length,
      lessonBriefs: lessonBriefs.length
    },
    byButton,
    caAdditionClusters: clusters
      .filter(({ cluster, record }) => cluster.caAddition || record.commonCore === false)
      .map(({ record, domain, cluster }) => ({
        buttonLabel: record.buttonLabel,
        domainId: domain.id,
        clusterId: cluster.id,
        standardIds: cluster.standardIds || []
      })),
    liveReplacementReadiness: {
      directLiveEditPerformed: false,
      reason: "Candidate package is ready for S18/S04/S05/S11/S23 gates before touching live RAG, question, lesson, or test files.",
      recommendedNextAdapter: "Map domain-safe-card-v2 and cluster-safe-card-v2 records into data/rag/usMath.ts only after S18 and S23 approval."
    }
  };
}

function makePackage(index, cards, practiceBriefs, lessonBriefs, practiceSamples, lessonSamples, coverageSummary) {
  return {
    packageId,
    generatedAt,
    status: "candidate-only",
    purpose: "Use $california-math-common-core as the California Math RAG v2 standards spine for safe retrieval, practice generation, and textbook/lesson planning.",
    owners: ownerFlow,
    sourcePolicy,
    sourceIndex: {
      skillRoot,
      standardsIndexPath,
      schemaVersion: index.schemaVersion,
      name: index.name,
      sourceSafety: index.sourceSafety
    },
    coverageSummary,
    cards,
    practiceBriefs,
    lessonBriefs,
    practiceSamples,
    lessonSamples,
    promotionGates: [
      "S18 confirms source-safety, standards coverage, and representative math correctness.",
      "S04 converts approved practice briefs into original question candidates with independent answer evidence.",
      "S05 converts approved lesson briefs into original textbook/lesson module candidates.",
      "S11 runs representative lesson/practice/browser regression after integration in a non-live branch or candidate surface.",
      "S23 decides candidate-to-live promotion with owner approval."
    ]
  };
}

function makeQaReport(summary) {
  return `# S18 Candidate QA Review - California Math RAG v2

Package: \`${packageId}\`
Date: ${generatedAt}
Primary input: \`$california-math-common-core\` standards index
Review owner: S18 curriculum QA
Upstream owner: S21 content pipeline

## Verdict

Status: candidate-only, approved for downstream review planning, not approved for live app promotion.

## Coverage

- Grade-button targets covered: ${summary.counts.gradeButtons}
- Records covered: ${summary.counts.records}
- Domain safe-card drafts: ${summary.counts.domainCards}
- Cluster safe-card drafts: ${summary.counts.clusterCards}
- Canonical standard identifiers represented: ${summary.counts.standards}
- S04 practice briefs: ${summary.counts.practiceBriefs}
- S05 lesson briefs: ${summary.counts.lessonBriefs}
- S04 representative candidate samples: ${summary.counts.practiceSamples}
- S05 representative candidate samples: ${summary.counts.lessonSamples}

## Source-Safety Check

- IXL is used only as navigation/alignment signal for grade buttons and directed page structure.
- The package does not copy IXL skill preview prompts, screenshots, answer choices, shortcut sequences, or exercise layouts.
- Official California/Common Core sources are represented through identifiers, structure, and attribution notes only.
- Student-facing text must still be authored fresh during S04/S05 generation.

## Math Correctness Scope

This package contains alignment cards, generation briefs, and a small representative sample set. The samples are candidate-only and are not final live student questions or lessons. S18 still must review any generated S04 question set and S05 lesson modules for answer correctness, grade fit, bilingual clarity, and misconception handling.

## Release Boundary

Use public wording such as "California Math Practice Beta" or "California standards-aligned practice coverage." Do not claim a complete California curriculum, official California course, or IXL-equivalent exercise set from this package alone.

## Required Follow-Up

1. S18 spot-checks representative K, Grade 1, Grade 6, Grade 8, and high-school cards against the skill index and source policy.
2. S04 uses \`s04-practice-question-briefs.json\` plus \`s04-representative-practice-candidates.json\` to generate or repair original practice candidates with independent solution evidence.
3. S05 uses \`s05-textbook-lesson-briefs.json\` plus \`s05-representative-lesson-candidates.json\` to draft original California textbook/lesson modules.
4. S11 regression runs only after candidate integration into a branch or review surface.
5. S23 owns the promotion decision and must keep this package candidate-only until the gates pass.
`;
}

function makePromotionHandoff(summary) {
  return `# S23 Promotion Handoff - California Math RAG v2 Candidate

Package: \`${packageId}\`
Date: ${generatedAt}
Promotion owner: S23 integration and promotion

## What S21 Produced

S21 created a standards-spine candidate package from \`$california-math-common-core\`:

- \`candidate-package.json\`: complete candidate package with safe-card drafts, practice briefs, lesson briefs, gates, and source policy.
- \`safe-card-drafts.json\`: RAG v2 card drafts by grade, domain, and cluster.
- \`s04-practice-question-briefs.json\`: practice generation briefs for S04.
- \`s05-textbook-lesson-briefs.json\`: textbook/lesson generation briefs for S05.
- \`s04-representative-practice-candidates.json\`: original S04 candidate samples.
- \`s05-representative-lesson-candidates.json\`: original S05 lesson skeleton samples.
- \`coverage-summary.json\`: structural coverage counts and grade-button mapping.
- \`s18-qa-review.md\`: initial S18 candidate review boundary.

## Candidate Coverage

- Grade buttons: ${summary.counts.gradeButtons}
- Domains: ${summary.counts.domains}
- Clusters: ${summary.counts.clusters}
- Standard identifiers: ${summary.counts.standards}
- RAG card drafts: ${summary.counts.cards}

## Promotion Sequence

1. S18 completes representative source-safety and alignment spot checks.
2. S04 creates original California practice question candidates from the practice briefs.
3. S05 creates original California textbook/lesson modules from the lesson briefs.
4. S18 reviews the generated S04/S05 outputs for curriculum fit and math correctness.
5. S11 runs representative lesson/practice/browser regression on the integrated candidate surface.
6. S23 proposes the candidate-to-live slice only after S18 and S11 evidence is attached.

## Live Edit Boundary

No live \`data/rag/usMath.ts\`, question-bank, lesson, UI, or test file was edited by this package. Recommended promotion shape is a small adapter PR that maps \`domain-safe-card-v2\` and \`cluster-safe-card-v2\` records into the existing California safe-RAG profile after approval.

## Risks To Track

- Pre-K is a readiness lane based on California Preschool Learning Foundations, not Common Core.
- High school pathways require local course sequencing decisions before any "textbook" or "course" launch wording.
- Standards alignment alone is not a content-quality pass; generated questions and lessons still need independent answer and pedagogy QA.
`;
}

function makeGenerationReport(summary) {
  return `# S21 Generation Report - California Math RAG v2 Candidate

Package: \`${packageId}\`
Date: ${generatedAt}
Owner: S21 content pipeline
Input skill: \`$california-math-common-core\`

## Objective

Use the global California math skill as a standards-spine replacement candidate for the current broad California RAG cards, while keeping all live app data untouched until S18/S11/S23 gates pass.

## Produced Artifacts

- \`safe-card-drafts.json\`: ${summary.counts.cards} retrieval card drafts across grade, domain, and cluster levels.
- \`s04-practice-question-briefs.json\`: ${summary.counts.practiceBriefs} practice-generation briefs for S04.
- \`s05-textbook-lesson-briefs.json\`: ${summary.counts.lessonBriefs} lesson/textbook-generation briefs for S05.
- \`coverage-summary.json\`: structural coverage and promotion-readiness metadata.
- \`s04-representative-practice-candidates.json\`: original S04 candidate samples for S18/S11 review selection.
- \`s05-representative-lesson-candidates.json\`: original S05 lesson skeleton samples for S18/S11 review selection.
- \`candidate-package.json\`: combined package for review and later adapter work.
- \`s18-qa-review.md\`: source-safety and curriculum QA boundary.
- \`s23-promotion-handoff.md\`: candidate-to-live promotion plan.
- \`s11-regression-readiness.md\`: regression preconditions and representative smoke paths.

## Coverage Result

- Grade-button records: ${summary.counts.records}
- Domains: ${summary.counts.domains}
- Clusters: ${summary.counts.clusters}
- Canonical standard IDs: ${summary.counts.standards}
- S04 representative samples: ${summary.counts.practiceSamples}
- S05 representative samples: ${summary.counts.lessonSamples}

## Live-RAG Replacement Strategy

This package should replace the current California RAG in two stages:

1. Use \`domain-safe-card-v2\` cards as a drop-in deeper replacement for broad grade/domain safe cards.
2. Add \`cluster-safe-card-v2\` cards as retrieval expansion for practice, lesson, remediation, and QA workflows.

No \`data/rag/usMath.ts\`, \`lib/rag/usMath.ts\`, live question-bank, live lesson, UI, or E2E test file was edited in this generation step.
`;
}

function makeRegressionReadiness(summary) {
  return `# S11 Regression Readiness - California Math RAG v2 Candidate

Package: \`${packageId}\`
Date: ${generatedAt}
Regression owner: S11 QA and release quality
Current status: not run, blocked until candidate integration exists

## Why S11 Cannot Run Full Regression Yet

The package is not wired into a route, live RAG adapter, practice bank, or lesson surface. Running browser regression now would only test the existing product, not this candidate package.

## Preconditions Before S11 Runs

1. S18 approves source-safety and representative alignment checks.
2. S23 defines the candidate integration slice.
3. S04 or S05 integrates a small approved sample into a non-live branch or review surface.
4. The integrated surface exposes enough metadata to verify \`US_CA_MATH\`, \`CA.CCSS.Math.*\`, source IDs, and candidate-only/release wording.

## Representative Regression Matrix

- Kindergarten/P1 practice path: verify California track selection, standard metadata, and original item text.
- Grade 6 or Grade 7 practice path: verify middle-school domain retrieval and remediation hints.
- High-school lesson path: verify high-school domain/category metadata and no overclaiming of complete course launch.
- RAG retrieval inspection: verify v2 cards retrieve by grade, domain, cluster, and standard ID.
- Release wording smoke: verify public UI says practice beta or standards-aligned candidate where appropriate.

## Candidate Coverage Available For Test Selection

- Grade buttons available: ${summary.counts.gradeButtons}
- Domain cards available: ${summary.counts.domainCards}
- Cluster cards available: ${summary.counts.clusterCards}
- S04 briefs available: ${summary.counts.practiceBriefs}
- S05 briefs available: ${summary.counts.lessonBriefs}
- S04 representative candidate samples: ${summary.counts.practiceSamples}
- S05 representative candidate samples: ${summary.counts.lessonSamples}
- S04 representative candidate samples: ${summary.counts.practiceSamples}
- S05 representative candidate samples: ${summary.counts.lessonSamples}

## Stop Condition

If any integrated sample contains copied IXL preview/item text, copied official standard prose, invalid \`CA.CCSS.Math.*\` IDs, or complete-curriculum launch wording, S11 should fail the candidate and return it to S18/S21/S23.
`;
}

function assertValid(index, cards, practiceBriefs, lessonBriefs) {
  const ids = new Set();
  for (const card of cards) {
    if (ids.has(card.id)) {
      throw new Error(`Duplicate card id: ${card.id}`);
    }
    ids.add(card.id);
    if (card.sourceSafety.copiedSourceText !== false) {
      throw new Error(`Unsafe copiedSourceText flag on ${card.id}`);
    }
    if (!card.curriculumTrack || card.curriculumTrack !== "US_CA_MATH") {
      throw new Error(`Invalid curriculum track on ${card.id}`);
    }
  }

  const buttonLabels = new Set(index.gradeButtons.map((button) => button.buttonLabel));
  for (const record of index.records) {
    if (!buttonLabels.has(record.buttonLabel)) {
      throw new Error(`Record without matching grade button: ${record.buttonLabel}`);
    }
  }

  const badTextNeedles = [
    "snowflakes",
    "shortcut",
    "IXL-equivalent"
  ];
  const searchable = JSON.stringify({ cards, practiceBriefs, lessonBriefs });
  for (const needle of badTextNeedles) {
    if (searchable.includes(needle)) {
      throw new Error(`Blocked source or release phrase found: ${needle}`);
    }
  }
}

function main() {
  const index = readJson(standardsIndexPath);
  const cards = [
    ...makeGradeCards(index.records),
    ...makeDomainCards(index.records),
    ...makeClusterCards(index.records)
  ];
  const practiceBriefs = makePracticeBriefs(index.records);
  const lessonBriefs = makeLessonBriefs(index.records);
  const practiceSamples = makePracticeSamples(practiceBriefs);
  const lessonSamples = makeLessonSamples(lessonBriefs);
  const coverageSummary = makeCoverageSummary(index, cards, practiceBriefs, lessonBriefs);
  coverageSummary.counts.practiceSamples = practiceSamples.length;
  coverageSummary.counts.lessonSamples = lessonSamples.length;

  assertValid(index, cards, practiceBriefs, lessonBriefs);

  const candidatePackage = makePackage(index, cards, practiceBriefs, lessonBriefs, practiceSamples, lessonSamples, coverageSummary);

  writeJson("safe-card-drafts.json", cards);
  writeJson("s04-practice-question-briefs.json", practiceBriefs);
  writeJson("s05-textbook-lesson-briefs.json", lessonBriefs);
  writeJson("s04-representative-practice-candidates.json", practiceSamples);
  writeJson("s05-representative-lesson-candidates.json", lessonSamples);
  writeJson("coverage-summary.json", coverageSummary);
  writeJson("candidate-package.json", candidatePackage);
  writeText("s21-generation-report.md", makeGenerationReport(coverageSummary));
  writeText("s18-qa-review.md", makeQaReport(coverageSummary));
  writeText("s23-promotion-handoff.md", makePromotionHandoff(coverageSummary));
  writeText("s11-regression-readiness.md", makeRegressionReadiness(coverageSummary));

  console.log(JSON.stringify({
    packageId,
    outputDir: path.relative(repoRoot, __dirname),
    counts: coverageSummary.counts
  }, null, 2));
}

main();
