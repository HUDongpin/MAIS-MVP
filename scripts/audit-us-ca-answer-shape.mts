/**
 * Gate: a keyed answer has the SHAPE its prompt asks for.
 *
 * Round 11 found an estimation question keyed 21 where the method demanded 22.
 * This gate catches the structural version of that class: a "rounded to the
 * nearest ten" answer that is not a multiple of ten cannot be right no matter
 * how the student works. Free-entry only; multiple-choice answers live in
 * options and are covered by audit:us-ca-checkpoint-grading.
 *
 * The first draft of this lens flagged 4 questions, all correct content:
 * "how many cups per hour" legitimately keys 1.5 (a continuous measure is not
 * a count), and "write the complete subtraction equation for how many are
 * left" keys an equation. Rules below are the defensible core that survived —
 * anything needing a noun taxonomy to stay honest was dropped (round 13).
 */
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { generatedCaliforniaQuestions } from "../data/usCaliforniaTopics";

const text = (value: unknown): string =>
  typeof value === "string" ? value : ((value as any)?.en ?? "");

const byId = new Map((generatedCaliforniaQuestions as any[]).map((q: any) => [q.id, q]));
const ids = new Set<string>();
for (const seed of usCaliforniaLessonSeeds as any[]) {
  for (const id of seed.practiceQuestionIds ?? []) ids.add(id);
}

const ROUND_BASES: Record<string, number> = { ten: 10, hundred: 100, thousand: 1000 };

let checked = 0;
let comparisons = 0;
const defects: string[] = [];

for (const id of ids) {
  const question: any = byId.get(id);
  if (!question || question.type === "multiple-choice") continue;
  checked += 1;
  const prompt = text(question.prompt);
  const answer = text(question.answer).trim();

  // "how many" must key a non-negative number — unless an equation was asked
  // for, which the answer's own "=" reveals.
  if (/how many/i.test(prompt)) {
    comparisons += 1;
    if (!/^\d+(?:\.\d+)?$/.test(answer) && !answer.includes("=")) {
      defects.push(`  ${id}\n      "how many" keys ${JSON.stringify(answer)}, which is not a non-negative number or an equation\n      prompt: ${prompt.slice(0, 90)}`);
    }
  }
  // A value rounded to the nearest N is a multiple of N.
  const rounded = prompt.match(/round(?:ed)?\s+to the nearest (ten|hundred|thousand)\b/i);
  if (rounded && /^\d+$/.test(answer)) {
    comparisons += 1;
    const base = ROUND_BASES[rounded[1].toLowerCase()];
    if (Number(answer) % base !== 0) {
      defects.push(`  ${id}\n      "rounded to the nearest ${rounded[1]}" keys ${answer}, not a multiple of ${base}\n      prompt: ${prompt.slice(0, 90)}`);
    }
  }
  // "what fraction" keys a fraction.
  if (/what fraction/i.test(prompt)) {
    comparisons += 1;
    if (!/^\d+\s*\/\s*\d+$/.test(answer)) {
      defects.push(`  ${id}\n      "what fraction" keys ${JSON.stringify(answer)}, which is not a/b\n      prompt: ${prompt.slice(0, 90)}`);
    }
  }
}

console.log(`audit-us-ca-answer-shape: ${checked} free-entry questions, ${comparisons} shape comparisons`);

if (checked === 0 || comparisons === 0) {
  console.error("✗ compared nothing — the rules match no prompts, which is a broken gate, not clean content");
  process.exit(2);
}
// The rules must still fire on known-bad shapes.
if (Number("25") % ROUND_BASES.ten === 0) {
  console.error("✗ the rounding rule no longer fires on 25-vs-nearest-ten — refusing to report a pass");
  process.exit(2);
}
if (/^\d+(?:\.\d+)?$/.test("about 12")) {
  console.error("✗ the how-many rule no longer rejects a non-numeric answer — refusing to report a pass");
  process.exit(2);
}

if (defects.length) {
  console.error(`\n✗ ${defects.length} answer(s) do not match their prompt's shape`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every keyed answer matches the shape its prompt asks for");
