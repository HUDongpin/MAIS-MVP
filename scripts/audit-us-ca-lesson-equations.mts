/**
 * Gate: every arithmetic equation PRINTED to a student evaluates correctly.
 *
 * Round 11 audited stored answers. This audits the working shown alongside them.
 * An explanation reading "Answer: 8 - 3 = 4" teaches a false fact even when the
 * keyed answer is right, and the student reads the working, not the key.
 *
 * Covers both surfaces that print arithmetic: the 608 checkpoint questions'
 * `explanation` and `independentSolution`, and the 386 lesson content blocks.
 *
 * The parser is deliberately narrow — a chain of + - × ÷ · on plain numbers with
 * a single numeric result. Anything it cannot fully evaluate is SKIPPED rather
 * than guessed, because a checker that reports on its own blind spots is worse
 * than no checker (round 13). Concretely it refuses:
 *
 *   - a fragment of a longer chain    "11² − 4×1×1 = 121 − 4 = 117"
 *   - an expression it cannot read    "½ × 6 × 4 = 12"   (leading vulgar fraction)
 *   - a non-numeric result            "90/360 = 1/4"
 *   - a percentage                    "30/50 = 60%"
 *
 * Each of those was a false positive during development, and each is correct
 * content. The lookbehind and lookahead exist to exclude them.
 *
 * Two bugs of my own are recorded here because both produced a confident,
 * meaningless pass:
 *
 *   1. The first lookahead rejected a trailing "." so every equation that ended
 *      a sentence was skipped. The gate matched NOTHING — not even the wrong
 *      equations in its own fire test — and reported "all clean".
 *   2. The lookbehind only inspected one character, so "½ × 6 × 4 = 12" was read
 *      as "6 × 4 = 12" and flagged as wrong. Correct content, invented defect.
 *
 * Coverage went from 73 equations to 435 once both were fixed. A gate's coverage
 * number is the first thing to disbelieve.
 */
import { usCaliforniaLessonSeeds } from "../data/usCaliforniaLessons";
import { generatedCaliforniaQuestions } from "../data/usCaliforniaTopics";

const text = (value: unknown): string =>
  typeof value === "string" ? value : ((value as any)?.en ?? "");

/** Left-to-right with × ÷ before + −. Returns null on anything it cannot evaluate. */
function evaluateChain(expression: string): number | null {
  const tokens = expression
    .replace(/−/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .match(/-?\d+(?:\.\d+)?|[+\-*/]/g);
  if (!tokens) return null;

  const parts: (string | number)[] = tokens.map((tok) => (/^[+\-*/]$/.test(tok) ? tok : Number(tok)));
  for (let i = 1; i < parts.length - 1; ) {
    if (parts[i] === "*" || parts[i] === "/") {
      const a = parts[i - 1] as number;
      const b = parts[i + 1] as number;
      const value = parts[i] === "*" ? a * b : b === 0 ? NaN : a / b;
      parts.splice(i - 1, 3, value);
      i = Math.max(1, i - 2);
    } else i += 2;
  }
  let total = parts[0] as number;
  for (let i = 1; i < parts.length - 1; i += 2) {
    const b = parts[i + 1] as number;
    total = parts[i] === "+" ? total + b : total - b;
  }
  return Number.isFinite(total) ? total : null;
}

const EQUATION =
  /(?<![\d.\-+*/=^²³×÷−·½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]\s{0,2})(-?\d+(?:\.\d+)?(?:\s*[+\-−×÷*·]\s*-?\d+(?:\.\d+)?)+)\s*=\s*(-?\d+(?:\.\d+)?)(?!\d|\.\d|[%/²³]|\s*[+\-−×÷*/=])/g;

const byId = new Map((generatedCaliforniaQuestions as any[]).map((q: any) => [q.id, q]));
const ids = new Set<string>();
for (const seed of usCaliforniaLessonSeeds as any[]) {
  for (const id of seed.practiceQuestionIds ?? []) ids.add(id);
}

let questions = 0;
let blocks = 0;
let equations = 0;
const defects: string[] = [];

function scan(where: string, body: string) {
  for (const match of body.matchAll(EQUATION)) {
    const value = evaluateChain(match[1]);
    if (value === null) continue;
    equations += 1;
    if (Math.abs(value - Number(match[2])) > 1e-9) {
      defects.push(
        `  ${where}\n      printed      : ${match[0]}\n      evaluates to : ${value}\n      context      : ${body.slice(0, 110)}`
      );
    }
  }
}

for (const id of ids) {
  const question: any = byId.get(id);
  if (!question) continue;
  questions += 1;
  for (const field of ["explanation", "independentSolution"] as const) {
    const body = text(question[field]);
    if (body) scan(`${id} (${field})`, body);
  }
}
for (const seed of usCaliforniaLessonSeeds as any[]) {
  for (const block of seed.blocks ?? []) {
    const body = text(block.content ?? "");
    if (!body) continue;
    blocks += 1;
    scan(`${seed.topicId} / ${block.type} block`, body);
  }
}

console.log(
  `audit-us-ca-lesson-equations: ${questions} checkpoint questions and ${blocks} lesson blocks, ${equations} printed equations evaluated`
);

// A gate that evaluated nothing must not report success — this exact failure hid
// a broken lookahead behind a green tick during development.
if (equations === 0) {
  console.error("✗ found no equations to evaluate — the parser is broken, not the content");
  process.exit(2);
}
if (equations < 300) {
  // ~435 before 2026-08-11; 331 after ccss-textbook-practice-v1 dropped its
  // independentSolution fields (they were byte-copies of explanation, so every
  // equation in them was counted twice for that batch).
  console.error(`✗ only ${equations} equations matched; this corpus yields ~331. The parser has narrowed — treat as broken, not clean.`);
  process.exit(2);
}
// The evaluator must be right...
if (evaluateChain("2 + 2") !== 4 || evaluateChain("6 × 7") !== 42 || evaluateChain("10 - 4") !== 6 || evaluateChain("3 + 2 × 4") !== 11) {
  console.error("✗ the evaluator canary failed — refusing to report a pass");
  process.exit(2);
}
// ...and the detector must still SEE a wrong equation in ordinary prose.
const canary = "Answer: 8 - 3 = 4.";
const seen = [...canary.matchAll(EQUATION)];
if (seen.length !== 1 || evaluateChain(seen[0][1]) === Number(seen[0][2])) {
  console.error("✗ the detector no longer catches a known-wrong equation in a sentence — refusing to report a pass");
  process.exit(2);
}

if (defects.length) {
  console.error(`\n✗ ${defects.length} printed equation(s) do not evaluate to their stated result`);
  for (const line of defects) console.error(line);
  process.exit(1);
}

console.log("✓ every printed arithmetic equation evaluates to its stated result");
