#!/usr/bin/env node

/**
 * PRC Simplified Chinese (zh-Hans) audit.
 *
 * Scans `zh:` string literals under app/, components/, data/, lib/ and types/, derives the
 * zh-Hans rendering the runtime would produce (lib/i18n.ts `traditionalToSimplifiedMap` plus
 * `prcSimplifiedPhraseRules`), and reports:
 *
 *   critical  traditional-character  derived zh-Hans still contains a Traditional-only character
 *   critical  prc-term / math-term   Hong Kong wording that must not ship to Mainland users
 *   warning   prc-grade              HK grade labels (小一 / 中四 ...) that need Mainland equivalents
 *   advisory  missing-zhHans         a `zh:` string with no explicit `zhHans:` sibling
 *   advisory  punctuation-spacing    CJK punctuation adjacent to Latin letters or digits
 *
 * ---------------------------------------------------------------------------
 * ADVISORY RATCHET BASELINE
 * ---------------------------------------------------------------------------
 * `ADVISORY_BASELINE` below is the committed high-water mark for advisory findings.
 * `--max-advisory <n>` overrides it; `--fail-on-critical` enforces it. The number may only
 * ever be revised DOWNWARD — lowering it after a burn-down locks the gain in, and any change
 * that pushes the advisory count back above it fails the gate.
 *
 * Baseline history:
 *   5149  pre-ratchet high-water mark (advisory findings were ungated)
 *   5022  2026-08-19  audit fix only: an explicit zhHans sibling hidden behind a template
 *                     literal's own `}` was being reported as missing (127 false positives)
 *   3498  2026-08-19  explicit zhHans added for app/api, app/classroom, components/dashboard
 *                     and components/teacher (1,524 strings); converter coverage completed
 *
 * NOTE: `audit:zh-hans:strict` in package.json is frozen by the A10/A22 release-governance
 * gate (scripts/release-governance.test.mjs pins both the allowed script names and a sha256
 * of their bodies), so the ratchet is wired INSIDE this script: `--fail-on-critical` enforces
 * ADVISORY_BASELINE and runs the converter self-test. Changing the npm script body instead
 * would fail `npm run test:release-governance`.
 *
 * ---------------------------------------------------------------------------
 * SELF-TEST
 * ---------------------------------------------------------------------------
 * `--self-test` (also run implicitly whenever a gate is active) asserts the converter is
 * internally consistent and complete:
 *   1. every `traditionalToSimplifiedMap` entry round-trips: T converts to S, and S is stable
 *      under a second conversion pass (no map value is itself a Traditional key);
 *   2. no phrase-rule replacement reintroduces a Traditional key;
 *   3. every character in `traditionalRepertoire` has a map entry. The repertoire is the
 *      maintained list of Traditional characters this codebase knows about; requiring map
 *      coverage is what turns "we recognise this character" into "we actually convert it";
 *   4. no derived zh-Hans string contains a repertoire character. Deleting or breaking a map
 *      entry fails here — removing 閉 -> 闭 reproduces the original defect, 34 strings render
 *      as "P1 试点閉环中…" and the gate exits non-zero.
 *
 * LIMITATION: a Traditional character in neither the map nor the repertoire cannot be caught by
 * any static check here — there is no bundled Unihan table to check against. When new Traditional
 * copy introduces one, add it to `traditionalRepertoire`; check 3 then forces the map entry.
 *
 * Usage:
 *   node scripts/audit-zh-hans.mjs                     report only, never fails
 *   node scripts/audit-zh-hans.mjs --fail-on-critical  gate: critical + advisory baseline + self-test
 *   node scripts/audit-zh-hans.mjs --max-advisory 3500 gate against an explicit ceiling
 *   node scripts/audit-zh-hans.mjs --self-test         converter self-test only
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ADVISORY_BASELINE = 3498;

const projectRoot = process.cwd();
const argv = process.argv.slice(2);
const failOnCritical = argv.includes("--fail-on-critical");
const selfTestRequested = argv.includes("--self-test");

function readFlagValue(flag) {
  const inlineMatch = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inlineMatch) return inlineMatch.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

const rawMaxAdvisory = readFlagValue("--max-advisory");
let maxAdvisory;
if (rawMaxAdvisory !== undefined) {
  maxAdvisory = Number.parseInt(rawMaxAdvisory, 10);
  if (!Number.isInteger(maxAdvisory) || maxAdvisory < 0) {
    console.error(`--max-advisory expects a non-negative integer, received: ${rawMaxAdvisory ?? "(nothing)"}`);
    process.exit(2);
  }
} else if (failOnCritical) {
  maxAdvisory = ADVISORY_BASELINE;
}

const gateActive = failOnCritical || rawMaxAdvisory !== undefined;
const runSelfTest = gateActive || selfTestRequested;

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

/**
 * Every Traditional character this codebase knows about — those found in its own `zh:` copy plus
 * common Traditional characters kept ahead of the copy so future strings convert rather than leak.
 *
 * This is the DETECTION list; traditionalToSimplifiedMap is the CONVERSION list. Self-test check 3
 * requires the former to be a subset of the latter, so adding a character here without adding its
 * mapping fails the gate. Extend this list whenever new Traditional copy appears.
 */
const traditionalRepertoire = Array.from(
  "亂併們傷傾僅冪剛勞厲嗎園執堅壇壺夠屆島嶼帶張彎憂憑憶懲捨擋擔擷擺擾敗曉桿樹橋橢檻" +
  "欄殺淺滬濟瀏煙畢盃眾磚種競籃約紅納細終絡給絲綜綠緒編繞繩繪義脅脈膠艙葉蓋藍蘋虛蝦" +
  "螢觀討訴診詩詮誰謹譜貓貝貨買貼購趕車軌軛軟軸輪輯遊遞遷遺邏鄰鈍銜銳銷鋼錐錘鏡鐵鑑" +
  "鑰閉閒闊陣陸陽際隻雲靜響顆顏飲駐騷驅鬥魚鯊黃龍"
);

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
    // Scan the tail AFTER the matched literal: a template literal such as `${n} 題` contains a
    // closing brace of its own, and truncating a window that starts at `zh:` on the first `}`
    // would cut the object off before an explicit `zhHans:` sibling could be seen.
    const literalEnd = match.index + match[0].length;
    const tail = source.slice(literalEnd, literalEnd + 360);
    const objectTail = tail.slice(0, tail.indexOf("}") === -1 ? tail.length : tail.indexOf("}") + 1);
    matches.push({
      line,
      column: match.index - lineStart + 1,
      raw: match[0],
      text: decodeStringLiteral(match[2]),
      hasExplicitZhHansNearby: /\bzhHans\s*:/.test(objectTail)
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

function runConverterSelfTest() {
  const failures = [];
  const keySet = new Set(traditionalMap.keys());

  // 1. Every map entry round-trips and its target is stable under a second pass.
  for (const [traditional, simplified] of traditionalMap) {
    if (!simplified) {
      failures.push(`map entry ${traditional} has an empty replacement`);
      continue;
    }
    const forward = Array.from(traditional).map((char) => traditionalMap.get(char) ?? char).join("");
    if (forward !== simplified) {
      failures.push(`map entry ${traditional} -> ${simplified} did not round-trip (got ${forward})`);
    }
    const residual = Array.from(simplified).filter((char) => keySet.has(char));
    if (residual.length) {
      failures.push(`map value for ${traditional} still contains Traditional character(s): ${residual.join(" ")}`);
    }
    if (toPrcSimplified(simplified) !== simplified) {
      failures.push(`map value for ${traditional} is not stable under a second conversion pass`);
    }
  }

  // 2. No phrase-rule replacement reintroduces a Traditional character.
  for (const rule of phraseRules) {
    const residual = Array.from(rule.replacement).filter((char) => keySet.has(char));
    if (residual.length) {
      failures.push(`phrase rule ${rule.source} -> ${rule.replacement} reintroduces: ${residual.join(" ")}`);
    }
  }

  // 3. The probe must be fully covered, otherwise check 4 is vacuous.
  const uncovered = traditionalRepertoire.filter((char) => !keySet.has(char));
  if (uncovered.length) {
    failures.push(`traditionalRepertoire characters missing from traditionalToSimplifiedMap: ${uncovered.join(" ")}`);
  }

  // 4. No derived zh-Hans string may contain a known Traditional character.
  const probeSet = new Set([...keySet, ...traditionalRepertoire]);
  const residualHits = [];
  for (const file of fileEntries) {
    for (const entry of findZhStrings(file.source)) {
      const rendered = toPrcSimplified(entry.text);
      const hits = Array.from(new Set(Array.from(rendered).filter((char) => probeSet.has(char))));
      if (hits.length) {
        residualHits.push(`${file.relativePath}:${entry.line} -> ${hits.join(" ")} in "${rendered.slice(0, 60)}"`);
      }
    }
  }
  if (residualHits.length) {
    failures.push(`derived zh-Hans still contains Traditional characters in ${residualHits.length} string(s):`);
    failures.push(...residualHits.slice(0, 20).map((hit) => `    ${hit}`));
  }

  return failures;
}

console.log("PRC Simplified Chinese Audit");

const selfTestFailures = runSelfTest ? runConverterSelfTest() : [];
if (runSelfTest) {
  console.log(
    `Converter self-test: ${selfTestFailures.length === 0 ? "PASS" : "FAIL"} ` +
      `(${traditionalMap.size} map entries, ${phraseRules.length} phrase rules, ${traditionalRepertoire.length} repertoire characters)`
  );
  for (const failure of selfTestFailures) console.log(`  ${failure}`);
}

if (selfTestRequested && !failOnCritical && rawMaxAdvisory === undefined) {
  process.exitCode = selfTestFailures.length ? 1 : 0;
} else {
  const counts = issues.reduce((summary, issue) => {
    summary[issue.severity] = (summary[issue.severity] ?? 0) + 1;
    summary[issue.type] = (summary[issue.type] ?? 0) + 1;
    return summary;
  }, {});
  const localizedStringCount = fileEntries.reduce((count, file) => count + findZhStrings(file.source).length, 0);

  console.log(`Scanned files: ${files.length}`);
  console.log(`Localized zh strings found: ${localizedStringCount}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Critical: ${counts.critical ?? 0}`);
  console.log(`Warnings: ${counts.warning ?? 0}`);
  console.log(`Advisory: ${counts.advisory ?? 0}`);
  if (maxAdvisory !== undefined) {
    console.log(`Advisory ceiling: ${maxAdvisory}${rawMaxAdvisory === undefined ? " (committed baseline)" : " (--max-advisory)"}`);
  }

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

  const advisoryCount = counts.advisory ?? 0;
  const gateFailures = [];
  if (failOnCritical && (counts.critical ?? 0) > 0) {
    gateFailures.push(`${counts.critical} critical issue(s)`);
  }
  if (maxAdvisory !== undefined && advisoryCount > maxAdvisory) {
    gateFailures.push(
      `advisory count ${advisoryCount} exceeds ceiling ${maxAdvisory} — the zh-Hans backlog may only shrink; ` +
        "add explicit zhHans copy rather than raising ADVISORY_BASELINE"
    );
  }
  if (runSelfTest && selfTestFailures.length) {
    gateFailures.push(`converter self-test reported ${selfTestFailures.length} failure(s)`);
  }

  if (gateFailures.length) {
    console.log("\nGate FAILED:");
    for (const failure of gateFailures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  } else if (gateActive) {
    console.log(
      `\nGate passed (advisory ${advisoryCount}/${maxAdvisory ?? "n/a"}).` +
        (maxAdvisory !== undefined && advisoryCount < maxAdvisory
          ? ` Lower ADVISORY_BASELINE to ${advisoryCount} in scripts/audit-zh-hans.mjs to lock this in.`
          : "")
    );
  }
}
