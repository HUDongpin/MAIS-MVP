"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const ACCENT = "var(--band-middle)", START_COLOR = "var(--band-early)", RESULT_COLOR = "var(--band-upper)";
export const MINUS = "−";

/* ---------- exact rational arithmetic (pure helpers; the test exercises each one) ---------- */
export type Frac = { n: number; d: number };
export function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
export function frac(n: number, d: number): Frac { const s = d < 0 ? -1 : 1; const g = gcd(n, d) || 1; const num = (s * n) / g; return { n: num === 0 ? 0 : num, d: (s * d) / g }; }
export function sameF(x: Frac, y: Frac): boolean { return x.n === y.n && x.d === y.d; }
export function negF(f: Frac): Frac { return { n: f.n === 0 ? 0 : -f.n, d: f.d }; }
export function absF(f: Frac): Frac { return { n: Math.abs(f.n), d: f.d }; }
export function addF(a: Frac, b: Frac): Frac { return frac(a.n * b.d + b.n * a.d, a.d * b.d); }
export function subF(a: Frac, b: Frac): Frac { return frac(a.n * b.d - b.n * a.d, a.d * b.d); }
export function mulF(a: Frac, b: Frac): Frac { return frac(a.n * b.n, a.d * b.d); }
export function divExact(a: Frac, b: Frac): Frac { if (b.n === 0) throw new Error("cannot divide by zero"); return frac(a.n * b.d, a.d * b.n); }
export function reciprocal(f: Frac): Frac { return divExact(frac(1, 1), f); }
export function toNum(f: Frac): number { return f.n / f.d; }

export function fracLabel(f: Frac): string { return `${f.n < 0 ? MINUS : ""}${Math.abs(f.n)}${f.d === 1 ? "" : `/${f.d}`}`; }
export function parenLabel(f: Frac): string { return f.n < 0 ? `(${fracLabel(f)})` : fracLabel(f); }
export function divisorLabel(f: Frac): string { return f.d === 1 && f.n >= 0 ? fracLabel(f) : `(${fracLabel(f)})`; } // parenthesised unless whole, so "a ÷ (c/d)" is never read as "a ÷ c / d"
export function signedLabel(f: Frac): string { return f.n === 0 ? "0" : f.n < 0 ? fracLabel(f) : `+${fracLabel(f)}`; }
export function terminates(f: Frac): boolean { let d = f.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }
export function decimalLabel(f: Frac): string {
  // A terminating decimal is written out in full; a repeating one is truncated, never rounded up.
  const sign = f.n < 0 ? MINUS : "", n = Math.abs(f.n);
  let rem = n % f.d, digits = "";
  if (rem === 0) return `${sign}${n / f.d}`;
  for (let i = 0, limit = terminates(f) ? 4 : 3; i < limit && rem !== 0; i += 1) { rem *= 10; digits += Math.floor(rem / f.d); rem %= f.d; }
  return `${sign}${Math.floor(n / f.d)}.${digits}${rem === 0 ? "" : "…"}`;
}
export function parenDecimal(f: Frac): string { return f.n < 0 ? `(${decimalLabel(f)})` : decimalLabel(f); }
export function unitWord(f: Frac): string { return Math.abs(toNum(f)) === 1 ? "unit" : "units"; }
export function moneyLabel(f: Frac): string { return `${f.n < 0 ? MINUS : ""}$${Math.abs(toNum(f)).toFixed(2)}`; }

/* ---------- the four operations on one number line ---------- */
export const OPS = [{ id: "add", symbol: "+", name: "Addition" }, { id: "sub", symbol: MINUS, name: "Subtraction" },
  { id: "mul", symbol: "×", name: "Multiplication" }, { id: "div", symbol: "÷", name: "Division" }] as const;
export type OpId = (typeof OPS)[number]["id"];
export function symbolFor(id: OpId): string { return OPS.find((o) => o.id === id)?.symbol ?? "+"; }
export function nameFor(id: OpId): string { return OPS.find((o) => o.id === id)?.name ?? "Addition"; }
export function applyOp(id: OpId, a: Frac, b: Frac): Frac | null {
  if (id === "add") return addF(a, b);
  if (id === "sub") return subF(a, b);
  return id === "mul" ? mulF(a, b) : b.n === 0 ? null : divExact(a, b);
}

// Both numbers are set in halves, so each one is k/2 for k from -4 to 4, that is -2 to 2. Every sum,
// difference, product and quotient a student can reach then lands inside [-4, 4] and fits the drawn line.
export const HALF_MIN = -4, HALF_MAX = 4;
export function halves(k: number): Frac { return frac(k, 2); }

export const W = 700, H = 210, PAD = 46, AXIS_Y = 138, LANE_1 = 104, LANE_2 = 66;
export const LINE_MIN = -4.5, LINE_MAX = 4.5;
export function xScale(v: number): number { return PAD + ((v - LINE_MIN) / (LINE_MAX - LINE_MIN)) * (W - 2 * PAD); }
export const TICKS = Array.from({ length: 19 }, (_, i) => LINE_MIN + i * 0.5);
export function fmtNum(v: number): string { return v < 0 ? `${MINUS}${Math.abs(v)}` : `${v}`; }
export function arrowPoints(x1: number, x2: number, y: number): string { const dir = x2 > x1 ? 1 : -1; return `${x2},${y} ${x2 - dir * 9},${y - 6} ${x2 - dir * 9},${y + 6}`; }

export type PlannedArrow = { role: "start" | "move"; from: Frac; to: Frac; y: number; color: string; label: string };
export function arrowPlan(id: OpId, a: Frac, b: Frac, result: Frac | null): PlannedArrow[] {
  const zero = frac(0, 1);
  const plan: PlannedArrow[] = [];
  if (a.n !== 0) plan.push({ role: "start", from: zero, to: a, y: LANE_1, color: START_COLOR, label: fracLabel(a) });
  const chained = id === "add" || id === "sub";
  const from = chained ? a : zero;
  // Adding and subtracting chain a second arrow onto the first; multiplying and dividing redraw it from 0.
  if (result !== null && !sameF(from, result)) plan.push({ role: "move", from, to: result, y: LANE_2, color: ACCENT, label: chained ? signedLabel(id === "add" ? b : negF(b)) : fracLabel(result) });
  return plan;
}

export function equationText(id: OpId, a: Frac, b: Frac, result: Frac | null): string { return result === null ? `${fracLabel(a)} ${symbolFor(id)} 0 is undefined` : `${fracLabel(a)} ${symbolFor(id)} ${id === "div" ? divisorLabel(b) : parenLabel(b)} = ${fracLabel(result)}`; }
export function figureLabel(id: OpId, a: Frac, b: Frac, result: Frac | null): string {
  const parts = [`Number line from ${MINUS}4.5 to 4.5 showing ${nameFor(id).toLowerCase()}: ${equationText(id, a, b, result)}.`];
  for (const p of arrowPlan(id, a, b, result)) parts.push(`${p.role === "start" ? "The starting arrow" : "The operation arrow"} runs from ${fracLabel(p.from)} to ${fracLabel(p.to)}.`);
  parts.push(result === null ? "Nothing is marked as the answer." : `The answer ${fracLabel(result)} is marked on the line.`);
  return parts.join(" ");
}
export function signRule(a: Frac, b: Frac): string { return (a.n > 0) === (b.n > 0) ? "The two signs match, so the answer is positive." : "The two signs are different, so the answer is negative."; }
export function explain(id: OpId, a: Frac, b: Frac): string {
  const opp = negF(b);
  if (id === "add" || id === "sub") {
    if (b.n === 0) return `${id === "add" ? "Adding" : "Subtracting"} 0 moves nothing, so the answer is still ${fracLabel(a)}.`;
    const step = id === "add" ? b : opp, slide = `slides you ${fracLabel(absF(b))} ${unitWord(b)} to the ${step.n > 0 ? "right" : "left"}`;
    if (id === "add") return `Adding ${parenLabel(b)} ${slide}, from ${fracLabel(a)} to ${fracLabel(addF(a, b))}.`;
    return `Subtracting ${parenLabel(b)} is the same as adding its opposite ${parenLabel(opp)}, which ${slide}: ${fracLabel(a)} ${MINUS} ${parenLabel(b)} = ${fracLabel(a)} + ${parenLabel(opp)} = ${fracLabel(subF(a, b))}.`;
  }
  if (id === "mul") {
    if (a.n === 0 || b.n === 0) return "A product with a factor of 0 is 0, so the answer arrow has no length at all.";
    return `Multiplying by ${parenLabel(b)} makes the ${fracLabel(a)} arrow ${fracLabel(absF(b))} times as long${b.n < 0 ? " and flips it to the other side of 0" : ""}, landing on ${fracLabel(mulF(a, b))}. ${signRule(a, b)}`;
  }
  if (b.n === 0) return a.n === 0 ? "Every number times 0 gives 0, so 0 divided by 0 has no single answer. Dividing by 0 is undefined."
    : `No number times 0 gives ${fracLabel(a)}, so ${fracLabel(a)} divided by 0 is undefined.`;
  if (a.n === 0) return `Starting from 0 you never leave 0, so 0 ${symbolFor("div")} ${divisorLabel(b)} = 0.`;
  return `Dividing by ${parenLabel(b)} undoes multiplying by ${parenLabel(b)}: the answer ${fracLabel(divExact(a, b))} is the number whose arrow becomes the ${fracLabel(a)} arrow once it is made ${fracLabel(absF(b))} times as long${b.n < 0 ? " and flipped" : ""}. ${signRule(a, b)}`;
}
export function inverseCheck(id: OpId, a: Frac, b: Frac): string {
  if (id === "add") return `Check: ${fracLabel(addF(a, b))} ${MINUS} ${parenLabel(b)} = ${fracLabel(a)}, so subtracting undoes adding.`;
  if (id === "sub") return `Check: ${fracLabel(subF(a, b))} + ${parenLabel(b)} = ${fracLabel(a)}, so adding undoes subtracting.`;
  if (b.n === 0) return id === "mul" ? "A product with 0 cannot be undone by dividing, because dividing by 0 is undefined." : "There is nothing to check: dividing by 0 has no answer.";
  if (id === "mul") return `Check: ${fracLabel(mulF(a, b))} ${symbolFor("div")} ${divisorLabel(b)} = ${fracLabel(a)}, so dividing undoes multiplying.`;
  return `Check: ${fracLabel(divExact(a, b))} ${symbolFor("mul")} ${parenLabel(b)} = ${fracLabel(a)}, so multiplying undoes dividing.`;
}
export function decimalLine(id: OpId, a: Frac, b: Frac): string {
  const r = applyOp(id, a, b); return r === null ? `As decimals: ${decimalLabel(a)} ${symbolFor(id)} 0 is undefined too.` : `As decimals: ${decimalLabel(a)} ${symbolFor(id)} ${parenDecimal(b)} = ${decimalLabel(r)}${terminates(r) ? "" : ", a repeating decimal"}.`;
}

/* ---------- worked example and Try it, computed from constants ---------- */
export const WE = { startDepth: -12, riseN: 3, riseD: 4, seconds: 6 } as const;
export function workedExample() {
  const start = frac(WE.startDepth, 1), rise = frac(WE.riseN, WE.riseD), secs = frac(WE.seconds, 1);
  const change = mulF(secs, rise), depth = addF(start, change), gap = subF(frac(0, 1), depth), extra = divExact(gap, rise);
  return { start, rise, secs, change, depth, gap, extra, total: addF(secs, extra) };
}
export function workedSteps(): Array<{ title: string; math: string; why: string }> {
  const w = workedExample();
  return [
    { title: "Multiply to find how far it rises", math: `${WE.seconds} ${symbolFor("mul")} ${fracLabel(w.rise)} = ${decimalLabel(w.change)} m`, why: "A positive number of seconds times a positive rise per second gives a positive change (7.NS.A.2)." },
    { title: "Add the change to the starting depth", math: `${decimalLabel(w.start)} + ${decimalLabel(w.change)} = ${decimalLabel(w.depth)} m`, why: "Adding a positive number slides you to the right on the number line, which here means up toward the surface (7.NS.A.1)." },
    { title: "Subtract to find the distance still to go", math: `0 ${MINUS} ${parenDecimal(w.depth)} = 0 + ${decimalLabel(w.gap)} = ${decimalLabel(w.gap)} m`, why: "Subtracting a negative is adding its opposite, and the distance between two numbers is the size of their difference (7.NS.A.1)." },
    { title: "Divide to find the time that is left", math: `${decimalLabel(w.gap)} ${symbolFor("div")} ${divisorLabel(w.rise)} = ${decimalLabel(w.gap)} ${symbolFor("mul")} ${fracLabel(reciprocal(w.rise))} = ${decimalLabel(w.extra)} s`, why: `Dividing by a fraction is multiplying by its reciprocal (7.NS.A.2). With the first ${WE.seconds} seconds that is ${decimalLabel(w.total)} seconds in all, and naming the unit is what turns the number into an answer (7.NS.A.3).` },
  ];
}

export const TRY = { balance: -18, members: 4 } as const;
export function tryIt() {
  const share = frac(TRY.balance, TRY.members);
  const choices = [frac(-TRY.balance, TRY.members), share, frac(TRY.balance * TRY.members, 1), frac(TRY.balance + TRY.members, 1)];
  return { share, choices, correct: choices.findIndex((c) => sameF(c, share)) };
}
export function tryFeedback(pick: number | null): string {
  const t = tryIt(), q = `${fracLabel(frac(TRY.balance, 1))} ${symbolFor("div")} ${divisorLabel(frac(TRY.members, 1))}`;
  if (pick === null || pick === t.correct) return pick === null ? "" : `Yes. Sharing means dividing: ${q} = ${decimalLabel(t.share)}. A negative divided by a positive is negative, so each member holds ${moneyLabel(t.share)} of the shortfall.`;
  return `Not that one. ${moneyLabel(t.choices[pick])} is not ${q}. Sharing a balance among ${TRY.members} members divides it, and ${q} = ${decimalLabel(t.share)}.`;
}

export default function Lesson() {
  const [opId, setOpId] = useState<OpId>("mul");
  const [aHalves, setAHalves] = useState(-3);
  const [bHalves, setBHalves] = useState(-1);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const a = halves(aHalves), b = halves(bHalves);
  const result = applyOp(opId, a, b), plan = arrowPlan(opId, a, b, result);
  const boards = OPS.map((o) => ({ id: o.id, symbol: o.symbol, name: o.name, result: applyOp(o.id, a, b) }));
  const steps = workedSteps(), w = workedExample(), t = tryIt();

  return (
    <div className="prose-lesson max-w-none">
      <p>A thermometer reads eight degrees below zero, a bank balance sits at minus forty dollars, a survey drone hovers below sea level. Numbers like these are <strong>rational numbers</strong>: each one can be written as a fraction of two integers, positive or negative, and each one has its own place on the number line. This chapter is about doing arithmetic with all of them — adding, subtracting, multiplying and dividing — without ever losing track of the sign.</p>
      <p>One picture holds the whole chapter. Take two numbers and watch each operation as a move along the line: adding slides you, subtracting slides you the other way, multiplying rescales an arrow — longer when the factor is bigger than 1, shorter when it is between 0 and 1 — and dividing asks what arrow you must have started from. Choose an operation below, change either number, and see what the move looks like and why the answer comes out the sign it does.</p>

      <Figure caption="One number line, four operations. The lower arrow is the first number; the upper arrow is what the chosen operation does to it.">
        <div className="flex flex-col items-center gap-5">
          <FigureScroll>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto max-w-full" role="img" aria-label={figureLabel(opId, a, b, result)}>
              <line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="var(--ink-soft)" strokeWidth={2} />
              {TICKS.map((v) => (
                <g key={v}>
                  <line x1={xScale(v)} y1={AXIS_Y - (v === 0 ? 11 : Number.isInteger(v) ? 7 : 4)} x2={xScale(v)} y2={AXIS_Y + (v === 0 ? 11 : Number.isInteger(v) ? 7 : 4)} stroke="var(--ink-soft)" strokeWidth={v === 0 ? 2 : 1} />
                  {Number.isInteger(v) ? <text x={xScale(v)} y={AXIS_Y + 24} textAnchor="middle" fontSize={12} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{fmtNum(v)}</text> : null}
                </g>))}
              {plan.map((p) => (
                <g key={p.role} stroke={p.color} fill={p.color}>
                  <line x1={xScale(toNum(p.from))} y1={p.y} x2={xScale(toNum(p.to))} y2={p.y} strokeWidth={3} />
                  <polygon points={arrowPoints(xScale(toNum(p.from)), xScale(toNum(p.to)), p.y)} stroke="none" />
                  <line x1={xScale(toNum(p.from))} y1={p.y} x2={xScale(toNum(p.from))} y2={AXIS_Y} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                  <text x={(xScale(toNum(p.from)) + xScale(toNum(p.to))) / 2} y={p.y - 9} textAnchor="middle" fontSize={13} fontWeight={800} stroke="none" fontFamily="var(--font-mono)">{p.label}</text>
                </g>))}
              <circle cx={xScale(0)} cy={AXIS_Y} r={4} fill="var(--ink-soft)" />
              {result === null ? <text x={W / 2} y={LANE_2} textAnchor="middle" fontSize={15} fontWeight={800} fill="var(--ink-faint)">nothing to mark: dividing by 0 is undefined</text> : (
                <g>
                  <circle cx={xScale(toNum(result))} cy={AXIS_Y} r={8} fill={RESULT_COLOR} stroke="white" strokeWidth={2.5} />
                  <text x={xScale(toNum(result))} y={AXIS_Y + 46} textAnchor="middle" fontSize={14} fontWeight={800} fill={RESULT_COLOR} fontFamily="var(--font-mono)">{fracLabel(result)}</text>
                </g>)}
            </svg>
          </FigureScroll>

          <div role="status" className="flex w-full flex-col items-center gap-5">
            <div className="rounded-2xl border-2 px-6 py-3 text-center" style={{ borderColor: ACCENT }}>
              <div className="font-mono text-2xl font-black" style={{ color: ACCENT }}>{equationText(opId, a, b, result)}</div>
              <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{decimalLine(opId, a, b)}</div>
            </div>
            <p className="m-0 max-w-xl text-center text-[15px] text-[var(--ink-soft)]">{explain(opId, a, b)}</p>
            <p className="m-0 max-w-xl text-center font-mono text-sm text-[var(--ink-faint)]">{inverseCheck(opId, a, b)}</p>
          </div>

          <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
            {boards.map((o) => (
              <button key={o.id} type="button" onClick={() => setOpId(o.id)} aria-pressed={opId === o.id} aria-label={`${o.name}: ${equationText(o.id, a, b, o.result)}`} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-left" style={opId === o.id ? { borderColor: ACCENT, background: "color-mix(in oklab, var(--band-middle) 14%, var(--surface))" } : { borderColor: "var(--line)" }}>
                <span className="font-mono text-xl font-black" style={{ color: opId === o.id ? ACCENT : "var(--ink-faint)" }}>{o.symbol}</span>
                <span className="font-mono text-sm font-bold">{equationText(o.id, a, b, o.result)}</span>
              </button>))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <Stepper label="First number" value={aHalves} min={HALF_MIN} max={HALF_MAX} color={START_COLOR} onChange={setAHalves} />
            <Stepper label="Second number" value={bHalves} min={HALF_MIN} max={HALF_MAX} color={ACCENT} onChange={setBHalves} />
          </div>
        </div>
      </Figure>

      <h2>Worked example: a survey drone comes up</h2>
      <p>A survey drone is holding at <strong>{decimalLabel(w.start)} m</strong>, that is {Math.abs(WE.startDepth)} meters below the surface. It starts rising <strong>{fracLabel(w.rise)} of a meter</strong> every second. Where is it after {WE.seconds} seconds, and how long does the whole climb to the surface take?</p>
      <div className="card my-4 p-4 sm:p-5">
        <ol id={stepsId} aria-live="polite" className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-lg border border-[var(--line)] px-4 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Step {i + 1}: {s.title}</div>
              <div className="font-mono text-base font-black" style={{ color: ACCENT }}>{s.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.why}</div>
            </li>))}
          {shown === 0 ? <li className="text-sm text-[var(--ink-faint)]">Press Next step to watch the reasoning unfold one move at a time.</li> : null}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown >= steps.length ? "All steps shown" : `Next step (${shown + 1} of ${steps.length})`}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>A club account is overdrawn: the balance is <strong>{moneyLabel(frac(TRY.balance, 1))}</strong>. The {TRY.members} members agree to share the shortfall equally. Written as a signed number, what is each member&rsquo;s share of that balance?</p>
      <div className="flex flex-wrap gap-2">
        {t.choices.map((c, i) => (
          <button key={fracLabel(c)} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-4 py-2 font-mono text-sm font-bold" style={pick === i ? { background: i === t.correct ? RESULT_COLOR : START_COLOR, color: "white", borderColor: i === t.correct ? RESULT_COLOR : START_COLOR } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{moneyLabel(c)}</button>))}
      </div>
      <p role="status" className="mt-3 min-h-6 text-[15px]">{tryFeedback(pick)}</p>

      <h2>Where this chapter goes</h2>
      <p>Three lessons follow, each taking one part of the picture slowly. <strong>Adding Integers with Arrows</strong>{" "}stays with the first two buttons: two arrows chained on a number line, and why arrows pointing opposite ways cancel. <strong>Multiplying &amp; Dividing Signed Numbers</strong>{" "}turns the stretching arrow into a rule you can say in one breath — same signs positive, different signs negative — and shows why division follows the same rule. <strong>Rational Numbers in the Real World</strong>{" "}puts all four operations to work on money, where a running balance can dip below zero and still mean something. Keep the arrow picture with you; it is the thread through all three.</p>

      <MathCheck>
        <p>Adding a number slides you along the line — right when it is positive, left when it is negative — and subtracting a number is the same as adding its opposite, so p {MINUS} q = p + ({MINUS}q), and the distance between two numbers is the size of their difference (7.NS.A.1). Multiplying by a number scales the arrow: it becomes as many times as long as the size of that factor, and a negative factor flips it across 0, which is exactly why matching signs give a positive product and differing signs give a negative one. Division is the undoing of multiplication, so it obeys that same sign rule, and dividing by a fraction is multiplying by its reciprocal; dividing by 0 has no answer at all, because no number times 0 can give anything but 0 (7.NS.A.2). Every result here is again a rational number, which is what makes these four operations enough to answer real questions about depths, balances and temperatures, once the unit is put back on the number (7.NS.A.3).</p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, color, onChange }: { label: string; value: number; min: number; max: number; color: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>{MINUS}</button>
        <span className="w-16 text-center text-2xl font-black tabular-nums" style={{ color }}>{fracLabel(halves(value))}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
      <span className="font-mono text-xs text-[var(--ink-faint)]">{decimalLabel(halves(value))}</span>
    </div>
  );
}
