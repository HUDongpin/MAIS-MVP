"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const SHOP_A = "var(--band-early)";
const SHOP_B = "var(--band-upper)";

/* ---------- pure helpers (exported so the test can exercise every state) ---------- */

export const HOURS_MAX = 8;
export const CONTROLS = { rateA: { min: 1, max: 8 }, feeA: { min: 0, max: 10 }, rateB: { min: 1, max: 8 }, feeB: { min: 0, max: 10 } } as const;
export type Fraction = { num: number; den: number };
export type Comparison = { kind: "one"; hours: Fraction; cost: Fraction } | { kind: "none" } | { kind: "many" };
export type NumberCard = { label: string; value: number; fraction: Fraction | null; why: string };
export type Target = "break" | "root2";
export type Placed = { text: string; srText: string; value: number };
export type Step = { title: string; math: string; note: string };

export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
/** A fraction in lowest terms, with the sign carried by the numerator. */
export function reduce(num: number, den: number): Fraction {
  const flip = den < 0 ? -1 : 1;
  const g = gcd(num, den) || 1;
  const top = (flip * num) / g;
  return { num: top === 0 ? 0 : top, den: (flip * den) / g };
}
export function fractionValue(f: Fraction) { return f.num / f.den; }
export function fracText(f: Fraction) { return `${f.num < 0 ? "−" : ""}${Math.abs(f.num)}${f.den === 1 ? "" : `/${f.den}`}`; }
export function signedText(n: number) { return n < 0 ? `−${Math.abs(n)}` : `${n}`; }
export function costAt(rate: number, fee: number, hours: number) { return rate * hours + fee; }
export function dollars(n: number) { return `${n} ${n === 1 ? "dollar" : "dollars"}`; }
export function hourNoun(f: Fraction) { return f.num === 1 && f.den === 1 ? "hour" : "hours"; }

/** Solve rateA*h + feeA = rateB*h + feeB — the whole chapter in one line of algebra. */
export function comparePlans(rateA: number, feeA: number, rateB: number, feeB: number): Comparison {
  if (rateA === rateB) return feeA === feeB ? { kind: "many" } : { kind: "none" };
  const den = rateA - rateB;
  return { kind: "one", hours: reduce(feeB - feeA, den), cost: reduce(rateA * feeB - feeA * rateB, den) };
}
export function crossesInWindow(meeting: Comparison) { return meeting.kind === "one" && fractionValue(meeting.hours) >= 0 && fractionValue(meeting.hours) <= HOURS_MAX; }

/** Long division: the digits of num/den and the index where the repeating block starts. */
export function expandDecimal(f: Fraction) {
  const size = Math.abs(f.num);
  const digits: number[] = [];
  const seen = new Map<number, number>();
  let rest = size % f.den;
  let repeatFrom: number | null = null;
  while (rest !== 0) {
    const already = seen.get(rest);
    if (already !== undefined) { repeatFrom = already; break; }
    seen.set(rest, digits.length);
    digits.push(Math.floor((rest * 10) / f.den));
    rest = (rest * 10) % f.den;
  }
  return { negative: f.num < 0, whole: Math.floor(size / f.den), digits, repeatFrom };
}
export function decimalStory(f: Fraction) {
  const d = expandDecimal(f);
  if (d.repeatFrom !== null) return `its decimal repeats the block ${d.digits.slice(d.repeatFrom).join("")} forever`;
  if (d.digits.length === 0) return "it is already an integer";
  return `its decimal stops after ${d.digits.length} ${d.digits.length === 1 ? "place" : "places"}`;
}
/**
 * Money named by its exact value. A two-place decimal only ever appears behind
 * an honesty marker: "exactly" when those two places really are the whole
 * number, "about" when they are a rounding of a decimal that never stops.
 */
export function moneyText(f: Fraction) {
  const noun = f.num === 1 && f.den === 1 ? "dollar" : "dollars";
  if (f.den === 1) return `${fracText(f)} ${noun}`;
  const printed = fractionValue(f).toFixed(2), exact = Number(printed.replace(".", "")) * f.den === f.num * 100;
  return `${fracText(f)} ${noun} (${exact ? "exactly" : "about"} ${printed.replace("-", "−")})`;
}

/* ---------- every sentence the figure renders, as a pure builder ---------- */

export function crossStory(meeting: Comparison) {
  if (meeting.kind === "many") return "Both shops charge exactly the same, so the two lines lie on top of each other.";
  if (meeting.kind === "none") return "The hourly rates are equal, so the lines are parallel and never meet.";
  const when = `${fracText(meeting.hours)} ${hourNoun(meeting.hours)}`;
  return crossesInWindow(meeting) ? `The lines cross at ${when}, where both totals are ${moneyText(meeting.cost)}.` : `The lines do not cross inside this window; they would cross at ${when}.`;
}
export function graphLabel(rateA: number, feeA: number, rateB: number, feeB: number) {
  return `Cost against hours rented. Shop A starts at ${dollars(feeA)} and rises ${dollars(rateA)} each hour; Shop B starts at ${dollars(feeB)} and rises ${dollars(rateB)} each hour. ${crossStory(comparePlans(rateA, feeA, rateB, feeB))}`;
}
export function solvedLine(rateA: number, feeA: number, rateB: number, feeB: number) {
  const meeting = comparePlans(rateA, feeA, rateB, feeB);
  if (meeting.kind === "many") return "0 = 0, true for every h";
  if (meeting.kind === "none") return `0 = ${signedText(feeB - feeA)}, which is false`;
  return `h = ${signedText(feeB - feeA)} ÷ ${signedText(rateA - rateB)} = ${fracText(meeting.hours)}`;
}
export function readoutSentence(meeting: Comparison) {
  if (meeting.kind === "many") return "Infinitely many solutions: the two price lists are identical, so every hour is a break-even hour.";
  if (meeting.kind === "none") return "No solution: equal hourly rates keep the deposit gap forever, so the totals never meet.";
  const rational = `The time itself is rational, because ${decimalStory(meeting.hours)}.`;
  return crossesInWindow(meeting) ? `Exactly one solution. Both shops take ${moneyText(meeting.cost)} at that moment. ${rational}` : `Exactly one solution, h = ${fracText(meeting.hours)}, but that time sits outside the drawn window of 0 to ${HOURS_MAX} hours. ${rational}`;
}

export const NL_W = 460, NL_H = 96, NL_PAD = 34, NL_Y = 52, NL_SPAN = 3;
/** The two consecutive whole numbers a value sits between, plus the window to draw. */
export function trapBetween(value: number) { const lo = Math.floor(value); return { lo, hi: lo + 1, start: lo - 1, exact: Number.isInteger(value) }; }
export function scaleLine(value: number, start: number) { return NL_PAD + ((value - start) / NL_SPAN) * (NL_W - 2 * NL_PAD); }
export function placedNumber(target: Target, meeting: Comparison): Placed | null {
  if (target === "root2") return { text: "√2", srText: "The square root of 2", value: Math.SQRT2 };
  return meeting.kind === "one" ? { text: fracText(meeting.hours), srText: "The break-even time", value: fractionValue(meeting.hours) } : null;
}
export function lineLabel(placed: Placed) {
  const trap = trapBetween(placed.value);
  return `Number line from ${signedText(trap.start)} to ${signedText(trap.start + NL_SPAN)}. ${placed.srText} is marked ${trap.exact ? `exactly on ${signedText(trap.lo)}` : `between ${signedText(trap.lo)} and ${signedText(trap.hi)}`}.`;
}
export function numberLineNote(target: Target, meeting: Comparison) {
  if (target === "root2") {
    const trap = trapBetween(Math.SQRT2); // 1 and 2
    return `${trap.lo} × ${trap.lo} = ${trap.lo * trap.lo} sits below 2 and ${trap.hi} × ${trap.hi} = ${trap.hi * trap.hi} sits above it, so √2 lands between ${trap.lo} and ${trap.hi}. Its digits, 1.41421356..., never stop and never fall into a repeating block, so no fraction of whole numbers equals it.`;
  }
  if (meeting.kind === "many") return "Every hour is a break-even hour right now, so there is no single number to place. Change one deposit to bring a single answer back.";
  if (meeting.kind === "none") return "These plans never cost the same, so there is no break-even time to place. Change one hourly rate to bring a single answer back.";
  const trap = trapBetween(fractionValue(meeting.hours));
  return `${fracText(meeting.hours)} ${trap.exact ? `lands exactly on ${signedText(trap.lo)}` : `sits between ${signedText(trap.lo)} and ${signedText(trap.hi)}`}, and ${decimalStory(meeting.hours)} — the signature of a rational number.`;
}

export const SVG_W = 500, SVG_H = 280, PAD_L = 48, PAD_R = 16, PAD_T = 20, PAD_B = 40;
export function axisTop(rateA: number, feeA: number, rateB: number, feeB: number) { return Math.max(20, Math.ceil(Math.max(costAt(rateA, feeA, HOURS_MAX), costAt(rateB, feeB, HOURS_MAX)) / 20) * 20); }
export function scaleX(hours: number) { return PAD_L + (hours / HOURS_MAX) * (SVG_W - PAD_L - PAD_R); }
export function scaleY(dollarAmount: number, top: number) { return SVG_H - PAD_B - (dollarAmount / top) * (SVG_H - PAD_T - PAD_B); }
/** Keep the crossing-point caption on the roomy side of the dot and below the top edge. */
export function crossLabel(hours: number, dollarAmount: number, top: number) {
  const right = hours > HOURS_MAX / 2;
  return { x: scaleX(hours) + (right ? -10 : 10), y: Math.max(PAD_T + 12, scaleY(dollarAmount, top) - 12), anchor: right ? ("end" as const) : ("start" as const) };
}

export const EXAMPLE = { pass: 45, perVisit: 2, dayRate: 7 };
export function workedExample() {
  const gap = EXAMPLE.dayRate - EXAMPLE.perVisit, visits = EXAMPLE.pass / gap;
  return { gap, visits, passTotal: EXAMPLE.pass + EXAMPLE.perVisit * visits, dayTotal: EXAMPLE.dayRate * visits };
}
export function exampleSteps(): Step[] {
  const worked = workedExample();
  return [
    { title: "Write what each choice costs", math: `${EXAMPLE.pass} + ${EXAMPLE.perVisit}v   and   ${EXAMPLE.dayRate}v`, note: `Let v be the number of visits. The season pass is ${EXAMPLE.pass} dollars once plus ${EXAMPLE.perVisit} a visit; day tickets are ${EXAMPLE.dayRate} a visit with nothing up front.` },
    { title: "Set the two costs equal", math: `${EXAMPLE.pass} + ${EXAMPLE.perVisit}v = ${EXAMPLE.dayRate}v`, note: "Asking when the two choices cost the same turns two expressions into one linear equation in one variable." },
    { title: "Gather the v terms on one side", math: `${EXAMPLE.pass} = ${worked.gap}v`, note: `Subtract ${EXAMPLE.perVisit}v from both sides: ${EXAMPLE.dayRate}v − ${EXAMPLE.perVisit}v = ${worked.gap}v. The v terms did not cancel, so there is exactly one answer.` },
    { title: "Undo the multiplication", math: `v = ${EXAMPLE.pass} ÷ ${worked.gap} = ${worked.visits}`, note: `Divide both sides by ${worked.gap}. Because that divisor is not zero, the answer arrives as one integer divided by another, which is what makes an answer of this kind rational.` },
    { title: "Check both sides", math: `${EXAMPLE.pass} + ${EXAMPLE.perVisit}(${worked.visits}) = ${worked.passTotal}   and   ${EXAMPLE.dayRate}(${worked.visits}) = ${worked.dayTotal}`, note: "Both totals come to the same number of dollars, so the answer holds." },
    { title: "Read it as a crossing point", math: `(${worked.visits}, ${worked.passTotal})`, note: `Those numbers also solve the system y = ${EXAMPLE.pass} + ${EXAMPLE.perVisit}v and y = ${EXAMPLE.dayRate}v, because the point sits on both lines at once.` },
  ];
}
export function revealLabel(shown: number, total: number) { return shown === 0 ? "Show the first step" : shown < total ? "Next step" : "All steps shown"; }

export const TRY_OPTIONS: NumberCard[] = [
  { label: "7/3", value: 7 / 3, fraction: { num: 7, den: 3 }, why: "7/3 is already one whole number over another, so it is rational; its decimal 2.333... repeats a block forever." },
  { label: "0.75", value: 0.75, fraction: { num: 3, den: 4 }, why: "A decimal that stops is a fraction in disguise: 0.75 = 75/100 = 3/4." },
  { label: "√9", value: 3, fraction: { num: 3, den: 1 }, why: "A square root can still be rational. √9 is exactly 3, and 3 = 3/1." },
  { label: "√2", value: Math.SQRT2, fraction: null, why: "Right. No whole number squares to 2, and no fraction does either, so √2 = 1.41421356... never stops and never repeats." },
];
export function tryAnswerIndex() { return TRY_OPTIONS.findIndex((option) => option.fraction === null); }
export function tryFeedback(pick: number | null) {
  if (pick === null) return "Pick the number you think is irrational.";
  return `${pick === tryAnswerIndex() ? "Correct." : "Not that one."} ${TRY_OPTIONS[pick].why}`;
}

/**
 * The Math check sentence about the KIND of number the answer is. It may only
 * divide by the rate gap when that gap is not zero, so the equal-rate states get
 * the general statement instead of a division by zero.
 */
export function mathCheckRationalClause(rateA: number, feeA: number, rateB: number, feeB: number) {
  const meeting = comparePlans(rateA, feeA, rateB, feeB);
  if (meeting.kind !== "one") return "With the two hourly rates equal there is no single h to look at, but whenever the rates differ the answer arrives as the deposit gap divided by the rate gap, one integer divided by another, so it is rational";
  return `Now look at what kind of number the answer is: h = (${feeB} − ${feeA}) ÷ (${rateA} − ${rateB}) = ${fracText(meeting.hours)} is one integer divided by another, so it is rational`;
}

/* ---------- lesson ---------- */

export default function Lesson() {
  const [rateA, setRateA] = useState(5);
  const [feeA, setFeeA] = useState(1);
  const [rateB, setRateB] = useState(2);
  const [feeB, setFeeB] = useState(8);
  const [target, setTarget] = useState<Target>("break");
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const meeting = comparePlans(rateA, feeA, rateB, feeB);
  const top = axisTop(rateA, feeA, rateB, feeB);
  const cross = meeting.kind === "one" && crossesInWindow(meeting)
    ? { ...crossLabel(fractionValue(meeting.hours), fractionValue(meeting.cost), top), cx: scaleX(fractionValue(meeting.hours)), cy: scaleY(fractionValue(meeting.cost), top), text: `(${fracText(meeting.hours)} h, $${fracText(meeting.cost)})` } : null;
  const placed = placedNumber(target, meeting);
  const trap = placed ? trapBetween(placed.value) : null;
  const steps = exampleSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>Two bike shops rent the same bike. One takes a small deposit and charges more for every hour; the other takes a bigger deposit and charges less. Neither shop is simply cheaper. Which one wins depends on how long you ride, and somewhere in between there is a moment when the two totals are exactly equal. Finding that moment, and trusting the number it hands you, is what this chapter is about.</p>
      <p>Written down, the question is <strong>{rateA}h + {feeA} = {rateB}h + {feeB}</strong>: one equation, one unknown. Drawn on a grid it is two straight lines, and an answer is a point that sits on both of them — when they cross at all, because two lines can also run parallel or lie right on top of each other. Whenever a single answer does turn up it is worth a second look, because it arrives as one integer divided by another, so its decimal has to stop or repeat. Numbers that do neither, such as √2, are a different species, and this chapter gets you ready for both.</p>

      <Figure caption="Change either shop and watch the equation, the crossing point, and the kind of number the answer is, all move together.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[15px] font-black">
            <span style={{ color: SHOP_A }}>Shop A total = {feeA} + {rateA}h</span>
            <span style={{ color: SHOP_B }}>Shop B total = {feeB} + {rateB}h</span>
          </div>
          <svg className="mx-auto h-auto max-w-full" width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label={graphLabel(rateA, feeA, rateB, feeB)}>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line x1={PAD_L} y1={scaleY((top / 4) * i, top)} x2={SVG_W - PAD_R} y2={scaleY((top / 4) * i, top)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD_L - 8} y={scaleY((top / 4) * i, top) + 4} textAnchor="end" fontSize={11} fill="var(--ink-faint)">${(top / 4) * i}</text>
              </g>
            ))}
            <line x1={PAD_L} y1={scaleY(0, top)} x2={SVG_W - PAD_R} y2={scaleY(0, top)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={scaleY(0, top)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {[0, 2, 4, 6, 8].map((h) => (<text key={h} x={scaleX(h)} y={SVG_H - PAD_B + 16} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{h}</text>))}
            <text x={(PAD_L + SVG_W - PAD_R) / 2} y={SVG_H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">hours rented</text>
            <line x1={scaleX(0)} y1={scaleY(feeA, top)} x2={scaleX(HOURS_MAX)} y2={scaleY(costAt(rateA, feeA, HOURS_MAX), top)} stroke={SHOP_A} strokeWidth={2.5} />
            <line x1={scaleX(0)} y1={scaleY(feeB, top)} x2={scaleX(HOURS_MAX)} y2={scaleY(costAt(rateB, feeB, HOURS_MAX), top)} stroke={SHOP_B} strokeWidth={2.5} strokeDasharray="7 4" />
            {cross ? (
              <g>
                <line x1={cross.cx} y1={cross.cy} x2={cross.cx} y2={scaleY(0, top)} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="4 4" />
                <circle cx={cross.cx} cy={cross.cy} r={6} fill={ACCENT} stroke="white" strokeWidth={2} />
                <text x={cross.x} y={cross.y} textAnchor={cross.anchor} fontSize={12} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{cross.text}</text>
              </g>
            ) : null}
          </svg>
          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: ACCENT }}>
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Set the two totals equal</div>
            <div className="mt-1 font-mono text-lg font-black">{rateA}h + {feeA} = {rateB}h + {feeB}</div>
            <div className="font-mono text-[15px] text-[var(--ink-soft)]">{`(${rateA} − ${rateB})h = ${feeB} − ${feeA}`} {"→"} {`${signedText(rateA - rateB)}h = ${signedText(feeB - feeA)}`}</div>
            <div className="mt-1 font-mono text-lg font-black" style={{ color: ACCENT }}>{solvedLine(rateA, feeA, rateB, feeB)}</div>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{readoutSentence(meeting)}</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Shop A per hour" value={rateA} min={1} max={8} color={SHOP_A} onChange={setRateA} />
            <Stepper label="Shop A deposit" value={feeA} min={0} max={10} color={SHOP_A} onChange={setFeeA} />
            <Stepper label="Shop B per hour" value={rateB} min={1} max={8} color={SHOP_B} onChange={setRateB} />
            <Stepper label="Shop B deposit" value={feeB} min={0} max={10} color={SHOP_B} onChange={setFeeB} />
          </div>
          <div className="flex w-full max-w-xl flex-col items-center gap-3 border-t border-[var(--line)] pt-4">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Put a number on the line</span>
            <div className="flex flex-wrap justify-center gap-2">
              {[{ id: "break" as const, label: "the break-even time" }, { id: "root2" as const, label: "√2" }].map((choice) => (
                <button key={choice.id} type="button" onClick={() => setTarget(choice.id)} aria-pressed={target === choice.id} className="rounded-lg border px-3 py-1.5 text-sm font-bold" style={target === choice.id ? { background: ACCENT, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{choice.label}</button>
              ))}
            </div>
            {placed && trap ? (
              <svg className="mx-auto h-auto max-w-full" width={NL_W} height={NL_H} viewBox={`0 0 ${NL_W} ${NL_H}`} role="img" aria-label={lineLabel(placed)}>
                <line x1={scaleLine(trap.lo, trap.start)} y1={NL_Y} x2={scaleLine(trap.hi, trap.start)} y2={NL_Y} stroke={ACCENT} strokeWidth={8} opacity={0.22} />
                <line x1={NL_PAD} y1={NL_Y} x2={NL_W - NL_PAD} y2={NL_Y} stroke="var(--ink-soft)" strokeWidth={2} />
                {[0, 1, 2, 3].map((i) => (
                  <g key={i}>
                    <line x1={scaleLine(trap.start + i, trap.start)} y1={NL_Y - 8} x2={scaleLine(trap.start + i, trap.start)} y2={NL_Y + 8} stroke="var(--ink-soft)" strokeWidth={2} />
                    <text x={scaleLine(trap.start + i, trap.start)} y={NL_Y + 26} textAnchor="middle" fontSize={12} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{signedText(trap.start + i)}</text>
                  </g>
                ))}
                <circle cx={scaleLine(placed.value, trap.start)} cy={NL_Y} r={7} fill={ACCENT} stroke="white" strokeWidth={2} />
                <text x={scaleLine(placed.value, trap.start)} y={NL_Y - 20} textAnchor="middle" fontSize={14} fontWeight={800} fill={ACCENT} fontFamily="var(--font-mono)">{placed.text}</text>
              </svg>
            ) : null}
            <p className="m-0 text-center text-sm text-[var(--ink-soft)]">{numberLineNote(target, meeting)}</p>
          </div>
        </div>
      </Figure>

      <h2>Worked example: one equation, one answer</h2>
      <p>A city pool sells a season pass for {EXAMPLE.pass} dollars plus {EXAMPLE.perVisit} dollars a visit. Day tickets cost {EXAMPLE.dayRate} dollars a visit and nothing up front. After how many visits do the two choices cost the same? Reveal the reasoning one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{revealLabel(shown, steps.length)}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} shown</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((step, i) => (
            <li key={step.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {step.title}</div>
              <div className="font-mono text-[17px] font-black">{step.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{step.note}</div>
            </li>
          ))}
        </ol>
      </div>
      <h2>Try it</h2>
      <p>Every break-even time the figure finds arrives as one integer divided by another. Which of these four numbers can <em>never</em> be written that way?</p>
      <div className="flex flex-wrap gap-2">
        {TRY_OPTIONS.map((option, i) => (
          <button key={option.label} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-1.5 font-mono text-base font-bold" style={pick === i ? { background: i === tryAnswerIndex() ? SHOP_B : SHOP_A, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{option.label}</button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{tryFeedback(pick)}</p>
      <h2>Where this chapter goes</h2>
      <p>Each lesson ahead sharpens one piece of this picture. <strong>Rational vs Irrational</strong> starts from the decimal itself: if it stops or repeats, a fraction of integers is hiding inside it. <strong>Approximating Irrationals</strong> takes on the numbers that do neither, trapping them between whole numbers and then between tenths, exactly the way the number line above trapped √2. <strong>Solving Linear Equations</strong> drills the move at the heart of the figure, including the two strange cases where the variable disappears completely. <strong>Systems of Equations</strong> keeps both lines in view and adds substitution and elimination, so you can find the crossing point without drawing anything at all.</p>
      <MathCheck>
        <p>Setting the two totals equal gives a linear equation in one variable, {rateA}h + {feeA} = {rateB}h + {feeB} (8.EE.C.7). Collecting the h terms leaves {signedText(rateA - rateB)}h = {signedText(feeB - feeA)}: when the hourly rates differ, that coefficient is not zero and there is exactly one solution; when the rates match, the h terms vanish and what remains is either always true (infinitely many solutions) or never true (no solution). The same two price lists are also a system, y = {rateA}h + {feeA} and y = {rateB}h + {feeB}, and a solution of that system is exactly a point lying on both lines, so the system has one solution when the lines cross, none when they are parallel, and infinitely many when they coincide (8.EE.C.8). {mathCheckRationalClause(rateA, feeA, rateB, feeB)}, and long division on such a fraction can only stop or fall into a repeating block, since dividing by a fixed whole number leaves only finitely many possible remainders and a repeat forces the digits to cycle (8.NS.A.1). Pinning a number between two consecutive whole numbers is the same move that pins down an irrational: 1 × 1 = 1 and 2 × 2 = 4 trap √2 between 1 and 2, even though its digits never stop and never repeat (8.NS.A.2).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color?: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-9 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
