#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const failOnCritical = process.argv.includes("--fail-on-critical");
const scanRoots = ["app", "components", "data", "lib", "types"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const maxExamplesPerType = 30;

const i18nSourcePath = path.join(projectRoot, "lib/i18n.ts");
const i18nSource = readFileSync(i18nSourcePath, "utf8");

function parseTraditionalMap(source) {
  const start = source.indexOf("export const traditionalToSimplifiedMap");
  if (start === -1) return new Map();

  const bodyStart = source.indexOf("{", start);
  const bodyEnd = source.indexOf("\n};", bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) return new Map();

  const body = source.slice(bodyStart + 1, bodyEnd);
  const entries = new Map();
  for (const match of body.matchAll(/^\s*([^:\s]+):\s*"([^"]*)"/gm)) {
    if (match[1] !== match[2]) entries.set(match[1], match[2]);
  }
  return entries;
}

function parsePhraseRules(source) {
  return Array.from(source.matchAll(/source:\s*"([^"]+)",\s*replacement:\s*"([^"]+)",\s*reason:\s*"([^"]+)"/g)).map((match) => ({
    source: match[1],
    replacement: match[2],
    reason: match[3]
  }));
}

const traditionalMap = parseTraditionalMap(i18nSource);
const phraseRules = parsePhraseRules(i18nSource);
const traditionalCharacters = Array.from(traditionalMap.keys()).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

const bannedTerms = [
  { term: "视觉化", suggestion: "可视化", type: "prc-term" },
  { term: "课节", suggestion: "课时 / 课程", type: "prc-term" },
  { term: "电邮", suggestion: "邮箱", type: "prc-term" },
  { term: "账户", suggestion: "账号", type: "prc-term" },
  { term: "小一", suggestion: "小学一年级", type: "prc-grade" },
  { term: "小二", suggestion: "小学二年级", type: "prc-grade" },
  { term: "小三", suggestion: "小学三年级", type: "prc-grade" },
  { term: "小四", suggestion: "小学四年级", type: "prc-grade" },
  { term: "小五", suggestion: "小学五年级", type: "prc-grade" },
  { term: "小六", suggestion: "小学六年级", type: "prc-grade" },
  { term: "中一", suggestion: "初一", type: "prc-grade" },
  { term: "中二", suggestion: "初二", type: "prc-grade" },
  { term: "中三", suggestion: "初三", type: "prc-grade" },
  { term: "中四", suggestion: "高一", type: "prc-grade" },
  { term: "中五", suggestion: "高二", type: "prc-grade" },
  { term: "中六", suggestion: "高三", type: "prc-grade" },
  { term: "函数图像", suggestion: "函数图象", type: "math-term" },
  { term: "常态分布", suggestion: "正态分布", type: "math-term" },
  { term: "周界", suggestion: "周长", type: "math-term" },
  { term: "位值", suggestion: "数位", type: "math-term" }
];

function walkFiles(directory) {
  if (!existsSync(directory)) return [];

  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".tmp", "output", "outputs"].includes(entry.name)) return [];
      return walkFiles(entryPath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

function decodeStringLiteral(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\`/g, "`")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'");
}

function toPrcSimplified(text) {
  const converted = Array.from(text).map((char) => traditionalMap.get(char) ?? char).join("");
  return phraseRules.reduce((current, rule) => current.split(rule.source).join(rule.replacement), converted);
}

function findZhStrings(source) {
  const matches = [];
  const regex = /\bzh\s*:\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of source.matchAll(regex)) {
    const before = source.slice(0, match.index);
    const line = before.split("\n").length;
    const lineStart = before.lastIndexOf("\n") + 1;
    const closeWindow = source.slice(match.index, match.index + 360);
    const objectWindow = closeWindow.slice(0, closeWindow.indexOf("}") === -1 ? closeWindow.length : closeWindow.indexOf("}") + 1);
    matches.push({
      line,
      column: match.index - lineStart + 1,
      raw: match[0],
      text: decodeStringLiteral(match[2]),
      hasExplicitZhHansNearby: /\bzhHans\s*:/.test(objectWindow)
    });
  }
  return matches;
}

const files = scanRoots.flatMap((root) => walkFiles(path.join(projectRoot, root)));
const fileEntries = files.map((filePath) => ({
  filePath,
  relativePath: path.relative(projectRoot, filePath),
  source: readFileSync(filePath, "utf8")
}));
const issues = [];

for (const file of fileEntries) {
  const zhStrings = findZhStrings(file.source);

  for (const entry of zhStrings) {
    const rendered = toPrcSimplified(entry.text);

    if (!entry.hasExplicitZhHansNearby) {
      issues.push({
        severity: "advisory",
        type: "missing-zhHans",
        file: file.relativePath,
        line: entry.line,
        original: entry.text,
        rendered,
        suggestion: "Add explicit zhHans copy for audited user-facing text."
      });
    }

    const remainingTraditional = traditionalCharacters.filter((char) => rendered.includes(char));
    if (remainingTraditional.length) {
      issues.push({
        severity: "critical",
        type: "traditional-character",
        file: file.relativePath,
        line: entry.line,
        original: entry.text,
        rendered,
        suggestion: `Add conversion for: ${remainingTraditional.join(" ")}`
      });
    }

    for (const banned of bannedTerms) {
      if (rendered.includes(banned.term)) {
        issues.push({
          severity: banned.type === "prc-grade" ? "warning" : "critical",
          type: banned.type,
          file: file.relativePath,
          line: entry.line,
          original: entry.text,
          rendered,
          suggestion: `${banned.term} -> ${banned.suggestion}`
        });
      }
    }

    if (/[，。；：！？][A-Za-z0-9]/.test(rendered) || /[A-Za-z0-9][，。；：！？]/.test(rendered)) {
      issues.push({
        severity: "advisory",
        type: "punctuation-spacing",
        file: file.relativePath,
        line: entry.line,
        original: entry.text,
        rendered,
        suggestion: "Review CJK punctuation beside Latin letters/numbers for spacing and readability."
      });
    }
  }
}

const counts = issues.reduce((summary, issue) => {
  summary[issue.severity] = (summary[issue.severity] ?? 0) + 1;
  summary[issue.type] = (summary[issue.type] ?? 0) + 1;
  return summary;
}, {});
const localizedStringCount = fileEntries.reduce((count, file) => count + findZhStrings(file.source).length, 0);

console.log("PRC Simplified Chinese Audit");
console.log(`Scanned files: ${files.length}`);
console.log(`Localized zh strings found: ${localizedStringCount}`);
console.log(`Issues: ${issues.length}`);
console.log(`Critical: ${counts.critical ?? 0}`);
console.log(`Warnings: ${counts.warning ?? 0}`);
console.log(`Advisory: ${counts.advisory ?? 0}`);

for (const type of Array.from(new Set(issues.map((issue) => issue.type))).sort()) {
  const typedIssues = issues.filter((issue) => issue.type === type);
  const examples = typedIssues.slice(0, maxExamplesPerType);
  console.log(`\n[${type}] ${typedIssues.length} issue(s)`);
  for (const issue of examples) {
    console.log(`- ${issue.severity.toUpperCase()} ${issue.file}:${issue.line}`);
    console.log(`  original: ${issue.original.replace(/\s+/g, " ").slice(0, 180)}`);
    console.log(`  zh-Hans:  ${issue.rendered.replace(/\s+/g, " ").slice(0, 180)}`);
    console.log(`  suggest:  ${issue.suggestion}`);
  }
  if (examples.length < typedIssues.length) {
    console.log(`  ... ${typedIssues.length - examples.length} more`);
  }
}

if (failOnCritical && (counts.critical ?? 0) > 0) {
  process.exitCode = 1;
}
