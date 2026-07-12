#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const auditedEntries = [
  "app",
  "components",
  "lib/curriculumProfile.ts",
  "lib/questionBankSolvability.ts",
  "data/usCaliforniaQuestions.ts",
  "data/usCaliforniaTopics.ts",
  "data/usCaliforniaLessons.ts",
  "data/usCaliforniaMicroLessons.ts",
  "README.md"
];

const ignoredPathParts = new Set([".next", ".tmp", "node_modules", "coverage", "public", "tests"]);
const auditedExtensions = new Set([".ts", ".tsx", ".md"]);

const forbiddenClaims = [
  {
    label: "complete California curriculum",
    pattern: /\bcomplete\s+California\s+(?:K-?5\s+)?(?:curriculum|course|program)\b/i
  },
  {
    label: "official California course/curriculum",
    pattern: /\bofficial\s+California\s+(?:course|curriculum|lessons?|program)\b/i
  },
  {
    label: "fully launched California K-5 lessons",
    pattern: /\bfully\s+launched\s+California\s+K-?5\s+lessons?\b/i
  },
  {
    label: "IXL-equivalent exercises",
    pattern: /\bIXL[-\s]?equivalent\s+exercises?\b/i
  },
  {
    label: "CDE-approved MAIS curriculum",
    pattern: /\b(?:CDE|California Department of Education)[-\s]?approved\b/i
  },
  {
    label: "complete official California elementary curriculum",
    pattern: /完整官方加州小学课程|完整官方加州小學課程|完整加州小学课程|完整加州小學課程/
  }
];

const requiredEvidence = [
  {
    file: "data/usCaliforniaTopics.ts",
    label: "K-5 old practice bank remains downlisted",
    pattern: /practiceLive:\s*false/
  },
  {
    file: "data/usCaliforniaTopics.ts",
    label: "K-5 adaptive practice beta remains explicitly live",
    pattern: /adaptiveBetaPracticeLive:\s*true/
  },
  {
    file: "data/usCaliforniaTopics.ts",
    label: "K-5 textbook beta remains explicitly live",
    pattern: /textbookLive:\s*true/
  },
  {
    file: "data/usCaliforniaTopics.ts",
    label: "K-5 topic descriptions use textbook/lesson beta wording",
    pattern: /California K-5 textbook\/lesson beta/
  },
  {
    file: "data/usCaliforniaLessons.ts",
    label: "K-5 lesson seeds use text-only textbook beta wording",
    pattern: /text-only California K-5 textbook beta/
  },
  {
    file: "data/usCaliforniaQuestions.ts",
    label: "K-5 adaptive beta question count is capped at 12 unless full practice is restored",
    pattern: /adaptiveBetaPracticeLive\s*\?\s*12\s*:\s*0/s
  },
  {
    file: "app/practice/page.tsx",
    label: "Practice page separates adaptive practice beta from textbook/lesson beta",
    pattern: /adaptive practice beta only[\s\S]*not an official or complete curriculum/
  },
  {
    file: "components/ui/CurriculumTrackSelector.tsx",
    label: "US_CA selector uses textbook/lesson beta wording",
    pattern: /California textbook\/lesson beta with adaptive practice beta/
  }
];

function shouldIgnore(filePath) {
  return filePath.split(path.sep).some((part) => ignoredPathParts.has(part));
}

function listFiles(entry) {
  const absolute = path.join(rootDir, entry);
  if (!existsSync(absolute)) return [];

  const stats = statSync(absolute);
  if (stats.isFile()) return [absolute];
  if (!stats.isDirectory()) return [];

  const files = [];
  const stack = [absolute];

  while (stack.length) {
    const current = stack.pop();
    if (!current || shouldIgnore(path.relative(rootDir, current))) continue;

    for (const child of readdirSync(current)) {
      const childPath = path.join(current, child);
      const childStats = statSync(childPath);
      if (childStats.isDirectory()) {
        stack.push(childPath);
      } else if (auditedExtensions.has(path.extname(childPath))) {
        files.push(childPath);
      }
    }
  }

  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

const issues = [];
const auditedFiles = Array.from(new Set(auditedEntries.flatMap(listFiles))).sort();

for (const absoluteFile of auditedFiles) {
  const relativeFile = path.relative(rootDir, absoluteFile);
  const source = readFileSync(absoluteFile, "utf8");

  for (const claim of forbiddenClaims) {
    const match = claim.pattern.exec(source);
    if (match) {
      issues.push(`${relativeFile}:${lineNumberFor(source, match.index)} forbidden claim: ${claim.label}`);
    }
  }
}

for (const evidence of requiredEvidence) {
  const absoluteFile = path.join(rootDir, evidence.file);
  if (!existsSync(absoluteFile)) {
    issues.push(`${evidence.file}: missing required evidence file for ${evidence.label}`);
    continue;
  }

  const source = readFileSync(absoluteFile, "utf8");
  if (!evidence.pattern.test(source)) {
    issues.push(`${evidence.file}: missing required evidence: ${evidence.label}`);
  }
}

if (issues.length) {
  console.error("California K-5 public claim audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`California K-5 public claim audit passed across ${auditedFiles.length} files.`);
