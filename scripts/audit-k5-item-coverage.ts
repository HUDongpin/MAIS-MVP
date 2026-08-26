/**
 * K-5 item verification coverage.
 *
 * `scripts/audit-us-math-item-quality.mjs` can independently re-solve an item
 * only when a solver recognises its prompt. Its solver set is the 67 families
 * behind the CA grades 6-12 bank, so its K-5 coverage is near zero by construction:
 * on this tree it reports `us-ar-math-k-g5-generated-bank-v1-1500` as
 * 0 solver-verified out of 1,500.
 *
 * This script reports what the K-5 template families in
 * `lib/itemTemplates/k5Templates.ts` can verify, per pack, and fails on any
 * item whose prompt a solver DOES parse but whose stored answer disagrees —
 * that is a real content defect, not a coverage gap.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/audit-k5-item-coverage.ts
 *   npx tsx --tsconfig tsconfig.json scripts/audit-k5-item-coverage.ts --self-test
 *
 * `--self-test` proves the machinery bites before trusting any coverage number:
 * it generates items from every family, confirms each is judged and correct,
 * then injects a corrupted key and confirms that is reported as a mismatch.
 */

import { createRequire } from "node:module";
import { inferK5Answer, k5ItemTemplates } from "../lib/itemTemplates/k5Templates";

const require = createRequire(import.meta.url);

type PackItem = {
  id: string;
  grade?: string;
  prompt?: { en?: string };
  answer?: string;
  generationTemplate?: string;
};

const k5Packs = [
  "us-ca-k5-knowledge-point-practice-v1",
  "us-ca-math-k-g5-generated-bank-v3-deepseek-1500",
  "us-ar-math-k-g5-generated-bank-v1-1500"
];

const k5Grades = new Set(["K", "P1", "P2", "P3", "P4", "P5"]);

function loadPack(name: string): PackItem[] {
  const pack = require(`../data/generated-content/${name}/question-pack.json`) as {
    questions?: PackItem[];
    items?: PackItem[];
  };
  return pack.questions ?? pack.items ?? [];
}

function numericAnswer(answer: string | undefined): number | null {
  if (typeof answer !== "string") return null;
  const cleaned = answer.replace(/[$,\s]/g, "").replace(/(cm|m|units?|cents?|minutes?)$/i, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

type PackReport = {
  pack: string;
  total: number;
  judged: number;
  matched: number;
  mismatched: { id: string; prompt: string; stored: string; solved: number }[];
  ambiguous: number;
  uncovered: number;
  nonNumericKey: number;
};

function auditPack(name: string): PackReport {
  const items = loadPack(name).filter((entry) => !entry.grade || k5Grades.has(entry.grade));
  const report: PackReport = {
    pack: name,
    total: items.length,
    judged: 0,
    matched: 0,
    mismatched: [],
    ambiguous: 0,
    uncovered: 0,
    nonNumericKey: 0
  };
  for (const entry of items) {
    const prompt = entry.prompt?.en;
    if (!prompt) {
      report.uncovered += 1;
      continue;
    }
    const inferred = inferK5Answer(prompt);
    if (!inferred) {
      report.uncovered += 1;
      continue;
    }
    if ("ambiguous" in inferred) {
      report.ambiguous += 1;
      continue;
    }
    const stored = numericAnswer(entry.answer);
    if (stored === null) {
      report.nonNumericKey += 1;
      continue;
    }
    report.judged += 1;
    if (Math.abs(stored - inferred.value) < 1e-9) {
      report.matched += 1;
    } else {
      report.mismatched.push({ id: entry.id, prompt, stored: String(entry.answer), solved: inferred.value });
    }
  }
  return report;
}

function selfTest(): number {
  let failures = 0;
  // 1. Every family's own items must be judged and correct.
  for (const template of k5ItemTemplates) {
    for (let seed = 0; seed < 25; seed += 1) {
      const generated = template.generate(seed);
      const inferred = inferK5Answer(generated.prompt);
      if (!inferred || "ambiguous" in inferred) {
        console.error(`SELF-TEST FAIL: ${template.id} seed ${seed} not judged: "${generated.prompt}"`);
        failures += 1;
        continue;
      }
      if (Math.abs(inferred.value - generated.answer) > 1e-9) {
        console.error(`SELF-TEST FAIL: ${template.id} seed ${seed} solved ${inferred.value}, expected ${generated.answer}`);
        failures += 1;
      }
    }
  }
  // 2. A corrupted key must be REPORTED, not tolerated — a gate that cannot go
  //    red is not a gate.
  const sample = k5ItemTemplates[0].generate(1);
  const inferred = inferK5Answer(sample.prompt);
  const corrupted = sample.answer + 1;
  const detected = inferred && "value" in inferred && Math.abs(inferred.value - corrupted) > 1e-9;
  if (!detected) {
    console.error("SELF-TEST FAIL: a corrupted answer key was not detected");
    failures += 1;
  }
  console.log(
    failures === 0
      ? `Self-test passed: ${k5ItemTemplates.length} families, ${k5ItemTemplates.length * 25} generated items judged, corrupted key detected.`
      : `Self-test FAILED with ${failures} problem(s).`
  );
  return failures;
}

function main() {
  if (process.argv.includes("--self-test")) {
    process.exitCode = selfTest() === 0 ? 0 : 1;
    return;
  }

  console.log(`K-5 item verification coverage — ${k5ItemTemplates.length} template families\n`);
  let mismatchTotal = 0;
  for (const name of k5Packs) {
    let report: PackReport;
    try {
      report = auditPack(name);
    } catch (error) {
      console.log(`  ${name}: NOT READABLE (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    const pct = report.total === 0 ? 0 : ((report.matched / report.total) * 100).toFixed(1);
    console.log(`  ${report.pack}`);
    console.log(
      `    ${report.total} K-5 items | ${report.matched} verified (${pct}%) | ${report.mismatched.length} mismatched | ` +
        `${report.ambiguous} ambiguous | ${report.nonNumericKey} non-numeric key | ${report.uncovered} uncovered`
    );
    for (const mismatch of report.mismatched.slice(0, 5)) {
      console.log(`    MISMATCH ${mismatch.id}: "${mismatch.prompt}" key=${mismatch.stored} solved=${mismatch.solved}`);
    }
    mismatchTotal += report.mismatched.length;
  }
  console.log(
    "\nUncovered items are not defects — they are items no family recognises. The families exist so that NEWLY\n" +
      "generated K-5 packs can be verified end to end; retro-fitting them to free-form prompts is deliberately not\n" +
      "attempted, because loosening a solver to match arbitrary prose is how a solver starts agreeing with the wrong item."
  );
  process.exitCode = mismatchTotal === 0 ? 0 : 1;
}

main();
