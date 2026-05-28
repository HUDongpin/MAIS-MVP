#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

const DEFAULT_TARGET_DIRS = ["app", "components", "data", "lib", "types"];
const DEFAULT_REPORT_PATH = "coordination/reports/hk-zh-word-audit.md";
const DEFAULT_INVENTORY_PATH = "coordination/reports/hk-zh-word-inventory.json";
const GOVERNANCE_FILES = new Set(["data/hkChineseGlossary.ts", "data/hkChineseExceptions.ts"]);
const GENERATED_DIRS = new Set(["node_modules", ".next", ".tmp", "output", "outputs"]);
const HAN_PATTERN = /\p{Script=Han}/u;

const SIMPLIFIED_CHAR_HINTS = new Set(
  Array.from(
    "简汉学数图线练课节题页这进过个标应视导调试测验评师资质习术实录错队电码关开间项顺预领额风飞体为读户无时会来机权欢气点热灯现画发监盘类维总续网罗联声脑与处号补见规计订认设词话该详证识译变让负财责赛输转办边邮释针键锁链难馆"
  )
);

function parseArgs(argv) {
  const options = {
    mode: "report",
    reportPath: DEFAULT_REPORT_PATH,
    inventoryPath: DEFAULT_INVENTORY_PATH,
    selfTest: false
  };

  for (const arg of argv) {
    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }

    if (arg === "--strict") {
      options.mode = "strict";
      continue;
    }

    const [key, value] = arg.split("=");
    if (key === "--mode" && value) options.mode = value;
    if (key === "--report" && value) options.reportPath = value;
    if (key === "--json" && value) options.inventoryPath = value;
  }

  if (!["report", "strict"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}. Use report or strict.`);
  }

  return options;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function readSourceFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function scriptKindForFile(filePath) {
  return filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function createTsSource(filePath, sourceText) {
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKindForFile(filePath));
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)) ||
      current.kind === ts.SyntaxKind.TypeAssertionExpression)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameText(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function literalToValue(node) {
  const expression = unwrapExpression(node);

  if (ts.isStringLiteral(expression) || expression.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return expression.text;
  }

  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) => literalToValue(element));
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const output = {};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = propertyNameText(property.name);
      if (!key) continue;
      output[key] = literalToValue(property.initializer);
    }
    return output;
  }

  throw new Error(`Unsupported governance literal near: ${expression.getText().slice(0, 80)}`);
}

function loadExportedValue(relativePath, variableName) {
  const sourceText = readSourceFile(relativePath);
  const sourceFile = createTsSource(relativePath, sourceText);
  let found = null;

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      found = literalToValue(node.initializer);
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!found) {
    throw new Error(`Could not find ${variableName} in ${relativePath}`);
  }

  return found;
}

function collectScanFiles() {
  const files = [];

  function walk(directory) {
    const absolute = path.join(repoRoot, directory);
    if (!fs.existsSync(absolute)) return;

    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
      const relativePath = path.posix.join(directory.split(path.sep).join("/"), entry.name);

      if (entry.isDirectory()) {
        if (!GENERATED_DIRS.has(entry.name)) walk(relativePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
      if (GOVERNANCE_FILES.has(relativePath)) continue;
      files.push(relativePath);
    }
  }

  for (const directory of DEFAULT_TARGET_DIRS) walk(directory);
  return files.sort();
}

function isInVariableDeclaration(node, name) {
  let current = node;
  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name) && current.name.text === name) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function stringSourceKind(node) {
  const parent = node.parent;

  if (parent && ts.isPropertyAssignment(parent)) {
    const propertyName = propertyNameText(parent.name);
    if (propertyName === "zh") return "zh-property";
    if (propertyName === "en") return "en-property-with-chinese";
    return `object-property:${propertyName ?? "unknown"}`;
  }

  if (parent && ts.isJsxAttribute(parent)) {
    return `jsx-attribute:${propertyNameText(parent.name) ?? "unknown"}`;
  }

  if (parent && ts.isCallExpression(parent)) {
    return "call-argument";
  }

  return "string-literal";
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hasChinese(text) {
  return HAN_PATTERN.test(text);
}

function recordOccurrence(occurrences, sourceFile, relativePath, node, text, sourceKind) {
  if (sourceKind === "object-property:zhHans") return;

  const normalized = normalizeText(text);
  if (!normalized || !hasChinese(normalized)) return;

  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  occurrences.push({
    file: relativePath,
    line: position.line + 1,
    column: position.character + 1,
    sourceKind,
    text: normalized
  });
}

function extractOccurrencesFromSource(relativePath, sourceText) {
  const sourceFile = createTsSource(relativePath, sourceText);
  const occurrences = [];

  function visit(node) {
    if (isInVariableDeclaration(node, "traditionalToSimplifiedMap") || isInVariableDeclaration(node, "prcSimplifiedPhraseRules")) {
      return;
    }

    if (ts.isStringLiteral(node) || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      recordOccurrence(occurrences, sourceFile, relativePath, node, node.text, stringSourceKind(node));
    }

    if (ts.isTemplateExpression(node)) {
      const staticParts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].filter(Boolean);
      if (staticParts.length > 0) {
        recordOccurrence(occurrences, sourceFile, relativePath, node, staticParts.join("${}"), "template-static-text");
      }
    }

    if (ts.isJsxText(node)) {
      recordOccurrence(occurrences, sourceFile, relativePath, node, node.getText(sourceFile), "jsx-text");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return occurrences;
}

function buildTermIndex(glossary) {
  const preferred = [];
  const allowed = [];
  const rejected = [];

  for (const entry of glossary) {
    preferred.push({ term: entry.preferredZh, entry, kind: "preferred" });
    for (const term of entry.allowedZh ?? []) allowed.push({ term, entry, kind: "allowed" });
    for (const term of entry.rejectedZh ?? []) rejected.push({ term, entry, kind: "rejected", replacement: entry.preferredZh });
  }

  const byLength = (a, b) => b.term.length - a.term.length || a.term.localeCompare(b.term, "zh-Hant-HK");
  return {
    preferred: preferred.sort(byLength),
    allowed: allowed.sort(byLength),
    rejected: rejected.sort(byLength),
    approved: [...preferred, ...allowed].sort(byLength)
  };
}

function scopeMatches(file, scopePattern) {
  if (scopePattern.endsWith("/**")) {
    return file.startsWith(scopePattern.slice(0, -3));
  }

  if (scopePattern.includes("*")) {
    const escaped = scopePattern
      .split("*")
      .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`).test(file);
  }

  return file === scopePattern;
}

function matchingExceptions(text, file, exceptions) {
  return exceptions.filter((exception) => {
    if (!text.includes(exception.phrase)) return false;
    return exception.scope.some((scope) => scopeMatches(file, scope));
  });
}

function removeExceptionPhrases(text, exceptions) {
  let output = text;
  for (const exception of exceptions) {
    output = output.split(exception.phrase).join("");
  }
  return output;
}

function simplifiedHits(text) {
  return Array.from(text).filter((char) => SIMPLIFIED_CHAR_HINTS.has(char));
}

function classifyOccurrence(occurrence, termIndex, exceptions) {
  const matchedExceptions = matchingExceptions(occurrence.text, occurrence.file, exceptions);
  const exceptionAdjustedText = removeExceptionPhrases(occurrence.text, matchedExceptions);
  const simplified = [...new Set(simplifiedHits(exceptionAdjustedText))].sort();
  const rejected = termIndex.rejected.filter((term) => occurrence.text.includes(term.term));
  const approved = termIndex.approved.filter((term) => occurrence.text.includes(term.term));
  const issues = [];

  for (const char of simplified) {
    issues.push({
      type: "simplified-char",
      value: char,
      message: `Possible Simplified Chinese character: ${char}`
    });
  }

  for (const term of rejected) {
    issues.push({
      type: "rejected-term",
      value: term.term,
      replacement: term.replacement,
      message: `Use「${term.replacement}」instead of「${term.term}」`
    });
  }

  let status = "untracked";
  if (issues.length > 0) status = "issue";
  else if (approved.length > 0) status = "tracked";
  else if (matchedExceptions.length > 0) status = "exception";

  return {
    ...occurrence,
    status,
    matches: approved.map((term) => ({
      term: term.term,
      kind: term.kind,
      preferredZh: term.entry.preferredZh,
      domain: term.entry.domain,
      sourceRefs: term.entry.sourceRefs
    })),
    exceptions: matchedExceptions.map((exception) => ({
      phrase: exception.phrase,
      reason: exception.reason,
      ownerSession: exception.ownerSession,
      reviewBy: exception.reviewBy
    })),
    issues
  };
}

function summarize(classified, files, glossary, exceptions, mode) {
  const statusCounts = classified.reduce((acc, occurrence) => {
    acc[occurrence.status] = (acc[occurrence.status] ?? 0) + 1;
    return acc;
  }, {});

  const issueTypeCounts = classified.flatMap((occurrence) => occurrence.issues).reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    mode,
    scannedFiles: files.length,
    occurrences: classified.length,
    statusCounts,
    issueTypeCounts,
    glossaryEntries: glossary.length,
    exceptions: exceptions.length,
    reportOnly: mode === "report"
  };
}

function groupByText(occurrences) {
  const groups = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.text;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.locations.push(`${occurrence.file}:${occurrence.line}`);
      continue;
    }

    groups.set(key, {
      text: occurrence.text,
      status: occurrence.status,
      count: 1,
      firstLocation: `${occurrence.file}:${occurrence.line}`,
      locations: [`${occurrence.file}:${occurrence.line}`],
      issues: occurrence.issues
    });
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "zh-Hant-HK"));
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function truncate(value, length = 90) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function issueSummary(issues) {
  return issues.map((issue) => issue.message).join("; ");
}

function renderIssueTable(occurrences) {
  if (occurrences.length === 0) return "No blocking issues found in report-only mode.\n";

  const rows = occurrences.slice(0, 80).map((occurrence) => {
    return `| ${escapeMarkdownCell(`${occurrence.file}:${occurrence.line}`)} | ${escapeMarkdownCell(occurrence.sourceKind)} | ${escapeMarkdownCell(truncate(occurrence.text))} | ${escapeMarkdownCell(issueSummary(occurrence.issues))} |`;
  });

  return [
    "| Location | Source | Text | Issue |",
    "| --- | --- | --- | --- |",
    ...rows,
    occurrences.length > 80 ? `\nShowing 80 of ${occurrences.length} issue occurrences.` : ""
  ].join("\n");
}

function renderGroupedTable(groups, limit = 80) {
  if (groups.length === 0) return "None.\n";

  const rows = groups.slice(0, limit).map((group) => {
    return `| ${group.count} | ${escapeMarkdownCell(group.firstLocation)} | ${escapeMarkdownCell(truncate(group.text))} | ${escapeMarkdownCell(issueSummary(group.issues) || group.status)} |`;
  });

  return [
    "| Count | First Location | Text | Status / Issue |",
    "| ---: | --- | --- | --- |",
    ...rows,
    groups.length > limit ? `\nShowing ${limit} of ${groups.length} grouped entries.` : ""
  ].join("\n");
}

function renderDomainSummary(classified) {
  const counts = new Map();
  for (const occurrence of classified) {
    for (const match of occurrence.matches) {
      counts.set(match.domain, (counts.get(match.domain) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return "No glossary matches yet.\n";

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, count]) => `- ${domain}: ${count}`)
    .join("\n");
}

function renderReport({ summary, classified, sourceReferences }) {
  const issues = classified.filter((occurrence) => occurrence.status === "issue");
  const untracked = classified.filter((occurrence) => occurrence.status === "untracked");
  const exceptionOnly = classified.filter((occurrence) => occurrence.status === "exception");
  const untrackedGroups = groupByText(untracked);
  const exceptionGroups = groupByText(exceptionOnly);

  const sourceLines = Object.entries(sourceReferences)
    .map(([key, source]) => `- ${key}: [${source.title}](${source.url})`)
    .join("\n");

  return `# Hong Kong Traditional Chinese Word Audit

- Generated: ${summary.generatedAt}
- Mode: ${summary.mode === "strict" ? "strict gate" : "report-only baseline"}
- Scanned files: ${summary.scannedFiles}
- Chinese text occurrences: ${summary.occurrences}
- Glossary entries: ${summary.glossaryEntries}
- Documented exceptions: ${summary.exceptions}

## Gate Summary

| Status | Count |
| --- | ---: |
| Tracked glossary match | ${summary.statusCounts.tracked ?? 0} |
| Documented exception | ${summary.statusCounts.exception ?? 0} |
| Untracked baseline item | ${summary.statusCounts.untracked ?? 0} |
| Issue: simplified/rejected | ${summary.statusCounts.issue ?? 0} |

Current \`npm run check:hk-zh\` runs this audit in report-only mode so S09 can build the first approved baseline without blocking all existing copy. To enforce the gate, run:

\`\`\`bash
node scripts/audit-hk-chinese.mjs --mode=strict
\`\`\`

Strict mode fails on any untracked Chinese text, likely Simplified Chinese character, or rejected Hong Kong terminology variant.

## Standards

${sourceLines}

## Blocking Issues

${renderIssueTable(issues)}

## Untracked Baseline For S09 Review

${renderGroupedTable(untrackedGroups)}

## Documented Exceptions

${renderGroupedTable(exceptionGroups, 40)}

## Glossary Domain Match Summary

${renderDomainSummary(classified)}
`;
}

function ensureParentDirectory(relativePath) {
  fs.mkdirSync(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
}

function writeOutputs(reportPath, inventoryPath, report, inventory) {
  ensureParentDirectory(reportPath);
  ensureParentDirectory(inventoryPath);
  fs.writeFileSync(path.join(repoRoot, reportPath), report);
  fs.writeFileSync(path.join(repoRoot, inventoryPath), `${JSON.stringify(inventory, null, 2)}\n`);
}

function runAudit(options) {
  const glossary = loadExportedValue("data/hkChineseGlossary.ts", "hkChineseGlossary");
  const exceptions = loadExportedValue("data/hkChineseExceptions.ts", "hkChineseExceptions");
  const sourceReferences = loadExportedValue("data/hkChineseGlossary.ts", "hkChineseSourceReferences");
  const termIndex = buildTermIndex(glossary);
  const files = collectScanFiles();
  const rawOccurrences = files.flatMap((file) => extractOccurrencesFromSource(file, readSourceFile(file)));
  const classified = rawOccurrences.map((occurrence) => classifyOccurrence(occurrence, termIndex, exceptions));
  const summary = summarize(classified, files, glossary, exceptions, options.mode);
  const report = renderReport({ summary, classified, sourceReferences });
  const inventory = {
    summary,
    sourceReferences,
    occurrences: classified,
    glossary: glossary.map((entry) => ({
      preferredZh: entry.preferredZh,
      allowedZh: entry.allowedZh ?? [],
      rejectedZh: entry.rejectedZh ?? [],
      domain: entry.domain,
      gradeRange: entry.gradeRange ?? null,
      sourceRefs: entry.sourceRefs,
      notes: entry.notes
    })),
    exceptions
  };

  writeOutputs(options.reportPath, options.inventoryPath, report, inventory);

  const strictFailures = (summary.statusCounts.issue ?? 0) + (summary.statusCounts.untracked ?? 0);
  if (options.mode === "strict" && strictFailures > 0) {
    throw new Error(`HK Chinese strict audit failed with ${strictFailures} issue/untracked occurrences.`);
  }

  return { summary, reportPath: options.reportPath, inventoryPath: options.inventoryPath };
}

function runSelfTests() {
  const glossary = loadExportedValue("data/hkChineseGlossary.ts", "hkChineseGlossary");
  const exceptions = loadExportedValue("data/hkChineseExceptions.ts", "hkChineseExceptions");
  const termIndex = buildTermIndex(glossary);
  const fixture = `
    const localized = { zh: "坐標概率與數據" };
    const rejected = { zh: "座標與機率" };
    const simplified = { zh: "数据图像" };
    const template = \`\${learnerName}正在瀏覽坐標視覺化\`;
    const languageToggle = "使用简体中文";
  `;

  const occurrences = extractOccurrencesFromSource("components/ui/LanguageToggle.tsx", fixture);
  assert.ok(occurrences.some((item) => item.sourceKind === "zh-property" && item.text.includes("坐標概率")));
  assert.ok(occurrences.some((item) => item.sourceKind === "template-static-text" && item.text.includes("正在瀏覽")));

  const classified = occurrences.map((occurrence) => classifyOccurrence(occurrence, termIndex, exceptions));
  const rejected = classified.find((item) => item.text.includes("座標"));
  assert.ok(rejected);
  assert.equal(rejected.status, "issue");
  assert.ok(rejected.issues.some((issue) => issue.type === "rejected-term" && issue.replacement === "坐標"));

  const simplified = classified.find((item) => item.text.includes("数据"));
  assert.ok(simplified);
  assert.equal(simplified.status, "issue");
  assert.ok(simplified.issues.some((issue) => issue.type === "simplified-char"));

  const languageToggle = classified.find((item) => item.text.includes("使用简体中文"));
  assert.ok(languageToggle);
  assert.equal(languageToggle.status, "exception");
  assert.equal(languageToggle.issues.length, 0);

  console.log("HK Chinese audit self-test passed.");
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.selfTest) {
    runSelfTests();
    if (process.argv.slice(2).length === 1) return;
  }

  const result = runAudit(options);
  console.log(
    `HK Chinese audit complete: ${result.summary.occurrences} occurrences across ${result.summary.scannedFiles} files.`
  );
  console.log(`Report: ${result.reportPath}`);
  console.log(`Inventory: ${result.inventoryPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
