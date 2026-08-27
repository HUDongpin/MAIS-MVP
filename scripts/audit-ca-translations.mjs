#!/usr/bin/env node
// Enforces the English-only policy for United States curriculum packs.
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
// All three live US California packs are ENFORCED. The 1,992 pre-existing translated
// items in the K-5 knowledge-point and G6-G12 banks were de-translated on 2026-08-27
// under the owner decision, so there is no longer a reported-only tier.
//
// Usage: node scripts/audit-ca-translations.mjs [--json out.json]
// Exits non-zero if an ENFORCED pack ships a localized field that differs from English.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PACKS = [
  { id: "ccss-textbook-practice-v1", enforced: true },
  { id: "us-ca-k5-knowledge-point-practice-v1", enforced: true },
  { id: "us-ca-math-g6-g12-generated-bank-v2-1500", enforced: true }
];

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
  const file = path.join(repoRoot, "data/generated-content", pack.id, "question-pack.json");
  let questions;
  try {
    questions = JSON.parse(readFileSync(file, "utf8")).questions;
  } catch (error) {
    console.error(`audit-ca-translations: cannot read ${pack.id} — ${error.message}`);
    process.exit(2);
  }

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
