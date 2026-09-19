"use client";

import { useId, useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const TICKET_COLOR = "var(--band-early)";
const ACCENT = "var(--band-middle)";
const FIXED_COLOR = "var(--band-upper)";
/** A wrong pick is neutral grey: green is the shared Math check's "verified" colour and must never mean "no". */
const MISS_COLOR = "var(--ink-soft)";

/* ---------- pure helpers, exported so the test can drive every reachable state ---------- */

export const CONTROL = { members: { min: 2, max: 6, step: 1 }, ticket: { min: 4, max: 15, step: 1 }, guide: { min: 2, max: 8, step: 1 }, parking: { min: 3, max: 15, step: 3 }, budget: { min: 70, max: 160, step: 10 } } as const;

export function plural(n: number, word: string) { return n === 1 ? word : `${word}s`; }
/** The dollars that do not move when the ticket price moves: one guide each, plus one parking fee. */
export function fixedPart(members: number, guide: number, parking: number) { return members * guide + parking; }
/** The bill written the way the group pays it: members copies of (ticket + guide), then parking. */
export function groupedTotal(members: number, ticket: number, guide: number, parking: number) { return members * (ticket + guide) + parking; }
/** The same bill written in px + q form. */
export function linearTotal(members: number, ticket: number, guide: number, parking: number) { return members * ticket + fixedPart(members, guide, parking); }
/** Undo the +q, then undo the multiplication by p — the two moves that solve px + q = r. */
export function solveForTicket(bill: number, members: number, fixed: number) { return (bill - fixed) / members; }
/** The exact bound those same two moves give for members*x + fixed <= budget, before any rounding. */
export function exactTicketBound(budget: number, members: number, fixed: number) { return (budget - fixed) / members; }
/** That exact bound rounded down: the largest whole-dollar ticket that still fits. */
export function affordableTicket(budget: number, members: number, fixed: number) { const left = budget - fixed; return (left - (left % members)) / members; }
export function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
/** The exact bound written out with nothing rounded away: a terminating decimal when one exists, else a mixed number. */
export function exactBoundText(budget: number, members: number, fixed: number) {
  const whole = affordableTicket(budget, members, fixed);
  const rem = (budget - fixed) % members;
  if (rem === 0) return `${whole}`;
  const g = gcd(rem, members);
  const num = rem / g, den = members / g;
  // halves, quarters and fifths land on exact decimals; thirds and sixths do not, so they stay fractions
  return den === 3 || den === 6 ? `${whole} ${num}/${den}` : `${whole}.${(num * 100) / den}`.replace(/0$/u, "");
}
/** Every line the budget card prints, so its derivation and its answer can never drift apart. */
export function budgetLines(budget: number, members: number, fixed: number, bill: number) {
  const most = affordableTicket(budget, members, fixed);
  const exact = exactBoundText(budget, members, fixed);
  return {
    most, exact,
    inequality: `${members}x + ${fixed} ≤ ${budget}`,
    divide: `x ≤ (${budget} − ${fixed}) ÷ ${members} = ${exact}`,
    conclusion: `whole dollars: at most $${most}`,
    rounding: (budget - fixed) % members === 0 ? `The bound ${exact} is already a whole number of dollars, so a ticket can cost at most $${most}.` : `A ticket price is a whole number of dollars, so ${exact} rounds down to $${most}.`,
    fits: bill < budget ? `The $${bill} bill fits, with $${budget - bill} to spare.` : bill === budget ? `The $${bill} bill uses the budget exactly.` : `The $${bill} bill runs $${bill - budget} over the budget.`,
  };
}

/* ---------- tape geometry: ONE dollars-per-pixel ruler, so a fixed block never changes size ---------- */

export const TAPE = { W: 520, H: 190, PAD: 16, BAR_H: 34, ROW1_Y: 30, ROW2_Y: 102, MIN_LABEL_W: 22, CHAR_W: 6.6, BUDGET_HALF: 40, TOTAL_HALF: 52 } as const;
export const TAPE_W = TAPE.W - 2 * TAPE.PAD;
/** The tape is a ruler: its full width is the largest budget a club can set, so every bill fits inside it. */
export const SCALE_MAX = CONTROL.budget.max;
export const UNIT = TAPE_W / SCALE_MAX;

export type Segment = { key: string; x: number; w: number; fill: string; label: string; showLabel: boolean };

function segment(key: string, start: number, amount: number, fill: string, label: string): Segment { const w = amount * UNIT; return { key, x: TAPE.PAD + start * UNIT, w, fill, label, showLabel: w >= TAPE.MIN_LABEL_W }; }

export function tapeRows(members: number, ticket: number, guide: number, parking: number) {
  const bill = linearTotal(members, ticket, guide, parking);
  const paid: Segment[] = [];
  for (let i = 0; i < members; i += 1) {
    const start = i * (ticket + guide);
    paid.push(segment(`t${i}`, start, ticket, TICKET_COLOR, `$${ticket}`));
    paid.push(segment(`g${i}`, start + ticket, guide, ACCENT, `$${guide}`));
  }
  paid.push(segment("park", members * (ticket + guide), parking, FIXED_COLOR, `$${parking}`));
  const fixed = fixedPart(members, guide, parking);
  const regrouped: Segment[] = [segment("vary", 0, members * ticket, TICKET_COLOR, `$${members * ticket}`), segment("fixed", members * ticket, fixed, FIXED_COLOR, `$${fixed}`)];
  return { bill, unit: UNIT, end: TAPE.PAD + bill * UNIT, paid, regrouped };
}

/** Where the bill bracket ends, where the budget line falls, and label positions clamped inside the viewBox. */
export function tapeChrome(bill: number, budget: number) {
  const end = TAPE.PAD + bill * UNIT, budgetX = TAPE.PAD + budget * UNIT;
  const clamp = (x: number, half: number) => Math.min(Math.max(x, TAPE.PAD + half), TAPE.W - TAPE.PAD - half);
  return { end, budgetX, budgetLabelX: clamp(budgetX, TAPE.BUDGET_HALF), totalLabelX: clamp((TAPE.PAD + end) / 2, TAPE.TOTAL_HALF) };
}

export function tapeCaptions(members: number, ticket: number, guide: number, parking: number, budget: number) {
  return {
    paid: `As the group pays it: ${members} × ($${ticket} ticket + $${guide} guide) + $${parking} parking`,
    bridge: `same money, regrouped: the ${members} ticket blocks slide together`,
    regrouped: `As one expression: ${members}x + $${fixedPart(members, guide, parking)}, with x = $${ticket}`,
    total: `total bill $${linearTotal(members, ticket, guide, parking)}`,
    budget: `budget $${budget}`,
  };
}

export function tapeAriaLabel(members: number, ticket: number, guide: number, parking: number, budget: number) {
  const bill = linearTotal(members, ticket, guide, parking);
  const where = bill < budget ? "past the end of both bars" : bill === budget ? "exactly at the end of both bars" : "before the end of both bars";
  return `Two bars drawn on one dollar scale, each worth ${bill} dollars. The top bar alternates ${members} ticket ${plural(members, "block")} of ${ticket} dollars with ${members} guide ${plural(members, "block")} of ${guide} dollars, then one ${parking} dollar parking block. The bottom bar merges the ${members} ticket ${plural(members, "block")} into one ${members * ticket} dollar block and the guides and parking into one ${fixedPart(members, guide, parking)} dollar block. A dashed line marks the ${budget} dollar budget, ${where}.`;
}

/* ---------- worked example and Try it, computed from constants ---------- */

export const WORKED = { offNum: 1, offDen: 4, credit: 12, paid: 87 } as const;
export function workedExample() {
  const keepNum = WORKED.offDen - WORKED.offNum;
  const keepDen = WORKED.offDen;
  const beforeCredit = WORKED.paid + WORKED.credit;
  const tag = (beforeCredit * keepDen) / keepNum;
  const off = (tag * WORKED.offNum) / WORKED.offDen;
  const sale = tag - off;
  return { keepNum, keepDen, beforeCredit, tag, off, sale, check: sale - WORKED.credit, offPct: (WORKED.offNum * 100) / WORKED.offDen, keepPct: (keepNum * 100) / keepDen };
}
export function workedSteps() {
  const ex = workedExample();
  return [
    { title: "Name the unknown", math: `b − (${WORKED.offNum}/${WORKED.offDen})b − ${WORKED.credit}`, note: `Let b be the tag price. The markdown takes off ${WORKED.offNum}/${WORKED.offDen} of b, and then the store credit takes off $${WORKED.credit}.` },
    { title: "Combine the like terms", math: `(${ex.keepNum}/${ex.keepDen})b − ${WORKED.credit}`, note: `b and (${WORKED.offNum}/${WORKED.offDen})b are like terms: b − (${WORKED.offNum}/${WORKED.offDen})b = (1 − ${WORKED.offNum}/${WORKED.offDen})b = (${ex.keepNum}/${ex.keepDen})b. The rewrite says you pay ${ex.keepPct}% of the tag price, then use the credit.` },
    { title: "Write the equation", math: `(${ex.keepNum}/${ex.keepDen})b − ${WORKED.credit} = ${WORKED.paid}`, note: `The receipt says $${WORKED.paid}, so the expression equals ${WORKED.paid}. This is px + q = r with p = ${ex.keepNum}/${ex.keepDen} and q = −${WORKED.credit}.` },
    { title: "Undo the subtraction", math: `(${ex.keepNum}/${ex.keepDen})b = ${ex.beforeCredit}`, note: `Add ${WORKED.credit} to both sides: ${WORKED.paid} + ${WORKED.credit} = ${ex.beforeCredit}.` },
    { title: "Undo the multiplication", math: `b = ${ex.beforeCredit} × ${ex.keepDen}/${ex.keepNum} = ${ex.tag}`, note: `Multiply both sides by ${ex.keepDen}/${ex.keepNum}, the reciprocal of ${ex.keepNum}/${ex.keepDen}. The tag price was $${ex.tag}.` },
    { title: "Check it", math: `${ex.tag} − ${ex.off} = ${ex.sale}, and ${ex.sale} − ${WORKED.credit} = ${ex.check}`, note: `${WORKED.offNum}/${WORKED.offDen} of ${ex.tag} is ${ex.off}, so the sale price is $${ex.sale}; the credit leaves $${ex.check}, exactly what the receipt says.` },
  ];
}

export const TRY = { outer: 5, inner: 2, plus: 3, minus: 4 } as const;
export function tryTarget(x: number) { return TRY.outer * (TRY.inner * x + TRY.plus) - TRY.minus * x; }
export const TRY_OPTIONS = [
  { m: 10, b: 15, why: "That is only 5(2x + 3). The −4x still has to be combined with the 10x." },
  { m: 14, b: 15, why: "Subtracting 4x makes the x term smaller, not bigger: 10x − 4x = 6x." },
  { m: 6, b: 15, why: "5(2x + 3) = 10x + 15 because the 5 multiplies both terms, and 10x − 4x = 6x." },
  { m: 6, b: 3, why: "The 5 has to multiply the 3 as well as the 2x, so the constant is 15, not 3." },
] as const;
export function matchesTarget(option: { m: number; b: number }) { return [-3, 0, 1, 2, 7].every((x) => option.m * x + option.b === tryTarget(x)); }
export const TRY_ANSWER = TRY_OPTIONS.findIndex(matchesTarget);

export default function Lesson() {
  const [members, setMembers] = useState(4);
  const [ticket, setTicket] = useState(9);
  const [guide, setGuide] = useState(3);
  const [parking, setParking] = useState(6);
  const [budget, setBudget] = useState(100);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const fixed = fixedPart(members, guide, parking);
  const bill = linearTotal(members, ticket, guide, parking);
  const rows = tapeRows(members, ticket, guide, parking);
  const chrome = tapeChrome(bill, budget);
  const caps = tapeCaptions(members, ticket, guide, parking, budget);
  const bl = budgetLines(budget, members, fixed, bill);
  const ex = workedExample();
  const steps = workedSteps();

  return (
    <div className="prose-lesson max-w-none">
      <p>Your club is going to the science museum and somebody has to work out the bill. Every member pays the same ticket price, every member rents an audio guide, and the club pays one parking fee for the van. That is a pile of separate charges — until algebra folds the whole trip into a single <strong>expression</strong>, with one letter standing in for the price nobody has looked up yet.</p>
      <p>Right now the bill is <strong>{members} × (${ticket} + ${guide}) + ${parking}</strong>. Regroup the very same money and it reads <strong>{members}x + {fixed}</strong>: one part that grows with the ticket price x, one part that never moves. Everything in this chapter lives inside that small expression — rewriting it so its structure shows, setting it equal to a receipt and solving for x, and setting it against a budget to ask how large x is allowed to get.</p>

      <Figure caption="Move any control. The top bar is the bill the way the group pays it; the bottom bar is the same money regrouped into a part that varies and a part that is fixed. Both bars are drawn on one dollar ruler — a dollar is the same width everywhere — so raising the ticket price stretches them while the fixed block keeps exactly its size, and the dashed line shows where the budget runs out.">
        <div className="flex flex-col items-center gap-5">
          <svg className="mx-auto h-auto max-w-full" width={TAPE.W} height={TAPE.H} viewBox={`0 0 ${TAPE.W} ${TAPE.H}`} role="img" aria-label={tapeAriaLabel(members, ticket, guide, parking, budget)}>
            <text x={TAPE.PAD} y={22} fontSize={11} fontWeight={700} fill="var(--ink-soft)">{caps.paid}</text>
            {rows.paid.map((s) => <g key={s.key}><rect x={s.x} y={TAPE.ROW1_Y} width={s.w} height={TAPE.BAR_H} rx={4} fill={s.fill} stroke="var(--surface)" strokeWidth={1} />{s.showLabel ? <text x={s.x + s.w / 2} y={TAPE.ROW1_Y + 22} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">{s.label}</text> : null}</g>)}
            <text x={TAPE.W / 2} y={80} textAnchor="middle" fontSize={11} fill="var(--ink-faint)">{caps.bridge}</text>
            <text x={TAPE.PAD} y={94} fontSize={11} fontWeight={700} fill="var(--ink-soft)">{caps.regrouped}</text>
            {rows.regrouped.map((s) => <g key={s.key}><rect x={s.x} y={TAPE.ROW2_Y} width={s.w} height={TAPE.BAR_H} rx={4} fill={s.fill} stroke="var(--surface)" strokeWidth={1} />{s.showLabel ? <text x={s.x + s.w / 2} y={TAPE.ROW2_Y + 22} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">{s.label}</text> : null}</g>)}
            <line x1={TAPE.PAD} y1={146} x2={TAPE.W - TAPE.PAD} y2={146} stroke="var(--line)" strokeWidth={1} />
            <path d={`M ${TAPE.PAD} 140 L ${TAPE.PAD} 146 L ${chrome.end} 146 L ${chrome.end} 140`} fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} />
            <line x1={chrome.budgetX} y1={26} x2={chrome.budgetX} y2={146} stroke="var(--ink-soft)" strokeWidth={1.5} strokeDasharray="5 3" />
            <text x={chrome.budgetLabelX} y={158} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-soft)">{caps.budget}</text>
            <text x={chrome.totalLabelX} y={178} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ink)">{caps.total}</text>
          </svg>
          <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs font-semibold text-[var(--ink-soft)]">
            <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: TICKET_COLOR }} />ticket ${ticket} (this is x)</span><span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: ACCENT }} />audio guide ${guide}</span><span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: FIXED_COLOR }} />parking ${parking}</span>
          </div>

          <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Rewrite it</div>
              <div className="mt-1 font-mono text-[15px] font-black">{members}(x + {guide}) + {parking}</div>
              <div className="font-mono text-[15px]">= {members}x + {members * guide} + {parking}</div>
              <div className="font-mono text-[15px] font-black" style={{ color: ACCENT }}>= {members}x + {fixed}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">Each member is charged {guide} dollars for a guide, so the {plural(members, "guide")} alone come to {members} × {guide} = {members * guide}.</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Solve it back</div>
              <div className="mt-1 font-mono text-[15px] font-black">{members}x + {fixed} = {bill}</div>
              <div className="font-mono text-[15px]">{members}x = {bill} − {fixed} = {members * ticket}</div>
              <div className="font-mono text-[15px] font-black" style={{ color: ACCENT }}>x = {members * ticket} ÷ {members} = {ticket}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">Cover up the ticket price and only the ${bill} receipt is left; two undo moves bring it back.</div>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink-faint)]">Fit the budget</div>
              <div className="mt-1 font-mono text-[15px] font-black">{bl.inequality}</div>
              <div className="font-mono text-[15px]">{bl.divide}</div>
              <div className="font-mono text-[15px] font-black" style={{ color: FIXED_COLOR }}>{bl.conclusion}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{bl.rounding} {bl.fits}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Stepper label="Members going" value={members} min={2} max={6} step={1} color={TICKET_COLOR} onChange={setMembers} />
            <Stepper label="Audio guide ($)" value={guide} min={2} max={8} step={1} color={ACCENT} onChange={setGuide} />
            <Stepper label="Parking ($)" value={parking} min={3} max={15} step={3} color={FIXED_COLOR} onChange={setParking} />
            <Stepper label="Club budget ($)" value={budget} min={70} max={160} step={10} onChange={setBudget} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Ticket price x: <span className="text-[var(--ink)]">${ticket}</span></span>
            <input type="range" min={4} max={15} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} className="w-56 accent-[var(--band-middle)]" aria-label="Ticket price in dollars" />
          </div>
        </div>
      </Figure>

      <h2>Worked example: run the moves backwards</h2>
      <p>A used-bike shop marks every bike down by {WORKED.offNum}/{WORKED.offDen} off the tag price. Rosa also hands over a ${WORKED.credit} store credit, and she pays ${WORKED.paid}. What was the tag price? Reveal one move at a time.</p>
      <div className="card my-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-expanded={shown > 0} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{shown === 0 ? "Show the first step" : shown < steps.length ? "Next step" : "All steps shown"}</button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
          <span className="text-sm text-[var(--ink-faint)]">{shown} of {steps.length} shown</span>
        </div>
        <ol id={stepsId} aria-live="polite" className="mt-3 flex list-none flex-col gap-2 p-0">
          {steps.slice(0, shown).map((s, i) => (
            <li key={s.title} className="rounded-xl bg-[var(--surface-2)] px-4 py-2.5"><div className="text-xs font-bold uppercase tracking-wide" style={{ color: ACCENT }}>Step {i + 1}: {s.title}</div><div className="font-mono text-lg font-black">{s.math}</div><div className="text-sm text-[var(--ink-soft)]">{s.note}</div></li>
          ))}
        </ol>
      </div>

      <h2>Try it</h2>
      <p>Which expression is equivalent to <strong>{TRY.outer}({TRY.inner}x + {TRY.plus}) − {TRY.minus}x</strong>?</p>
      <div className="flex flex-wrap gap-2">
        {TRY_OPTIONS.map((o, i) => <button key={`${o.m}-${o.b}`} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-lg border px-3 py-1.5 font-mono text-sm font-bold" style={pick === i ? { background: i === TRY_ANSWER ? ACCENT : MISS_COLOR, color: "white", borderColor: "transparent" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>{o.m}x + {o.b}</button>)}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{pick === null ? "Pick the expression you think matches." : pick === TRY_ANSWER ? `Correct. ${TRY_OPTIONS[pick].why}` : `Not quite. ${TRY_OPTIONS[pick].why}`}</p>

      <h2>Where this chapter goes</h2>
      <p>Three lessons follow, one for each move you just watched. <strong>Linear Expressions</strong> is the rewriting toolkit on its own: expanding a product over a sum, pulling a common factor back out, and combining like terms until {members}(x + {guide}) + {parking} becomes {members}x + {fixed} without a second thought. <strong>Multistep Rational Problems</strong> runs that same reasoning when the numbers stop being tidy whole dollars — fractions, decimals, and percents chained one step at a time, the way the bike receipt worked. <strong>Two-Step Equations</strong> makes the undo-in-reverse routine fast and dependable, for px + q = r and for the inequalities that ask what still fits a budget.</p>

      <MathCheck>
        <p>Multiplying a sum spreads over its parts, so {members} copies of (x + {guide}) is {members}x + {members * guide}; adding the ${parking} parking fee and gathering the fixed dollars turns the bill into the linear expression {members}x + {fixed} (7.EE.A.1). The two bars stay the same length because rewriting never changes an expression&rsquo;s value — it only changes what the expression shows you, and this rewrite separates the money that grows with the ticket price from the ${fixed} that does not, which is why the fixed block keeps exactly its width on the ruler while the ticket blocks stretch (7.EE.A.2). Since {members}x + {fixed} is built by multiplying x by {members} and then adding {fixed}, the equation {members}x + {fixed} = {bill} comes apart in the opposite order: subtract {fixed}, then divide by {members}, and x = {ticket} exactly. The inequality {members}x + {fixed} ≤ {budget} takes the same two steps and keeps its direction because {members} is positive, so x ≤ {bl.exact}; a ticket price is a whole number of dollars, so the largest one that keeps the trip inside the ${budget} budget is ${bl.most} (7.EE.B.4). The same two moves work when the numbers are fractions or percents: for the marked-down bike, ({ex.keepNum}/{ex.keepDen})b − {WORKED.credit} = {WORKED.paid} gives b = {ex.tag}, since {ex.keepPct}% of {ex.tag} is {ex.sale} and {ex.sale} − {WORKED.credit} = {ex.check} (7.EE.B.3).</p>
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
        <span className="w-10 text-center text-2xl font-black tabular-nums" style={color ? { color } : undefined}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
