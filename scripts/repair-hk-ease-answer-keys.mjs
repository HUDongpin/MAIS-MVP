#!/usr/bin/env node
/**
 * Repairs answer keys in the Hong Kong EASE practice pack.
 *
 * The pack stores answers as DISPLAY text rather than as values, so a learner
 * who solves an item correctly and types the plain answer is graded wrong. The
 * grader (lib/server/answerMatching.ts) now understands LaTeX fractions and
 * Chinese unit suffixes, which covers most of it; what is left needs the intent
 * of the key, not more string rules:
 *
 *   - "3/2 (or 1 1/2)"                  two alternates written into one string
 *   - "(4500 - 2650) x 15 = ... = 27750" the whole working line as the key
 *   - "两者相等"                          key stored in Simplified Chinese
 *
 * This runs against the generated pack and is idempotent, so a pack
 * regeneration can re-apply it instead of silently dropping the repairs.
 *
 *   node scripts/repair-hk-ease-answer-keys.mjs [--check]
 *
 * --check exits non-zero if any repair is still outstanding, for CI.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK_PATH = path.join(repoRoot, "data/generated-content/hk-ease-practice-bank-v1/question-pack.json");

/** Text corrections to the shipped prompt/answer fields, with the reason. */
const TEXT_FIXES = [
  {
    id: "hk-ease-883",
    field: "promptZh",
    from: "卷",
    to: "捲",
    all: true,
    reason: "Roll classifier: HK Traditional is 捲; 卷 is the scroll/exam-paper sense."
  },
  {
    id: "hk-ease-812",
    field: "promptZh",
    from: "俊稀",
    to: "俊希",
    all: true,
    reason: "Given name 俊希; 俊稀 garden-paths as 俊 + 稀有."
  }
];

/**
 * Keys stored in Simplified Chinese. The Traditional form becomes the key, and
 * the Simplified form stays accepted so no learner is punished for the switch.
 */
const SIMPLIFIED_KEY_FIXES = [
  { id: "hk-ease-10569", traditional: "兩者相等", simplified: "两者相等" },
  { id: "hk-ease-10599", traditional: "兩者相等", simplified: "两者相等" }
];

/** Accepted-answer values that are numerically wrong and must not grade correct. */
const BAD_ACCEPTED = [
  { id: "hk-ease-10671", value: "14/5kg", reason: "14/5 kg = 2.8 kg; the answer is 1 4/5 kg = 1.8 kg." }
];

const stripLatex = (value) =>
  String(value)
    .replace(/\\[()[\]]/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:mathbf|mathrm|boxed|bf|rm)\{([^{}]*)\}/g, "$1")
    .replace(/\\,|\\!|\\;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const expandFractions = (value) => {
  let out = String(value);
  for (let pass = 0; pass < 6; pass += 1) {
    const next = out
      .replace(/(\d)\s*\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1 $2/$3")
      .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2");
    if (next === out) break;
    out = next;
  }
  return out.replace(/\\times/g, "×").replace(/\\div/g, "÷").trim();
};

/** "3/2 (or 1 1/2)" -> ["3/2", "1 1/2"] */
function orAlternates(key) {
  const match = stripLatex(key).match(/^(.+?)\s*[（(]\s*or\s+(.+?)\s*[)）]\s*$/i);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

/**
 * "(4500 - 2650) × 15 = 1850 × 15 = 27750" -> "27750".
 * Only when the tail after the last "=" is a bare value, so a key whose final
 * term is itself an expression (a factorisation such as "120 = 2^3 × 3 × 5")
 * keeps that expression as the answer rather than a fragment of it.
 */
function workingLineFinalValue(key) {
  const flat = expandFractions(stripLatex(key));
  if (!flat.includes("=")) return null;
  if (/[，。；、]/.test(flat)) return null;
  // A multi-part key carries one answer per part, so the value after the last
  // "=" is only part (b). Accepting it alone would credit a partial answer.
  if (/\([a-dA-D]\)/.test(flat)) return null;
  const tail = flat.split("=").pop().trim();
  return /^-?\d+(?:\.\d+)?$/.test(tail) ? tail : null;
}

function addAccepted(question, value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  question.acceptedAnswers = question.acceptedAnswers ?? [];
  if (question.acceptedAnswers.some((entry) => String(entry).trim() === trimmed)) return false;
  question.acceptedAnswers.push(trimmed);
  return true;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8"));
  const byId = new Map(pack.questions.map((question) => [question.id, question]));
  const changes = [];

  for (const fix of TEXT_FIXES) {
    const question = byId.get(fix.id);
    if (!question) continue;
    for (const field of [fix.field, fix.field.replace(/Zh$/, "En")]) {
      const current = question[field];
      if (typeof current !== "string" || !current.includes(fix.from)) continue;
      question[field] = fix.all ? current.split(fix.from).join(fix.to) : current.replace(fix.from, fix.to);
      changes.push(`${fix.id}: ${field} ${fix.from} -> ${fix.to}`);
    }
  }

  for (const fix of SIMPLIFIED_KEY_FIXES) {
    const question = byId.get(fix.id);
    if (!question) continue;
    if (String(question.answer).trim() === fix.simplified) {
      question.answer = fix.traditional;
      changes.push(`${fix.id}: key ${fix.simplified} -> ${fix.traditional} (Traditional)`);
    }
    if (addAccepted(question, fix.simplified)) changes.push(`${fix.id}: keep ${fix.simplified} accepted`);
    if (addAccepted(question, fix.traditional)) changes.push(`${fix.id}: accept ${fix.traditional}`);
  }

  for (const bad of BAD_ACCEPTED) {
    const question = byId.get(bad.id);
    if (!question?.acceptedAnswers) continue;
    const before = question.acceptedAnswers.length;
    question.acceptedAnswers = question.acceptedAnswers.filter((entry) => String(entry).trim() !== bad.value);
    if (question.acceptedAnswers.length !== before) changes.push(`${bad.id}: drop wrong accepted "${bad.value}"`);
  }

  for (const question of pack.questions) {
    if (question.type === "multiple-choice") continue;
    const key = String(question.answer ?? "");
    if (!key) continue;

    const alternates = orAlternates(key);
    if (alternates) {
      for (const alternate of alternates) {
        if (addAccepted(question, alternate)) changes.push(`${question.id}: accept alternate "${alternate}"`);
      }
    }

    const finalValue = workingLineFinalValue(key);
    if (finalValue && addAccepted(question, finalValue)) {
      changes.push(`${question.id}: accept final value "${finalValue}" from working line`);
    }

    // A key written as display LaTeX also has to accept its plain-text reading.
    const plain = expandFractions(stripLatex(key));
    if (plain && plain !== key && addAccepted(question, plain)) {
      changes.push(`${question.id}: accept plain-text form "${plain}"`);
    }
  }

  if (checkOnly) {
    if (changes.length) {
      console.error(`HK EASE answer-key repairs outstanding: ${changes.length}`);
      changes.slice(0, 20).forEach((line) => console.error(`  ${line}`));
      process.exit(1);
    }
    console.log("HK EASE answer keys: no repairs outstanding.");
    return;
  }

  if (!changes.length) {
    console.log("HK EASE answer keys: already repaired, nothing to do.");
    return;
  }

  fs.writeFileSync(PACK_PATH, `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`HK EASE answer keys repaired: ${changes.length} change(s).`);
  changes.slice(0, 30).forEach((line) => console.log(`  ${line}`));
  if (changes.length > 30) console.log(`  ...and ${changes.length - 30} more.`);
}

main();
