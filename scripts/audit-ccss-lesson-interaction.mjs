#!/usr/bin/env node
/**
 * Interaction-copy QA gate for the ported CCSS interactive lessons — the lesson
 * core the California math lesson page renders.
 *
 * Static prose is covered by `audit-ccss-lesson-classes.mjs` and the assignment
 * contract test; this gate covers what those cannot see: the sentences the
 * lesson *builds from live control values*, which read correctly at the seed
 * value and break at the ends of their own sliders.
 *
 * Rules:
 *   1. plural agreement — a readout that interpolates a control whose minimum
 *      is 1 must not hard-code a plural noun ("1 rows", "1 apples")
 *   2. standard citation — a CCSS code named in a lesson's Math Check must be
 *      one the lesson is registered under in ccssTextbookRegistry
 *
 * SCOPE: rule 1 is a cheap pre-check, not the authority. It can only link a
 * readout to its control when the minimum is declared inline
 * (`<Stepper … min={1}>`, `<input min={1}>`). Lessons that wrap their controls
 * in a bespoke component — `ratio-double-number-line`'s `Control`, which floors
 * at 1 via `Math.max(1, value - 1)` — are invisible to it, and so are readouts
 * whose noun is separated from its value by markup. Those were found only by
 * rendering the page. `scripts/audit-us-ca-lesson-page-runtime.mjs` drives every
 * control to its floor in a browser and is the authoritative check; run it
 * before claiming this class is clean.
 *
 * Usage: node scripts/audit-ccss-lesson-interaction.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = path.join(root, "components/lesson/ccss/lessons");
const registrySource = readFileSync(path.join(root, "data/ccssTextbookRegistry.ts"), "utf8");

const findings = [];

// Nouns whose singular is the bare word minus a trailing "s". Deliberately a
// closed list: an open-ended "word ending in s" rule flags too much prose.
const NOUNS = [
  "cubes", "counters", "squares", "units", "sides", "corners", "parts", "pieces",
  "rows", "columns", "shares", "tens", "ones", "hundreds", "groups", "objects",
  "items", "apples", "spoons", "cups", "batches", "steps", "jumps", "minutes",
  "hours", "degrees", "points", "packs", "pens", "triangles", "circles",
  "rectangles", "blocks", "tiles", "dots", "bars", "students", "vans", "seats",
  "coins", "cents", "miles", "copies", "layers", "faces", "edges", "terms",
  "factors", "multiples", "solutions", "roots", "trials", "cookies", "rods"
].join("|");

// "1 times x" is idiomatic multiplication language, so "times" is not listed.

for (const file of readdirSync(lessonDir).sort()) {
  if (!file.endsWith(".tsx")) continue;
  const src = readFileSync(path.join(lessonDir, file), "utf8");
  const lines = src.split("\n");

  // --- 1. plural agreement on controls that bottom out at 1 ---------------
  const oneVars = new Set();
  const collect = (re) => {
    for (const m of src.matchAll(re)) oneVars.add(m[1]);
  };
  collect(/<Stepper[^>]*?value=\{(\w+)\}[^>]*?min=\{1\}/gs);
  collect(/<Stepper[^>]*?min=\{1\}[^>]*?value=\{(\w+)\}/gs);
  collect(/min=\{1\}[^\n]*?value=\{(\w+)\}/g);
  collect(/value=\{(\w+)\}[^\n]*?min=\{1\}/g);

  for (const variable of [...oneVars].sort()) {
    const readout = new RegExp(
      `\\{${variable}\\}(?:\\{" "\\})?\\s*(?:</strong>\\s*(?:\\{" "\\})?\\s*)?(${NOUNS})\\b`,
      "g"
    );
    const templated = new RegExp(`\\$\\{${variable}\\}\\s+(${NOUNS})\\b`, "g");
    const guard = new RegExp(`${variable}\\s*===\\s*1`);

    lines.forEach((line, index) => {
      if (guard.test(line)) return;
      for (const re of [readout, templated]) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          findings.push({
            rule: "plural-agreement",
            where: `${file}:${index + 1}`,
            detail: `"${variable}" bottoms out at 1 but the readout hard-codes "${m[1]}"`
          });
        }
      }
    });
  }

  // --- 2. Math Check cites only standards the lesson is registered under ---
  const start = src.indexOf("<MathCheck");
  if (start < 0) {
    findings.push({ rule: "missing-math-check", where: file, detail: "no MathCheck block" });
    continue;
  }
  const mathCheck = src.slice(start, src.indexOf("</MathCheck>", start));
  const cited = new Set(
    [...mathCheck.matchAll(/\b((?:K|[1-8])\.[A-Z]{1,3}\.[A-D]\.\d+|[A-Z]-[A-Z]{1,3}\.[A-D]?\.?\d+)\b/g)].map((m) => m[1])
  );
  if (!cited.size) continue;

  const slug = file.replace(/\.tsx$/, "");
  const entry = new RegExp(`"${slug}":\\s*\\{[\\s\\S]*?standardIds:\\s*\\[([^\\]]*)\\]`).exec(registrySource);
  if (!entry) continue;
  const declared = [...entry[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  for (const code of [...cited].sort()) {
    const consistent = declared.some((d) => d === code || d.startsWith(code) || code.startsWith(d));
    if (!consistent) {
      findings.push({
        rule: "standard-citation",
        where: file,
        detail: `Math Check cites ${code}; lesson is registered under ${declared.join(", ") || "(none)"}`
      });
    }
  }
}

const total = readdirSync(lessonDir).filter((f) => f.endsWith(".tsx")).length;
console.log(`audit-ccss-lesson-interaction: ${total} interactive lessons`);
if (!findings.length) {
  console.log("✓ no interaction-copy defects");
  process.exit(0);
}

const byRule = new Map();
for (const finding of findings) {
  byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
}
for (const [rule, list] of [...byRule].sort()) {
  console.log(`\n${rule}: ${list.length}`);
  for (const finding of list) console.log(`  ${finding.where} — ${finding.detail}`);
}
console.log(`\n✗ ${findings.length} interaction-copy defect(s)`);
process.exit(1);
