/**
 * Would the grader accept the forms a correct student actually types?
 *
 * Round 11 audited whether the stored answers are RIGHT. This asks whether a
 * student who is right gets marked right — a different failure with the same
 * consequence, invisible to any audit of the question data.
 *
 * For every checkpoint question rendered on a California lesson page, generate
 * the equivalent forms a student would reasonably enter and assert the grader
 * accepts each. Also assert it still REJECTS a clearly wrong answer, so a
 * matcher that says yes to everything cannot pass.
 *
 * Usage: npx tsx scripts/audit-us-ca-checkpoint-grading.mts
 */
import { answerMatches } from "../lib/server/answerMatching";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { generatedCaliforniaQuestions } from "../data/usCaliforniaTopics";

const byId = new Map(generatedCaliforniaQuestions.map((q: any) => [q.id, q]));

/** Equivalent renderings of the same value that a student may legitimately type. */
function equivalentForms(answer: string): string[] {
  const a = answer.trim();
  const forms = new Set<string>();
  const n = Number(a);
  if (a !== "" && Number.isFinite(n)) {
    forms.add(String(n));
    if (Number.isInteger(n)) {
      forms.add(`${n}.0`);
      forms.add(`${n}.00`);
      if (Math.abs(n) >= 1000) forms.add(n.toLocaleString("en-US")); // 1,234
    } else {
      forms.add(a.replace(/0+$/, "").replace(/\.$/, ""));
      if (Math.abs(n) < 1 && a.startsWith("0.")) forms.add(a.slice(1)); // .5
      if (Math.abs(n) < 1 && a.startsWith(".")) forms.add(`0${a}`);
    }
    if (n > 0) forms.add(`+${n}`);
  }
  // a/b <-> decimal, when the decimal is exact
  const frac = a.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const v = Number(frac[1]) / Number(frac[2]);
    if (Number.isFinite(v) && Number.isInteger(v * 10000)) forms.add(String(v));
  }
  // surrounding whitespace and a trailing period are not errors
  forms.add(` ${a} `);
  forms.add(`${a}.`);
  forms.delete(a);
  return [...forms].filter((f) => f.trim() !== "");
}

const seeds = usCaliforniaLessonSeeds as any[];
let checked = 0;
let rejectedCorrect = 0;
let acceptedWrong = 0;
const failures: string[] = [];

for (const seed of seeds) {
  for (const id of seed.practiceQuestionIds ?? []) {
    const q: any = byId.get(id);
    if (!q) continue;
    const answer = typeof q.answer === "string" ? q.answer : q.answer?.en;
    if (!answer || q.type === "multiple-choice") continue; // options graded separately
    checked += 1;

    for (const form of equivalentForms(answer)) {
      if (!answerMatches(form, answer)) {
        rejectedCorrect += 1;
        if (failures.length < 30) failures.push(`  REJECTS a correct form — ${id}\n      stored "${answer}"  student typed "${form}"`);
      }
    }
    // the matcher must still say no to something plainly wrong
    const wrong = Number.isFinite(Number(answer)) ? String(Number(answer) + 7.31) : `${answer}-definitely-not`;
    if (answerMatches(wrong, answer)) {
      acceptedWrong += 1;
      if (failures.length < 30) failures.push(`  ACCEPTS a wrong answer — ${id}\n      stored "${answer}"  student typed "${wrong}"`);
    }
  }
}

console.log(`audit-us-ca-checkpoint-grading: ${checked} free-entry checkpoint questions graded against equivalent forms`);
if (!checked) {
  console.error("✗ nothing was checked — refusing to report a pass.");
  process.exit(2);
}
if (!rejectedCorrect && !acceptedWrong) {
  console.log("✓ every equivalent form of every stored answer is accepted, and wrong answers are still rejected");
  process.exit(0);
}
console.log(`\ncorrect forms rejected: ${rejectedCorrect} | wrong answers accepted: ${acceptedWrong}\n`);
console.log(failures.join("\n"));
process.exit(1);
