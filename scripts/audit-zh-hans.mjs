#!/usr/bin/env node

/**
 * PRC Simplified Chinese (zh-Hans) audit.
 *
 * Two independent ratchets guard two different corpora:
 *
 *   GENERATED PACKS (data/generated-content/**.json) — pack-* findings are counted against
 *   scripts/zh-hans-pack-baseline.json. The packs are release-frozen data, so strict mode fails
 *   only when a pack-* type grows past its committed count. `--write-pack-baseline` rewrites it.
 *
 *   SOURCE COPY (app/, components/, data/, lib/, types/ .ts/.tsx) — advisory findings are counted
 *   against ADVISORY_BASELINE below. `--max-advisory <n>` overrides it. The number may only ever
 *   be revised DOWNWARD; anything that pushes the count back up fails the gate.
 *
 * Baseline history (source copy):
 *   5149  pre-ratchet high-water mark, measured before generated packs were scanned at all
 *   5022  audit fix only: an explicit zhHans sibling hidden behind a template literal's own `}`
 *         was being reported as missing (127 false positives)
 *   3498  explicit zhHans added for app/api, app/classroom, components/dashboard and
 *         components/teacher, measured on a pre-2026-08-28 tree
 *   3503  re-derived on current main (2026-08-28) after merging the above with the generated-pack
 *         scanning from PR #200; the count rose because the tree gained 157 files and 371 zh
 *         strings, and fell again as the window fix removed 148 false positives
 *
 * NOTE: `audit:zh-hans:strict` in package.json is frozen by the A10/A22 release-governance gate
 * (scripts/release-governance.test.mjs pins both the allowed script names and a sha256 of their
 * bodies), so both ratchets are wired INSIDE this script: `--fail-on-critical` enforces them.
 * Changing the npm script body would fail `npm run test:release-governance`.
 *
 * SELF-TEST (`--self-test`, also implicit whenever a gate is active):
 *   1. every traditionalToSimplifiedMap entry round-trips, and its target is stable under a
 *      second conversion pass (no map value is itself a Traditional key);
 *   2. no phrase-rule replacement reintroduces a Traditional key;
 *   3. every character in `traditionalRepertoire` has a map entry — the repertoire is the
 *      detection list, the map is the conversion list, and requiring the former to be a subset of
 *      the latter is what forces a mapping to exist;
 *   4. no derived zh-Hans contains a repertoire character. Deleting a map entry fails here:
 *      removing 閉 -> 闭 reproduces the original defect and renders "P1 试点閉环中…";
 *   5. no hand-written `zhHans:` literal in .ts/.tsx contains a Traditional character. This is the
 *      source-copy analogue of the pack-* Traditional check, and it is how 覆 -> 复 was caught:
 *      覆 is standard Simplified (覆盖), so that map entry was corrupting correct text.
 *
 * LIMITATION: a Traditional character in neither the map nor the repertoire cannot be caught by any
 * static check here — there is no bundled Unihan table, and release-governance pins package.json
 * dependencies, so OpenCC cannot simply be added. When new Traditional copy introduces one, add it
 * to `traditionalRepertoire`; check 3 then forces the map entry.
 *
 * Usage:
 *   node scripts/audit-zh-hans.mjs                     report only, never fails
 *   node scripts/audit-zh-hans.mjs --fail-on-critical  full gate
 *   node scripts/audit-zh-hans.mjs --max-advisory 3400 gate against an explicit ceiling
 *   node scripts/audit-zh-hans.mjs --self-test         converter self-test only
 *   node scripts/audit-zh-hans.mjs --write-pack-baseline
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ADVISORY_BASELINE = 3503;

const projectRoot = process.cwd();
const argv = process.argv.slice(2);
const failOnCritical = argv.includes("--fail-on-critical");
const selfTestRequested = argv.includes("--self-test");

function readFlagValue(flag) {
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
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
 * Traditional characters this codebase knows about: those its own zh copy uses, plus common ones
 * kept ahead of the copy so new strings convert rather than leak. DETECTION list; the map is the
 * CONVERSION list. Self-test check 3 requires this to be a subset of the map, so adding a character
 * here without its mapping fails the gate.
 */
const traditionalRepertoire = Array.from(
  "亂亙亞併侶俠倆們偵傑傭傷傾僅僑儘償儼兇冪剛剝劉劍勝勞匱卹卻厭厲叢吳呂唄啞喪嗆嗎嘔" +
  "嘸噸嚇嚨囑園執堅堿塢塵塹墊墮壇壩壺夠奐奪妝娛婦媽嫻孫寢寧寶尷屆屍屜岡島峽崑崗嵐嶇" +
  "嶼嶽巒巔巖帶幟廁廂廄廈廚廟廢廬張彆彌彎徠徹恥悵悽愴慚憂憊憐憑憤憲憶懇懲懷懺懼戀捨" +
  "捲掄掙揀揚摑摻撐撓撲擁擄擋擔擠擷擺擾攏攔攤攪敗敘斃斕斬曉曖曠曬桿樅樑樓樸樹橋橢檯" +
  "檸檻櫃櫥欄欖歎歐歲歷殤殮殲殺毀毆氈氫汙洶淺湧滬滯漲潑潔潯澀澤濁濕濟濤濱瀉瀋瀏瀝灑" +
  "灣災烏煙煥燁燦燴爍爐爺牆牘犧狹猶獄獅獵獷獻瑣瑪璽瓊甌甕畝畢疇瘋癘癡癢皚皺盃盜盞盧" +
  "眾瞼矚硯碩磚磯礙礦禍禦禱禿稈稜種穎窮竄竈竊競筍篤簫簾籃籌籟籬籲糧糰約紅納紐紛細紹" +
  "終絡給絨絲綜綠綱綻緒緝緣編縝縣縫縱繚繞繡繩繪繽纏纖罌罰罷羥羨義翹聞聳聶職聾脅脈脣" +
  "脹腫腸膚膠臍臘臟臺艙艦艱芻荊莖萊葉蒼蓋蓮蔔蔣蕩蕪蕭薈薑薔薩藍藥藪藹蘇蘊蘋蘭虛虜虧" +
  "蛺蛻蝕蝦蝸螞螢蟄蟬蟲蟻蠍蠟蠶蠻衊衛袞裊褲褸襖襤襪襯覈覓覦觀觴訃討訐訥訴診詐詔詠詩" +
  "詬詮誇誕誘誠誡誣誰誹諒諜諱諾謅謎謙謠謹譁譏譜譴譽讒讚豈豎豐豬貍貓貝貧貨貳貴買貼貽" +
  "賀賅賓賢賣賤賦賬賭賴購贅贈贊贍贓贖趕趙蹕蹣蹺躋躥軀車軋軌軒軛軟軸輒輛輟輩輪輯輻輾" +
  "轄轍轎轟轡辯農遊遜遞遷遺遼邁邇邏鄉鄒鄭鄰鄲鄴酈醜醞醬釀釁釗釘鈍鈔鈴鈺鉉鉤銖銘銜銬" +
  "銳銷鋁鋅鋪鋸鋼錐錘錠錦錳錶鍋鍛鍥鎊鎢鎮鏗鏟鏡鐮鐳鐵鐸鑄鑑鑠鑰鑲鑼鑽閂閃閉閏閒閘閡" +
  "閣閩闆闊闌闕闖闢闥陝陣陰陸陽隕際隴隸隻雋雛雜雞雲霧霽靂靄靈靚靜韁韃韌韓韜響頌頑頒" +
  "頗頡頹顆顎顏願顧顫顱顳颯颳颼飄飆飢飲飾餅養餓餚館餵饅饌馬馭馳駁駐駕駙駛駱騁騎騙騰" +
  "騷騾驅驕驛驢骯髒髖髮鬍鬢鬥鬧鬱魎魚魯鮑鮭鮮鯉鯊鯨鯽鰭鰲鱉鱔鱷鳥鳳鴉鴕鴦鴨鴻鵝鵬鵲" +
  "鶴鷥鷹鷺鸚鹵鹹鹼鹽麗麥麵黃黴鼉齋齒齬齲龍龜"
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
    // Scan the tail AFTER the matched literal: a template literal such as `${n} 題` carries a
    // closing brace of its own, and a window starting at `zh:` truncated on the first `}` would
    // cut the object off before an explicit `zhHans:` sibling could be seen.
    const literalEnd = match.index + match[0].length;
    const tail = source.slice(literalEnd, literalEnd + 360);
    const objectWindow = tail.slice(0, tail.indexOf("}") === -1 ? tail.length : tail.indexOf("}") + 1);
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

// Generated question/lesson packs live as JSON under data/generated-content and
// were invisible to this audit (it only walked .ts/.tsx), so no pack item was
// ever scanned. Walk every pack and collect the strings stored under keys named
// exactly "zhHans" — never "zh", which is Traditional by design on HK tracks.
function walkJsonFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkJsonFiles(entryPath);
    return path.extname(entry.name) === ".json" ? [entryPath] : [];
  });
}

function collectZhHansStrings(value, pointer, sink) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectZhHansStrings(item, `${pointer}[${index}]`, sink));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "zhHans" && typeof child === "string") {
        sink.push({ pointer: `${pointer}.${key}`, text: child });
      } else {
        collectZhHansStrings(child, pointer === "" ? key : `${pointer}.${key}`, sink);
      }
    }
  }
}

const packFiles = walkJsonFiles(path.join(projectRoot, "data/generated-content"));
const packEntries = packFiles.map((filePath) => {
  const relativePath = path.relative(projectRoot, filePath);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return { relativePath, strings: [] };
  }
  const strings = [];
  collectZhHansStrings(parsed, "", strings);
  return { relativePath, strings };
});

const issues = [];

for (const packEntry of packEntries) {
  for (const entry of packEntry.strings) {
    const remainingTraditional = traditionalCharacters.filter((char) => entry.text.includes(char));
    if (remainingTraditional.length) {
      issues.push({
        severity: "critical",
        type: "pack-traditional-character",
        file: `${packEntry.relativePath} :: ${entry.pointer}`,
        line: 0,
        original: entry.text,
        rendered: toPrcSimplified(entry.text),
        suggestion: `zhHans pack string contains Traditional characters: ${remainingTraditional.join(" ")}`
      });
    }
    for (const banned of bannedTerms) {
      if (entry.text.includes(banned.term)) {
        issues.push({
          severity: banned.type === "prc-grade" ? "warning" : "critical",
          type: `pack-${banned.type}`,
          file: `${packEntry.relativePath} :: ${entry.pointer}`,
          line: 0,
          original: entry.text,
          rendered: entry.text,
          suggestion: `${banned.term} -> ${banned.suggestion}`
        });
      }
    }
  }
}

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

  // 1. every map entry round-trips and its target is stable under a second pass.
  for (const [traditional, simplified] of traditionalMap) {
    if (!simplified) {
      failures.push(`map entry ${traditional} has an empty replacement`);
      continue;
    }
    const forward = Array.from(traditional).map((char) => traditionalMap.get(char) ?? char).join("");
    if (forward !== simplified) failures.push(`map entry ${traditional} -> ${simplified} did not round-trip (got ${forward})`);
    const residual = Array.from(simplified).filter((char) => keySet.has(char));
    if (residual.length) failures.push(`map value for ${traditional} still contains Traditional: ${residual.join(" ")}`);
    if (toPrcSimplified(simplified) !== simplified) failures.push(`map value for ${traditional} is not stable under a second conversion pass`);
  }

  // 2. no phrase-rule replacement reintroduces a Traditional character.
  for (const rule of phraseRules) {
    const residual = Array.from(rule.replacement).filter((char) => keySet.has(char));
    if (residual.length) failures.push(`phrase rule ${rule.source} -> ${rule.replacement} reintroduces: ${residual.join(" ")}`);
  }

  // 3. the repertoire must be fully covered by the map, otherwise check 4 is vacuous.
  const uncovered = traditionalRepertoire.filter((char) => !keySet.has(char));
  if (uncovered.length) failures.push(`traditionalRepertoire characters missing from traditionalToSimplifiedMap: ${uncovered.join(" ")}`);

  // 4. no derived zh-Hans may contain a known Traditional character.
  const probeSet = new Set([...keySet, ...traditionalRepertoire]);
  const derivedHits = [];
  for (const file of fileEntries) {
    for (const entry of findZhStrings(file.source)) {
      const rendered = toPrcSimplified(entry.text);
      const hits = Array.from(new Set(Array.from(rendered).filter((char) => probeSet.has(char))));
      if (hits.length) derivedHits.push(`${file.relativePath}:${entry.line} -> ${hits.join(" ")} in "${rendered.slice(0, 60)}"`);
    }
  }
  if (derivedHits.length) {
    failures.push(`derived zh-Hans still contains Traditional characters in ${derivedHits.length} string(s):`);
    failures.push(...derivedHits.slice(0, 20).map((hit) => `    ${hit}`));
  }

  // 5. hand-written zhHans literals must already be Simplified. This is the source-copy analogue
  // of the pack-* Traditional check; a hit means either the copy is wrong or a map entry is (覆).
  const literalHits = [];
  for (const file of fileEntries) {
    for (const match of file.source.matchAll(/\bzhHans\s*:\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
      const hits = Array.from(new Set(Array.from(match[2]).filter((char) => probeSet.has(char))));
      if (!hits.length) continue;
      const line = file.source.slice(0, match.index).split("\n").length;
      literalHits.push(`${file.relativePath}:${line} -> ${hits.join(" ")} in "${match[2].replace(/\s+/g, " ").slice(0, 60)}"`);
    }
  }
  if (literalHits.length) {
    failures.push(`hand-written zhHans literals contain Traditional characters in ${literalHits.length} string(s):`);
    failures.push(...literalHits.slice(0, 20).map((hit) => `    ${hit}`));
  }

  return failures;
}

const selfTestFailures = runSelfTest ? runConverterSelfTest() : [];

const counts = issues.reduce((summary, issue) => {
  summary[issue.severity] = (summary[issue.severity] ?? 0) + 1;
  summary[issue.type] = (summary[issue.type] ?? 0) + 1;
  return summary;
}, {});
const localizedStringCount = fileEntries.reduce((count, file) => count + findZhStrings(file.source).length, 0);

console.log("PRC Simplified Chinese Audit");
if (runSelfTest) {
  console.log(
    `Converter self-test: ${selfTestFailures.length === 0 ? "PASS" : "FAIL"} ` +
      `(${traditionalMap.size} map entries, ${phraseRules.length} phrase rules, ${traditionalRepertoire.length} repertoire characters)`
  );
  for (const failure of selfTestFailures) console.log(`  ${failure}`);
}
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

// Pack findings are ratcheted, not absolute: the packs are release-frozen data,
// so the committed baseline records today's known defects and strict mode fails
// only when a pack-* type grows past it (or when any non-pack critical exists).
const packBaselineUrl = new URL("./zh-hans-pack-baseline.json", import.meta.url);
const packBaseline = existsSync(packBaselineUrl) ? JSON.parse(readFileSync(packBaselineUrl, "utf8")) : {};
const packTypeCounts = {};
for (const issue of issues) {
  if (issue.type.startsWith("pack-")) packTypeCounts[issue.type] = (packTypeCounts[issue.type] ?? 0) + 1;
}
const packRegressions = Object.entries(packTypeCounts).filter(([type, count]) => count > (packBaseline[type] ?? 0));
const nonPackCriticalCount = issues.filter((issue) => issue.severity === "critical" && !issue.type.startsWith("pack-")).length;

console.log("\nGenerated-pack ratchet (scripts/zh-hans-pack-baseline.json):");
for (const [type, count] of Object.entries(packTypeCounts).sort()) {
  const allowed = packBaseline[type] ?? 0;
  const status = count > allowed ? "REGRESSION" : count < allowed ? "below baseline (tighten it)" : "at baseline";
  console.log(`  ${type}: ${count} (baseline ${allowed}) ${status}`);
}

if (process.argv.includes("--write-pack-baseline")) {
  writeFileSync(packBaselineUrl, `${JSON.stringify(packTypeCounts, null, 2)}\n`);
  console.log("Wrote scripts/zh-hans-pack-baseline.json");
}

const advisoryCount = counts.advisory ?? 0;
if (maxAdvisory !== undefined) {
  console.log(`\nAdvisory ceiling: ${advisoryCount}/${maxAdvisory}${rawMaxAdvisory === undefined ? " (committed baseline)" : " (--max-advisory)"}`);
}

if (selfTestRequested && !failOnCritical && rawMaxAdvisory === undefined) {
  process.exitCode = selfTestFailures.length ? 1 : 0;
} else {
  const gateFailures = [];
  if (failOnCritical && nonPackCriticalCount > 0) gateFailures.push(`${nonPackCriticalCount} non-pack critical issue(s)`);
  if (failOnCritical && packRegressions.length > 0) {
    gateFailures.push(`generated-pack regression: ${packRegressions.map(([type, count]) => `${type} ${count} > ${packBaseline[type] ?? 0}`).join(", ")}`);
  }
  if (maxAdvisory !== undefined && advisoryCount > maxAdvisory) {
    gateFailures.push(
      `advisory count ${advisoryCount} exceeds ceiling ${maxAdvisory} — the zh-Hans backlog may only shrink; ` +
        "add explicit zhHans copy rather than raising ADVISORY_BASELINE"
    );
  }
  if (runSelfTest && selfTestFailures.length) gateFailures.push(`converter self-test reported ${selfTestFailures.length} failure(s)`);

  if (gateFailures.length) {
    console.log("\nGate FAILED:");
    for (const failure of gateFailures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  } else if (gateActive) {
    console.log(`\nGate passed (advisory ${advisoryCount}/${maxAdvisory ?? "n/a"}, non-pack critical 0, no pack regression).`);
  }
}
