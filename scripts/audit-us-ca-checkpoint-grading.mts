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
import { answerMatches, questionAnswerMatches } from "../lib/server/answerMatching";
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
let mcChecked = 0;
let mcNoWinner = 0;
let mcManyWinners = 0;
let rejectedCorrect = 0;
let acceptedWrong = 0;
const failures: string[] = [];

for (const seed of seeds) {
  for (const id of seed.practiceQuestionIds ?? []) {
    const q: any = byId.get(id);
    if (!q) continue;
    const answer = typeof q.answer === "string" ? q.answer : q.answer?.en;
    if (!answer) continue;

    // Multiple choice goes through questionAnswerMatches, a different path:
    // the stored answer must resolve to one of the options, and exactly one
    // option must be selectable by it. An answer that matches no option means
    // the question cannot be answered correctly at all.
    if (q.type === "multiple-choice") {
      const opts: any[] = q.options ?? [];
      const texts = opts.map((o: any) => (typeof o === "string" ? o : o?.en ?? o?.label ?? "")).filter(Boolean);
      if (!texts.length) continue;
      mcChecked += 1;
      const graded = { answer, accepted_answers: q.acceptedAnswers ?? [], options: opts.map((o: any) => (typeof o === "string" ? { en: o } : o)) } as any;
      const winners = texts.filter((t) => questionAnswerMatches(graded, t));
      if (winners.length === 0) {
        mcNoWinner += 1;
        if (failures.length < 30) failures.push(`  NO option is graded correct — ${id}\n      stored "${answer}"  options ${JSON.stringify(texts).slice(0, 120)}`);
      } else if (winners.length > 1) {
        mcManyWinners += 1;
        if (failures.length < 30) failures.push(`  ${winners.length} options graded correct — ${id}\n      stored "${answer}"  accepted ${JSON.stringify(winners).slice(0, 120)}`);
      }
      continue;
    }
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

console.log(`audit-us-ca-checkpoint-grading: ${checked} free-entry + ${mcChecked} multiple-choice checkpoint questions graded`);
if (!checked && !mcChecked) {
  console.error("✗ nothing was checked — refusing to report a pass.");
  process.exit(2);
}
if (!rejectedCorrect && !acceptedWrong && !mcNoWinner && !mcManyWinners) {
  console.log("✓ every equivalent form is accepted, wrong answers rejected, and every multiple choice has exactly one option that grades correct");
  process.exit(0);
}
console.log(`\ncorrect forms rejected: ${rejectedCorrect} | wrong answers accepted: ${acceptedWrong} | multiple choice with no correct option: ${mcNoWinner} | with several: ${mcManyWinners}\n`);
console.log(failures.join("\n"));
process.exit(1);
