"use client";

import { useId, useState, type ReactNode } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";

const ACCENT = "var(--band-middle)";
const PERCENT = "var(--band-upper)";

/* ---------- exact fraction arithmetic (pure, exercised by the test) ---------- */
export type Frac = { n: number; d: number };
export function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
export function frac(n: number, d: number): Frac { const g = gcd(n, d) || 1; const s = d < 0 ? -1 : 1; return { n: (s * n) / g, d: (s * d) / g }; }
export function mul(a: Frac, b: Frac): Frac { return frac(a.n * b.n, a.d * b.d); }
export function add(a: Frac, b: Frac): Frac { return frac(a.n * b.d + b.n * a.d, a.d * b.d); }
export function sub(a: Frac, b: Frac): Frac { return frac(a.n * b.d - b.n * a.d, a.d * b.d); }
export function toNumber(f: Frac): number { return f.n / f.d; }
export function reciprocal(f: Frac): Frac { return frac(f.d, f.n); }
export function exactCents(f: Frac): boolean { return (f.n * 100) % f.d === 0; }
/** Cents, rounded half away from zero on the integers — never through a double. */
export function cents(f: Frac): number { const sign = f.n < 0 ? -1 : 1; const n = Math.abs(f.n); return sign * Math.floor((200 * n + f.d) / (2 * f.d)); }
export function centsText(c: number): string { const a = Math.abs(c); return `${c < 0 ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`; }
export function money(f: Frac): string { return centsText(cents(f)); }
export function approxSign(f: Frac): string { return exactCents(f) ? "" : "≈"; }
export function fracLabel(f: Frac): string { return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`; }
export function plural(n: number, word: string): string { return n === 1 ? word : `${word}s`; }
/** Only an exact 1 takes the singular noun: 1/2 and 5/3 of a dollar stay "dollars". */
export function dollarWord(f: Frac): string { return f.d === 1 && Math.abs(f.n) === 1 ? "dollar" : "dollars"; }
export function poundWord(f: Frac): string { return f.n <= f.d ? "pound" : "pounds"; }

/* ---------- the price tag: the weight on the sign may be a fraction of a pound ---------- */
export const WEIGHTS: ReadonlyArray<Frac> = [{ n: 3, d: 4 }, { n: 1, d: 1 }, { n: 2, d: 1 }, { n: 3, d: 1 }];
export function unitRate(dollars: number, weight: Frac): Frac { return frac(dollars * weight.d, weight.n); }
export function costFor(dollars: number, weight: Frac, pounds: Frac): Frac { return mul(unitRate(dollars, weight), pounds); }
export function percentOf(amount: Frac, pct: number): Frac { return mul(amount, frac(pct, 100)); }
export function signText(dollars: number, weight: Frac): string { return `$${dollars} for ${fracLabel(weight)} ${poundWord(weight)}`; }
/** "6 divided by 3/4 = 6 x 4/3 = 8" — dividing by a fraction is multiplying by its reciprocal. */
export function unitRateSteps(dollars: number, weight: Frac): string {
  return `${dollars} ÷ ${fracLabel(weight)}${weight.n === weight.d ? "" : ` = ${dollars} × ${fracLabel(reciprocal(weight))}`} = ${fracLabel(unitRate(dollars, weight))}`;
}
/** A money amount that is only a rounded value never claims to be exact. */
export function amountText(f: Frac): string { return exactCents(f) ? `$${money(f)}` : `${fracLabel(f)} ${dollarWord(f)}, about $${money(f)}`; }
/**
 * The checkout subtraction: dollars and cents when every amount is a whole
 * number of cents, otherwise exact fractions with one rounded decimal at the
 * end, so the line is true as written — and closes — in every state.
 */
export function couponReadout(cost: Frac, save: Frac, pay: Frac, coupon: number): { savings: string; subtraction: string; total: string; note: string } {
  if (exactCents(cost) && exactCents(save)) return { savings: `${coupon}/100 × $${money(cost)} = $${money(save)}`, subtraction: `$${money(cost)} − $${money(save)}`, total: `$${money(pay)}`, note: "" };
  return { savings: `${coupon}/100 × ${fracLabel(cost)} = ${fracLabel(save)} ${dollarWord(save)}`, subtraction: `${fracLabel(cost)} − ${fracLabel(save)}`, total: `${fracLabel(pay)} ${dollarWord(pay)}`, note: `about $${money(pay)}` };
}

/* ---------- graph geometry: one fixed dollar axis, so k is the steepness ---------- */
export const W = 320, H = 250, PAD_L = 54, PAD_R = 18, PAD_T = 24, PAD_B = 42, XMAX = 8, YMAX = 96;
const PLOT_W = W - PAD_L - PAD_R, PLOT_H = H - PAD_T - PAD_B;
export function tickDollars(i: number): number { return (YMAX * i) / XMAX; }
export function graphGeometry(dollars: number, weight: Frac, buy: number, coupon: number) {
  const k = unitRate(dollars, weight), cost = costFor(dollars, weight, frac(buy, 1));
  const pay = sub(cost, percentOf(cost, coupon));
  const full = Math.min(toNumber(mul(k, { n: XMAX, d: 1 })), YMAX); // cost of XMAX pounds, never above the axis
  const sx = (x: number) => PAD_L + (x / XMAX) * PLOT_W; // pounds across a fixed 0..XMAX window
  const sy = (y: number) => H - PAD_B - (y / YMAX) * PLOT_H; // dollars up a fixed 0..YMAX window
  const gy = (i: number) => H - PAD_B - (i / XMAX) * PLOT_H; // gridline at tickDollars(i)
  const point = { x: sx(buy), y: sy(toNumber(cost)) }, labelAnchor: "start" | "end" = buy > XMAX / 2 ? "end" : "start";
  return {
    sx, sy, gy, full, point, labelAnchor, origin: { x: sx(0), y: sy(0) },
    lineEnd: { x: sx(XMAX), y: sy(full) }, couponEnd: { x: sx(XMAX), y: sy((full * (100 - coupon)) / 100) },
    couponPoint: { x: sx(buy), y: sy(toNumber(pay)) },
    labelX: labelAnchor === "end" ? point.x - 10 : point.x + 10, labelY: point.y < PAD_T + 16 ? point.y + 18 : point.y - 9
  };
}
export function graphAriaLabel(dollars: number, weight: Frac, buy: number, coupon: number): string {
  const k = unitRate(dollars, weight), cost = costFor(dollars, weight, frac(buy, 1));
  const base = `Cost in dollars against pounds, on an axis fixed from 0 to ${YMAX} dollars. A solid line through the origin rises ${fracLabel(k)} ${dollarWord(k)} for each pound and passes through the marked point: ${buy} ${plural(buy, "pound")} for ${exactCents(cost) ? "" : "about "}${money(cost)} ${dollarWord(cost)}.`;
  return coupon > 0 ? `${base} A dashed line below it shows the price after a ${coupon} percent coupon.` : base;
}

/* ---------- worked example and "Try it", computed from constants ---------- */
export const WE = { cups: 4, dollars: 6, buy: 10, taxPct: 8 } as const;
export function workedExample() {
  const rate = frac(WE.dollars, WE.cups), base = mul(rate, frac(WE.buy, 1));
  const tax = percentOf(base, WE.taxPct), multiplier = frac(100 + WE.taxPct, 100);
  return { rate, base, tax, total: add(base, tax), multiplier, oneStep: mul(multiplier, base) };
}
export const TRY_CHOICES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [[[1, 3], [2, 5], [3, 7]], [[2, 6], [3, 8], [4, 10]], [[2, 5], [4, 10], [6, 15]], [[1, 4], [2, 8], [3, 10]]];
export function isProportional(pairs: ReadonlyArray<readonly [number, number]>): boolean { const [x0, y0] = pairs[0]; return pairs.every(([x, y]) => y * x0 === y0 * x); }
export function ratioTexts(pairs: ReadonlyArray<readonly [number, number]>): string[] { return pairs.map(([x, y]) => `${approxSign(frac(y, x))}${money(frac(y, x))}`); }
/** Index of the first row whose ratio differs from the first row's, or -1. */
export function firstBreak(pairs: ReadonlyArray<readonly [number, number]>): number {
  const [x0, y0] = pairs[0];
  return pairs.findIndex(([x, y], i) => i > 0 && y * x0 !== y0 * x);
}
export function whyNotProportional(pairs: ReadonlyArray<readonly [number, number]>): string {
  const i = firstBreak(pairs);
  return `Cost ÷ pounds gives ${ratioTexts(pairs).join(", ")}, so ${i === 1 ? "the first two rows already disagree" : `the first ${i} rows agree, but row ${i + 1} does not`}. One row that disagrees is enough: there is no single constant k.`;
}
export const TRY_ANSWER = TRY_CHOICES.findIndex(isProportional);

export default function Lesson() {
  const [dollars, setDollars] = useState(6);
  const [wi, setWi] = useState(0);
  const [buy, setBuy] = useState(3);
  const [coupon, setCoupon] = useState(0);
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const stepsId = useId();

  const weight = WEIGHTS[wi], k = unitRate(dollars, weight), cost = costFor(dollars, weight, frac(buy, 1));
  const save = percentOf(cost, coupon), pay = sub(cost, save), readout = couponReadout(cost, save, pay, coupon);
  const g = graphGeometry(dollars, weight, buy, coupon);
  const marks = Array.from({ length: XMAX }, (_, i) => i + 1);
  const tableRows: Frac[] = [...(weight.d === 1 ? [] : [weight]), ...marks.map((x) => frac(x, 1))];
  const we = workedExample(), mult = money(we.multiplier);
  const steps: ReactNode[] = [
    <>Find the <strong>unit rate</strong>: ${WE.dollars} for {WE.cups} cups means ${WE.dollars} ÷ {WE.cups} = <strong>${money(we.rate)} per cup</strong>. Dividing both parts of the ratio by {WE.cups} leaves the ratio unchanged.</>,
    <>Write the <strong>rule</strong> and use it: cost = ${money(we.rate)} × cups, so {WE.buy} cups cost ${money(we.rate)} × {WE.buy} = <strong>${money(we.base)}</strong>. Cost is proportional to cups, and k = ${money(we.rate)} per cup is the constant of proportionality (7.RP.A.2).</>,
    <>Add the <strong>tax</strong>, which is a percent of that cost: {WE.taxPct}% of ${money(we.base)} = {WE.taxPct}/100 × ${money(we.base)} = ${money(we.tax)}, so the total is ${money(we.base)} + ${money(we.tax)} = <strong>${money(we.total)}</strong>. In one step, multiply by 1 + {WE.taxPct}/100 = {mult}, and {mult} × ${money(we.base)} = ${money(we.oneStep)} (7.RP.A.3).</>
  ];

  return (
    <div className="prose-lesson max-w-none">
      <p>
        Buy twice as many cherries and you pay twice as much. Ride a bike for three times as long and you go three times as far. When two quantities grow together like this, keeping the same ratio no matter how big they get, they are in a{" "}
        <strong>proportional relationship</strong>. This chapter is about spotting that relationship, writing it as an equation, and using it to answer questions about rates, prices, and percents.
      </p>
      <p>
        One farmers-market price tag holds the whole idea. Right now the sign says <strong>{signText(dollars, weight)}</strong>, and the weight on a sign does not have to be a whole number — you still divide to find the cost of one pound. The figure shows that single ratio in four forms at once: a unit rate, a table, a graph, and a checkout total. The dollar axis on the graph never moves, so a bigger price per pound draws a visibly steeper line.
      </p>

      <Figure caption="One ratio, four views. The unit rate, the table, the graph, and the checkout total all come from the same price tag, so they all change together — and on a fixed dollar axis the line tilts up faster whenever the price per pound rises.">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
            <span className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-lg font-black">{signText(dollars, weight)}</span>
            <span className="text-sm text-[var(--ink-faint)]">divide by {fracLabel(weight)} →</span>
            <span className="rounded-xl border-2 px-4 py-2 text-lg font-black" style={{ borderColor: ACCENT, color: ACCENT }}>{approxSign(k)}${money(k)} per pound</span>
          </div>
          <div className="font-mono text-sm text-[var(--ink-soft)]">
            unit rate k = {unitRateSteps(dollars, weight)}
            <span className="mx-3 text-[var(--ink-faint)]">so</span>
            cost = <strong>{fracLabel(k)}</strong> × pounds
          </div>

          <div className="flex flex-wrap items-start justify-center gap-6">
            <table className="font-mono text-xs sm:text-sm">
              <thead>
                <tr className="text-[var(--ink-faint)]"><th className="px-2 py-1">pounds</th><th className="px-2 py-1">cost</th><th className="px-2 py-1">cost ÷ pounds</th></tr>
              </thead>
              <tbody>
                {tableRows.map((x) => {
                  const c = costFor(dollars, weight, x);
                  return (<tr key={fracLabel(x)} style={x.d === 1 && x.n === buy ? { background: "color-mix(in oklab, var(--band-middle) 14%, var(--surface))" } : undefined}>
                    <td className="px-2 py-0.5 text-center font-bold">{fracLabel(x)}</td>
                    <td className="px-2 py-0.5 text-center" style={{ color: ACCENT }}>{approxSign(c)}${money(c)}</td>
                    <td className="px-2 py-0.5 text-center text-[var(--ink-soft)]">{fracLabel(k)}</td>
                  </tr>);
                })}
              </tbody>
            </table>

            <svg className="mx-auto h-auto max-w-full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={graphAriaLabel(dollars, weight, buy, coupon)}>
              {marks.map((i) => (
                <g key={i} stroke="var(--line)" strokeWidth={1}>
                  <line x1={g.sx(i)} y1={g.origin.y} x2={g.sx(i)} y2={PAD_T} /><line x1={PAD_L} y1={g.gy(i)} x2={W - PAD_R} y2={g.gy(i)} />
                </g>
              ))}
              <line x1={g.origin.x} y1={g.origin.y} x2={W - PAD_R} y2={g.origin.y} stroke="var(--ink-soft)" strokeWidth={2} /><line x1={g.origin.x} y1={g.origin.y} x2={g.origin.x} y2={PAD_T} stroke="var(--ink-soft)" strokeWidth={2} />
              {Array.from({ length: XMAX + 1 }, (_, i) => <text key={i} x={g.sx(i)} y={g.origin.y + 16} textAnchor="middle" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">{i}</text>)}
              {[0, 2, 4, 6, 8].map((i) => <text key={i} x={PAD_L - 6} y={g.gy(i) + 4} textAnchor="end" fontSize={10} fill="var(--ink-faint)" fontFamily="var(--font-mono)">${tickDollars(i)}</text>)}
              <text x={PAD_L + PLOT_W / 2} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink-soft)">pounds</text><text x={4} y={12} fontSize={10} fontWeight={700} fill="var(--ink-soft)">cost ($)</text>
              {coupon > 0 && <line x1={g.origin.x} y1={g.origin.y} x2={g.couponEnd.x} y2={g.couponEnd.y} stroke={PERCENT} strokeWidth={2} strokeDasharray="5 4" />}
              <line x1={g.origin.x} y1={g.origin.y} x2={g.lineEnd.x} y2={g.lineEnd.y} stroke={ACCENT} strokeWidth={2.5} />
              {coupon > 0 && <circle cx={g.couponPoint.x} cy={g.couponPoint.y} r={5} fill="var(--surface)" stroke={PERCENT} strokeWidth={2} />}
              <circle cx={g.point.x} cy={g.point.y} r={6} fill={ACCENT} stroke="var(--surface)" strokeWidth={2} />
              <text x={g.labelX} y={g.labelY} textAnchor={g.labelAnchor} fontSize={11} fontWeight={700} fill={ACCENT} fontFamily="var(--font-mono)">{approxSign(cost)}${money(cost)}</text>
            </svg>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] px-5 py-3 text-center text-[15px]">
            <div>
              Buy <strong>{buy} {plural(buy, "pound")}</strong>: cost = {fracLabel(k)} × {buy} = <strong style={{ color: ACCENT }}>{amountText(cost)}</strong>.
            </div>
            {coupon > 0 ? (
              <div className="mt-1 text-[var(--ink-soft)]">
                A <strong style={{ color: PERCENT }}>{coupon}% coupon</strong> is proportional too: savings = {readout.savings}, so you pay {readout.subtraction} = <strong style={{ color: PERCENT }}>{readout.total}</strong>{readout.note ? `, or ${readout.note}` : ""}.
              </div>
            ) : (
              <div className="mt-1 text-[var(--ink-soft)]">No coupon today, so you pay the full price of {amountText(cost)}. Add a coupon to see a percent join the picture.</div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Stepper label="Price on the sign ($)" value={dollars} min={3} max={9} onChange={setDollars} />
            <Stepper label="Pounds on the sign" value={wi} min={0} max={3} onChange={setWi} display={fracLabel(weight)} />
            <Stepper label="Coupon (%)" value={coupon} min={0} max={50} step={10} onChange={setCoupon} suffix="%" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Pounds to buy: <span className="text-[var(--ink)]">{buy}</span></span>
              <input type="range" min={1} max={8} value={buy} onChange={(e) => setBuy(Number(e.target.value))} className="w-44 accent-[var(--band-middle)]" aria-label="Pounds to buy" />
            </div>
          </div>
        </div>
      </Figure>

      <h2>Worked example: one problem, three moves</h2>
      <div className="card my-4 p-4 sm:p-5">
        <p className="m-0 text-[15px] font-semibold">A juice stand sells {WE.cups} cups of lemonade for ${WE.dollars}. Priya buys {WE.buy} cups, and the stand adds {WE.taxPct}% sales tax. What does she pay?</p>
        <div id={stepsId} aria-live="polite">
          <p className="sr-only">Showing {shown} of {steps.length} steps.</p>
          <ol className="my-3 space-y-2 pl-5 text-[15px]">{steps.slice(0, shown).map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
        {shown === 0 && <p className="m-0 mb-3 text-sm text-[var(--ink-faint)]">Press Next step to reveal the reasoning one move at a time.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length} aria-controls={stepsId} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {shown >= steps.length ? "All steps shown" : `Next step (${shown + 1} of ${steps.length})`}
          </button>
          <button type="button" onClick={() => setShown(0)} disabled={shown === 0} aria-controls={stepsId} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink-soft)] disabled:opacity-40">Start over</button>
        </div>
      </div>

      <h2>Try it</h2>
      <p>Each table lists pounds of trail mix and the cost. Which one shows cost <strong>proportional</strong> to pounds?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TRY_CHOICES.map((pairs, i) => (
          <button key={i} type="button" onClick={() => setPick(i)} aria-pressed={pick === i} className="rounded-xl border px-3 py-2 text-left font-mono text-sm" style={pick === i ? { borderColor: i === TRY_ANSWER ? ACCENT : "var(--ink-faint)", background: "color-mix(in oklab, var(--band-middle) 12%, var(--surface))" } : { borderColor: "var(--line)" }}>
            <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>{pairs.map(([x, y]) => `${x} lb → $${y}`).join("   ")}
          </button>
        ))}
      </div>
      {pick !== null && (
        <p className="mt-3 text-[15px]" role="status">
          {pick === TRY_ANSWER
            ? <><strong>Correct.</strong> Cost ÷ pounds gives {ratioTexts(TRY_CHOICES[pick]).join(", ")} — the same constant every time, so cost = {ratioTexts(TRY_CHOICES[pick])[0]} × pounds.</>
            : <><strong>Not this one.</strong> {whyNotProportional(TRY_CHOICES[pick])} Try another table.</>}
        </p>
      )}

      <h2>Where this chapter goes</h2>
      <p>
        Three lessons follow, one for each move you just made. <strong>Complex Unit Rates</strong> takes the first move further: both parts of the ratio can be fractions, like half a mile in a quarter of an hour, and dividing by a fraction still gives the rate for one whole unit. The next lesson takes this chapter&apos;s own name, <strong>Proportional Relationships</strong>, and stays with the second move: deciding whether a table, a graph, or a story really is proportional, finding the constant k, and writing y = kx. <strong>Percent Problems</strong> takes the third move on its own: tax, tip, discount, and markup, each solved by finding a percent of the base and then adding or subtracting it.
      </p>

      <MathCheck>
        <p>
          A <strong>unit rate</strong> is the value of a ratio for one unit of the second quantity. The sign says {signText(dollars, weight)}, so k = {unitRateSteps(dollars, weight)} {dollarWord(k)} per pound: dividing by a number is the same as multiplying by its reciprocal, which is how the rate for one whole pound is found even when the weight on the sign is a fraction of a pound (7.RP.A.1). The rule cost = {fracLabel(k)} × pounds is a <strong>proportional relationship</strong>: every cost ÷ pounds in the table equals that one constant k, so the graph is a straight line through the origin (0 pounds costs $0), and because the dollar axis is fixed, k is exactly the steepness of that line — double k and the line rises twice as fast (7.RP.A.2). A percent is a proportional relationship too: a {coupon > 0 ? coupon : "p"}% coupon always takes {coupon > 0 ? coupon : "p"}/100 of the price, which is why tax, tip, discount, and markup problems are solved by finding that percent of the base and then adding or subtracting it (7.RP.A.3).
        </p>
      </MathCheck>
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange, suffix, display }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; suffix?: string; display?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-2xl font-black tabular-nums">{display ?? value}{suffix}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="h-9 w-9 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-lg font-bold disabled:opacity-40" aria-label={`Increase ${label}`}>+</button></div>
    </div>
  );
}
