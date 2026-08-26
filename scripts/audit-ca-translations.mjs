#!/usr/bin/env node
// Audits the California translation table that build-ccss-practice-pack.mjs consumes.
//
// This exists because the repo's other Chinese audits cannot see this content at all:
// scripts/audit-zh-hans.mjs and scripts/audit-hk-chinese.mjs both walk only .ts/.tsx
// under app|components|data|lib|types, while every question pack is JSON under
// data/generated-content/. That blind spot is why 810 live items shipped with
// zh === zhHans === en (2026-08-26 California content QA, §4.1).
//
// Checks, per entry:
//   P0 number-drift      the digits in zh/zhHans differ from the English
//   P0 script-leak       Simplified characters in zh, or Traditional in zhHans
//   P0 forbidden-term    a term corrected on 2026-08-26 has been reintroduced
//   P1 untranslated      zh or zhHans is byte-identical to prose English
//   P1 empty             zh or zhHans missing on a non-null entry
//   P2 ascii-multiply    ASCII "x" used as a multiplication sign in Chinese text
//
// Usage: node scripts/audit-ca-translations.mjs [--json out.json]
// Exits non-zero on any P0/P1.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tablePath = path.join(
  repoRoot,
  "data/generated-content/ccss-textbook-source-v1/translations.json"
);

/** Traditional→Simplified pairs, read from the app's own map so the two cannot drift. */
function loadScriptSets() {
  const source = readFileSync(path.join(repoRoot, "lib/i18n.ts"), "utf8");
  const start = source.indexOf("export const traditionalToSimplifiedMap");
  const body = source.slice(start, source.indexOf("\n};", start));
  const traditional = new Set();
  const simplified = new Set();
  // Entries look like `佈: "布",` — the Traditional key is an unquoted identifier.
  for (const match of body.matchAll(/([一-鿿])\s*:\s*"([一-鿿])"/g)) {
    if (match[1] === match[2]) continue; // unchanged between scripts — not a signal
    traditional.add(match[1]);
    simplified.add(match[2]);
  }
  // A parser that silently matches nothing turns this whole audit into a no-op — the
  // exact failure mode this audit exists to catch. Fail loudly instead.
  if (traditional.size < 100) {
    console.error(
      `audit-ca-translations: parsed only ${traditional.size} script pairs from lib/i18n.ts — ` +
        "the map format changed and the script-leak check would be vacuous."
    );
    process.exit(2);
  }
  return { traditional, simplified };
}

/**
 * Characters that are simplification targets but are ALSO valid Traditional characters
 * in their own right, because two distinct Traditional characters merged into one
 * Simplified form. 週→周 puts 周 on the Simplified side of the map, yet 周長
 * ("perimeter") is correct Traditional. Flagging these produces false positives, and a
 * gate that cries wolf gets ignored — so they are excluded from the leak check.
 */
const BOTH_SCRIPTS_VALID = new Set([
  ..."周里后面干台制表只系松板谷划布占出云曲别向志愿钟覆" // merged pairs: 週/周, 裡/里, 後/后, 麵/面, 乾/干, 臺/台, 製/制 …
]);

const { traditional, simplified } = loadScriptSets();
// These are valid in BOTH scripts, so they are evidence of nothing on either side:
// 周 sits on the Simplified side (週→周) while 覆 sits on the Traditional side (覆→复),
// yet 周長 and 覆盖 are both correct. Clear them from both sets, not just one.
for (const ch of BOTH_SCRIPTS_VALID) {
  simplified.delete(ch);
  traditional.delete(ch);
}

/** Terms corrected on 2026-08-26. Reintroducing one is a regression, not a preference. */
const FORBIDDEN = [
  { term: "方角", field: "both", use: "直角" },
  { term: "數線", field: "zh", use: "數軸" },
  { term: "数线", field: "zhHans", use: "数轴" },
  { term: "周界", field: "both", use: "周長 / 周长" },
  { term: "十進位", field: "zh", use: "十進制" },
  { term: "十进位", field: "zhHans", use: "十进制" },
  { term: "座標", field: "zh", use: "坐標" },
  { term: "资料不足", field: "zhHans", use: "信息不足" }
];

const numbersIn = (value) => (String(value).match(/\d+(?:\.\d+)?/g) ?? []).sort();

/**
 * Every number written in the English must survive into the Chinese. The reverse is not
 * required: English routinely spells small numbers as words where Chinese uses digits
 * ("One more than 27" -> 「比 27 多 1」, "Count by 5s" -> 「5 個 5 個地數」, "7 over 4"
 * -> 「7/4」), so an exact multiset match produces false positives. A dropped or altered
 * digit — the defect that actually matters — is still caught.
 */
function numbersDropped(en, translated) {
  const remaining = numbersIn(translated);
  for (const number of numbersIn(en)) {
    const at = remaining.indexOf(number);
    if (at === -1) return number;
    remaining.splice(at, 1);
  }
  return null;
}
const hasProse = (value) => /[A-Za-z]{4,}/.test(value);

const table = JSON.parse(readFileSync(tablePath, "utf8"));
const findings = [];
const add = (severity, check, key, detail) =>
  findings.push({ severity, check, key: key.slice(0, 90), detail });

let translated = 0;
let pending = 0;

for (const [en, entry] of Object.entries(table)) {
  if (entry === null) {
    pending += 1;
    continue;
  }
  translated += 1;

  for (const field of ["zh", "zhHans"]) {
    const value = entry[field];
    if (typeof value !== "string" || value.trim() === "") {
      add("P1", "empty", en, `${field} is missing`);
      continue;
    }
    if (value === en && hasProse(en)) add("P1", "untranslated", en, `${field} is still English`);
    const dropped = numbersDropped(en, value);
    if (dropped !== null) {
      add("P0", "number-drift", en, `${field}="${value}" — the number ${dropped} from the English is missing`);
    }

    const wrongScript = [...value].filter((ch) =>
      field === "zh" ? simplified.has(ch) : traditional.has(ch)
    );
    if (wrongScript.length) {
      const kind = field === "zh" ? "Simplified in zh" : "Traditional in zhHans";
      add("P0", "script-leak", en, `${kind}: ${[...new Set(wrongScript)].join(" ")}`);
    }

    for (const rule of FORBIDDEN) {
      if (rule.field !== "both" && rule.field !== field) continue;
      if (value.includes(rule.term)) {
        add("P0", "forbidden-term", en, `${field} uses ${rule.term} — use ${rule.use}`);
      }
    }

    if (/\d\s*x\s*\d/.test(value)) {
      add("P2", "ascii-multiply", en, `${field} uses ASCII "x" for multiplication — use ×`);
    }
  }
}

const total = translated + pending;
const bySeverity = (s) => findings.filter((f) => f.severity === s).length;

console.log("California translation table audit");
console.log(`  entries: ${total}  translated: ${translated}  pending(null): ${pending}`);
console.log(`  coverage: ${total === 0 ? 0 : ((translated / total) * 100).toFixed(1)}%`);
console.log(
  `Findings: ${findings.length} (P0: ${bySeverity("P0")}, P1: ${bySeverity("P1")}, P2: ${bySeverity("P2")})`
);
for (const finding of findings.slice(0, 40)) {
  console.log(`  [${finding.severity}][${finding.check}] ${finding.key} — ${finding.detail}`);
}
if (findings.length > 40) console.log(`  … and ${findings.length - 40} more`);

const jsonFlag = process.argv.indexOf("--json");
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(
    process.argv[jsonFlag + 1],
    `${JSON.stringify({ total, translated, pending, findings }, null, 2)}\n`
  );
  console.log(`Wrote ${process.argv[jsonFlag + 1]}`);
}

if (bySeverity("P0") > 0 || bySeverity("P1") > 0) process.exit(1);
