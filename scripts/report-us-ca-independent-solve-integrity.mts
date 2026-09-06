/**
 * REPORTING ONLY — deliberately not registered as a gate in package.json.
 *
 * Does the question bank's "independent verification" actually verify anything?
 *
 * This repo's audit vocabulary is consistent and long-standing: solvability
 * audits tabulate `storedAnswer | independentAnswer | status | severity`, and
 * `generate-mainland-pep-primary-local-166-rag-replacement-audit.mjs:158`
 * computes `deterministicAnswerStatus: independentAnswer === question.answer
 * ? "pass" : "fail"`. An `independentAnswer` is meant to be a SECOND, separately
 * derived answer, and its agreement with the stored answer is treated as
 * evidence the stored answer is right.
 *
 * For one California batch it is not a second derivation. It is a copy.
 *
 *   ccss-textbook-practice-v1        462 of 464 have independentSolution
 *                                    byte-identical to explanation
 *   us-ca-k5-knowledge-point-...       0 of 121   (genuinely different prose)
 *   us-ca-g6-g12-v2                    0 of  23   (genuinely different prose)
 *
 * All 608 have independentAnswer byte-identical to answer. For a bare numeral
 * that is what agreement looks like, so it proves nothing either way — the prose
 * field is the tell, and 462 verbatim copies of a free-text explanation is not
 * what two independent solves produce.
 *
 * The consequence is a tautology that reads as assurance: run the
 * `independentAnswer === answer` check over this batch and 462 questions PASS,
 * on evidence that cannot fail. Two of them were demonstrably wrong at the time
 * (`divide-two-digit-q02` keyed 21 for a value that rounds to 22;
 * `circle-pi-q02` keyed 31 for 31.4), both carrying
 * `mathQaStatus: passed-ccss-textbook-hand-check` AND perfect independent
 * agreement.
 *
 * The batch's REAL provenance is declared honestly elsewhere on each question —
 * `passed-ccss-textbook-hand-check` — and a hand check is a legitimate QA route.
 * The problem is only that these two extra fields assert a stronger, different
 * claim that was never earned.
 *
 * MY OWN PART IN IT: round 11 corrected those two answers, and that commit
 * (2263a2c13b) changed `independentAnswer` alongside `answer`, 21 -> 22 and
 * 31 -> 31.4. Editing an independent-verification field to agree with a new
 * answer destroys the only thing it is for. Had it been left alone, the
 * disagreement would have been a signal. It is recorded here rather than
 * quietly re-edited.
 *
 * NOT FIXED IN CODE, on purpose. The honest repairs are to clear the fields for
 * this batch or to actually re-derive them, and both are the owner's call —
 * fabricating a second solve would be worse than the current state, and
 * reverting the round-11 edit would make the data assert that an independent
 * solve returned a wrong answer.
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

type Stat = { total: number; copiedSolution: number; copiedAnswer: number };
const byBatch = new Map<string, Stat>();
const examples: string[] = [];

for (const id of ids) {
  const question: any = byId.get(id);
  if (!question) continue;
  const batch = question.batch ?? "(no batch)";
  const stat = byBatch.get(batch) ?? { total: 0, copiedSolution: 0, copiedAnswer: 0 };
  stat.total += 1;

  const solution = text(question.independentSolution).trim();
  const explanation = text(question.explanation).trim();
  const independent = text(question.independentAnswer).trim();
  const answer = text(question.answer).trim();

  if (solution && explanation && solution === explanation) {
    stat.copiedSolution += 1;
    if (examples.length < 5) {
      examples.push(`  ${id}\n      explanation === independentSolution: ${explanation.slice(0, 78)}`);
    }
  }
  if (independent && answer && independent === answer) stat.copiedAnswer += 1;
  byBatch.set(batch, stat);
}

console.log(`report-us-ca-independent-solve-integrity: ${ids.size} California checkpoint questions\n`);
console.log("  copied-prose / total   copied-answer / total   batch");
for (const [batch, stat] of [...byBatch].sort((a, b) => b[1].total - a[1].total)) {
  console.log(
    `  ${String(stat.copiedSolution).padStart(11)} / ${String(stat.total).padEnd(5)}  ${String(stat.copiedAnswer).padStart(13)} / ${String(stat.total).padEnd(5)}  ${batch}`
  );
}

if (examples.length) {
  console.log("\nexamples of a verbatim-copied 'independent' solution:");
  for (const line of examples) console.log(line);
}

console.log(
  "\nThis script never fails a build. A verbatim copy is not, by itself, a wrong\n" +
    "answer — it is missing evidence, and deciding what to do about it (clear the\n" +
    "fields, or genuinely re-derive them) belongs to whoever owns the question bank."
);
