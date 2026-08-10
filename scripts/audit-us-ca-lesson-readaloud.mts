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
import { speechTextForMath, speechTextForMathParts } from "../lib/mathSpeech";
import { buildPracticeReadAloudText } from "../lib/practiceReadAloud";
import { questionDiagramAltText } from "../lib/questionFigure";
import { textForLanguage } from "../lib/i18n";
import { toPlainMathText } from "../components/math/MathText";
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { usCaliforniaQuestions } from "../data/usCaliforniaQuestions";

const text = (value: unknown): string =>
  typeof value === "string" ? value : ((value as any)?.en ?? (value as any)?.label ?? "");

const byId = new Map((usCaliforniaQuestions as any[]).map((q: any) => [q.id, q]));
const seeds = usCaliforniaLessonSeeds as any[];

/** Tokens measured to produce audio byte-identical to their own deletion. */
const SILENT = [
  { name: "spaced binary minus (the operator is not voiced)", re: /(?<=[\dA-Za-z)])[ \t][−-][ \t](?=[\dA-Za-z(])/ },
  { name: "underscore blank (the thing being asked for is not voiced)", re: /_{2,}/ },
];

/**
 * Symbols that are silent standing alone as a whole option. Checked against the
 * OPTION, not the joined string: once joined, ". <. " is indistinguishable from
 * a "<" inside an expression, which is audible and must not be flagged.
 */
const SILENT_ALONE = new Set(["<", ">", "≤", "≥", "−", "-"]);

let checked = 0;
let diagramsChecked = 0;
const defects: string[] = [];

for (const seed of seeds) {
  for (const id of seed.practiceQuestionIds ?? []) {
    const question: any = byId.get(id);
    if (!question) continue;
    const rawOptions: string[] = (question.options ?? []).map(text);
    const diagramText = question.diagram
      ? textForLanguage(questionDiagramAltText(question.diagram), "en")
      : "";
    const diagramPart = diagramText ? `Diagram: ${diagramText}` : "";
    if (diagramText) diagramsChecked += 1;
    const parts = [text(question.prompt), ...(diagramPart ? [diagramPart] : []), ...rawOptions];
    const spoken = speechTextForMathParts(parts);
    const practiceCardSpoken = speechTextForMath(buildPracticeReadAloudText({
      promptText: toPlainMathText(text(question.prompt)),
      diagramText: diagramText ? toPlainMathText(diagramText) : undefined,
      optionTexts: rawOptions.map(toPlainMathText),
      language: "en"
    }));
    checked += 1;
    for (const token of SILENT) {
      if (token.re.test(spoken)) {
        defects.push(`  ${seed.topicId} / ${id}\n      ${token.name}\n      spoken: ${spoken.slice(0, 110)}`);
      }
    }
    if (/\^(?:\{|\(|[A-Za-z0-9?+-])|[{}]/.test(practiceCardSpoken)) {
      defects.push(
        `  ${seed.topicId} / ${id}\n      practice-card accessible text exposes caret or grouping syntax\n      spoken: ${practiceCardSpoken.slice(0, 110)}`
      );
    }
    // Re-derive the spoken option from the raw one and confirm the normalizer
    // actually replaced it. Testing the raw option alone would flag content the
    // fix already handles.
    for (const option of rawOptions) {
      const trimmed = option.trim();
      if (!SILENT_ALONE.has(trimmed)) continue;
      if (speechTextForMathParts([option]) === trimmed) {
        defects.push(
          `  ${seed.topicId} / ${id}\n      bare "${trimmed}" stands alone as an option and is not voiced\n      options: ${JSON.stringify(rawOptions)}`
        );
      }
    }
  }
}

// The checkpoint is not the only thing spoken. `prepareLessonAudioText`
// (LessonView.tsx) builds the lesson body's audio text, feeding both the
// generated audio and the speech-synthesis fallback. Its LaTeX stripping leaves
// a spaced minus intact, so four Grade 1 subtraction worked examples ended
// "Answer: 8 - 3 = 5" and were spoken without the subtraction.
const prepareLessonAudioTextMirror = (value: string) =>
  speechTextForMath(
    value
      .replace(/\$\$?/g, " ")
      .replace(/\\\((.*?)\\\)/g, "$1")
      .replace(/\\\[(.*?)\\\]/g, "$1")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}_[\]^]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

let blocksChecked = 0;
for (const seed of seeds) {
  for (const block of seed.blocks ?? []) {
    const raw = text(block.content ?? "");
    if (!raw) continue;
    blocksChecked += 1;
    const spoken = prepareLessonAudioTextMirror(raw);
    for (const token of SILENT) {
      if (token.re.test(spoken)) {
        defects.push(`  ${seed.topicId} / ${block.type} block\n      ${token.name}\n      spoken: ${spoken.slice(0, 110)}`);
      }
    }
  }
}

console.log(
  `audit-us-ca-lesson-readaloud: ${checked} linked checkpoint questions and ${blocksChecked} lesson content blocks across ${seeds.length} California pages`
);

// A gate that checked nothing must not report success — per population, not in
// aggregate, so a broken block loop cannot hide behind a healthy question loop.
if (checked === 0) {
  console.error("✗ checked no questions — the seed-to-question linkage is broken, not clean");
  process.exit(2);
}
if (blocksChecked === 0) {
  console.error("✗ checked no lesson content blocks — the seed block shape changed, not clean");
  process.exit(2);
}
if (diagramsChecked === 0) {
  console.error("✗ checked no question diagrams — diagram read-aloud coverage is broken, not clean");
  process.exit(2);
}
// The block detector must still fire on the raw sentence that motivated it.
if (!SILENT[0].re.test("Answer: 8 - 3 = 5.")) {
  console.error("✗ the spaced-minus detector no longer fires on a known-bad lesson sentence");
  process.exit(2);
}

// Prove the detector still fires, so a future edit to speechTextForMath that
// silently neuters it cannot leave this gate reporting a pass over real defects.
const canary = "10 + 8 = ___.";
if (!SILENT.some((token) => token.re.test(canary))) {
  console.error("✗ the silent-token detector no longer fires on a known-bad string — refusing to report a pass");
  process.exit(2);
}
if (/[\^{}]/.test(toPlainMathText("Evaluate 8^(1/3)."))) {
  console.error("✗ the accessible-power normalizer still exposes caret/braces on a known-bad rational exponent");
  process.exit(2);
}

if (defects.length > 0) {
  console.error(`\n✗ ${defects.length} question(s) contain a token the speech engine does not voice`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every question stays audible after speech normalization");
