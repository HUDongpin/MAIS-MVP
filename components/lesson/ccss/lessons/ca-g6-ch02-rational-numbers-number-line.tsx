"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const B_COLOR = "var(--band-early)";
const P_COLOR = "var(--band-upper)";
const MINUS = "−";
const TINT = "color-mix(in oklab, var(--band-middle) 12%, var(--surface))";

/** A and B live on one number line from -3 to 3, stepped a quarter at a time. */
export const DEN = 4;
export const Q_MIN = -12;
export const Q_MAX = 12;

/** Number-line geometry (SVG units). PAD is chosen so one quarter is exactly 18 units. */
export const W = 520, H = 156, PAD = 44, LINE_Y = 96, BRACKET_Y = 44;
export const PX_PER_Q = (W - 2 * PAD) / (Q_MAX - Q_MIN);
/** Solid markers for A and B; the opposite rings are drawn last and wider, so they stay visible when they coincide. */
export const DOT_R = 7, RING_R = 11;

/** Companion grid geometry (SVG units): the same line, crossed by a second one. */
export const GRID = 200, GRID_C = 100, UNIT = 26;
export const UNITS = [-3, -2, -1, 0, 1, 2, 3];
export const TICKS = Array.from({ length: Q_MAX - Q_MIN + 1 }, (_, i) => Q_MIN + i);

export type Fraction = { num: number; den: number };

export function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}
/** Lowest terms, with the sign carried by the numerator. */
export function reduce(f: Fraction): Fraction { const g = gcd(f.num, f.den) || 1, s = f.den < 0 ? -1 : 1; return { num: (s * f.num) / g, den: (s * f.den) / g }; }
export function value(f: Fraction): number { return f.num / f.den; }
export function negate(f: Fraction): Fraction { return { num: -f.num, den: f.den }; }
export function absF(f: Fraction): Fraction { return { num: Math.abs(f.num), den: Math.abs(f.den) }; }
export function multiply(p: Fraction, q: Fraction): Fraction { return reduce({ num: p.num * q.num, den: p.den * q.den }); }
export function signed(n: number): string { return n < 0 ? `${MINUS}${Math.abs(n)}` : `${n}`; }
export function fractionLabel(f: Fraction): string { return f.den === 1 ? signed(f.num) : `${signed(f.num)}/${f.den}`; }

/** Exact for every denominator this lesson uses (1, 2 and 4), since each divides 4. */
export function decimalLabel(f: Fraction): string {
  const abs = Math.abs(f.num) / Math.abs(f.den), text = Number.isInteger(abs) ? `${abs}` : abs.toFixed(2).replace(/0$/, "");
  return f.num < 0 ? `${MINUS}${text}` : text;
}
export function quarterDecimal(q: number): string { return decimalLabel({ num: q, den: DEN }); }

/** Raw quarters, then lowest terms, then the decimal - with repeats dropped. */
export function nameChain(q: number): string[] {
  const names = [fractionLabel({ num: q, den: DEN }), fractionLabel(reduce({ num: q, den: DEN })), quarterDecimal(q)];
  return names.filter((name, i) => names.indexOf(name) === i);
}
/** Every whole number that divides both |q| and DEN, found by trial division. */
export function sharedFactors(q: number): number[] { const n = Math.abs(q); return Array.from({ length: Math.max(n, DEN) }, (_, i) => i + 1).filter((k) => n % k === 0 && DEN % k === 0); }
export function listPhrase(items: number[]): string { return items.length < 2 ? `${items[0]}` : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`; }
/** Names the common factors before naming the greatest one, so the renaming step is real work, not a claim. */
export function gcfNote(q: number): string {
  const n = Math.abs(q), shared = sharedFactors(q), g = shared[shared.length - 1];
  if (n === 0) return `0 is a multiple of every factor of ${DEN}, so the greatest factor 0 and ${DEN} share is ${DEN}: divide the top and the bottom by ${DEN}.`;
  if (g === 1) return `${n} and ${DEN} share no factor above 1, so this is already in lowest terms.`;
  return `The factors ${n} and ${DEN} share are ${listPhrase(shared)}, so the greatest is ${g}: divide the top and the bottom by ${g}.`;
}
export function oppositeSummary(q: number): string { return `${MINUS}A = ${quarterDecimal(-q)}, |A| = ${quarterDecimal(Math.abs(q))}`; }
/** True at every value of A, including 0, which is the one number that is its own opposite. */
export function oppositeNote(q: number): string {
  return q === 0 ? "0 is its own opposite: it is the only number that is its own mirror image, and 0 + 0 = 0." : `A and ${MINUS}A are the same distance from 0 on opposite sides, so A + (${MINUS}A) = 0.`;
}

export const clampQ = (q: number) => Math.min(Q_MAX, Math.max(Q_MIN, q));
export function xOf(q: number): number { return PAD + (clampQ(q) - Q_MIN) * PX_PER_Q; }
export function planeX(q: number): number { return GRID_C + (clampQ(q) / DEN) * UNIT; }
export function planeY(q: number): number { return GRID_C - (clampQ(q) / DEN) * UNIT; }
/** Where the letter P goes: offset away from the point, and inside the grid at every state. */
export function pointLabel(a: number, b: number): { x: number; y: number; anchor: "start" | "end" } {
  return { x: planeX(a) + (a >= 0 ? 9 : -9), y: planeY(b) + (b >= 0 ? -9 : 16), anchor: a >= 0 ? "start" : "end" };
}

export function orderSymbol(a: number, b: number): "<" | ">" | "=" { return a < b ? "<" : a > b ? ">" : "="; }
export function compareSentence(a: number, b: number): string {
  if (a === b) return "A and B are the same number, so A = B.";
  return a < b ? "A sits to the left of B, so A < B." : "A sits to the right of B, so A > B.";
}
export function quadrantName(a: number, b: number): string | null { return a === 0 || b === 0 ? null : a > 0 ? (b > 0 ? "I" : "IV") : (b > 0 ? "II" : "III"); }
export function locationPhrase(a: number, b: number): string {
  if (a === 0 && b === 0) return "at the origin, where the two lines cross";
  if (a === 0) return `on the vertical axis, ${b > 0 ? "above" : "below"} the origin`;
  if (b === 0) return `on the horizontal axis, ${a > 0 ? "right of" : "left of"} the origin`;
  return `in Quadrant ${quadrantName(a, b)}`;
}
export function locationSentence(a: number, b: number): string {
  if (a === 0 && b === 0) return `P is ${locationPhrase(a, b)}: both of its coordinates are 0.`;
  if (a === 0 || b === 0) return `P is ${locationPhrase(a, b)}, because its ${a === 0 ? "first" : "second"} coordinate is 0.`;
  return `P is ${locationPhrase(a, b)}, where every first coordinate is ${a > 0 ? "positive" : "negative"} and every second coordinate is ${b > 0 ? "positive" : "negative"}.`;
}
/**
 * How the two coordinates' signs place P in the plane. Hard-coding "the two signs
 * decide which quadrant or axis it lands on" was false at the degenerate values:
 * 0 carries no sign, and the origin is on both axes rather than on "an" axis.
 */
export function planeNote(a: number, b: number): string {
  if (a === 0 && b === 0) return "neither coordinate has a sign, so P is the origin itself, the one point that lies on both lines at once";
  if (a === 0 || b === 0) return `a coordinate of 0 has no sign, so P sits on ${a === 0 ? "the vertical" : "the horizontal"} axis rather than inside a quadrant`;
  return `both signs are known, and together they decide which of the four quadrants P lands in — here Quadrant ${quadrantName(a, b)}`;
}
export function figureLabel(a: number, b: number, showOpp: boolean): string {
  const base = `Number line from ${signed(Q_MIN / DEN)} to ${Q_MAX / DEN} with A at ${quarterDecimal(a)} and B at ${quarterDecimal(b)}, labelled with A's distance from 0 as ${quarterDecimal(Math.abs(a))}`;
  if (!showOpp) return base;
  // A and B share one opposite exactly when they are the same number, and then only one ring is drawn.
  if (a === b) return `${base}, plus one hollow ring around the shared opposite ${quarterDecimal(-a)}`;
  return `${base}, plus hollow rings around the opposites ${quarterDecimal(-a)} and ${quarterDecimal(-b)}`;
}
export function planeLabel(a: number, b: number): string {
  return `Coordinate grid from ${signed(Q_MIN / DEN)} to ${Q_MAX / DEN} on both axes, with A at ${quarterDecimal(a)} on the horizontal axis, B at ${quarterDecimal(b)} on the vertical axis, and the point P at (${quarterDecimal(a)}, ${quarterDecimal(b)}) ${locationPhrase(a, b)}`;
}

/** Worked example: a sub drops to a marked depth in equal stages. Every number below comes from these two. */
export const DIVE: { depth: Fraction; stage: Fraction } = { depth: { num: -9, den: 2 }, stage: { num: 3, den: 4 } };
export function workedExample() {
  const drop = absF(DIVE.depth), reciprocal = { num: DIVE.stage.den, den: DIVE.stage.num };
  const product = { num: drop.num * reciprocal.num, den: drop.den * reciprocal.den };
  const stages = reduce(product), count = value(stages), halfCount = count / 2;
  const marks = Array.from({ length: count }, (_, i) => multiply(negate(DIVE.stage), { num: i + 1, den: 1 }));
  return { drop, reciprocal, product, stages, count, marks, halfCount, halfway: marks[halfCount - 1] };
}

/** The four revealed steps, as strings so every sentence is checkable. Nothing below is typed twice. */
export function workedStep(i: number): string {
  const ex = workedExample(), depth = fractionLabel(DIVE.depth), stage = fractionLabel(DIVE.stage), drop = fractionLabel(ex.drop);
  const stages = `${ex.count} ${ex.count === 1 ? "stage" : "stages"}`;
  if (i === 0) return `The gauge reads ${depth} m. The sign says “below the surface”; the distance is |${depth}| = ${drop}, and ${ex.drop.num} ÷ ${ex.drop.den} = ${decimalLabel(ex.drop)}, so the sub finishes ${decimalLabel(ex.drop)} m down.`;
  if (i === 1) return `Each stage is ${stage} m, so ask how many ${stage} fit inside ${drop}. Divide by multiplying by the reciprocal: ${drop} ÷ ${stage} = ${drop} × ${fractionLabel(ex.reciprocal)} = ${ex.product.num}/${ex.product.den} = ${stages}.`;
  if (i === 2) return `Mark them on the line. Every stage subtracts ${stage}, giving ${ex.marks.map((m) => decimalLabel(m)).join(", ")} — each depth a rational number with its own point, each one further left than the one before.`;
  return `Halfway is after ${ex.halfCount} of the ${ex.count} stages, at ${fractionLabel(ex.halfway)} = ${decimalLabel(ex.halfway)}. Distance checks it: |${decimalLabel(ex.halfway)}| = ${decimalLabel(absF(ex.halfway))}, and ${decimalLabel(ex.drop)} ÷ 2 = ${decimalLabel(absF(ex.halfway))}. On the line ${decimalLabel(DIVE.depth)} < ${decimalLabel(ex.halfway)} < 0, so deeper really is less.`;
}
export function workedSteps(): string[] { return [0, 1, 2, 3].map((i) => workedStep(i)); }
/** Why the "how many fit" question is a division, for the Math check. */
export function divisionNote(): string {
  const ex = workedExample(), stages = `${ex.count} ${ex.count === 1 ? "stage" : "stages"}`;
  return `Asking how many stages of ${fractionLabel(DIVE.stage)} m fit inside a drop of ${fractionLabel(ex.drop)} m is a division, and dividing by a fraction is multiplying by its reciprocal: ${fractionLabel(ex.drop)} × ${fractionLabel(ex.reciprocal)} = ${ex.product.num}/${ex.product.den} = ${stages}`;
}

/** Try it: four rational numbers, one of them the least. */
export const TRY_CHOICES: Fraction[] = [{ num: -7, den: 4 }, { num: -1, den: 2 }, { num: -9, den: 4 }, { num: 2, den: 1 }];
export function tryAnswerIndex(): number {
  return TRY_CHOICES.reduce((best, f, i) => (value(f) < value(TRY_CHOICES[best]) ? i : best), 0);
}
export function tryReason(i: number): string {
  const f = TRY_CHOICES[i], least = TRY_CHOICES[tryAnswerIndex()];
  if (i === tryAnswerIndex()) return `Right. ${fractionLabel(f)} = ${decimalLabel(f)}, the farthest left of the four, and farther left on the line means less.`;
  if (value(f) > 0) return `${fractionLabel(f)} is positive, and every positive number sits to the right of every negative number.`;
  const right = value(f) > value(least);
  return `${fractionLabel(f)} = ${decimalLabel(f)} sits to the ${right ? "right" : "left"} of ${decimalLabel(least)}, so it is the ${right ? "greater" : "lesser"} of the two.`;
}

export default function Lesson() {
  const [a, setA] = useState(6);
  const [b, setB] = useState(-5);
  const [showOpp, setShowOpp] = useState(false);
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const stepsId = useId();

  const sym = orderSymbol(a, b), answer = tryAnswerIndex(), tag = pointLabel(a, b);
  const cards = [
    { title: "Names for A", main: nameChain(a).join(" = "), note: gcfNote(a), color: ACCENT },
    { title: "Names for B", main: nameChain(b).join(" = "), note: gcfNote(b), color: B_COLOR },
    { title: "Opposite and distance", main: oppositeSummary(a), note: oppositeNote(a), color: "var(--ink)" },
    { title: "Order", main: `${quarterDecimal(a)} ${sym} ${quarterDecimal(b)}`, note: compareSentence(a, b), color: "var(--ink)" },
  ];
  const steps = workedSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>
        An elevator panel is a number line stood on end. Two floors above the lobby is <strong>+2</strong>; the loading bay a floor and a half below it is <strong>{MINUS}1.5</strong>. Both are distances from the same starting point, measured in opposite directions. Any number you can write as one integer over another, with the bottom integer not 0 and with either sign — 2, {MINUS}1.5, 3/4, {MINUS}9/2 — is a <strong>rational number</strong>, and this chapter rests on one picture: each of them owns exactly one point on the number line.
      </p>
      <p>
        Once a number has a place on that line, hard questions turn into looking. Which is greater? The one farther right. How far from the start? The distance to 0, called <strong>absolute value</strong>. What is its <strong>opposite</strong>? The same distance the other way. Stand a second number line upright through 0, and a <em>pair</em> of rational numbers names a single point on a grid.
      </p>

      <Figure caption="Step A and B a quarter at a time. Their names, opposites, distances from 0 and order are all read off one line; the small grid shows where the pair (A, B) lands.">
        <div className="flex flex-col items-center gap-5">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(a, b, showOpp)}>
            <line x1={PAD} y1={LINE_Y} x2={W - PAD} y2={LINE_Y} stroke="var(--ink-soft)" strokeWidth={2} />
            {TICKS.map((q) => (<g key={q}><line x1={xOf(q)} y1={LINE_Y - (q % DEN === 0 ? 9 : 4)} x2={xOf(q)} y2={LINE_Y + (q % DEN === 0 ? 9 : 4)} stroke={q === 0 ? "var(--ink)" : "var(--ink-soft)"} strokeWidth={q === 0 ? 2 : 1} />{q % DEN === 0 && <text x={xOf(q)} y={LINE_Y + 24} textAnchor="middle" fontSize={11} fill="var(--ink-faint)" fontFamily="monospace">{signed(q / DEN)}</text>}</g>))}
            {a !== 0 && <path d={`M ${xOf(0)} ${BRACKET_Y - 5} v 10 M ${xOf(0)} ${BRACKET_Y} H ${xOf(a)} M ${xOf(a)} ${BRACKET_Y - 5} v 10`} fill="none" stroke={ACCENT} strokeWidth={2.5} />}
            <text x={(xOf(0) + xOf(a)) / 2} y={BRACKET_Y - 10} textAnchor="middle" fontSize={11} fontWeight={800} fill={ACCENT}>|A| = {quarterDecimal(Math.abs(a))}</text>
            {showOpp && <line x1={xOf(0)} y1={LINE_Y - 26} x2={xOf(0)} y2={LINE_Y + 34} stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="3 3" />}
            <circle cx={xOf(b)} cy={LINE_Y} r={DOT_R} fill={B_COLOR} stroke="white" strokeWidth={2} />
            <circle cx={xOf(a)} cy={LINE_Y} r={DOT_R} fill={ACCENT} stroke="white" strokeWidth={2} />
            <text x={xOf(a)} y={LINE_Y - 15} textAnchor="middle" fontSize={12} fontWeight={800} fill={ACCENT}>{a === b ? "A = B" : "A"}</text>
            {a !== b && <text x={xOf(b)} y={LINE_Y - 15} textAnchor="middle" fontSize={12} fontWeight={800} fill={B_COLOR}>B</text>}
            {/* Rings last and wider than the solid dots, so a mirror that lands on A or B is still visible. */}
            {showOpp && (
              <g>
                {a !== b && <circle cx={xOf(-b)} cy={LINE_Y} r={RING_R} fill="none" stroke={B_COLOR} strokeWidth={2} strokeDasharray="3 2" />}
                <circle cx={xOf(-a)} cy={LINE_Y} r={RING_R} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="3 2" />
                <text x={xOf(-a)} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill={ACCENT}>{a === b ? `${MINUS}A = ${MINUS}B` : `${MINUS}A`}</text>
                {a !== b && <text x={xOf(-b)} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill={B_COLOR}>{MINUS}B</text>}
              </g>
            )}
          </svg>

          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
            <svg width={GRID} height={GRID} viewBox={`0 0 ${GRID} ${GRID}`} className="mx-auto h-auto max-w-full" role="img" aria-label={planeLabel(a, b)}>
              {UNITS.map((k) => (<g key={k} stroke="var(--line)" strokeWidth={1}><line x1={planeX(4 * k)} y1={planeY(Q_MIN)} x2={planeX(4 * k)} y2={planeY(Q_MAX)} /><line x1={planeX(Q_MIN)} y1={planeY(4 * k)} x2={planeX(Q_MAX)} y2={planeY(4 * k)} /></g>))}
              <line x1={planeX(Q_MIN)} y1={planeY(0)} x2={planeX(Q_MAX)} y2={planeY(0)} stroke="var(--ink-soft)" strokeWidth={2} />
              <line x1={planeX(0)} y1={planeY(Q_MIN)} x2={planeX(0)} y2={planeY(Q_MAX)} stroke="var(--ink-soft)" strokeWidth={2} />
              {UNITS.filter((k) => k !== 0).map((k) => (<g key={k} fill="var(--ink-faint)" fontSize={9} fontFamily="monospace"><text x={planeX(4 * k)} y={planeY(0) + 14} textAnchor="middle">{signed(k)}</text><text x={planeX(0) - 6} y={planeY(4 * k) + 3} textAnchor="end">{signed(k)}</text></g>))}
              <line x1={planeX(0)} y1={planeY(0)} x2={planeX(a)} y2={planeY(0)} stroke={ACCENT} strokeWidth={3.5} />
              <line x1={planeX(0)} y1={planeY(0)} x2={planeX(0)} y2={planeY(b)} stroke={B_COLOR} strokeWidth={3.5} />
              <line x1={planeX(a)} y1={planeY(0)} x2={planeX(a)} y2={planeY(b)} stroke={P_COLOR} strokeWidth={1.5} strokeDasharray="3 3" />
              <line x1={planeX(0)} y1={planeY(b)} x2={planeX(a)} y2={planeY(b)} stroke={P_COLOR} strokeWidth={1.5} strokeDasharray="3 3" />
              <circle cx={planeX(a)} cy={planeY(b)} r={6} fill={P_COLOR} stroke="white" strokeWidth={2} />
              <text x={tag.x} y={tag.y} textAnchor={tag.anchor} fontSize={12} fontWeight={800} fill={P_COLOR}>P</text>
            </svg>
            <div className="max-w-xs rounded-xl px-4 py-3 text-[15px]" style={{ background: TINT }}>
              <div className="font-mono text-lg font-black" style={{ color: P_COLOR }}>P = ({quarterDecimal(a)}, {quarterDecimal(b)})</div>
              <p className="m-0 mt-1 text-[var(--ink-soft)]">{locationSentence(a, b)}</p>
            </div>
          </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-3 text-center sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border-2 border-[var(--line)] px-4 py-2">
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">{c.title}</div>
                <div className="font-mono text-lg font-black" style={{ color: c.color }}>{c.main}</div><div className="text-xs text-[var(--ink-soft)]">{c.note}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Point A" value={a} display={fractionLabel(reduce({ num: a, den: DEN }))} min={Q_MIN} max={Q_MAX} color={ACCENT} onChange={setA} />
            <Stepper label="Point B" value={b} display={fractionLabel(reduce({ num: b, den: DEN }))} min={Q_MIN} max={Q_MAX} color={B_COLOR} onChange={setB} />
            <button type="button" onClick={() => setShowOpp((s) => !s)} aria-pressed={showOpp} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={showOpp ? { background: ACCENT, color: "white", borderColor: ACCENT } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
              {showOpp ? "Hide opposites" : "Show opposites"}
            </button>
          </div>
        </div>
      </Figure>

      <h2>Worked example: how deep, in how many stages?</h2>
      <p>
        A research sub leaves the surface, which its gauge calls 0, and stops at {fractionLabel(DIVE.depth)} m. It descends in equal stages of {fractionLabel(DIVE.stage)} m. How many stages does that take, and where is the sub halfway through?
      </p>
      <div className="card my-4 p-5">
        <ol id={stepsId} className="m-0 list-none space-y-2 p-0">
          {steps.slice(0, shown).map((body, i) => (
            <li key={i} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: ACCENT }}>{i + 1}</span><span>{body}</span></li>
          ))}
        </ol>
        {shown === 0 && <p className="m-0 text-sm text-[var(--ink-faint)]">Press &ldquo;Next step&rdquo; to watch the reasoning unfold.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={shown > 0} aria-controls={stepsId} disabled={shown >= steps.length} onClick={() => setShown((s) => Math.min(steps.length, s + 1))} className="rounded-lg px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown >= steps.length ? "All steps shown" : `Next step (${shown + 1} of ${steps.length})`}
          </button>
          <button type="button" disabled={shown === 0} onClick={() => setShown(0)} className="rounded-lg border border-[var(--line)] px-4 py-1.5 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>Which of these four numbers is the <strong>least</strong> — the one farthest to the left on the number line?</p>
      <div className="flex flex-wrap gap-2">
        {TRY_CHOICES.map((f, i) => (<button key={i} type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="rounded-lg border px-4 py-1.5 font-mono text-sm font-bold" style={picked === i ? { background: i === answer ? P_COLOR : B_COLOR, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{fractionLabel(f)}</button>))}
      </div>
      {picked !== null && (
        <p className="mt-3 rounded-xl px-4 py-3 text-[15px]" style={{ background: TINT }} role="status"><strong>{picked === answer ? "Correct." : "Not quite."}</strong> {tryReason(picked)}</p>
      )}

      <h2>Where this chapter goes</h2>
      <p>
        The lessons ahead take this picture apart. <strong>Dividing Fractions</strong> answers the &ldquo;how many fit&rdquo; question the sub needed. <strong>Multi-Digit Division</strong> and <strong>Decimal Operations</strong> build the fluency that turns a fraction into the decimal printed under a tick mark. <strong>GCF, LCM &amp; Factoring</strong> supplies the common factor behind a renaming such as {nameChain(6)[0]} = {nameChain(6)[1]}. Then the line stretches past zero: <strong>Positive &amp; Negative Numbers</strong> uses signs for opposite quantities, <strong>Ordering &amp; Absolute Value</strong> makes left-to-right order and distance from 0 exact, and <strong>The Four-Quadrant Plane</strong> takes the small grid seriously, plotting and reflecting points whose coordinates are negative.
      </p>

      <MathCheck>
        <p>
          Every rational number — fraction, decimal, whole number, positive or negative — is exactly one point on the number line, with 0 as the mark that separates the two directions (6.NS.C.6). Signed numbers can therefore record two opposite quantities, such as above and below the surface (6.NS.C.5). {oppositeNote(a)} Farther left means less, so the statement {quarterDecimal(a)} {sym} {quarterDecimal(b)} is read straight off the picture, and |A| = {quarterDecimal(Math.abs(a))} is A&apos;s distance from 0, never negative (6.NS.C.7). Renaming does not move the point. {gcfNote(a)} Dividing the numerator by the denominator instead gives the decimal name, so every name in {nameChain(a).join(" = ")} marks the same place (6.NS.B.4). {divisionNote()} (6.NS.A.1). Cross a second number line at 0 and the ordered pair ({quarterDecimal(a)}, {quarterDecimal(b)}) picks out one point of the plane: {planeNote(a, b)} (6.NS.C.8).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, display, min, max, color, onChange }: { label: string; value: number; display: string; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>{MINUS}</button>
        <span className="w-16 text-center font-mono text-xl font-black tabular-nums" style={{ color }}>{display}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
