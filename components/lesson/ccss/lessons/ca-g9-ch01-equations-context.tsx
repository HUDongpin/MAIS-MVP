"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-high)";
const BUDGET_COLOR = "var(--band-upper)";
const OVER_COLOR = "var(--band-early)";

/* ---------- pure helpers (exported so the test can exercise every state) ---------- */

export const CONTROLS = {
  fee: { min: 0, max: 40, step: 5 },
  rate: { min: 4, max: 12, step: 1 },
  budget: { min: 60, max: 200, step: 10 },
  shirts: { min: 0, max: 20, step: 1 },
} as const;
export const N_MAX = CONTROLS.shirts.max;

export function totalCost(fee: number, rate: number, shirts: number) { return fee + rate * shirts; }
export function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
/** Exact solution n of fee + rate·n = budget, as a reduced fraction n/d. */
export function exactShirts(fee: number, rate: number, budget: number) {
  const g = gcd(budget - fee, rate);
  return { n: (budget - fee) / g, d: rate / g };
}
/** Largest whole number of shirts with fee + rate·n <= budget (integer arithmetic, never below 0). */
export function mostShirts(fee: number, rate: number, budget: number) {
  const left = budget - fee;
  return left <= 0 ? 0 : (left - (left % rate)) / rate;
}
export function formatFraction({ n, d }: { n: number; d: number }) {
  if (d === 1) return `${n}`;
  const decimal = (n / d).toFixed(2).replace(/\.?0+$/, "");
  return 100 % d === 0 ? `${n}/${d} = ${decimal}` : `${n}/${d} (about ${(n / d).toFixed(2)})`;
}
export function shirtWord(n: number) { return n === 1 ? "shirt" : "shirts"; }
/** The cost model as algebra: "8n" with no setup fee, otherwise "20 + 8n". */
export function modelText(fee: number, rate: number) { return fee === 0 ? `${rate}n` : `${fee} + ${rate}n`; }
/** The model solved for n: the formula rearranged to highlight the number of shirts. */
export function solvedForShirts(fee: number, rate: number) { return fee === 0 ? `n = C ÷ ${rate}` : `n = (C − ${fee}) ÷ ${rate}`; }
/** The undo chain from the model to n, for "=" (spend it all) or "≤" (stay within it). */
export function solveChain(fee: number, rate: number, budget: number, sign: "=" | "≤") {
  const answer = `n ${sign} ${formatFraction(exactShirts(fee, rate, budget))}`;
  const divide = `${rate}n ${sign} ${budget - fee}`;
  return fee === 0 ? `${divide} → ${answer}` : `${modelText(fee, rate)} ${sign} ${budget} → ${divide} → ${answer}`;
}
export function undoWords(fee: number, rate: number) {
  return fee === 0 ? `divide both sides by ${rate}` : `subtract ${fee} from both sides, then divide by ${rate}`;
}

export const SVG_W = 460, SVG_H = 260, PAD_L = 48, PAD_R = 18, PAD_T = 24, PAD_B = 40;
export function axisMax(value: number) { return Math.max(100, Math.ceil(value / 50) * 50); }
export function scaleX(shirts: number) { return PAD_L + (shirts / N_MAX) * (SVG_W - PAD_L - PAD_R); }
export function scaleY(dollars: number, yMax: number) { return SVG_H - PAD_B - (dollars / yMax) * (SVG_H - PAD_T - PAD_B); }
export function labelBaseline(y: number) { return y - 6 >= PAD_T + 4 ? y - 6 : y + 15; }
export function pointLabel(shirts: number, cost: number, yMax: number) {
  const left = shirts > N_MAX / 2;
  return { x: scaleX(shirts) + (left ? -10 : 10), y: Math.max(PAD_T + 4, scaleY(cost, yMax) - 10), anchor: left ? "end" : "start" } as const;
}

export const EXAMPLE = { fee: 45, rate: 6.5, paid: 175 };
export function workedExample() {
  const afterFee = EXAMPLE.paid - EXAMPLE.fee;
  const meals = afterFee / EXAMPLE.rate;
  const check = EXAMPLE.fee + EXAMPLE.rate * meals;
  return { afterFee, meals, check };
}

export const TRY = { kit: 18, bag: 7, money: 60 };
export function tryItOptions() {
  const { kit, bag, money } = TRY;
  const most = (money - kit) / bag;
  const options = [
    { text: `${kit}b + ${bag} ≤ ${money}`, holds: (b: number) => kit * b + bag <= money, why: `This charges $${kit} for every bag and $${bag} only once. The kit is the one-time cost, so ${kit} stands alone and ${bag} multiplies b.` },
    { text: `${kit} + ${bag}b ≤ ${money}`, holds: (b: number) => kit + bag * b <= money, why: `One kit plus $${bag} for each of the b bags must stay at or below $${money}. Then ${bag}b ≤ ${money - kit}, so b ≤ ${most}: at most ${most} bags.` },
    { text: `${kit} + ${bag}b ≥ ${money}`, holds: (b: number) => kit + bag * b >= money, why: `The sign points the wrong way. This says the total is at least $${money}, which is spending more than she has.` },
    { text: `${bag}b ≤ ${money}`, holds: (b: number) => bag * b <= money, why: `This forgets the $${kit} kit, so it allows bags she cannot actually pay for.` },
  ];
  const truth = (b: number) => kit + bag * b <= money;
  const counts = Array.from({ length: 21 }, (_, b) => b);
  const correct = options.findIndex((o) => counts.every((b) => o.holds(b) === truth(b)));
  return { options, correct, most };
}

export default function Lesson() {
  const [fee, setFee] = useState(20);
  const [rate, setRate] = useState(8);
  const [budget, setBudget] = useState(150);
  const [shirts, setShirts] = useState(12);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const cost = totalCost(fee, rate, shirts);
  const exact = exactShirts(fee, rate, budget);
  const most = mostShirts(fee, rate, budget);
  const crossing = exact.n / exact.d;
  const onGraph = crossing <= N_MAX;
  const lineEnd = totalCost(fee, rate, N_MAX);
  const yMax = axisMax(Math.max(budget, lineEnd));
  const label = pointLabel(shirts, cost, yMax);
  const ex = workedExample();
  const tryIt = tryItOptions();
  const verdict = cost < budget ? `Within the $${budget} budget, with $${budget - cost} to spare.` : cost === budget ? `Exactly the $${budget} budget.` : `Over the $${budget} budget by $${cost - budget}.`;

  const steps = [
    { title: "Name the unknown", math: "m = number of meals", note: `The $${EXAMPLE.fee} delivery charge is fixed. The number of meals is what nobody wrote down.` },
    { title: "Build the expression", math: `${EXAMPLE.fee} + ${EXAMPLE.rate}m`, note: `A fixed charge plus $${EXAMPLE.rate} for each of the m meals — the same shape as the T-shirt model.` },
    { title: "Write the equation", math: `${EXAMPLE.fee} + ${EXAMPLE.rate}m = ${EXAMPLE.paid}`, note: `The council paid $${EXAMPLE.paid}, so the expression must equal ${EXAMPLE.paid}.` },
    { title: "Undo the addition", math: `${EXAMPLE.rate}m = ${ex.afterFee}`, note: `Subtract ${EXAMPLE.fee} from both sides: ${EXAMPLE.paid} − ${EXAMPLE.fee} = ${ex.afterFee}.` },
    { title: "Undo the multiplication", math: `m = ${ex.afterFee} ÷ ${EXAMPLE.rate} = ${ex.meals}`, note: `Divide both sides by ${EXAMPLE.rate}. Done with a letter instead of ${EXAMPLE.paid}, the same two moves give m = (C − ${EXAMPLE.fee}) ÷ ${EXAMPLE.rate}: the formula rearranged for m.` },
    { title: "Check in context", math: `${EXAMPLE.fee} + ${EXAMPLE.rate} × ${ex.meals} = ${EXAMPLE.fee} + ${EXAMPLE.rate * ex.meals} = ${ex.check}`, note: `That is the $${EXAMPLE.paid} on the receipt, so ${ex.meals} meals is right.` },
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Your club wants custom T-shirts for a tournament. The print shop charges a one-time setup fee of ${fee} to make the screen, then ${rate} for every shirt it prints. Before anyone orders, three questions come up: what will n shirts cost, how many shirts can a ${budget} budget cover, and is there a formula that turns any total straight into a shirt count? All three are answered by the same equation, <strong>C = {modelText(fee, rate)}</strong>.
      </p>
      <p>
        That is the big idea of this chapter. A situation described in words becomes an <strong>equation</strong> you can solve, <strong>graph</strong>, turn into an <strong>inequality</strong>, or <strong>rearrange</strong> — and the letters are not decoration. Here n counts shirts and C counts dollars, so every algebra move you make is a sentence about the order.
      </p>

      <Figure caption="Change the setup fee, the price per shirt, the budget, or the order size. The line, the equation, the inequality, and the rearranged formula all describe the same situation.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} role="img" aria-label={`Cost graph, 0 to ${N_MAX} shirts across and $0 to $${yMax} up: the cost line starts at $${fee} and rises $${rate} per shirt, a dashed line marks the $${budget} budget, the shaded band covers the order sizes drawn here that stay within that budget, and a point marks ${shirts} ${shirtWord(shirts)} costing $${cost}`}>
            <rect x={scaleX(0)} y={scaleY(budget, yMax)} width={scaleX(Math.min(crossing, N_MAX)) - scaleX(0)} height={scaleY(0, yMax) - scaleY(budget, yMax)} fill={BUDGET_COLOR} opacity={0.12} />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const v = (yMax / 5) * i;
              return (
                <g key={i}>
                  <line x1={PAD_L} y1={scaleY(v, yMax)} x2={SVG_W - PAD_R} y2={scaleY(v, yMax)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD_L - 8} y={scaleY(v, yMax) + 4} textAnchor="end" fontSize={11} fill="var(--ink-faint)">${v}</text>
                </g>
              );
            })}
            <line x1={PAD_L} y1={scaleY(0, yMax)} x2={SVG_W - PAD_R} y2={scaleY(0, yMax)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={scaleY(0, yMax)} stroke="var(--ink-soft)" strokeWidth={1.5} />
            {[0, 5, 10, 15, 20].map((t) => (
              <text key={t} x={scaleX(t)} y={SVG_H - PAD_B + 16} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{t}</text>
            ))}
            <text x={(PAD_L + SVG_W - PAD_R) / 2} y={SVG_H - 6} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">shirts (n)</text>
            <line x1={PAD_L} y1={scaleY(budget, yMax)} x2={SVG_W - PAD_R} y2={scaleY(budget, yMax)} stroke={BUDGET_COLOR} strokeWidth={2} strokeDasharray="6 4" />
            <text x={SVG_W - PAD_R} y={labelBaseline(scaleY(budget, yMax))} textAnchor="end" fontSize={11} fontWeight={700} fill={BUDGET_COLOR}>budget ${budget}</text>
            <line x1={scaleX(0)} y1={scaleY(fee, yMax)} x2={scaleX(N_MAX)} y2={scaleY(lineEnd, yMax)} stroke={ACCENT} strokeWidth={2.5} />
            {onGraph && <circle cx={scaleX(crossing)} cy={scaleY(budget, yMax)} r={5} fill="var(--surface)" stroke={BUDGET_COLOR} strokeWidth={2} />}
            <circle cx={scaleX(shirts)} cy={scaleY(cost, yMax)} r={6} fill={cost > budget ? OVER_COLOR : ACCENT} stroke="white" strokeWidth={2} />
            <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={12} fontWeight={800} fill={cost > budget ? OVER_COLOR : ACCENT}>${cost}</text>
          </svg>

          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Cost model (two variables)</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: ACCENT }}>C = {modelText(fee, rate)}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">The line starts at ${fee} and climbs ${rate} for every shirt.</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Order of {shirts} {shirtWord(shirts)}</div>
              <div className="mt-1 font-mono text-lg font-black">{fee} + {rate} × {shirts} = ${cost}</div>
              <div className="mt-1 text-sm" style={{ color: cost > budget ? OVER_COLOR : "var(--ink-soft)" }}>{verdict}</div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-2xl border-2 px-5 py-3" style={{ borderColor: BUDGET_COLOR }}>
            <div className="text-center text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">One budget, three questions</div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">Spend it all — an equation in one variable:</div>
            <div className="font-mono text-[15px] font-semibold">{solveChain(fee, rate, budget, "=")}</div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">Stay within it — an inequality, the budget as a constraint:</div>
            <div className="font-mono text-[15px] font-semibold">{solveChain(fee, rate, budget, "≤")}</div>
            <div className="text-sm text-[var(--ink-soft)]">
              So the club can order at most <strong>{most} {shirtWord(most)}</strong>, costing ${totalCost(fee, rate, most)}{onGraph ? "" : " — the crossing point sits past the right edge of the graph"}.
            </div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">Any total at all — the formula rearranged for n:</div>
            <div className="font-mono text-[15px] font-semibold">C = {modelText(fee, rate)} → {solvedForShirts(fee, rate)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Setup fee ($)" value={fee} min={0} max={40} step={5} onChange={setFee} />
            <Stepper label="Price per shirt ($)" value={rate} min={4} max={12} color={ACCENT} onChange={setRate} />
            <Stepper label="Budget ($)" value={budget} min={60} max={200} step={10} color={BUDGET_COLOR} onChange={setBudget} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Shirts ordered: <span className="text-[var(--ink)]">{shirts}</span></span>
            <input type="range" min={0} max={20} value={shirts} onChange={(e) => setShirts(Number(e.target.value))} className="w-56 accent-[var(--band-high)]" aria-label="Number of shirts ordered" />
          </div>
        </div>
      </Figure>

      <h2>Worked example: from a receipt to an equation</h2>
      <p>
        A food truck caters a student-council event for a ${EXAMPLE.fee} delivery charge plus ${EXAMPLE.rate} per meal. The receipt says ${EXAMPLE.paid}, and nobody remembers how many meals were ordered. Reveal the reasoning one move at a time.
      </p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} steps</span>
        </div>
        <ol id={stepsId} className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div>
              <div className="font-mono text-lg font-black">{s.math}</div>
              <div className="text-sm text-[var(--ink-soft)]">{s.note}</div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>
        Mina has ${TRY.money} for a jewelry project. A starter kit costs ${TRY.kit}, and each bag of beads costs ${TRY.bag}. If b is the number of bags, which statement says she stays within her money?
      </p>
      <div className="flex flex-wrap gap-2">
        {tryIt.options.map((o, i) => (
          <button key={o.text} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === tryIt.correct ? BUDGET_COLOR : OVER_COLOR, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            {o.text}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">
        {pick === null ? "Pick the statement you think matches the story." : pick === tryIt.correct ? `Correct. ${tryIt.options[pick].why}` : `Not quite. ${tryIt.options[pick].why}`}
      </p>

      <h2>Where this chapter goes</h2>
      <p>
        Two short number lessons come first, because every equation in this chapter lives in the real numbers. <strong>Rational Exponents Are Roots</strong> shows why 9<sup>1/2</sup> has to mean the square root of 9, so roots and powers obey one set of exponent rules. <strong>Rational, Irrational, and Sums</strong> settles which answers can be written as fractions and which, like 4 + √2, never can. Then the modeling begins. <strong>Modeling with Equations</strong> practices the two moves from the figure above: a one-variable equation to solve and a two-variable equation to graph. <strong>Constraints &amp; Rearranging Formulas</strong> turns limits like a budget into inequalities and systems, and makes flipping a formula around to isolate the letter you need a routine skill.
      </p>

      <MathCheck>
        <p>
          The T-shirt cost is a relationship between two quantities, so it is a two-variable equation, C = {modelText(fee, rate)}, and its graph is a line that meets the vertical axis at the setup fee ${fee} and rises ${rate} for every extra shirt (A-CED.2). Fixing C at the budget turns it into a one-variable equation, {modelText(fee, rate)} = {budget}, solved by doing the same thing to both sides — {undoWords(fee, rate)} — which gives n = {formatFraction(exact)} (A-CED.1). The budget is really a constraint, {modelText(fee, rate)} ≤ {budget}; the same steps apply, and because {rate} is positive, dividing keeps the inequality pointing the same way, so n ≤ {formatFraction(exact)} and the largest whole order is {most} {shirtWord(most)} (A-CED.3). Solving C = {modelText(fee, rate)} for n without choosing a number gives {solvedForShirts(fee, rate)}: the same formula rearranged to highlight the quantity you want (A-CED.4).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, color, onChange }: { label: string; value: number; min: number; max: number; step?: number; color?: string; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
