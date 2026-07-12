#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const date = hktDateStamp();

const RULES = [
  {
    pattern: /^(?:components\/providers\/AppProviders\.tsx|components\/providers\/.*\.test\.ts)$/,
    owner: "A08 state and analytics lead",
    coordination: ["A10 tooling/docs/report"],
    confidence: "high",
    rationale: "Shared provider/state boundary is A08-owned by coordination contract."
  },
  {
    pattern: /^lib\/difficulty(?:\.test)?\.ts$/,
    owner: "A08 state and analytics lead",
    coordination: ["A10 tooling/docs/report", "A22 production reliability if type-check/build affected"],
    confidence: "high",
    rationale: "Shared difficulty schema is A08-owned by coordination contract."
  },
  {
    pattern: /^(?:app\/adaptive-learning|app\/personalized-learning|lib\/curriculumProfile\.ts)/,
    owner: "A15 adaptive engine lead",
    coordination: ["A02 dashboard lead", "A08 state and analytics lead"],
    confidence: "medium",
    rationale: "Adaptive/personalized learning surface should be routed through A15, with UI/state coordination."
  },
  {
    pattern: /^(?:app\/assessment\/|app\/student\/(?:assessments|assignments)\/)/,
    owner: "A02 dashboard lead",
    coordination: ["A13 teacher console", "A12 backend/API platform", "A11 QA and release quality"],
    confidence: "medium",
    rationale: "Student assessment/assignment UI is launched from dashboard student-work surfaces and coordinates with teacher operations/API contracts."
  },
  {
    pattern: /^app\/student\/lessons(?:\/|$)/,
    owner: "A05 lesson lead",
    coordination: ["A18 curriculum QA and content quality lead", "A21 content pipeline and RAG operations"],
    confidence: "high",
    rationale: "Student lesson routes are A05-owned lesson surfaces with curriculum/content coordination."
  },
  {
    pattern: /^(?:app\/forum|components\/forum|data\/forum\.ts|lib\/forum\.ts|public\/forum-assets)/,
    owner: "A12 backend/API platform",
    coordination: ["A13 teacher console", "A01 app shell lead", "A11 QA and release quality"],
    confidence: "medium",
    rationale: "Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned."
  },
  {
    pattern: /^app\/messages\//,
    owner: "A14 parent console",
    coordination: ["A12 backend/API platform", "A13 teacher console"],
    confidence: "medium",
    rationale: "Messages overlap parent/teacher communication; A14 should lead UI ownership with A12/A13 coordination."
  },
  {
    pattern: /^(?:app\/student\/roadmap|components\/ui\/(?:CurriculumTrackSelector|GradeSelector)\.tsx|data\/grades\.ts|data\/topics\.ts|data\/.*Topics\.ts|data\/.*Roadmap\.ts)/,
    owner: "A03 curriculum roadmap lead",
    coordination: ["A18 curriculum QA and content quality lead"],
    confidence: "high",
    rationale: "Grade/topic/roadmap structures map to A03."
  },
  {
    pattern: /^(?:data\/questions\.ts|data\/.*Questions\.ts|lib\/.*QuestionBank\.test\.ts|lib\/fullQuestionBankSolvability\.test\.ts|lib\/questionBankSolvability\.ts|data\/hongKongEasePracticeQuestions\.ts|lib\/mainlandPepQuestionAssets\.ts)$/,
    owner: "A04 practice lead",
    coordination: ["A18 curriculum QA and content quality lead", "A21 content pipeline and RAG operations"],
    confidence: "high",
    rationale: "Question bank and solvability checks are A04-led with A18/A21 content coordination."
  },
  {
    pattern: /^(?:data\/lessons\.ts|data\/.*Lessons\.ts|data\/.*LessonIllustrations\.ts|lib\/guestLessonLinks\.ts|lib\/lessonLinks\.ts|data\/usCaliforniaMicroLessons\.ts|data\/usCaliforniaLessons\.test\.ts)$/,
    owner: "A05 lesson lead",
    coordination: ["A18 curriculum QA and content quality lead", "A21 content pipeline and RAG operations"],
    confidence: "high",
    rationale: "Lesson source/link/illustration data maps to A05 with A18/A21 content coordination."
  },
  {
    pattern: /^public\/audio\/lessons\//,
    owner: "A05 lesson lead",
    coordination: ["A19 API configuration and deployment env lead", "A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "Generated lesson audio assets are A05 lesson content artifacts that need provider-env and release evidence coordination."
  },
  {
    pattern: /^(?:data\/visualizationLabs\.ts)$/,
    owner: "A06 visualization lead",
    coordination: ["A18 curriculum QA and content quality lead"],
    confidence: "high",
    rationale: "Visualization lab runtime data is A06-owned."
  },
  {
    pattern: /^(?:data\/gameBasedLearning\.ts|data\/mathVirusBlaster\.ts|data\/mightyTankBattle\.ts)$/,
    owner: "A20 game design and game-based learning",
    coordination: ["A17 gamification and motivation lead", "A18 curriculum QA and content quality lead"],
    confidence: "high",
    rationale: "Game-based learning data and game loops map to A20."
  },
  {
    pattern: /^lib\/gameBasedLearning(?:\.test)?\.ts$/,
    owner: "A20 game design and game-based learning",
    coordination: ["A17 gamification and motivation lead", "A18 curriculum QA and content quality lead"],
    confidence: "high",
    rationale: "Game-based learning logic and tests are A20-owned, with reward and curriculum coordination."
  },
  {
    pattern: /^data\/productionLessonsNearTransfer\.test\.ts$/,
    owner: "A05 lesson lead",
    coordination: ["A18 curriculum QA and content quality lead", "A11 QA and release quality"],
    confidence: "high",
    rationale: "Production lesson transfer regression coverage is an A05 lesson package with A18/A11 review."
  },
  {
    pattern: /^lib\/californiaGradeAware\.test\.ts$/,
    owner: "A18 curriculum QA / A21 content pipeline",
    coordination: ["A03 curriculum roadmap lead", "A05 lesson lead", "A11 QA and release quality"],
    confidence: "high",
    rationale: "California grade-aware curriculum validation should be reviewed by A18 before roadmap or lesson promotion."
  },
  {
    pattern: /^(?:data\/hkChinese(?:Exceptions|Glossary)\.ts)$/,
    owner: "A09 copy, i18n, accessibility",
    coordination: ["A18 curriculum QA and content quality lead"],
    confidence: "high",
    rationale: "Chinese glossary/exception copy is an A09 bilingual terminology surface."
  },
  {
    pattern: /^lib\/mvpReadiness\.test\.ts$/,
    owner: "A11 QA and release quality",
    coordination: ["A22 production reliability and release engineering"],
    confidence: "high",
    rationale: "MVP readiness regression evidence is A11-owned."
  },
  {
    pattern: /^components\/ui\/PasswordInputWithReveal\.tsx$/,
    owner: "A01 app shell lead",
    coordination: ["A12 backend/API platform", "A09 copy, i18n, accessibility"],
    confidence: "medium",
    rationale: "Shared password-entry UI is an app-shell/auth-entry component."
  },
  {
    pattern: /^data\/usCaliforniaKnowledgePoints\.ts$/,
    owner: "A18 curriculum QA / A21 content pipeline",
    coordination: ["A03 curriculum roadmap lead", "A04 practice lead"],
    confidence: "medium",
    rationale: "California knowledge-point content requires curriculum QA and content-pipeline review before live ownership closure."
  },
  {
    pattern: /^components\/math\//,
    owner: "A09 copy, i18n, accessibility",
    coordination: ["A04 practice lead", "A05 lesson lead", "A18 curriculum QA and content quality lead"],
    confidence: "medium",
    rationale: "Math text rendering and normalization affect copy/accessibility and content display; A09 should triage with content-surface owners."
  },
  {
    pattern: /^lib\/loginRedirect\.test\.ts$/,
    owner: "A01 app shell lead",
    coordination: ["A11 QA and release quality"],
    confidence: "high",
    rationale: "Login redirect behavior is an app shell/auth-entry regression surface."
  },
  {
    pattern: /^lib\/parentConstraints\.ts$/,
    owner: "A14 parent console",
    coordination: ["A12 backend/API platform", "A09 copy, i18n, accessibility"],
    confidence: "high",
    rationale: "Parent message/invite text limits are parent-console domain constraints."
  },
  {
    pattern: /^(?:app\/icon\.(?:png|svg)|public\/robots\.txt)$/,
    owner: "A01 app shell lead",
    coordination: ["A10 tooling/docs/report", "A22 production reliability if release metadata affected"],
    confidence: "medium",
    rationale: "App icons and robots metadata are app-shell/release-surface assets."
  },
  {
    pattern: /^public\/lesson-illustrations\//,
    owner: "A24 illustration exact-layer",
    coordination: ["A21 content pipeline and RAG operations", "A18 curriculum QA and content quality lead", "A05 lesson lead"],
    confidence: "medium",
    rationale: "Lesson illustration source/reference assets need exact-layer and content provenance review before live lesson release."
  },
];

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function classify(entry) {
  const match = RULES.find((rule) => rule.pattern.test(entry.path));
  if (!match) {
    return {
      ...entry,
      proposedOwner: "Manual A10/A25 owner assignment required",
      coordination: [],
      confidence: "none",
      rationale: "No proposal rule matched this path."
    };
  }
  return {
    ...entry,
    proposedOwner: match.owner,
    coordination: match.coordination,
    confidence: match.confidence,
    rationale: match.rationale
  };
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] ?? "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function writePathspec(fileName, paths) {
  fs.writeFileSync(path.join(outDir, fileName), `${paths.sort((left, right) => left.localeCompare(right)).join("\n")}\n`);
}

function main() {
  const unmapped = dirtyMap.entries.filter((entry) => entry.owner === "Unmapped runtime owner review needed");
  const proposals = unmapped.map(classify);
  const owners = [...new Set(proposals.map((entry) => entry.proposedOwner))].sort((left, right) => left.localeCompare(right));

  for (const owner of owners) {
    const paths = proposals.filter((entry) => entry.proposedOwner === owner).map((entry) => entry.path);
    const fileName = `${date}-A25-proposed-owner-${slug(owner)}.pathspec`;
    const latestFileName = `latest-A25-proposed-owner-${slug(owner)}.pathspec`;
    writePathspec(fileName, paths);
    writePathspec(latestFileName, paths);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMap: {
      latestJson: "coordination/release-intake/latest-A25-dirty-tree-map.json",
      generatedAt: dirtyMap.generatedAt,
      statusSignature: dirtyMap.statusSignature
    },
    sourceOwner: "Unmapped runtime owner review needed",
    sourceCount: unmapped.length,
    proposalBuckets: countBy(proposals, "proposedOwner"),
    confidenceBuckets: countBy(proposals, "confidence"),
    proposals
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-runtime-owner-proposals.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-unmapped-runtime-owner-proposals.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-runtime-owner-proposals.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-unmapped-runtime-owner-proposals.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.json",
    latestMarkdown: "coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.md",
    sourceCount: unmapped.length,
    proposedOwners: owners.length,
    confidenceBuckets: payload.confidenceBuckets
  }, null, 2));
}

function markdown(payload) {
  const ownerRows = Object.entries(payload.proposalBuckets)
    .map(([owner, count]) => `| ${owner} | ${count} | \`coordination/release-intake/latest-A25-proposed-owner-${slug(owner)}.pathspec\` |`)
    .join("\n");
  const proposalRows = payload.proposals
    .map((entry) => `| \`${entry.status.trim() || "M"}\` | \`${entry.path}\` | ${entry.proposedOwner} | ${entry.confidence} | ${entry.coordination.join("; ") || "none"} | ${entry.rationale} |`)
    .join("\n");

  return `# ${date} A25 Unmapped Runtime Owner Proposals

Generated: ${payload.generatedAt}

Dirty map: \`${payload.dirtyMap.latestJson}\`

Source owner bucket: ${payload.sourceOwner}

Source entries: ${payload.sourceCount}

## Proposed Owner Buckets

| Proposed owner | Entries | Pathspec |
| --- | ---: | --- |
${ownerRows}

## Confidence

${Object.entries(payload.confidenceBuckets).map(([name, count]) => `- ${name}: ${count}`).join("\n")}

## Proposals

| Status | Path | Proposed owner | Confidence | Coordination | Rationale |
| --- | --- | --- | --- | --- | --- |
${proposalRows}

## Usage

- These are A25 routing proposals, not final semantic approval.
- A10/A25 should review low-confidence and manual rows first.
- Owning agents should move accepted paths into reviewed commit, owner-approved discard, evidence archive, or blocker.
`;
}

main();
