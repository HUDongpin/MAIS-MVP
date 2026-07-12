#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "coordination", "release-intake");
const dirtyMap = JSON.parse(fs.readFileSync(path.join(outDir, "latest-A25-dirty-tree-map.json"), "utf8"));
const date = hktDateStamp();

const PROPOSALS = {
  "next-env.d.ts": {
    proposedOwner: "A10 tooling, docs, and report",
    coordination: ["A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "Next.js generated type surface should be reviewed as tooling/build metadata."
  },
  "coordination/integration/2026-06-21-S23-generated-content-source-package-gate.md": {
    proposedOwner: "A23 integration and promotion lead",
    coordination: ["A18 curriculum QA / A21 content pipeline", "A25 git hygiene and release intake"],
    confidence: "high",
    rationale: "Integration gate evidence is A23-owned by coordination contract."
  },
  "coordination/integration/2026-06-27-A23-content-rag-candidate-chain-intake.md": {
    proposedOwner: "A23 integration and promotion lead",
    coordination: ["A18 curriculum QA / A21 content pipeline", "A25 git hygiene and release intake"],
    confidence: "high",
    rationale: "Candidate-to-live content/RAG chain intake belongs to A23 integration and promotion."
  },
  "coordination/reports/2026-06-02-沪教版RAG与AI内容进度简报-Phoebe.docx": {
    proposedOwner: "A21 content pipeline and RAG operations",
    coordination: ["A10 tooling, docs, and report", "A18 curriculum QA / content quality", "A25 git hygiene and release intake"],
    confidence: "medium",
    rationale: "RAG and AI content progress reports should be reviewed by A21, with A10 reporting and A18 content-quality coordination."
  },
  "MAIS_Teacher_Console_Bug_Detection_Report.docx": {
    proposedOwner: "A13 teacher console lead",
    coordination: ["A10 tooling, docs, and report", "A11 QA and release quality", "A25 git hygiene and release intake"],
    confidence: "high",
    rationale: "Teacher Console bug-detection report should be reviewed by A13 for product ownership, with A10/A11/A25 coordinating report evidence and release intake."
  },
  "MAIS_CA-Math_K-5_Content_QA_Report.docx": {
    proposedOwner: "A18 curriculum QA and content quality lead",
    coordination: ["A21 content pipeline and RAG operations", "A10 tooling, docs, and report", "A25 git hygiene and release intake"],
    confidence: "high",
    rationale: "California K-5 math content QA evidence belongs to A18 curriculum/content-quality review, with A21 content-pipeline and A10/A25 report/release-intake coordination."
  },
  "design-qa.md": {
    proposedOwner: "A10 tooling, docs, and report",
    coordination: ["A11 QA and release quality"],
    confidence: "medium",
    rationale: "Root design QA note is coordination/report evidence unless a feature owner claims it."
  },
  "scripts/bug-triage.js": {
    proposedOwner: "A10 tooling, docs, and report",
    coordination: ["A11 QA and release quality"],
    confidence: "high",
    rationale: "General triage tooling belongs with A10 coordination/tooling."
  },
  "scripts/ai-tutor-live-latency-smoke.mjs": {
    proposedOwner: "A07 AI tutor lead",
    coordination: ["A22 production reliability and release engineering", "A19 API configuration and deployment env lead"],
    confidence: "medium",
    rationale: "AI Tutor latency smoke tooling is A07-owned behavior evidence with A22/A19 release and env coordination."
  },
  "scripts/generate-us-ca-lesson-audio.mjs": {
    proposedOwner: "A05 lesson lead",
    coordination: ["A19 API configuration and deployment env lead", "A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "US-CA lesson audio generation is lesson-content tooling that also needs provider-env and release evidence coordination."
  },
  "scripts/dashboard-latency-smoke.mjs": {
    proposedOwner: "A02 dashboard lead",
    coordination: ["A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "Dashboard latency smoke tooling validates A02 dashboard behavior with A22 release evidence."
  },
  "scripts/dashboard-smoke-auth-precheck.mjs": {
    proposedOwner: "A02 dashboard lead",
    coordination: ["A22 production reliability and release engineering", "A12 backend/API platform"],
    confidence: "medium",
    rationale: "Dashboard auth precheck tooling validates A02 dashboard entry with A22/A12 coordination."
  },
  "scripts/dashboard-smoke-auth-precheck.test.mjs": {
    proposedOwner: "A02 dashboard lead",
    coordination: ["A22 production reliability and release engineering", "A12 backend/API platform"],
    confidence: "medium",
    rationale: "Dashboard auth precheck tests validate A02 dashboard smoke tooling."
  },
  "scripts/dashboard-ui-loading-smoke.mjs": {
    proposedOwner: "A02 dashboard lead",
    coordination: ["A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "Dashboard UI loading smoke tooling validates A02 dashboard release behavior."
  },
  "scripts/next-clean-build.mjs": {
    proposedOwner: "A22 production reliability and release engineering",
    coordination: ["A10 tooling, docs, and report"],
    confidence: "high",
    rationale: "Clean Next build orchestration is A22 release engineering tooling."
  },
  "scripts/next-clean-build.test.mjs": {
    proposedOwner: "A22 production reliability and release engineering",
    coordination: ["A10 tooling, docs, and report"],
    confidence: "high",
    rationale: "Clean Next build tests validate A22 release engineering tooling."
  },
  "scripts/refresh-dirty-tree-map.mjs": {
    proposedOwner: "A25 git hygiene and release intake",
    coordination: ["A10 tooling, docs, and report"],
    confidence: "high",
    rationale: "Dirty-tree map generation is A25 release-intake tooling."
  },
  "scripts/resend-local-smoke.mjs": {
    proposedOwner: "A22 production reliability and release engineering",
    coordination: ["A19 API configuration and deployment env lead"],
    confidence: "medium",
    rationale: "Local smoke tooling affects release/deployment readiness and env parity."
  },
  "scripts/run-analytics-tests.mjs": {
    proposedOwner: "A08 state and analytics lead",
    coordination: ["A10 tooling, docs, and report"],
    confidence: "medium",
    rationale: "Analytics test runner should be reviewed by A08 with A10 tooling coordination."
  },
  "tsconfig.analytics.json": {
    proposedOwner: "A08 state and analytics lead",
    coordination: ["A10 tooling, docs, and report", "A22 production reliability and release engineering"],
    confidence: "medium",
    rationale: "Analytics TypeScript config supports A08 analytics checks with A10/A22 build coordination."
  }
};

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

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] ?? "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function decodeGitQuotedPath(value) {
  const text = String(value);
  if (!text.startsWith("\"") || !text.endsWith("\"")) return text;

  const bytes = [];
  for (let index = 1; index < text.length - 1;) {
    const char = text[index];
    if (char !== "\\") {
      bytes.push(...Buffer.from(char, "utf8"));
      index += 1;
      continue;
    }

    const octal = text.slice(index + 1, index + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      bytes.push(parseInt(octal, 8));
      index += 4;
      continue;
    }

    const escaped = text[index + 1];
    const simpleEscapes = new Map([
      ["\"", "\""],
      ["\\", "\\"],
      ["n", "\n"],
      ["r", "\r"],
      ["t", "\t"],
      ["b", "\b"],
      ["f", "\f"]
    ]);
    if (simpleEscapes.has(escaped)) {
      bytes.push(...Buffer.from(simpleEscapes.get(escaped), "utf8"));
      index += 2;
      continue;
    }

    bytes.push(...Buffer.from(char, "utf8"));
    index += 1;
  }

  return Buffer.from(bytes).toString("utf8");
}

function writePathspec(fileName, paths) {
  fs.writeFileSync(path.join(outDir, fileName), `${paths.sort((left, right) => left.localeCompare(right)).join("\n")}\n`);
}

function inferManualProposal(entryPath) {
  if (entryPath.startsWith("Technical-Review/")) {
    const isOfficeLockFile = path.basename(entryPath).startsWith(".~lock.");
    return {
      proposedOwner: "A10 tooling, docs, and report",
      coordination: [
        "A25 git hygiene and release intake",
        "A22 production reliability and release engineering"
      ],
      confidence: isOfficeLockFile ? "low" : "medium",
      rationale: isOfficeLockFile
        ? "Technical-Review Office lock artifacts are local report-hygiene residuals; route through A10 documentation ownership with A25/A22 cleanup coordination."
        : "Technical-Review reports, roadmaps, and readiness checklists are project documentation/release-readiness evidence and should be reviewed by A10 with A25/A22 coordination."
    };
  }

  return null;
}

function main() {
  const source = dirtyMap.entries.filter((entry) => entry.owner === "Unmapped/manual owner needed");
  const proposals = source.map((entry) => {
    const normalizedPath = decodeGitQuotedPath(entry.path);
    const proposal = PROPOSALS[entry.path] ?? PROPOSALS[normalizedPath] ?? inferManualProposal(normalizedPath);
    return {
      ...entry,
      ...(normalizedPath !== entry.path ? { normalizedPath } : {}),
      ...(proposal ?? {
      proposedOwner: "Manual A10/A25 owner assignment required",
      coordination: [],
      confidence: "none",
      rationale: "No manual proposal rule exists for this path."
      })
    };
  });

  const owners = [...new Set(proposals.map((entry) => entry.proposedOwner))].sort((left, right) => left.localeCompare(right));
  for (const owner of owners) {
    const paths = proposals.filter((entry) => entry.proposedOwner === owner).map((entry) => entry.path);
    writePathspec(`${date}-A25-proposed-manual-owner-${slug(owner)}.pathspec`, paths);
    writePathspec(`latest-A25-proposed-manual-owner-${slug(owner)}.pathspec`, paths);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMap: {
      latestJson: "coordination/release-intake/latest-A25-dirty-tree-map.json",
      generatedAt: dirtyMap.generatedAt,
      statusSignature: dirtyMap.statusSignature
    },
    sourceOwner: "Unmapped/manual owner needed",
    sourceCount: source.length,
    proposalBuckets: countBy(proposals, "proposedOwner"),
    confidenceBuckets: countBy(proposals, "confidence"),
    proposals
  };

  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-manual-owner-proposals.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${date}-A25-unmapped-manual-owner-proposals.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "latest-A25-unmapped-manual-owner-proposals.md"), markdown(payload));
  fs.writeFileSync(path.join(outDir, `${date}-A25-unmapped-manual-owner-proposals.md`), markdown(payload));

  console.log(JSON.stringify({
    latestJson: "coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.json",
    latestMarkdown: "coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.md",
    sourceCount: source.length,
    proposedOwners: owners.length,
    confidenceBuckets: payload.confidenceBuckets
  }, null, 2));
}

function markdown(payload) {
  const ownerRows = Object.entries(payload.proposalBuckets)
    .map(([owner, count]) => `| ${owner} | ${count} | \`coordination/release-intake/latest-A25-proposed-manual-owner-${slug(owner)}.pathspec\` |`)
    .join("\n");
  const proposalRows = payload.proposals
    .map((entry) => `| \`${entry.status.trim() || "M"}\` | \`${entry.path}\` | ${entry.proposedOwner} | ${entry.confidence} | ${entry.coordination.join("; ") || "none"} | ${entry.rationale} |`)
    .join("\n");

  return `# ${date} A25 Unmapped Manual Owner Proposals

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
`;
}

main();
