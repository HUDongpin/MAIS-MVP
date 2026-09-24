#!/usr/bin/env node
// Enforces the English-only policy across EVERY United States curriculum pack.
//
// Standing owner decision (reaffirmed 2026-08-27): American curriculum — California
// included — ships in English. There is no multi-language support for the US tracks.
// `zh` and `zhHans` exist on these records only because the shared LocalizedText shape
// requires them; they must mirror `en` exactly.
//
// This audit exists because the repo's other Chinese audits cannot see this content at
// all: scripts/audit-zh-hans.mjs and scripts/audit-hk-chinese.mjs walk only .ts/.tsx
// under app|components|data|lib|types, while every question pack is JSON under
// data/generated-content/. That blind spot is what allowed a translation workstream to
// be started against a track that is not supposed to be translated.
//
// Scope is every US pack under data/generated-content, California and Arkansas and
// Florida, live and dormant alike. Scoping an earlier version of this audit to
// California alone left 8,028 non-English fields in the two Arkansas banks passing
// silently — the policy is "American curriculum", not "California".
//
// Usage: node scripts/audit-ca-translations.mjs [--json out.json]
// Exits non-zero if an ENFORCED pack ships a localized field that differs from English.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Every generated-content pack on a United States track, live or dormant. A dormant
// pack is still enforced: it carries the policy with it if it is ever promoted, which
// is exactly how us-ar-math-g6-g12 accumulated 4,108 non-English fields unnoticed.
const PACKS = [
  { id: "ccss-textbook-practice-v1", file: "question-pack.json" },
  { id: "us-ca-k5-knowledge-point-practice-v1", file: "question-pack.json" },
  { id: "us-ca-math-g6-g12-generated-bank-v2-1500", file: "question-pack.json" },
  { id: "us-ca-math-k-g5-generated-bank-v3-deepseek-1500", file: "question-pack.json" },
  { id: "us-ar-math-k-g5-generated-bank-v1-1500", file: "question-pack.json" },
  { id: "us-ar-math-g6-g12-generated-bank-v1-1500", file: "question-pack.json" },
  { id: "us-ar-math-textbooks-v1", file: "textbook-pack.json" },
  { id: "us-fl-math-middle-school-textbooks-v1", file: "textbook-pack.json" },
  { id: "us-ca-math-textbooks-v1", file: "textbook-pack.json" }
].map((pack) => ({ ...pack, enforced: true }));

/** Every localized {en, zh, zhHans} object reachable from a record. */
function* localizedNodes(node) {
  if (Array.isArray(node)) {
    for (const child of node) yield* localizedNodes(child);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (typeof node.en === "string" && ("zh" in node || "zhHans" in node)) yield node;
  for (const value of Object.values(node)) yield* localizedNodes(value);
}

const findings = [];
const summary = [];
let enforcedViolations = 0;

for (const pack of PACKS) {
  const file = path.join(repoRoot, "data/generated-content", pack.id, pack.file);
  let root;
  try {
    root = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`audit-ca-translations: cannot read ${pack.id}/${pack.file} — ${error.message}`);
    process.exit(2);
  }
  // Question banks expose `questions`; textbook packs nest problems under books/chapters,
  // so walk the whole document rather than a fixed key.
  const questions = root.questions ?? root.books ?? [];

  let fields = 0;
  const offenders = new Set();
  for (const question of questions) {
    for (const node of localizedNodes(question)) {
      fields += 1;
      if (node.zh !== node.en || (node.zhHans ?? node.en) !== node.en) {
        offenders.add(question.id);
        if (pack.enforced && findings.length < 40) {
          findings.push({
            pack: pack.id,
            id: question.id,
            en: node.en.slice(0, 60),
            zh: String(node.zh).slice(0, 60)
          });
        }
      }
    }
  }

  if (pack.enforced) enforcedViolations += offenders.size;
  summary.push({ pack: pack.id, enforced: pack.enforced, questions: questions.length, fields, offenders: offenders.size });
}

console.log("United States curriculum English-only audit");
for (const row of summary) {
  const label = row.enforced ? "ENFORCED" : "reported";
  const state = row.offenders === 0 ? "English-only ✓" : `${row.offenders} item(s) carry non-English text`;
  console.log(`  [${label}] ${row.pack}: ${row.questions} items, ${row.fields} localized fields — ${state}`);
}

const pending = summary.filter((r) => !r.enforced && r.offenders > 0).reduce((a, r) => a + r.offenders, 0);
if (pending > 0) {
  console.log(
    `\n${pending} pre-existing item(s) across the reported packs still carry Chinese. ` +
      "These predate the reaffirmed policy and are awaiting an owner decision; " +
      "flip those packs to enforced here once it is made."
  );
}

console.log(`\nEnforced violations: ${enforcedViolations}`);
for (const finding of findings) {
  console.log(`  [${finding.pack}] ${finding.id}\n      en: ${finding.en}\n      zh: ${finding.zh}`);
}

const jsonFlag = process.argv.indexOf("--json");
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(process.argv[jsonFlag + 1], `${JSON.stringify({ summary, pending, findings }, null, 2)}\n`);
  console.log(`Wrote ${process.argv[jsonFlag + 1]}`);
}

if (enforcedViolations > 0) process.exit(1);
