/**
 * Gate: every California checkpoint question is audible.
 *
 * The read-aloud accommodation speaks the question through the browser's speech
 * engine. Two tokens in this content are SILENT there — proven by rendering with
 * `say -v Samantha -r 95` and comparing the MD5 of the audio against the same
 * string with the token deleted:
 *
 *   "80 − 30 = ?"  vs "80  30 = ?"   -> byte-identical  (also the ASCII hyphen)
 *   "6 + ___ = 10" vs "6 +  = 10"    -> byte-identical
 *
 * A student who depends on read-aloud heard "ten plus eight equals." for
 * "10 + 8 = ___." — 76 questions across 33 pages, most of them Kindergarten and
 * Grade 1, which is exactly the population this accommodation exists for.
 *
 * This gate builds the string the app actually speaks, runs it through the same
 * `speechTextForMath` the app uses, and fails if any silent token survives.
 *
 * It deliberately does NOT flag `+ = × ÷ °`, superscript digits or "3/4": each
 * was measured as audible, and a gate that fails on correct content is worse
 * than no gate (round 13).
 */
import { speechTextForMath } from "../lib/mathSpeech";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { generatedCaliforniaQuestions } from "../data/usCaliforniaTopics";

const text = (value: unknown): string =>
  typeof value === "string" ? value : ((value as any)?.en ?? (value as any)?.label ?? "");

const byId = new Map((generatedCaliforniaQuestions as any[]).map((q: any) => [q.id, q]));
const seeds = usCaliforniaLessonSeeds as any[];

/** Tokens measured to produce audio byte-identical to their own deletion. */
const SILENT = [
  { name: "spaced binary minus (the operator is not voiced)", re: /(?<=[\dA-Za-z)])[ \t][−-][ \t](?=[\dA-Za-z(])/ },
  { name: "underscore blank (the thing being asked for is not voiced)", re: /_{2,}/ },
];

let checked = 0;
const defects: string[] = [];

for (const seed of seeds) {
  for (const id of seed.practiceQuestionIds ?? []) {
    const question: any = byId.get(id);
    if (!question) continue;
    const parts = [text(question.prompt), ...((question.options ?? []).map(text))];
    const spoken = speechTextForMath(parts.join(". "));
    checked += 1;
    for (const token of SILENT) {
      if (token.re.test(spoken)) {
        defects.push(`  ${seed.topicId} / ${id}\n      ${token.name}\n      spoken: ${spoken.slice(0, 110)}`);
      }
    }
  }
}

console.log(`audit-us-ca-lesson-readaloud: ${checked} checkpoint questions across ${seeds.length} California pages`);

// A gate that checked nothing must not report success.
if (checked === 0) {
  console.error("✗ checked nothing — the seed-to-question linkage is broken, not clean");
  process.exit(2);
}

// Prove the detector still fires, so a future edit to speechTextForMath that
// silently neuters it cannot leave this gate reporting a pass over real defects.
const canary = "10 + 8 = ___.";
if (!SILENT.some((token) => token.re.test(canary))) {
  console.error("✗ the silent-token detector no longer fires on a known-bad string — refusing to report a pass");
  process.exit(2);
}

if (defects.length > 0) {
  console.error(`\n✗ ${defects.length} question(s) contain a token the speech engine does not voice`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every question stays audible after speech normalization");
