/**
 * REPORTING TOOL, NOT A GATE — the instrument was tested and found invalid for
 * this corpus. It is kept because the per-page numbers are still useful input
 * to a human judgement, and deleting it would invite someone to rebuild it and
 * repeat the mistake.
 *
 * Why it is not a gate: Flesch-Kincaid penalises exactly the domain vocabulary
 * the CCSS standards mandate. Scored against the standards' own text:
 *
 *     3.G.A.1 verbatim ("...rhombuses, rectangles, and squares as examples of
 *     quadrilaterals")            target G3  ->  reads G15.6
 *     1.OA.A.1 verbatim           target G1  ->  reads G14.5
 *     plain Grade 1 story prose   target G1  ->  reads G4.9
 *
 * A gate built on this would flag the curriculum it implements. Its 23 "findings"
 * against our pages were the words "attributes", "quadrilateral", "subtraction"
 * and "equation" — which are the lesson, not a defect.
 *
 * Is the student-facing prose written at the grade band it targets?
 *
 * A publisher checks readability before shipping: a Kindergarten lesson written
 * at a sixth-grade reading level is a content defect even when every number in
 * it is right. Twelve rounds here audited whether the text is TRUE; none asked
 * whether the intended reader can read it.
 *
 * Flesch-Kincaid grade level, computed on prose only — formulas, standard codes
 * and bare numerals are stripped first, because "3.NF.A.1" and "2 × 3 = 6" are
 * not sentences and wreck a syllable count.
 *
 * The band is deliberately generous. Maths prose scores high because the nouns
 * are long ("denominator", "perpendicular"), and those words are the lesson. Only
 * a gap of more than GRACE grades above target is reported.
 *
 * Usage: npx tsx scripts/audit-us-ca-lesson-readability.mts [--list]
 */
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";

const GRACE = 4;

function targetGrade(topicId: string): number | null {
  if (/-k-k-/.test(topicId)) return 0;
  const p = topicId.match(/-p(\d)-/);
  if (p) return Number(p[1]);
  const s = topicId.match(/-s(\d)-/);
  if (s) return Number(s[1]) + 6; // s1 = grade 7
  return null;
}

/** Strip everything that is notation rather than language. */
function proseOnly(text: string): string {
  return text
    .replace(/\b[0-9K]+\.[A-Z]{1,3}(\.[A-Z])?\.\d+\b/g, " ")        // 3.NF.A.1
    .replace(/\b[A-Z]-[A-Z]{2,4}\.\d+\b/g, " ")                      // G-SRT.5
    .replace(/[0-9]+(\.[0-9]+)?(\s*\/\s*[0-9]+)?/g, " ")             // numbers and fractions
    .replace(/[×÷±≈≤≥→⟶^_=<>+*\/\\|{}\[\]()]/g, " ")
    .replace(/[^\p{L}\p{P}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VOWELS = /[aeiouy]+/g;
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/e$/, "").match(VOWELS);
  return Math.max(1, groups ? groups.length : 1);
}

function fleschKincaid(text: string) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (sentences.length < 2 || words.length < 30) return null; // too little to judge
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syl / words.length) - 15.59;
}

const rows: { topicId: string; target: number; score: number; words: number }[] = [];
for (const seed of usCaliforniaLessonSeeds as any[]) {
  const target = targetGrade(seed.topicId);
  if (target === null) continue;
  const parts: string[] = [];
  for (const b of seed.blocks) {
    // Score only what a STUDENT actually reads. Established by driving the page
    // in rounds 7-8: teacher-guide renders for teachers only; extension blocks
    // have no renderer at all; the visualization block's content is blanked by
    // cleanLessonVisualizationContent; and on elementary pages the authored
    // checklist items are replaced by four canned sentences. Scoring the data
    // instead of the render is the mistake this effort keeps finding.
    if (b.type === "teacher-guide" || b.type === "extension" || b.type === "visualization") continue;
    if (b.type === "checklist" && target <= 6) continue;
    const push = (v: any) => { const t = typeof v === "string" ? v : v?.en; if (t) parts.push(t); };
    push(b.content);
    (b.items ?? []).forEach(push);
  }
  const prose = proseOnly(parts.join(". "));
  const score = fleschKincaid(prose);
  if (score === null) continue;
  rows.push({ topicId: seed.topicId, target, score, words: prose.split(/\s+/).length });
}

const over = rows.filter((r) => r.score - r.target > GRACE).sort((a, b) => (b.score - b.target) - (a.score - a.target));
console.log(`audit-us-ca-lesson-readability: ${rows.length} lesson pages scored (Flesch-Kincaid, prose only, +${GRACE} grade grace)`);
if (!rows.length) { console.error("✗ nothing was scored — refusing to report a pass."); process.exit(2); }

if (process.argv.includes("--list")) {
  for (const r of rows.sort((a, b) => (b.score - b.target) - (a.score - a.target)).slice(0, 20))
    console.log(`  ${r.topicId.padEnd(46)} target G${r.target}  reads G${r.score.toFixed(1)}  (${r.words} words)`);
}
console.log("\nNOTE: reporting only — this metric is not valid as a pass/fail gate here.");
console.log("The CCSS standards' own text scores G15.6 (3.G.A.1) and G14.5 (1.OA.A.1)");
console.log("against targets of G3 and G1, so a gate on this would flag the curriculum.");
if (!over.length) { console.log(`\nno page reads more than ${GRACE} grades above target`); process.exit(0); }
console.log(`\npages reading more than ${GRACE} grades above target: ${over.length}\n`);
for (const r of over) console.log(`  ${r.topicId}\n      target grade ${r.target}, reads at grade ${r.score.toFixed(1)} — ${(r.score - r.target).toFixed(1)} above`);
process.exit(0); // reporting only: never fails a build
